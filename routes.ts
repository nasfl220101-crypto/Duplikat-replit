import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { checkLink, runVerification, getUniversityStats, getUniversitiesList, setUniversityEnabled, bulkSetUniversitiesEnabled, loadUniversitySettings } from "./verifier";
import { getTemplatesList, setTemplateEnabled, bulkSetTemplatesEnabled, loadTemplateSettings } from "./card-generator";
import { generateCardSvg } from "./card-generator";
import { onBotToggled, onBotDeleted, onBotAdded } from "./bot";
import type { Verification } from "@shared/schema";

const fakeFirstNames = [
  "James","Emma","Liam","Olivia","Noah","Ava","Ethan","Sophia","Mason","Isabella",
  "Lucas","Mia","Logan","Charlotte","Alexander","Amelia","Daniel","Harper","Matthew","Evelyn",
  "Jackson","Abigail","Sebastian","Emily","Aiden","Ella","Michael","Elizabeth","Benjamin","Sofia",
  "William","Avery","Elijah","Scarlett","Henry","Grace","Samuel","Chloe","David","Zoey",
  "Joseph","Lily","Carter","Hannah","Owen","Nora","Wyatt","Riley","Jack","Aria",
  "Luke","Ellie","Jayden","Aubrey","Dylan","Savannah","Caleb","Brooklyn","Ryan","Leah",
  "Nathan","Zoe","Gabriel","Penelope","Isaac","Stella","Anthony","Hazel","Leo","Aurora",
];
const fakeLastNames = [
  "Smith","Johnson","Williams","Brown","Jones","Garcia","Miller","Davis","Rodriguez","Martinez",
  "Hernandez","Lopez","Gonzalez","Wilson","Anderson","Thomas","Taylor","Moore","Jackson","Martin",
  "Lee","Perez","Thompson","White","Harris","Sanchez","Clark","Ramirez","Lewis","Robinson",
  "Walker","Young","Allen","King","Wright","Scott","Torres","Nguyen","Hill","Flores",
  "Green","Adams","Nelson","Baker","Hall","Rivera","Campbell","Mitchell","Carter","Roberts",
  "Turner","Phillips","Parker","Evans","Edwards","Collins","Stewart","Morris","Reed","Cook",
];
const fakeColleges = [
  "Cankdeska Cikana Community College","Chief Dull Knife College","College of Menominee Nation",
  "Dine College","Fond du Lac Tribal and Community College","Fort Berthold Community College",
  "Fort Peck Community College","Haskell Indian Nations University","Ilisagvik College",
  "Institute of American Indian Arts","Keweenaw Bay Ojibwa Community College",
  "Lac Courte Oreilles Ojibwa College","Leech Lake Tribal College","Little Big Horn College",
  "Little Priest Tribal College","Navajo Technical University","Nebraska Indian Community College",
  "Northwest Indian College","Nueta Hidatsa Sahnish College","Oglala Lakota College",
  "Red Lake Nation College","Saginaw Chippewa Tribal College","Salish Kootenai College",
  "Sinte Gleska University","Sisseton Wahpeton College","Sitting Bull College",
  "Southwestern Indian Polytechnic Institute","Stone Child College","Tohono O'odham Community College",
  "Turtle Mountain Community College","United Tribes Technical College","White Earth Tribal College",
];

const fakeActivities: Verification[] = [];
let fakeIdCounter = 0;

const fakeRunning: Verification[] = [];

function refreshFakeRunning() {
  const count = 1 + Math.floor(Math.random() * 3);
  fakeRunning.length = 0;
  for (let i = 0; i < count; i++) {
    const firstName = fakeFirstNames[Math.floor(Math.random() * fakeFirstNames.length)];
    const lastName = fakeLastNames[Math.floor(Math.random() * fakeLastNames.length)];
    const college = fakeColleges[Math.floor(Math.random() * fakeColleges.length)];
    fakeRunning.push({
      id: `fake-run-${Date.now()}-${i}`,
      verificationId: `fake-run-vid-${i}`,
      url: `https://services.sheerid.com/verify/run/${i}`,
      status: "running",
      studentName: `${firstName} ${lastName}`,
      studentEmail: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@gmail.com`,
      collegeName: college,
      collegeId: null,
      errorMessage: null,
      redirectUrl: null,
      documentSvg: null,
      createdAt: new Date(Date.now() - Math.floor(Math.random() * 15000)),
    });
  }
}
refreshFakeRunning();
setInterval(refreshFakeRunning, 12000);

function generateFakeActivity() {
  const firstName = fakeFirstNames[Math.floor(Math.random() * fakeFirstNames.length)];
  const lastName = fakeLastNames[Math.floor(Math.random() * fakeLastNames.length)];
  const college = fakeColleges[Math.floor(Math.random() * fakeColleges.length)];
  const isSuccess = Math.random() < 0.88;
  fakeIdCounter++;
  const now = new Date();

  const entry: Verification = {
    id: `fake-${fakeIdCounter}-${Date.now()}`,
    verificationId: `fake-vid-${fakeIdCounter}`,
    url: `https://services.sheerid.com/verify/fake/${fakeIdCounter}`,
    status: isSuccess ? "success" : "failed",
    studentName: `${firstName} ${lastName}`,
    studentEmail: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@gmail.com`,
    collegeName: college,
    collegeId: null,
    errorMessage: isSuccess ? null : ["fraudRulesReject", "Document unclear", "Verification timeout", "Identity mismatch"][Math.floor(Math.random() * 4)],
    redirectUrl: isSuccess ? `https://one.google.com/redeem?code=FAKE${fakeIdCounter}` : null,
    documentSvg: null,
    createdAt: now,
  };

  fakeActivities.unshift(entry);
  if (fakeActivities.length > 50) fakeActivities.length = 50;
}

setInterval(generateFakeActivity, 10000);
for (let i = 0; i < 8; i++) {
  generateFakeActivity();
  const entry = fakeActivities[0];
  entry.createdAt = new Date(Date.now() - (8 - i) * 10000 * (1 + Math.random()));
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.get("/api/verifications", async (req, res) => {
    const items = await storage.getAllVerifications();
    if (req.query.real === "1") {
      res.json(items);
      return;
    }
    const merged = [...items, ...fakeActivities, ...fakeRunning].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    res.json(merged);
  });

  app.get("/api/verifications/:id", async (req, res) => {
    const item = await storage.getVerification(req.params.id);
    if (!item) return res.status(404).json({ error: "Not found" });
    res.json(item);
  });

  app.get("/api/verifications/:id/logs", async (req, res) => {
    const logs = await storage.getLogsByVerification(req.params.id);
    res.json(logs);
  });

  app.post("/api/verifications/check", async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "URL required" });
    const result = await checkLink(url);
    res.json(result);
  });

  app.post("/api/verifications", async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "URL required" });

    const vidMatch = url.match(/verificationId=([a-f0-9]+)/i);
    if (!vidMatch) return res.status(400).json({ error: "Invalid verification URL" });

    const vid = vidMatch[1];
    const record = await storage.createVerification({
      verificationId: vid,
      url,
      status: "pending",
    });

    runVerification(url, record.id).catch((e) =>
      console.error(`[BG] Verification error: ${e}`)
    );

    res.json(record);
  });

  app.delete("/api/verifications/:id", async (req, res) => {
    await storage.deleteVerification(req.params.id);
    res.json({ ok: true });
  });

  app.get("/api/documents/recent", async (_req, res) => {
    const all = await storage.getAllVerifications();
    const withDocs = all
      .filter((v) => v.documentSvg)
      .slice(0, 3)
      .map((v) => ({
        id: v.id,
        studentName: v.studentName,
        collegeName: v.collegeName,
        status: v.status,
        documentSvg: v.documentSvg,
        createdAt: v.createdAt,
      }));
    res.json(withDocs);
  });

  // Return a local photo URL based on gender, cycling through available photos
  let apiFemaleIdx = 0;
  let apiMaleIdx = 0;
  app.get("/api/random-face", async (req, res) => {
    const gender = req.query.gender === "female" ? "female" : "male";
    if (gender === "female") {
      apiFemaleIdx = (apiFemaleIdx % 8) + 1;
      res.json({ photoUrl: `/photos/female/${apiFemaleIdx}.png` });
    } else {
      apiMaleIdx = (apiMaleIdx % 12) + 1;
      res.json({ photoUrl: `/photos/male/${apiMaleIdx}.png` });
    }
  });

  // Card endpoints
  app.get("/api/cards", async (_req, res) => {
    const items = await storage.getAllCards();
    res.json(items);
  });

  app.get("/api/cards/:id", async (req, res) => {
    const item = await storage.getCard(req.params.id);
    if (!item) return res.status(404).json({ error: "Not found" });
    res.json(item);
  });

  app.post("/api/cards", async (req, res) => {
    const { name, collegeName, dateOfBirth, department, studentId, validUntil, primaryColor, gender, photoUrl } = req.body;
    if (!name || !collegeName || !dateOfBirth || !department || !studentId || !validUntil) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const color = primaryColor || "#1e3a8a";
    const svgContent = generateCardSvg({
      name, collegeName, dateOfBirth, department, studentId, validUntil,
      primaryColor: color, photoUrl,
    });
    const card = await storage.createCard({
      name, collegeName, dateOfBirth, department, studentId, validUntil,
      primaryColor: color, gender: gender || "male", photoUrl: photoUrl || null,
      svgContent,
    });
    res.json(card);
  });

  app.delete("/api/cards/:id", async (req, res) => {
    await storage.deleteCard(req.params.id);
    res.json({ ok: true });
  });

  app.post("/api/cards/preview", async (req, res) => {
    const { name, collegeName, dateOfBirth, department, studentId, validUntil, primaryColor, photoUrl, category } = req.body;
    const svg = generateCardSvg({
      name: name || "Student Name",
      collegeName: collegeName || "University",
      dateOfBirth: dateOfBirth || "2000-01-01",
      department: department || "Computer Science",
      studentId: studentId || "20240001",
      validUntil: validUntil || "2027-12-31",
      primaryColor: primaryColor || "#1e3a8a",
      photoUrl,
    }, category || "id_card");
    res.json({ svg: svg || "" });
  });

  app.get("/api/proxies", async (_req, res) => {
    const items = await storage.getProxies();
    res.json(items);
  });

  app.post("/api/proxies", async (req, res) => {
    const { url, label, role } = req.body;
    if (!url) return res.status(400).json({ error: "Proxy URL required" });
    const p = await storage.addProxy({ url, label, role: role || "submit", isActive: true });
    res.json(p);
  });

  app.post("/api/proxies/toggle-all", async (req, res) => {
    const { isActive } = req.body;
    if (typeof isActive !== "boolean") {
      return res.status(400).json({ error: "isActive boolean required" });
    }
    const allProxies = await storage.getProxies();
    for (const p of allProxies) {
      await storage.updateProxy(p.id, { isActive });
    }
    res.json({ updated: allProxies.length });
  });

  app.post("/api/proxies/bulk", async (req, res) => {
    const { proxies: proxyLines } = req.body;
    if (!proxyLines || typeof proxyLines !== "string") {
      return res.status(400).json({ error: "Proxy list required" });
    }
    const lines = proxyLines.split("\n").map((l: string) => l.trim()).filter(Boolean);
    const unique = Array.from(new Set(lines));
    let added = 0;
    let skipped = 0;
    for (const line of unique) {
      let proxyUrl = "";
      try {
        const hasScheme = /^(https?|socks[45]?):\/\//i.test(line);
        if (line.includes("@")) {
          proxyUrl = hasScheme ? line : `http://${line}`;
        } else {
          const parts = line.split(":");
          if (parts.length === 4) {
            proxyUrl = `http://${parts[2]}:${parts[3]}@${parts[0]}:${parts[1]}`;
          } else if (parts.length === 2) {
            proxyUrl = `http://${parts[0]}:${parts[1]}`;
          }
        }
        if (!proxyUrl || !proxyUrl.includes(":")) {
          skipped++;
          continue;
        }
        new URL(proxyUrl);
        await storage.addProxy({ url: proxyUrl, label: "bulk-import", isActive: true });
        added++;
      } catch {
        skipped++;
      }
    }
    res.json({ added, skipped, total: unique.length });
  });

  app.patch("/api/proxies/:id", async (req, res) => {
    const { isActive, role } = req.body;
    const updateData: any = {};
    if (isActive !== undefined) updateData.isActive = isActive;
    if (role !== undefined) updateData.role = role;
    
    const p = await storage.updateProxy(req.params.id, updateData);
    if (!p) return res.status(404).json({ error: "Proxy not found" });
    res.json(p);
  });

  app.delete("/api/proxies/:id", async (req, res) => {
    await storage.deleteProxy(req.params.id);
    res.json({ ok: true });
  });

  app.delete("/api/proxies", async (_req, res) => {
    const count = await storage.deleteAllProxies();
    res.json({ ok: true, deleted: count });
  });

  app.post("/api/proxies/delete-selected", async (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids)) return res.status(400).json({ error: "ids array required" });
    const count = await storage.deleteProxiesByIds(ids);
    res.json({ ok: true, deleted: count });
  });

  app.get("/api/stats", async (req, res) => {
    const all = await storage.getAllVerifications();
    const realSuccess = all.filter((v) => v.status === "success").length;
    const realFailed = all.filter((v) => v.status === "failed").length;
    const realRunning = all.filter((v) => ["pending", "running", "review"].includes(v.status)).length;

    if (req.query.real === "1") {
      const total = all.length;
      res.json({ total, success: realSuccess, failed: realFailed, running: realRunning, rate: total ? Math.round((realSuccess / total) * 100) : 0 });
      return;
    }

    const fakeSuccess = fakeActivities.filter((v) => v.status === "success").length;
    const fakeFailed = fakeActivities.filter((v) => v.status === "failed").length;
    const running = realRunning + fakeRunning.length;

    const boostTotal = 15247;
    const boostRate = 88;
    const total = boostTotal + all.length + fakeActivities.length;
    const success = Math.round((boostTotal * boostRate) / 100) + realSuccess + fakeSuccess;
    const failed = total - success - running;

    res.json({ total, success, failed, running, rate: total ? Math.round((success / total) * 100) : 0 });
  });

  app.get("/api/stats/universities", async (_req, res) => {
    res.json(getUniversityStats());
  });

  app.get("/api/universities", async (_req, res) => {
    res.json(getUniversitiesList());
  });

  app.patch("/api/universities/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const { enabled } = req.body;
    if (typeof enabled !== "boolean") return res.status(400).json({ error: "enabled (boolean) required" });
    await setUniversityEnabled(id, enabled);
    res.json({ ok: true, id, enabled });
  });

  app.post("/api/universities/bulk", async (req, res) => {
    const { ids, enabled } = req.body;
    if (!Array.isArray(ids) || typeof enabled !== "boolean") {
      return res.status(400).json({ error: "ids (array) and enabled (boolean) required" });
    }
    await bulkSetUniversitiesEnabled(ids.map(Number), enabled);
    res.json({ ok: true, count: ids.length, enabled });
  });

  app.get("/api/telegram-bots", async (_req, res) => {
    const bots = await storage.getTelegramBots();
    res.json(bots);
  });

  app.post("/api/telegram-bots", async (req, res) => {
    const { token, label } = req.body;
    if (!token) return res.status(400).json({ error: "Bot token required" });
    const newBot = await storage.createTelegramBot({
      token,
      label: label || "Bot",
      isActive: false,
      status: "stopped",
      username: null,
    });
    onBotAdded(newBot.id).catch(e => console.error("[ROUTE] onBotAdded error:", e));
    res.json(newBot);
  });

  app.patch("/api/telegram-bots/:id", async (req, res) => {
    const { isActive, label, status } = req.body;
    const updates: any = {};
    if (isActive !== undefined) updates.isActive = isActive;
    if (label !== undefined) updates.label = label;
    if (status !== undefined) updates.status = status;
    const updatedBot = await storage.updateTelegramBot(req.params.id, updates);
    if (!updatedBot) return res.status(404).json({ error: "Bot not found" });
    if (isActive !== undefined) {
      onBotToggled(req.params.id, isActive).catch(e => console.error("[ROUTE] onBotToggled error:", e));
    }
    res.json(updatedBot);
  });

  app.delete("/api/telegram-bots/:id", async (req, res) => {
    onBotDeleted(req.params.id).catch(e => console.error("[ROUTE] onBotDeleted error:", e));
    await storage.deleteTelegramBot(req.params.id);
    res.json({ ok: true });
  });

  app.get("/api/bot-settings", async (_req, res) => {
    const settings = await storage.getBotSettings();
    const obj: Record<string, string> = {};
    for (const s of settings) obj[s.key] = s.value;
    res.json(obj);
  });

  app.put("/api/bot-settings", async (req, res) => {
    const entries = req.body;
    if (!entries || typeof entries !== "object") return res.status(400).json({ error: "Object required" });
    for (const [key, value] of Object.entries(entries)) {
      if (typeof value === "string" && value.trim()) {
        await storage.setBotSetting(key, value);
      }
    }
    res.json({ ok: true });
  });

  app.put("/api/bot-settings/:key", async (req, res) => {
    const { value } = req.body;
    if (typeof value !== "string") return res.status(400).json({ error: "value (string) required" });
    await storage.setBotSetting(req.params.key, value);
    res.json({ ok: true });
  });

  app.delete("/api/bot-settings/:key", async (req, res) => {
    await storage.deleteBotSetting(req.params.key);
    res.json({ ok: true });
  });

  app.get("/api/templates", async (req, res) => {
    const category = req.query.category as string | undefined;
    const validCategories = ["id_card", "class_schedule", "tuition_receipt"];
    if (category && validCategories.includes(category)) {
      res.json(getTemplatesList(category as any));
    } else {
      res.json(getTemplatesList());
    }
  });

  app.get("/api/templates/categories", async (_req, res) => {
    const allTemplates = getTemplatesList();
    const categories = ["id_card", "class_schedule", "tuition_receipt"] as const;
    const result = categories.map(cat => {
      const catTemplates = allTemplates.filter(t => t.category === cat);
      const enabledCount = catTemplates.filter(t => t.enabled).length;
      return { category: cat, enabled: enabledCount > 0, total: catTemplates.length, enabledCount };
    });
    res.json(result);
  });

  app.patch("/api/templates/:id", async (req, res) => {
    const id = req.params.id;
    const { enabled } = req.body;
    if (typeof enabled !== "boolean") return res.status(400).json({ error: "enabled (boolean) required" });
    await setTemplateEnabled(id, enabled);
    res.json({ ok: true, id, enabled });
  });

  app.post("/api/templates/bulk", async (req, res) => {
    const { ids, enabled } = req.body;
    if (!Array.isArray(ids) || typeof enabled !== "boolean") {
      return res.status(400).json({ error: "ids (array) and enabled (boolean) required" });
    }
    await bulkSetTemplatesEnabled(ids, enabled);
    res.json({ ok: true, count: ids.length, enabled });
  });

  app.post("/api/templates/category-toggle", async (req, res) => {
    const { category, enabled } = req.body;
    const validCategories = ["id_card", "class_schedule", "tuition_receipt"];
    if (!validCategories.includes(category) || typeof enabled !== "boolean") {
      return res.status(400).json({ error: "category and enabled required" });
    }
    const templates = getTemplatesList(category);
    const ids = templates.map(t => t.id);
    await bulkSetTemplatesEnabled(ids, enabled);
    res.json({ ok: true, category, enabled, count: ids.length });
  });

  await loadUniversitySettings();
  await loadTemplateSettings();
  await seedProxies();

  return httpServer;
}

const DC_PROXIES = [
  "45.3.47.217:3129","209.50.165.24:3129","45.3.49.239:3129","104.207.54.251:3129",
  "65.111.10.209:3129","104.207.35.115:3129","216.26.228.77:3129","209.50.173.189:3129",
  "45.3.46.203:3129","216.26.243.243:3129","216.26.241.164:3129","104.207.51.118:3129",
  "104.207.45.117:3129","104.207.55.186:3129","104.207.54.189:3129","104.207.50.38:3129",
  "216.26.235.194:3129","216.26.246.144:3129","104.207.43.168:3129","209.50.164.162:3129",
  "216.26.236.110:3129","65.111.6.166:3129","45.3.44.22:3129","65.111.7.72:3129",
  "209.50.188.252:3129","193.56.28.42:3129","65.111.3.241:3129","216.26.250.81:3129",
  "104.207.60.0:3129","104.167.25.12:3129","104.207.36.29:3129","216.26.243.22:3129",
  "45.3.35.85:3129","45.3.35.81:3129","209.50.169.136:3129","104.207.59.36:3129",
  "193.56.28.111:3129","45.3.39.71:3129","209.50.189.233:3129","216.26.239.195:3129",
  "154.213.161.240:3129","216.26.229.100:3129","45.3.44.179:3129","104.207.49.39:3129",
  "209.50.191.246:3129","216.26.233.241:3129","216.26.252.81:3129","65.111.22.211:3129",
  "65.111.27.87:3129","209.50.181.89:3129","209.50.176.75:3129","104.207.36.244:3129",
  "216.26.237.81:3129","216.26.247.5:3129","216.26.244.55:3129","104.207.33.30:3129",
  "209.50.177.150:3129","209.50.170.237:3129","209.50.188.93:3129","209.50.177.209:3129",
  "154.213.166.203:3129","216.26.240.200:3129","65.111.5.214:3129","104.207.32.120:3129",
  "65.111.4.246:3129","45.3.36.193:3129","104.207.60.242:3129","216.26.254.190:3129",
  "104.207.42.78:3129","65.111.1.113:3129","45.3.32.230:3129","104.207.57.12:3129",
  "104.207.49.204:3129","104.207.38.89:3129","216.26.231.168:3129","104.207.40.7:3129",
  "104.207.44.205:3129","209.50.178.168:3129","104.207.48.215:3129","209.50.163.143:3129",
  "193.56.28.97:3129","216.26.227.0:3129","209.50.160.119:3129","104.207.59.188:3129",
  "65.111.21.102:3129","209.50.170.81:3129","209.50.174.117:3129","45.3.43.136:3129",
  "65.111.30.76:3129","65.111.15.136:3129","65.111.9.55:3129","216.26.249.185:3129",
  "209.50.163.60:3129","65.111.7.161:3129","104.207.50.121:3129","104.207.42.58:3129",
  "216.26.254.51:3129","45.3.32.232:3129","216.26.239.201:3129","45.3.55.118:3129",
];

async function seedProxies() {
  try {
    const existing = await storage.getProxies();
    const existingUrls = new Set(existing.map(p => p.url));
    let added = 0;
    for (let i = 0; i < DC_PROXIES.length; i++) {
      const url = `http://${DC_PROXIES[i]}`;
      if (!existingUrls.has(url)) {
        const num = String(i + 1).padStart(3, "0");
        await storage.addProxy({ url, label: `DC-${num}`, isActive: true, role: "submit" });
        added++;
      }
    }
    console.log(`[PROXY] Seed: ${added} new proxies added (${DC_PROXIES.length} total in list, ${existing.length + added} in DB)`);
  } catch (e) {
    console.log(`[PROXY] Seed failed: ${e}`);
  }
}
