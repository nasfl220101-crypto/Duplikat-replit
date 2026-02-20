import { storage } from "./storage";
import { Impit } from "impit";
import { generateCardSvgSequential } from "./card-generator";
import sharp from "sharp";
import crypto from "crypto";
import type { Proxy as ProxyRecord } from "@shared/schema";

let disabledUniversityIds: Set<number> = new Set();

export function getUniversitiesList() {
  return UNIVERSITIES.map(u => ({
    id: u.id,
    name: u.name,
    weight: u.weight,
    enabled: !disabledUniversityIds.has(u.id),
  }));
}

export async function loadUniversitySettings() {
  try {
    const settings = await storage.getUniversitySettings();
    disabledUniversityIds = new Set(
      settings.filter(s => !s.enabled).map(s => s.universityId)
    );
    console.log(`[UNI] Loaded settings: ${disabledUniversityIds.size} disabled, ${UNIVERSITIES.length - disabledUniversityIds.size} enabled`);
  } catch (e) {
    console.log(`[UNI] Failed to load settings, all enabled by default: ${e}`);
  }
}

export async function setUniversityEnabled(universityId: number, enabled: boolean) {
  await storage.setUniversitySetting(universityId, enabled);
  if (enabled) {
    disabledUniversityIds.delete(universityId);
  } else {
    disabledUniversityIds.add(universityId);
  }
}

export async function bulkSetUniversitiesEnabled(ids: number[], enabled: boolean) {
  for (const id of ids) {
    await storage.setUniversitySetting(id, enabled);
    if (enabled) {
      disabledUniversityIds.delete(id);
    } else {
      disabledUniversityIds.add(id);
    }
  }
}

const PROGRAM_ID = "67c8c14f5f17a83b745e3f82";
const SHEERID_API_URL = "https://services.sheerid.com/rest/v2";
const MIN_DELAY = 1500;
const MAX_DELAY = 6000;

const universityStats: Map<number, { attempts: number; successes: number; failures: number; fraudRejects: number }> = new Map();

function recordUniversityResult(uniId: number, result: "success" | "failure" | "fraud") {
  if (!universityStats.has(uniId)) {
    universityStats.set(uniId, { attempts: 0, successes: 0, failures: 0, fraudRejects: 0 });
  }
  const stats = universityStats.get(uniId)!;
  stats.attempts++;
  if (result === "success") stats.successes++;
  else if (result === "fraud") stats.fraudRejects++;
  else stats.failures++;
}

function getAdjustedWeight(uni: { id: number; weight: number }): number {
  const stats = universityStats.get(uni.id);
  if (!stats || stats.attempts < 2) return uni.weight;
  const successRate = stats.successes / stats.attempts;
  const fraudRate = stats.fraudRejects / stats.attempts;
  if (fraudRate > 0.5 && stats.attempts >= 3) return uni.weight * 0.1;
  if (fraudRate > 0.3) return uni.weight * 0.3;
  if (successRate > 0.5) return uni.weight * 1.5;
  return uni.weight * Math.max(0.2, successRate + 0.3);
}

export function getUniversityStats() {
  const result: Array<{ id: number; name: string; attempts: number; successes: number; failures: number; fraudRejects: number; successRate: string; adjustedWeight: string }> = [];
  for (const uni of UNIVERSITIES) {
    const stats = universityStats.get(uni.id);
    if (stats && stats.attempts > 0) {
      result.push({
        id: uni.id,
        name: uni.name,
        ...stats,
        successRate: ((stats.successes / stats.attempts) * 100).toFixed(1) + "%",
        adjustedWeight: getAdjustedWeight(uni).toFixed(2),
      });
    }
  }
  return result.sort((a, b) => b.attempts - a.attempts);
}

let globalProxyIndex = 0;

interface VerificationSession {
  headers: Record<string, string>;
  client: Impit;
  proxyLabel?: string;
  realIp?: string;
}

async function getVerificationProxy(): Promise<{ proxy: ProxyRecord | undefined; index: number }> {
  const allProxies = await storage.getProxies();
  const active = allProxies
    .filter((p) => p.isActive && p.role === "submit")
    .sort((a, b) => (a.label || "").localeCompare(b.label || ""));
  if (active.length === 0) {
    const anyActive = allProxies
      .filter((p) => p.isActive)
      .sort((a, b) => (a.label || "").localeCompare(b.label || ""));
    if (anyActive.length === 0) return { proxy: undefined, index: -1 };
    const idx = globalProxyIndex % anyActive.length;
    globalProxyIndex++;
    return { proxy: anyActive[idx], index: idx };
  }
  const idx = globalProxyIndex % active.length;
  globalProxyIndex++;
  return { proxy: active[idx], index: idx };
}

async function resolveRealIp(client: Impit): Promise<string> {
  const ipApis = [
    "https://api.ipify.org?format=json",
    "https://httpbin.org/ip",
    "https://api.myip.com",
  ];
  for (const apiUrl of ipApis) {
    try {
      const res = await client.fetch(apiUrl, {
        method: "GET",
        headers: { "accept": "application/json" },
      });
      const text = typeof res.text === "function" ? await res.text() : (typeof res.body === "string" ? res.body : JSON.stringify(res.body));
      const data = JSON.parse(text);
      const ip = data.ip || data.origin || "";
      if (ip) {
        console.log(`[IP] Resolved real IP: ${ip} via ${apiUrl}`);
        return ip;
      }
    } catch (e) {
      console.log(`[IP] Failed to resolve via ${apiUrl}: ${e}`);
    }
  }
  return "unknown";
}

function injectSessionId(proxyUrl: string): string {
  try {
    const parsed = new URL(proxyUrl);
    const sessionId = crypto.randomBytes(8).toString("hex");
    parsed.username = `${parsed.username}-sid-${sessionId}`;
    console.log(`[PROXY] Injected session ID: -sid-${sessionId}`);
    return parsed.toString();
  } catch {
    return proxyUrl;
  }
}

function createSessionFromProxy(proxy: ProxyRecord | undefined, index: number, role: string): VerificationSession {
  let proxyUrl = proxy?.url;
  const headers = getSheerIdHeaders();
  const clientOpts: any = { browser: "chrome" };
  if (proxyUrl) {
    proxyUrl = injectSessionId(proxyUrl);
    clientOpts.proxy = proxyUrl;
  }
  const client = new Impit(clientOpts);
  
  const label = proxy?.label || "No proxy";
  const displayLabel = index >= 0 ? `#${index + 1} (${label})` : "No proxy";
  console.log(`[SESSION] ${role.toUpperCase()} proxy ${displayLabel}`);
  
  return { headers, client, proxyLabel: displayLabel };
}

async function createCheckSession(): Promise<VerificationSession> {
  const allProxies = await storage.getProxies();
  const active = allProxies
    .filter((p) => p.isActive && p.role === "submit")
    .sort((a, b) => (a.label || "").localeCompare(b.label || ""));
  const pool = active.length > 0 ? active : allProxies.filter((p) => p.isActive);
  const proxy = pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : undefined;
  return createSessionFromProxy(proxy, -1, "check");
}

function disposeSession(session: VerificationSession): void {
  try {
    if (session.client && typeof (session.client as any).close === "function") {
      (session.client as any).close();
    }
    console.log(`[SESSION] Disposed session (proxy: ${session.proxyLabel || "None"})`);
  } catch (e) {
    console.log(`[SESSION] Dispose cleanup: ${e}`);
  }
}

async function createVerificationSession(): Promise<VerificationSession> {
  return createCheckSession();
}

const UNIVERSITIES = [
  { id: 331287, name: "Bay Mills Community College", weight: 100 },
  { id: 650934, name: "Little Priest Tribal College", weight: 100 },
  { id: 331367, name: "Cankdeska Cikana Community College", weight: 100 },
  { id: 650405, name: "Aaniiih Nakoda College", weight: 100 },
  { id: 650404, name: "Chief Dull Knife College", weight: 100 },
  { id: 651323, name: "Keweenaw Bay Ojibwa Community College", weight: 100 },
  { id: 650873, name: "Leech Lake Tribal College", weight: 100 },
  { id: 332030, name: "Nebraska Indian Community College", weight: 100 },
  { id: 650638, name: "Oglala Lakota College", weight: 100 },
  { id: 5799850, name: "Red Lake Nation College", weight: 100 },
  { id: 650639, name: "Sinte Gleska University", weight: 100 },
  { id: 650640, name: "Sisseton Wahpeton College", weight: 100 },
  { id: 651033, name: "Tohono O'Odham Community College", weight: 100 },
  { id: 332533, name: "United Tribes Technical College", weight: 100 },
  { id: 650940, name: "White Earth Tribal and Community College", weight: 100 },
  { id: 650402, name: "Blackfeet Community College", weight: 100 },
  { id: 650503, name: "Nueta Hidatsa Sahnish College", weight: 100 },
  { id: 4656, name: "Bacone College", weight: 100 },
  { id: 7031, name: "Southwestern Indian Polytechnic Institute", weight: 100 },
  { id: 926, name: "Dine College", weight: 100 },
  { id: 650408, name: "Salish Kootenai College", weight: 100 },
  { id: 4102, name: "College of Menominee Nation", weight: 100 },
  { id: 650874, name: "Fond du Lac Tribal and Community College", weight: 100 },
  { id: 651034, name: "Fort Peck Community College", weight: 100 },
  { id: 650641, name: "Little Big Horn College", weight: 100 },
  { id: 650407, name: "Stone Child College", weight: 100 },
  { id: 651322, name: "Turtle Mountain Community College", weight: 100 },
  { id: 650642, name: "Sitting Bull College", weight: 100 },
  { id: 651035, name: "Northwest Indian College", weight: 100 },
  { id: 650875, name: "Lac Courte Oreilles Ojibwa Community College", weight: 100 },
  { id: 651036, name: "Ilisagvik College", weight: 100 },
  { id: 650643, name: "College of the Muscogee Nation", weight: 100 },
  { id: 4657, name: "Haskell Indian Nations University", weight: 100 },
  { id: 651037, name: "Navajo Technical University", weight: 100 },
  { id: 650876, name: "Fort Berthold Community College", weight: 100 },
  { id: 331500, name: "Crownpoint Institute of Technology", weight: 100 },
  { id: 651324, name: "Saginaw Chippewa Tribal College", weight: 100 },
  { id: 650644, name: "Comanche Nation College", weight: 100 },
  { id: 651038, name: "Wind River Tribal College", weight: 100 },
  { id: 650877, name: "Institute of American Indian Arts", weight: 100 },
  { id: 331501, name: "Sisseton Wahpeton Tribal College", weight: 100 },
  { id: 651039, name: "Cheyenne River Community College", weight: 100 },
  { id: 650878, name: "White Mountain Apache Tribal College", weight: 100 },
  { id: 651325, name: "Fond du Lac Dewan Community College", weight: 100 },
  { id: 650645, name: "Pawnee Nation College", weight: 100 },
  { id: 331502, name: "Southwestern Community College", weight: 100 },
  { id: 651040, name: "San Carlos Apache College", weight: 100 },
  { id: 650879, name: "Gabriel Dumont Institute", weight: 100 },
  { id: 651326, name: "Northern Arapaho Tribal College", weight: 100 },
  { id: 650646, name: "Lower Brule Community College", weight: 100 },
  { id: 331503, name: "Tuba City Regional Boarding School", weight: 100 },
  { id: 651041, name: "Pascua Yaqui Tribal College", weight: 100 },
];

const FIRST_NAMES = [
  "James", "John", "Robert", "Michael", "William", "David", "Richard", "Joseph",
  "Thomas", "Christopher", "Charles", "Daniel", "Matthew", "Anthony", "Mark",
  "Donald", "Steven", "Andrew", "Paul", "Joshua", "Kenneth", "Kevin", "Brian",
  "George", "Timothy", "Ronald", "Edward", "Jason", "Jeffrey", "Ryan",
  "Mary", "Patricia", "Jennifer", "Linda", "Barbara", "Elizabeth", "Susan",
  "Jessica", "Sarah", "Karen", "Lisa", "Nancy", "Betty", "Margaret", "Sandra",
  "Ashley", "Kimberly", "Emily", "Donna", "Michelle", "Dorothy", "Carol",
  "Amanda", "Melissa", "Deborah", "Stephanie", "Rebecca", "Sharon", "Laura",
  "Emma", "Olivia", "Ava", "Isabella", "Sophia", "Mia", "Charlotte", "Amelia",
  "Noah", "Liam", "Ethan", "Mason", "Logan", "Alexander", "Aiden", "Lucas",
  "Jackson", "Benjamin", "Henry", "Sebastian", "Jack", "Owen", "Gabriel",
  "Samuel", "Carter", "Dylan", "Luke", "Jayden", "Penelope", "Layla",
  "Riley", "Zoey", "Nora", "Lily", "Eleanor", "Hannah", "Lillian", "Addison",
  "Aubrey", "Ellie", "Stella", "Natalie", "Leah", "Hazel", "Violet", "Aurora",
  "Savannah", "Audrey", "Brooklyn", "Bella", "Claire", "Skylar", "Lucy",
  "Paisley", "Everly", "Anna", "Caroline", "Nova", "Genesis", "Emilia",
  "Kennedy", "Samantha", "Maya", "Willow", "Kinsley", "Naomi", "Aaliyah",
  "Elena", "Cora", "Kaylee", "Madelyn", "Hailey", "Mackenzie", "Autumn",
  "Piper", "Ariana", "Allison", "Julia", "Jade", "Gabriella", "Alice",
  "Sadie", "Valentina", "Alexa", "Josephine", "Ivy", "Adalyn", "Lydia",
];

const LAST_NAMES = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
  "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson",
  "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson",
  "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson",
  "Walker", "Young", "Allen", "King", "Wright", "Scott", "Torres", "Nguyen",
  "Hill", "Flores", "Green", "Adams", "Nelson", "Baker", "Hall", "Rivera",
  "Campbell", "Mitchell", "Carter", "Roberts", "Turner", "Phillips", "Evans",
  "Parker", "Edwards", "Collins", "Stewart", "Morris", "Morales", "Murphy",
  "Cook", "Rogers", "Gutierrez", "Ortiz", "Morgan", "Cooper", "Peterson",
  "Bailey", "Reed", "Kelly", "Howard", "Ramos", "Kim", "Cox", "Ward",
  "Richardson", "Watson", "Brooks", "Chavez", "Wood", "James", "Bennett",
  "Gray", "Mendoza", "Ruiz", "Hughes", "Price", "Alvarez", "Castillo",
  "Sanders", "Patel", "Myers", "Long", "Ross", "Foster", "Jimenez",
  "Powell", "Jenkins", "Perry", "Russell", "Sullivan", "Bell", "Coleman",
  "Butler", "Henderson", "Barnes", "Gonzales", "Fisher", "Vasquez", "Simmons",
  "Graham", "Murray", "Ford", "Castro", "Marshall", "Owens", "Harrison",
];

const recentlyUsedNames: string[] = [];
const MAX_RECENT_NAMES = 50;

const DEPARTMENTS = [
  "Liberal Arts", "Business Administration", "Nursing", "Education",
  "General Studies", "Criminal Justice", "Social Work", "Biology",
  "Environmental Science", "Health Sciences", "Early Childhood Education",
  "Information Technology", "Human Services", "Tribal Administration",
  "Natural Resources", "Psychology", "Pre-Engineering", "Agriculture",
];

const RESOLUTIONS = ["1920x1080", "1366x768", "1536x864", "1440x900", "1280x720", "2560x1440"];
const TIMEZONES = [-8, -7, -6, -5, -4];
const PLATFORMS = [
  { os: "Windows", platform: '"Windows"', brands: '"Chromium";v="131", "Google Chrome";v="131", "Not_A Brand";v="24"' },
  { os: "Windows", platform: '"Windows"', brands: '"Chromium";v="130", "Google Chrome";v="130", "Not_A Brand";v="24"' },
  { os: "macOS", platform: '"macOS"', brands: '"Chromium";v="131", "Google Chrome";v="131", "Not_A Brand";v="24"' },
  { os: "Linux", platform: '"Linux"', brands: '"Chromium";v="131", "Google Chrome";v="131", "Not_A Brand";v="24"' },
];
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
];

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomDelay(min = MIN_DELAY, max = MAX_DELAY): Promise<void> {
  const base = randomInt(min, max);
  const jitter = Math.random() * 150;
  return sleep(base + jitter);
}

function generateFingerprint(): string {
  const res = randomChoice(RESOLUTIONS);
  const tz = randomChoice(TIMEZONES);
  const langs = randomChoice(["en-US", "en-GB", "en-CA"]);
  const plat = randomChoice(["Win32", "MacIntel", "Linux x86_64"]);
  const vendor = randomChoice(["Google Inc.", "Apple Computer, Inc.", ""]);
  const components = [
    String(Date.now()),
    String(Math.random()),
    res,
    String(tz),
    langs,
    plat,
    vendor,
    String(randomInt(2, 16)),
    String(randomInt(4, 32)),
    String(randomInt(0, 1)),
    crypto.randomUUID(),
  ];
  return crypto.createHash("md5").update(components.join("|")).digest("hex");
}

function generateNewRelicHeaders(): Record<string, string> {
  const traceId = crypto.randomBytes(16).toString("hex");
  const spanId = crypto.randomBytes(8).toString("hex");
  const timestamp = Date.now();

  const payload = {
    v: [0, 1],
    d: {
      ty: "Browser",
      ac: "364029",
      ap: "134291347",
      id: spanId,
      tr: traceId,
      ti: timestamp,
    },
  };

  return {
    newrelic: Buffer.from(JSON.stringify(payload)).toString("base64"),
    traceparent: `00-${traceId}-${spanId}-01`,
    tracestate: `364029@nr=0-1-364029-134291347-${spanId}----${timestamp}`,
  };
}

function getSheerIdHeaders(): Record<string, string> {
  const ua = randomChoice(USER_AGENTS);
  const platform = randomChoice(PLATFORMS);
  const lang = randomChoice(["en-US,en;q=0.9", "en-US,en;q=0.9,es;q=0.8", "en-GB,en;q=0.9"]);
  const nrHeaders = generateNewRelicHeaders();

  return {
    "accept": "application/json, text/plain, */*",
    "accept-encoding": "gzip, deflate, br, zstd",
    "accept-language": lang,
    "cache-control": "no-cache",
    "pragma": "no-cache",
    "content-type": "application/json",
    "clientversion": "2.158.0",
    "clientname": "jslib",
    "origin": "https://services.sheerid.com",
    "referer": `https://services.sheerid.com/verify/${PROGRAM_ID}/`,
    "sec-ch-ua": platform.brands,
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": platform.platform,
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
    "user-agent": ua,
    ...nrHeaders,
  };
}

function parseVerificationId(url: string): string | null {
  const match = url.match(/verificationId=([a-f0-9]+)/i);
  return match ? match[1] : null;
}

let universityIndex = 0;

function selectUniversity() {
  const enabled = UNIVERSITIES.filter(u => !disabledUniversityIds.has(u.id));
  if (enabled.length === 0) {
    console.log(`[SELECT] WARNING: No enabled universities! Using all.`);
    const idx = universityIndex % UNIVERSITIES.length;
    universityIndex++;
    return UNIVERSITIES[idx];
  }
  const idx = universityIndex % enabled.length;
  universityIndex++;
  console.log(`[SELECT] Sequential pick #${idx}: ${enabled[idx].name} [${enabled.length}/${UNIVERSITIES.length} enabled]`);
  return enabled[idx];
}

function generateName() {
  for (let attempt = 0; attempt < 20; attempt++) {
    const first = randomChoice(FIRST_NAMES);
    const last = randomChoice(LAST_NAMES);
    const full = `${first} ${last}`;
    if (!recentlyUsedNames.includes(full)) {
      recentlyUsedNames.push(full);
      if (recentlyUsedNames.length > MAX_RECENT_NAMES) {
        recentlyUsedNames.shift();
      }
      return { first, last, full };
    }
  }
  const first = randomChoice(FIRST_NAMES);
  const last = randomChoice(LAST_NAMES);
  const full = `${first} ${last}`;
  recentlyUsedNames.push(full);
  if (recentlyUsedNames.length > MAX_RECENT_NAMES) recentlyUsedNames.shift();
  return { first, last, full };
}

function generateEmail(first: string, last: string): string {
  const domains = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "icloud.com", "aol.com", "protonmail.com"];
  const patterns = [
    `${first[0].toLowerCase()}${last.toLowerCase()}${randomInt(100, 999)}`,
    `${first.toLowerCase()}.${last.toLowerCase()}${randomInt(10, 99)}`,
    `${last.toLowerCase()}${first[0].toLowerCase()}${randomInt(100, 999)}`,
    `${first.toLowerCase()}${last[0].toLowerCase()}${randomInt(1000, 9999)}`,
    `${first.toLowerCase()}_${last.toLowerCase()}${randomInt(1, 99)}`,
  ];
  return `${randomChoice(patterns)}@${randomChoice(domains)}`;
}

function generateBirthDate(): string {
  const birthYear = randomInt(2003, 2006);
  const month = String(randomInt(1, 12)).padStart(2, "0");
  const day = String(randomInt(1, 28)).padStart(2, "0");
  return `${birthYear}-${month}-${day}`;
}

async function sheeridRequest(
  session: VerificationSession,
  method: string,
  endpoint: string,
  body?: any
): Promise<{ data: any; status: number }> {
  const url = `${SHEERID_API_URL}${endpoint}`;

  try {
    const opts: any = { method, headers: { ...session.headers } };
    if (body) opts.body = JSON.stringify(body);
    const res = await session.client.fetch(url, opts);
    const rawText = typeof res.text === "function" ? await res.text() : (typeof res.body === "string" ? res.body : JSON.stringify(res.body));
    let data: any;
    try {
      data = JSON.parse(rawText);
    } catch {
      data = { _rawResponse: rawText.substring(0, 500) };
    }
    console.log(`[API] ${method} ${endpoint} => ${res.status}`, JSON.stringify(data).substring(0, 300));
    return { data, status: res.status };
  } catch (e: any) {
    console.log(`[API] ${method} ${endpoint} => EXCEPTION: ${e.message}`);
    return { data: { error: e.message }, status: 500 };
  }
}

async function uploadToS3(session: VerificationSession, uploadUrl: string, doc: Buffer, mimeType: string): Promise<boolean> {
  try {
    const res = await session.client.fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": mimeType },
      body: doc,
    });
    console.log(`[S3] Upload status: ${res.status}, size: ${doc.length} bytes`);
    return res.status >= 200 && res.status < 300;
  } catch (e) {
    console.log(`[S3] Upload failed: ${e}`);
    return false;
  }
}

const MALE_PHOTO_COUNT = 12;
const FEMALE_PHOTO_COUNT = 8;
let malePhotoIndex = 0;
let femalePhotoIndex = 0;

function getNextPhotoUrl(gender: string): string {
  if (gender === "female") {
    femalePhotoIndex = (femalePhotoIndex % FEMALE_PHOTO_COUNT) + 1;
    return `/photos/female/${femalePhotoIndex}.png`;
  } else {
    malePhotoIndex = (malePhotoIndex % MALE_PHOTO_COUNT) + 1;
    return `/photos/male/${malePhotoIndex}.png`;
  }
}

async function fetchRealisticFaceUrl(gender: string): Promise<string> {
  return getNextPhotoUrl(gender);
}

function stripCitySuffix(name: string): string {
  return name.replace(/\s*\([^)]*\)\s*$/, "").trim();
}

function getCollegeColor(collegeName: string): string {
  const colors: Record<string, string> = {
    "Bay Mills": "#003057",
    "Little Priest": "#1a3a5c",
    "Cankdeska": "#2c1810",
    "Aaniiih": "#1b4332",
    "Chief Dull Knife": "#4a1c1c",
    "Keweenaw": "#0d3b66",
    "Leech Lake": "#1a472a",
    "Nebraska Indian": "#8b2500",
    "Oglala Lakota": "#2d1b69",
    "Red Lake": "#7b1113",
    "Sinte Gleska": "#0b3d2e",
    "Sisseton": "#1e3a5f",
    "Tohono": "#6b3410",
    "United Tribes": "#1c3f60",
    "White Earth": "#2e4a1e",
    "Blackfeet": "#1a1a2e",
    "Nueta Hidatsa": "#3d2b1f",
    "Bacone": "#003300",
    "Southwestern Indian": "#5c1a1a",
    "Dine": "#8b4513",
    "Salish Kootenai": "#0a3d62",
    "Menominee": "#2d572c",
  };
  for (const [key, color] of Object.entries(colors)) {
    if (collegeName.includes(key)) return color;
  }
  return "#003057";
}

async function saveCardLocally(
  studentName: string,
  university: string,
  birthDate: string,
  studentId: string,
  department: string,
  gender: string,
  photoUrl?: string
): Promise<string | null> {
  try {
    if (!photoUrl) photoUrl = await fetchRealisticFaceUrl(gender);
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    const validUntil = currentMonth < 6 ? `${currentYear}-06-30` : `${currentYear + 1}-01-31`;
    const displayName = stripCitySuffix(university);
    const color = getCollegeColor(displayName);
    const result = generateCardSvgSequential({
      name: studentName,
      collegeName: displayName,
      dateOfBirth: birthDate,
      department,
      studentId,
      validUntil,
      primaryColor: color,
      photoUrl,
    });
    if (!result) {
      console.log(`[DOC-GEN] No enabled templates for any category`);
      return null;
    }
    const svgContent = result.svg;
    const card = await storage.createCard({
      name: studentName,
      collegeName: displayName,
      dateOfBirth: birthDate,
      department,
      studentId,
      validUntil,
      primaryColor: color,
      gender,
      photoUrl,
      svgContent,
    });
    return card.id;
  } catch (e) {
    console.log(`[DOC-GEN] Local save failed: ${e}`);
  }
  return null;
}

function generateNoiseOverlay(width: number, height: number, intensity: number): Buffer {
  const channels = 4;
  const data = Buffer.alloc(width * height * channels);
  for (let i = 0; i < width * height; i++) {
    const noise = Math.floor((Math.random() - 0.5) * intensity * 2);
    const base = 128 + noise;
    const offset = i * channels;
    data[offset] = Math.max(0, Math.min(255, base));
    data[offset + 1] = Math.max(0, Math.min(255, base + randomInt(-3, 3)));
    data[offset + 2] = Math.max(0, Math.min(255, base + randomInt(-5, 2)));
    data[offset + 3] = randomInt(2, 8);
  }
  return data;
}

function generateLightingGradient(width: number, height: number): Buffer {
  const channels = 4;
  const data = Buffer.alloc(width * height * channels);
  const lightX = randomInt(Math.floor(width * 0.2), Math.floor(width * 0.8));
  const lightY = randomInt(0, Math.floor(height * 0.3));
  const maxDist = Math.sqrt(width * width + height * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dist = Math.sqrt((x - lightX) ** 2 + (y - lightY) ** 2);
      const normalizedDist = dist / maxDist;
      const brightness = Math.max(0, Math.min(255, Math.floor(255 * (1 - normalizedDist * 0.6))));
      const offset = (y * width + x) * channels;
      data[offset] = brightness;
      data[offset + 1] = brightness;
      data[offset + 2] = Math.max(0, brightness - randomInt(0, 8));
      data[offset + 3] = randomInt(5, 14);
    }
  }
  return data;
}

async function generateDocumentBuffer(
  name: string,
  university: string,
  birthDate: string,
  studentId: string,
  department: string,
  photoUrl?: string
): Promise<{ buffer: Buffer; svg: string; mimeType: string }> {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const validUntil = currentMonth < 6 ? `${currentYear}-06-30` : `${currentYear + 1}-01-31`;
  const displayName = stripCitySuffix(university);
  const primaryColor = getCollegeColor(displayName);

  const seqResult = generateCardSvgSequential({
    name,
    collegeName: displayName,
    dateOfBirth: birthDate,
    department,
    studentId,
    validUntil,
    primaryColor,
    photoUrl,
  });

  if (!seqResult) {
    const fallbackSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200"><text x="50" y="100" font-size="16">No enabled templates</text></svg>`;
    return { buffer: Buffer.from(fallbackSvg, "utf-8"), svg: fallbackSvg, mimeType: "image/svg+xml" };
  }

  const svgContent = seqResult.svg;

  try {
    const renderDensity = 300;
    const pngBuffer = await sharp(Buffer.from(svgContent, "utf-8"), { density: renderDensity })
      .png()
      .toBuffer();

    const metadata = await sharp(pngBuffer).metadata();
    const imgW = metadata.width || 1012;
    const imgH = metadata.height || 638;

    const angle = (Math.random() - 0.5) * 0.4;
    const bgR = 252;
    const bgG = 251;
    const bgB = 250;

    let pipeline = sharp(pngBuffer)
      .rotate(angle, { background: { r: bgR, g: bgG, b: bgB, alpha: 1 } });

    const rotatedMeta = await pipeline.toBuffer().then(b => sharp(b).metadata());
    const rW = rotatedMeta.width || imgW;
    const rH = rotatedMeta.height || imgH;

    const padTop = 8;
    const padBottom = 10;
    const padLeft = 8;
    const padRight = 8;

    pipeline = sharp(await pipeline.toBuffer())
      .extend({
        top: padTop, bottom: padBottom, left: padLeft, right: padRight,
        background: { r: bgR, g: bgG, b: bgB, alpha: 255 },
      });

    pipeline = sharp(await pipeline.toBuffer())
      .modulate({
        brightness: 1.02,
        saturation: 1.0,
        hue: 0,
      });

    pipeline = pipeline.sharpen({ sigma: 0.5 });

    const jpegQuality = 95;
    const jpegBuffer = await pipeline
      .jpeg({
        quality: jpegQuality,
        mozjpeg: false,
        chromaSubsampling: '4:4:4',
      })
      .toBuffer();

    console.log(`[DOC-GEN] Generated JPEG: ${jpegBuffer.length} bytes, q=${jpegQuality}, d=${renderDensity}, angle=${angle.toFixed(2)}°`);
    return { buffer: jpegBuffer, svg: svgContent, mimeType: "image/jpeg" };
  } catch (e) {
    console.error(`[DOC-GEN] Sharp conversion failed:`, e);
    return { buffer: Buffer.from(svgContent, "utf-8"), svg: svgContent, mimeType: "image/svg+xml" };
  }
}

export async function checkLink(url: string): Promise<{ valid: boolean; step?: string; error?: string }> {
  const vid = parseVerificationId(url);
  if (!vid) return { valid: false, error: "Invalid URL format - no verificationId found" };

  try {
    const session = await createVerificationSession();
    const { data, status } = await sheeridRequest(session, "GET", `/verification/${vid}`);
    if (status !== 200) return { valid: false, error: `Link check failed: HTTP ${status}` };

    const currentStep = data?.currentStep || "";
    const errorIds = data?.errorIds || [];

    if (currentStep === "success") return { valid: false, error: "Already verified (link used)" };
    if (currentStep === "expired") return { valid: false, error: "Link expired" };
    if (currentStep === "error") {
      if (errorIds.includes("VERIFICATION_PREVIOUSLY_COMPLETED")) return { valid: false, error: "Already completed" };
      if (errorIds.includes("MAX_ATTEMPTS_EXCEEDED")) return { valid: false, error: "Max attempts exceeded" };
      if (errorIds.includes("VERIFICATION_EXPIRED")) return { valid: false, error: "Expired" };
      return { valid: false, error: `Error: ${errorIds.join(", ") || "Unknown"}` };
    }

    return { valid: true, step: currentStep };
  } catch (e: any) {
    return { valid: false, error: `Connection error: ${e.message}` };
  }
}

async function warmUpSession(session: VerificationSession, vid: string): Promise<void> {
  try {
    await randomDelay(800, 2000);
    console.log("[WARMUP] Opening verification page in warmup browser...");
    await session.client.fetch(`https://services.sheerid.com/verify/${PROGRAM_ID}/?verificationId=${vid}`, {
      method: "GET",
      headers: {
        ...session.headers,
        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "none",
        "sec-fetch-user": "?1",
        "upgrade-insecure-requests": "1",
      },
    });
    console.log("[WARMUP] Visited verification page");

    await randomDelay(1500, 3500);
    await session.client.fetch(`${SHEERID_API_URL}/program/${PROGRAM_ID}/theme`, {
      method: "GET",
      headers: { ...session.headers },
    });
    console.log("[WARMUP] Fetched program theme");

    await randomDelay(2000, 4000);
    const searchTerm = randomChoice(["Bay", "Little", "College", "Tribal", "Community", "Indian", "Nation", "Lake", "Oglala", "Dine", "Blackfeet", "Salish", "Menominee", "Bacone", "Technical"]);
    await session.client.fetch(`${SHEERID_API_URL}/program/${PROGRAM_ID}/organization?name=${searchTerm}`, {
      method: "GET",
      headers: { ...session.headers },
    });
    console.log(`[WARMUP] Searched orgs: "${searchTerm}"`);

    await randomDelay(1000, 2500);
    const searchTerm2 = randomChoice(["University", "State", "Academy", "Institute", "School", "Center"]);
    await session.client.fetch(`${SHEERID_API_URL}/program/${PROGRAM_ID}/organization?name=${searchTerm2}`, {
      method: "GET",
      headers: { ...session.headers },
    });
    console.log(`[WARMUP] Second org search: "${searchTerm2}"`);

    await randomDelay(1000, 2000);
    await session.client.fetch(`${SHEERID_API_URL}/verification/${vid}`, {
      method: "GET",
      headers: { ...session.headers },
    });
    console.log("[WARMUP] Pre-checked verification state");

    await randomDelay(1500, 4000);
    console.log("[WARMUP] Warmup browsing complete - simulating user closing tab");
  } catch (e) {
    console.log(`[WARMUP] Non-critical warmup error: ${e}`);
  }
}

export async function runVerification(url: string, dbId: string): Promise<void> {
  const vid = parseVerificationId(url);
  if (!vid) {
    await storage.updateVerification(dbId, { status: "failed", errorMessage: "Invalid URL" });
    return;
  }

  const addLog = async (msg: string, level = "info") => {
    await storage.addLog({ verificationId: dbId, message: msg, level });
  };

  const maxAttempts = 3;

  const { proxy: selectedProxy, index: proxyIdx } = await getVerificationProxy();
  const proxyLabel = selectedProxy?.label || "No proxy";
  const proxyDisplay = proxyIdx >= 0 ? `#${proxyIdx + 1} (${proxyLabel})` : "No proxy";
  await addLog(`Proxy slot: ${proxyDisplay}`);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
  try {
    if (attempt > 1) {
      const backoffMs = Math.min(2000 * Math.pow(2, attempt - 2), 30000) + randomInt(500, 2000);
      await addLog(`Retry attempt ${attempt}/${maxAttempts} after ${Math.round(backoffMs / 1000)}s backoff...`);
      await sleep(backoffMs);
    }
    await addLog(attempt === 1 ? "Verification started" : `Retry ${attempt}/${maxAttempts} started`);

    const university = selectUniversity();
    const studentNameData = generateName();
    const email = generateEmail(studentNameData.first, studentNameData.last);
    const birthDate = generateBirthDate();

    const session = createSessionFromProxy(selectedProxy, proxyIdx, "submit");

    const realIp = await resolveRealIp(session.client);
    session.realIp = realIp;
    await addLog(`IP Address: ${realIp} | Proxy: ${proxyDisplay}`);

    await addLog(`Warming up session (IP: ${realIp})...`);
    await warmUpSession(session, vid);
    await addLog("Warmup complete, continuing with same session...");

    await storage.updateVerification(dbId, {
      status: "running",
      collegeName: university.name,
      collegeId: String(university.id),
      studentName: studentNameData.full,
      studentEmail: email,
    });

    const studentId = String(randomInt(100000000, 999999999));
    const department = randomChoice(DEPARTMENTS);
    const gender = randomChoice(["male", "female"]);

    await addLog(`Student: ${studentNameData.full} | ${email} | DOB: ${birthDate}`);

    const faceUrl = await fetchRealisticFaceUrl(gender);

    const cardId = await saveCardLocally(studentNameData.full, university.name, birthDate, studentId, department, gender, faceUrl);
    if (cardId) await addLog(`Card saved (ID: ${cardId})`);
    await addLog("Step 1/5: Checking link state...");
    const { data: checkData, status: checkStatus } = await sheeridRequest(session, "GET", `/verification/${vid}`);
    let currentStep = "collectStudentPersonalInfo";

    if (checkStatus === 200 && checkData) {
      currentStep = checkData.currentStep || "collectStudentPersonalInfo";
      const errorIds = checkData.errorIds || [];

      if (currentStep === "success") {
        await storage.updateVerification(dbId, { status: "success", redirectUrl: checkData.redirectUrl });
        await addLog("Verified successfully!", "info");
        return;
      }
      if (currentStep === "expired") {
        await storage.updateVerification(dbId, { status: "failed", errorMessage: "Link expired" });
        await addLog("Link expired", "error");
        return;
      }
      if (currentStep === "error") {
        const errMsg = `Link error: ${errorIds.join(", ") || "unknown"}`;
        await storage.updateVerification(dbId, { status: "failed", errorMessage: errMsg });
        await addLog(errMsg, "error");
        return;
      }
    } else {
      const errMsg = `Link check failed: HTTP ${checkStatus} - ${JSON.stringify(checkData).substring(0, 200)}`;
      await storage.updateVerification(dbId, { status: "failed", errorMessage: errMsg });
      await addLog(errMsg, "error");
      return;
    }
    await addLog(`Current step: ${currentStep}`);

    if (currentStep === "collectStudentPersonalInfo") {
      await randomDelay(3000, 7000);
      await addLog("Step 2/5: Submitting personal info...");

      const body = {
        firstName: studentNameData.first,
        lastName: studentNameData.last,
        birthDate,
        email,
        phoneNumber: "",
        organization: { id: university.id, name: university.name },
        deviceFingerprintHash: generateFingerprint(),
        locale: "en-US",
        metadata: {
          marketConsentValue: false,
          verificationId: vid,
          refererUrl: `https://services.sheerid.com/verify/${PROGRAM_ID}/?verificationId=${vid}`,
          submissionOptIn: "By submitting the personal information above, I acknowledge that my personal information is being collected under the privacy policy of the business from which I am seeking a discount",
        },
      };

      const { data, status } = await sheeridRequest(session, "POST", `/verification/${vid}/step/collectStudentPersonalInfo`, body);

      if (status !== 200) {
        const errDetail = data?.errorIds?.join(", ") || JSON.stringify(data).substring(0, 200);
        const errMsg = `Submit failed: HTTP ${status} - ${errDetail}`;
        await storage.updateVerification(dbId, { status: "failed", errorMessage: errMsg });
        await addLog(errMsg, "error");
        return;
      }

      if (data?.currentStep === "error") {
        const errorIds = data.errorIds || [];
        const isFraud = errorIds.includes("fraudRulesReject");
        recordUniversityResult(university.id, isFraud ? "fraud" : "failure");

        if (isFraud && attempt < maxAttempts) {
          await addLog(`Fraud detection on attempt ${attempt} - will retry with new session/identity`, "warning");
          continue;
        }

        const errMsg = isFraud
          ? `Fraud detection triggered after ${attempt} attempt(s): ${errorIds.join(", ")} (use residential proxy)`
          : `Rejected: ${errorIds.join(", ")}`;
        await storage.updateVerification(dbId, { status: "failed", errorMessage: errMsg });
        await addLog(errMsg, "error");
        return;
      }

      if (data?.currentStep === "success") {
        recordUniversityResult(university.id, "success");
        await storage.updateVerification(dbId, {
          status: "success",
          redirectUrl: data?.redirectUrl || null,
        });
        await addLog("Verified instantly (no doc needed)!");
        return;
      }

      currentStep = data?.currentStep || "";
      await addLog(`Info submitted => step: ${currentStep}`);
    }

    await randomDelay(1500, 3000);

    if (currentStep === "sso") {
      await addLog("Step 3/5: Skipping SSO...");
      const { data: ssoData } = await sheeridRequest(session, "DELETE", `/verification/${vid}/step/sso`);
      currentStep = ssoData?.currentStep || "docUpload";
      await addLog(`SSO skipped => step: ${currentStep}`);
    }

    if (currentStep !== "docUpload") {
      if (currentStep === "pending") {
        await storage.updateVerification(dbId, { status: "review" });
        await addLog("Submitted for review (pending state)");

        const pollStart = Date.now();
        const maxWait = 120000;
        while (Date.now() - pollStart < maxWait) {
          await sleep(5000);
          const elapsed = Math.floor((Date.now() - pollStart) / 1000);
          const { data: pollData, status: pollStatus } = await sheeridRequest(session, "GET", `/verification/${vid}`);
          if (pollStatus !== 200) { await addLog(`Poll error: HTTP ${pollStatus}`, "warning"); continue; }

          const step = pollData?.currentStep || "";
          if (step === "success") {
            await storage.updateVerification(dbId, { status: "success", redirectUrl: pollData?.redirectUrl || null });
            await addLog(`Approved after ${elapsed}s!`);
            return;
          }
          if (["rejected", "error", "docUpload"].includes(step)) {
            const errorIds = pollData?.errorIds || [];
            const errMsg = step === "docUpload" ? "Sent back to doc upload" : `Rejected: ${errorIds.join(", ")}`;
            if (step === "docUpload") {
              currentStep = "docUpload";
              await addLog(`Review result: sent to docUpload after ${elapsed}s`);
              break;
            }
            await storage.updateVerification(dbId, { status: "failed", errorMessage: errMsg });
            await addLog(`${errMsg} (${elapsed}s)`, "error");
            return;
          }
          await addLog(`Polling ${elapsed}s: ${step}`);
        }

        if (currentStep !== "docUpload") {
          await storage.updateVerification(dbId, { status: "review", errorMessage: "Still under review" });
          await addLog("Still under review after timeout");
          return;
        }
      } else {
        const errMsg = `Unexpected step after info submit: ${currentStep}`;
        await storage.updateVerification(dbId, { status: "failed", errorMessage: errMsg });
        await addLog(errMsg, "error");
        return;
      }
    }

    await randomDelay(3000, 6000);

    await addLog("Step 4/5: Generating & uploading document...");
    const { buffer: doc, svg: docSvg, mimeType } = await generateDocumentBuffer(
      studentNameData.full, university.name, birthDate, studentId, department, faceUrl
    );
    await storage.updateVerification(dbId, { documentSvg: docSvg });

    const ext = mimeType === "image/jpeg" ? "jpg" : "png";
    const filename = `student_id_${vid.substring(0, 8)}.${ext}`;

    const uploadBody = {
      files: [{ fileName: filename, mimeType, fileSize: doc.length }],
    };

    await addLog(`Document ready: ${doc.length} bytes, ${mimeType}`);

    const { data: uploadData, status: uploadStatus } = await sheeridRequest(
      session, "POST", `/verification/${vid}/step/docUpload`, uploadBody
    );

    if (!uploadData?.documents?.length) {
      const detail = JSON.stringify(uploadData).substring(0, 300);
      const errMsg = `No upload URL received (HTTP ${uploadStatus}): ${detail}`;
      await storage.updateVerification(dbId, { status: "failed", errorMessage: errMsg });
      await addLog(errMsg, "error");
      return;
    }

    const uploadUrl = uploadData.documents[0].uploadUrl;
    if (!uploadUrl) {
      await storage.updateVerification(dbId, { status: "failed", errorMessage: "Upload URL is empty" });
      await addLog("Upload URL is empty in response", "error");
      return;
    }

    if (!(await uploadToS3(session, uploadUrl, doc, mimeType))) {
      await storage.updateVerification(dbId, { status: "failed", errorMessage: "S3 upload failed" });
      await addLog("S3 upload failed", "error");
      return;
    }

    await addLog(`Document uploaded to S3 (${doc.length} bytes)`);
    await randomDelay(2000, 4000);

    await addLog("Step 5/5: Completing verification...");
    const { data: completeData } = await sheeridRequest(session, "POST", `/verification/${vid}/step/completeDocUpload`);
    const finalStep = completeData?.currentStep || "unknown";

    if (finalStep === "success") {
      recordUniversityResult(university.id, "success");
      await storage.updateVerification(dbId, {
        status: "success",
        redirectUrl: completeData?.redirectUrl || null,
      });
      await addLog("Verified successfully!");
      return;
    }

    if (["rejected", "error"].includes(finalStep)) {
      const errorIds = completeData?.errorIds || [];
      const isFraud = errorIds.includes("fraudRulesReject");
      recordUniversityResult(university.id, isFraud ? "fraud" : "failure");

      if (isFraud && attempt < maxAttempts) {
        await addLog(`Fraud detection at doc stage on attempt ${attempt} - will retry`, "warning");
        continue;
      }

      const errMsg = isFraud
        ? `Fraud detected after ${attempt} attempt(s): ${errorIds.join(", ")} (need residential proxy)`
        : errorIds.length ? `Rejected: ${errorIds.join(", ")}` : "Document rejected";
      await storage.updateVerification(dbId, { status: "failed", errorMessage: errMsg });
      await addLog(errMsg, "error");
      return;
    }

    if (finalStep === "docUpload") {
      recordUniversityResult(university.id, "failure");
      await storage.updateVerification(dbId, { status: "failed", errorMessage: "Document rejected (sent back to upload)" });
      await addLog("Document rejected (still on docUpload)", "error");
      return;
    }

    await storage.updateVerification(dbId, { status: "review" });
    await addLog(`Waiting for review (step: ${finalStep})...`);
    const pollStart = Date.now();
    const maxWait = 120000;

    while (Date.now() - pollStart < maxWait) {
      await sleep(5000);
      const elapsed = Math.floor((Date.now() - pollStart) / 1000);

      try {
        const { data: pollData, status: pollStatus } = await sheeridRequest(session, "GET", `/verification/${vid}`);
        if (pollStatus !== 200) { await addLog(`Poll error: HTTP ${pollStatus}`, "warning"); continue; }

        const step = pollData?.currentStep || "";

        if (step === "success") {
          recordUniversityResult(university.id, "success");
          await storage.updateVerification(dbId, {
            status: "success",
            redirectUrl: pollData?.redirectUrl || null,
          });
          await addLog(`Approved after ${elapsed}s!`);
          return;
        }

        if (step === "docUpload") {
          recordUniversityResult(university.id, "failure");
          await storage.updateVerification(dbId, { status: "failed", errorMessage: "Document rejected during review" });
          await addLog(`Document rejected during review (${elapsed}s)`, "error");
          return;
        }

        if (["rejected", "error"].includes(step)) {
          const errorIds = pollData?.errorIds || [];
          recordUniversityResult(university.id, "failure");
          const errMsg = errorIds.length ? `Rejected: ${errorIds.join(", ")}` : "Rejected during review";
          await storage.updateVerification(dbId, { status: "failed", errorMessage: errMsg });
          await addLog(`${errMsg} (${elapsed}s)`, "error");
          return;
        }

        await addLog(`Polling ${elapsed}s: ${step}`);
      } catch (e) {
        continue;
      }
    }

    await storage.updateVerification(dbId, {
      status: "review",
      errorMessage: "Still under review after 120s",
    });
    await addLog("Still under review after 120s - leaving as review status");
    return;
  } catch (e: any) {
    console.error(`[ERROR] Exception in verify() attempt ${attempt}: ${e.message}`, e.stack);
    if (attempt >= maxAttempts) {
      await storage.updateVerification(dbId, { status: "failed", errorMessage: e.message });
      await addLog(`Exception: ${e.message}`, "error");
      return;
    }
    await addLog(`Exception on attempt ${attempt}: ${e.message} - retrying`, "warning");
  }
  }
}
