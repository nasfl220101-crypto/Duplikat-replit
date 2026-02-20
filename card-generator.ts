import fs from "fs";
import path from "path";

export interface CardData {
  name: string;
  collegeName: string;
  dateOfBirth: string;
  department: string;
  studentId: string;
  validUntil: string;
  primaryColor: string;
  photoUrl?: string | null;
}

function resolvePhotoToBase64(photoUrl: string): string {
  if (photoUrl.startsWith("data:")) return photoUrl;
  if (photoUrl.startsWith("/photos/")) {
    const filePath = path.join(process.cwd(), "client", "public", photoUrl);
    try {
      const buf = fs.readFileSync(filePath);
      return `data:image/png;base64,${buf.toString("base64")}`;
    } catch (e) {
      console.error(`[CARD] Failed to read photo file: ${filePath}`, e);
      return photoUrl;
    }
  }
  return photoUrl;
}

function generateBarcode(studentId: string): string {
  let bars = "";
  const digits = studentId.replace(/\D/g, "").substring(0, 12);
  let x = 0;
  const barHeight = 35;

  bars += `<rect x="${x}" y="0" width="2.5" height="${barHeight}" fill="#1a1a1a"/>`;
  x += 4;
  bars += `<rect x="${x}" y="0" width="1" height="${barHeight}" fill="#1a1a1a"/>`;
  x += 3;

  for (let i = 0; i < digits.length; i++) {
    const d = parseInt(digits[i], 10);
    const widths = [
      [2.5,1.5,1,1.5], [2,2.5,1,1.5], [2,1,2.5,1.5], [1.5,3.5,1,1.5], [2,1,1,2.5],
      [1.5,2.5,2.5,1], [1.5,1,3.5,1], [1.5,2.5,1,2.5], [2,1.5,2,1.5], [2.5,1,1,1.5],
    ];
    const pattern = widths[d] || widths[0];
    for (let j = 0; j < pattern.length; j++) {
      const w = pattern[j];
      if (j % 2 === 0) {
        bars += `<rect x="${x}" y="0" width="${w}" height="${barHeight}" fill="#1a1a1a"/>`;
      }
      x += w;
    }
    x += 0.8;
  }

  bars += `<rect x="${x}" y="0" width="1" height="${barHeight}" fill="#1a1a1a"/>`;
  x += 3;
  bars += `<rect x="${x}" y="0" width="2.5" height="${barHeight}" fill="#1a1a1a"/>`;

  return `<g>${bars}</g>`;
}

function hashName(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = ((h << 5) - h + name.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function getAcademicYear(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  return m >= 7 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
  } catch { return dateStr; }
}

function layoutHorizontalClassic(data: CardData, color: string, photo: string | null): string {
  const w = 1012, h = 638;
  const fontFamily = "Impact, 'Arial Black', sans-serif";
  const bodyFont = "Arial, Helvetica, sans-serif";
  const dob = formatDate(data.dateOfBirth);
  const valid = formatDate(data.validUntil);
  const academicYear = getAcademicYear();
  const collegeFontSize = data.collegeName.length > 28 ? 20 : 26;
  const barcodeDigits = data.studentId.replace(/\D/g, "").substring(0, 12);
  const barcodeWidth = barcodeDigits.length * 8 + 14;

  const photoSection = photo
    ? `<defs><clipPath id="photoClip"><rect x="30" y="100" width="240" height="320" rx="12"/></clipPath></defs>
       <rect x="28" y="98" width="244" height="324" rx="13" fill="white" stroke="${color}" stroke-width="3"/>
       <image href="${photo}" x="30" y="100" width="240" height="320" clip-path="url(#photoClip)" preserveAspectRatio="xMidYMid slice"/>`
    : `<rect x="30" y="100" width="240" height="320" rx="12" fill="#eef1f5" stroke="${color}" stroke-width="3"/>
       <text x="150" y="268" fill="#8899aa" font-family="${bodyFont}" font-size="14" text-anchor="middle">PHOTO</text>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" rx="16" fill="#ffffff"/>
  <rect x="0" y="0" width="${w}" height="80" rx="16" fill="${color}"/>
  <rect x="0" y="16" width="${w}" height="64" fill="${color}"/>
  <rect x="0" y="80" width="${w}" height="6" fill="${color}" opacity="0.3"/>

  <text x="30" y="52" fill="white" font-family="${fontFamily}" font-size="${collegeFontSize}" letter-spacing="1.5">${data.collegeName.toUpperCase()}</text>
  <text x="${w - 30}" y="35" fill="rgba(255,255,255,0.9)" font-family="${bodyFont}" font-size="10" text-anchor="end" letter-spacing="2">STUDENT ID CARD</text>
  <text x="${w - 30}" y="55" fill="rgba(255,255,255,0.6)" font-family="${bodyFont}" font-size="10" text-anchor="end">${academicYear}</text>

  ${photoSection}

  <text x="305" y="135" fill="#374151" font-family="${bodyFont}" font-size="11" letter-spacing="2" font-weight="600">STUDENT NAME</text>
  <text x="305" y="170" fill="#111827" font-family="${fontFamily}" font-size="30" letter-spacing="0.5">${data.name.toUpperCase()}</text>

  <rect x="305" y="185" width="200" height="3" fill="${color}"/>

  <text x="305" y="225" fill="#6b7280" font-family="${bodyFont}" font-size="10" letter-spacing="1.5">STUDENT ID</text>
  <text x="305" y="248" fill="#111827" font-family="'Courier New', monospace" font-size="20" font-weight="bold" letter-spacing="2">${data.studentId}</text>

  <text x="650" y="225" fill="#6b7280" font-family="${bodyFont}" font-size="10" letter-spacing="1.5">DEPARTMENT</text>
  <text x="650" y="248" fill="#111827" font-family="${bodyFont}" font-size="15" font-weight="600">${data.department}</text>

  <text x="305" y="290" fill="#6b7280" font-family="${bodyFont}" font-size="10" letter-spacing="1.5">DATE OF BIRTH</text>
  <text x="305" y="313" fill="#1f2937" font-family="${bodyFont}" font-size="15">${dob}</text>

  <rect x="650" y="270" width="330" height="60" rx="8" fill="#fee2e2" stroke="#ef4444" stroke-width="2"/>
  <text x="665" y="293" fill="#dc2626" font-family="${bodyFont}" font-size="11" letter-spacing="2" font-weight="700">EXPIRATION DATE</text>
  <text x="665" y="318" fill="#991b1b" font-family="${fontFamily}" font-size="24">${valid}</text>

  <rect x="305" y="350" width="70" height="26" rx="13" fill="#dcfce7" stroke="#22c55e" stroke-width="1"/>
  <text x="340" y="368" fill="#166534" font-family="${bodyFont}" font-size="11" font-weight="700" text-anchor="middle">ACTIVE</text>

  <rect x="0" y="440" width="${w}" height="2" fill="#e5e7eb"/>

  <g transform="translate(${Math.floor((w - barcodeWidth) / 2)}, 460)">
    ${generateBarcode(data.studentId)}
  </g>
  <text x="${w / 2}" y="510" fill="#4b5563" font-family="'Courier New', monospace" font-size="11" text-anchor="middle" letter-spacing="3">${data.studentId}</text>

  <text x="${w / 2}" y="555" fill="#9ca3af" font-family="${bodyFont}" font-size="8" text-anchor="middle">This card is the property of ${data.collegeName}. If found, return to Registrar's Office.</text>

  <rect x="0" y="${h - 8}" width="${w}" height="8" fill="${color}"/>
  <rect x="0" y="${h - 16}" width="${w}" height="8" rx="0" fill="${color}"/>
  <rect width="${w}" height="${h}" rx="16" fill="none" stroke="${color}" stroke-width="2"/>
</svg>`;
}

function layoutVerticalBadge(data: CardData, color: string, photo: string | null): string {
  const w = 1012, h = 638;
  const fontFamily = "Georgia, 'Times New Roman', serif";
  const dob = formatDate(data.dateOfBirth);
  const valid = formatDate(data.validUntil);
  const collegeFontSize = data.collegeName.length > 28 ? 16 : 20;
  const barcodeDigits = data.studentId.replace(/\D/g, "").substring(0, 12);
  const barcodeWidth = barcodeDigits.length * 8 + 14;

  const photoSection = photo
    ? `<defs><clipPath id="photoClip"><rect x="${w/2 - 100}" y="80" width="200" height="250" rx="100"/></clipPath></defs>
       <rect x="${w/2 - 103}" y="77" width="206" height="256" rx="103" fill="${color}" opacity="0.15"/>
       <image href="${photo}" x="${w/2 - 100}" y="80" width="200" height="250" clip-path="url(#photoClip)" preserveAspectRatio="xMidYMid slice"/>`
    : `<rect x="${w/2 - 100}" y="80" width="200" height="250" rx="100" fill="#f0f0f0" stroke="${color}" stroke-width="2"/>
       <text x="${w/2}" y="215" fill="#aaa" font-family="${fontFamily}" font-size="13" text-anchor="middle">PHOTO</text>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" rx="14" fill="#faf8f5"/>

  <rect x="0" y="0" width="${w}" height="55" rx="14" fill="${color}"/>
  <rect x="0" y="14" width="${w}" height="41" fill="${color}"/>
  <text x="${w/2}" y="37" fill="white" font-family="${fontFamily}" font-size="13" letter-spacing="5" text-anchor="middle" font-weight="bold">STUDENT IDENTIFICATION BADGE</text>

  ${photoSection}

  <text x="${w/2}" y="360" fill="#1a1a1a" font-family="${fontFamily}" font-size="26" font-weight="bold" text-anchor="middle" font-style="italic">${data.name}</text>
  <rect x="${w/2 - 80}" y="372" width="160" height="2" fill="${color}"/>
  <text x="${w/2}" y="395" fill="#555" font-family="${fontFamily}" font-size="13" text-anchor="middle">${data.department}</text>

  <text x="${w/2}" y="420" fill="${color}" font-family="${fontFamily}" font-size="14" text-anchor="middle" font-weight="bold" letter-spacing="3">${data.collegeName.toUpperCase()}</text>

  <rect x="40" y="445" width="220" height="55" rx="6" fill="white" stroke="#ddd" stroke-width="1"/>
  <text x="55" y="465" fill="#888" font-family="${fontFamily}" font-size="9" letter-spacing="1">STUDENT ID</text>
  <text x="55" y="488" fill="#111" font-family="'Courier New', monospace" font-size="16" font-weight="bold" letter-spacing="2">${data.studentId}</text>

  <rect x="280" y="445" width="200" height="55" rx="6" fill="white" stroke="#ddd" stroke-width="1"/>
  <text x="295" y="465" fill="#888" font-family="${fontFamily}" font-size="9" letter-spacing="1">DATE OF BIRTH</text>
  <text x="295" y="488" fill="#333" font-family="${fontFamily}" font-size="14">${dob}</text>

  <rect x="500" y="445" width="220" height="55" rx="6" fill="#fff5f5" stroke="#ef4444" stroke-width="1.5"/>
  <text x="515" y="465" fill="#dc2626" font-family="${fontFamily}" font-size="9" letter-spacing="1" font-weight="bold">EXPIRATION DATE</text>
  <text x="515" y="488" fill="#991b1b" font-family="${fontFamily}" font-size="16" font-weight="bold">${valid}</text>

  <rect x="740" y="445" width="232" height="55" rx="6" fill="#f0fdf4" stroke="#22c55e" stroke-width="1"/>
  <text x="856" y="478" fill="#166534" font-family="${fontFamily}" font-size="13" font-weight="bold" text-anchor="middle">ACTIVE</text>

  <g transform="translate(${Math.floor((w - barcodeWidth) / 2)}, 520)">
    ${generateBarcode(data.studentId)}
  </g>
  <text x="${w/2}" y="570" fill="#777" font-family="'Courier New', monospace" font-size="10" text-anchor="middle" letter-spacing="2">${data.studentId}</text>

  <text x="${w/2}" y="600" fill="#bbb" font-family="${fontFamily}" font-size="8" text-anchor="middle" font-style="italic">Property of ${data.collegeName}. Non-transferable.</text>

  <rect x="0" y="${h - 6}" width="${w}" height="6" fill="${color}"/>
  <rect width="${w}" height="${h}" rx="14" fill="none" stroke="${color}" stroke-width="1.5"/>
</svg>`;
}

function layoutModernSplit(data: CardData, color: string, photo: string | null): string {
  const w = 1012, h = 638;
  const fontFamily = "'Trebuchet MS', 'Lucida Grande', sans-serif";
  const dob = formatDate(data.dateOfBirth);
  const valid = formatDate(data.validUntil);
  const barcodeDigits = data.studentId.replace(/\D/g, "").substring(0, 12);
  const barcodeWidth = barcodeDigits.length * 8 + 14;

  const photoSection = photo
    ? `<defs><clipPath id="photoClip"><polygon points="60,80 260,80 260,350 60,350"/></clipPath></defs>
       <image href="${photo}" x="60" y="80" width="200" height="270" clip-path="url(#photoClip)" preserveAspectRatio="xMidYMid slice"/>`
    : `<polygon points="60,80 260,80 260,350 60,350" fill="rgba(255,255,255,0.12)"/>
       <text x="160" y="225" fill="rgba(255,255,255,0.4)" font-family="${fontFamily}" font-size="12" text-anchor="middle">PHOTO</text>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="splitGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${color};stop-opacity:1"/>
      <stop offset="100%" style="stop-color:${color};stop-opacity:0.5"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" rx="12" fill="#ffffff"/>

  <polygon points="0,0 580,0 380,${h} 0,${h}" fill="url(#splitGrad)"/>
  <rect x="0" y="0" width="12" height="${h}" rx="12" fill="${color}"/>
  <rect x="0" y="0" width="12" height="12" rx="12" fill="${color}"/>
  <rect x="0" y="${h-12}" width="12" height="12" rx="12" fill="${color}"/>

  <line x1="378" y1="0" x2="178" y2="${h}" stroke="rgba(255,255,255,0.2)" stroke-width="2"/>

  <text x="50" y="45" fill="white" font-family="${fontFamily}" font-size="12" letter-spacing="4" font-weight="600">STUDENT IDENTIFICATION</text>

  ${photoSection}

  <text x="60" y="395" fill="white" font-family="${fontFamily}" font-size="22" font-weight="bold">${data.name}</text>
  <text x="60" y="420" fill="rgba(255,255,255,0.7)" font-family="${fontFamily}" font-size="12">${data.department}</text>

  <text x="60" y="460" fill="rgba(255,255,255,0.5)" font-family="${fontFamily}" font-size="9" letter-spacing="1.5">STUDENT ID</text>
  <text x="60" y="482" fill="white" font-family="'Courier New', monospace" font-size="16" font-weight="bold" letter-spacing="2">${data.studentId}</text>

  <text x="60" y="520" fill="rgba(255,255,255,0.5)" font-family="${fontFamily}" font-size="9" letter-spacing="1.5">EXPIRES</text>
  <text x="60" y="542" fill="#ffd700" font-family="${fontFamily}" font-size="16" font-weight="bold">${valid}</text>

  <text x="60" y="580" fill="rgba(255,255,255,0.5)" font-family="${fontFamily}" font-size="9" letter-spacing="1.5">DOB</text>
  <text x="60" y="600" fill="rgba(255,255,255,0.9)" font-family="${fontFamily}" font-size="13">${dob}</text>

  <text x="430" y="60" fill="${color}" font-family="${fontFamily}" font-size="22" font-weight="bold">${data.collegeName}</text>
  <rect x="430" y="72" width="80" height="3" fill="${color}" opacity="0.4"/>

  <text x="430" y="120" fill="#6b7280" font-family="${fontFamily}" font-size="10" letter-spacing="1.5">FULL NAME</text>
  <text x="430" y="148" fill="#111" font-family="${fontFamily}" font-size="24" font-weight="700">${data.name}</text>

  <text x="430" y="195" fill="#6b7280" font-family="${fontFamily}" font-size="10" letter-spacing="1.5">ID NUMBER</text>
  <text x="430" y="220" fill="#111" font-family="'Courier New', monospace" font-size="18" font-weight="600" letter-spacing="2">${data.studentId}</text>

  <text x="430" y="265" fill="#6b7280" font-family="${fontFamily}" font-size="10" letter-spacing="1.5">DEPARTMENT</text>
  <text x="430" y="288" fill="#333" font-family="${fontFamily}" font-size="14">${data.department}</text>

  <text x="740" y="265" fill="#6b7280" font-family="${fontFamily}" font-size="10" letter-spacing="1.5">DOB</text>
  <text x="740" y="288" fill="#333" font-family="${fontFamily}" font-size="14">${dob}</text>

  <rect x="430" y="310" width="550" height="55" rx="8" fill="#fef2f2" stroke="#ef4444" stroke-width="2"/>
  <text x="445" y="333" fill="#dc2626" font-family="${fontFamily}" font-size="11" letter-spacing="2" font-weight="700">EXPIRATION DATE</text>
  <text x="445" y="355" fill="#991b1b" font-family="${fontFamily}" font-size="20" font-weight="bold">${valid}</text>
  <text x="960" y="345" fill="#166534" font-family="${fontFamily}" font-size="12" font-weight="bold" text-anchor="end">ACTIVE</text>

  <text x="430" y="400" fill="#aaa" font-family="${fontFamily}" font-size="9">${getAcademicYear()} Academic Year</text>

  <g transform="translate(${430 + Math.floor((w - 430 - barcodeWidth) / 2)}, 420)">
    ${generateBarcode(data.studentId)}
  </g>
  <text x="${430 + (w - 430) / 2}" y="470" fill="#888" font-family="'Courier New', monospace" font-size="10" text-anchor="middle" letter-spacing="2">${data.studentId}</text>

  <text x="${430 + (w - 430) / 2}" y="510" fill="#bbb" font-family="${fontFamily}" font-size="7.5" text-anchor="middle">Property of ${data.collegeName}. Non-transferable.</text>

  <rect width="${w}" height="${h}" rx="12" fill="none" stroke="#ccc" stroke-width="1"/>
</svg>`;
}

function layoutTopBanner(data: CardData, color: string, photo: string | null): string {
  const w = 1012, h = 638;
  const fontFamily = "Verdana, Geneva, sans-serif";
  const dob = formatDate(data.dateOfBirth);
  const valid = formatDate(data.validUntil);
  const collegeFontSize = data.collegeName.length > 30 ? 18 : 24;
  const barcodeDigits = data.studentId.replace(/\D/g, "").substring(0, 12);
  const barcodeWidth = barcodeDigits.length * 8 + 14;

  const photoSection = photo
    ? `<defs><clipPath id="photoClip"><rect x="${w - 230}" y="160" width="195" height="245" rx="6"/></clipPath></defs>
       <rect x="${w - 233}" y="157" width="201" height="251" rx="8" fill="white" stroke="${color}" stroke-width="2"/>
       <image href="${photo}" x="${w - 230}" y="160" width="195" height="245" clip-path="url(#photoClip)" preserveAspectRatio="xMidYMid slice"/>`
    : `<rect x="${w - 230}" y="160" width="195" height="245" rx="6" fill="#f3f4f6" stroke="${color}" stroke-width="2"/>
       <text x="${w - 132}" y="290" fill="#9ca3af" font-family="${fontFamily}" font-size="11" text-anchor="middle">PHOTO</text>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" rx="10" fill="#fdfdfd"/>

  <rect x="0" y="0" width="${w}" height="130" rx="10" fill="${color}"/>
  <rect x="0" y="10" width="${w}" height="120" fill="${color}"/>

  <circle cx="70" cy="65" r="35" fill="rgba(255,255,255,0.15)"/>
  <text x="70" y="60" fill="white" font-family="${fontFamily}" font-size="10" text-anchor="middle" font-weight="bold">UNIV</text>
  <text x="70" y="75" fill="rgba(255,255,255,0.8)" font-family="${fontFamily}" font-size="8" text-anchor="middle">SEAL</text>

  <text x="130" y="50" fill="white" font-family="${fontFamily}" font-size="${collegeFontSize}" font-weight="bold">${data.collegeName}</text>
  <text x="130" y="75" fill="rgba(255,255,255,0.85)" font-family="${fontFamily}" font-size="11" letter-spacing="3">OFFICIAL STUDENT IDENTIFICATION</text>
  <text x="130" y="100" fill="rgba(255,255,255,0.6)" font-family="${fontFamily}" font-size="10">Academic Year ${getAcademicYear()}</text>

  <text x="${w - 40}" y="50" fill="rgba(255,255,255,0.4)" font-family="${fontFamily}" font-size="60" text-anchor="end" font-weight="bold">ID</text>

  ${photoSection}

  <text x="50" y="180" fill="#6b7280" font-family="${fontFamily}" font-size="10" letter-spacing="2">STUDENT NAME</text>
  <text x="50" y="210" fill="#111827" font-family="${fontFamily}" font-size="24" font-weight="bold">${data.name}</text>
  <rect x="50" y="220" width="150" height="2" fill="${color}" opacity="0.3"/>

  <text x="50" y="260" fill="#6b7280" font-family="${fontFamily}" font-size="10" letter-spacing="2">ID NUMBER</text>
  <text x="50" y="285" fill="#111827" font-family="'Courier New', monospace" font-size="18" font-weight="bold" letter-spacing="2">${data.studentId}</text>

  <text x="350" y="260" fill="#6b7280" font-family="${fontFamily}" font-size="10" letter-spacing="2">DEPARTMENT</text>
  <text x="350" y="285" fill="#374151" font-family="${fontFamily}" font-size="14">${data.department}</text>

  <text x="50" y="330" fill="#6b7280" font-family="${fontFamily}" font-size="10" letter-spacing="2">DATE OF BIRTH</text>
  <text x="50" y="355" fill="#374151" font-family="${fontFamily}" font-size="14">${dob}</text>

  <rect x="350" y="310" width="380" height="60" rx="6" fill="#fef2f2" stroke="#ef4444" stroke-width="1.5"/>
  <text x="365" y="333" fill="#dc2626" font-family="${fontFamily}" font-size="10" letter-spacing="2" font-weight="700">EXPIRATION DATE</text>
  <text x="365" y="358" fill="#991b1b" font-family="${fontFamily}" font-size="20" font-weight="bold">${valid}</text>
  <rect x="665" y="332" width="55" height="22" rx="4" fill="#dcfce7"/>
  <text x="692" y="348" fill="#166534" font-family="${fontFamily}" font-size="10" font-weight="700" text-anchor="middle">ACTIVE</text>

  <rect x="0" y="420" width="${w}" height="1" fill="#e5e7eb"/>
  <rect x="0" y="421" width="${w}" height="${h - 421}" fill="#f8f9fa"/>
  <rect x="0" y="${h - 10}" width="${w}" height="10" rx="10" fill="#f8f9fa"/>

  <g transform="translate(${Math.floor((w - barcodeWidth) / 2)}, 440)">
    ${generateBarcode(data.studentId)}
  </g>
  <text x="${w / 2}" y="492" fill="#6b7280" font-family="'Courier New', monospace" font-size="10" text-anchor="middle" letter-spacing="2">${data.studentId}</text>

  <text x="${w / 2}" y="535" fill="#9ca3af" font-family="${fontFamily}" font-size="8" text-anchor="middle">This card remains property of ${data.collegeName}. Present upon request.</text>

  <rect x="0" y="${h - 6}" width="${w}" height="6" fill="${color}"/>
  <rect width="${w}" height="${h}" rx="10" fill="none" stroke="#d1d5db" stroke-width="1"/>
</svg>`;
}

function layoutMinimalFlat(data: CardData, color: string, photo: string | null): string {
  const w = 1012, h = 638;
  const fontFamily = "'Helvetica Neue', Helvetica, Arial, sans-serif";
  const dob = formatDate(data.dateOfBirth);
  const valid = formatDate(data.validUntil);
  const barcodeDigits = data.studentId.replace(/\D/g, "").substring(0, 12);
  const barcodeWidth = barcodeDigits.length * 8 + 14;

  const photoSection = photo
    ? `<defs><clipPath id="photoClip"><rect x="${w - 200}" y="60" width="160" height="200" rx="2"/></clipPath></defs>
       <image href="${photo}" x="${w - 200}" y="60" width="160" height="200" clip-path="url(#photoClip)" preserveAspectRatio="xMidYMid slice"/>
       <rect x="${w - 200}" y="60" width="160" height="200" rx="2" fill="none" stroke="#e5e7eb" stroke-width="1"/>`
    : `<rect x="${w - 200}" y="60" width="160" height="200" rx="2" fill="#fafafa" stroke="#e5e7eb" stroke-width="1"/>
       <text x="${w - 120}" y="165" fill="#d1d5db" font-family="${fontFamily}" font-size="10" text-anchor="middle">PHOTO</text>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" rx="8" fill="#ffffff"/>

  <text x="60" y="55" fill="#111" font-family="${fontFamily}" font-size="11" font-weight="300" letter-spacing="6">${data.collegeName.toUpperCase()}</text>

  <line x1="60" y1="75" x2="350" y2="75" stroke="#e5e7eb" stroke-width="0.5"/>

  ${photoSection}

  <text x="60" y="130" fill="#111" font-family="${fontFamily}" font-size="36" font-weight="100">${data.name}</text>

  <line x1="60" y1="150" x2="750" y2="150" stroke="#e5e7eb" stroke-width="0.5"/>

  <text x="60" y="195" fill="#bbb" font-family="${fontFamily}" font-size="8" letter-spacing="3" font-weight="300">STUDENT ID</text>
  <text x="60" y="220" fill="#333" font-family="${fontFamily}" font-size="20" font-weight="200" letter-spacing="4">${data.studentId}</text>

  <text x="350" y="195" fill="#bbb" font-family="${fontFamily}" font-size="8" letter-spacing="3" font-weight="300">DEPARTMENT</text>
  <text x="350" y="220" fill="#333" font-family="${fontFamily}" font-size="16" font-weight="300">${data.department}</text>

  <line x1="60" y1="248" x2="750" y2="248" stroke="#f0f0f0" stroke-width="0.5"/>

  <text x="60" y="290" fill="#bbb" font-family="${fontFamily}" font-size="8" letter-spacing="3" font-weight="300">DATE OF BIRTH</text>
  <text x="60" y="315" fill="#555" font-family="${fontFamily}" font-size="15" font-weight="300">${dob}</text>

  <text x="350" y="290" fill="#bbb" font-family="${fontFamily}" font-size="8" letter-spacing="3" font-weight="300">EXPIRATION DATE</text>
  <text x="350" y="315" fill="#333" font-family="${fontFamily}" font-size="15" font-weight="400">${valid}</text>

  <text x="600" y="290" fill="#bbb" font-family="${fontFamily}" font-size="8" letter-spacing="3" font-weight="300">STATUS</text>
  <text x="600" y="315" fill="${color}" font-family="${fontFamily}" font-size="13" font-weight="400">Active</text>

  <line x1="60" y1="345" x2="750" y2="345" stroke="#f0f0f0" stroke-width="0.5"/>

  <text x="60" y="380" fill="#bbb" font-family="${fontFamily}" font-size="8" letter-spacing="3" font-weight="300">ACADEMIC YEAR</text>
  <text x="60" y="400" fill="#777" font-family="${fontFamily}" font-size="13" font-weight="300">${getAcademicYear()}</text>

  <line x1="60" y1="430" x2="${w - 60}" y2="430" stroke="#f0f0f0" stroke-width="0.5"/>

  <g transform="translate(${Math.floor((w - barcodeWidth) / 2)}, 455)">
    ${generateBarcode(data.studentId)}
  </g>
  <text x="${w / 2}" y="505" fill="#ccc" font-family="'Courier New', monospace" font-size="9" text-anchor="middle" letter-spacing="3">${data.studentId}</text>

  <text x="${w / 2}" y="560" fill="#ddd" font-family="${fontFamily}" font-size="7" text-anchor="middle" font-weight="300">Property of ${data.collegeName}. Non-transferable.</text>

  <rect x="60" y="${h - 2}" width="100" height="1" fill="${color}" opacity="0.4"/>
  <rect width="${w}" height="${h}" rx="8" fill="none" stroke="#e5e7eb" stroke-width="0.5"/>
</svg>`;
}

function layoutGradientWave(data: CardData, color: string, photo: string | null): string {
  const w = 1012, h = 638;
  const fontFamily = "'Segoe UI', Tahoma, sans-serif";
  const dob = formatDate(data.dateOfBirth);
  const valid = formatDate(data.validUntil);
  const collegeFontSize = data.collegeName.length > 28 ? 18 : 22;
  const barcodeDigits = data.studentId.replace(/\D/g, "").substring(0, 12);
  const barcodeWidth = barcodeDigits.length * 8 + 14;

  const photoSection = photo
    ? `<defs><clipPath id="photoClipW"><rect x="40" y="200" width="210" height="265" rx="20"/></clipPath></defs>
       <rect x="37" y="197" width="216" height="271" rx="22" fill="white" opacity="0.3"/>
       <image href="${photo}" x="40" y="200" width="210" height="265" clip-path="url(#photoClipW)" preserveAspectRatio="xMidYMid slice"/>`
    : `<rect x="40" y="200" width="210" height="265" rx="20" fill="rgba(255,255,255,0.15)"/>
       <text x="145" y="340" fill="rgba(255,255,255,0.5)" font-family="${fontFamily}" font-size="12" text-anchor="middle">PHOTO</text>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="waveGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${color};stop-opacity:1"/>
      <stop offset="50%" style="stop-color:${color};stop-opacity:0.7"/>
      <stop offset="100%" style="stop-color:${color};stop-opacity:0.4"/>
    </linearGradient>
    <linearGradient id="waveGrad2" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:${color};stop-opacity:0.3"/>
      <stop offset="100%" style="stop-color:${color};stop-opacity:0.08"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" rx="14" fill="url(#waveGrad1)"/>

  <path d="M0,480 Q200,430 400,470 Q600,510 800,460 Q900,440 1012,470 L1012,638 L0,638 Z" fill="url(#waveGrad2)"/>
  <path d="M0,520 Q300,480 500,510 Q700,540 1012,500 L1012,638 L0,638 Z" fill="rgba(255,255,255,0.06)"/>
  <path d="M0,560 Q250,530 506,555 Q750,580 1012,545 L1012,638 L0,638 Z" fill="rgba(255,255,255,0.04)"/>

  <circle cx="900" cy="100" r="180" fill="rgba(255,255,255,0.04)"/>
  <circle cx="950" cy="80" r="100" fill="rgba(255,255,255,0.03)"/>

  <text x="40" y="55" fill="white" font-family="${fontFamily}" font-size="${collegeFontSize}" font-weight="bold">${data.collegeName}</text>
  <text x="40" y="80" fill="rgba(255,255,255,0.8)" font-family="${fontFamily}" font-size="11" letter-spacing="3">STUDENT IDENTIFICATION CARD</text>
  <text x="${w - 40}" y="55" fill="rgba(255,255,255,0.6)" font-family="${fontFamily}" font-size="10" text-anchor="end">${getAcademicYear()}</text>

  <rect x="40" y="100" width="930" height="1" fill="rgba(255,255,255,0.15)"/>

  <text x="40" y="140" fill="rgba(255,255,255,0.5)" font-family="${fontFamily}" font-size="9" letter-spacing="2">STUDENT NAME</text>
  <text x="40" y="170" fill="white" font-family="${fontFamily}" font-size="28" font-weight="bold">${data.name}</text>

  ${photoSection}

  <text x="290" y="230" fill="rgba(255,255,255,0.5)" font-family="${fontFamily}" font-size="9" letter-spacing="1.5">STUDENT ID</text>
  <text x="290" y="258" fill="white" font-family="'Courier New', monospace" font-size="20" font-weight="bold" letter-spacing="3">${data.studentId}</text>

  <text x="290" y="300" fill="rgba(255,255,255,0.5)" font-family="${fontFamily}" font-size="9" letter-spacing="1.5">DEPARTMENT</text>
  <text x="290" y="325" fill="rgba(255,255,255,0.95)" font-family="${fontFamily}" font-size="15">${data.department}</text>

  <text x="600" y="230" fill="rgba(255,255,255,0.5)" font-family="${fontFamily}" font-size="9" letter-spacing="1.5">DATE OF BIRTH</text>
  <text x="600" y="258" fill="rgba(255,255,255,0.95)" font-family="${fontFamily}" font-size="15">${dob}</text>

  <rect x="600" y="280" width="370" height="60" rx="10" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>
  <text x="615" y="303" fill="#ffd700" font-family="${fontFamily}" font-size="10" letter-spacing="2" font-weight="700">EXPIRATION DATE</text>
  <text x="615" y="330" fill="white" font-family="${fontFamily}" font-size="22" font-weight="bold">${valid}</text>

  <rect x="290" y="360" width="65" height="24" rx="12" fill="rgba(255,255,255,0.2)"/>
  <text x="322" y="377" fill="white" font-family="${fontFamily}" font-size="10" font-weight="600" text-anchor="middle">ACTIVE</text>

  <g transform="translate(${Math.floor((w - barcodeWidth) / 2)}, 500)" opacity="0.7">
    ${generateBarcode(data.studentId)}
  </g>
  <text x="${w / 2}" y="550" fill="rgba(255,255,255,0.6)" font-family="'Courier New', monospace" font-size="10" text-anchor="middle" letter-spacing="2">${data.studentId}</text>
  <text x="${w / 2}" y="585" fill="rgba(255,255,255,0.3)" font-family="${fontFamily}" font-size="7.5" text-anchor="middle">Property of ${data.collegeName}. Non-transferable.</text>

  <rect width="${w}" height="${h}" rx="14" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="1.5"/>
</svg>`;
}

function layoutDarkMode(data: CardData, color: string, photo: string | null): string {
  const w = 1012, h = 638;
  const fontFamily = "'Inter', 'Helvetica Neue', sans-serif";
  const dob = formatDate(data.dateOfBirth);
  const valid = formatDate(data.validUntil);
  const collegeFontSize = data.collegeName.length > 28 ? 18 : 22;
  const barcodeDigits = data.studentId.replace(/\D/g, "").substring(0, 12);
  const barcodeWidth = barcodeDigits.length * 8 + 14;

  const photoSection = photo
    ? `<defs><clipPath id="photoClip"><rect x="40" y="120" width="170" height="210" rx="8"/></clipPath></defs>
       <rect x="38" y="118" width="174" height="214" rx="9" fill="#3a3a4a" stroke="#555" stroke-width="1"/>
       <image href="${photo}" x="40" y="120" width="170" height="210" clip-path="url(#photoClip)" preserveAspectRatio="xMidYMid slice"/>`
    : `<rect x="40" y="120" width="170" height="210" rx="8" fill="#2a2a3a" stroke="#444" stroke-width="1"/>
       <text x="125" y="230" fill="#666" font-family="${fontFamily}" font-size="11" text-anchor="middle">PHOTO</text>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" rx="12" fill="#1a1a2e"/>
  <rect x="0" y="0" width="${w}" height="90" rx="12" fill="${color}"/>
  <rect x="0" y="12" width="${w}" height="78" fill="${color}"/>

  <text x="35" y="40" fill="white" font-family="${fontFamily}" font-size="${collegeFontSize}" font-weight="bold">${data.collegeName}</text>
  <text x="35" y="62" fill="rgba(255,255,255,0.7)" font-family="${fontFamily}" font-size="10" letter-spacing="2.5">STUDENT IDENTIFICATION</text>
  <text x="${w - 35}" y="62" fill="rgba(255,255,255,0.5)" font-family="${fontFamily}" font-size="10" text-anchor="end">${getAcademicYear()}</text>

  ${photoSection}

  <text x="250" y="148" fill="#888" font-family="${fontFamily}" font-size="9" letter-spacing="1.2">NAME</text>
  <text x="250" y="170" fill="#e0e0e0" font-family="${fontFamily}" font-size="18" font-weight="bold">${data.name}</text>

  <text x="250" y="206" fill="#888" font-family="${fontFamily}" font-size="9" letter-spacing="1.2">STUDENT ID</text>
  <text x="250" y="226" fill="#e0e0e0" font-family="${fontFamily}" font-size="15" font-weight="600" letter-spacing="1">${data.studentId}</text>

  <text x="250" y="262" fill="#888" font-family="${fontFamily}" font-size="9" letter-spacing="1.2">DATE OF BIRTH</text>
  <text x="250" y="280" fill="#ccc" font-family="${fontFamily}" font-size="13">${dob}</text>

  <text x="460" y="262" fill="#888" font-family="${fontFamily}" font-size="9" letter-spacing="1.2">MAJOR</text>
  <text x="460" y="280" fill="#ccc" font-family="${fontFamily}" font-size="13">${data.department}</text>

  <text x="250" y="316" fill="#888" font-family="${fontFamily}" font-size="9" letter-spacing="1.2">VALID THROUGH</text>
  <text x="250" y="334" fill="#ccc" font-family="${fontFamily}" font-size="13">${valid}</text>

  <rect x="460" y="320" width="55" height="18" rx="3" fill="rgba(34,197,94,0.15)"/>
  <text x="487" y="333" fill="#4ade80" font-family="${fontFamily}" font-size="10" font-weight="600" text-anchor="middle">ACTIVE</text>

  <rect x="0" y="370" width="${w}" height="1" fill="#333"/>
  <g transform="translate(${Math.floor((w - barcodeWidth) / 2)}, 395)">
    <g opacity="0.7">${generateBarcode(data.studentId)}</g>
  </g>
  <text x="${w / 2}" y="445" fill="#777" font-family="'Courier New', monospace" font-size="10" text-anchor="middle" letter-spacing="2">${data.studentId}</text>
  <text x="${w / 2}" y="490" fill="#555" font-family="${fontFamily}" font-size="8" text-anchor="middle">Property of ${data.collegeName}. Non-transferable.</text>
  <rect x="0" y="${h - 4}" width="${w}" height="4" fill="${color}"/>
  <rect width="${w}" height="${h}" rx="12" fill="none" stroke="#333" stroke-width="1"/>
</svg>`;
}

function layoutCompactHorizontal(data: CardData, color: string, photo: string | null): string {
  const w = 860, h = 540;
  const fontFamily = "Verdana, Geneva, sans-serif";
  const dob = formatDate(data.dateOfBirth);
  const valid = formatDate(data.validUntil);
  const collegeFontSize = data.collegeName.length > 28 ? 16 : 19;
  const barcodeDigits = data.studentId.replace(/\D/g, "").substring(0, 12);
  const barcodeWidth = barcodeDigits.length * 8 + 14;

  const photoSection = photo
    ? `<defs><clipPath id="photoClip"><rect x="35" y="100" width="140" height="175" rx="5"/></clipPath></defs>
       <rect x="33" y="98" width="144" height="179" rx="6" fill="white" stroke="${color}" stroke-width="1.5"/>
       <image href="${photo}" x="35" y="100" width="140" height="175" clip-path="url(#photoClip)" preserveAspectRatio="xMidYMid slice"/>`
    : `<rect x="35" y="100" width="140" height="175" rx="5" fill="#f3f4f6" stroke="${color}" stroke-width="1.5"/>
       <text x="105" y="195" fill="#9ca3af" font-family="${fontFamily}" font-size="10" text-anchor="middle">PHOTO</text>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" rx="10" fill="#ffffff"/>
  <rect x="0" y="0" width="${w}" height="70" rx="10" fill="${color}"/>
  <rect x="0" y="10" width="${w}" height="60" fill="${color}"/>

  <text x="30" y="30" fill="white" font-family="${fontFamily}" font-size="${collegeFontSize}" font-weight="bold">${data.collegeName}</text>
  <text x="30" y="50" fill="rgba(255,255,255,0.8)" font-family="${fontFamily}" font-size="9" letter-spacing="2">STUDENT ID CARD</text>
  <text x="${w - 30}" y="50" fill="rgba(255,255,255,0.6)" font-family="${fontFamily}" font-size="9" text-anchor="end">${getAcademicYear()}</text>

  ${photoSection}

  <text x="210" y="128" fill="#6b7280" font-family="${fontFamily}" font-size="9" letter-spacing="1">NAME</text>
  <text x="210" y="148" fill="#111827" font-family="${fontFamily}" font-size="17" font-weight="bold">${data.name}</text>

  <text x="210" y="180" fill="#6b7280" font-family="${fontFamily}" font-size="9" letter-spacing="1">ID</text>
  <text x="210" y="198" fill="#111827" font-family="${fontFamily}" font-size="14" font-weight="600" letter-spacing="1">${data.studentId}</text>

  <text x="210" y="230" fill="#6b7280" font-family="${fontFamily}" font-size="9" letter-spacing="1">DOB</text>
  <text x="210" y="248" fill="#374151" font-family="${fontFamily}" font-size="12">${dob}</text>

  <text x="420" y="230" fill="#6b7280" font-family="${fontFamily}" font-size="9" letter-spacing="1">MAJOR</text>
  <text x="420" y="248" fill="#374151" font-family="${fontFamily}" font-size="12">${data.department}</text>

  <text x="210" y="275" fill="#6b7280" font-family="${fontFamily}" font-size="9" letter-spacing="1">VALID</text>
  <text x="210" y="293" fill="#374151" font-family="${fontFamily}" font-size="12">${valid}</text>

  <rect x="0" y="320" width="${w}" height="1" fill="#e5e7eb"/>
  <g transform="translate(${Math.floor((w - barcodeWidth) / 2)}, 340)">
    ${generateBarcode(data.studentId)}
  </g>
  <text x="${w / 2}" y="390" fill="#6b7280" font-family="'Courier New', monospace" font-size="9" text-anchor="middle" letter-spacing="2">${data.studentId}</text>
  <text x="${w / 2}" y="430" fill="#9ca3af" font-family="${fontFamily}" font-size="7" text-anchor="middle">Property of ${data.collegeName}. Non-transferable.</text>
  <rect x="0" y="${h - 4}" width="${w}" height="4" fill="${color}"/>
  <rect width="${w}" height="${h}" rx="10" fill="none" stroke="#d1d5db" stroke-width="1"/>
</svg>`;
}

function layoutCenteredPortrait(data: CardData, color: string, photo: string | null): string {
  const w = 640, h = 1000;
  const fontFamily = "'Georgia', 'Times New Roman', serif";
  const dob = formatDate(data.dateOfBirth);
  const valid = formatDate(data.validUntil);
  const collegeFontSize = data.collegeName.length > 25 ? 16 : 20;
  const barcodeDigits = data.studentId.replace(/\D/g, "").substring(0, 12);
  const barcodeWidth = barcodeDigits.length * 8 + 14;

  const photoSection = photo
    ? `<defs><clipPath id="photoClip"><rect x="${w / 2 - 90}" y="200" width="180" height="225" rx="6"/></clipPath></defs>
       <rect x="${w / 2 - 92}" y="198" width="184" height="229" rx="7" fill="white" stroke="${color}" stroke-width="2"/>
       <image href="${photo}" x="${w / 2 - 90}" y="200" width="180" height="225" clip-path="url(#photoClip)" preserveAspectRatio="xMidYMid slice"/>`
    : `<rect x="${w / 2 - 90}" y="200" width="180" height="225" rx="6" fill="#f3f4f6" stroke="${color}" stroke-width="2"/>
       <text x="${w / 2}" y="318" fill="#9ca3af" font-family="${fontFamily}" font-size="12" text-anchor="middle">PHOTO</text>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" rx="14" fill="#ffffff"/>
  <rect x="0" y="0" width="${w}" height="170" rx="14" fill="${color}"/>
  <rect x="0" y="14" width="${w}" height="156" fill="${color}"/>

  <text x="${w / 2}" y="60" fill="white" font-family="${fontFamily}" font-size="${collegeFontSize}" font-weight="bold" text-anchor="middle">${data.collegeName}</text>
  <text x="${w / 2}" y="90" fill="rgba(255,255,255,0.8)" font-family="${fontFamily}" font-size="11" letter-spacing="3" text-anchor="middle">STUDENT IDENTIFICATION</text>
  <text x="${w / 2}" y="120" fill="rgba(255,255,255,0.6)" font-family="${fontFamily}" font-size="10" text-anchor="middle">${getAcademicYear()}</text>
  <rect x="${w / 2 - 30}" y="135" width="60" height="2" rx="1" fill="rgba(255,255,255,0.3)"/>

  ${photoSection}

  <text x="${w / 2}" y="465" fill="#111827" font-family="${fontFamily}" font-size="22" font-weight="bold" text-anchor="middle">${data.name}</text>
  <text x="${w / 2}" y="495" fill="#6b7280" font-family="${fontFamily}" font-size="12" text-anchor="middle">${data.department}</text>

  <line x1="80" y1="520" x2="${w - 80}" y2="520" stroke="#e5e7eb" stroke-width="1"/>

  <text x="80" y="555" fill="#9ca3af" font-family="${fontFamily}" font-size="9" letter-spacing="1">STUDENT ID</text>
  <text x="80" y="577" fill="#111827" font-family="${fontFamily}" font-size="16" font-weight="600" letter-spacing="1">${data.studentId}</text>

  <text x="${w - 80}" y="555" fill="#9ca3af" font-family="${fontFamily}" font-size="9" letter-spacing="1" text-anchor="end">STATUS</text>
  <rect x="${w - 135}" y="563" width="55" height="18" rx="3" fill="#dcfce7"/>
  <text x="${w - 108}" y="576" fill="#166534" font-family="${fontFamily}" font-size="9" font-weight="600" text-anchor="middle">ACTIVE</text>

  <text x="80" y="615" fill="#9ca3af" font-family="${fontFamily}" font-size="9" letter-spacing="1">DATE OF BIRTH</text>
  <text x="80" y="635" fill="#374151" font-family="${fontFamily}" font-size="13">${dob}</text>

  <text x="${w - 80}" y="615" fill="#9ca3af" font-family="${fontFamily}" font-size="9" letter-spacing="1" text-anchor="end">VALID THROUGH</text>
  <text x="${w - 80}" y="635" fill="#374151" font-family="${fontFamily}" font-size="13" text-anchor="end">${valid}</text>

  <line x1="80" y1="660" x2="${w - 80}" y2="660" stroke="#e5e7eb" stroke-width="1"/>

  <rect x="0" y="690" width="${w}" height="${h - 690}" fill="#f9fafb"/>
  <rect x="0" y="${h - 14}" width="${w}" height="14" rx="14" fill="#f9fafb"/>

  <g transform="translate(${Math.floor((w - barcodeWidth) / 2)}, 715)">
    ${generateBarcode(data.studentId)}
  </g>
  <text x="${w / 2}" y="765" fill="#6b7280" font-family="'Courier New', monospace" font-size="10" text-anchor="middle" letter-spacing="2">${data.studentId}</text>
  <text x="${w / 2}" y="810" fill="#9ca3af" font-family="${fontFamily}" font-size="7.5" text-anchor="middle">Property of ${data.collegeName}. Non-transferable.</text>

  <rect x="0" y="${h - 5}" width="${w}" height="5" fill="${color}"/>
  <rect width="${w}" height="${h}" rx="14" fill="none" stroke="#d1d5db" stroke-width="1"/>
</svg>`;
}

function layoutSidebar(data: CardData, color: string, photo: string | null): string {
  const w = 1012, h = 638;
  const fontFamily = "'Trebuchet MS', Helvetica, sans-serif";
  const dob = formatDate(data.dateOfBirth);
  const valid = formatDate(data.validUntil);
  const collegeFontSize = data.collegeName.length > 28 ? 17 : 21;
  const sideW = 280;
  const barcodeDigits = data.studentId.replace(/\D/g, "").substring(0, 12);
  const barcodeWidth = barcodeDigits.length * 8 + 14;

  const photoSection = photo
    ? `<defs><clipPath id="photoClip"><rect x="${sideW / 2 - 75}" y="100" width="150" height="188" rx="6"/></clipPath></defs>
       <image href="${photo}" x="${sideW / 2 - 75}" y="100" width="150" height="188" clip-path="url(#photoClip)" preserveAspectRatio="xMidYMid slice"/>`
    : `<rect x="${sideW / 2 - 75}" y="100" width="150" height="188" rx="6" fill="rgba(255,255,255,0.1)"/>
       <text x="${sideW / 2}" y="200" fill="rgba(255,255,255,0.4)" font-family="${fontFamily}" font-size="11" text-anchor="middle">PHOTO</text>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" rx="12" fill="#fafafa"/>
  <rect x="0" y="0" width="${sideW}" height="${h}" rx="12" fill="${color}"/>
  <rect x="12" y="0" width="${sideW - 12}" height="${h}" fill="${color}"/>

  <text x="${sideW / 2}" y="45" fill="white" font-family="${fontFamily}" font-size="12" letter-spacing="3" text-anchor="middle" font-weight="600">STUDENT ID</text>
  <line x1="40" y1="65" x2="${sideW - 40}" y2="65" stroke="rgba(255,255,255,0.15)" stroke-width="1"/>
  <text x="${sideW / 2}" y="85" fill="rgba(255,255,255,0.6)" font-family="${fontFamily}" font-size="10" text-anchor="middle">${getAcademicYear()}</text>

  ${photoSection}

  <text x="${sideW / 2}" y="320" fill="white" font-family="${fontFamily}" font-size="14" font-weight="bold" text-anchor="middle">${data.name}</text>
  <text x="${sideW / 2}" y="345" fill="rgba(255,255,255,0.7)" font-family="${fontFamily}" font-size="10" text-anchor="middle">${data.department}</text>

  <text x="${sideW / 2}" y="395" fill="rgba(255,255,255,0.9)" font-family="'Courier New', monospace" font-size="13" text-anchor="middle" letter-spacing="2">${data.studentId}</text>

  <rect x="${sideW / 2 - 25}" y="415" width="50" height="18" rx="3" fill="rgba(255,255,255,0.15)"/>
  <text x="${sideW / 2}" y="428" fill="white" font-family="${fontFamily}" font-size="9" font-weight="600" text-anchor="middle">ACTIVE</text>

  <text x="${sideW + 50}" y="55" fill="${color}" font-family="${fontFamily}" font-size="${collegeFontSize}" font-weight="bold">${data.collegeName}</text>
  <rect x="${sideW + 50}" y="70" width="100" height="2" rx="1" fill="${color}" opacity="0.2"/>

  <text x="${sideW + 50}" y="120" fill="#9ca3af" font-family="${fontFamily}" font-size="10" letter-spacing="1.5">FULL NAME</text>
  <text x="${sideW + 50}" y="145" fill="#111827" font-family="${fontFamily}" font-size="20" font-weight="700">${data.name}</text>

  <text x="${sideW + 50}" y="195" fill="#9ca3af" font-family="${fontFamily}" font-size="10" letter-spacing="1.5">STUDENT NUMBER</text>
  <text x="${sideW + 50}" y="218" fill="#111827" font-family="${fontFamily}" font-size="16" font-weight="600" letter-spacing="1.5">${data.studentId}</text>

  <text x="${sideW + 50}" y="268" fill="#9ca3af" font-family="${fontFamily}" font-size="10" letter-spacing="1.5">DATE OF BIRTH</text>
  <text x="${sideW + 50}" y="288" fill="#374151" font-family="${fontFamily}" font-size="13">${dob}</text>

  <text x="${sideW + 350}" y="268" fill="#9ca3af" font-family="${fontFamily}" font-size="10" letter-spacing="1.5">PROGRAM</text>
  <text x="${sideW + 350}" y="288" fill="#374151" font-family="${fontFamily}" font-size="13">${data.department}</text>

  <text x="${sideW + 50}" y="338" fill="#9ca3af" font-family="${fontFamily}" font-size="10" letter-spacing="1.5">VALID THROUGH</text>
  <text x="${sideW + 50}" y="358" fill="#374151" font-family="${fontFamily}" font-size="13">${valid}</text>

  <rect x="${sideW + 40}" y="390" width="${w - sideW - 80}" height="1" fill="#e5e7eb"/>

  <g transform="translate(${sideW + Math.floor((w - sideW - barcodeWidth) / 2)}, 415)">
    ${generateBarcode(data.studentId)}
  </g>
  <text x="${sideW + (w - sideW) / 2}" y="465" fill="#6b7280" font-family="'Courier New', monospace" font-size="10" text-anchor="middle" letter-spacing="2">${data.studentId}</text>
  <text x="${sideW + (w - sideW) / 2}" y="510" fill="#9ca3af" font-family="${fontFamily}" font-size="7.5" text-anchor="middle">Property of ${data.collegeName}. Non-transferable.</text>

  <rect width="${w}" height="${h}" rx="12" fill="none" stroke="#d1d5db" stroke-width="1"/>
</svg>`;
}

function layoutDoubleStripe(data: CardData, color: string, photo: string | null): string {
  const w = 1012, h = 638;
  const fontFamily = "'Lucida Sans', 'Lucida Grande', sans-serif";
  const dob = formatDate(data.dateOfBirth);
  const valid = formatDate(data.validUntil);
  const collegeFontSize = data.collegeName.length > 28 ? 17 : 21;
  const barcodeDigits = data.studentId.replace(/\D/g, "").substring(0, 12);
  const barcodeWidth = barcodeDigits.length * 8 + 14;

  const photoSection = photo
    ? `<defs><clipPath id="photoClip"><rect x="45" y="135" width="160" height="200" rx="5"/></clipPath></defs>
       <rect x="43" y="133" width="164" height="204" rx="6" fill="white" stroke="#d1d5db" stroke-width="1"/>
       <image href="${photo}" x="45" y="135" width="160" height="200" clip-path="url(#photoClip)" preserveAspectRatio="xMidYMid slice"/>`
    : `<rect x="45" y="135" width="160" height="200" rx="5" fill="#f3f4f6" stroke="#d1d5db" stroke-width="1"/>
       <text x="125" y="240" fill="#9ca3af" font-family="${fontFamily}" font-size="10" text-anchor="middle">PHOTO</text>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" rx="12" fill="#ffffff"/>
  <rect x="0" y="0" width="${w}" height="55" rx="12" fill="${color}"/>
  <rect x="0" y="12" width="${w}" height="43" fill="${color}"/>
  <rect x="0" y="55" width="${w}" height="45" fill="#f8f9fa"/>
  <rect x="0" y="100" width="${w}" height="2" fill="${color}" opacity="0.15"/>

  <text x="35" y="35" fill="white" font-family="${fontFamily}" font-size="${collegeFontSize}" font-weight="bold">${data.collegeName}</text>
  <text x="${w - 35}" y="35" fill="rgba(255,255,255,0.6)" font-family="${fontFamily}" font-size="10" text-anchor="end">${getAcademicYear()}</text>

  <text x="35" y="82" fill="${color}" font-family="${fontFamily}" font-size="10" letter-spacing="3" font-weight="600">OFFICIAL STUDENT IDENTIFICATION CARD</text>

  ${photoSection}

  <text x="240" y="162" fill="#6b7280" font-family="${fontFamily}" font-size="9" letter-spacing="1.2">NAME</text>
  <text x="240" y="182" fill="#111827" font-family="${fontFamily}" font-size="18" font-weight="bold">${data.name}</text>

  <text x="240" y="215" fill="#6b7280" font-family="${fontFamily}" font-size="9" letter-spacing="1.2">STUDENT ID</text>
  <text x="240" y="235" fill="#111827" font-family="${fontFamily}" font-size="15" font-weight="600" letter-spacing="1">${data.studentId}</text>

  <text x="240" y="268" fill="#6b7280" font-family="${fontFamily}" font-size="9" letter-spacing="1.2">DATE OF BIRTH</text>
  <text x="240" y="286" fill="#374151" font-family="${fontFamily}" font-size="12">${dob}</text>

  <text x="460" y="268" fill="#6b7280" font-family="${fontFamily}" font-size="9" letter-spacing="1.2">MAJOR</text>
  <text x="460" y="286" fill="#374151" font-family="${fontFamily}" font-size="12">${data.department}</text>

  <text x="240" y="316" fill="#6b7280" font-family="${fontFamily}" font-size="9" letter-spacing="1.2">VALID THROUGH</text>
  <text x="240" y="334" fill="#374151" font-family="${fontFamily}" font-size="12">${valid}</text>

  <rect x="460" y="320" width="55" height="18" rx="3" fill="#dcfce7"/>
  <text x="487" y="333" fill="#166534" font-family="${fontFamily}" font-size="10" font-weight="600" text-anchor="middle">ACTIVE</text>

  <rect x="0" y="370" width="${w}" height="1" fill="#e5e7eb"/>
  <rect x="0" y="371" width="${w}" height="${h - 371}" fill="#fafafa"/>
  <rect x="0" y="${h - 12}" width="${w}" height="12" rx="12" fill="#fafafa"/>

  <g transform="translate(${Math.floor((w - barcodeWidth) / 2)}, 395)">
    ${generateBarcode(data.studentId)}
  </g>
  <text x="${w / 2}" y="445" fill="#6b7280" font-family="'Courier New', monospace" font-size="10" text-anchor="middle" letter-spacing="2">${data.studentId}</text>
  <text x="${w / 2}" y="485" fill="#9ca3af" font-family="${fontFamily}" font-size="7.5" text-anchor="middle">Property of ${data.collegeName}. Non-transferable.</text>

  <rect x="0" y="${h - 4}" width="${w}" height="4" fill="${color}"/>
  <rect width="${w}" height="${h}" rx="12" fill="none" stroke="#d1d5db" stroke-width="1"/>
</svg>`;
}

function layoutCornerAccent(data: CardData, color: string, photo: string | null): string {
  const w = 1012, h = 638;
  const fontFamily = "'Calibri', 'Candara', sans-serif";
  const dob = formatDate(data.dateOfBirth);
  const valid = formatDate(data.validUntil);
  const collegeFontSize = data.collegeName.length > 28 ? 18 : 22;
  const barcodeDigits = data.studentId.replace(/\D/g, "").substring(0, 12);
  const barcodeWidth = barcodeDigits.length * 8 + 14;

  const photoSection = photo
    ? `<defs><clipPath id="photoClip"><rect x="${w - 220}" y="90" width="180" height="225" rx="8"/></clipPath></defs>
       <rect x="${w - 222}" y="88" width="184" height="229" rx="9" fill="white" stroke="${color}" stroke-width="1.5"/>
       <image href="${photo}" x="${w - 220}" y="90" width="180" height="225" clip-path="url(#photoClip)" preserveAspectRatio="xMidYMid slice"/>`
    : `<rect x="${w - 220}" y="90" width="180" height="225" rx="8" fill="#f3f4f6" stroke="${color}" stroke-width="1.5"/>
       <text x="${w - 130}" y="208" fill="#9ca3af" font-family="${fontFamily}" font-size="11" text-anchor="middle">PHOTO</text>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" rx="12" fill="#ffffff"/>

  <polygon points="0,0 250,0 0,250" fill="${color}" opacity="0.08"/>
  <rect x="0" y="0" width="6" height="${h}" rx="12" fill="${color}"/>
  <rect x="0" y="0" width="6" height="${h}" fill="${color}"/>
  <rect x="0" y="0" width="12" height="12" rx="12" fill="${color}"/>
  <rect x="0" y="${h - 12}" width="12" height="12" rx="12" fill="${color}"/>
  <rect x="6" y="0" width="6" height="12" fill="white"/>
  <rect x="6" y="${h - 12}" width="6" height="12" fill="white"/>

  <text x="40" y="50" fill="${color}" font-family="${fontFamily}" font-size="${collegeFontSize}" font-weight="bold">${data.collegeName}</text>
  <text x="40" y="75" fill="#6b7280" font-family="${fontFamily}" font-size="10" letter-spacing="2.5">STUDENT IDENTIFICATION  |  ${getAcademicYear()}</text>

  ${photoSection}

  <text x="40" y="125" fill="#9ca3af" font-family="${fontFamily}" font-size="9" letter-spacing="1.5">FULL NAME</text>
  <text x="40" y="150" fill="#111827" font-family="${fontFamily}" font-size="22" font-weight="700">${data.name}</text>

  <text x="40" y="195" fill="#9ca3af" font-family="${fontFamily}" font-size="9" letter-spacing="1.5">STUDENT ID</text>
  <text x="40" y="218" fill="#111827" font-family="${fontFamily}" font-size="17" font-weight="600" letter-spacing="1.5">${data.studentId}</text>

  <text x="40" y="263" fill="#9ca3af" font-family="${fontFamily}" font-size="9" letter-spacing="1.5">DOB</text>
  <text x="40" y="283" fill="#374151" font-family="${fontFamily}" font-size="13">${dob}</text>

  <text x="240" y="263" fill="#9ca3af" font-family="${fontFamily}" font-size="9" letter-spacing="1.5">MAJOR</text>
  <text x="240" y="283" fill="#374151" font-family="${fontFamily}" font-size="13">${data.department}</text>

  <text x="500" y="263" fill="#9ca3af" font-family="${fontFamily}" font-size="9" letter-spacing="1.5">VALID</text>
  <text x="500" y="283" fill="#374151" font-family="${fontFamily}" font-size="13">${valid}</text>

  <rect x="40" y="305" width="50" height="18" rx="3" fill="#dcfce7"/>
  <text x="65" y="318" fill="#166534" font-family="${fontFamily}" font-size="9" font-weight="600" text-anchor="middle">ACTIVE</text>

  <rect x="0" y="370" width="${w}" height="1" fill="#e5e7eb"/>

  <g transform="translate(${Math.floor((w - barcodeWidth) / 2)}, 400)">
    ${generateBarcode(data.studentId)}
  </g>
  <text x="${w / 2}" y="450" fill="#6b7280" font-family="'Courier New', monospace" font-size="10" text-anchor="middle" letter-spacing="2">${data.studentId}</text>
  <text x="${w / 2}" y="490" fill="#9ca3af" font-family="${fontFamily}" font-size="7.5" text-anchor="middle">Property of ${data.collegeName}. Non-transferable.</text>

  <rect width="${w}" height="${h}" rx="12" fill="none" stroke="#e5e7eb" stroke-width="1"/>
</svg>`;
}

function layoutRibbonHeader(data: CardData, color: string, photo: string | null): string {
  const w = 1012, h = 638;
  const fontFamily = "'Palatino Linotype', 'Book Antiqua', Palatino, serif";
  const dob = formatDate(data.dateOfBirth);
  const valid = formatDate(data.validUntil);
  const collegeFontSize = data.collegeName.length > 28 ? 17 : 21;
  const barcodeDigits = data.studentId.replace(/\D/g, "").substring(0, 12);
  const barcodeWidth = barcodeDigits.length * 8 + 14;

  const photoSection = photo
    ? `<defs><clipPath id="photoClip"><rect x="50" y="145" width="165" height="205" rx="5"/></clipPath></defs>
       <rect x="48" y="143" width="169" height="209" rx="6" fill="white" stroke="${color}" stroke-width="1.5"/>
       <image href="${photo}" x="50" y="145" width="165" height="205" clip-path="url(#photoClip)" preserveAspectRatio="xMidYMid slice"/>`
    : `<rect x="50" y="145" width="165" height="205" rx="5" fill="#f3f4f6" stroke="${color}" stroke-width="1.5"/>
       <text x="132" y="255" fill="#9ca3af" font-family="${fontFamily}" font-size="11" text-anchor="middle">PHOTO</text>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" rx="12" fill="#ffffff"/>
  <rect x="0" y="0" width="${w}" height="50" rx="12" fill="${color}"/>
  <rect x="0" y="12" width="${w}" height="38" fill="${color}"/>

  <rect x="50" y="65" width="${w - 100}" height="50" rx="4" fill="${color}" opacity="0.06"/>
  <text x="${w / 2}" y="82" fill="${color}" font-family="${fontFamily}" font-size="${collegeFontSize}" font-weight="bold" text-anchor="middle">${data.collegeName}</text>
  <text x="${w / 2}" y="103" fill="${color}" font-family="${fontFamily}" font-size="10" letter-spacing="2" text-anchor="middle" opacity="0.6">STUDENT IDENTIFICATION CARD  |  ${getAcademicYear()}</text>

  <text x="${w / 2}" y="30" fill="white" font-family="${fontFamily}" font-size="11" letter-spacing="4" text-anchor="middle" font-weight="600">OFFICIAL DOCUMENT</text>

  ${photoSection}

  <text x="255" y="172" fill="#6b7280" font-family="${fontFamily}" font-size="9" letter-spacing="1.2">NAME</text>
  <text x="255" y="194" fill="#111827" font-family="${fontFamily}" font-size="19" font-weight="bold">${data.name}</text>

  <text x="255" y="230" fill="#6b7280" font-family="${fontFamily}" font-size="9" letter-spacing="1.2">STUDENT ID</text>
  <text x="255" y="250" fill="#111827" font-family="${fontFamily}" font-size="15" font-weight="600" letter-spacing="1">${data.studentId}</text>

  <text x="255" y="286" fill="#6b7280" font-family="${fontFamily}" font-size="9" letter-spacing="1.2">DATE OF BIRTH</text>
  <text x="255" y="304" fill="#374151" font-family="${fontFamily}" font-size="13">${dob}</text>

  <text x="480" y="286" fill="#6b7280" font-family="${fontFamily}" font-size="9" letter-spacing="1.2">MAJOR</text>
  <text x="480" y="304" fill="#374151" font-family="${fontFamily}" font-size="13">${data.department}</text>

  <text x="255" y="340" fill="#6b7280" font-family="${fontFamily}" font-size="9" letter-spacing="1.2">VALID THROUGH</text>
  <text x="255" y="358" fill="#374151" font-family="${fontFamily}" font-size="13">${valid}</text>

  <rect x="480" y="344" width="55" height="18" rx="3" fill="#dcfce7"/>
  <text x="507" y="357" fill="#166534" font-family="${fontFamily}" font-size="10" font-weight="600" text-anchor="middle">ACTIVE</text>

  <rect x="0" y="390" width="${w}" height="1" fill="#e5e7eb"/>
  <rect x="0" y="391" width="${w}" height="${h - 391}" fill="#fafafa"/>
  <rect x="0" y="${h - 12}" width="${w}" height="12" rx="12" fill="#fafafa"/>

  <g transform="translate(${Math.floor((w - barcodeWidth) / 2)}, 415)">
    ${generateBarcode(data.studentId)}
  </g>
  <text x="${w / 2}" y="465" fill="#6b7280" font-family="'Courier New', monospace" font-size="10" text-anchor="middle" letter-spacing="2">${data.studentId}</text>
  <text x="${w / 2}" y="505" fill="#9ca3af" font-family="${fontFamily}" font-size="7.5" text-anchor="middle">Property of ${data.collegeName}. Non-transferable.</text>

  <rect x="0" y="${h - 4}" width="${w}" height="4" fill="${color}"/>
  <rect width="${w}" height="${h}" rx="12" fill="none" stroke="#d1d5db" stroke-width="1"/>
</svg>`;
}

function layoutBottomHeavy(data: CardData, color: string, photo: string | null): string {
  const w = 1012, h = 638;
  const fontFamily = "'Gill Sans', 'Gill Sans MT', Calibri, sans-serif";
  const dob = formatDate(data.dateOfBirth);
  const valid = formatDate(data.validUntil);
  const collegeFontSize = data.collegeName.length > 28 ? 17 : 21;
  const barcodeDigits = data.studentId.replace(/\D/g, "").substring(0, 12);
  const barcodeWidth = barcodeDigits.length * 8 + 14;

  const photoSection = photo
    ? `<defs><clipPath id="photoClip"><circle cx="${w / 2}" cy="130" r="70"/></clipPath></defs>
       <circle cx="${w / 2}" cy="130" r="73" fill="white" stroke="${color}" stroke-width="2"/>
       <image href="${photo}" x="${w / 2 - 70}" y="60" width="140" height="140" clip-path="url(#photoClip)" preserveAspectRatio="xMidYMid slice"/>`
    : `<circle cx="${w / 2}" cy="130" r="73" fill="#f3f4f6" stroke="${color}" stroke-width="2"/>
       <text x="${w / 2}" y="136" fill="#9ca3af" font-family="${fontFamily}" font-size="11" text-anchor="middle">PHOTO</text>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" rx="12" fill="#ffffff"/>
  <rect x="0" y="0" width="${w}" height="40" rx="12" fill="${color}"/>
  <rect x="0" y="12" width="${w}" height="28" fill="${color}"/>

  <text x="${w / 2}" y="28" fill="white" font-family="${fontFamily}" font-size="11" letter-spacing="3" text-anchor="middle" font-weight="600">${data.collegeName.toUpperCase()}</text>

  ${photoSection}

  <text x="${w / 2}" y="230" fill="#111827" font-family="${fontFamily}" font-size="20" font-weight="bold" text-anchor="middle">${data.name}</text>
  <text x="${w / 2}" y="255" fill="#6b7280" font-family="${fontFamily}" font-size="11" text-anchor="middle">${data.department}  |  ${data.studentId}</text>

  <rect x="0" y="280" width="${w}" height="${h - 280}" fill="${color}" opacity="0.04"/>
  <rect x="0" y="${h - 12}" width="${w}" height="12" rx="12" fill="white"/>
  <rect x="0" y="280" width="${w}" height="2" fill="${color}" opacity="0.1"/>

  <text x="80" y="318" fill="#9ca3af" font-family="${fontFamily}" font-size="9" letter-spacing="1.5">STUDENT ID</text>
  <text x="80" y="340" fill="#111827" font-family="${fontFamily}" font-size="16" font-weight="600" letter-spacing="1">${data.studentId}</text>

  <text x="350" y="318" fill="#9ca3af" font-family="${fontFamily}" font-size="9" letter-spacing="1.5">DATE OF BIRTH</text>
  <text x="350" y="340" fill="#374151" font-family="${fontFamily}" font-size="14">${dob}</text>

  <text x="600" y="318" fill="#9ca3af" font-family="${fontFamily}" font-size="9" letter-spacing="1.5">VALID THROUGH</text>
  <text x="600" y="340" fill="#374151" font-family="${fontFamily}" font-size="14">${valid}</text>

  <text x="${w - 80}" y="318" fill="#9ca3af" font-family="${fontFamily}" font-size="9" letter-spacing="1.5" text-anchor="end">STATUS</text>
  <rect x="${w - 130}" y="326" width="50" height="18" rx="3" fill="#dcfce7"/>
  <text x="${w - 105}" y="339" fill="#166534" font-family="${fontFamily}" font-size="9" font-weight="600" text-anchor="middle">ACTIVE</text>

  <line x1="80" y1="365" x2="${w - 80}" y2="365" stroke="#e5e7eb" stroke-width="1"/>

  <text x="80" y="395" fill="#9ca3af" font-family="${fontFamily}" font-size="9" letter-spacing="1.5">ACADEMIC YEAR</text>
  <text x="80" y="415" fill="#374151" font-family="${fontFamily}" font-size="13">${getAcademicYear()}</text>

  <text x="350" y="395" fill="#9ca3af" font-family="${fontFamily}" font-size="9" letter-spacing="1.5">INSTITUTION</text>
  <text x="350" y="415" fill="#374151" font-family="${fontFamily}" font-size="13">${data.collegeName.length > 35 ? data.collegeName.substring(0, 35) + '...' : data.collegeName}</text>

  <g transform="translate(${Math.floor((w - barcodeWidth) / 2)}, 450)">
    ${generateBarcode(data.studentId)}
  </g>
  <text x="${w / 2}" y="500" fill="#6b7280" font-family="'Courier New', monospace" font-size="10" text-anchor="middle" letter-spacing="2">${data.studentId}</text>
  <text x="${w / 2}" y="540" fill="#9ca3af" font-family="${fontFamily}" font-size="7.5" text-anchor="middle">Property of ${data.collegeName}. Non-transferable.</text>

  <rect x="0" y="${h - 5}" width="${w}" height="5" fill="${color}"/>
  <rect width="${w}" height="${h}" rx="12" fill="none" stroke="#d1d5db" stroke-width="1"/>
</svg>`;
}

function layoutGridInfo(data: CardData, color: string, photo: string | null): string {
  const w = 1012, h = 638;
  const fontFamily = "'Avenir', 'Century Gothic', sans-serif";
  const dob = formatDate(data.dateOfBirth);
  const valid = formatDate(data.validUntil);
  const collegeFontSize = data.collegeName.length > 28 ? 17 : 21;
  const barcodeDigits = data.studentId.replace(/\D/g, "").substring(0, 12);
  const barcodeWidth = barcodeDigits.length * 8 + 14;

  const photoSection = photo
    ? `<defs><clipPath id="photoClip"><rect x="42" y="115" width="170" height="212" rx="6"/></clipPath></defs>
       <rect x="40" y="113" width="174" height="216" rx="7" fill="white" stroke="#d1d5db" stroke-width="1"/>
       <image href="${photo}" x="42" y="115" width="170" height="212" clip-path="url(#photoClip)" preserveAspectRatio="xMidYMid slice"/>`
    : `<rect x="42" y="115" width="170" height="212" rx="6" fill="#f3f4f6" stroke="#d1d5db" stroke-width="1"/>
       <text x="127" y="226" fill="#9ca3af" font-family="${fontFamily}" font-size="11" text-anchor="middle">PHOTO</text>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" rx="12" fill="#ffffff"/>
  <rect x="0" y="0" width="${w}" height="85" rx="12" fill="${color}"/>
  <rect x="0" y="12" width="${w}" height="73" fill="${color}"/>

  <text x="40" y="38" fill="white" font-family="${fontFamily}" font-size="${collegeFontSize}" font-weight="bold">${data.collegeName}</text>
  <text x="40" y="60" fill="rgba(255,255,255,0.7)" font-family="${fontFamily}" font-size="10" letter-spacing="2">STUDENT IDENTIFICATION  |  ${getAcademicYear()}</text>

  ${photoSection}

  <rect x="245" y="115" width="345" height="100" rx="6" fill="#f8f9fa" stroke="#e5e7eb" stroke-width="1"/>
  <text x="265" y="143" fill="#9ca3af" font-family="${fontFamily}" font-size="9" letter-spacing="1">FULL NAME</text>
  <text x="265" y="165" fill="#111827" font-family="${fontFamily}" font-size="18" font-weight="bold">${data.name}</text>
  <text x="265" y="195" fill="#9ca3af" font-family="${fontFamily}" font-size="9" letter-spacing="1">MAJOR: ${data.department}</text>

  <rect x="610" y="115" width="362" height="100" rx="6" fill="#f8f9fa" stroke="#e5e7eb" stroke-width="1"/>
  <text x="630" y="143" fill="#9ca3af" font-family="${fontFamily}" font-size="9" letter-spacing="1">STUDENT ID</text>
  <text x="630" y="165" fill="#111827" font-family="${fontFamily}" font-size="17" font-weight="600" letter-spacing="1.5">${data.studentId}</text>
  <rect x="630" y="180" width="50" height="18" rx="3" fill="#dcfce7"/>
  <text x="655" y="193" fill="#166534" font-family="${fontFamily}" font-size="9" font-weight="600" text-anchor="middle">ACTIVE</text>

  <rect x="245" y="230" width="220" height="95" rx="6" fill="#f8f9fa" stroke="#e5e7eb" stroke-width="1"/>
  <text x="265" y="258" fill="#9ca3af" font-family="${fontFamily}" font-size="9" letter-spacing="1">DATE OF BIRTH</text>
  <text x="265" y="280" fill="#374151" font-family="${fontFamily}" font-size="14">${dob}</text>
  <text x="265" y="308" fill="#9ca3af" font-family="${fontFamily}" font-size="8">Personal Information</text>

  <rect x="480" y="230" width="220" height="95" rx="6" fill="#f8f9fa" stroke="#e5e7eb" stroke-width="1"/>
  <text x="500" y="258" fill="#9ca3af" font-family="${fontFamily}" font-size="9" letter-spacing="1">VALID THROUGH</text>
  <text x="500" y="280" fill="#374151" font-family="${fontFamily}" font-size="14">${valid}</text>
  <text x="500" y="308" fill="#9ca3af" font-family="${fontFamily}" font-size="8">Expiration Date</text>

  <rect x="715" y="230" width="257" height="95" rx="6" fill="#f8f9fa" stroke="#e5e7eb" stroke-width="1"/>
  <text x="735" y="258" fill="#9ca3af" font-family="${fontFamily}" font-size="9" letter-spacing="1">ACADEMIC YEAR</text>
  <text x="735" y="280" fill="#374151" font-family="${fontFamily}" font-size="14">${getAcademicYear()}</text>
  <text x="735" y="308" fill="#9ca3af" font-family="${fontFamily}" font-size="8">Current Session</text>

  <rect x="0" y="370" width="${w}" height="1" fill="#e5e7eb"/>
  <rect x="0" y="371" width="${w}" height="${h - 371}" fill="#fafafa"/>
  <rect x="0" y="${h - 12}" width="${w}" height="12" rx="12" fill="#fafafa"/>

  <g transform="translate(${Math.floor((w - barcodeWidth) / 2)}, 395)">
    ${generateBarcode(data.studentId)}
  </g>
  <text x="${w / 2}" y="445" fill="#6b7280" font-family="'Courier New', monospace" font-size="10" text-anchor="middle" letter-spacing="2">${data.studentId}</text>
  <text x="${w / 2}" y="485" fill="#9ca3af" font-family="${fontFamily}" font-size="7.5" text-anchor="middle">Property of ${data.collegeName}. Non-transferable.</text>

  <rect x="0" y="${h - 4}" width="${w}" height="4" fill="${color}"/>
  <rect width="${w}" height="${h}" rx="12" fill="none" stroke="#d1d5db" stroke-width="1"/>
</svg>`;
}

function layoutEnrollmentLetter(data: CardData, color: string, photo: string | null): string {
  const w = 850, h = 1100;
  const fontFamily = "'Times New Roman', Times, serif";
  const today = new Date();
  const dateStr = today.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const academicYear = getAcademicYear();
  const semester = today.getMonth() >= 7 ? "Fall" : today.getMonth() >= 0 && today.getMonth() <= 4 ? "Spring" : "Summer";
  const refNum = `ENV-${data.studentId.replace(/\D/g, "").substring(0, 6)}-${today.getFullYear()}`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="#ffffff"/>
  <rect x="0" y="0" width="${w}" height="8" fill="${color}"/>
  <rect x="60" y="40" width="6" height="60" fill="${color}"/>
  <text x="80" y="70" fill="${color}" font-family="${fontFamily}" font-size="24" font-weight="bold">${data.collegeName}</text>
  <text x="80" y="92" fill="#555" font-family="Arial, sans-serif" font-size="11" letter-spacing="1.5">OFFICE OF THE REGISTRAR</text>
  <text x="${w - 60}" y="70" fill="#888" font-family="Arial, sans-serif" font-size="9" text-anchor="end">123 University Drive</text>
  <text x="${w - 60}" y="83" fill="#888" font-family="Arial, sans-serif" font-size="9" text-anchor="end">Admissions Hall, Suite 200</text>
  <text x="${w - 60}" y="96" fill="#888" font-family="Arial, sans-serif" font-size="9" text-anchor="end">Phone: (555) 123-4567</text>
  <line x1="60" y1="115" x2="${w - 60}" y2="115" stroke="${color}" stroke-width="2"/>
  <line x1="60" y1="119" x2="${w - 60}" y2="119" stroke="${color}" stroke-width="0.5" opacity="0.3"/>

  <text x="60" y="160" fill="#333" font-family="${fontFamily}" font-size="18" font-weight="bold">ENROLLMENT VERIFICATION LETTER</text>
  <text x="${w - 60}" y="160" fill="#888" font-family="Arial, sans-serif" font-size="10" text-anchor="end">Ref: ${refNum}</text>

  <text x="60" y="200" fill="#333" font-family="${fontFamily}" font-size="13">${dateStr}</text>

  <text x="60" y="245" fill="#333" font-family="${fontFamily}" font-size="13">To Whom It May Concern,</text>

  <text x="60" y="285" fill="#333" font-family="${fontFamily}" font-size="13">This letter confirms that <tspan font-weight="bold">${data.name}</tspan> (Student ID: ${data.studentId})</text>
  <text x="60" y="305" fill="#333" font-family="${fontFamily}" font-size="13">is currently enrolled as a full-time student at ${data.collegeName}</text>
  <text x="60" y="325" fill="#333" font-family="${fontFamily}" font-size="13">for the ${semester} semester of the ${academicYear} academic year.</text>

  <text x="60" y="365" fill="#333" font-family="${fontFamily}" font-size="13">Program of Study: <tspan font-weight="bold">${data.department}</tspan></text>
  <text x="60" y="385" fill="#333" font-family="${fontFamily}" font-size="13">Classification: Undergraduate</text>
  <text x="60" y="405" fill="#333" font-family="${fontFamily}" font-size="13">Expected Graduation: ${formatDate(data.validUntil)}</text>
  <text x="60" y="425" fill="#333" font-family="${fontFamily}" font-size="13">Enrollment Status: Full-Time (12+ credit hours)</text>

  <text x="60" y="470" fill="#333" font-family="${fontFamily}" font-size="13">The student is in good academic standing and is making satisfactory progress</text>
  <text x="60" y="490" fill="#333" font-family="${fontFamily}" font-size="13">toward their degree requirements.</text>

  <text x="60" y="535" fill="#333" font-family="${fontFamily}" font-size="13">If you require any additional information, please do not hesitate to contact</text>
  <text x="60" y="555" fill="#333" font-family="${fontFamily}" font-size="13">the Office of the Registrar at (555) 123-4567.</text>

  <text x="60" y="610" fill="#333" font-family="${fontFamily}" font-size="13">Sincerely,</text>
  <text x="60" y="660" fill="${color}" font-family="'Brush Script MT', cursive" font-size="22">Dr. Sarah Mitchell</text>
  <text x="60" y="680" fill="#333" font-family="${fontFamily}" font-size="13">Dr. Sarah Mitchell</text>
  <text x="60" y="698" fill="#555" font-family="${fontFamily}" font-size="12">University Registrar</text>
  <text x="60" y="715" fill="#555" font-family="${fontFamily}" font-size="12">${data.collegeName}</text>

  <rect x="580" y="630" width="120" height="120" rx="4" fill="none" stroke="${color}" stroke-width="1.5" opacity="0.3"/>
  <text x="640" y="685" fill="${color}" font-family="Arial, sans-serif" font-size="8" text-anchor="middle" opacity="0.4">OFFICIAL SEAL</text>
  <circle cx="640" cy="700" r="30" fill="none" stroke="${color}" stroke-width="1" opacity="0.2"/>
  <text x="640" y="704" fill="${color}" font-family="Arial, sans-serif" font-size="6" text-anchor="middle" opacity="0.3">REGISTRAR</text>

  <line x1="60" y1="780" x2="${w - 60}" y2="780" stroke="#ddd" stroke-width="0.5"/>
  <text x="${w / 2}" y="800" fill="#999" font-family="Arial, sans-serif" font-size="8" text-anchor="middle">This document is official and does not require a physical signature when transmitted electronically.</text>
  <text x="${w / 2}" y="815" fill="#999" font-family="Arial, sans-serif" font-size="8" text-anchor="middle">Document ID: ${refNum} | Generated: ${dateStr}</text>

  <rect x="0" y="${h - 8}" width="${w}" height="8" fill="${color}"/>
</svg>`;
}

function layoutTranscript(data: CardData, color: string, photo: string | null): string {
  const w = 850, h = 1100;
  const fontFamily = "Arial, Helvetica, sans-serif";
  const academicYear = getAcademicYear();
  const today = new Date();
  const h1 = hashName(data.name);
  const grades = ["A", "A-", "B+", "B", "A", "B+", "A-", "B"];
  const courses = [
    { code: "ENG 101", name: "English Composition I", credits: 3 },
    { code: `${data.department.substring(0, 3).toUpperCase()} 201`, name: `Intro to ${data.department}`, credits: 4 },
    { code: `${data.department.substring(0, 3).toUpperCase()} 210`, name: `${data.department} Methods`, credits: 3 },
    { code: "MATH 151", name: "Calculus I", credits: 4 },
    { code: "HIST 110", name: "World History", credits: 3 },
    { code: `${data.department.substring(0, 3).toUpperCase()} 220`, name: `Advanced ${data.department}`, credits: 3 },
    { code: "PSYC 100", name: "General Psychology", credits: 3 },
    { code: "PHYS 101", name: "Physics I", credits: 4 },
  ];
  const gpaValues: Record<string, number> = { "A": 4.0, "A-": 3.7, "B+": 3.3, "B": 3.0 };
  let totalPoints = 0, totalCredits = 0;
  courses.forEach((c, i) => { totalPoints += (gpaValues[grades[i]] || 3.0) * c.credits; totalCredits += c.credits; });
  const gpa = (totalPoints / totalCredits).toFixed(2);

  let courseRows = "";
  let y = 440;
  courses.forEach((c, i) => {
    const bg = i % 2 === 0 ? "#f9fafb" : "#ffffff";
    courseRows += `<rect x="60" y="${y - 14}" width="${w - 120}" height="24" fill="${bg}"/>`;
    courseRows += `<text x="75" y="${y}" fill="#333" font-family="${fontFamily}" font-size="11">${c.code}</text>`;
    courseRows += `<text x="180" y="${y}" fill="#333" font-family="${fontFamily}" font-size="11">${c.name}</text>`;
    courseRows += `<text x="520" y="${y}" fill="#333" font-family="${fontFamily}" font-size="11" text-anchor="middle">${c.credits}</text>`;
    courseRows += `<text x="600" y="${y}" fill="#333" font-family="${fontFamily}" font-size="11" text-anchor="middle">${grades[i]}</text>`;
    courseRows += `<text x="690" y="${y}" fill="#333" font-family="${fontFamily}" font-size="11" text-anchor="middle">${(gpaValues[grades[i]] * c.credits).toFixed(1)}</text>`;
    y += 24;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="#ffffff"/>
  <rect x="0" y="0" width="${w}" height="100" fill="${color}"/>
  <text x="${w / 2}" y="40" fill="white" font-family="${fontFamily}" font-size="22" font-weight="bold" text-anchor="middle">${data.collegeName}</text>
  <text x="${w / 2}" y="62" fill="rgba(255,255,255,0.85)" font-family="${fontFamily}" font-size="14" text-anchor="middle">OFFICIAL ACADEMIC TRANSCRIPT</text>
  <text x="${w / 2}" y="82" fill="rgba(255,255,255,0.6)" font-family="${fontFamily}" font-size="10" text-anchor="middle">UNOFFICIAL COPY - FOR VERIFICATION PURPOSES</text>

  <rect x="60" y="120" width="${w - 120}" height="130" rx="4" fill="#f8f9fa" stroke="#e5e7eb" stroke-width="1"/>
  <text x="80" y="148" fill="#6b7280" font-family="${fontFamily}" font-size="9" letter-spacing="1.5">STUDENT NAME</text>
  <text x="80" y="168" fill="#111" font-family="${fontFamily}" font-size="16" font-weight="bold">${data.name}</text>
  <text x="80" y="195" fill="#6b7280" font-family="${fontFamily}" font-size="9" letter-spacing="1.5">STUDENT ID</text>
  <text x="80" y="212" fill="#111" font-family="${fontFamily}" font-size="13" letter-spacing="1">${data.studentId}</text>
  <text x="80" y="235" fill="#6b7280" font-family="${fontFamily}" font-size="9" letter-spacing="1.5">DATE OF BIRTH</text>
  <text x="80" y="248" fill="#333" font-family="${fontFamily}" font-size="12">${formatDate(data.dateOfBirth)}</text>

  <text x="420" y="148" fill="#6b7280" font-family="${fontFamily}" font-size="9" letter-spacing="1.5">PROGRAM</text>
  <text x="420" y="168" fill="#111" font-family="${fontFamily}" font-size="14" font-weight="600">${data.department}</text>
  <text x="420" y="195" fill="#6b7280" font-family="${fontFamily}" font-size="9" letter-spacing="1.5">CLASSIFICATION</text>
  <text x="420" y="212" fill="#333" font-family="${fontFamily}" font-size="13">Undergraduate - ${h1 % 4 + 1}${["st", "nd", "rd", "th"][h1 % 4]} Year</text>
  <text x="420" y="235" fill="#6b7280" font-family="${fontFamily}" font-size="9" letter-spacing="1.5">ACADEMIC STANDING</text>
  <text x="420" y="248" fill="#166534" font-family="${fontFamily}" font-size="12" font-weight="600">Good Standing</text>

  <text x="60" y="290" fill="${color}" font-family="${fontFamily}" font-size="14" font-weight="bold">Academic Record - ${academicYear}</text>
  <text x="${w - 60}" y="290" fill="#6b7280" font-family="${fontFamily}" font-size="10" text-anchor="end">Term GPA: ${gpa}  |  Cumulative GPA: ${gpa}</text>

  <line x1="60" y1="300" x2="${w - 60}" y2="300" stroke="${color}" stroke-width="1.5"/>

  <text x="60" y="330" fill="${color}" font-family="${fontFamily}" font-size="12" font-weight="bold">${today.getMonth() >= 7 ? "Fall" : "Spring"} Semester ${today.getFullYear()}</text>

  <rect x="60" y="355" width="${w - 120}" height="28" fill="${color}" opacity="0.1"/>
  <text x="75" y="374" fill="${color}" font-family="${fontFamily}" font-size="10" font-weight="bold">COURSE</text>
  <text x="180" y="374" fill="${color}" font-family="${fontFamily}" font-size="10" font-weight="bold">TITLE</text>
  <text x="520" y="374" fill="${color}" font-family="${fontFamily}" font-size="10" font-weight="bold" text-anchor="middle">CREDITS</text>
  <text x="600" y="374" fill="${color}" font-family="${fontFamily}" font-size="10" font-weight="bold" text-anchor="middle">GRADE</text>
  <text x="690" y="374" fill="${color}" font-family="${fontFamily}" font-size="10" font-weight="bold" text-anchor="middle">POINTS</text>

  <line x1="60" y1="385" x2="${w - 60}" y2="385" stroke="#d1d5db" stroke-width="0.5"/>
  ${courseRows}

  <line x1="60" y1="${y}" x2="${w - 60}" y2="${y}" stroke="#d1d5db" stroke-width="1"/>
  <text x="420" y="${y + 20}" fill="#333" font-family="${fontFamily}" font-size="11" font-weight="bold">Term Totals:</text>
  <text x="520" y="${y + 20}" fill="#333" font-family="${fontFamily}" font-size="11" font-weight="bold" text-anchor="middle">${totalCredits}</text>
  <text x="690" y="${y + 20}" fill="#333" font-family="${fontFamily}" font-size="11" font-weight="bold" text-anchor="middle">${totalPoints.toFixed(1)}</text>

  <rect x="60" y="${y + 40}" width="200" height="50" rx="4" fill="${color}" opacity="0.06"/>
  <text x="80" y="${y + 58}" fill="#6b7280" font-family="${fontFamily}" font-size="9">CUMULATIVE GPA</text>
  <text x="80" y="${y + 78}" fill="${color}" font-family="${fontFamily}" font-size="20" font-weight="bold">${gpa}</text>
  <text x="160" y="${y + 78}" fill="#6b7280" font-family="${fontFamily}" font-size="11">/ 4.00</text>

  <text x="300" y="${y + 58}" fill="#6b7280" font-family="${fontFamily}" font-size="9">TOTAL CREDITS EARNED</text>
  <text x="300" y="${y + 78}" fill="#333" font-family="${fontFamily}" font-size="16" font-weight="bold">${totalCredits + (h1 % 40) + 30}</text>

  <line x1="60" y1="${y + 110}" x2="${w - 60}" y2="${y + 110}" stroke="#ddd" stroke-width="0.5"/>
  <text x="${w / 2}" y="${y + 130}" fill="#999" font-family="${fontFamily}" font-size="8" text-anchor="middle">This transcript is issued by ${data.collegeName}. Unauthorized alteration renders this document void.</text>
  <text x="${w / 2}" y="${y + 145}" fill="#999" font-family="${fontFamily}" font-size="8" text-anchor="middle">Printed: ${new Date().toLocaleDateString("en-US")} | Student ID: ${data.studentId}</text>

  <rect x="0" y="${h - 6}" width="${w}" height="6" fill="${color}"/>
</svg>`;
}

function layoutTuitionBill(data: CardData, color: string, photo: string | null): string {
  const w = 850, h = 1100;
  const fontFamily = "Arial, Helvetica, sans-serif";
  const h1 = hashName(data.name + data.studentId);
  const semester = new Date().getMonth() >= 7 ? "Fall" : "Spring";
  const year = new Date().getFullYear();
  const tuition = 12500 + (h1 % 8000);
  const fees = 1850 + (h1 % 500);
  const techFee = 350;
  const healthFee = 780;
  const total = tuition + fees + techFee + healthFee;
  const aid = 5000 + (h1 % 6000);
  const balance = total - aid;
  const acctNum = `ACCT-${data.studentId.replace(/\D/g, "").substring(0, 8)}`;
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="#ffffff"/>
  <rect x="0" y="0" width="${w}" height="6" fill="${color}"/>

  <text x="60" y="50" fill="${color}" font-family="${fontFamily}" font-size="22" font-weight="bold">${data.collegeName}</text>
  <text x="60" y="72" fill="#666" font-family="${fontFamily}" font-size="11" letter-spacing="1.5">OFFICE OF STUDENT FINANCIAL SERVICES</text>
  <text x="${w - 60}" y="50" fill="#333" font-family="${fontFamily}" font-size="14" font-weight="bold" text-anchor="end">TUITION STATEMENT</text>
  <text x="${w - 60}" y="68" fill="#888" font-family="${fontFamily}" font-size="10" text-anchor="end">${semester} ${year}</text>

  <line x1="60" y1="90" x2="${w - 60}" y2="90" stroke="${color}" stroke-width="1.5"/>

  <rect x="60" y="110" width="350" height="90" rx="4" fill="#f8f9fa" stroke="#e5e7eb" stroke-width="1"/>
  <text x="80" y="133" fill="#6b7280" font-family="${fontFamily}" font-size="9" letter-spacing="1">STUDENT</text>
  <text x="80" y="152" fill="#111" font-family="${fontFamily}" font-size="15" font-weight="bold">${data.name}</text>
  <text x="80" y="172" fill="#555" font-family="${fontFamily}" font-size="11">ID: ${data.studentId}  |  ${data.department}</text>
  <text x="80" y="190" fill="#555" font-family="${fontFamily}" font-size="11">Account: ${acctNum}</text>

  <rect x="440" y="110" width="${w - 500}" height="90" rx="4" fill="${color}" opacity="0.06" stroke="${color}" stroke-width="1" stroke-opacity="0.15"/>
  <text x="460" y="133" fill="#6b7280" font-family="${fontFamily}" font-size="9" letter-spacing="1">AMOUNT DUE</text>
  <text x="460" y="162" fill="${color}" font-family="${fontFamily}" font-size="26" font-weight="bold">$${balance.toLocaleString()}.00</text>
  <text x="460" y="182" fill="#888" font-family="${fontFamily}" font-size="10">Due: ${dueDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</text>

  <text x="60" y="240" fill="${color}" font-family="${fontFamily}" font-size="13" font-weight="bold">CHARGES</text>
  <line x1="60" y1="250" x2="${w - 60}" y2="250" stroke="#d1d5db" stroke-width="1"/>

  <rect x="60" y="258" width="${w - 120}" height="26" fill="${color}" opacity="0.06"/>
  <text x="75" y="276" fill="#555" font-family="${fontFamily}" font-size="10" font-weight="bold">DESCRIPTION</text>
  <text x="${w - 75}" y="276" fill="#555" font-family="${fontFamily}" font-size="10" font-weight="bold" text-anchor="end">AMOUNT</text>

  <text x="75" y="308" fill="#333" font-family="${fontFamily}" font-size="12">Tuition - Undergraduate (Full-Time, 15 credits)</text>
  <text x="${w - 75}" y="308" fill="#333" font-family="${fontFamily}" font-size="12" text-anchor="end">$${tuition.toLocaleString()}.00</text>

  <line x1="75" y1="318" x2="${w - 75}" y2="318" stroke="#f0f0f0" stroke-width="0.5"/>
  <text x="75" y="338" fill="#333" font-family="${fontFamily}" font-size="12">Student Activity Fee</text>
  <text x="${w - 75}" y="338" fill="#333" font-family="${fontFamily}" font-size="12" text-anchor="end">$${fees.toLocaleString()}.00</text>

  <line x1="75" y1="348" x2="${w - 75}" y2="348" stroke="#f0f0f0" stroke-width="0.5"/>
  <text x="75" y="368" fill="#333" font-family="${fontFamily}" font-size="12">Technology Fee</text>
  <text x="${w - 75}" y="368" fill="#333" font-family="${fontFamily}" font-size="12" text-anchor="end">$${techFee}.00</text>

  <line x1="75" y1="378" x2="${w - 75}" y2="378" stroke="#f0f0f0" stroke-width="0.5"/>
  <text x="75" y="398" fill="#333" font-family="${fontFamily}" font-size="12">Student Health Insurance</text>
  <text x="${w - 75}" y="398" fill="#333" font-family="${fontFamily}" font-size="12" text-anchor="end">$${healthFee}.00</text>

  <line x1="60" y1="415" x2="${w - 60}" y2="415" stroke="#333" stroke-width="1"/>
  <text x="75" y="438" fill="#111" font-family="${fontFamily}" font-size="13" font-weight="bold">Total Charges</text>
  <text x="${w - 75}" y="438" fill="#111" font-family="${fontFamily}" font-size="13" font-weight="bold" text-anchor="end">$${total.toLocaleString()}.00</text>

  <text x="60" y="480" fill="${color}" font-family="${fontFamily}" font-size="13" font-weight="bold">FINANCIAL AID &amp; CREDITS</text>
  <line x1="60" y1="490" x2="${w - 60}" y2="490" stroke="#d1d5db" stroke-width="1"/>
  <text x="75" y="515" fill="#333" font-family="${fontFamily}" font-size="12">Financial Aid / Scholarship Applied</text>
  <text x="${w - 75}" y="515" fill="#166534" font-family="${fontFamily}" font-size="12" text-anchor="end">-$${aid.toLocaleString()}.00</text>

  <line x1="60" y1="535" x2="${w - 60}" y2="535" stroke="${color}" stroke-width="2"/>
  <text x="75" y="560" fill="${color}" font-family="${fontFamily}" font-size="15" font-weight="bold">BALANCE DUE</text>
  <text x="${w - 75}" y="560" fill="${color}" font-family="${fontFamily}" font-size="15" font-weight="bold" text-anchor="end">$${balance.toLocaleString()}.00</text>

  <rect x="60" y="590" width="${w - 120}" height="60" rx="4" fill="#fefce8" stroke="#fde68a" stroke-width="1"/>
  <text x="80" y="612" fill="#92400e" font-family="${fontFamily}" font-size="10" font-weight="bold">PAYMENT INSTRUCTIONS</text>
  <text x="80" y="630" fill="#92400e" font-family="${fontFamily}" font-size="10">Payment is due by ${dueDate.toLocaleDateString("en-US")}. Late payments are subject to a 1.5% monthly finance charge.</text>
  <text x="80" y="644" fill="#92400e" font-family="${fontFamily}" font-size="10">Pay online at studentportal.${data.collegeName.toLowerCase().replace(/\s+/g, "")}.edu or mail check to Bursar's Office.</text>

  <g transform="translate(${Math.floor((w - 100) / 2)}, 690)">
    ${generateBarcode(data.studentId)}
  </g>
  <text x="${w / 2}" y="740" fill="#888" font-family="'Courier New', monospace" font-size="9" text-anchor="middle">${acctNum}</text>

  <line x1="60" y1="770" x2="${w - 60}" y2="770" stroke="#ddd" stroke-width="0.5"/>
  <text x="${w / 2}" y="790" fill="#999" font-family="${fontFamily}" font-size="8" text-anchor="middle">Questions? Contact Student Financial Services: (555) 123-4567 | billing@${data.collegeName.toLowerCase().replace(/\s+/g, "")}.edu</text>
  <rect x="0" y="${h - 6}" width="${w}" height="6" fill="${color}"/>
</svg>`;
}

function layoutClassSchedule(data: CardData, color: string, photo: string | null): string {
  const w = 850, h = 1100;
  const fontFamily = "Arial, Helvetica, sans-serif";
  const h1 = hashName(data.name);
  const semester = new Date().getMonth() >= 7 ? "Fall" : "Spring";
  const year = new Date().getFullYear();
  const days = ["MWF", "TR", "MWF", "TR", "MW"];
  const times = ["8:00 AM - 8:50 AM", "9:30 AM - 10:45 AM", "11:00 AM - 11:50 AM", "1:00 PM - 2:15 PM", "3:00 PM - 4:15 PM"];
  const rooms = ["Science Hall 201", "Arts Building 105", "Main Hall 302", "Library 410", "Engineering 115"];
  const profs = ["Dr. Johnson", "Prof. Williams", "Dr. Chen", "Prof. Garcia", "Dr. Patel"];
  const dept = data.department.substring(0, 3).toUpperCase();
  const courses = [
    { code: `${dept} 201`, name: `Intro to ${data.department}`, credits: 3 },
    { code: `${dept} 310`, name: `${data.department} Analysis`, credits: 4 },
    { code: "ENG 201", name: "Technical Writing", credits: 3 },
    { code: "MATH 252", name: "Linear Algebra", credits: 3 },
    { code: `${dept} 350`, name: `Applied ${data.department}`, credits: 3 },
  ];
  const totalCredits = courses.reduce((s, c) => s + c.credits, 0);

  let rows = "";
  let y = 360;
  courses.forEach((c, i) => {
    const bg = i % 2 === 0 ? "#f9fafb" : "#ffffff";
    rows += `<rect x="60" y="${y - 15}" width="${w - 120}" height="55" fill="${bg}"/>`;
    rows += `<text x="75" y="${y}" fill="${color}" font-family="${fontFamily}" font-size="12" font-weight="bold">${c.code}</text>`;
    rows += `<text x="160" y="${y}" fill="#111" font-family="${fontFamily}" font-size="12">${c.name}</text>`;
    rows += `<text x="75" y="${y + 18}" fill="#666" font-family="${fontFamily}" font-size="10">${days[i]}  |  ${times[i]}  |  ${rooms[i]}</text>`;
    rows += `<text x="75" y="${y + 33}" fill="#888" font-family="${fontFamily}" font-size="10">Instructor: ${profs[i]}</text>`;
    rows += `<text x="${w - 75}" y="${y}" fill="#333" font-family="${fontFamily}" font-size="11" text-anchor="end">${c.credits} cr</text>`;
    y += 55;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="#ffffff"/>
  <rect x="0" y="0" width="${w}" height="90" fill="${color}"/>
  <text x="60" y="38" fill="white" font-family="${fontFamily}" font-size="20" font-weight="bold">${data.collegeName}</text>
  <text x="60" y="60" fill="rgba(255,255,255,0.8)" font-family="${fontFamily}" font-size="12">CLASS SCHEDULE - ${semester.toUpperCase()} ${year}</text>
  <text x="${w - 60}" y="60" fill="rgba(255,255,255,0.6)" font-family="${fontFamily}" font-size="10" text-anchor="end">Academic Year ${getAcademicYear()}</text>

  <rect x="60" y="110" width="${w - 120}" height="100" rx="4" fill="#f8f9fa" stroke="#e5e7eb" stroke-width="1"/>
  <text x="80" y="135" fill="#6b7280" font-family="${fontFamily}" font-size="9" letter-spacing="1">STUDENT</text>
  <text x="80" y="155" fill="#111" font-family="${fontFamily}" font-size="16" font-weight="bold">${data.name}</text>
  <text x="80" y="175" fill="#555" font-family="${fontFamily}" font-size="11">ID: ${data.studentId}  |  ${data.department}</text>
  <text x="80" y="195" fill="#555" font-family="${fontFamily}" font-size="11">Enrollment Status: Full-Time  |  Total Credits: ${totalCredits}</text>

  <text x="420" y="135" fill="#6b7280" font-family="${fontFamily}" font-size="9" letter-spacing="1">ADVISOR</text>
  <text x="420" y="155" fill="#333" font-family="${fontFamily}" font-size="13">Dr. ${["Anderson", "Thompson", "Martinez", "Lee"][h1 % 4]}</text>
  <text x="420" y="175" fill="#6b7280" font-family="${fontFamily}" font-size="9" letter-spacing="1">PRINT DATE</text>
  <text x="420" y="195" fill="#333" font-family="${fontFamily}" font-size="12">${new Date().toLocaleDateString("en-US")}</text>

  <text x="60" y="250" fill="${color}" font-family="${fontFamily}" font-size="14" font-weight="bold">Enrolled Courses</text>
  <line x1="60" y1="260" x2="${w - 60}" y2="260" stroke="${color}" stroke-width="1.5"/>

  <rect x="60" y="278" width="${w - 120}" height="28" fill="${color}" opacity="0.08"/>
  <text x="75" y="297" fill="${color}" font-family="${fontFamily}" font-size="10" font-weight="bold">COURSE</text>
  <text x="160" y="297" fill="${color}" font-family="${fontFamily}" font-size="10" font-weight="bold">TITLE</text>
  <text x="${w - 75}" y="297" fill="${color}" font-family="${fontFamily}" font-size="10" font-weight="bold" text-anchor="end">CREDITS</text>
  <line x1="60" y1="310" x2="${w - 60}" y2="310" stroke="#d1d5db" stroke-width="0.5"/>

  ${rows}

  <line x1="60" y1="${y}" x2="${w - 60}" y2="${y}" stroke="#333" stroke-width="1"/>
  <text x="75" y="${y + 22}" fill="#111" font-family="${fontFamily}" font-size="12" font-weight="bold">Total Enrolled Credits: ${totalCredits}</text>
  <text x="${w - 75}" y="${y + 22}" fill="${color}" font-family="${fontFamily}" font-size="12" font-weight="bold" text-anchor="end">Full-Time Status Confirmed</text>

  <rect x="60" y="${y + 50}" width="${w - 120}" height="45" rx="4" fill="#f0fdf4" stroke="#bbf7d0" stroke-width="1"/>
  <text x="80" y="${y + 72}" fill="#166534" font-family="${fontFamily}" font-size="10" font-weight="bold">REGISTRATION CONFIRMED</text>
  <text x="80" y="${y + 87}" fill="#166534" font-family="${fontFamily}" font-size="9">All courses have been confirmed for ${semester} ${year}. Contact your advisor for schedule changes.</text>

  <line x1="60" y1="${y + 120}" x2="${w - 60}" y2="${y + 120}" stroke="#ddd" stroke-width="0.5"/>
  <text x="${w / 2}" y="${y + 140}" fill="#999" font-family="${fontFamily}" font-size="8" text-anchor="middle">Generated by ${data.collegeName} Student Portal | ${new Date().toLocaleDateString("en-US")}</text>
  <rect x="0" y="${h - 6}" width="${w}" height="6" fill="${color}"/>
</svg>`;
}

function layoutFinancialAidLetter(data: CardData, color: string, photo: string | null): string {
  const w = 850, h = 1100;
  const fontFamily = "'Times New Roman', Times, serif";
  const h1 = hashName(data.name + data.studentId);
  const academicYear = getAcademicYear();
  const pellGrant = 3000 + (h1 % 3500);
  const instGrant = 5000 + (h1 % 8000);
  const workstudy = 2000 + (h1 % 1500);
  const loan = 3500 + (h1 % 2000);
  const totalAid = pellGrant + instGrant + workstudy + loan;
  const dateStr = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const refNum = `FA-${data.studentId.replace(/\D/g, "").substring(0, 6)}-${new Date().getFullYear()}`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="#ffffff"/>
  <rect x="0" y="0" width="${w}" height="8" fill="${color}"/>

  <rect x="60" y="35" width="6" height="55" fill="${color}"/>
  <text x="80" y="60" fill="${color}" font-family="${fontFamily}" font-size="22" font-weight="bold">${data.collegeName}</text>
  <text x="80" y="82" fill="#666" font-family="Arial, sans-serif" font-size="11" letter-spacing="1.5">OFFICE OF FINANCIAL AID</text>

  <line x1="60" y1="105" x2="${w - 60}" y2="105" stroke="${color}" stroke-width="1.5"/>

  <text x="60" y="145" fill="#333" font-family="${fontFamily}" font-size="18" font-weight="bold">FINANCIAL AID AWARD LETTER</text>
  <text x="${w - 60}" y="145" fill="#888" font-family="Arial, sans-serif" font-size="10" text-anchor="end">Ref: ${refNum}</text>
  <text x="60" y="170" fill="#555" font-family="${fontFamily}" font-size="13">${dateStr}</text>
  <text x="60" y="195" fill="#333" font-family="${fontFamily}" font-size="13">Academic Year: ${academicYear}</text>

  <text x="60" y="235" fill="#333" font-family="${fontFamily}" font-size="13">Dear <tspan font-weight="bold">${data.name}</tspan>,</text>
  <text x="60" y="265" fill="#333" font-family="${fontFamily}" font-size="13">We are pleased to inform you of your financial aid award for the ${academicYear}</text>
  <text x="60" y="285" fill="#333" font-family="${fontFamily}" font-size="13">academic year. Your award is based on demonstrated financial need and academic merit.</text>

  <text x="60" y="325" fill="#333" font-family="${fontFamily}" font-size="13">Student ID: ${data.studentId}  |  Program: ${data.department}</text>

  <text x="60" y="365" fill="${color}" font-family="Arial, sans-serif" font-size="13" font-weight="bold">YOUR FINANCIAL AID AWARD</text>
  <line x1="60" y1="375" x2="${w - 60}" y2="375" stroke="#d1d5db" stroke-width="1"/>

  <rect x="60" y="385" width="${w - 120}" height="26" fill="${color}" opacity="0.06"/>
  <text x="80" y="403" fill="#555" font-family="Arial, sans-serif" font-size="10" font-weight="bold">TYPE</text>
  <text x="400" y="403" fill="#555" font-family="Arial, sans-serif" font-size="10" font-weight="bold">SOURCE</text>
  <text x="${w - 80}" y="403" fill="#555" font-family="Arial, sans-serif" font-size="10" font-weight="bold" text-anchor="end">AMOUNT</text>

  <text x="80" y="432" fill="#333" font-family="${fontFamily}" font-size="12">Federal Pell Grant</text>
  <text x="400" y="432" fill="#666" font-family="${fontFamily}" font-size="12">Federal</text>
  <text x="${w - 80}" y="432" fill="#166534" font-family="${fontFamily}" font-size="12" font-weight="bold" text-anchor="end">$${pellGrant.toLocaleString()}.00</text>

  <line x1="80" y1="442" x2="${w - 80}" y2="442" stroke="#f0f0f0" stroke-width="0.5"/>
  <text x="80" y="462" fill="#333" font-family="${fontFamily}" font-size="12">Institutional Merit Grant</text>
  <text x="400" y="462" fill="#666" font-family="${fontFamily}" font-size="12">Institutional</text>
  <text x="${w - 80}" y="462" fill="#166534" font-family="${fontFamily}" font-size="12" font-weight="bold" text-anchor="end">$${instGrant.toLocaleString()}.00</text>

  <line x1="80" y1="472" x2="${w - 80}" y2="472" stroke="#f0f0f0" stroke-width="0.5"/>
  <text x="80" y="492" fill="#333" font-family="${fontFamily}" font-size="12">Federal Work-Study</text>
  <text x="400" y="492" fill="#666" font-family="${fontFamily}" font-size="12">Federal</text>
  <text x="${w - 80}" y="492" fill="#166534" font-family="${fontFamily}" font-size="12" font-weight="bold" text-anchor="end">$${workstudy.toLocaleString()}.00</text>

  <line x1="80" y1="502" x2="${w - 80}" y2="502" stroke="#f0f0f0" stroke-width="0.5"/>
  <text x="80" y="522" fill="#333" font-family="${fontFamily}" font-size="12">Federal Direct Subsidized Loan</text>
  <text x="400" y="522" fill="#666" font-family="${fontFamily}" font-size="12">Federal (Loan)</text>
  <text x="${w - 80}" y="522" fill="#b45309" font-family="${fontFamily}" font-size="12" font-weight="bold" text-anchor="end">$${loan.toLocaleString()}.00</text>

  <line x1="60" y1="540" x2="${w - 60}" y2="540" stroke="#333" stroke-width="1"/>
  <text x="80" y="565" fill="#111" font-family="Arial, sans-serif" font-size="14" font-weight="bold">Total Award Package</text>
  <text x="${w - 80}" y="565" fill="${color}" font-family="Arial, sans-serif" font-size="14" font-weight="bold" text-anchor="end">$${totalAid.toLocaleString()}.00</text>

  <text x="60" y="605" fill="#333" font-family="${fontFamily}" font-size="13">To accept this award, please log into the Student Financial Portal by</text>
  <text x="60" y="625" fill="#333" font-family="${fontFamily}" font-size="13">${new Date(Date.now() + 30 * 86400000).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}.</text>

  <text x="60" y="675" fill="#333" font-family="${fontFamily}" font-size="13">Sincerely,</text>
  <text x="60" y="715" fill="${color}" font-family="'Brush Script MT', cursive" font-size="20">James R. Cooper</text>
  <text x="60" y="735" fill="#333" font-family="${fontFamily}" font-size="12">James R. Cooper</text>
  <text x="60" y="752" fill="#555" font-family="${fontFamily}" font-size="11">Director of Financial Aid</text>

  <line x1="60" y1="785" x2="${w - 60}" y2="785" stroke="#ddd" stroke-width="0.5"/>
  <text x="${w / 2}" y="805" fill="#999" font-family="Arial, sans-serif" font-size="8" text-anchor="middle">This award is contingent upon continued enrollment and satisfactory academic progress. | Ref: ${refNum}</text>
  <rect x="0" y="${h - 8}" width="${w}" height="8" fill="${color}"/>
</svg>`;
}

function layoutRegistrarLetter(data: CardData, color: string, photo: string | null): string {
  const w = 850, h = 1100;
  const fontFamily = "'Times New Roman', Times, serif";
  const dateStr = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const academicYear = getAcademicYear();
  const semester = new Date().getMonth() >= 7 ? "Fall" : "Spring";
  const refNum = `REG-${data.studentId.replace(/\D/g, "").substring(0, 6)}-${new Date().getFullYear()}`;
  const h1 = hashName(data.name);
  const credits = 12 + (h1 % 7);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="#ffffff"/>
  <rect x="0" y="0" width="${w}" height="6" fill="${color}"/>
  <rect x="0" y="6" width="${w}" height="2" fill="${color}" opacity="0.3"/>

  <text x="${w / 2}" y="55" fill="${color}" font-family="${fontFamily}" font-size="24" font-weight="bold" text-anchor="middle">${data.collegeName}</text>
  <text x="${w / 2}" y="78" fill="#666" font-family="Arial, sans-serif" font-size="11" letter-spacing="2" text-anchor="middle">OFFICE OF THE REGISTRAR</text>
  <text x="${w / 2}" y="95" fill="#999" font-family="Arial, sans-serif" font-size="9" text-anchor="middle">123 University Avenue | Academic Building, Room 100 | Phone: (555) 234-5678</text>

  <line x1="60" y1="115" x2="${w - 60}" y2="115" stroke="${color}" stroke-width="1"/>

  <text x="60" y="155" fill="#333" font-family="${fontFamily}" font-size="13">${dateStr}</text>
  <text x="${w - 60}" y="155" fill="#888" font-family="Arial, sans-serif" font-size="9" text-anchor="end">Reference: ${refNum}</text>

  <text x="60" y="200" fill="#333" font-family="${fontFamily}" font-size="13">To Whom It May Concern,</text>

  <text x="60" y="240" fill="#333" font-family="${fontFamily}" font-size="13">This letter is to certify that <tspan font-weight="bold">${data.name}</tspan> (Student ID: ${data.studentId})</text>
  <text x="60" y="260" fill="#333" font-family="${fontFamily}" font-size="13">is a registered student at ${data.collegeName} for the ${semester}</text>
  <text x="60" y="280" fill="#333" font-family="${fontFamily}" font-size="13">Semester of the ${academicYear} academic year.</text>

  <rect x="80" y="310" width="${w - 160}" height="130" rx="4" fill="#f8f9fa" stroke="#e5e7eb" stroke-width="1"/>
  <text x="100" y="338" fill="#6b7280" font-family="Arial, sans-serif" font-size="10" font-weight="bold">STUDENT INFORMATION</text>
  <text x="100" y="362" fill="#333" font-family="${fontFamily}" font-size="12">Full Name: <tspan font-weight="bold">${data.name}</tspan></text>
  <text x="100" y="382" fill="#333" font-family="${fontFamily}" font-size="12">Student ID: ${data.studentId}</text>
  <text x="100" y="402" fill="#333" font-family="${fontFamily}" font-size="12">Program: ${data.department}</text>
  <text x="100" y="422" fill="#333" font-family="${fontFamily}" font-size="12">Enrolled Credits: ${credits}  |  Status: Full-Time  |  Standing: Good</text>

  <text x="60" y="475" fill="#333" font-family="${fontFamily}" font-size="13">The above-named student is enrolled on a full-time basis and is in good</text>
  <text x="60" y="495" fill="#333" font-family="${fontFamily}" font-size="13">academic standing. The student's expected date of graduation is ${formatDate(data.validUntil)}.</text>

  <text x="60" y="535" fill="#333" font-family="${fontFamily}" font-size="13">This letter has been issued at the student's request for verification purposes.</text>
  <text x="60" y="555" fill="#333" font-family="${fontFamily}" font-size="13">For any questions regarding the authenticity of this document, please contact</text>
  <text x="60" y="575" fill="#333" font-family="${fontFamily}" font-size="13">our office at (555) 234-5678 or registrar@${data.collegeName.toLowerCase().replace(/\s+/g, "")}.edu.</text>

  <text x="60" y="630" fill="#333" font-family="${fontFamily}" font-size="13">Respectfully,</text>
  <text x="60" y="675" fill="${color}" font-family="'Brush Script MT', cursive" font-size="22">Patricia A. Reynolds</text>
  <text x="60" y="698" fill="#333" font-family="${fontFamily}" font-size="13">Patricia A. Reynolds, M.Ed.</text>
  <text x="60" y="716" fill="#555" font-family="${fontFamily}" font-size="12">University Registrar</text>

  <circle cx="${w - 140}" cy="680" r="40" fill="none" stroke="${color}" stroke-width="1.5" opacity="0.2"/>
  <text x="${w - 140}" y="676" fill="${color}" font-family="Arial, sans-serif" font-size="7" text-anchor="middle" opacity="0.3">OFFICIAL</text>
  <text x="${w - 140}" y="688" fill="${color}" font-family="Arial, sans-serif" font-size="7" text-anchor="middle" opacity="0.3">REGISTRAR</text>

  <line x1="60" y1="760" x2="${w - 60}" y2="760" stroke="#ddd" stroke-width="0.5"/>
  <text x="${w / 2}" y="780" fill="#999" font-family="Arial, sans-serif" font-size="8" text-anchor="middle">This document is electronically generated. Reference: ${refNum} | ${dateStr}</text>
  <rect x="0" y="${h - 6}" width="${w}" height="6" fill="${color}"/>
</svg>`;
}

function layoutDeanLetter(data: CardData, color: string, photo: string | null): string {
  const w = 850, h = 1100;
  const fontFamily = "'Georgia', 'Times New Roman', serif";
  const dateStr = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const academicYear = getAcademicYear();
  const semester = new Date().getMonth() >= 7 ? "Fall" : "Spring";
  const h1 = hashName(data.name);
  const deanNames = ["Dr. Robert J. Harrison", "Dr. Linda M. Foster", "Dr. Michael T. Owens", "Dr. Catherine S. Park"];
  const dean = deanNames[h1 % deanNames.length];

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="#fffdf7"/>
  <rect x="0" y="0" width="${w}" height="10" fill="${color}"/>

  <text x="${w / 2}" y="60" fill="${color}" font-family="${fontFamily}" font-size="26" font-weight="bold" text-anchor="middle">${data.collegeName}</text>
  <line x1="200" y1="75" x2="${w - 200}" y2="75" stroke="${color}" stroke-width="0.5" opacity="0.4"/>
  <text x="${w / 2}" y="98" fill="#666" font-family="${fontFamily}" font-size="13" text-anchor="middle">Office of the Dean  |  College of ${data.department}</text>

  <line x1="60" y1="120" x2="${w - 60}" y2="120" stroke="${color}" stroke-width="1.5"/>

  <text x="60" y="165" fill="#333" font-family="${fontFamily}" font-size="13">${dateStr}</text>

  <text x="60" y="210" fill="#333" font-family="${fontFamily}" font-size="13">Re: Confirmation of Student Status</text>
  <text x="60" y="230" fill="#333" font-family="${fontFamily}" font-size="13">Student: ${data.name} (ID: ${data.studentId})</text>

  <text x="60" y="275" fill="#333" font-family="${fontFamily}" font-size="13">To Whom It May Concern,</text>

  <text x="60" y="315" fill="#333" font-family="${fontFamily}" font-size="13">I am writing to confirm that <tspan font-weight="bold">${data.name}</tspan> is an active student in the</text>
  <text x="60" y="340" fill="#333" font-family="${fontFamily}" font-size="13">College of ${data.department} at ${data.collegeName}. The student is</text>
  <text x="60" y="365" fill="#333" font-family="${fontFamily}" font-size="13">currently enrolled for the ${semester} semester of the ${academicYear} academic year.</text>

  <text x="60" y="410" fill="#333" font-family="${fontFamily}" font-size="13">As Dean of the College of ${data.department}, I can attest that ${data.name.split(" ")[0]}</text>
  <text x="60" y="435" fill="#333" font-family="${fontFamily}" font-size="13">maintains good academic standing and has demonstrated consistent progress</text>
  <text x="60" y="460" fill="#333" font-family="${fontFamily}" font-size="13">in their program of study. The student is pursuing a degree in ${data.department}</text>
  <text x="60" y="485" fill="#333" font-family="${fontFamily}" font-size="13">and is expected to complete degree requirements by ${formatDate(data.validUntil)}.</text>

  <text x="60" y="530" fill="#333" font-family="${fontFamily}" font-size="13">The student has been an engaged member of our academic community and has</text>
  <text x="60" y="555" fill="#333" font-family="${fontFamily}" font-size="13">contributed positively to the College through their academic work and</text>
  <text x="60" y="580" fill="#333" font-family="${fontFamily}" font-size="13">participation in departmental activities.</text>

  <text x="60" y="625" fill="#333" font-family="${fontFamily}" font-size="13">Should you need further verification of this student's status, please feel</text>
  <text x="60" y="650" fill="#333" font-family="${fontFamily}" font-size="13">free to contact my office directly at (555) 345-6789.</text>

  <text x="60" y="700" fill="#333" font-family="${fontFamily}" font-size="13">Warm regards,</text>
  <text x="60" y="745" fill="${color}" font-family="'Brush Script MT', cursive" font-size="24">${dean.replace("Dr. ", "")}</text>
  <text x="60" y="770" fill="#333" font-family="${fontFamily}" font-size="13">${dean}</text>
  <text x="60" y="790" fill="#555" font-family="${fontFamily}" font-size="12">Dean, College of ${data.department}</text>
  <text x="60" y="808" fill="#555" font-family="${fontFamily}" font-size="12">${data.collegeName}</text>

  <line x1="60" y1="840" x2="${w - 60}" y2="840" stroke="#ddd" stroke-width="0.5"/>
  <text x="${w / 2}" y="860" fill="#999" font-family="Arial, sans-serif" font-size="8" text-anchor="middle">${data.collegeName} | College of ${data.department} | Dean's Office | (555) 345-6789</text>
  <rect x="0" y="${h - 10}" width="${w}" height="10" fill="${color}"/>
</svg>`;
}

function layoutTuitionReceipt(data: CardData, color: string, photo: string | null): string {
  const w = 850, h = 1100;
  const fontFamily = "Arial, Helvetica, sans-serif";
  const h1 = hashName(data.name + data.studentId);
  const semester = new Date().getMonth() >= 7 ? "Fall" : "Spring";
  const year = new Date().getFullYear();
  const tuition = 12500 + (h1 % 8000);
  const fees = 1850 + (h1 % 500);
  const techFee = 350;
  const total = tuition + fees + techFee;
  const receiptNum = `RCP-${(h1 % 900000 + 100000)}`;
  const payDate = new Date();
  payDate.setDate(payDate.getDate() - (h1 % 20));
  const payMethod = ["Visa ending in 4521", "MasterCard ending in 8903", "ACH Transfer", "E-Check"][h1 % 4];

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="#ffffff"/>
  <rect x="0" y="0" width="${w}" height="80" fill="${color}"/>
  <text x="60" y="35" fill="white" font-family="${fontFamily}" font-size="20" font-weight="bold">${data.collegeName}</text>
  <text x="60" y="58" fill="rgba(255,255,255,0.8)" font-family="${fontFamily}" font-size="11" letter-spacing="1.5">BURSAR'S OFFICE - PAYMENT RECEIPT</text>
  <text x="${w - 60}" y="35" fill="rgba(255,255,255,0.9)" font-family="${fontFamily}" font-size="12" text-anchor="end" font-weight="bold">RECEIPT #${receiptNum}</text>
  <text x="${w - 60}" y="55" fill="rgba(255,255,255,0.7)" font-family="${fontFamily}" font-size="10" text-anchor="end">${payDate.toLocaleDateString("en-US")}</text>

  <rect x="520" y="100" width="${w - 580}" height="80" rx="6" fill="#f0fdf4" stroke="#86efac" stroke-width="1.5"/>
  <text x="540" y="125" fill="#166534" font-family="${fontFamily}" font-size="10" font-weight="bold" letter-spacing="1">PAYMENT STATUS</text>
  <text x="540" y="155" fill="#166534" font-family="${fontFamily}" font-size="24" font-weight="bold">PAID IN FULL</text>

  <rect x="60" y="100" width="420" height="80" rx="4" fill="#f8f9fa" stroke="#e5e7eb" stroke-width="1"/>
  <text x="80" y="122" fill="#6b7280" font-family="${fontFamily}" font-size="9" letter-spacing="1">STUDENT</text>
  <text x="80" y="142" fill="#111" font-family="${fontFamily}" font-size="15" font-weight="bold">${data.name}</text>
  <text x="80" y="165" fill="#555" font-family="${fontFamily}" font-size="11">ID: ${data.studentId}  |  ${data.department}  |  ${semester} ${year}</text>

  <text x="60" y="220" fill="${color}" font-family="${fontFamily}" font-size="13" font-weight="bold">PAYMENT DETAILS</text>
  <line x1="60" y1="230" x2="${w - 60}" y2="230" stroke="#d1d5db" stroke-width="1"/>

  <rect x="60" y="240" width="${w - 120}" height="25" fill="${color}" opacity="0.06"/>
  <text x="80" y="258" fill="#555" font-family="${fontFamily}" font-size="10" font-weight="bold">ITEM</text>
  <text x="${w - 80}" y="258" fill="#555" font-family="${fontFamily}" font-size="10" font-weight="bold" text-anchor="end">AMOUNT</text>

  <text x="80" y="288" fill="#333" font-family="${fontFamily}" font-size="12">Tuition - ${semester} ${year}</text>
  <text x="${w - 80}" y="288" fill="#333" font-family="${fontFamily}" font-size="12" text-anchor="end">$${tuition.toLocaleString()}.00</text>
  <line x1="80" y1="298" x2="${w - 80}" y2="298" stroke="#f0f0f0" stroke-width="0.5"/>

  <text x="80" y="318" fill="#333" font-family="${fontFamily}" font-size="12">Student Fees</text>
  <text x="${w - 80}" y="318" fill="#333" font-family="${fontFamily}" font-size="12" text-anchor="end">$${fees.toLocaleString()}.00</text>
  <line x1="80" y1="328" x2="${w - 80}" y2="328" stroke="#f0f0f0" stroke-width="0.5"/>

  <text x="80" y="348" fill="#333" font-family="${fontFamily}" font-size="12">Technology Fee</text>
  <text x="${w - 80}" y="348" fill="#333" font-family="${fontFamily}" font-size="12" text-anchor="end">$${techFee}.00</text>

  <line x1="60" y1="368" x2="${w - 60}" y2="368" stroke="#333" stroke-width="1.5"/>
  <text x="80" y="393" fill="#111" font-family="${fontFamily}" font-size="14" font-weight="bold">Total Paid</text>
  <text x="${w - 80}" y="393" fill="${color}" font-family="${fontFamily}" font-size="14" font-weight="bold" text-anchor="end">$${total.toLocaleString()}.00</text>

  <rect x="60" y="415" width="${w - 120}" height="60" rx="4" fill="#f8f9fa" stroke="#e5e7eb" stroke-width="1"/>
  <text x="80" y="438" fill="#6b7280" font-family="${fontFamily}" font-size="9" letter-spacing="1">PAYMENT METHOD</text>
  <text x="80" y="458" fill="#333" font-family="${fontFamily}" font-size="12">${payMethod}</text>
  <text x="400" y="438" fill="#6b7280" font-family="${fontFamily}" font-size="9" letter-spacing="1">TRANSACTION DATE</text>
  <text x="400" y="458" fill="#333" font-family="${fontFamily}" font-size="12">${payDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</text>

  <g transform="translate(${Math.floor((w - 100) / 2)}, 510)">
    ${generateBarcode(data.studentId)}
  </g>
  <text x="${w / 2}" y="560" fill="#888" font-family="'Courier New', monospace" font-size="9" text-anchor="middle">${receiptNum}</text>

  <line x1="60" y1="590" x2="${w - 60}" y2="590" stroke="#ddd" stroke-width="0.5"/>
  <text x="${w / 2}" y="610" fill="#999" font-family="${fontFamily}" font-size="8" text-anchor="middle">This receipt confirms payment received by ${data.collegeName} Bursar's Office.</text>
  <text x="${w / 2}" y="625" fill="#999" font-family="${fontFamily}" font-size="8" text-anchor="middle">Retain for your records. Receipt: ${receiptNum} | ${payDate.toLocaleDateString("en-US")}</text>
  <rect x="0" y="${h - 6}" width="${w}" height="6" fill="${color}"/>
</svg>`;
}

function layoutCourseRegistration(data: CardData, color: string, photo: string | null): string {
  const w = 850, h = 1100;
  const fontFamily = "Arial, Helvetica, sans-serif";
  const h1 = hashName(data.name);
  const semester = new Date().getMonth() >= 7 ? "Fall" : "Spring";
  const year = new Date().getFullYear();
  const confNum = `CR-${year}-${(h1 % 90000 + 10000)}`;
  const dept = data.department.substring(0, 3).toUpperCase();
  const courses = [
    { code: `${dept} 301`, name: `Advanced ${data.department}`, section: "001", credits: 3, status: "Enrolled" },
    { code: `${dept} 315`, name: `${data.department} Seminar`, section: "002", credits: 3, status: "Enrolled" },
    { code: "STAT 200", name: "Statistics for Sciences", section: "004", credits: 4, status: "Enrolled" },
    { code: "PHIL 210", name: "Ethics in Modern Society", section: "001", credits: 3, status: "Enrolled" },
    { code: `${dept} 340`, name: `${data.department} Research Methods`, section: "001", credits: 3, status: "Waitlisted" },
  ];
  const enrolled = courses.filter(c => c.status === "Enrolled");
  const totalCredits = enrolled.reduce((s, c) => s + c.credits, 0);

  let rows = "";
  let y = 370;
  courses.forEach((c, i) => {
    const bg = i % 2 === 0 ? "#f9fafb" : "#ffffff";
    const statusColor = c.status === "Enrolled" ? "#166534" : "#b45309";
    const statusBg = c.status === "Enrolled" ? "#dcfce7" : "#fef3c7";
    rows += `<rect x="60" y="${y - 14}" width="${w - 120}" height="30" fill="${bg}"/>`;
    rows += `<text x="75" y="${y}" fill="${color}" font-family="${fontFamily}" font-size="11" font-weight="bold">${c.code}-${c.section}</text>`;
    rows += `<text x="200" y="${y}" fill="#111" font-family="${fontFamily}" font-size="11">${c.name}</text>`;
    rows += `<text x="530" y="${y}" fill="#333" font-family="${fontFamily}" font-size="11" text-anchor="middle">${c.credits}</text>`;
    rows += `<rect x="590" y="${y - 12}" width="65" height="18" rx="3" fill="${statusBg}"/>`;
    rows += `<text x="622" y="${y}" fill="${statusColor}" font-family="${fontFamily}" font-size="9" font-weight="600" text-anchor="middle">${c.status.toUpperCase()}</text>`;
    y += 30;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="#ffffff"/>
  <rect x="0" y="0" width="${w}" height="6" fill="${color}"/>

  <text x="60" y="50" fill="${color}" font-family="${fontFamily}" font-size="20" font-weight="bold">${data.collegeName}</text>
  <text x="60" y="72" fill="#666" font-family="${fontFamily}" font-size="11" letter-spacing="1.5">COURSE REGISTRATION CONFIRMATION</text>

  <rect x="${w - 260}" y="30" width="200" height="50" rx="4" fill="${color}" opacity="0.06" stroke="${color}" stroke-width="1" stroke-opacity="0.15"/>
  <text x="${w - 160}" y="52" fill="#6b7280" font-family="${fontFamily}" font-size="8" text-anchor="middle" letter-spacing="1">CONFIRMATION NUMBER</text>
  <text x="${w - 160}" y="72" fill="${color}" font-family="${fontFamily}" font-size="14" font-weight="bold" text-anchor="middle">${confNum}</text>

  <line x1="60" y1="95" x2="${w - 60}" y2="95" stroke="${color}" stroke-width="1.5"/>

  <rect x="60" y="115" width="${w - 120}" height="85" rx="4" fill="#f8f9fa" stroke="#e5e7eb" stroke-width="1"/>
  <text x="80" y="138" fill="#6b7280" font-family="${fontFamily}" font-size="9" letter-spacing="1">STUDENT NAME</text>
  <text x="80" y="158" fill="#111" font-family="${fontFamily}" font-size="15" font-weight="bold">${data.name}</text>
  <text x="80" y="185" fill="#555" font-family="${fontFamily}" font-size="11">ID: ${data.studentId}  |  ${data.department}  |  ${semester} ${year}</text>

  <text x="450" y="138" fill="#6b7280" font-family="${fontFamily}" font-size="9" letter-spacing="1">REGISTRATION DATE</text>
  <text x="450" y="158" fill="#333" font-family="${fontFamily}" font-size="13">${new Date().toLocaleDateString("en-US")}</text>
  <text x="450" y="185" fill="#6b7280" font-family="${fontFamily}" font-size="9">Credits Enrolled: <tspan fill="#333" font-size="12" font-weight="bold">${totalCredits}</tspan></text>

  <text x="60" y="240" fill="${color}" font-family="${fontFamily}" font-size="13" font-weight="bold">REGISTERED COURSES - ${semester.toUpperCase()} ${year}</text>
  <line x1="60" y1="250" x2="${w - 60}" y2="250" stroke="#d1d5db" stroke-width="1"/>

  <rect x="60" y="265" width="${w - 120}" height="28" fill="${color}" opacity="0.06"/>
  <text x="75" y="284" fill="${color}" font-family="${fontFamily}" font-size="10" font-weight="bold">COURSE</text>
  <text x="200" y="284" fill="${color}" font-family="${fontFamily}" font-size="10" font-weight="bold">TITLE</text>
  <text x="530" y="284" fill="${color}" font-family="${fontFamily}" font-size="10" font-weight="bold" text-anchor="middle">CREDITS</text>
  <text x="622" y="284" fill="${color}" font-family="${fontFamily}" font-size="10" font-weight="bold" text-anchor="middle">STATUS</text>
  <line x1="60" y1="296" x2="${w - 60}" y2="296" stroke="#d1d5db" stroke-width="0.5"/>

  ${rows}

  <line x1="60" y1="${y + 5}" x2="${w - 60}" y2="${y + 5}" stroke="#333" stroke-width="1"/>
  <text x="75" y="${y + 28}" fill="#111" font-family="${fontFamily}" font-size="12" font-weight="bold">Total Credits: ${totalCredits}</text>

  <rect x="60" y="${y + 50}" width="${w - 120}" height="45" rx="4" fill="#f0fdf4" stroke="#bbf7d0" stroke-width="1"/>
  <text x="80" y="${y + 72}" fill="#166534" font-family="${fontFamily}" font-size="10" font-weight="bold">REGISTRATION COMPLETE</text>
  <text x="80" y="${y + 88}" fill="#166534" font-family="${fontFamily}" font-size="9">Your course registration for ${semester} ${year} has been confirmed. Retain this confirmation for your records.</text>

  <g transform="translate(${Math.floor((w - 100) / 2)}, ${y + 115})">
    ${generateBarcode(data.studentId)}
  </g>
  <text x="${w / 2}" y="${y + 165}" fill="#888" font-family="'Courier New', monospace" font-size="9" text-anchor="middle">${confNum}</text>

  <line x1="60" y1="${y + 190}" x2="${w - 60}" y2="${y + 190}" stroke="#ddd" stroke-width="0.5"/>
  <text x="${w / 2}" y="${y + 210}" fill="#999" font-family="${fontFamily}" font-size="8" text-anchor="middle">Generated by ${data.collegeName} Registration System | ${new Date().toLocaleDateString("en-US")}</text>
  <rect x="0" y="${h - 6}" width="${w}" height="6" fill="${color}"/>
</svg>`;
}

function layoutScholarshipLetter(data: CardData, color: string, photo: string | null): string {
  const w = 850, h = 1100;
  const fontFamily = "'Times New Roman', Times, serif";
  const h1 = hashName(data.name + data.studentId);
  const scholarshipNames = ["Academic Excellence Award", "Dean's Merit Scholarship", "Presidential Scholar Award", "Distinguished Student Grant"];
  const scholarship = scholarshipNames[h1 % scholarshipNames.length];
  const amount = 2500 + (h1 % 7500);
  const dateStr = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const academicYear = getAcademicYear();

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="#fffdf5"/>
  <rect x="0" y="0" width="${w}" height="12" fill="${color}"/>
  <rect x="0" y="12" width="${w}" height="3" fill="${color}" opacity="0.3"/>

  <text x="${w / 2}" y="65" fill="${color}" font-family="${fontFamily}" font-size="26" font-weight="bold" text-anchor="middle">${data.collegeName}</text>
  <text x="${w / 2}" y="90" fill="#888" font-family="Arial, sans-serif" font-size="11" letter-spacing="2" text-anchor="middle">OFFICE OF SCHOLARSHIPS AND FINANCIAL AWARDS</text>

  <line x1="100" y1="110" x2="${w - 100}" y2="110" stroke="${color}" stroke-width="1"/>

  <text x="${w / 2}" y="155" fill="${color}" font-family="${fontFamily}" font-size="20" font-weight="bold" text-anchor="middle">SCHOLARSHIP AWARD NOTIFICATION</text>
  <rect x="${w / 2 - 100}" y="165" width="200" height="2" fill="${color}" opacity="0.3"/>

  <text x="80" y="210" fill="#333" font-family="${fontFamily}" font-size="13">${dateStr}</text>

  <text x="80" y="250" fill="#333" font-family="${fontFamily}" font-size="13">Dear ${data.name},</text>

  <text x="80" y="290" fill="#333" font-family="${fontFamily}" font-size="13">On behalf of ${data.collegeName}, it is my great pleasure to inform you</text>
  <text x="80" y="310" fill="#333" font-family="${fontFamily}" font-size="13">that you have been selected to receive the following scholarship for the</text>
  <text x="80" y="330" fill="#333" font-family="${fontFamily}" font-size="13">${academicYear} academic year:</text>

  <rect x="100" y="360" width="${w - 200}" height="80" rx="6" fill="${color}" opacity="0.05" stroke="${color}" stroke-width="1.5" stroke-opacity="0.2"/>
  <text x="${w / 2}" y="390" fill="${color}" font-family="${fontFamily}" font-size="18" font-weight="bold" text-anchor="middle">${scholarship}</text>
  <text x="${w / 2}" y="420" fill="${color}" font-family="Arial, sans-serif" font-size="22" font-weight="bold" text-anchor="middle">$${amount.toLocaleString()}.00</text>

  <text x="80" y="480" fill="#333" font-family="${fontFamily}" font-size="13">Student ID: ${data.studentId}</text>
  <text x="80" y="500" fill="#333" font-family="${fontFamily}" font-size="13">Program: ${data.department}</text>

  <text x="80" y="540" fill="#333" font-family="${fontFamily}" font-size="13">This award recognizes your outstanding academic achievement and dedication to your</text>
  <text x="80" y="560" fill="#333" font-family="${fontFamily}" font-size="13">field of study. The scholarship will be applied directly to your student account</text>
  <text x="80" y="580" fill="#333" font-family="${fontFamily}" font-size="13">for the ${academicYear} academic year ($${Math.floor(amount / 2).toLocaleString()}.00 per semester).</text>

  <text x="80" y="620" fill="#333" font-family="${fontFamily}" font-size="13">To maintain this scholarship, you must remain enrolled full-time and maintain</text>
  <text x="80" y="640" fill="#333" font-family="${fontFamily}" font-size="13">a minimum GPA of 3.0. Congratulations on this well-deserved recognition!</text>

  <text x="80" y="690" fill="#333" font-family="${fontFamily}" font-size="13">With warm regards,</text>
  <text x="80" y="735" fill="${color}" font-family="'Brush Script MT', cursive" font-size="22">Margaret E. Thornton</text>
  <text x="80" y="758" fill="#333" font-family="${fontFamily}" font-size="13">Margaret E. Thornton, Ph.D.</text>
  <text x="80" y="776" fill="#555" font-family="${fontFamily}" font-size="12">Director of Scholarships</text>

  <line x1="80" y1="810" x2="${w - 80}" y2="810" stroke="#ddd" stroke-width="0.5"/>
  <text x="${w / 2}" y="830" fill="#999" font-family="Arial, sans-serif" font-size="8" text-anchor="middle">This official award notification is issued by ${data.collegeName} Office of Scholarships.</text>
  <rect x="0" y="${h - 12}" width="${w}" height="12" fill="${color}"/>
</svg>`;
}

function layoutDormAssignment(data: CardData, color: string, photo: string | null): string {
  const w = 850, h = 1100;
  const fontFamily = "Arial, Helvetica, sans-serif";
  const h1 = hashName(data.name + data.studentId);
  const halls = ["Heritage Hall", "Oak Ridge Residence", "Lakeside Commons", "Summit Tower", "Elm Court"];
  const hall = halls[h1 % halls.length];
  const floor = (h1 % 4) + 2;
  const room = `${floor}${(h1 % 30 + 10)}`;
  const bedType = h1 % 2 === 0 ? "Single" : "Double";
  const mealPlan = ["Standard", "Premium", "Basic"][h1 % 3];
  const semester = new Date().getMonth() >= 7 ? "Fall" : "Spring";
  const year = new Date().getFullYear();
  const moveIn = new Date(year, new Date().getMonth() >= 7 ? 7 : 0, 20 + (h1 % 5));
  const moveOut = new Date(year + (new Date().getMonth() >= 7 ? 1 : 0), new Date().getMonth() >= 7 ? 4 : 4, 15);
  const roomCost = bedType === "Single" ? 5800 : 4200;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="#ffffff"/>
  <rect x="0" y="0" width="${w}" height="80" fill="${color}"/>
  <text x="60" y="35" fill="white" font-family="${fontFamily}" font-size="20" font-weight="bold">${data.collegeName}</text>
  <text x="60" y="58" fill="rgba(255,255,255,0.8)" font-family="${fontFamily}" font-size="11" letter-spacing="1.5">RESIDENTIAL LIFE &amp; HOUSING</text>
  <text x="${w - 60}" y="35" fill="rgba(255,255,255,0.9)" font-family="${fontFamily}" font-size="14" font-weight="bold" text-anchor="end">HOUSING ASSIGNMENT</text>
  <text x="${w - 60}" y="55" fill="rgba(255,255,255,0.7)" font-family="${fontFamily}" font-size="10" text-anchor="end">${semester} ${year}</text>

  <rect x="60" y="100" width="${w - 120}" height="90" rx="4" fill="#f8f9fa" stroke="#e5e7eb" stroke-width="1"/>
  <text x="80" y="123" fill="#6b7280" font-family="${fontFamily}" font-size="9" letter-spacing="1">RESIDENT</text>
  <text x="80" y="145" fill="#111" font-family="${fontFamily}" font-size="16" font-weight="bold">${data.name}</text>
  <text x="80" y="172" fill="#555" font-family="${fontFamily}" font-size="11">Student ID: ${data.studentId}  |  ${data.department}</text>

  <text x="450" y="123" fill="#6b7280" font-family="${fontFamily}" font-size="9" letter-spacing="1">ASSIGNMENT ID</text>
  <text x="450" y="145" fill="${color}" font-family="${fontFamily}" font-size="14" font-weight="bold">HSG-${(h1 % 90000 + 10000)}</text>

  <text x="60" y="230" fill="${color}" font-family="${fontFamily}" font-size="14" font-weight="bold">ROOM ASSIGNMENT DETAILS</text>
  <line x1="60" y1="240" x2="${w - 60}" y2="240" stroke="${color}" stroke-width="1.5"/>

  <rect x="60" y="260" width="350" height="160" rx="6" fill="${color}" opacity="0.04" stroke="${color}" stroke-width="1" stroke-opacity="0.1"/>
  <text x="80" y="290" fill="#6b7280" font-family="${fontFamily}" font-size="9" letter-spacing="1">RESIDENCE HALL</text>
  <text x="80" y="312" fill="#111" font-family="${fontFamily}" font-size="18" font-weight="bold">${hall}</text>
  <text x="80" y="345" fill="#6b7280" font-family="${fontFamily}" font-size="9" letter-spacing="1">ROOM NUMBER</text>
  <text x="80" y="367" fill="${color}" font-family="${fontFamily}" font-size="24" font-weight="bold">${room}</text>
  <text x="200" y="345" fill="#6b7280" font-family="${fontFamily}" font-size="9" letter-spacing="1">FLOOR</text>
  <text x="200" y="367" fill="#333" font-family="${fontFamily}" font-size="16">${floor}${["th", "st", "nd", "rd"][floor] || "th"}</text>
  <text x="80" y="400" fill="#6b7280" font-family="${fontFamily}" font-size="9" letter-spacing="1">BED TYPE</text>
  <text x="80" y="415" fill="#333" font-family="${fontFamily}" font-size="12">${bedType} Occupancy</text>

  <rect x="440" y="260" width="${w - 500}" height="160" rx="6" fill="#f8f9fa" stroke="#e5e7eb" stroke-width="1"/>
  <text x="460" y="290" fill="#6b7280" font-family="${fontFamily}" font-size="9" letter-spacing="1">MOVE-IN DATE</text>
  <text x="460" y="310" fill="#333" font-family="${fontFamily}" font-size="13" font-weight="600">${moveIn.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</text>
  <text x="460" y="340" fill="#6b7280" font-family="${fontFamily}" font-size="9" letter-spacing="1">MOVE-OUT DATE</text>
  <text x="460" y="360" fill="#333" font-family="${fontFamily}" font-size="13">${moveOut.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</text>
  <text x="460" y="390" fill="#6b7280" font-family="${fontFamily}" font-size="9" letter-spacing="1">SEMESTER COST</text>
  <text x="460" y="410" fill="${color}" font-family="${fontFamily}" font-size="16" font-weight="bold">$${roomCost.toLocaleString()}.00</text>

  <text x="60" y="465" fill="${color}" font-family="${fontFamily}" font-size="13" font-weight="bold">INCLUDED AMENITIES</text>
  <line x1="60" y1="475" x2="${w - 60}" y2="475" stroke="#d1d5db" stroke-width="0.5"/>
  <text x="80" y="498" fill="#333" font-family="${fontFamily}" font-size="11">Furnished room (bed, desk, dresser, chair)  |  Wi-Fi  |  Laundry access  |  Common areas</text>
  <text x="80" y="518" fill="#333" font-family="${fontFamily}" font-size="11">Meal Plan: ${mealPlan}  |  24/7 security  |  Maintenance support</text>

  <rect x="60" y="545" width="${w - 120}" height="40" rx="4" fill="#fefce8" stroke="#fde68a" stroke-width="1"/>
  <text x="80" y="565" fill="#92400e" font-family="${fontFamily}" font-size="10" font-weight="bold">IMPORTANT: Check-in at the ${hall} front desk on your move-in date with valid student ID.</text>
  <text x="80" y="580" fill="#92400e" font-family="${fontFamily}" font-size="9">Contact Housing Office: (555) 456-7890 | housing@${data.collegeName.toLowerCase().replace(/\s+/g, "")}.edu</text>

  <line x1="60" y1="610" x2="${w - 60}" y2="610" stroke="#ddd" stroke-width="0.5"/>
  <text x="${w / 2}" y="630" fill="#999" font-family="${fontFamily}" font-size="8" text-anchor="middle">${data.collegeName} Residential Life &amp; Housing | Assignment for ${semester} ${year}</text>
  <rect x="0" y="${h - 6}" width="${w}" height="6" fill="${color}"/>
</svg>`;
}

function layoutMealPlanCard(data: CardData, color: string, photo: string | null): string {
  const w = 1012, h = 638;
  const fontFamily = "'Segoe UI', Tahoma, sans-serif";
  const h1 = hashName(data.name + data.studentId);
  const plans = ["Unlimited", "15 Meals/Week", "10 Meals/Week", "Block 200"];
  const plan = plans[h1 % plans.length];
  const balance = 500 + (h1 % 1500);
  const valid = formatDate(data.validUntil);
  const academicYear = getAcademicYear();
  const barcodeDigits = data.studentId.replace(/\D/g, "").substring(0, 12);
  const barcodeWidth = barcodeDigits.length * 8 + 14;
  const cardNum = `DIN-${data.studentId.replace(/\D/g, "").substring(0, 8)}`;

  const photoSection = photo
    ? `<defs><clipPath id="photoClip"><circle cx="130" cy="260" r="65"/></clipPath></defs>
       <circle cx="130" cy="260" r="68" fill="white" stroke="rgba(255,255,255,0.3)" stroke-width="2"/>
       <image href="${photo}" x="65" y="195" width="130" height="130" clip-path="url(#photoClip)" preserveAspectRatio="xMidYMid slice"/>`
    : `<circle cx="130" cy="260" r="68" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.2)" stroke-width="2"/>
       <text x="130" y="266" fill="rgba(255,255,255,0.4)" font-family="${fontFamily}" font-size="10" text-anchor="middle">PHOTO</text>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="mealGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${color};stop-opacity:1"/>
      <stop offset="100%" style="stop-color:${color};stop-opacity:0.7"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" rx="14" fill="url(#mealGrad)"/>

  <text x="40" y="45" fill="white" font-family="${fontFamily}" font-size="20" font-weight="bold">${data.collegeName}</text>
  <text x="40" y="68" fill="rgba(255,255,255,0.7)" font-family="${fontFamily}" font-size="11" letter-spacing="2">DINING SERVICES</text>
  <text x="${w - 40}" y="45" fill="rgba(255,255,255,0.9)" font-family="${fontFamily}" font-size="14" font-weight="bold" text-anchor="end">MEAL PLAN CARD</text>
  <text x="${w - 40}" y="65" fill="rgba(255,255,255,0.6)" font-family="${fontFamily}" font-size="10" text-anchor="end">${academicYear}</text>

  <line x1="40" y1="85" x2="${w - 40}" y2="85" stroke="rgba(255,255,255,0.15)" stroke-width="1"/>

  ${photoSection}

  <text x="130" y="350" fill="white" font-family="${fontFamily}" font-size="14" font-weight="bold" text-anchor="middle">${data.name}</text>
  <text x="130" y="370" fill="rgba(255,255,255,0.7)" font-family="${fontFamily}" font-size="10" text-anchor="middle">${data.studentId}</text>

  <rect x="260" y="110" width="340" height="70" rx="8" fill="rgba(255,255,255,0.12)"/>
  <text x="280" y="135" fill="rgba(255,255,255,0.7)" font-family="${fontFamily}" font-size="9" letter-spacing="1">MEAL PLAN</text>
  <text x="280" y="162" fill="white" font-family="${fontFamily}" font-size="20" font-weight="bold">${plan}</text>

  <rect x="630" y="110" width="340" height="70" rx="8" fill="rgba(255,255,255,0.12)"/>
  <text x="650" y="135" fill="rgba(255,255,255,0.7)" font-family="${fontFamily}" font-size="9" letter-spacing="1">DINING DOLLARS</text>
  <text x="650" y="162" fill="white" font-family="${fontFamily}" font-size="20" font-weight="bold">$${balance}.00</text>

  <rect x="260" y="200" width="220" height="55" rx="6" fill="rgba(255,255,255,0.08)"/>
  <text x="280" y="222" fill="rgba(255,255,255,0.7)" font-family="${fontFamily}" font-size="9" letter-spacing="1">CARD NUMBER</text>
  <text x="280" y="242" fill="white" font-family="${fontFamily}" font-size="13" letter-spacing="1">${cardNum}</text>

  <rect x="500" y="200" width="220" height="55" rx="6" fill="rgba(255,255,255,0.08)"/>
  <text x="520" y="222" fill="rgba(255,255,255,0.7)" font-family="${fontFamily}" font-size="9" letter-spacing="1">VALID THROUGH</text>
  <text x="520" y="242" fill="white" font-family="${fontFamily}" font-size="13">${valid}</text>

  <rect x="740" y="200" width="230" height="55" rx="6" fill="rgba(255,255,255,0.08)"/>
  <text x="760" y="222" fill="rgba(255,255,255,0.7)" font-family="${fontFamily}" font-size="9" letter-spacing="1">STATUS</text>
  <rect x="760" y="230" width="55" height="20" rx="4" fill="rgba(34,197,94,0.25)"/>
  <text x="787" y="244" fill="#86efac" font-family="${fontFamily}" font-size="10" font-weight="600" text-anchor="middle">ACTIVE</text>

  <text x="260" y="295" fill="rgba(255,255,255,0.6)" font-family="${fontFamily}" font-size="9">Dining Locations: Main Cafeteria | Student Center | Library Cafe | Snack Bar</text>

  <rect x="260" y="320" width="${w - 300}" height="1" fill="rgba(255,255,255,0.1)"/>

  <g transform="translate(${260 + Math.floor((w - 300 - barcodeWidth) / 2)}, 345)">
    <g opacity="0.7">${generateBarcode(data.studentId)}</g>
  </g>
  <text x="${260 + (w - 300) / 2}" y="395" fill="rgba(255,255,255,0.6)" font-family="'Courier New', monospace" font-size="10" text-anchor="middle" letter-spacing="2">${data.studentId}</text>

  <text x="${w / 2}" y="440" fill="rgba(255,255,255,0.35)" font-family="${fontFamily}" font-size="7.5" text-anchor="middle">Present card at any dining facility. Non-transferable. Report lost cards immediately.</text>

  <rect width="${w}" height="${h}" rx="14" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="1"/>
</svg>`;
}

function layoutLibraryCard(data: CardData, color: string, photo: string | null): string {
  const w = 1012, h = 638;
  const fontFamily = "'Georgia', 'Times New Roman', serif";
  const valid = formatDate(data.validUntil);
  const academicYear = getAcademicYear();
  const h1 = hashName(data.name);
  const libNum = `LIB-${data.studentId.replace(/\D/g, "").substring(0, 8)}`;
  const barcodeDigits = data.studentId.replace(/\D/g, "").substring(0, 12);
  const barcodeWidth = barcodeDigits.length * 8 + 14;

  const photoSection = photo
    ? `<defs><clipPath id="photoClip"><rect x="45" y="155" width="150" height="188" rx="6"/></clipPath></defs>
       <rect x="43" y="153" width="154" height="192" rx="7" fill="white" stroke="#c8a96e" stroke-width="1.5"/>
       <image href="${photo}" x="45" y="155" width="150" height="188" clip-path="url(#photoClip)" preserveAspectRatio="xMidYMid slice"/>`
    : `<rect x="45" y="155" width="150" height="188" rx="6" fill="#f5f0e8" stroke="#c8a96e" stroke-width="1.5"/>
       <text x="120" y="255" fill="#a08050" font-family="${fontFamily}" font-size="11" text-anchor="middle">PHOTO</text>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" rx="12" fill="#faf8f3"/>
  <rect x="0" y="0" width="${w}" height="120" rx="12" fill="#2c1810"/>
  <rect x="0" y="12" width="${w}" height="108" fill="#2c1810"/>
  <rect x="0" y="110" width="${w}" height="15" fill="#c8a96e" opacity="0.3"/>

  <text x="40" y="45" fill="#c8a96e" font-family="${fontFamily}" font-size="22" font-weight="bold">${data.collegeName}</text>
  <text x="40" y="68" fill="rgba(200,169,110,0.7)" font-family="${fontFamily}" font-size="12" letter-spacing="2">UNIVERSITY LIBRARY</text>
  <text x="${w - 40}" y="45" fill="#c8a96e" font-family="${fontFamily}" font-size="14" font-weight="bold" text-anchor="end">LIBRARY CARD</text>
  <text x="${w - 40}" y="68" fill="rgba(200,169,110,0.6)" font-family="${fontFamily}" font-size="10" text-anchor="end">${academicYear}</text>

  <text x="40" y="95" fill="rgba(200,169,110,0.4)" font-family="${fontFamily}" font-size="8">Knowledge is the key to understanding</text>

  ${photoSection}

  <text x="230" y="180" fill="#6b7280" font-family="${fontFamily}" font-size="9" letter-spacing="1.2">CARDHOLDER</text>
  <text x="230" y="205" fill="#2c1810" font-family="${fontFamily}" font-size="20" font-weight="bold">${data.name}</text>

  <text x="230" y="240" fill="#6b7280" font-family="${fontFamily}" font-size="9" letter-spacing="1.2">LIBRARY NUMBER</text>
  <text x="230" y="260" fill="#2c1810" font-family="${fontFamily}" font-size="15" letter-spacing="1.5">${libNum}</text>

  <text x="230" y="295" fill="#6b7280" font-family="${fontFamily}" font-size="9" letter-spacing="1.2">DEPARTMENT</text>
  <text x="230" y="313" fill="#555" font-family="${fontFamily}" font-size="13">${data.department}</text>

  <text x="500" y="295" fill="#6b7280" font-family="${fontFamily}" font-size="9" letter-spacing="1.2">VALID THROUGH</text>
  <text x="500" y="313" fill="#555" font-family="${fontFamily}" font-size="13">${valid}</text>

  <text x="230" y="345" fill="#6b7280" font-family="${fontFamily}" font-size="9" letter-spacing="1.2">BORROWING PRIVILEGES</text>
  <text x="230" y="363" fill="#555" font-family="${fontFamily}" font-size="12">Books: 15 items / 28 days  |  Media: 5 items / 7 days  |  ILL: Unlimited</text>

  <rect x="0" y="395" width="${w}" height="1" fill="#d4c5a0"/>

  <g transform="translate(${Math.floor((w - barcodeWidth) / 2)}, 420)">
    ${generateBarcode(data.studentId)}
  </g>
  <text x="${w / 2}" y="470" fill="#8b7355" font-family="'Courier New', monospace" font-size="10" text-anchor="middle" letter-spacing="2">${libNum}</text>

  <text x="${w / 2}" y="510" fill="#a09070" font-family="${fontFamily}" font-size="7.5" text-anchor="middle">Present this card for all library services. Report lost cards to the circulation desk immediately.</text>
  <text x="${w / 2}" y="525" fill="#a09070" font-family="${fontFamily}" font-size="7" text-anchor="middle">Cardholder is responsible for all materials checked out on this card.</text>

  <rect x="0" y="${h - 8}" width="${w}" height="8" fill="#2c1810"/>
  <rect width="${w}" height="${h}" rx="12" fill="none" stroke="#c8a96e" stroke-width="1" opacity="0.5"/>
</svg>`;
}

function layoutParkingPermit(data: CardData, color: string, photo: string | null): string {
  const w = 680, h = 960;
  const fontFamily = "Arial, Helvetica, sans-serif";
  const h1 = hashName(data.name + data.studentId);
  const lots = ["Lot A - West Campus", "Lot B - East Garage", "Lot C - Student Center", "Lot D - North Commons"];
  const lot = lots[h1 % lots.length];
  const permitNum = `PKG-${new Date().getFullYear()}-${(h1 % 9000 + 1000)}`;
  const valid = formatDate(data.validUntil);
  const academicYear = getAcademicYear();
  const vehicleColors = ["Silver", "Black", "White", "Blue", "Red"];
  const vehicleMakes = ["Toyota Camry", "Honda Civic", "Ford Focus", "Hyundai Elantra"];
  const plateLetters = "ABCDEFGHJKLMNPRSTUVWXYZ";
  const plate = `${plateLetters[h1 % 23]}${plateLetters[(h1 + 3) % 23]}${plateLetters[(h1 + 7) % 23]}-${(h1 % 9000 + 1000)}`;
  const barcodeDigits = data.studentId.replace(/\D/g, "").substring(0, 12);
  const barcodeWidth = barcodeDigits.length * 8 + 14;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" rx="14" fill="#ffffff"/>
  <rect x="0" y="0" width="${w}" height="130" rx="14" fill="${color}"/>
  <rect x="0" y="14" width="${w}" height="116" fill="${color}"/>

  <text x="${w / 2}" y="40" fill="white" font-family="${fontFamily}" font-size="18" font-weight="bold" text-anchor="middle">${data.collegeName}</text>
  <text x="${w / 2}" y="65" fill="rgba(255,255,255,0.9)" font-family="${fontFamily}" font-size="16" font-weight="bold" text-anchor="middle">PARKING PERMIT</text>
  <text x="${w / 2}" y="85" fill="rgba(255,255,255,0.7)" font-family="${fontFamily}" font-size="11" text-anchor="middle">${academicYear}</text>

  <rect x="${w / 2 - 60}" y="98" width="120" height="24" rx="4" fill="rgba(255,255,255,0.2)"/>
  <text x="${w / 2}" y="115" fill="white" font-family="${fontFamily}" font-size="12" font-weight="bold" text-anchor="middle">STUDENT</text>

  <text x="50" y="165" fill="#6b7280" font-family="${fontFamily}" font-size="9" letter-spacing="1">PERMIT NUMBER</text>
  <text x="50" y="188" fill="${color}" font-family="${fontFamily}" font-size="22" font-weight="bold">${permitNum}</text>

  <line x1="50" y1="205" x2="${w - 50}" y2="205" stroke="#e5e7eb" stroke-width="1"/>

  <text x="50" y="235" fill="#6b7280" font-family="${fontFamily}" font-size="9" letter-spacing="1">PERMIT HOLDER</text>
  <text x="50" y="258" fill="#111" font-family="${fontFamily}" font-size="18" font-weight="bold">${data.name}</text>
  <text x="50" y="280" fill="#555" font-family="${fontFamily}" font-size="12">Student ID: ${data.studentId}</text>

  <line x1="50" y1="300" x2="${w - 50}" y2="300" stroke="#e5e7eb" stroke-width="1"/>

  <text x="50" y="328" fill="#6b7280" font-family="${fontFamily}" font-size="9" letter-spacing="1">ASSIGNED LOT</text>
  <text x="50" y="350" fill="#111" font-family="${fontFamily}" font-size="16" font-weight="bold">${lot}</text>

  <text x="50" y="390" fill="#6b7280" font-family="${fontFamily}" font-size="9" letter-spacing="1">VEHICLE</text>
  <text x="50" y="410" fill="#333" font-family="${fontFamily}" font-size="13">${vehicleColors[h1 % 5]} ${vehicleMakes[h1 % 4]}</text>
  <text x="50" y="430" fill="#333" font-family="${fontFamily}" font-size="13">Plate: ${plate}</text>

  <text x="${w / 2 + 50}" y="390" fill="#6b7280" font-family="${fontFamily}" font-size="9" letter-spacing="1">VALID THROUGH</text>
  <text x="${w / 2 + 50}" y="410" fill="#333" font-family="${fontFamily}" font-size="13">${valid}</text>

  <rect x="${w / 2 + 50}" y="425" width="55" height="20" rx="4" fill="#dcfce7"/>
  <text x="${w / 2 + 77}" y="440" fill="#166534" font-family="${fontFamily}" font-size="10" font-weight="600" text-anchor="middle">ACTIVE</text>

  <line x1="50" y1="465" x2="${w - 50}" y2="465" stroke="#e5e7eb" stroke-width="1"/>

  <rect x="50" y="480" width="${w - 100}" height="50" rx="4" fill="#fefce8" stroke="#fde68a" stroke-width="1"/>
  <text x="70" y="500" fill="#92400e" font-family="${fontFamily}" font-size="9" font-weight="bold">PARKING RULES</text>
  <text x="70" y="518" fill="#92400e" font-family="${fontFamily}" font-size="8">Must be displayed on dashboard. Valid only for assigned lot. Violations subject to towing &amp; fines.</text>

  <rect x="0" y="555" width="${w}" height="${h - 555}" fill="#f9fafb"/>
  <rect x="0" y="${h - 14}" width="${w}" height="14" rx="14" fill="#f9fafb"/>

  <g transform="translate(${Math.floor((w - barcodeWidth) / 2)}, 580)">
    ${generateBarcode(data.studentId)}
  </g>
  <text x="${w / 2}" y="630" fill="#6b7280" font-family="'Courier New', monospace" font-size="10" text-anchor="middle" letter-spacing="2">${permitNum}</text>

  <text x="${w / 2}" y="670" fill="#9ca3af" font-family="${fontFamily}" font-size="7.5" text-anchor="middle">Campus Parking Services | ${data.collegeName} | (555) 567-8901</text>

  <rect x="0" y="${h - 6}" width="${w}" height="6" fill="${color}"/>
  <rect width="${w}" height="${h}" rx="14" fill="none" stroke="#d1d5db" stroke-width="1"/>
</svg>`;
}

function layoutAthleticCard(data: CardData, color: string, photo: string | null): string {
  const w = 1012, h = 638;
  const fontFamily = "'Impact', 'Arial Black', sans-serif";
  const bodyFont = "Arial, Helvetica, sans-serif";
  const h1 = hashName(data.name + data.studentId);
  const valid = formatDate(data.validUntil);
  const academicYear = getAcademicYear();
  const facilities = ["Fitness Center", "Swimming Pool", "Tennis Courts", "Basketball Gym", "Track & Field"];
  const memberNum = `ATH-${data.studentId.replace(/\D/g, "").substring(0, 6)}`;
  const barcodeDigits = data.studentId.replace(/\D/g, "").substring(0, 12);
  const barcodeWidth = barcodeDigits.length * 8 + 14;

  const photoSection = photo
    ? `<defs><clipPath id="photoClip"><rect x="${w - 240}" y="100" width="195" height="244" rx="8"/></clipPath></defs>
       <rect x="${w - 242}" y="98" width="199" height="248" rx="9" fill="white" stroke="rgba(255,255,255,0.2)" stroke-width="1.5"/>
       <image href="${photo}" x="${w - 240}" y="100" width="195" height="244" clip-path="url(#photoClip)" preserveAspectRatio="xMidYMid slice"/>`
    : `<rect x="${w - 240}" y="100" width="195" height="244" rx="8" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.15)" stroke-width="1.5"/>
       <text x="${w - 143}" y="230" fill="rgba(255,255,255,0.3)" font-family="${bodyFont}" font-size="11" text-anchor="middle">PHOTO</text>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="athGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1a1a2e;stop-opacity:1"/>
      <stop offset="50%" style="stop-color:#16213e;stop-opacity:1"/>
      <stop offset="100%" style="stop-color:#0f3460;stop-opacity:1"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" rx="12" fill="url(#athGrad)"/>

  <rect x="0" y="0" width="${w}" height="70" rx="12" fill="${color}"/>
  <rect x="0" y="12" width="${w}" height="58" fill="${color}"/>

  <text x="40" y="32" fill="white" font-family="${fontFamily}" font-size="22" letter-spacing="1">${data.collegeName.toUpperCase()}</text>
  <text x="40" y="52" fill="rgba(255,255,255,0.8)" font-family="${bodyFont}" font-size="11" letter-spacing="3">ATHLETICS &amp; RECREATION</text>
  <text x="${w - 40}" y="32" fill="white" font-family="${fontFamily}" font-size="16" text-anchor="end">REC CARD</text>
  <text x="${w - 40}" y="52" fill="rgba(255,255,255,0.6)" font-family="${bodyFont}" font-size="10" text-anchor="end">${academicYear}</text>

  ${photoSection}

  <text x="40" y="120" fill="rgba(255,255,255,0.5)" font-family="${bodyFont}" font-size="9" letter-spacing="1.5">MEMBER NAME</text>
  <text x="40" y="148" fill="white" font-family="${fontFamily}" font-size="26" letter-spacing="1">${data.name.toUpperCase()}</text>

  <text x="40" y="185" fill="rgba(255,255,255,0.5)" font-family="${bodyFont}" font-size="9" letter-spacing="1.5">MEMBER ID</text>
  <text x="40" y="208" fill="#e0e0e0" font-family="${bodyFont}" font-size="16" font-weight="600" letter-spacing="2">${memberNum}</text>

  <text x="40" y="245" fill="rgba(255,255,255,0.5)" font-family="${bodyFont}" font-size="9" letter-spacing="1.5">STUDENT ID</text>
  <text x="40" y="265" fill="#ccc" font-family="${bodyFont}" font-size="13">${data.studentId}</text>

  <text x="280" y="245" fill="rgba(255,255,255,0.5)" font-family="${bodyFont}" font-size="9" letter-spacing="1.5">VALID THROUGH</text>
  <text x="280" y="265" fill="#ccc" font-family="${bodyFont}" font-size="13">${valid}</text>

  <text x="40" y="305" fill="rgba(255,255,255,0.5)" font-family="${bodyFont}" font-size="9" letter-spacing="1.5">ACCESS LEVEL</text>
  <rect x="40" y="312" width="80" height="22" rx="4" fill="${color}" opacity="0.3"/>
  <text x="80" y="328" fill="white" font-family="${bodyFont}" font-size="10" font-weight="600" text-anchor="middle">ALL ACCESS</text>

  <text x="40" y="370" fill="rgba(255,255,255,0.5)" font-family="${bodyFont}" font-size="9" letter-spacing="1.5">FACILITY ACCESS</text>
  <text x="40" y="390" fill="rgba(255,255,255,0.7)" font-family="${bodyFont}" font-size="11">${facilities.join("  |  ")}</text>

  <rect x="0" y="415" width="${w}" height="1" fill="rgba(255,255,255,0.1)"/>

  <g transform="translate(${Math.floor((w - barcodeWidth) / 2)}, 435)">
    <g opacity="0.6">${generateBarcode(data.studentId)}</g>
  </g>
  <text x="${w / 2}" y="485" fill="rgba(255,255,255,0.5)" font-family="'Courier New', monospace" font-size="10" text-anchor="middle" letter-spacing="2">${memberNum}</text>

  <text x="${w / 2}" y="530" fill="rgba(255,255,255,0.3)" font-family="${bodyFont}" font-size="7.5" text-anchor="middle">Scan at facility entrance. Non-transferable. ${data.collegeName} Athletics &amp; Recreation.</text>

  <rect x="0" y="${h - 5}" width="${w}" height="5" fill="${color}"/>
  <rect width="${w}" height="${h}" rx="12" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
</svg>`;
}

function getScheduleCourses(data: CardData) {
  const h1 = hashName(data.name);
  const dept = data.department.substring(0, 3).toUpperCase();
  const allTimes = [
    "8:00 AM - 9:15 AM", "9:00 AM - 9:50 AM", "9:30 AM - 10:45 AM",
    "10:00 AM - 10:50 AM", "11:00 AM - 12:15 PM", "11:00 AM - 11:50 AM",
    "1:00 PM - 2:15 PM", "1:00 PM - 1:50 PM", "2:00 PM - 3:15 PM",
    "2:30 PM - 3:20 PM", "3:00 PM - 4:15 PM", "3:30 PM - 4:45 PM"
  ];
  const allDays = ["MWF", "TTh", "MW", "MWF", "TTh", "MW", "WF"];
  const allRooms = [
    "Science Hall 201", "Arts Building 105", "Main Hall 302",
    "Library 410", "Engineering 115", "Taylor Center 220",
    "Wilson Hall 318", "Thompson Lab 104", "Adams Auditorium"
  ];
  const allProfs = [
    "Dr. Johnson", "Prof. Williams", "Dr. Chen", "Prof. Garcia",
    "Dr. Patel", "Prof. Martinez", "Dr. Kim", "Prof. Davis",
    "Dr. Thompson", "Prof. Anderson"
  ];
  const courseNames = [
    { code: `${dept} 201`, name: `Intro to ${data.department}`, credits: 3 },
    { code: `${dept} 310`, name: `${data.department} Analysis`, credits: 4 },
    { code: `${dept} 350`, name: `Applied ${data.department}`, credits: 3 },
    { code: "ENG 201", name: "Technical Writing", credits: 3 },
    { code: "MATH 252", name: "Linear Algebra", credits: 3 },
    { code: `${dept} 410`, name: `Advanced ${data.department}`, credits: 3 },
    { code: "PHYS 201", name: "General Physics II", credits: 4 },
  ];
  const numCourses = 5 + (h1 % 3);
  const courses = courseNames.slice(0, numCourses);
  return courses.map((c, i) => ({
    ...c,
    time: allTimes[(h1 + i * 3) % allTimes.length],
    days: allDays[(h1 + i) % allDays.length],
    room: allRooms[(h1 + i * 2) % allRooms.length],
    instructor: allProfs[(h1 + i) % allProfs.length],
  }));
}

function getScheduleMeta(data: CardData) {
  const h1 = hashName(data.name);
  const semester = new Date().getMonth() >= 7 ? "Fall" : "Spring";
  const year = new Date().getFullYear();
  const academicYear = getAcademicYear();
  const advisors = ["Dr. Anderson", "Dr. Thompson", "Dr. Martinez", "Dr. Lee", "Dr. Brooks"];
  return { h1, semester, year, academicYear, advisor: advisors[h1 % advisors.length] };
}

function layoutScheduleClassic(data: CardData, color: string, photo: string | null): string {
  const w = 850, h = 1100;
  const font = "Georgia, 'Times New Roman', serif";
  const courses = getScheduleCourses(data);
  const meta = getScheduleMeta(data);
  const totalCredits = courses.reduce((s, c) => s + c.credits, 0);

  let rows = "";
  let y = 380;
  courses.forEach((c, i) => {
    const bg = i % 2 === 0 ? "#fafaf8" : "#ffffff";
    rows += `<rect x="60" y="${y}" width="${w - 120}" height="65" fill="${bg}" stroke="#e0ddd5" stroke-width="0.5"/>`;
    rows += `<text x="80" y="${y + 20}" fill="#333" font-family="${font}" font-size="13" font-weight="bold">${c.code}</text>`;
    rows += `<text x="200" y="${y + 20}" fill="#222" font-family="${font}" font-size="13">${c.name}</text>`;
    rows += `<text x="${w - 80}" y="${y + 20}" fill="#555" font-family="${font}" font-size="12" text-anchor="end">${c.credits} cr</text>`;
    rows += `<text x="80" y="${y + 40}" fill="#666" font-family="${font}" font-size="11">${c.days}  |  ${c.time}</text>`;
    rows += `<text x="80" y="${y + 55}" fill="#888" font-family="${font}" font-size="10" font-style="italic">${c.room}  -  ${c.instructor}</text>`;
    y += 65;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="#fffef9"/>
  <rect x="0" y="0" width="${w}" height="6" fill="${color}"/>
  <text x="${w / 2}" y="55" fill="${color}" font-family="${font}" font-size="24" font-weight="bold" text-anchor="middle">${data.collegeName}</text>
  <text x="${w / 2}" y="80" fill="#666" font-family="${font}" font-size="13" text-anchor="middle" font-style="italic">Office of the Registrar</text>
  <line x1="60" y1="100" x2="${w - 60}" y2="100" stroke="${color}" stroke-width="1.5"/>
  <text x="${w / 2}" y="130" fill="#333" font-family="${font}" font-size="18" font-weight="bold" text-anchor="middle">CLASS SCHEDULE</text>
  <text x="${w / 2}" y="150" fill="#666" font-family="${font}" font-size="12" text-anchor="middle">${meta.semester} Semester ${meta.year}  |  Academic Year ${meta.academicYear}</text>

  <rect x="60" y="175" width="${w - 120}" height="100" rx="0" fill="#f8f7f2" stroke="#d4d0c8" stroke-width="1"/>
  <text x="80" y="200" fill="#888" font-family="${font}" font-size="10" letter-spacing="1">STUDENT NAME</text>
  <text x="80" y="220" fill="#222" font-family="${font}" font-size="16" font-weight="bold">${data.name}</text>
  <text x="80" y="245" fill="#888" font-family="${font}" font-size="10" letter-spacing="1">ID: ${data.studentId}  |  ${data.department}</text>
  <text x="80" y="265" fill="#888" font-family="${font}" font-size="10">Advisor: ${meta.advisor}  |  Credits: ${totalCredits}</text>

  <text x="60" y="310" fill="${color}" font-family="${font}" font-size="14" font-weight="bold">Enrolled Courses</text>
  <line x1="60" y1="320" x2="${w - 60}" y2="320" stroke="${color}" stroke-width="1"/>

  <rect x="60" y="340" width="${w - 120}" height="30" fill="${color}" opacity="0.1"/>
  <text x="80" y="360" fill="${color}" font-family="${font}" font-size="10" font-weight="bold">CODE</text>
  <text x="200" y="360" fill="${color}" font-family="${font}" font-size="10" font-weight="bold">COURSE TITLE</text>
  <text x="${w - 80}" y="360" fill="${color}" font-family="${font}" font-size="10" font-weight="bold" text-anchor="end">CREDITS</text>

  ${rows}

  <line x1="60" y1="${y + 5}" x2="${w - 60}" y2="${y + 5}" stroke="#333" stroke-width="1"/>
  <text x="80" y="${y + 25}" fill="#333" font-family="${font}" font-size="12" font-weight="bold">Total Credits: ${totalCredits}</text>
  <text x="${w - 80}" y="${y + 25}" fill="${color}" font-family="${font}" font-size="12" text-anchor="end">Registration Confirmed</text>

  <line x1="60" y1="${h - 80}" x2="${w - 60}" y2="${h - 80}" stroke="#ddd" stroke-width="0.5"/>
  <text x="${w / 2}" y="${h - 55}" fill="#aaa" font-family="${font}" font-size="8" text-anchor="middle">This schedule is issued by ${data.collegeName}. Contact the Registrar for changes.</text>
  <rect x="0" y="${h - 6}" width="${w}" height="6" fill="${color}"/>
</svg>`;
}

function layoutScheduleModern(data: CardData, color: string, photo: string | null): string {
  const w = 850, h = 1100;
  const font = "'Segoe UI', Tahoma, sans-serif";
  const courses = getScheduleCourses(data);
  const meta = getScheduleMeta(data);
  const totalCredits = courses.reduce((s, c) => s + c.credits, 0);
  const blockColors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4"];

  let cards = "";
  let y = 360;
  courses.forEach((c, i) => {
    const bc = blockColors[i % blockColors.length];
    cards += `<rect x="60" y="${y}" width="${w - 120}" height="80" rx="12" fill="#ffffff" stroke="#e5e7eb" stroke-width="1"/>`;
    cards += `<rect x="60" y="${y}" width="8" height="80" rx="4" fill="${bc}"/>`;
    cards += `<rect x="64" y="${y}" width="4" height="80" fill="${bc}"/>`;
    cards += `<rect x="80" y="${y + 10}" width="60" height="22" rx="11" fill="${bc}" opacity="0.15"/>`;
    cards += `<text x="110" y="${y + 26}" fill="${bc}" font-family="${font}" font-size="10" font-weight="600" text-anchor="middle">${c.days}</text>`;
    cards += `<text x="155" y="${y + 26}" fill="#111" font-family="${font}" font-size="14" font-weight="700">${c.code}</text>`;
    cards += `<text x="260" y="${y + 26}" fill="#555" font-family="${font}" font-size="13">${c.name}</text>`;
    cards += `<text x="${w - 80}" y="${y + 26}" fill="#888" font-family="${font}" font-size="11" text-anchor="end">${c.credits} credits</text>`;
    cards += `<text x="80" y="${y + 50}" fill="#3b82f6" font-family="${font}" font-size="11" font-weight="500">${c.time}</text>`;
    cards += `<text x="320" y="${y + 50}" fill="#666" font-family="${font}" font-size="11">${c.room}</text>`;
    cards += `<text x="80" y="${y + 68}" fill="#999" font-family="${font}" font-size="10">${c.instructor}</text>`;
    y += 90;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="#f0f4f8"/>
  <rect x="0" y="0" width="${w}" height="100" rx="0" fill="${color}"/>
  <text x="40" y="40" fill="white" font-family="${font}" font-size="22" font-weight="700">${data.collegeName}</text>
  <text x="40" y="65" fill="rgba(255,255,255,0.85)" font-family="${font}" font-size="13">Class Schedule  -  ${meta.semester} ${meta.year}</text>
  <text x="${w - 40}" y="40" fill="rgba(255,255,255,0.9)" font-family="${font}" font-size="12" text-anchor="end">${meta.academicYear}</text>
  <text x="${w - 40}" y="60" fill="rgba(255,255,255,0.6)" font-family="${font}" font-size="10" text-anchor="end">Academic Year</text>

  <rect x="30" y="120" width="${w - 60}" height="90" rx="16" fill="#ffffff" stroke="#e5e7eb" stroke-width="1"/>
  <text x="55" y="148" fill="#9ca3af" font-family="${font}" font-size="9" letter-spacing="1">STUDENT</text>
  <text x="55" y="170" fill="#111" font-family="${font}" font-size="17" font-weight="700">${data.name}</text>
  <text x="55" y="195" fill="#6b7280" font-family="${font}" font-size="11">ID: ${data.studentId}  |  ${data.department}  |  ${totalCredits} credits</text>
  <text x="${w - 55}" y="170" fill="${color}" font-family="${font}" font-size="12" text-anchor="end" font-weight="600">Advisor: ${meta.advisor}</text>

  <rect x="30" y="225" width="200" height="50" rx="12" fill="${color}" opacity="0.08"/>
  <text x="55" y="248" fill="${color}" font-family="${font}" font-size="9" letter-spacing="1">SEMESTER</text>
  <text x="55" y="265" fill="${color}" font-family="${font}" font-size="13" font-weight="600">${meta.semester} ${meta.year}</text>

  <rect x="250" y="225" width="200" height="50" rx="12" fill="#10b981" opacity="0.08"/>
  <text x="275" y="248" fill="#10b981" font-family="${font}" font-size="9" letter-spacing="1">STATUS</text>
  <text x="275" y="265" fill="#10b981" font-family="${font}" font-size="13" font-weight="600">Enrolled</text>

  <rect x="470" y="225" width="200" height="50" rx="12" fill="#f59e0b" opacity="0.08"/>
  <text x="495" y="248" fill="#b45309" font-family="${font}" font-size="9" letter-spacing="1">TOTAL CREDITS</text>
  <text x="495" y="265" fill="#b45309" font-family="${font}" font-size="13" font-weight="600">${totalCredits}</text>

  <text x="40" y="315" fill="#333" font-family="${font}" font-size="15" font-weight="700">Your Courses</text>
  <line x1="40" y1="325" x2="${w - 40}" y2="325" stroke="#e5e7eb" stroke-width="1"/>

  ${cards}

  <text x="${w / 2}" y="${h - 40}" fill="#aaa" font-family="${font}" font-size="8" text-anchor="middle">Generated by ${data.collegeName} Student Portal  |  ${new Date().toLocaleDateString("en-US")}</text>
</svg>`;
}

function layoutScheduleGrid(data: CardData, color: string, photo: string | null): string {
  const w = 850, h = 1100;
  const font = "Arial, Helvetica, sans-serif";
  const courses = getScheduleCourses(data);
  const meta = getScheduleMeta(data);
  const totalCredits = courses.reduce((s, c) => s + c.credits, 0);
  const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const timeSlots = ["8:00", "9:00", "10:00", "11:00", "12:00", "1:00", "2:00", "3:00", "4:00"];
  const gridColors = ["#dbeafe", "#d1fae5", "#fef3c7", "#fce7f3", "#ede9fe", "#cffafe", "#fee2e2"];

  const colW = (w - 140) / 5;
  const rowH = 55;
  const gridX = 100;
  const gridY = 310;

  let gridLines = "";
  for (let i = 0; i <= 5; i++) {
    gridLines += `<line x1="${gridX + i * colW}" y1="${gridY}" x2="${gridX + i * colW}" y2="${gridY + timeSlots.length * rowH}" stroke="#d1d5db" stroke-width="0.5"/>`;
  }
  for (let i = 0; i <= timeSlots.length; i++) {
    gridLines += `<line x1="${gridX}" y1="${gridY + i * rowH}" x2="${gridX + 5 * colW}" y2="${gridY + i * rowH}" stroke="#d1d5db" stroke-width="0.5"/>`;
  }

  let dayHeaders = "";
  dayLabels.forEach((d, i) => {
    dayHeaders += `<rect x="${gridX + i * colW}" y="${gridY - 30}" width="${colW}" height="30" fill="${color}" opacity="0.1"/>`;
    dayHeaders += `<text x="${gridX + i * colW + colW / 2}" y="${gridY - 10}" fill="${color}" font-family="${font}" font-size="11" font-weight="bold" text-anchor="middle">${d}</text>`;
  });

  let timeLabels = "";
  timeSlots.forEach((t, i) => {
    timeLabels += `<text x="${gridX - 10}" y="${gridY + i * rowH + 20}" fill="#888" font-family="${font}" font-size="9" text-anchor="end">${t}</text>`;
  });

  let blocks = "";
  courses.forEach((c, ci) => {
    const dayStr = c.days;
    const cols: number[] = [];
    if (dayStr.includes("M")) cols.push(0);
    if (dayStr === "TTh" || dayStr.includes("T") && !dayStr.includes("Th")) cols.push(1);
    if (dayStr.includes("W")) cols.push(2);
    if (dayStr.includes("Th") || dayStr === "TTh") cols.push(3);
    if (dayStr.includes("F")) cols.push(4);
    const startHour = parseInt(c.time.split(":")[0]);
    const isPM = c.time.includes("PM") && startHour !== 12;
    const hour24 = isPM ? startHour + 12 : startHour;
    const row = Math.max(0, Math.min(timeSlots.length - 1, hour24 - 8));
    const bc = gridColors[ci % gridColors.length];
    cols.forEach(col => {
      blocks += `<rect x="${gridX + col * colW + 2}" y="${gridY + row * rowH + 2}" width="${colW - 4}" height="${rowH - 4}" rx="4" fill="${bc}" stroke="${color}" stroke-width="0.5" opacity="0.8"/>`;
      blocks += `<text x="${gridX + col * colW + colW / 2}" y="${gridY + row * rowH + 20}" fill="#333" font-family="${font}" font-size="9" font-weight="bold" text-anchor="middle">${c.code}</text>`;
      blocks += `<text x="${gridX + col * colW + colW / 2}" y="${gridY + row * rowH + 33}" fill="#555" font-family="${font}" font-size="7" text-anchor="middle">${c.room.split(" ").slice(-1)[0]}</text>`;
      blocks += `<text x="${gridX + col * colW + colW / 2}" y="${gridY + row * rowH + 45}" fill="#777" font-family="${font}" font-size="7" text-anchor="middle">${c.instructor.split(" ").slice(-1)[0]}</text>`;
    });
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="#ffffff"/>
  <rect x="0" y="0" width="${w}" height="80" fill="${color}"/>
  <text x="40" y="35" fill="white" font-family="${font}" font-size="20" font-weight="bold">${data.collegeName}</text>
  <text x="40" y="58" fill="rgba(255,255,255,0.8)" font-family="${font}" font-size="12">Weekly Schedule Grid  -  ${meta.semester} ${meta.year}</text>
  <text x="${w - 40}" y="55" fill="rgba(255,255,255,0.6)" font-family="${font}" font-size="10" text-anchor="end">${meta.academicYear}</text>

  <rect x="40" y="100" width="${w - 80}" height="70" rx="6" fill="#f9fafb" stroke="#e5e7eb" stroke-width="1"/>
  <text x="60" y="125" fill="#111" font-family="${font}" font-size="16" font-weight="bold">${data.name}</text>
  <text x="60" y="148" fill="#666" font-family="${font}" font-size="11">ID: ${data.studentId}  |  ${data.department}  |  ${totalCredits} credits  |  Advisor: ${meta.advisor}</text>

  <text x="40" y="200" fill="#333" font-family="${font}" font-size="14" font-weight="bold">Weekly Calendar View</text>
  <line x1="40" y1="210" x2="${w - 40}" y2="210" stroke="#e5e7eb" stroke-width="1"/>

  ${dayHeaders}
  ${timeLabels}
  ${gridLines}
  ${blocks}

  <text x="40" y="${gridY + timeSlots.length * rowH + 40}" fill="#333" font-family="${font}" font-size="12" font-weight="bold">Course Legend:</text>
  ${courses.map((c, i) => `<rect x="${40 + (i % 4) * 200}" y="${gridY + timeSlots.length * rowH + 50 + Math.floor(i / 4) * 25}" width="12" height="12" rx="2" fill="${gridColors[i % gridColors.length]}"/><text x="${58 + (i % 4) * 200}" y="${gridY + timeSlots.length * rowH + 61 + Math.floor(i / 4) * 25}" fill="#333" font-family="${font}" font-size="10">${c.code} - ${c.name}</text>`).join("\n  ")}

  <text x="${w / 2}" y="${h - 40}" fill="#aaa" font-family="${font}" font-size="8" text-anchor="middle">${data.collegeName}  |  ${meta.semester} ${meta.year}  |  Generated: ${new Date().toLocaleDateString("en-US")}</text>
  <rect x="0" y="${h - 6}" width="${w}" height="6" fill="${color}"/>
</svg>`;
}

function layoutScheduleTimeline(data: CardData, color: string, photo: string | null): string {
  const w = 850, h = 1100;
  const font = "'Helvetica Neue', Helvetica, Arial, sans-serif";
  const courses = getScheduleCourses(data);
  const meta = getScheduleMeta(data);
  const totalCredits = courses.reduce((s, c) => s + c.credits, 0);
  const dotColors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4"];

  let timeline = "";
  const lineX = 160;
  let y = 350;
  timeline += `<line x1="${lineX}" y1="330" x2="${lineX}" y2="${y + courses.length * 110 - 30}" stroke="#e5e7eb" stroke-width="3"/>`;

  courses.forEach((c, i) => {
    const dc = dotColors[i % dotColors.length];
    timeline += `<circle cx="${lineX}" cy="${y + 15}" r="10" fill="${dc}"/>`;
    timeline += `<circle cx="${lineX}" cy="${y + 15}" r="5" fill="white"/>`;
    timeline += `<text x="${lineX - 30}" y="${y + 5}" fill="#999" font-family="${font}" font-size="10" text-anchor="end">${c.time.split(" - ")[0]}</text>`;
    timeline += `<text x="${lineX - 30}" y="${y + 25}" fill="#bbb" font-family="${font}" font-size="9" text-anchor="end">${c.days}</text>`;
    timeline += `<line x1="${lineX + 15}" y1="${y + 15}" x2="${lineX + 40}" y2="${y + 15}" stroke="${dc}" stroke-width="2"/>`;
    timeline += `<rect x="${lineX + 45}" y="${y - 10}" width="${w - lineX - 110}" height="75" rx="8" fill="#fff" stroke="${dc}" stroke-width="1.5" opacity="0.9"/>`;
    timeline += `<text x="${lineX + 65}" y="${y + 12}" fill="${dc}" font-family="${font}" font-size="14" font-weight="700">${c.code}</text>`;
    timeline += `<text x="${lineX + 175}" y="${y + 12}" fill="#333" font-family="${font}" font-size="13">${c.name}</text>`;
    timeline += `<text x="${lineX + 65}" y="${y + 32}" fill="#666" font-family="${font}" font-size="11">${c.time}</text>`;
    timeline += `<text x="${lineX + 65}" y="${y + 50}" fill="#888" font-family="${font}" font-size="10">${c.room}  |  ${c.instructor}</text>`;
    timeline += `<text x="${w - 80}" y="${y + 12}" fill="#aaa" font-family="${font}" font-size="10" text-anchor="end">${c.credits} cr</text>`;
    y += 110;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="#fafbfc"/>
  <rect x="0" y="0" width="10" height="${h}" fill="${color}"/>
  <text x="40" y="50" fill="${color}" font-family="${font}" font-size="22" font-weight="700">${data.collegeName}</text>
  <text x="40" y="75" fill="#888" font-family="${font}" font-size="12">Class Schedule Timeline</text>
  <text x="${w - 40}" y="50" fill="#aaa" font-family="${font}" font-size="11" text-anchor="end">${meta.semester} ${meta.year}</text>
  <text x="${w - 40}" y="70" fill="#ccc" font-family="${font}" font-size="10" text-anchor="end">${meta.academicYear}</text>

  <line x1="40" y1="100" x2="${w - 40}" y2="100" stroke="#e5e7eb" stroke-width="1"/>

  <text x="40" y="135" fill="#aaa" font-family="${font}" font-size="9" letter-spacing="1.5">STUDENT</text>
  <text x="40" y="160" fill="#222" font-family="${font}" font-size="18" font-weight="600">${data.name}</text>
  <text x="40" y="185" fill="#888" font-family="${font}" font-size="11">ID: ${data.studentId}  |  ${data.department}</text>
  <text x="40" y="205" fill="#888" font-family="${font}" font-size="11">Credits: ${totalCredits}  |  Advisor: ${meta.advisor}</text>

  <text x="40" y="260" fill="#333" font-family="${font}" font-size="16" font-weight="700">Daily Schedule</text>
  <text x="40" y="280" fill="#aaa" font-family="${font}" font-size="10">Courses arranged by start time</text>

  ${timeline}

  <text x="${w / 2}" y="${h - 40}" fill="#ccc" font-family="${font}" font-size="8" text-anchor="middle">${data.collegeName}  |  Printed: ${new Date().toLocaleDateString("en-US")}</text>
  <rect x="0" y="${h - 4}" width="${w}" height="4" fill="${color}"/>
</svg>`;
}

function layoutScheduleColorBlock(data: CardData, color: string, photo: string | null): string {
  const w = 850, h = 1100;
  const font = "'Segoe UI', Tahoma, sans-serif";
  const courses = getScheduleCourses(data);
  const meta = getScheduleMeta(data);
  const totalCredits = courses.reduce((s, c) => s + c.credits, 0);
  const bgColors = ["#eff6ff", "#ecfdf5", "#fffbeb", "#fef2f2", "#f5f3ff", "#fdf2f8", "#ecfeff"];
  const fgColors = ["#1d4ed8", "#059669", "#b45309", "#dc2626", "#7c3aed", "#db2777", "#0891b2"];

  let blocks = "";
  let y = 340;
  courses.forEach((c, i) => {
    const bg = bgColors[i % bgColors.length];
    const fg = fgColors[i % fgColors.length];
    blocks += `<rect x="50" y="${y}" width="${w - 100}" height="90" rx="12" fill="${bg}"/>`;
    blocks += `<rect x="50" y="${y}" width="6" height="90" rx="3" fill="${fg}"/>`;
    blocks += `<text x="80" y="${y + 25}" fill="${fg}" font-family="${font}" font-size="16" font-weight="700">${c.code}</text>`;
    blocks += `<text x="200" y="${y + 25}" fill="#333" font-family="${font}" font-size="14" font-weight="500">${c.name}</text>`;
    blocks += `<text x="${w - 70}" y="${y + 25}" fill="${fg}" font-family="${font}" font-size="12" text-anchor="end" font-weight="600">${c.credits} cr</text>`;
    blocks += `<text x="80" y="${y + 48}" fill="#555" font-family="${font}" font-size="12">${c.days}  |  ${c.time}</text>`;
    blocks += `<text x="80" y="${y + 68}" fill="#888" font-family="${font}" font-size="11">${c.room}  |  ${c.instructor}</text>`;
    y += 100;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="#ffffff"/>
  <text x="50" y="55" fill="${color}" font-family="${font}" font-size="24" font-weight="700">${data.collegeName}</text>
  <text x="50" y="80" fill="#888" font-family="${font}" font-size="12">${meta.semester} ${meta.year} Class Schedule</text>
  <text x="${w - 50}" y="55" fill="#bbb" font-family="${font}" font-size="11" text-anchor="end">${meta.academicYear}</text>

  <rect x="50" y="110" width="${w - 100}" height="80" rx="10" fill="#f8fafc"/>
  <text x="75" y="138" fill="#aaa" font-family="${font}" font-size="9" letter-spacing="1">STUDENT</text>
  <text x="75" y="160" fill="#111" font-family="${font}" font-size="17" font-weight="700">${data.name}</text>
  <text x="75" y="180" fill="#666" font-family="${font}" font-size="11">ID: ${data.studentId}  |  ${data.department}  |  ${totalCredits} credits</text>

  <text x="50" y="230" fill="#333" font-family="${font}" font-size="15" font-weight="700">Course Blocks</text>

  ${blocks}

  <text x="${w / 2}" y="${h - 40}" fill="#ccc" font-family="${font}" font-size="8" text-anchor="middle">${data.collegeName}  |  Schedule printed: ${new Date().toLocaleDateString("en-US")}</text>
</svg>`;
}

function layoutScheduleMinimal(data: CardData, color: string, photo: string | null): string {
  const w = 850, h = 1100;
  const font = "'Helvetica Neue', Helvetica, Arial, sans-serif";
  const courses = getScheduleCourses(data);
  const meta = getScheduleMeta(data);
  const totalCredits = courses.reduce((s, c) => s + c.credits, 0);

  let rows = "";
  let y = 380;
  courses.forEach((c, i) => {
    rows += `<text x="80" y="${y}" fill="#111" font-family="${font}" font-size="15" font-weight="200">${c.code}</text>`;
    rows += `<text x="180" y="${y}" fill="#333" font-family="${font}" font-size="14" font-weight="300">${c.name}</text>`;
    rows += `<text x="${w - 80}" y="${y}" fill="#aaa" font-family="${font}" font-size="12" text-anchor="end" font-weight="200">${c.credits}</text>`;
    rows += `<text x="80" y="${y + 20}" fill="#999" font-family="${font}" font-size="10" font-weight="200">${c.days}  /  ${c.time}  /  ${c.room}  /  ${c.instructor}</text>`;
    rows += `<line x1="80" y1="${y + 35}" x2="${w - 80}" y2="${y + 35}" stroke="#f0f0f0" stroke-width="0.5"/>`;
    y += 65;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="#ffffff"/>
  <text x="80" y="80" fill="#111" font-family="${font}" font-size="11" font-weight="200" letter-spacing="6">${data.collegeName.toUpperCase()}</text>
  <line x1="80" y1="100" x2="300" y2="100" stroke="#e5e7eb" stroke-width="0.5"/>

  <text x="80" y="150" fill="#111" font-family="${font}" font-size="32" font-weight="100">Class Schedule</text>
  <text x="80" y="178" fill="#bbb" font-family="${font}" font-size="12" font-weight="200">${meta.semester} ${meta.year}</text>

  <line x1="80" y1="210" x2="${w - 80}" y2="210" stroke="#f0f0f0" stroke-width="0.5"/>

  <text x="80" y="250" fill="#bbb" font-family="${font}" font-size="8" letter-spacing="3" font-weight="200">STUDENT</text>
  <text x="80" y="275" fill="#333" font-family="${font}" font-size="18" font-weight="200">${data.name}</text>

  <text x="450" y="250" fill="#bbb" font-family="${font}" font-size="8" letter-spacing="3" font-weight="200">ID</text>
  <text x="450" y="275" fill="#333" font-family="${font}" font-size="16" font-weight="200" letter-spacing="2">${data.studentId}</text>

  <text x="80" y="310" fill="#bbb" font-family="${font}" font-size="8" letter-spacing="3" font-weight="200">DEPARTMENT</text>
  <text x="80" y="330" fill="#555" font-family="${font}" font-size="13" font-weight="300">${data.department}</text>

  <text x="450" y="310" fill="#bbb" font-family="${font}" font-size="8" letter-spacing="3" font-weight="200">CREDITS</text>
  <text x="450" y="330" fill="#555" font-family="${font}" font-size="13" font-weight="300">${totalCredits}</text>

  <line x1="80" y1="355" x2="${w - 80}" y2="355" stroke="#f0f0f0" stroke-width="0.5"/>

  ${rows}

  <text x="80" y="${y + 15}" fill="#bbb" font-family="${font}" font-size="10" font-weight="200">Total: ${totalCredits} credits  |  ${courses.length} courses</text>

  <text x="${w / 2}" y="${h - 50}" fill="#ddd" font-family="${font}" font-size="8" text-anchor="middle" font-weight="200">${data.collegeName}</text>
</svg>`;
}

function layoutScheduleDark(data: CardData, color: string, photo: string | null): string {
  const w = 850, h = 1100;
  const font = "'SF Mono', 'Fira Code', monospace";
  const bodyFont = "'Segoe UI', Tahoma, sans-serif";
  const courses = getScheduleCourses(data);
  const meta = getScheduleMeta(data);
  const totalCredits = courses.reduce((s, c) => s + c.credits, 0);
  const neonColors = ["#00ff88", "#00d4ff", "#ff6b9d", "#c084fc", "#fbbf24", "#34d399", "#f472b6"];

  let rows = "";
  let y = 380;
  courses.forEach((c, i) => {
    const nc = neonColors[i % neonColors.length];
    rows += `<rect x="50" y="${y}" width="${w - 100}" height="80" rx="8" fill="#1e293b" stroke="${nc}" stroke-width="1" opacity="0.6"/>`;
    rows += `<rect x="50" y="${y}" width="4" height="80" rx="2" fill="${nc}"/>`;
    rows += `<text x="75" y="${y + 22}" fill="${nc}" font-family="${font}" font-size="13" font-weight="bold">${c.code}</text>`;
    rows += `<text x="200" y="${y + 22}" fill="#e2e8f0" font-family="${bodyFont}" font-size="13">${c.name}</text>`;
    rows += `<text x="${w - 70}" y="${y + 22}" fill="#64748b" font-family="${font}" font-size="11" text-anchor="end">${c.credits}cr</text>`;
    rows += `<text x="75" y="${y + 45}" fill="#94a3b8" font-family="${font}" font-size="10">${c.days}  ${c.time}</text>`;
    rows += `<text x="75" y="${y + 65}" fill="#64748b" font-family="${bodyFont}" font-size="10">${c.room}  //  ${c.instructor}</text>`;
    y += 90;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="#0f172a"/>
  <rect x="0" y="0" width="${w}" height="4" fill="${color}"/>
  <rect x="0" y="4" width="${w}" height="2" fill="#00ff88" opacity="0.3"/>

  <text x="50" y="55" fill="#00ff88" font-family="${font}" font-size="11" letter-spacing="4">${data.collegeName.toUpperCase()}</text>
  <text x="50" y="90" fill="#e2e8f0" font-family="${bodyFont}" font-size="24" font-weight="700">Class Schedule</text>
  <text x="50" y="115" fill="#64748b" font-family="${font}" font-size="11">${meta.semester} ${meta.year}  //  ${meta.academicYear}</text>

  <line x1="50" y1="140" x2="${w - 50}" y2="140" stroke="#1e293b" stroke-width="1"/>

  <text x="50" y="175" fill="#475569" font-family="${font}" font-size="9" letter-spacing="2">STUDENT</text>
  <text x="50" y="200" fill="#f8fafc" font-family="${bodyFont}" font-size="18" font-weight="600">${data.name}</text>
  <text x="50" y="225" fill="#64748b" font-family="${font}" font-size="11">ID: ${data.studentId}</text>

  <text x="450" y="175" fill="#475569" font-family="${font}" font-size="9" letter-spacing="2">PROGRAM</text>
  <text x="450" y="200" fill="#cbd5e1" font-family="${bodyFont}" font-size="14">${data.department}</text>
  <text x="450" y="225" fill="#64748b" font-family="${font}" font-size="11">Credits: ${totalCredits}  |  Advisor: ${meta.advisor}</text>

  <rect x="50" y="250" width="160" height="35" rx="6" fill="#00ff88" opacity="0.1" stroke="#00ff88" stroke-width="0.5"/>
  <text x="130" y="273" fill="#00ff88" font-family="${font}" font-size="10" text-anchor="middle">STATUS: ENROLLED</text>

  <line x1="50" y1="310" x2="${w - 50}" y2="310" stroke="#1e293b" stroke-width="1"/>
  <text x="50" y="340" fill="#94a3b8" font-family="${bodyFont}" font-size="14" font-weight="600">Enrolled Courses</text>

  ${rows}

  <text x="${w / 2}" y="${h - 40}" fill="#334155" font-family="${font}" font-size="8" text-anchor="middle">${data.collegeName} // ${new Date().toLocaleDateString("en-US")}</text>
  <rect x="0" y="${h - 4}" width="${w}" height="4" fill="#00ff88" opacity="0.5"/>
</svg>`;
}

function layoutScheduleAcademic(data: CardData, color: string, photo: string | null): string {
  const w = 850, h = 1100;
  const font = "Georgia, 'Times New Roman', serif";
  const bodyFont = "Arial, Helvetica, sans-serif";
  const courses = getScheduleCourses(data);
  const meta = getScheduleMeta(data);
  const totalCredits = courses.reduce((s, c) => s + c.credits, 0);

  let tableRows = "";
  let y = 490;
  courses.forEach((c, i) => {
    const bg = i % 2 === 0 ? "#f9f8f5" : "#ffffff";
    tableRows += `<rect x="80" y="${y}" width="${w - 160}" height="50" fill="${bg}" stroke="#d4d0c8" stroke-width="0.5"/>`;
    tableRows += `<line x1="170" y1="${y}" x2="170" y2="${y + 50}" stroke="#d4d0c8" stroke-width="0.5"/>`;
    tableRows += `<line x1="380" y1="${y}" x2="380" y2="${y + 50}" stroke="#d4d0c8" stroke-width="0.5"/>`;
    tableRows += `<line x1="470" y1="${y}" x2="470" y2="${y + 50}" stroke="#d4d0c8" stroke-width="0.5"/>`;
    tableRows += `<line x1="610" y1="${y}" x2="610" y2="${y + 50}" stroke="#d4d0c8" stroke-width="0.5"/>`;
    tableRows += `<text x="90" y="${y + 20}" fill="#333" font-family="${bodyFont}" font-size="10" font-weight="bold">${c.code}</text>`;
    tableRows += `<text x="90" y="${y + 38}" fill="#888" font-family="${bodyFont}" font-size="8">${c.credits} cr</text>`;
    tableRows += `<text x="180" y="${y + 20}" fill="#222" font-family="${bodyFont}" font-size="10">${c.name}</text>`;
    tableRows += `<text x="180" y="${y + 38}" fill="#888" font-family="${bodyFont}" font-size="8">${c.instructor}</text>`;
    tableRows += `<text x="390" y="${y + 30}" fill="#555" font-family="${bodyFont}" font-size="10">${c.days}</text>`;
    tableRows += `<text x="480" y="${y + 20}" fill="#555" font-family="${bodyFont}" font-size="9">${c.time}</text>`;
    tableRows += `<text x="620" y="${y + 30}" fill="#555" font-family="${bodyFont}" font-size="9">${c.room}</text>`;
    y += 50;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="#fffef9"/>
  <rect x="0" y="0" width="${w}" height="10" fill="${color}"/>

  <circle cx="${w / 2}" cy="80" r="40" fill="none" stroke="${color}" stroke-width="1.5" opacity="0.3"/>
  <text x="${w / 2}" y="76" fill="${color}" font-family="${font}" font-size="8" text-anchor="middle" opacity="0.5">UNIVERSITY</text>
  <text x="${w / 2}" y="88" fill="${color}" font-family="${font}" font-size="8" text-anchor="middle" opacity="0.5">SEAL</text>

  <text x="${w / 2}" y="150" fill="${color}" font-family="${font}" font-size="26" font-weight="bold" text-anchor="middle">${data.collegeName}</text>
  <line x1="200" y1="165" x2="${w - 200}" y2="165" stroke="${color}" stroke-width="0.5" opacity="0.4"/>
  <text x="${w / 2}" y="190" fill="#555" font-family="${font}" font-size="14" text-anchor="middle" font-style="italic">Official Class Schedule</text>
  <text x="${w / 2}" y="210" fill="#888" font-family="${font}" font-size="11" text-anchor="middle">${meta.semester} Semester ${meta.year}  |  Academic Year ${meta.academicYear}</text>

  <line x1="80" y1="235" x2="${w - 80}" y2="235" stroke="${color}" stroke-width="1"/>

  <rect x="80" y="255" width="${w - 160}" height="120" fill="#f8f7f2" stroke="#d4d0c8" stroke-width="1"/>
  <text x="100" y="280" fill="#888" font-family="${bodyFont}" font-size="9" letter-spacing="1">STUDENT NAME</text>
  <text x="100" y="300" fill="#222" font-family="${font}" font-size="17" font-weight="bold">${data.name}</text>
  <text x="100" y="325" fill="#888" font-family="${bodyFont}" font-size="9" letter-spacing="1">STUDENT ID</text>
  <text x="100" y="342" fill="#333" font-family="${bodyFont}" font-size="12" letter-spacing="1">${data.studentId}</text>
  <text x="100" y="365" fill="#888" font-family="${bodyFont}" font-size="9" letter-spacing="1">DEPARTMENT: ${data.department}  |  CREDITS: ${totalCredits}  |  ADVISOR: ${meta.advisor}</text>

  <text x="80" y="415" fill="${color}" font-family="${font}" font-size="14" font-weight="bold">Schedule of Classes</text>
  <line x1="80" y1="425" x2="${w - 80}" y2="425" stroke="${color}" stroke-width="1"/>

  <rect x="80" y="440" width="${w - 160}" height="35" fill="${color}" opacity="0.08" stroke="#d4d0c8" stroke-width="0.5"/>
  <line x1="170" y1="440" x2="170" y2="475" stroke="#d4d0c8" stroke-width="0.5"/>
  <line x1="380" y1="440" x2="380" y2="475" stroke="#d4d0c8" stroke-width="0.5"/>
  <line x1="470" y1="440" x2="470" y2="475" stroke="#d4d0c8" stroke-width="0.5"/>
  <line x1="610" y1="440" x2="610" y2="475" stroke="#d4d0c8" stroke-width="0.5"/>
  <text x="90" y="462" fill="${color}" font-family="${bodyFont}" font-size="9" font-weight="bold">COURSE</text>
  <text x="180" y="462" fill="${color}" font-family="${bodyFont}" font-size="9" font-weight="bold">TITLE / INSTRUCTOR</text>
  <text x="390" y="462" fill="${color}" font-family="${bodyFont}" font-size="9" font-weight="bold">DAYS</text>
  <text x="480" y="462" fill="${color}" font-family="${bodyFont}" font-size="9" font-weight="bold">TIME</text>
  <text x="620" y="462" fill="${color}" font-family="${bodyFont}" font-size="9" font-weight="bold">ROOM</text>

  ${tableRows}

  <line x1="80" y1="${y + 10}" x2="${w - 80}" y2="${y + 10}" stroke="#333" stroke-width="1"/>
  <text x="100" y="${y + 30}" fill="#333" font-family="${bodyFont}" font-size="11" font-weight="bold">Total Enrolled Credits: ${totalCredits}</text>

  <line x1="80" y1="${h - 100}" x2="${w - 80}" y2="${h - 100}" stroke="#ddd" stroke-width="0.5"/>
  <text x="${w / 2}" y="${h - 75}" fill="#999" font-family="${font}" font-size="8" text-anchor="middle" font-style="italic">This document is issued by the Office of the Registrar, ${data.collegeName}.</text>
  <rect x="0" y="${h - 10}" width="${w}" height="10" fill="${color}"/>
</svg>`;
}

function layoutScheduleCompact(data: CardData, color: string, photo: string | null): string {
  const w = 850, h = 1100;
  const font = "'Courier New', 'Consolas', monospace";
  const bodyFont = "Arial, Helvetica, sans-serif";
  const courses = getScheduleCourses(data);
  const meta = getScheduleMeta(data);
  const totalCredits = courses.reduce((s, c) => s + c.credits, 0);

  let tableRows = "";
  let y = 310;
  const hdrH = 22;
  tableRows += `<rect x="40" y="${y}" width="${w - 80}" height="${hdrH}" fill="${color}" opacity="0.12"/>`;
  tableRows += `<text x="50" y="${y + 15}" fill="${color}" font-family="${font}" font-size="8" font-weight="bold">CODE</text>`;
  tableRows += `<text x="120" y="${y + 15}" fill="${color}" font-family="${font}" font-size="8" font-weight="bold">COURSE TITLE</text>`;
  tableRows += `<text x="340" y="${y + 15}" fill="${color}" font-family="${font}" font-size="8" font-weight="bold">DAYS</text>`;
  tableRows += `<text x="390" y="${y + 15}" fill="${color}" font-family="${font}" font-size="8" font-weight="bold">TIME</text>`;
  tableRows += `<text x="540" y="${y + 15}" fill="${color}" font-family="${font}" font-size="8" font-weight="bold">ROOM</text>`;
  tableRows += `<text x="680" y="${y + 15}" fill="${color}" font-family="${font}" font-size="8" font-weight="bold">INSTRUCTOR</text>`;
  tableRows += `<text x="${w - 50}" y="${y + 15}" fill="${color}" font-family="${font}" font-size="8" font-weight="bold" text-anchor="end">CR</text>`;
  y += hdrH;

  courses.forEach((c, i) => {
    const bg = i % 2 === 0 ? "#f9fafb" : "#fff";
    tableRows += `<rect x="40" y="${y}" width="${w - 80}" height="20" fill="${bg}"/>`;
    tableRows += `<text x="50" y="${y + 14}" fill="#333" font-family="${font}" font-size="9">${c.code}</text>`;
    tableRows += `<text x="120" y="${y + 14}" fill="#222" font-family="${font}" font-size="9">${c.name}</text>`;
    tableRows += `<text x="340" y="${y + 14}" fill="#555" font-family="${font}" font-size="9">${c.days}</text>`;
    tableRows += `<text x="390" y="${y + 14}" fill="#555" font-family="${font}" font-size="9">${c.time}</text>`;
    tableRows += `<text x="540" y="${y + 14}" fill="#555" font-family="${font}" font-size="9">${c.room}</text>`;
    tableRows += `<text x="680" y="${y + 14}" fill="#555" font-family="${font}" font-size="9">${c.instructor}</text>`;
    tableRows += `<text x="${w - 50}" y="${y + 14}" fill="#333" font-family="${font}" font-size="9" text-anchor="end">${c.credits}</text>`;
    y += 20;
  });

  const schedByDay: Record<string, typeof courses> = { MWF: [], TTh: [], MW: [], WF: [] };
  courses.forEach(c => {
    if (schedByDay[c.days]) schedByDay[c.days].push(c);
    else schedByDay[c.days] = [c];
  });

  let daySummary = "";
  let dy = y + 60;
  Object.entries(schedByDay).forEach(([day, cs]) => {
    if (cs.length === 0) return;
    daySummary += `<text x="50" y="${dy}" fill="${color}" font-family="${font}" font-size="9" font-weight="bold">${day}:</text>`;
    cs.forEach((c, i) => {
      daySummary += `<text x="100" y="${dy + i * 16}" fill="#444" font-family="${font}" font-size="8">${c.code} ${c.time} ${c.room}</text>`;
    });
    dy += cs.length * 16 + 10;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="#ffffff"/>
  <rect x="0" y="0" width="${w}" height="55" fill="${color}"/>
  <text x="15" y="22" fill="white" font-family="${bodyFont}" font-size="14" font-weight="bold">${data.collegeName}</text>
  <text x="15" y="40" fill="rgba(255,255,255,0.8)" font-family="${font}" font-size="9">CLASS SCHEDULE  |  ${meta.semester.toUpperCase()} ${meta.year}  |  ${meta.academicYear}</text>
  <text x="${w - 15}" y="22" fill="rgba(255,255,255,0.9)" font-family="${font}" font-size="9" text-anchor="end">Printed: ${new Date().toLocaleDateString("en-US")}</text>

  <text x="40" y="85" fill="#888" font-family="${font}" font-size="8" letter-spacing="1">STUDENT INFORMATION</text>
  <line x1="40" y1="92" x2="${w - 40}" y2="92" stroke="#e5e7eb" stroke-width="0.5"/>
  <text x="40" y="108" fill="#222" font-family="${bodyFont}" font-size="12" font-weight="bold">${data.name}</text>
  <text x="300" y="108" fill="#444" font-family="${font}" font-size="9">ID: ${data.studentId}</text>
  <text x="500" y="108" fill="#444" font-family="${font}" font-size="9">${data.department}</text>
  <text x="${w - 40}" y="108" fill="#444" font-family="${font}" font-size="9" text-anchor="end">Credits: ${totalCredits}</text>
  <text x="40" y="128" fill="#666" font-family="${font}" font-size="9">Advisor: ${meta.advisor}  |  Status: Full-Time  |  Standing: Good</text>

  <rect x="40" y="145" width="${w - 80}" height="1" fill="#e5e7eb"/>

  <text x="40" y="170" fill="#888" font-family="${font}" font-size="8" letter-spacing="1">COURSE SCHEDULE - DETAIL VIEW</text>
  <line x1="40" y1="178" x2="${w - 40}" y2="178" stroke="#e5e7eb" stroke-width="0.5"/>

  ${tableRows}

  <line x1="40" y1="${y + 5}" x2="${w - 40}" y2="${y + 5}" stroke="#333" stroke-width="0.5"/>
  <text x="50" y="${y + 20}" fill="#333" font-family="${font}" font-size="9" font-weight="bold">TOTAL CREDITS: ${totalCredits}</text>
  <text x="${w - 50}" y="${y + 20}" fill="${color}" font-family="${font}" font-size="9" text-anchor="end">REGISTRATION CONFIRMED</text>

  <text x="40" y="${y + 45}" fill="#888" font-family="${font}" font-size="8" letter-spacing="1">SCHEDULE BY DAY</text>
  <line x1="40" y1="${y + 52}" x2="${w - 40}" y2="${y + 52}" stroke="#e5e7eb" stroke-width="0.5"/>
  ${daySummary}

  <text x="${w / 2}" y="${h - 30}" fill="#bbb" font-family="${font}" font-size="7" text-anchor="middle">${data.collegeName} | Registrar System | ${new Date().toLocaleDateString("en-US")}</text>
  <rect x="0" y="${h - 4}" width="${w}" height="4" fill="${color}"/>
</svg>`;
}

function layoutScheduleBanded(data: CardData, color: string, photo: string | null): string {
  const w = 850, h = 1100;
  const font = "Verdana, Geneva, sans-serif";
  const courses = getScheduleCourses(data);
  const meta = getScheduleMeta(data);
  const totalCredits = courses.reduce((s, c) => s + c.credits, 0);
  const bandColors = [
    { bg: "#eff6ff", border: "#93c5fd" },
    { bg: "#f0fdf4", border: "#86efac" },
    { bg: "#fffbeb", border: "#fcd34d" },
    { bg: "#fef2f2", border: "#fca5a5" },
    { bg: "#f5f3ff", border: "#c4b5fd" },
    { bg: "#fdf2f8", border: "#f9a8d4" },
    { bg: "#ecfeff", border: "#67e8f9" },
  ];

  let bands = "";
  let y = 370;
  courses.forEach((c, i) => {
    const band = bandColors[i % bandColors.length];
    bands += `<rect x="0" y="${y}" width="${w}" height="85" fill="${band.bg}"/>`;
    bands += `<rect x="0" y="${y}" width="6" height="85" fill="${band.border}"/>`;
    bands += `<rect x="0" y="${y + 85}" width="${w}" height="1" fill="${band.border}" opacity="0.3"/>`;
    bands += `<text x="50" y="${y + 25}" fill="#333" font-family="${font}" font-size="14" font-weight="bold">${c.code}</text>`;
    bands += `<text x="170" y="${y + 25}" fill="#222" font-family="${font}" font-size="13">${c.name}</text>`;
    bands += `<text x="${w - 50}" y="${y + 25}" fill="#888" font-family="${font}" font-size="11" text-anchor="end">${c.credits} credits</text>`;
    bands += `<text x="50" y="${y + 48}" fill="#666" font-family="${font}" font-size="11">${c.days}  |  ${c.time}</text>`;
    bands += `<text x="50" y="${y + 68}" fill="#888" font-family="${font}" font-size="10">${c.room}  |  ${c.instructor}</text>`;
    y += 86;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="#ffffff"/>
  <rect x="0" y="0" width="${w}" height="90" fill="${color}"/>
  <text x="50" y="38" fill="white" font-family="${font}" font-size="20" font-weight="bold">${data.collegeName}</text>
  <text x="50" y="62" fill="rgba(255,255,255,0.8)" font-family="${font}" font-size="12">Class Schedule  -  ${meta.semester} ${meta.year}</text>
  <text x="${w - 50}" y="62" fill="rgba(255,255,255,0.6)" font-family="${font}" font-size="10" text-anchor="end">${meta.academicYear}</text>

  <rect x="40" y="110" width="${w - 80}" height="80" rx="6" fill="#f9fafb" stroke="#e5e7eb" stroke-width="1"/>
  <text x="60" y="135" fill="#888" font-family="${font}" font-size="9" letter-spacing="1">STUDENT</text>
  <text x="60" y="155" fill="#111" font-family="${font}" font-size="16" font-weight="bold">${data.name}</text>
  <text x="60" y="178" fill="#666" font-family="${font}" font-size="10">ID: ${data.studentId}  |  ${data.department}  |  ${totalCredits} credits  |  Advisor: ${meta.advisor}</text>

  <text x="40" y="230" fill="#333" font-family="${font}" font-size="14" font-weight="bold">Course Schedule</text>
  <line x1="40" y1="240" x2="${w - 40}" y2="240" stroke="#e5e7eb" stroke-width="1"/>

  <rect x="0" y="260" width="${w}" height="30" fill="${color}" opacity="0.08"/>
  <text x="50" y="280" fill="${color}" font-family="${font}" font-size="10" font-weight="bold">COURSE</text>
  <text x="170" y="280" fill="${color}" font-family="${font}" font-size="10" font-weight="bold">TITLE</text>
  <text x="${w - 50}" y="280" fill="${color}" font-family="${font}" font-size="10" font-weight="bold" text-anchor="end">CREDITS</text>

  ${bands}

  <rect x="40" y="${y + 20}" width="${w - 80}" height="40" rx="6" fill="#f0fdf4" stroke="#86efac" stroke-width="1"/>
  <text x="60" y="${y + 45}" fill="#166534" font-family="${font}" font-size="11" font-weight="bold">Registration Confirmed  |  Total Credits: ${totalCredits}  |  ${courses.length} Courses</text>

  <text x="${w / 2}" y="${h - 40}" fill="#aaa" font-family="${font}" font-size="8" text-anchor="middle">${data.collegeName}  |  ${new Date().toLocaleDateString("en-US")}</text>
  <rect x="0" y="${h - 6}" width="${w}" height="6" fill="${color}"/>
</svg>`;
}

function layoutScheduleSplit(data: CardData, color: string, photo: string | null): string {
  const w = 850, h = 1100;
  const font = "'Trebuchet MS', sans-serif";
  const courses = getScheduleCourses(data);
  const meta = getScheduleMeta(data);
  const totalCredits = courses.reduce((s, c) => s + c.credits, 0);
  const splitX = 280;

  let tableRows = "";
  let y = 180;
  courses.forEach((c, i) => {
    const bg = i % 2 === 0 ? "#f9fafb" : "#fff";
    tableRows += `<rect x="${splitX + 10}" y="${y}" width="${w - splitX - 50}" height="65" fill="${bg}" stroke="#e5e7eb" stroke-width="0.5"/>`;
    tableRows += `<text x="${splitX + 25}" y="${y + 18}" fill="${color}" font-family="${font}" font-size="12" font-weight="bold">${c.code}</text>`;
    tableRows += `<text x="${splitX + 120}" y="${y + 18}" fill="#222" font-family="${font}" font-size="11">${c.name}</text>`;
    tableRows += `<text x="${w - 55}" y="${y + 18}" fill="#888" font-family="${font}" font-size="10" text-anchor="end">${c.credits} cr</text>`;
    tableRows += `<text x="${splitX + 25}" y="${y + 38}" fill="#666" font-family="${font}" font-size="10">${c.days}  |  ${c.time}</text>`;
    tableRows += `<text x="${splitX + 25}" y="${y + 55}" fill="#999" font-family="${font}" font-size="9">${c.room}  |  ${c.instructor}</text>`;
    y += 65;
  });

  const photoSection = photo
    ? `<defs><clipPath id="photoClip"><rect x="50" y="390" width="180" height="225" rx="8"/></clipPath></defs>
       <rect x="48" y="388" width="184" height="229" rx="9" fill="white" stroke="${color}" stroke-width="1.5"/>
       <image href="${photo}" x="50" y="390" width="180" height="225" clip-path="url(#photoClip)" preserveAspectRatio="xMidYMid slice"/>`
    : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="#ffffff"/>
  <rect x="0" y="0" width="${splitX}" height="${h}" fill="${color}" opacity="0.04"/>
  <rect x="${splitX}" y="0" width="2" height="${h}" fill="${color}" opacity="0.15"/>

  <rect x="0" y="0" width="${w}" height="70" fill="${color}"/>
  <text x="30" y="30" fill="white" font-family="${font}" font-size="18" font-weight="bold">${data.collegeName}</text>
  <text x="30" y="52" fill="rgba(255,255,255,0.8)" font-family="${font}" font-size="11">Class Schedule  |  ${meta.semester} ${meta.year}</text>
  <text x="${w - 30}" y="52" fill="rgba(255,255,255,0.6)" font-family="${font}" font-size="10" text-anchor="end">${meta.academicYear}</text>

  <text x="30" y="110" fill="${color}" font-family="${font}" font-size="13" font-weight="bold">Student Info</text>
  <line x1="30" y1="120" x2="${splitX - 20}" y2="120" stroke="${color}" stroke-width="1"/>

  <text x="30" y="150" fill="#888" font-family="${font}" font-size="9" letter-spacing="1">NAME</text>
  <text x="30" y="170" fill="#222" font-family="${font}" font-size="15" font-weight="bold">${data.name}</text>

  <text x="30" y="200" fill="#888" font-family="${font}" font-size="9" letter-spacing="1">ID</text>
  <text x="30" y="218" fill="#333" font-family="${font}" font-size="12" letter-spacing="1">${data.studentId}</text>

  <text x="30" y="248" fill="#888" font-family="${font}" font-size="9" letter-spacing="1">DEPARTMENT</text>
  <text x="30" y="268" fill="#333" font-family="${font}" font-size="12">${data.department}</text>

  <text x="30" y="298" fill="#888" font-family="${font}" font-size="9" letter-spacing="1">CREDITS</text>
  <text x="30" y="318" fill="${color}" font-family="${font}" font-size="16" font-weight="bold">${totalCredits}</text>

  <text x="30" y="348" fill="#888" font-family="${font}" font-size="9" letter-spacing="1">ADVISOR</text>
  <text x="30" y="368" fill="#333" font-family="${font}" font-size="12">${meta.advisor}</text>

  ${photoSection}

  <text x="${splitX + 20}" y="110" fill="${color}" font-family="${font}" font-size="13" font-weight="bold">Course Schedule</text>
  <line x1="${splitX + 20}" y1="120" x2="${w - 40}" y2="120" stroke="${color}" stroke-width="1"/>

  <rect x="${splitX + 10}" y="135" width="${w - splitX - 50}" height="30" fill="${color}" opacity="0.08"/>
  <text x="${splitX + 25}" y="155" fill="${color}" font-family="${font}" font-size="9" font-weight="bold">COURSE</text>
  <text x="${splitX + 120}" y="155" fill="${color}" font-family="${font}" font-size="9" font-weight="bold">TITLE</text>
  <text x="${w - 55}" y="155" fill="${color}" font-family="${font}" font-size="9" font-weight="bold" text-anchor="end">CR</text>

  ${tableRows}

  <text x="${w / 2 + splitX / 2}" y="${h - 40}" fill="#aaa" font-family="${font}" font-size="8" text-anchor="middle">${data.collegeName}  |  ${new Date().toLocaleDateString("en-US")}</text>
  <rect x="0" y="${h - 5}" width="${w}" height="5" fill="${color}"/>
</svg>`;
}

function layoutScheduleCards(data: CardData, color: string, photo: string | null): string {
  const w = 850, h = 1100;
  const font = "'Segoe UI', Tahoma, sans-serif";
  const courses = getScheduleCourses(data);
  const meta = getScheduleMeta(data);
  const totalCredits = courses.reduce((s, c) => s + c.credits, 0);
  const cardColors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4"];

  const cols = 2;
  const cardW = (w - 120) / cols;
  const cardH = 140;
  let cards = "";
  courses.forEach((c, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = 50 + col * (cardW + 20);
    const cy = 310 + row * (cardH + 15);
    const cc = cardColors[i % cardColors.length];
    cards += `<rect x="${cx}" y="${cy}" width="${cardW}" height="${cardH}" rx="12" fill="#ffffff" stroke="#e5e7eb" stroke-width="1"/>`;
    cards += `<rect x="${cx}" y="${cy}" width="${cardW}" height="6" rx="3" fill="${cc}"/>`;
    cards += `<rect x="${cx}" y="${cy + 3}" width="${cardW}" height="3" fill="${cc}"/>`;
    cards += `<text x="${cx + 15}" y="${cy + 30}" fill="${cc}" font-family="${font}" font-size="14" font-weight="700">${c.code}</text>`;
    cards += `<text x="${cx + 15}" y="${cy + 50}" fill="#333" font-family="${font}" font-size="12">${c.name}</text>`;
    cards += `<text x="${cx + cardW - 15}" y="${cy + 30}" fill="#aaa" font-family="${font}" font-size="10" text-anchor="end">${c.credits} cr</text>`;
    cards += `<text x="${cx + 15}" y="${cy + 75}" fill="#666" font-family="${font}" font-size="10">${c.days}  |  ${c.time}</text>`;
    cards += `<text x="${cx + 15}" y="${cy + 95}" fill="#888" font-family="${font}" font-size="10">${c.room}</text>`;
    cards += `<text x="${cx + 15}" y="${cy + 115}" fill="#999" font-family="${font}" font-size="9">${c.instructor}</text>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="#f8fafc"/>
  <rect x="0" y="0" width="${w}" height="85" fill="${color}"/>
  <text x="40" y="35" fill="white" font-family="${font}" font-size="20" font-weight="700">${data.collegeName}</text>
  <text x="40" y="58" fill="rgba(255,255,255,0.8)" font-family="${font}" font-size="12">Class Schedule  -  ${meta.semester} ${meta.year}</text>
  <text x="${w - 40}" y="58" fill="rgba(255,255,255,0.6)" font-family="${font}" font-size="10" text-anchor="end">${meta.academicYear}</text>

  <rect x="40" y="105" width="${w - 80}" height="70" rx="12" fill="#ffffff" stroke="#e5e7eb" stroke-width="1"/>
  <text x="60" y="130" fill="#111" font-family="${font}" font-size="16" font-weight="700">${data.name}</text>
  <text x="60" y="155" fill="#666" font-family="${font}" font-size="11">ID: ${data.studentId}  |  ${data.department}  |  ${totalCredits} credits  |  Advisor: ${meta.advisor}</text>

  <text x="50" y="215" fill="#333" font-family="${font}" font-size="15" font-weight="700">Enrolled Courses</text>
  <text x="50" y="235" fill="#aaa" font-family="${font}" font-size="10">${courses.length} courses  |  ${totalCredits} total credits</text>

  ${cards}

  <text x="${w / 2}" y="${h - 40}" fill="#aaa" font-family="${font}" font-size="8" text-anchor="middle">${data.collegeName}  |  ${new Date().toLocaleDateString("en-US")}</text>
</svg>`;
}

function layoutScheduleWeekly(data: CardData, color: string, photo: string | null): string {
  const w = 850, h = 1100;
  const font = "Arial, Helvetica, sans-serif";
  const courses = getScheduleCourses(data);
  const meta = getScheduleMeta(data);
  const totalCredits = courses.reduce((s, c) => s + c.credits, 0);
  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const gridColors = ["#dbeafe", "#d1fae5", "#fef3c7", "#fce7f3", "#ede9fe", "#cffafe", "#fee2e2"];

  const colW = (w - 100) / 7;
  const gridX = 60;
  const gridY = 260;
  const cellH = 80;
  const numRows = 6;

  let grid = "";
  for (let r = 0; r <= numRows; r++) {
    grid += `<line x1="${gridX}" y1="${gridY + r * cellH}" x2="${gridX + 7 * colW}" y2="${gridY + r * cellH}" stroke="#e5e7eb" stroke-width="0.5"/>`;
  }
  for (let c = 0; c <= 7; c++) {
    grid += `<line x1="${gridX + c * colW}" y1="${gridY}" x2="${gridX + c * colW}" y2="${gridY + numRows * cellH}" stroke="#e5e7eb" stroke-width="0.5"/>`;
  }

  let headers = "";
  dayLabels.forEach((d, i) => {
    const isWeekend = i === 0 || i === 6;
    headers += `<rect x="${gridX + i * colW}" y="${gridY - 25}" width="${colW}" height="25" fill="${isWeekend ? "#f3f4f6" : color}" opacity="${isWeekend ? 1 : 0.1}"/>`;
    headers += `<text x="${gridX + i * colW + colW / 2}" y="${gridY - 8}" fill="${isWeekend ? "#999" : color}" font-family="${font}" font-size="10" font-weight="bold" text-anchor="middle">${d}</text>`;
  });

  let courseEntries = "";
  courses.forEach((c, ci) => {
    const dayStr = c.days;
    const cols: number[] = [];
    if (dayStr.includes("M")) cols.push(1);
    if (dayStr === "TTh" || (dayStr.includes("T") && !dayStr.includes("Th"))) cols.push(2);
    if (dayStr.includes("W")) cols.push(3);
    if (dayStr.includes("Th") || dayStr === "TTh") cols.push(4);
    if (dayStr.includes("F")) cols.push(5);

    const row = ci < 3 ? ci : ci - 3;
    const rowOffset = ci < 3 ? 0 : 3;
    const gc = gridColors[ci % gridColors.length];

    cols.forEach(col => {
      const ex = gridX + col * colW + 2;
      const ey = gridY + (row + rowOffset) * cellH + 2;
      courseEntries += `<rect x="${ex}" y="${ey}" width="${colW - 4}" height="${cellH - 4}" rx="4" fill="${gc}" opacity="0.7"/>`;
      courseEntries += `<text x="${ex + 5}" y="${ey + 15}" fill="#333" font-family="${font}" font-size="8" font-weight="bold">${c.code}</text>`;
      courseEntries += `<text x="${ex + 5}" y="${ey + 28}" fill="#555" font-family="${font}" font-size="7">${c.time.split(" - ")[0]}</text>`;
      courseEntries += `<text x="${ex + 5}" y="${ey + 40}" fill="#777" font-family="${font}" font-size="6">${c.room.split(" ").slice(-1)[0]}</text>`;
    });
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="#ffffff"/>
  <rect x="0" y="0" width="${w}" height="80" fill="${color}"/>
  <text x="40" y="32" fill="white" font-family="${font}" font-size="18" font-weight="bold">${data.collegeName}</text>
  <text x="40" y="55" fill="rgba(255,255,255,0.8)" font-family="${font}" font-size="12">Weekly Calendar  -  ${meta.semester} ${meta.year}</text>
  <text x="${w - 40}" y="55" fill="rgba(255,255,255,0.6)" font-family="${font}" font-size="10" text-anchor="end">${meta.academicYear}</text>

  <rect x="40" y="100" width="${w - 80}" height="60" rx="6" fill="#f9fafb" stroke="#e5e7eb" stroke-width="1"/>
  <text x="60" y="122" fill="#111" font-family="${font}" font-size="14" font-weight="bold">${data.name}</text>
  <text x="60" y="145" fill="#666" font-family="${font}" font-size="10">ID: ${data.studentId}  |  ${data.department}  |  ${totalCredits} credits</text>

  <text x="40" y="195" fill="#333" font-family="${font}" font-size="14" font-weight="bold">Week View</text>

  ${headers}
  ${grid}
  ${courseEntries}

  <text x="40" y="${gridY + numRows * cellH + 40}" fill="#333" font-family="${font}" font-size="12" font-weight="bold">Legend:</text>
  ${courses.map((c, i) => `<rect x="${40 + (i % 4) * 200}" y="${gridY + numRows * cellH + 50 + Math.floor(i / 4) * 20}" width="10" height="10" rx="2" fill="${gridColors[i % gridColors.length]}"/><text x="${56 + (i % 4) * 200}" y="${gridY + numRows * cellH + 60 + Math.floor(i / 4) * 20}" fill="#555" font-family="${font}" font-size="9">${c.code} - ${c.name}</text>`).join("\n  ")}

  <text x="${w / 2}" y="${h - 40}" fill="#aaa" font-family="${font}" font-size="8" text-anchor="middle">${data.collegeName}  |  ${new Date().toLocaleDateString("en-US")}</text>
  <rect x="0" y="${h - 6}" width="${w}" height="6" fill="${color}"/>
</svg>`;
}

function layoutScheduleList(data: CardData, color: string, photo: string | null): string {
  const w = 850, h = 1100;
  const font = "'Helvetica Neue', Helvetica, Arial, sans-serif";
  const courses = getScheduleCourses(data);
  const meta = getScheduleMeta(data);
  const totalCredits = courses.reduce((s, c) => s + c.credits, 0);

  let list = "";
  let y = 370;
  courses.forEach((c, i) => {
    const num = (i + 1).toString().padStart(2, "0");
    list += `<text x="60" y="${y}" fill="${color}" font-family="${font}" font-size="28" font-weight="100">${num}</text>`;
    list += `<text x="110" y="${y - 8}" fill="#222" font-family="${font}" font-size="16" font-weight="600">${c.code}  -  ${c.name}</text>`;
    list += `<text x="110" y="${y + 12}" fill="#666" font-family="${font}" font-size="11" font-weight="300">${c.days}  |  ${c.time}  |  ${c.credits} credits</text>`;
    list += `<text x="110" y="${y + 30}" fill="#999" font-family="${font}" font-size="10" font-weight="300">${c.room}  |  ${c.instructor}</text>`;
    list += `<line x1="60" y1="${y + 45}" x2="${w - 60}" y2="${y + 45}" stroke="#f0f0f0" stroke-width="0.5"/>`;
    y += 75;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="#ffffff"/>
  <rect x="0" y="0" width="${w}" height="4" fill="${color}"/>

  <text x="60" y="60" fill="#222" font-family="${font}" font-size="26" font-weight="100">${data.collegeName}</text>
  <text x="60" y="85" fill="#aaa" font-family="${font}" font-size="12" font-weight="200">Class Schedule</text>
  <text x="${w - 60}" y="60" fill="#ccc" font-family="${font}" font-size="11" text-anchor="end">${meta.semester} ${meta.year}</text>
  <text x="${w - 60}" y="80" fill="#ddd" font-family="${font}" font-size="10" text-anchor="end">${meta.academicYear}</text>

  <line x1="60" y1="105" x2="${w - 60}" y2="105" stroke="#e5e7eb" stroke-width="0.5"/>

  <text x="60" y="140" fill="#aaa" font-family="${font}" font-size="9" letter-spacing="2" font-weight="300">STUDENT</text>
  <text x="60" y="165" fill="#222" font-family="${font}" font-size="20" font-weight="400">${data.name}</text>

  <text x="60" y="200" fill="#aaa" font-family="${font}" font-size="9" letter-spacing="2" font-weight="300">ID</text>
  <text x="60" y="220" fill="#555" font-family="${font}" font-size="14" font-weight="300" letter-spacing="1">${data.studentId}</text>

  <text x="350" y="200" fill="#aaa" font-family="${font}" font-size="9" letter-spacing="2" font-weight="300">DEPARTMENT</text>
  <text x="350" y="220" fill="#555" font-family="${font}" font-size="14" font-weight="300">${data.department}</text>

  <text x="600" y="200" fill="#aaa" font-family="${font}" font-size="9" letter-spacing="2" font-weight="300">CREDITS</text>
  <text x="600" y="220" fill="${color}" font-family="${font}" font-size="14" font-weight="400">${totalCredits}</text>

  <line x1="60" y1="245" x2="${w - 60}" y2="245" stroke="#e5e7eb" stroke-width="0.5"/>

  <text x="60" y="280" fill="#333" font-family="${font}" font-size="16" font-weight="500">Enrolled Courses</text>
  <text x="60" y="300" fill="#bbb" font-family="${font}" font-size="10" font-weight="200">${courses.length} courses for ${meta.semester} ${meta.year}</text>

  ${list}

  <text x="60" y="${y + 15}" fill="#333" font-family="${font}" font-size="13" font-weight="400">Total: ${totalCredits} credits  |  ${courses.length} courses</text>

  <text x="${w / 2}" y="${h - 40}" fill="#ddd" font-family="${font}" font-size="8" text-anchor="middle" font-weight="200">${data.collegeName}  |  ${new Date().toLocaleDateString("en-US")}</text>
  <rect x="0" y="${h - 4}" width="${w}" height="4" fill="${color}"/>
</svg>`;
}

function layoutScheduleStripe(data: CardData, color: string, photo: string | null): string {
  const w = 850, h = 1100;
  const font = "'Segoe UI', Tahoma, sans-serif";
  const courses = getScheduleCourses(data);
  const meta = getScheduleMeta(data);
  const totalCredits = courses.reduce((s, c) => s + c.credits, 0);

  let rows = "";
  let y = 420;
  courses.forEach((c, i) => {
    const bg = i % 2 === 0 ? "#f9fafb" : "#ffffff";
    rows += `<rect x="60" y="${y}" width="${w - 120}" height="70" fill="${bg}"/>`;
    rows += `<line x1="60" y1="${y + 70}" x2="${w - 60}" y2="${y + 70}" stroke="#e5e7eb" stroke-width="0.5"/>`;
    rows += `<text x="80" y="${y + 22}" fill="${color}" font-family="${font}" font-size="13" font-weight="700">${c.code}</text>`;
    rows += `<text x="180" y="${y + 22}" fill="#222" font-family="${font}" font-size="13">${c.name}</text>`;
    rows += `<text x="${w - 80}" y="${y + 22}" fill="#888" font-family="${font}" font-size="11" text-anchor="end">${c.credits} credits</text>`;
    rows += `<text x="80" y="${y + 44}" fill="#555" font-family="${font}" font-size="11">${c.days}  |  ${c.time}</text>`;
    rows += `<text x="80" y="${y + 62}" fill="#999" font-family="${font}" font-size="10">${c.room}  |  ${c.instructor}</text>`;
    y += 70;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="#ffffff"/>
  <rect x="0" y="0" width="${w}" height="140" fill="${color}"/>
  <text x="60" y="45" fill="white" font-family="${font}" font-size="24" font-weight="700">${data.collegeName}</text>
  <text x="60" y="75" fill="rgba(255,255,255,0.9)" font-family="${font}" font-size="16" font-weight="600">CLASS SCHEDULE</text>
  <text x="60" y="100" fill="rgba(255,255,255,0.7)" font-family="${font}" font-size="13">${meta.semester} Semester ${meta.year}</text>
  <text x="60" y="125" fill="rgba(255,255,255,0.5)" font-family="${font}" font-size="11">Academic Year ${meta.academicYear}</text>

  <text x="${w - 60}" y="70" fill="rgba(255,255,255,0.3)" font-family="${font}" font-size="60" font-weight="900" text-anchor="end">SCH</text>

  <rect x="60" y="160" width="${w - 120}" height="100" rx="8" fill="#f9fafb" stroke="#e5e7eb" stroke-width="1"/>
  <text x="80" y="188" fill="#888" font-family="${font}" font-size="9" letter-spacing="1">STUDENT NAME</text>
  <text x="80" y="210" fill="#111" font-family="${font}" font-size="18" font-weight="700">${data.name}</text>
  <text x="80" y="235" fill="#666" font-family="${font}" font-size="11">ID: ${data.studentId}  |  ${data.department}</text>
  <text x="80" y="252" fill="#888" font-family="${font}" font-size="10">Credits: ${totalCredits}  |  Advisor: ${meta.advisor}  |  Status: Full-Time</text>

  <text x="60" y="300" fill="#333" font-family="${font}" font-size="14" font-weight="700">Enrolled Courses</text>
  <line x1="60" y1="310" x2="${w - 60}" y2="310" stroke="${color}" stroke-width="2"/>

  <rect x="60" y="330" width="${w - 120}" height="30" fill="${color}" opacity="0.06"/>
  <text x="80" y="350" fill="${color}" font-family="${font}" font-size="10" font-weight="bold">CODE</text>
  <text x="180" y="350" fill="${color}" font-family="${font}" font-size="10" font-weight="bold">TITLE</text>
  <text x="${w - 80}" y="350" fill="${color}" font-family="${font}" font-size="10" font-weight="bold" text-anchor="end">CREDITS</text>
  <line x1="60" y1="365" x2="${w - 60}" y2="365" stroke="#d1d5db" stroke-width="0.5"/>

  ${rows}

  <line x1="60" y1="${y + 10}" x2="${w - 60}" y2="${y + 10}" stroke="#333" stroke-width="1"/>
  <text x="80" y="${y + 35}" fill="#333" font-family="${font}" font-size="12" font-weight="bold">Total Enrolled Credits: ${totalCredits}</text>
  <rect x="${w - 240}" y="${y + 18}" width="160" height="28" rx="6" fill="#f0fdf4" stroke="#86efac" stroke-width="1"/>
  <text x="${w - 160}" y="${y + 37}" fill="#166534" font-family="${font}" font-size="10" font-weight="600" text-anchor="middle">Registration Confirmed</text>

  <line x1="60" y1="${h - 80}" x2="${w - 60}" y2="${h - 80}" stroke="#e5e7eb" stroke-width="0.5"/>
  <text x="${w / 2}" y="${h - 55}" fill="#aaa" font-family="${font}" font-size="8" text-anchor="middle">Generated by ${data.collegeName} Student Portal  |  ${new Date().toLocaleDateString("en-US")}</text>
  <rect x="0" y="${h - 6}" width="${w}" height="6" fill="${color}"/>
</svg>`;
}

function generateReceiptData(data: CardData) {
  const h = hashName(data.name);
  const tuition = 8000 + (h % 12001);
  const regFee = 200 + (h % 801);
  const techFee = 150 + ((h >> 3) % 551);
  const healthFee = 200 + ((h >> 5) % 601);
  const activityFee = 100 + ((h >> 7) % 401);
  const labFee = 150 + ((h >> 9) % 451);
  const facilitiesFee = 100 + ((h >> 11) % 301);
  const totalCharges = tuition + regFee + techFee + healthFee + activityFee + labFee + facilitiesFee;
  const aid = 3000 + ((h >> 2) % 7001);
  const scholarship = 1000 + ((h >> 4) % 4001);
  const totalAid = aid + scholarship;
  const amountPaid = totalCharges - totalAid > 0 ? totalCharges - totalAid : 0;
  const balanceDue = 0;
  const accountNum = `AC${(h % 900000 + 100000)}`;
  const receiptNum = `RCP-${(h % 90000 + 10000)}`;
  const invoiceNum = `INV-${((h >> 1) % 90000 + 10000)}`;
  const paymentDate = formatDate(data.validUntil);
  const semester = (h % 2 === 0) ? "Fall" : "Spring";
  const academicYear = getAcademicYear();
  const ccLast4 = `${(h % 9000 + 1000)}`;
  const paymentMethod = h % 3 === 0 ? `Financial Aid` : h % 3 === 1 ? `Credit Card ending ${ccLast4}` : `Bank Transfer`;
  const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return {
    tuition, regFee, techFee, healthFee, activityFee, labFee, facilitiesFee,
    totalCharges, aid, scholarship, totalAid, amountPaid, balanceDue,
    accountNum, receiptNum, invoiceNum, paymentDate, semester, academicYear,
    ccLast4, paymentMethod, fmt
  };
}

function layoutReceiptClassic(data: CardData, color: string, photo: string | null): string {
  const w = 850, h = 1100;
  const r = generateReceiptData(data);
  const font = "Georgia, 'Times New Roman', serif";
  const mono = "'Courier New', monospace";
  let y = 0;
  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="#fffef8"/>
  <rect x="20" y="20" width="${w - 40}" height="${h - 40}" fill="none" stroke="#333" stroke-width="2"/>
  <rect x="25" y="25" width="${w - 50}" height="${h - 50}" fill="none" stroke="#999" stroke-width="0.5"/>
  <text x="${w / 2}" y="70" fill="#1a1a1a" font-family="${font}" font-size="28" text-anchor="middle" font-weight="bold">${data.collegeName}</text>
  <text x="${w / 2}" y="100" fill="#555" font-family="${font}" font-size="14" text-anchor="middle" font-style="italic">Office of Student Financial Services</text>
  <line x1="60" y1="115" x2="${w - 60}" y2="115" stroke="#333" stroke-width="1.5"/>
  <text x="${w / 2}" y="145" fill="${color}" font-family="${font}" font-size="22" text-anchor="middle" letter-spacing="4" font-weight="bold">TUITION RECEIPT</text>
  <line x1="60" y1="160" x2="${w - 60}" y2="160" stroke="#333" stroke-width="1.5"/>`;
  y = 195;
  svg += `
  <text x="60" y="${y}" fill="#555" font-family="${font}" font-size="11">Student Name:</text>
  <text x="200" y="${y}" fill="#111" font-family="${font}" font-size="13" font-weight="bold">${data.name}</text>
  <text x="500" y="${y}" fill="#555" font-family="${font}" font-size="11">Student ID:</text>
  <text x="600" y="${y}" fill="#111" font-family="${mono}" font-size="13">${data.studentId}</text>`;
  y += 28;
  svg += `
  <text x="60" y="${y}" fill="#555" font-family="${font}" font-size="11">Department:</text>
  <text x="200" y="${y}" fill="#111" font-family="${font}" font-size="13">${data.department}</text>
  <text x="500" y="${y}" fill="#555" font-family="${font}" font-size="11">Account #:</text>
  <text x="600" y="${y}" fill="#111" font-family="${mono}" font-size="13">${r.accountNum}</text>`;
  y += 28;
  svg += `
  <text x="60" y="${y}" fill="#555" font-family="${font}" font-size="11">Semester:</text>
  <text x="200" y="${y}" fill="#111" font-family="${font}" font-size="13">${r.semester} ${r.academicYear}</text>
  <text x="500" y="${y}" fill="#555" font-family="${font}" font-size="11">Receipt #:</text>
  <text x="600" y="${y}" fill="#111" font-family="${mono}" font-size="13">${r.receiptNum}</text>`;
  y += 28;
  svg += `
  <text x="60" y="${y}" fill="#555" font-family="${font}" font-size="11">Payment Date:</text>
  <text x="200" y="${y}" fill="#111" font-family="${font}" font-size="13">${r.paymentDate}</text>`;
  y += 30;
  svg += `<line x1="60" y1="${y}" x2="${w - 60}" y2="${y}" stroke="#333" stroke-width="1"/>`;
  y += 5;
  const tableX = 60, tableW = w - 120;
  const colDesc = tableX, colAmt = tableX + tableW - 120;
  svg += `
  <rect x="${tableX}" y="${y}" width="${tableW}" height="30" fill="${color}"/>
  <text x="${colDesc + 10}" y="${y + 20}" fill="white" font-family="${font}" font-size="12" font-weight="bold">DESCRIPTION</text>
  <text x="${colAmt + 60}" y="${y + 20}" fill="white" font-family="${font}" font-size="12" font-weight="bold" text-anchor="end">AMOUNT</text>`;
  y += 30;
  const charges = [
    ["Tuition", r.tuition], ["Registration Fee", r.regFee], ["Technology Fee", r.techFee],
    ["Health Services Fee", r.healthFee], ["Student Activity Fee", r.activityFee],
    ["Laboratory Fee", r.labFee], ["Facilities Fee", r.facilitiesFee]
  ];
  charges.forEach(([desc, amt], i) => {
    const bg = i % 2 === 0 ? "#f9f6f0" : "#fffef8";
    svg += `
    <rect x="${tableX}" y="${y}" width="${tableW}" height="28" fill="${bg}" stroke="#ddd" stroke-width="0.5"/>
    <text x="${colDesc + 10}" y="${y + 19}" fill="#333" font-family="${font}" font-size="12">${desc}</text>
    <text x="${colAmt + 60}" y="${y + 19}" fill="#333" font-family="${mono}" font-size="12" text-anchor="end">$${r.fmt(amt as number)}</text>`;
    y += 28;
  });
  svg += `
  <rect x="${tableX}" y="${y}" width="${tableW}" height="32" fill="#f0ece0" stroke="#333" stroke-width="1"/>
  <text x="${colDesc + 10}" y="${y + 22}" fill="#111" font-family="${font}" font-size="13" font-weight="bold">TOTAL CHARGES</text>
  <text x="${colAmt + 60}" y="${y + 22}" fill="#111" font-family="${mono}" font-size="14" font-weight="bold" text-anchor="end">$${r.fmt(r.totalCharges)}</text>`;
  y += 50;
  svg += `
  <text x="${colDesc + 10}" y="${y}" fill="#166534" font-family="${font}" font-size="12">Financial Aid / Grant</text>
  <text x="${colAmt + 60}" y="${y}" fill="#166534" font-family="${mono}" font-size="12" text-anchor="end">-$${r.fmt(r.aid)}</text>`;
  y += 26;
  svg += `
  <text x="${colDesc + 10}" y="${y}" fill="#166534" font-family="${font}" font-size="12">Scholarship</text>
  <text x="${colAmt + 60}" y="${y}" fill="#166534" font-family="${mono}" font-size="12" text-anchor="end">-$${r.fmt(r.scholarship)}</text>`;
  y += 26;
  svg += `
  <line x1="${colAmt - 60}" y1="${y}" x2="${colAmt + 60}" y2="${y}" stroke="#333" stroke-width="1"/>`;
  y += 5;
  svg += `
  <text x="${colDesc + 10}" y="${y + 18}" fill="#166534" font-family="${font}" font-size="13" font-weight="bold">TOTAL AID APPLIED</text>
  <text x="${colAmt + 60}" y="${y + 18}" fill="#166534" font-family="${mono}" font-size="14" font-weight="bold" text-anchor="end">-$${r.fmt(r.totalAid)}</text>`;
  y += 45;
  svg += `
  <rect x="${tableX}" y="${y}" width="${tableW}" height="40" fill="${color}" rx="4"/>
  <text x="${colDesc + 15}" y="${y + 27}" fill="white" font-family="${font}" font-size="16" font-weight="bold">AMOUNT PAID</text>
  <text x="${colAmt + 55}" y="${y + 27}" fill="white" font-family="${mono}" font-size="18" font-weight="bold" text-anchor="end">$${r.fmt(r.amountPaid)}</text>`;
  y += 55;
  svg += `
  <text x="${colDesc + 10}" y="${y}" fill="#111" font-family="${font}" font-size="13" font-weight="bold">Balance Due: $${r.fmt(r.balanceDue)}</text>
  <text x="${colAmt + 60}" y="${y}" fill="#555" font-family="${font}" font-size="11" text-anchor="end">Payment Method: ${r.paymentMethod}</text>`;
  y += 40;
  svg += `
  <line x1="60" y1="${y}" x2="${w - 60}" y2="${y}" stroke="#ccc" stroke-width="0.5"/>
  <text x="${w / 2}" y="${y + 25}" fill="#999" font-family="${font}" font-size="9" text-anchor="middle" font-style="italic">This receipt is generated electronically and is valid without signature.</text>
  <text x="${w / 2}" y="${y + 42}" fill="#aaa" font-family="${font}" font-size="8" text-anchor="middle">${data.collegeName} - Office of the Bursar</text>
</svg>`;
  return svg;
}

function layoutReceiptModern(data: CardData, color: string, photo: string | null): string {
  const w = 850, h = 1100;
  const r = generateReceiptData(data);
  const font = "'Segoe UI', 'Helvetica Neue', Arial, sans-serif";
  const mono = "'Courier New', monospace";
  let y = 0;
  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" rx="16" fill="#f8fafc"/>
  <rect x="0" y="0" width="${w}" height="120" rx="16" fill="${color}"/>
  <rect x="0" y="16" width="${w}" height="104" fill="${color}"/>
  <text x="40" y="50" fill="white" font-family="${font}" font-size="24" font-weight="700">${data.collegeName}</text>
  <text x="40" y="75" fill="rgba(255,255,255,0.8)" font-family="${font}" font-size="12">Student Financial Services</text>
  <rect x="${w - 200}" y="30" width="160" height="60" rx="12" fill="rgba(255,255,255,0.2)"/>
  <text x="${w - 120}" y="55" fill="white" font-family="${font}" font-size="10" text-anchor="middle" letter-spacing="2">RECEIPT</text>
  <text x="${w - 120}" y="78" fill="white" font-family="${mono}" font-size="13" text-anchor="middle" font-weight="bold">${r.receiptNum}</text>`;
  y = 150;
  svg += `
  <rect x="30" y="${y}" width="${w - 60}" height="120" rx="12" fill="white" stroke="#e2e8f0" stroke-width="1"/>
  <text x="55" y="${y + 28}" fill="#94a3b8" font-family="${font}" font-size="10" letter-spacing="1">STUDENT</text>
  <text x="55" y="${y + 50}" fill="#1e293b" font-family="${font}" font-size="18" font-weight="600">${data.name}</text>
  <text x="55" y="${y + 72}" fill="#64748b" font-family="${font}" font-size="12">${data.department}</text>
  <text x="55" y="${y + 95}" fill="#94a3b8" font-family="${font}" font-size="11">ID: ${data.studentId}  |  Account: ${r.accountNum}</text>
  <text x="${w - 55}" y="${y + 50}" fill="#64748b" font-family="${font}" font-size="11" text-anchor="end">${r.semester} ${r.academicYear}</text>
  <text x="${w - 55}" y="${y + 72}" fill="#64748b" font-family="${font}" font-size="11" text-anchor="end">Date: ${r.paymentDate}</text>`;
  y += 145;
  svg += `
  <text x="45" y="${y}" fill="#475569" font-family="${font}" font-size="14" font-weight="600">Charges</text>`;
  y += 15;
  const charges: [string, number][] = [
    ["Tuition", r.tuition], ["Registration Fee", r.regFee], ["Technology Fee", r.techFee],
    ["Health Services Fee", r.healthFee], ["Student Activity Fee", r.activityFee],
    ["Laboratory Fee", r.labFee], ["Facilities Fee", r.facilitiesFee]
  ];
  charges.forEach(([desc, amt]) => {
    svg += `
    <rect x="30" y="${y}" width="${w - 60}" height="36" rx="8" fill="white" stroke="#f1f5f9" stroke-width="1"/>
    <text x="55" y="${y + 23}" fill="#334155" font-family="${font}" font-size="13">${desc}</text>
    <text x="${w - 55}" y="${y + 23}" fill="#334155" font-family="${mono}" font-size="13" text-anchor="end">$${r.fmt(amt)}</text>`;
    y += 40;
  });
  svg += `
  <rect x="30" y="${y}" width="${w - 60}" height="40" rx="8" fill="#f1f5f9"/>
  <text x="55" y="${y + 26}" fill="#1e293b" font-family="${font}" font-size="14" font-weight="700">Total Charges</text>
  <text x="${w - 55}" y="${y + 26}" fill="#1e293b" font-family="${mono}" font-size="15" font-weight="700" text-anchor="end">$${r.fmt(r.totalCharges)}</text>`;
  y += 60;
  svg += `
  <text x="45" y="${y}" fill="#166534" font-family="${font}" font-size="14" font-weight="600">Aid & Scholarships</text>`;
  y += 15;
  svg += `
  <rect x="30" y="${y}" width="${w - 60}" height="36" rx="8" fill="#f0fdf4" stroke="#bbf7d0" stroke-width="1"/>
  <text x="55" y="${y + 23}" fill="#166534" font-family="${font}" font-size="13">Financial Aid / Grant</text>
  <text x="${w - 55}" y="${y + 23}" fill="#166534" font-family="${mono}" font-size="13" text-anchor="end">-$${r.fmt(r.aid)}</text>`;
  y += 40;
  svg += `
  <rect x="30" y="${y}" width="${w - 60}" height="36" rx="8" fill="#f0fdf4" stroke="#bbf7d0" stroke-width="1"/>
  <text x="55" y="${y + 23}" fill="#166534" font-family="${font}" font-size="13">Scholarship</text>
  <text x="${w - 55}" y="${y + 23}" fill="#166534" font-family="${mono}" font-size="13" text-anchor="end">-$${r.fmt(r.scholarship)}</text>`;
  y += 55;
  svg += `
  <rect x="30" y="${y}" width="${w - 60}" height="55" rx="12" fill="${color}"/>
  <text x="55" y="${y + 25}" fill="rgba(255,255,255,0.8)" font-family="${font}" font-size="11" letter-spacing="1">AMOUNT PAID</text>
  <text x="${w - 55}" y="${y + 38}" fill="white" font-family="${mono}" font-size="22" font-weight="700" text-anchor="end">$${r.fmt(r.amountPaid)}</text>`;
  y += 70;
  svg += `
  <rect x="30" y="${y}" width="${(w - 60) / 2 - 10}" height="50" rx="10" fill="white" stroke="#e2e8f0" stroke-width="1"/>
  <text x="50" y="${y + 22}" fill="#94a3b8" font-family="${font}" font-size="10">BALANCE DUE</text>
  <text x="50" y="${y + 42}" fill="#1e293b" font-family="${mono}" font-size="16" font-weight="700">$${r.fmt(r.balanceDue)}</text>
  <rect x="${30 + (w - 60) / 2 + 10}" y="${y}" width="${(w - 60) / 2 - 10}" height="50" rx="10" fill="white" stroke="#e2e8f0" stroke-width="1"/>
  <text x="${40 + (w - 60) / 2 + 10}" y="${y + 22}" fill="#94a3b8" font-family="${font}" font-size="10">PAYMENT METHOD</text>
  <text x="${40 + (w - 60) / 2 + 10}" y="${y + 42}" fill="#334155" font-family="${font}" font-size="13">${r.paymentMethod}</text>`;
  y += 75;
  svg += `
  <text x="${w / 2}" y="${y}" fill="#cbd5e1" font-family="${font}" font-size="9" text-anchor="middle">This is an electronically generated receipt. ${data.collegeName}</text>
</svg>`;
  return svg;
}

function layoutReceiptInvoice(data: CardData, color: string, photo: string | null): string {
  const w = 850, h = 1100;
  const r = generateReceiptData(data);
  const font = "Arial, Helvetica, sans-serif";
  const mono = "'Courier New', monospace";
  let y = 0;
  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="#ffffff"/>
  <text x="50" y="65" fill="#111" font-family="${font}" font-size="36" font-weight="900" letter-spacing="-1">INVOICE</text>
  <rect x="50" y="80" width="120" height="4" fill="${color}"/>
  <text x="${w - 50}" y="45" fill="#888" font-family="${font}" font-size="10" text-anchor="end" letter-spacing="1">INVOICE NUMBER</text>
  <text x="${w - 50}" y="68" fill="#111" font-family="${mono}" font-size="18" text-anchor="end" font-weight="bold">${r.invoiceNum}</text>
  <text x="${w - 50}" y="90" fill="#888" font-family="${font}" font-size="10" text-anchor="end">Date: ${r.paymentDate}</text>`;
  y = 130;
  svg += `
  <rect x="50" y="${y}" width="350" height="110" fill="#f7f7f7" rx="4"/>
  <text x="70" y="${y + 22}" fill="#888" font-family="${font}" font-size="9" letter-spacing="1">FROM</text>
  <text x="70" y="${y + 42}" fill="#111" font-family="${font}" font-size="14" font-weight="bold">${data.collegeName}</text>
  <text x="70" y="${y + 60}" fill="#555" font-family="${font}" font-size="11">Office of the Bursar</text>
  <text x="70" y="${y + 78}" fill="#555" font-family="${font}" font-size="11">Financial Services Department</text>
  <text x="70" y="${y + 96}" fill="#555" font-family="${font}" font-size="11">Receipt #${r.receiptNum}</text>`;
  svg += `
  <rect x="${w - 400}" y="${y}" width="350" height="110" fill="#f7f7f7" rx="4"/>
  <text x="${w - 380}" y="${y + 22}" fill="#888" font-family="${font}" font-size="9" letter-spacing="1">BILL TO</text>
  <text x="${w - 380}" y="${y + 42}" fill="#111" font-family="${font}" font-size="14" font-weight="bold">${data.name}</text>
  <text x="${w - 380}" y="${y + 60}" fill="#555" font-family="${font}" font-size="11">ID: ${data.studentId}</text>
  <text x="${w - 380}" y="${y + 78}" fill="#555" font-family="${font}" font-size="11">${data.department}</text>
  <text x="${w - 380}" y="${y + 96}" fill="#555" font-family="${font}" font-size="11">Account: ${r.accountNum}</text>`;
  y += 130;
  svg += `
  <text x="50" y="${y + 10}" fill="#888" font-family="${font}" font-size="11">Period: ${r.semester} ${r.academicYear}</text>`;
  y += 35;
  svg += `
  <rect x="50" y="${y}" width="${w - 100}" height="32" fill="${color}"/>
  <text x="70" y="${y + 21}" fill="white" font-family="${font}" font-size="11" font-weight="bold">ITEM DESCRIPTION</text>
  <text x="${w - 70}" y="${y + 21}" fill="white" font-family="${font}" font-size="11" font-weight="bold" text-anchor="end">AMOUNT (USD)</text>`;
  y += 32;
  const items: [string, number][] = [
    ["Tuition - Full Time Enrollment", r.tuition], ["Registration Fee", r.regFee],
    ["Technology Fee", r.techFee], ["Health Services Fee", r.healthFee],
    ["Student Activity Fee", r.activityFee], ["Laboratory Fee", r.labFee], ["Facilities Fee", r.facilitiesFee]
  ];
  items.forEach(([desc, amt], i) => {
    const bg = i % 2 === 0 ? "#fafafa" : "#ffffff";
    svg += `
    <rect x="50" y="${y}" width="${w - 100}" height="30" fill="${bg}"/>
    <text x="70" y="${y + 20}" fill="#333" font-family="${font}" font-size="12">${desc}</text>
    <text x="${w - 70}" y="${y + 20}" fill="#333" font-family="${mono}" font-size="12" text-anchor="end">$${r.fmt(amt)}</text>`;
    y += 30;
  });
  svg += `
  <line x1="50" y1="${y}" x2="${w - 50}" y2="${y}" stroke="#ddd" stroke-width="1"/>`;
  y += 5;
  svg += `
  <text x="${w - 250}" y="${y + 18}" fill="#333" font-family="${font}" font-size="12">Subtotal</text>
  <text x="${w - 70}" y="${y + 18}" fill="#333" font-family="${mono}" font-size="12" text-anchor="end">$${r.fmt(r.totalCharges)}</text>`;
  y += 30;
  svg += `
  <text x="${w - 250}" y="${y + 18}" fill="#166534" font-family="${font}" font-size="12">Financial Aid</text>
  <text x="${w - 70}" y="${y + 18}" fill="#166534" font-family="${mono}" font-size="12" text-anchor="end">-$${r.fmt(r.aid)}</text>`;
  y += 25;
  svg += `
  <text x="${w - 250}" y="${y + 18}" fill="#166534" font-family="${font}" font-size="12">Scholarship</text>
  <text x="${w - 70}" y="${y + 18}" fill="#166534" font-family="${mono}" font-size="12" text-anchor="end">-$${r.fmt(r.scholarship)}</text>`;
  y += 30;
  svg += `
  <line x1="${w - 260}" y1="${y}" x2="${w - 50}" y2="${y}" stroke="#333" stroke-width="1"/>`;
  y += 8;
  svg += `
  <rect x="${w - 270}" y="${y}" width="220" height="40" fill="${color}" rx="4"/>
  <text x="${w - 255}" y="${y + 27}" fill="white" font-family="${font}" font-size="14" font-weight="bold">TOTAL DUE</text>
  <text x="${w - 65}" y="${y + 27}" fill="white" font-family="${mono}" font-size="16" font-weight="bold" text-anchor="end">$${r.fmt(r.amountPaid)}</text>`;
  y += 60;
  svg += `
  <text x="50" y="${y}" fill="#333" font-family="${font}" font-size="12"><tspan font-weight="bold">Payment Method:</tspan> ${r.paymentMethod}</text>
  <text x="50" y="${y + 22}" fill="#333" font-family="${font}" font-size="12"><tspan font-weight="bold">Amount Paid:</tspan> $${r.fmt(r.amountPaid)}</text>
  <text x="50" y="${y + 44}" fill="#333" font-family="${font}" font-size="12"><tspan font-weight="bold">Balance Due:</tspan> $${r.fmt(r.balanceDue)}</text>`;
  y += 80;
  svg += `
  <rect x="50" y="${y}" width="${w - 100}" height="1" fill="#eee"/>
  <text x="${w / 2}" y="${y + 25}" fill="#bbb" font-family="${font}" font-size="9" text-anchor="middle">Thank you for your payment. ${data.collegeName}</text>
</svg>`;
  return svg;
}

function layoutReceiptMinimal(data: CardData, color: string, photo: string | null): string {
  const w = 850, h = 1100;
  const r = generateReceiptData(data);
  const font = "'Helvetica Neue', Helvetica, Arial, sans-serif";
  const mono = "'Courier New', monospace";
  let y = 80;
  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="#ffffff"/>
  <text x="80" y="${y}" fill="#111" font-family="${font}" font-size="11" font-weight="300" letter-spacing="6">${data.collegeName.toUpperCase()}</text>`;
  y += 50;
  svg += `
  <text x="80" y="${y}" fill="#ccc" font-family="${font}" font-size="9" letter-spacing="4" font-weight="300">TUITION RECEIPT</text>`;
  y += 50;
  svg += `
  <text x="80" y="${y}" fill="#111" font-family="${font}" font-size="30" font-weight="100">${data.name}</text>`;
  y += 20;
  svg += `<line x1="80" y1="${y}" x2="400" y2="${y}" stroke="#f0f0f0" stroke-width="0.5"/>`;
  y += 35;
  svg += `
  <text x="80" y="${y}" fill="#ccc" font-family="${font}" font-size="8" letter-spacing="3">ID</text>
  <text x="180" y="${y}" fill="#555" font-family="${font}" font-size="13" font-weight="200">${data.studentId}</text>
  <text x="380" y="${y}" fill="#ccc" font-family="${font}" font-size="8" letter-spacing="3">DEPT</text>
  <text x="440" y="${y}" fill="#555" font-family="${font}" font-size="13" font-weight="200">${data.department}</text>`;
  y += 30;
  svg += `
  <text x="80" y="${y}" fill="#ccc" font-family="${font}" font-size="8" letter-spacing="3">SEMESTER</text>
  <text x="180" y="${y}" fill="#555" font-family="${font}" font-size="13" font-weight="200">${r.semester} ${r.academicYear}</text>
  <text x="380" y="${y}" fill="#ccc" font-family="${font}" font-size="8" letter-spacing="3">DATE</text>
  <text x="440" y="${y}" fill="#555" font-family="${font}" font-size="13" font-weight="200">${r.paymentDate}</text>`;
  y += 30;
  svg += `
  <text x="80" y="${y}" fill="#ccc" font-family="${font}" font-size="8" letter-spacing="3">RECEIPT</text>
  <text x="180" y="${y}" fill="#555" font-family="${font}" font-size="13" font-weight="200">${r.receiptNum}</text>
  <text x="380" y="${y}" fill="#ccc" font-family="${font}" font-size="8" letter-spacing="3">ACCOUNT</text>
  <text x="440" y="${y}" fill="#555" font-family="${font}" font-size="13" font-weight="200">${r.accountNum}</text>`;
  y += 55;
  const items: [string, number][] = [
    ["Tuition", r.tuition], ["Registration", r.regFee], ["Technology", r.techFee],
    ["Health Services", r.healthFee], ["Activity", r.activityFee],
    ["Laboratory", r.labFee], ["Facilities", r.facilitiesFee]
  ];
  items.forEach(([desc, amt]) => {
    svg += `
    <text x="80" y="${y}" fill="#888" font-family="${font}" font-size="13" font-weight="300">${desc}</text>
    <text x="${w - 80}" y="${y}" fill="#444" font-family="${font}" font-size="13" font-weight="300" text-anchor="end">$${r.fmt(amt)}</text>`;
    y += 32;
  });
  svg += `<line x1="80" y1="${y}" x2="${w - 80}" y2="${y}" stroke="#f0f0f0" stroke-width="0.5"/>`;
  y += 25;
  svg += `
  <text x="80" y="${y}" fill="#555" font-family="${font}" font-size="14" font-weight="400">Total Charges</text>
  <text x="${w - 80}" y="${y}" fill="#333" font-family="${font}" font-size="14" font-weight="400" text-anchor="end">$${r.fmt(r.totalCharges)}</text>`;
  y += 45;
  svg += `
  <text x="80" y="${y}" fill="#22c55e" font-family="${font}" font-size="13" font-weight="300">Financial Aid</text>
  <text x="${w - 80}" y="${y}" fill="#22c55e" font-family="${font}" font-size="13" font-weight="300" text-anchor="end">-$${r.fmt(r.aid)}</text>`;
  y += 30;
  svg += `
  <text x="80" y="${y}" fill="#22c55e" font-family="${font}" font-size="13" font-weight="300">Scholarship</text>
  <text x="${w - 80}" y="${y}" fill="#22c55e" font-family="${font}" font-size="13" font-weight="300" text-anchor="end">-$${r.fmt(r.scholarship)}</text>`;
  y += 50;
  svg += `<line x1="80" y1="${y}" x2="${w - 80}" y2="${y}" stroke="#f0f0f0" stroke-width="0.5"/>`;
  y += 35;
  svg += `
  <text x="80" y="${y}" fill="#111" font-family="${font}" font-size="22" font-weight="100">Amount Paid</text>
  <text x="${w - 80}" y="${y}" fill="${color}" font-family="${font}" font-size="22" font-weight="400" text-anchor="end">$${r.fmt(r.amountPaid)}</text>`;
  y += 35;
  svg += `
  <text x="80" y="${y}" fill="#bbb" font-family="${font}" font-size="11" font-weight="300">Balance Due: $${r.fmt(r.balanceDue)}</text>
  <text x="${w - 80}" y="${y}" fill="#bbb" font-family="${font}" font-size="11" font-weight="300" text-anchor="end">${r.paymentMethod}</text>`;
  y += 60;
  svg += `
  <text x="${w / 2}" y="${y}" fill="#ddd" font-family="${font}" font-size="8" text-anchor="middle" font-weight="300">${data.collegeName}</text>
</svg>`;
  return svg;
}

function layoutReceiptDark(data: CardData, color: string, photo: string | null): string {
  const w = 850, h = 1100;
  const r = generateReceiptData(data);
  const font = "'Segoe UI', Arial, sans-serif";
  const mono = "'Courier New', monospace";
  let y = 0;
  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" rx="12" fill="#0f172a"/>
  <rect x="0" y="0" width="${w}" height="100" rx="12" fill="#1e293b"/>
  <rect x="0" y="12" width="${w}" height="88" fill="#1e293b"/>
  <text x="40" y="45" fill="#f8fafc" font-family="${font}" font-size="22" font-weight="700">${data.collegeName}</text>
  <text x="40" y="70" fill="#94a3b8" font-family="${font}" font-size="11">Tuition Payment Receipt</text>
  <text x="${w - 40}" y="45" fill="${color}" font-family="${mono}" font-size="16" text-anchor="end" font-weight="bold">${r.receiptNum}</text>
  <text x="${w - 40}" y="70" fill="#64748b" font-family="${font}" font-size="11" text-anchor="end">${r.paymentDate}</text>`;
  y = 130;
  svg += `
  <rect x="30" y="${y}" width="${w - 60}" height="80" rx="8" fill="#1e293b"/>
  <text x="55" y="${y + 25}" fill="#94a3b8" font-family="${font}" font-size="10" letter-spacing="1">STUDENT</text>
  <text x="55" y="${y + 48}" fill="#e2e8f0" font-family="${font}" font-size="16" font-weight="600">${data.name}</text>
  <text x="55" y="${y + 68}" fill="#64748b" font-family="${font}" font-size="11">${data.studentId} | ${data.department} | ${r.semester} ${r.academicYear}</text>
  <text x="${w - 55}" y="${y + 48}" fill="#64748b" font-family="${font}" font-size="11" text-anchor="end">Acct: ${r.accountNum}</text>`;
  y += 110;
  svg += `
  <text x="45" y="${y}" fill="${color}" font-family="${font}" font-size="13" font-weight="600" letter-spacing="1">CHARGES</text>`;
  y += 20;
  const items: [string, number][] = [
    ["Tuition", r.tuition], ["Registration Fee", r.regFee], ["Technology Fee", r.techFee],
    ["Health Services Fee", r.healthFee], ["Student Activity Fee", r.activityFee],
    ["Laboratory Fee", r.labFee], ["Facilities Fee", r.facilitiesFee]
  ];
  items.forEach(([desc, amt]) => {
    svg += `
    <rect x="30" y="${y}" width="${w - 60}" height="36" rx="6" fill="#1e293b"/>
    <text x="55" y="${y + 24}" fill="#cbd5e1" font-family="${font}" font-size="13">${desc}</text>
    <text x="${w - 55}" y="${y + 24}" fill="#e2e8f0" font-family="${mono}" font-size="13" text-anchor="end">$${r.fmt(amt)}</text>`;
    y += 40;
  });
  svg += `
  <rect x="30" y="${y}" width="${w - 60}" height="38" rx="6" fill="#334155"/>
  <text x="55" y="${y + 25}" fill="#f8fafc" font-family="${font}" font-size="14" font-weight="700">Total Charges</text>
  <text x="${w - 55}" y="${y + 25}" fill="#f8fafc" font-family="${mono}" font-size="15" font-weight="700" text-anchor="end">$${r.fmt(r.totalCharges)}</text>`;
  y += 58;
  svg += `
  <text x="45" y="${y}" fill="#4ade80" font-family="${font}" font-size="13" font-weight="600" letter-spacing="1">AID & SCHOLARSHIPS</text>`;
  y += 20;
  svg += `
  <rect x="30" y="${y}" width="${w - 60}" height="36" rx="6" fill="rgba(34,197,94,0.1)"/>
  <text x="55" y="${y + 24}" fill="#4ade80" font-family="${font}" font-size="13">Financial Aid</text>
  <text x="${w - 55}" y="${y + 24}" fill="#4ade80" font-family="${mono}" font-size="13" text-anchor="end">-$${r.fmt(r.aid)}</text>`;
  y += 40;
  svg += `
  <rect x="30" y="${y}" width="${w - 60}" height="36" rx="6" fill="rgba(34,197,94,0.1)"/>
  <text x="55" y="${y + 24}" fill="#4ade80" font-family="${font}" font-size="13">Scholarship</text>
  <text x="${w - 55}" y="${y + 24}" fill="#4ade80" font-family="${mono}" font-size="13" text-anchor="end">-$${r.fmt(r.scholarship)}</text>`;
  y += 60;
  svg += `
  <rect x="30" y="${y}" width="${w - 60}" height="60" rx="10" fill="${color}"/>
  <text x="55" y="${y + 25}" fill="rgba(255,255,255,0.7)" font-family="${font}" font-size="11" letter-spacing="1">AMOUNT PAID</text>
  <text x="${w - 55}" y="${y + 42}" fill="white" font-family="${mono}" font-size="26" font-weight="700" text-anchor="end">$${r.fmt(r.amountPaid)}</text>`;
  y += 80;
  svg += `
  <text x="55" y="${y}" fill="#64748b" font-family="${font}" font-size="12">Balance Due: <tspan fill="#e2e8f0" font-weight="600">$${r.fmt(r.balanceDue)}</tspan></text>
  <text x="${w - 55}" y="${y}" fill="#64748b" font-family="${font}" font-size="12" text-anchor="end">${r.paymentMethod}</text>`;
  y += 50;
  svg += `
  <text x="${w / 2}" y="${y}" fill="#334155" font-family="${font}" font-size="9" text-anchor="middle">${data.collegeName} - Electronic Receipt</text>
</svg>`;
  return svg;
}

function layoutReceiptStatement(data: CardData, color: string, photo: string | null): string {
  const w = 850, h = 1100;
  const r = generateReceiptData(data);
  const font = "'Times New Roman', Georgia, serif";
  const mono = "'Courier New', monospace";
  let y = 60;
  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="#fff"/>
  <text x="${w / 2}" y="${y}" fill="#111" font-family="${font}" font-size="24" text-anchor="middle" font-weight="bold">${data.collegeName}</text>`;
  y += 22;
  svg += `<text x="${w / 2}" y="${y}" fill="#666" font-family="${font}" font-size="12" text-anchor="middle">STUDENT ACCOUNT STATEMENT</text>`;
  y += 15;
  svg += `<line x1="40" y1="${y}" x2="${w - 40}" y2="${y}" stroke="#111" stroke-width="2"/>`;
  y += 5;
  svg += `<line x1="40" y1="${y}" x2="${w - 40}" y2="${y}" stroke="#111" stroke-width="0.5"/>`;
  y += 30;
  svg += `
  <text x="50" y="${y}" fill="#333" font-family="${font}" font-size="12">Account Holder: <tspan font-weight="bold">${data.name}</tspan></text>
  <text x="${w - 50}" y="${y}" fill="#333" font-family="${font}" font-size="12" text-anchor="end">Statement Date: ${r.paymentDate}</text>`;
  y += 22;
  svg += `
  <text x="50" y="${y}" fill="#333" font-family="${font}" font-size="12">Student ID: ${data.studentId}</text>
  <text x="${w - 50}" y="${y}" fill="#333" font-family="${font}" font-size="12" text-anchor="end">Account: ${r.accountNum}</text>`;
  y += 22;
  svg += `
  <text x="50" y="${y}" fill="#333" font-family="${font}" font-size="12">Department: ${data.department}</text>
  <text x="${w - 50}" y="${y}" fill="#333" font-family="${font}" font-size="12" text-anchor="end">Period: ${r.semester} ${r.academicYear}</text>`;
  y += 22;
  svg += `
  <text x="50" y="${y}" fill="#333" font-family="${font}" font-size="12">Receipt: ${r.receiptNum}</text>`;
  y += 15;
  svg += `<line x1="40" y1="${y}" x2="${w - 40}" y2="${y}" stroke="#333" stroke-width="1"/>`;
  y += 30;
  svg += `
  <text x="50" y="${y}" fill="#111" font-family="${font}" font-size="14" font-weight="bold">TRANSACTION DETAIL</text>`;
  y += 15;
  svg += `<line x1="40" y1="${y}" x2="${w - 40}" y2="${y}" stroke="#999" stroke-width="0.5"/>`;
  y += 5;
  svg += `
  <text x="50" y="${y + 15}" fill="#666" font-family="${font}" font-size="10">DATE</text>
  <text x="160" y="${y + 15}" fill="#666" font-family="${font}" font-size="10">DESCRIPTION</text>
  <text x="${w - 200}" y="${y + 15}" fill="#666" font-family="${font}" font-size="10" text-anchor="end">CHARGES</text>
  <text x="${w - 50}" y="${y + 15}" fill="#666" font-family="${font}" font-size="10" text-anchor="end">CREDITS</text>`;
  y += 20;
  svg += `<line x1="40" y1="${y}" x2="${w - 40}" y2="${y}" stroke="#ccc" stroke-width="0.5"/>`;
  y += 5;
  const items: [string, number][] = [
    ["Tuition", r.tuition], ["Registration Fee", r.regFee], ["Technology Fee", r.techFee],
    ["Health Services Fee", r.healthFee], ["Student Activity Fee", r.activityFee],
    ["Laboratory Fee", r.labFee], ["Facilities Fee", r.facilitiesFee]
  ];
  items.forEach(([desc, amt]) => {
    svg += `
    <text x="50" y="${y + 16}" fill="#333" font-family="${font}" font-size="12">${r.paymentDate}</text>
    <text x="160" y="${y + 16}" fill="#333" font-family="${font}" font-size="12">${desc}</text>
    <text x="${w - 200}" y="${y + 16}" fill="#333" font-family="${mono}" font-size="12" text-anchor="end">$${r.fmt(amt)}</text>`;
    y += 24;
    svg += `<line x1="40" y1="${y}" x2="${w - 40}" y2="${y}" stroke="#eee" stroke-width="0.5"/>`;
  });
  y += 5;
  svg += `
  <text x="160" y="${y + 16}" fill="#333" font-family="${font}" font-size="12">Financial Aid / Grant</text>
  <text x="${w - 50}" y="${y + 16}" fill="#166534" font-family="${mono}" font-size="12" text-anchor="end">$${r.fmt(r.aid)}</text>`;
  y += 24;
  svg += `<line x1="40" y1="${y}" x2="${w - 40}" y2="${y}" stroke="#eee" stroke-width="0.5"/>`;
  svg += `
  <text x="160" y="${y + 16}" fill="#333" font-family="${font}" font-size="12">Scholarship Award</text>
  <text x="${w - 50}" y="${y + 16}" fill="#166534" font-family="${mono}" font-size="12" text-anchor="end">$${r.fmt(r.scholarship)}</text>`;
  y += 30;
  svg += `<line x1="40" y1="${y}" x2="${w - 40}" y2="${y}" stroke="#111" stroke-width="1.5"/>`;
  y += 25;
  svg += `
  <text x="160" y="${y}" fill="#111" font-family="${font}" font-size="13" font-weight="bold">Total Charges</text>
  <text x="${w - 200}" y="${y}" fill="#111" font-family="${mono}" font-size="13" font-weight="bold" text-anchor="end">$${r.fmt(r.totalCharges)}</text>`;
  y += 24;
  svg += `
  <text x="160" y="${y}" fill="#166534" font-family="${font}" font-size="13" font-weight="bold">Total Credits</text>
  <text x="${w - 50}" y="${y}" fill="#166534" font-family="${mono}" font-size="13" font-weight="bold" text-anchor="end">$${r.fmt(r.totalAid)}</text>`;
  y += 30;
  svg += `<line x1="40" y1="${y}" x2="${w - 40}" y2="${y}" stroke="#111" stroke-width="2"/>`;
  y += 5;
  svg += `<line x1="40" y1="${y}" x2="${w - 40}" y2="${y}" stroke="#111" stroke-width="0.5"/>`;
  y += 25;
  svg += `
  <text x="50" y="${y}" fill="#111" font-family="${font}" font-size="16" font-weight="bold">AMOUNT PAID: $${r.fmt(r.amountPaid)}</text>
  <text x="${w - 50}" y="${y}" fill="#111" font-family="${font}" font-size="14" text-anchor="end">BALANCE DUE: $${r.fmt(r.balanceDue)}</text>`;
  y += 30;
  svg += `
  <text x="50" y="${y}" fill="#555" font-family="${font}" font-size="12">Payment Method: ${r.paymentMethod}</text>`;
  y += 50;
  svg += `<line x1="40" y1="${y}" x2="${w - 40}" y2="${y}" stroke="#ccc" stroke-width="0.5"/>`;
  y += 20;
  svg += `
  <text x="${w / 2}" y="${y}" fill="#999" font-family="${font}" font-size="9" text-anchor="middle" font-style="italic">This statement is provided for informational purposes. ${data.collegeName}</text>
</svg>`;
  return svg;
}

function layoutReceiptCompact(data: CardData, color: string, photo: string | null): string {
  const w = 850, h = 1100;
  const r = generateReceiptData(data);
  const font = "Verdana, Geneva, sans-serif";
  const mono = "'Courier New', monospace";
  let y = 30;
  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="#fff"/>
  <rect x="0" y="0" width="${w}" height="50" fill="${color}"/>
  <text x="15" y="32" fill="white" font-family="${font}" font-size="14" font-weight="bold">${data.collegeName}</text>
  <text x="${w - 15}" y="22" fill="rgba(255,255,255,0.9)" font-family="${font}" font-size="9" text-anchor="end">TUITION RECEIPT</text>
  <text x="${w - 15}" y="38" fill="rgba(255,255,255,0.7)" font-family="${mono}" font-size="10" text-anchor="end">${r.receiptNum}</text>`;
  y = 55;
  svg += `
  <rect x="0" y="${y}" width="${w}" height="55" fill="#f8f8f8" stroke="#eee" stroke-width="0.5"/>
  <text x="15" y="${y + 15}" fill="#999" font-family="${font}" font-size="7" letter-spacing="1">STUDENT</text>
  <text x="15" y="${y + 30}" fill="#111" font-family="${font}" font-size="11" font-weight="bold">${data.name}</text>
  <text x="15" y="${y + 45}" fill="#666" font-family="${font}" font-size="9">${data.studentId} | ${data.department}</text>
  <text x="300" y="${y + 15}" fill="#999" font-family="${font}" font-size="7" letter-spacing="1">SEMESTER</text>
  <text x="300" y="${y + 30}" fill="#111" font-family="${font}" font-size="10">${r.semester} ${r.academicYear}</text>
  <text x="500" y="${y + 15}" fill="#999" font-family="${font}" font-size="7" letter-spacing="1">DATE</text>
  <text x="500" y="${y + 30}" fill="#111" font-family="${font}" font-size="10">${r.paymentDate}</text>
  <text x="650" y="${y + 15}" fill="#999" font-family="${font}" font-size="7" letter-spacing="1">ACCOUNT</text>
  <text x="650" y="${y + 30}" fill="#111" font-family="${font}" font-size="10">${r.accountNum}</text>`;
  y += 60;
  svg += `
  <rect x="0" y="${y}" width="${w}" height="22" fill="${color}"/>
  <text x="15" y="${y + 15}" fill="white" font-family="${font}" font-size="8" font-weight="bold" letter-spacing="1">CHARGE DESCRIPTION</text>
  <text x="${w - 15}" y="${y + 15}" fill="white" font-family="${font}" font-size="8" font-weight="bold" text-anchor="end">AMOUNT</text>`;
  y += 22;
  const items: [string, number][] = [
    ["Tuition", r.tuition], ["Registration", r.regFee], ["Technology", r.techFee],
    ["Health Svcs", r.healthFee], ["Activity", r.activityFee],
    ["Lab", r.labFee], ["Facilities", r.facilitiesFee]
  ];
  items.forEach(([desc, amt], i) => {
    const bg = i % 2 === 0 ? "#fff" : "#fafafa";
    svg += `
    <rect x="0" y="${y}" width="${w}" height="20" fill="${bg}"/>
    <text x="15" y="${y + 14}" fill="#333" font-family="${font}" font-size="10">${desc}</text>
    <text x="${w - 15}" y="${y + 14}" fill="#333" font-family="${mono}" font-size="10" text-anchor="end">$${r.fmt(amt)}</text>`;
    y += 20;
  });
  svg += `
  <rect x="0" y="${y}" width="${w}" height="22" fill="#eee"/>
  <text x="15" y="${y + 15}" fill="#111" font-family="${font}" font-size="10" font-weight="bold">TOTAL CHARGES</text>
  <text x="${w - 15}" y="${y + 15}" fill="#111" font-family="${mono}" font-size="11" font-weight="bold" text-anchor="end">$${r.fmt(r.totalCharges)}</text>`;
  y += 28;
  svg += `
  <text x="15" y="${y + 12}" fill="#166534" font-family="${font}" font-size="9">Financial Aid</text>
  <text x="${w - 15}" y="${y + 12}" fill="#166534" font-family="${mono}" font-size="9" text-anchor="end">-$${r.fmt(r.aid)}</text>`;
  y += 18;
  svg += `
  <text x="15" y="${y + 12}" fill="#166534" font-family="${font}" font-size="9">Scholarship</text>
  <text x="${w - 15}" y="${y + 12}" fill="#166534" font-family="${mono}" font-size="9" text-anchor="end">-$${r.fmt(r.scholarship)}</text>`;
  y += 25;
  svg += `
  <rect x="0" y="${y}" width="${w}" height="28" fill="${color}"/>
  <text x="15" y="${y + 19}" fill="white" font-family="${font}" font-size="11" font-weight="bold">AMOUNT PAID</text>
  <text x="${w - 15}" y="${y + 19}" fill="white" font-family="${mono}" font-size="13" font-weight="bold" text-anchor="end">$${r.fmt(r.amountPaid)}</text>`;
  y += 33;
  svg += `
  <text x="15" y="${y + 12}" fill="#555" font-family="${font}" font-size="9">Balance Due: $${r.fmt(r.balanceDue)}  |  ${r.paymentMethod}</text>`;
  y += 35;
  svg += `
  <text x="${w / 2}" y="${y}" fill="#ccc" font-family="${font}" font-size="7" text-anchor="middle">${data.collegeName} Financial Services</text>
</svg>`;
  return svg;
}

function layoutReceiptBanded(data: CardData, color: string, photo: string | null): string {
  const w = 850, h = 1100;
  const r = generateReceiptData(data);
  const font = "'Trebuchet MS', Arial, sans-serif";
  const mono = "'Courier New', monospace";
  let y = 0;
  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="#fafbfc"/>
  <rect x="0" y="0" width="${w}" height="90" fill="${color}"/>
  <text x="${w / 2}" y="40" fill="white" font-family="${font}" font-size="22" font-weight="bold" text-anchor="middle">${data.collegeName}</text>
  <text x="${w / 2}" y="65" fill="rgba(255,255,255,0.8)" font-family="${font}" font-size="13" text-anchor="middle" letter-spacing="3">TUITION PAYMENT RECEIPT</text>
  <text x="${w / 2}" y="82" fill="rgba(255,255,255,0.5)" font-family="${font}" font-size="10" text-anchor="middle">${r.receiptNum}</text>`;
  y = 110;
  const bandColors = ["#e8f4fd", "#fef3e2", "#e8fde8", "#fce8f4", "#f0e8fd", "#fde8e8", "#e8fdfa"];
  svg += `
  <rect x="30" y="${y}" width="${w - 60}" height="90" rx="10" fill="white" stroke="#e2e8f0" stroke-width="1"/>
  <text x="55" y="${y + 22}" fill="#94a3b8" font-family="${font}" font-size="9" letter-spacing="1">STUDENT INFO</text>
  <text x="55" y="${y + 44}" fill="#1e293b" font-family="${font}" font-size="16" font-weight="600">${data.name}</text>
  <text x="55" y="${y + 64}" fill="#64748b" font-family="${font}" font-size="11">ID: ${data.studentId} | ${data.department} | ${r.semester} ${r.academicYear}</text>
  <text x="55" y="${y + 80}" fill="#94a3b8" font-family="${font}" font-size="10">Account: ${r.accountNum} | Date: ${r.paymentDate}</text>`;
  y += 115;
  svg += `<text x="45" y="${y}" fill="#475569" font-family="${font}" font-size="13" font-weight="700">Itemized Charges</text>`;
  y += 15;
  const items: [string, number][] = [
    ["Tuition", r.tuition], ["Registration Fee", r.regFee], ["Technology Fee", r.techFee],
    ["Health Services Fee", r.healthFee], ["Student Activity Fee", r.activityFee],
    ["Laboratory Fee", r.labFee], ["Facilities Fee", r.facilitiesFee]
  ];
  items.forEach(([desc, amt], i) => {
    svg += `
    <rect x="30" y="${y}" width="${w - 60}" height="42" rx="6" fill="${bandColors[i % bandColors.length]}"/>
    <text x="55" y="${y + 27}" fill="#334155" font-family="${font}" font-size="13">${desc}</text>
    <text x="${w - 55}" y="${y + 27}" fill="#1e293b" font-family="${mono}" font-size="14" font-weight="600" text-anchor="end">$${r.fmt(amt)}</text>`;
    y += 46;
  });
  svg += `
  <rect x="30" y="${y}" width="${w - 60}" height="42" rx="6" fill="#1e293b"/>
  <text x="55" y="${y + 27}" fill="white" font-family="${font}" font-size="14" font-weight="700">Total Charges</text>
  <text x="${w - 55}" y="${y + 27}" fill="white" font-family="${mono}" font-size="15" font-weight="700" text-anchor="end">$${r.fmt(r.totalCharges)}</text>`;
  y += 60;
  svg += `<text x="45" y="${y}" fill="#166534" font-family="${font}" font-size="13" font-weight="700">Aid & Scholarships</text>`;
  y += 15;
  svg += `
  <rect x="30" y="${y}" width="${w - 60}" height="38" rx="6" fill="#dcfce7"/>
  <text x="55" y="${y + 24}" fill="#166534" font-family="${font}" font-size="13">Financial Aid / Grant</text>
  <text x="${w - 55}" y="${y + 24}" fill="#166534" font-family="${mono}" font-size="13" text-anchor="end">-$${r.fmt(r.aid)}</text>`;
  y += 42;
  svg += `
  <rect x="30" y="${y}" width="${w - 60}" height="38" rx="6" fill="#bbf7d0"/>
  <text x="55" y="${y + 24}" fill="#166534" font-family="${font}" font-size="13">Scholarship</text>
  <text x="${w - 55}" y="${y + 24}" fill="#166534" font-family="${mono}" font-size="13" text-anchor="end">-$${r.fmt(r.scholarship)}</text>`;
  y += 55;
  svg += `
  <rect x="30" y="${y}" width="${w - 60}" height="55" rx="10" fill="${color}"/>
  <text x="55" y="${y + 22}" fill="rgba(255,255,255,0.8)" font-family="${font}" font-size="10" letter-spacing="1">AMOUNT PAID</text>
  <text x="${w - 55}" y="${y + 40}" fill="white" font-family="${mono}" font-size="24" font-weight="700" text-anchor="end">$${r.fmt(r.amountPaid)}</text>`;
  y += 70;
  svg += `
  <text x="55" y="${y}" fill="#64748b" font-family="${font}" font-size="11">Balance Due: $${r.fmt(r.balanceDue)}</text>
  <text x="${w - 55}" y="${y}" fill="#64748b" font-family="${font}" font-size="11" text-anchor="end">${r.paymentMethod}</text>`;
  y += 40;
  svg += `
  <text x="${w / 2}" y="${y}" fill="#cbd5e1" font-family="${font}" font-size="9" text-anchor="middle">${data.collegeName}</text>
</svg>`;
  return svg;
}

function layoutReceiptCard(data: CardData, color: string, photo: string | null): string {
  const w = 850, h = 1100;
  const r = generateReceiptData(data);
  const font = "'Segoe UI', 'Roboto', Arial, sans-serif";
  const mono = "'Courier New', monospace";
  let y = 40;
  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <filter id="cardShadow" x="-5%" y="-5%" width="115%" height="115%">
      <feDropShadow dx="0" dy="3" stdDeviation="6" flood-color="#00000015"/>
    </filter>
  </defs>
  <rect width="${w}" height="${h}" fill="#f1f5f9"/>
  <text x="${w / 2}" y="${y}" fill="#1e293b" font-family="${font}" font-size="22" font-weight="700" text-anchor="middle">${data.collegeName}</text>`;
  y += 18;
  svg += `<text x="${w / 2}" y="${y}" fill="#64748b" font-family="${font}" font-size="11" text-anchor="middle">Tuition Payment Receipt</text>`;
  y += 30;
  svg += `
  <rect x="40" y="${y}" width="${w - 80}" height="100" rx="12" fill="white" filter="url(#cardShadow)"/>
  <rect x="40" y="${y}" width="6" height="100" rx="3" fill="${color}"/>
  <text x="65" y="${y + 25}" fill="#94a3b8" font-family="${font}" font-size="9" letter-spacing="1">STUDENT</text>
  <text x="65" y="${y + 48}" fill="#1e293b" font-family="${font}" font-size="18" font-weight="600">${data.name}</text>
  <text x="65" y="${y + 68}" fill="#64748b" font-family="${font}" font-size="11">${data.studentId} | ${data.department}</text>
  <text x="65" y="${y + 88}" fill="#94a3b8" font-family="${font}" font-size="10">${r.semester} ${r.academicYear} | ${r.paymentDate}</text>
  <text x="${w - 65}" y="${y + 35}" fill="#94a3b8" font-family="${font}" font-size="9" text-anchor="end">RECEIPT</text>
  <text x="${w - 65}" y="${y + 55}" fill="${color}" font-family="${mono}" font-size="14" text-anchor="end" font-weight="bold">${r.receiptNum}</text>
  <text x="${w - 65}" y="${y + 75}" fill="#94a3b8" font-family="${font}" font-size="9" text-anchor="end">ACCOUNT</text>
  <text x="${w - 65}" y="${y + 92}" fill="#64748b" font-family="${mono}" font-size="11" text-anchor="end">${r.accountNum}</text>`;
  y += 120;
  svg += `
  <rect x="40" y="${y}" width="${w - 80}" height="340" rx="12" fill="white" filter="url(#cardShadow)"/>
  <text x="65" y="${y + 28}" fill="#475569" font-family="${font}" font-size="13" font-weight="700">Charges</text>`;
  let cy = y + 45;
  const items: [string, number][] = [
    ["Tuition", r.tuition], ["Registration Fee", r.regFee], ["Technology Fee", r.techFee],
    ["Health Services Fee", r.healthFee], ["Student Activity Fee", r.activityFee],
    ["Laboratory Fee", r.labFee], ["Facilities Fee", r.facilitiesFee]
  ];
  items.forEach(([desc, amt]) => {
    svg += `
    <text x="65" y="${cy}" fill="#475569" font-family="${font}" font-size="12">${desc}</text>
    <text x="${w - 65}" y="${cy}" fill="#1e293b" font-family="${mono}" font-size="12" text-anchor="end">$${r.fmt(amt)}</text>`;
    cy += 30;
    svg += `<line x1="65" y1="${cy - 12}" x2="${w - 65}" y2="${cy - 12}" stroke="#f1f5f9" stroke-width="1"/>`;
  });
  cy += 10;
  svg += `
  <rect x="55" y="${cy}" width="${w - 110}" height="32" rx="6" fill="#f8fafc"/>
  <text x="70" y="${cy + 22}" fill="#1e293b" font-family="${font}" font-size="13" font-weight="700">Total Charges</text>
  <text x="${w - 70}" y="${cy + 22}" fill="#1e293b" font-family="${mono}" font-size="14" font-weight="700" text-anchor="end">$${r.fmt(r.totalCharges)}</text>`;
  y += 360;
  svg += `
  <rect x="40" y="${y}" width="${w - 80}" height="130" rx="12" fill="white" filter="url(#cardShadow)"/>
  <text x="65" y="${y + 28}" fill="#166534" font-family="${font}" font-size="13" font-weight="700">Aid & Scholarships</text>
  <text x="65" y="${y + 55}" fill="#166534" font-family="${font}" font-size="12">Financial Aid / Grant</text>
  <text x="${w - 65}" y="${y + 55}" fill="#166534" font-family="${mono}" font-size="12" text-anchor="end">-$${r.fmt(r.aid)}</text>
  <text x="65" y="${y + 80}" fill="#166534" font-family="${font}" font-size="12">Scholarship</text>
  <text x="${w - 65}" y="${y + 80}" fill="#166534" font-family="${mono}" font-size="12" text-anchor="end">-$${r.fmt(r.scholarship)}</text>
  <line x1="65" y1="${y + 92}" x2="${w - 65}" y2="${y + 92}" stroke="#dcfce7" stroke-width="1"/>
  <text x="65" y="${y + 115}" fill="#166534" font-family="${font}" font-size="13" font-weight="700">Total Aid</text>
  <text x="${w - 65}" y="${y + 115}" fill="#166534" font-family="${mono}" font-size="14" font-weight="700" text-anchor="end">-$${r.fmt(r.totalAid)}</text>`;
  y += 150;
  svg += `
  <rect x="40" y="${y}" width="${w - 80}" height="70" rx="12" fill="${color}" filter="url(#cardShadow)"/>
  <text x="65" y="${y + 30}" fill="rgba(255,255,255,0.8)" font-family="${font}" font-size="11">AMOUNT PAID</text>
  <text x="${w - 65}" y="${y + 48}" fill="white" font-family="${mono}" font-size="24" font-weight="700" text-anchor="end">$${r.fmt(r.amountPaid)}</text>`;
  y += 85;
  svg += `
  <rect x="40" y="${y}" width="${(w - 90) / 2}" height="55" rx="10" fill="white" filter="url(#cardShadow)"/>
  <text x="60" y="${y + 22}" fill="#94a3b8" font-family="${font}" font-size="9">BALANCE DUE</text>
  <text x="60" y="${y + 42}" fill="#1e293b" font-family="${mono}" font-size="16" font-weight="700">$${r.fmt(r.balanceDue)}</text>
  <rect x="${40 + (w - 90) / 2 + 10}" y="${y}" width="${(w - 90) / 2}" height="55" rx="10" fill="white" filter="url(#cardShadow)"/>
  <text x="${55 + (w - 90) / 2 + 10}" y="${y + 22}" fill="#94a3b8" font-family="${font}" font-size="9">PAYMENT METHOD</text>
  <text x="${55 + (w - 90) / 2 + 10}" y="${y + 42}" fill="#475569" font-family="${font}" font-size="12">${r.paymentMethod}</text>`;
  y += 75;
  svg += `
  <text x="${w / 2}" y="${y}" fill="#cbd5e1" font-family="${font}" font-size="9" text-anchor="middle">${data.collegeName} - Electronic Receipt</text>
</svg>`;
  return svg;
}

function layoutReceiptSplit(data: CardData, color: string, photo: string | null): string {
  const w = 850, h = 1100;
  const r = generateReceiptData(data);
  const font = "'Segoe UI', Arial, sans-serif";
  const mono = "'Courier New', monospace";
  const leftW = 300;
  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="#fff"/>
  <rect x="0" y="0" width="${leftW}" height="${h}" fill="${color}"/>`;
  let ly = 60;
  svg += `
  <text x="${leftW / 2}" y="${ly}" fill="white" font-family="${font}" font-size="14" text-anchor="middle" letter-spacing="3" font-weight="700">RECEIPT</text>`;
  ly += 30;
  svg += `<line x1="40" y1="${ly}" x2="${leftW - 40}" y2="${ly}" stroke="rgba(255,255,255,0.3)" stroke-width="0.5"/>`;
  ly += 35;
  svg += `
  <text x="35" y="${ly}" fill="rgba(255,255,255,0.6)" font-family="${font}" font-size="9" letter-spacing="1">STUDENT NAME</text>
  <text x="35" y="${ly + 20}" fill="white" font-family="${font}" font-size="16" font-weight="600">${data.name}</text>`;
  ly += 55;
  svg += `
  <text x="35" y="${ly}" fill="rgba(255,255,255,0.6)" font-family="${font}" font-size="9" letter-spacing="1">STUDENT ID</text>
  <text x="35" y="${ly + 20}" fill="white" font-family="${mono}" font-size="14">${data.studentId}</text>`;
  ly += 55;
  svg += `
  <text x="35" y="${ly}" fill="rgba(255,255,255,0.6)" font-family="${font}" font-size="9" letter-spacing="1">DEPARTMENT</text>
  <text x="35" y="${ly + 20}" fill="white" font-family="${font}" font-size="13">${data.department}</text>`;
  ly += 55;
  svg += `
  <text x="35" y="${ly}" fill="rgba(255,255,255,0.6)" font-family="${font}" font-size="9" letter-spacing="1">SEMESTER</text>
  <text x="35" y="${ly + 20}" fill="white" font-family="${font}" font-size="13">${r.semester} ${r.academicYear}</text>`;
  ly += 55;
  svg += `
  <text x="35" y="${ly}" fill="rgba(255,255,255,0.6)" font-family="${font}" font-size="9" letter-spacing="1">PAYMENT DATE</text>
  <text x="35" y="${ly + 20}" fill="white" font-family="${font}" font-size="13">${r.paymentDate}</text>`;
  ly += 55;
  svg += `
  <text x="35" y="${ly}" fill="rgba(255,255,255,0.6)" font-family="${font}" font-size="9" letter-spacing="1">ACCOUNT NUMBER</text>
  <text x="35" y="${ly + 20}" fill="white" font-family="${mono}" font-size="13">${r.accountNum}</text>`;
  ly += 55;
  svg += `
  <text x="35" y="${ly}" fill="rgba(255,255,255,0.6)" font-family="${font}" font-size="9" letter-spacing="1">RECEIPT NUMBER</text>
  <text x="35" y="${ly + 20}" fill="white" font-family="${mono}" font-size="13">${r.receiptNum}</text>`;
  ly += 80;
  svg += `
  <rect x="25" y="${ly}" width="${leftW - 50}" height="55" rx="8" fill="rgba(255,255,255,0.15)"/>
  <text x="${leftW / 2}" y="${ly + 22}" fill="rgba(255,255,255,0.7)" font-family="${font}" font-size="9" text-anchor="middle" letter-spacing="1">AMOUNT PAID</text>
  <text x="${leftW / 2}" y="${ly + 45}" fill="white" font-family="${mono}" font-size="20" font-weight="700" text-anchor="middle">$${r.fmt(r.amountPaid)}</text>`;
  let ry = 50;
  const rx = leftW + 40;
  svg += `
  <text x="${rx}" y="${ry}" fill="#1e293b" font-family="${font}" font-size="20" font-weight="700">${data.collegeName}</text>`;
  ry += 20;
  svg += `<text x="${rx}" y="${ry}" fill="#94a3b8" font-family="${font}" font-size="11">Student Financial Services</text>`;
  ry += 40;
  svg += `<text x="${rx}" y="${ry}" fill="#475569" font-family="${font}" font-size="13" font-weight="600">Itemized Charges</text>`;
  ry += 20;
  const items: [string, number][] = [
    ["Tuition", r.tuition], ["Registration Fee", r.regFee], ["Technology Fee", r.techFee],
    ["Health Services Fee", r.healthFee], ["Student Activity Fee", r.activityFee],
    ["Laboratory Fee", r.labFee], ["Facilities Fee", r.facilitiesFee]
  ];
  items.forEach(([desc, amt]) => {
    svg += `
    <text x="${rx}" y="${ry}" fill="#475569" font-family="${font}" font-size="12">${desc}</text>
    <text x="${w - 50}" y="${ry}" fill="#1e293b" font-family="${mono}" font-size="12" text-anchor="end">$${r.fmt(amt)}</text>`;
    ry += 28;
    svg += `<line x1="${rx}" y1="${ry - 10}" x2="${w - 50}" y2="${ry - 10}" stroke="#f1f5f9" stroke-width="1"/>`;
  });
  ry += 10;
  svg += `
  <rect x="${rx - 10}" y="${ry}" width="${w - leftW - 80}" height="32" rx="6" fill="#f1f5f9"/>
  <text x="${rx}" y="${ry + 22}" fill="#1e293b" font-family="${font}" font-size="13" font-weight="700">Total Charges</text>
  <text x="${w - 55}" y="${ry + 22}" fill="#1e293b" font-family="${mono}" font-size="14" font-weight="700" text-anchor="end">$${r.fmt(r.totalCharges)}</text>`;
  ry += 55;
  svg += `<text x="${rx}" y="${ry}" fill="#166534" font-family="${font}" font-size="13" font-weight="600">Aid & Scholarships</text>`;
  ry += 25;
  svg += `
  <text x="${rx}" y="${ry}" fill="#166534" font-family="${font}" font-size="12">Financial Aid</text>
  <text x="${w - 50}" y="${ry}" fill="#166534" font-family="${mono}" font-size="12" text-anchor="end">-$${r.fmt(r.aid)}</text>`;
  ry += 28;
  svg += `
  <text x="${rx}" y="${ry}" fill="#166534" font-family="${font}" font-size="12">Scholarship</text>
  <text x="${w - 50}" y="${ry}" fill="#166534" font-family="${mono}" font-size="12" text-anchor="end">-$${r.fmt(r.scholarship)}</text>`;
  ry += 35;
  svg += `<line x1="${rx}" y1="${ry}" x2="${w - 50}" y2="${ry}" stroke="#e2e8f0" stroke-width="1"/>`;
  ry += 25;
  svg += `
  <text x="${rx}" y="${ry}" fill="#1e293b" font-family="${font}" font-size="14" font-weight="700">Amount Paid</text>
  <text x="${w - 50}" y="${ry}" fill="${color}" font-family="${mono}" font-size="18" font-weight="700" text-anchor="end">$${r.fmt(r.amountPaid)}</text>`;
  ry += 30;
  svg += `
  <text x="${rx}" y="${ry}" fill="#64748b" font-family="${font}" font-size="12">Balance Due: $${r.fmt(r.balanceDue)}</text>`;
  ry += 25;
  svg += `
  <text x="${rx}" y="${ry}" fill="#94a3b8" font-family="${font}" font-size="11">Payment: ${r.paymentMethod}</text>`;
  ry += 50;
  svg += `
  <text x="${rx}" y="${ry}" fill="#e2e8f0" font-family="${font}" font-size="8">${data.collegeName}</text>
</svg>`;
  return svg;
}

function layoutReceiptFormal(data: CardData, color: string, photo: string | null): string {
  const w = 850, h = 1100;
  const r = generateReceiptData(data);
  const font = "Georgia, 'Times New Roman', serif";
  const mono = "'Courier New', monospace";
  let y = 50;
  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="#fffef8"/>
  <rect x="30" y="30" width="${w - 60}" height="${h - 60}" fill="none" stroke="#8b7355" stroke-width="3"/>
  <rect x="35" y="35" width="${w - 70}" height="${h - 70}" fill="none" stroke="#8b7355" stroke-width="0.5"/>`;
  svg += `
  <circle cx="${w / 2}" cy="${y + 45}" r="42" fill="none" stroke="#8b7355" stroke-width="2"/>
  <circle cx="${w / 2}" cy="${y + 45}" r="35" fill="none" stroke="#8b7355" stroke-width="0.5"/>
  <text x="${w / 2}" y="${y + 40}" fill="#8b7355" font-family="${font}" font-size="10" text-anchor="middle" font-weight="bold">OFFICIAL</text>
  <text x="${w / 2}" y="${y + 55}" fill="#8b7355" font-family="${font}" font-size="8" text-anchor="middle">SEAL</text>`;
  y += 110;
  svg += `
  <text x="${w / 2}" y="${y}" fill="#2c1810" font-family="${font}" font-size="26" text-anchor="middle" font-weight="bold">${data.collegeName}</text>`;
  y += 25;
  svg += `<text x="${w / 2}" y="${y}" fill="#5c4a3a" font-family="${font}" font-size="12" text-anchor="middle" font-style="italic">Office of the Bursar - Official Tuition Receipt</text>`;
  y += 10;
  svg += `
  <line x1="100" y1="${y}" x2="${w - 100}" y2="${y}" stroke="#8b7355" stroke-width="1"/>
  <line x1="100" y1="${y + 3}" x2="${w - 100}" y2="${y + 3}" stroke="#8b7355" stroke-width="0.3"/>`;
  y += 30;
  svg += `
  <text x="80" y="${y}" fill="#5c4a3a" font-family="${font}" font-size="12">This certifies that the following student has fulfilled payment obligations:</text>`;
  y += 35;
  svg += `
  <text x="80" y="${y}" fill="#888" font-family="${font}" font-size="10">Student Name:</text>
  <text x="220" y="${y}" fill="#2c1810" font-family="${font}" font-size="14" font-weight="bold">${data.name}</text>`;
  y += 25;
  svg += `
  <text x="80" y="${y}" fill="#888" font-family="${font}" font-size="10">Student ID:</text>
  <text x="220" y="${y}" fill="#2c1810" font-family="${mono}" font-size="13">${data.studentId}</text>
  <text x="450" y="${y}" fill="#888" font-family="${font}" font-size="10">Department:</text>
  <text x="550" y="${y}" fill="#2c1810" font-family="${font}" font-size="13">${data.department}</text>`;
  y += 25;
  svg += `
  <text x="80" y="${y}" fill="#888" font-family="${font}" font-size="10">Period:</text>
  <text x="220" y="${y}" fill="#2c1810" font-family="${font}" font-size="13">${r.semester} ${r.academicYear}</text>
  <text x="450" y="${y}" fill="#888" font-family="${font}" font-size="10">Account:</text>
  <text x="550" y="${y}" fill="#2c1810" font-family="${mono}" font-size="13">${r.accountNum}</text>`;
  y += 25;
  svg += `
  <text x="80" y="${y}" fill="#888" font-family="${font}" font-size="10">Receipt No:</text>
  <text x="220" y="${y}" fill="#2c1810" font-family="${mono}" font-size="13">${r.receiptNum}</text>
  <text x="450" y="${y}" fill="#888" font-family="${font}" font-size="10">Date:</text>
  <text x="550" y="${y}" fill="#2c1810" font-family="${font}" font-size="13">${r.paymentDate}</text>`;
  y += 30;
  svg += `<line x1="80" y1="${y}" x2="${w - 80}" y2="${y}" stroke="#ccc" stroke-width="0.5"/>`;
  y += 25;
  svg += `<text x="80" y="${y}" fill="#5c4a3a" font-family="${font}" font-size="13" font-weight="bold" font-style="italic">Schedule of Charges:</text>`;
  y += 20;
  const items: [string, number][] = [
    ["Tuition", r.tuition], ["Registration Fee", r.regFee], ["Technology Fee", r.techFee],
    ["Health Services Fee", r.healthFee], ["Student Activity Fee", r.activityFee],
    ["Laboratory Fee", r.labFee], ["Facilities Fee", r.facilitiesFee]
  ];
  items.forEach(([desc, amt]) => {
    svg += `
    <text x="100" y="${y}" fill="#333" font-family="${font}" font-size="12">${desc}</text>
    <text x="${w - 100}" y="${y}" fill="#333" font-family="${mono}" font-size="12" text-anchor="end">$${r.fmt(amt)}</text>`;
    y += 24;
  });
  svg += `
  <line x1="100" y1="${y}" x2="${w - 100}" y2="${y}" stroke="#8b7355" stroke-width="0.5"/>`;
  y += 20;
  svg += `
  <text x="100" y="${y}" fill="#2c1810" font-family="${font}" font-size="13" font-weight="bold">Total Charges</text>
  <text x="${w - 100}" y="${y}" fill="#2c1810" font-family="${mono}" font-size="14" font-weight="bold" text-anchor="end">$${r.fmt(r.totalCharges)}</text>`;
  y += 30;
  svg += `
  <text x="100" y="${y}" fill="#166534" font-family="${font}" font-size="12">Less: Financial Aid</text>
  <text x="${w - 100}" y="${y}" fill="#166534" font-family="${mono}" font-size="12" text-anchor="end">-$${r.fmt(r.aid)}</text>`;
  y += 22;
  svg += `
  <text x="100" y="${y}" fill="#166534" font-family="${font}" font-size="12">Less: Scholarship</text>
  <text x="${w - 100}" y="${y}" fill="#166534" font-family="${mono}" font-size="12" text-anchor="end">-$${r.fmt(r.scholarship)}</text>`;
  y += 25;
  svg += `<line x1="450" y1="${y}" x2="${w - 100}" y2="${y}" stroke="#8b7355" stroke-width="1"/>`;
  y += 22;
  svg += `
  <text x="100" y="${y}" fill="#2c1810" font-family="${font}" font-size="15" font-weight="bold">Net Amount Due & Paid</text>
  <text x="${w - 100}" y="${y}" fill="#2c1810" font-family="${mono}" font-size="16" font-weight="bold" text-anchor="end">$${r.fmt(r.amountPaid)}</text>`;
  y += 22;
  svg += `
  <text x="100" y="${y}" fill="#555" font-family="${font}" font-size="11">Balance Due: $${r.fmt(r.balanceDue)}</text>
  <text x="${w - 100}" y="${y}" fill="#555" font-family="${font}" font-size="11" text-anchor="end">Method: ${r.paymentMethod}</text>`;
  y += 55;
  svg += `
  <line x1="100" y1="${y}" x2="300" y2="${y}" stroke="#333" stroke-width="0.5"/>
  <text x="100" y="${y + 18}" fill="#666" font-family="${font}" font-size="10" font-style="italic">Authorized Signature</text>
  <line x1="${w - 300}" y1="${y}" x2="${w - 100}" y2="${y}" stroke="#333" stroke-width="0.5"/>
  <text x="${w - 300}" y="${y + 18}" fill="#666" font-family="${font}" font-size="10" font-style="italic">Date</text>`;
  y += 45;
  svg += `
  <text x="${w / 2}" y="${y}" fill="#aaa" font-family="${font}" font-size="9" text-anchor="middle" font-style="italic">This is an official document of ${data.collegeName}. Retain for your records.</text>
</svg>`;
  return svg;
}

function layoutReceiptColorful(data: CardData, color: string, photo: string | null): string {
  const w = 850, h = 1100;
  const r = generateReceiptData(data);
  const font = "'Segoe UI', Arial, sans-serif";
  const mono = "'Courier New', monospace";
  const catColors = ["#3b82f6", "#ef4444", "#8b5cf6", "#f59e0b", "#06b6d4", "#ec4899", "#10b981"];
  let y = 0;
  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="#fff"/>
  <rect x="0" y="0" width="${w}" height="8" fill="url(#rainbowGrad)"/>
  <defs>
    <linearGradient id="rainbowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#3b82f6"/>
      <stop offset="16%" style="stop-color:#ef4444"/>
      <stop offset="33%" style="stop-color:#8b5cf6"/>
      <stop offset="50%" style="stop-color:#f59e0b"/>
      <stop offset="66%" style="stop-color:#06b6d4"/>
      <stop offset="83%" style="stop-color:#ec4899"/>
      <stop offset="100%" style="stop-color:#10b981"/>
    </linearGradient>
  </defs>`;
  y = 45;
  svg += `
  <text x="50" y="${y}" fill="#1e293b" font-family="${font}" font-size="22" font-weight="700">${data.collegeName}</text>`;
  y += 22;
  svg += `<text x="50" y="${y}" fill="#94a3b8" font-family="${font}" font-size="11">Tuition Payment Receipt</text>`;
  y += 8;
  svg += `<text x="${w - 50}" y="45" fill="${color}" font-family="${mono}" font-size="16" text-anchor="end" font-weight="bold">${r.receiptNum}</text>`;
  svg += `<text x="${w - 50}" y="67" fill="#94a3b8" font-family="${font}" font-size="11" text-anchor="end">${r.paymentDate}</text>`;
  y += 20;
  svg += `<line x1="50" y1="${y}" x2="${w - 50}" y2="${y}" stroke="#e2e8f0" stroke-width="1"/>`;
  y += 25;
  svg += `
  <text x="50" y="${y}" fill="#64748b" font-family="${font}" font-size="11">${data.name} | ${data.studentId} | ${data.department}</text>`;
  y += 18;
  svg += `
  <text x="50" y="${y}" fill="#94a3b8" font-family="${font}" font-size="10">${r.semester} ${r.academicYear} | Account: ${r.accountNum}</text>`;
  y += 40;
  svg += `<text x="50" y="${y}" fill="#475569" font-family="${font}" font-size="14" font-weight="700">Charge Breakdown</text>`;
  y += 25;
  const items: [string, number][] = [
    ["Tuition", r.tuition], ["Registration Fee", r.regFee], ["Technology Fee", r.techFee],
    ["Health Services Fee", r.healthFee], ["Student Activity Fee", r.activityFee],
    ["Laboratory Fee", r.labFee], ["Facilities Fee", r.facilitiesFee]
  ];
  items.forEach(([desc, amt], i) => {
    const cc = catColors[i % catColors.length];
    svg += `
    <rect x="50" y="${y}" width="6" height="30" rx="3" fill="${cc}"/>
    <text x="70" y="${y + 20}" fill="#334155" font-family="${font}" font-size="13">${desc}</text>
    <text x="${w - 50}" y="${y + 20}" fill="${cc}" font-family="${mono}" font-size="14" font-weight="600" text-anchor="end">$${r.fmt(amt)}</text>`;
    y += 38;
  });
  y += 10;
  const pieR = 70, pieCx = w - 140, pieCy = y - 120;
  let startAngle = 0;
  items.forEach(([, amt], i) => {
    const angle = (amt / r.totalCharges) * 360;
    const endAngle = startAngle + angle;
    const startRad = (startAngle - 90) * Math.PI / 180;
    const endRad = (endAngle - 90) * Math.PI / 180;
    const x1 = pieCx + pieR * Math.cos(startRad);
    const y1 = pieCy + pieR * Math.sin(startRad);
    const x2 = pieCx + pieR * Math.cos(endRad);
    const y2 = pieCy + pieR * Math.sin(endRad);
    const largeArc = angle > 180 ? 1 : 0;
    svg += `<path d="M${pieCx},${pieCy} L${x1},${y1} A${pieR},${pieR} 0 ${largeArc},1 ${x2},${y2} Z" fill="${catColors[i % catColors.length]}" opacity="0.7"/>`;
    startAngle = endAngle;
  });
  svg += `
  <rect x="50" y="${y}" width="${w - 100}" height="36" rx="6" fill="#f8fafc"/>
  <text x="70" y="${y + 24}" fill="#1e293b" font-family="${font}" font-size="14" font-weight="700">Total Charges</text>
  <text x="${w - 70}" y="${y + 24}" fill="#1e293b" font-family="${mono}" font-size="15" font-weight="700" text-anchor="end">$${r.fmt(r.totalCharges)}</text>`;
  y += 55;
  svg += `
  <text x="50" y="${y}" fill="#166534" font-family="${font}" font-size="13" font-weight="600">Aid & Scholarships</text>`;
  y += 25;
  svg += `
  <text x="70" y="${y}" fill="#166534" font-family="${font}" font-size="12">Financial Aid</text>
  <text x="${w - 50}" y="${y}" fill="#166534" font-family="${mono}" font-size="12" text-anchor="end">-$${r.fmt(r.aid)}</text>`;
  y += 24;
  svg += `
  <text x="70" y="${y}" fill="#166534" font-family="${font}" font-size="12">Scholarship</text>
  <text x="${w - 50}" y="${y}" fill="#166534" font-family="${mono}" font-size="12" text-anchor="end">-$${r.fmt(r.scholarship)}</text>`;
  y += 40;
  svg += `
  <rect x="50" y="${y}" width="${w - 100}" height="50" rx="10" fill="${color}"/>
  <text x="75" y="${y + 22}" fill="rgba(255,255,255,0.8)" font-family="${font}" font-size="10" letter-spacing="1">AMOUNT PAID</text>
  <text x="${w - 75}" y="${y + 36}" fill="white" font-family="${mono}" font-size="22" font-weight="700" text-anchor="end">$${r.fmt(r.amountPaid)}</text>`;
  y += 65;
  svg += `
  <text x="50" y="${y}" fill="#64748b" font-family="${font}" font-size="11">Balance Due: $${r.fmt(r.balanceDue)} | ${r.paymentMethod}</text>`;
  y += 30;
  svg += `
  <rect x="0" y="${h - 8}" width="${w}" height="8" fill="url(#rainbowGrad)"/>
</svg>`;
  return svg;
}

function layoutReceiptStripe(data: CardData, color: string, photo: string | null): string {
  const w = 850, h = 1100;
  const r = generateReceiptData(data);
  const font = "Arial, Helvetica, sans-serif";
  const mono = "'Courier New', monospace";
  let y = 0;
  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="#fff"/>
  <rect x="0" y="0" width="${w}" height="140" fill="${color}"/>
  <text x="50" y="50" fill="white" font-family="${font}" font-size="28" font-weight="900">${data.collegeName}</text>
  <text x="50" y="80" fill="rgba(255,255,255,0.8)" font-family="${font}" font-size="13" letter-spacing="2">TUITION PAYMENT RECEIPT</text>
  <text x="50" y="105" fill="rgba(255,255,255,0.6)" font-family="${font}" font-size="11">${r.semester} ${r.academicYear}</text>
  <text x="${w - 50}" y="60" fill="rgba(255,255,255,0.5)" font-family="${font}" font-size="48" text-anchor="end" font-weight="900">$</text>
  <text x="${w - 50}" y="105" fill="rgba(255,255,255,0.9)" font-family="${mono}" font-size="13" text-anchor="end">${r.receiptNum}</text>
  <text x="${w - 50}" y="125" fill="rgba(255,255,255,0.6)" font-family="${font}" font-size="11" text-anchor="end">${r.paymentDate}</text>`;
  y = 170;
  svg += `
  <text x="50" y="${y}" fill="#6b7280" font-family="${font}" font-size="10" letter-spacing="1">STUDENT INFORMATION</text>`;
  y += 25;
  svg += `
  <text x="50" y="${y}" fill="#111" font-family="${font}" font-size="16" font-weight="700">${data.name}</text>
  <text x="50" y="${y + 20}" fill="#6b7280" font-family="${font}" font-size="11">ID: ${data.studentId} | ${data.department} | Acct: ${r.accountNum}</text>`;
  y += 50;
  svg += `<line x1="50" y1="${y}" x2="${w - 50}" y2="${y}" stroke="#e5e7eb" stroke-width="1"/>`;
  y += 30;
  svg += `
  <text x="50" y="${y}" fill="#374151" font-family="${font}" font-size="13" font-weight="700">CHARGES</text>
  <text x="${w - 50}" y="${y}" fill="#9ca3af" font-family="${font}" font-size="10" text-anchor="end">AMOUNT (USD)</text>`;
  y += 20;
  const items: [string, number][] = [
    ["Tuition", r.tuition], ["Registration Fee", r.regFee], ["Technology Fee", r.techFee],
    ["Health Services Fee", r.healthFee], ["Student Activity Fee", r.activityFee],
    ["Laboratory Fee", r.labFee], ["Facilities Fee", r.facilitiesFee]
  ];
  items.forEach(([desc, amt]) => {
    svg += `
    <text x="50" y="${y}" fill="#374151" font-family="${font}" font-size="12">${desc}</text>
    <text x="${w - 50}" y="${y}" fill="#374151" font-family="${mono}" font-size="12" text-anchor="end">$${r.fmt(amt)}</text>`;
    y += 28;
    svg += `<line x1="50" y1="${y - 10}" x2="${w - 50}" y2="${y - 10}" stroke="#f3f4f6" stroke-width="0.5"/>`;
  });
  y += 5;
  svg += `
  <line x1="50" y1="${y}" x2="${w - 50}" y2="${y}" stroke="#d1d5db" stroke-width="1"/>`;
  y += 22;
  svg += `
  <text x="50" y="${y}" fill="#111" font-family="${font}" font-size="13" font-weight="700">Total Charges</text>
  <text x="${w - 50}" y="${y}" fill="#111" font-family="${mono}" font-size="14" font-weight="700" text-anchor="end">$${r.fmt(r.totalCharges)}</text>`;
  y += 40;
  svg += `
  <text x="50" y="${y}" fill="#166534" font-family="${font}" font-size="13" font-weight="700">CREDITS & AID</text>`;
  y += 25;
  svg += `
  <text x="50" y="${y}" fill="#166534" font-family="${font}" font-size="12">Financial Aid / Grant</text>
  <text x="${w - 50}" y="${y}" fill="#166534" font-family="${mono}" font-size="12" text-anchor="end">-$${r.fmt(r.aid)}</text>`;
  y += 25;
  svg += `
  <text x="50" y="${y}" fill="#166534" font-family="${font}" font-size="12">Scholarship</text>
  <text x="${w - 50}" y="${y}" fill="#166534" font-family="${mono}" font-size="12" text-anchor="end">-$${r.fmt(r.scholarship)}</text>`;
  y += 35;
  svg += `<line x1="50" y1="${y}" x2="${w - 50}" y2="${y}" stroke="#d1d5db" stroke-width="1"/>`;
  y += 10;
  svg += `
  <rect x="0" y="${y}" width="${w}" height="55" fill="${color}"/>
  <text x="50" y="${y + 25}" fill="rgba(255,255,255,0.8)" font-family="${font}" font-size="11" letter-spacing="1">AMOUNT PAID</text>
  <text x="${w - 50}" y="${y + 38}" fill="white" font-family="${mono}" font-size="24" font-weight="700" text-anchor="end">$${r.fmt(r.amountPaid)}</text>`;
  y += 75;
  svg += `
  <text x="50" y="${y}" fill="#6b7280" font-family="${font}" font-size="12">Balance Due: <tspan fill="#111" font-weight="700">$${r.fmt(r.balanceDue)}</tspan></text>
  <text x="${w - 50}" y="${y}" fill="#6b7280" font-family="${font}" font-size="12" text-anchor="end">Payment: ${r.paymentMethod}</text>`;
  y += 50;
  svg += `
  <text x="${w / 2}" y="${y}" fill="#d1d5db" font-family="${font}" font-size="9" text-anchor="middle">${data.collegeName} - Financial Services</text>
</svg>`;
  return svg;
}

function layoutReceiptTabular(data: CardData, color: string, photo: string | null): string {
  const w = 850, h = 1100;
  const r = generateReceiptData(data);
  const font = "'Lucida Console', 'Courier New', monospace";
  const sans = "Arial, Helvetica, sans-serif";
  let y = 40;
  const lx = 30, rw = w - 60;
  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="#fff"/>
  <text x="${w / 2}" y="${y}" fill="#111" font-family="${sans}" font-size="20" text-anchor="middle" font-weight="bold">${data.collegeName}</text>`;
  y += 18;
  svg += `<text x="${w / 2}" y="${y}" fill="#666" font-family="${sans}" font-size="11" text-anchor="middle">Student Tuition Receipt</text>`;
  y += 25;
  svg += `
  <rect x="${lx}" y="${y}" width="${rw}" height="1" fill="#333"/>
  <rect x="${lx}" y="${y + 1}" width="${rw}" height="1" fill="#333"/>`;
  y += 10;
  const gridH = 22;
  const col1 = lx, col2 = lx + 150, col3 = lx + 420, col4 = lx + 570;
  const drawRow = (c1: string, v1: string, c2: string, v2: string) => {
    svg += `
    <rect x="${lx}" y="${y}" width="${rw}" height="${gridH}" fill="none" stroke="#ccc" stroke-width="0.5"/>
    <line x1="${col2}" y1="${y}" x2="${col2}" y2="${y + gridH}" stroke="#ccc" stroke-width="0.5"/>
    <line x1="${col3}" y1="${y}" x2="${col3}" y2="${y + gridH}" stroke="#ccc" stroke-width="0.5"/>
    <line x1="${col4}" y1="${y}" x2="${col4}" y2="${y + gridH}" stroke="#ccc" stroke-width="0.5"/>
    <text x="${col1 + 5}" y="${y + 15}" fill="#888" font-family="${font}" font-size="9">${c1}</text>
    <text x="${col2 + 5}" y="${y + 15}" fill="#111" font-family="${font}" font-size="9">${v1}</text>
    <text x="${col3 + 5}" y="${y + 15}" fill="#888" font-family="${font}" font-size="9">${c2}</text>
    <text x="${col4 + 5}" y="${y + 15}" fill="#111" font-family="${font}" font-size="9">${v2}</text>`;
    y += gridH;
  };
  drawRow("Student Name", data.name, "Student ID", data.studentId);
  drawRow("Department", data.department, "Account #", r.accountNum);
  drawRow("Semester", `${r.semester} ${r.academicYear}`, "Receipt #", r.receiptNum);
  drawRow("Payment Date", r.paymentDate, "Invoice #", r.invoiceNum);
  y += 20;
  svg += `
  <rect x="${lx}" y="${y}" width="${rw}" height="${gridH}" fill="${color}"/>
  <line x1="${lx + rw - 180}" y1="${y}" x2="${lx + rw - 180}" y2="${y + gridH}" stroke="rgba(255,255,255,0.3)" stroke-width="0.5"/>
  <text x="${lx + 5}" y="${y + 15}" fill="white" font-family="${font}" font-size="10" font-weight="bold">DESCRIPTION</text>
  <text x="${lx + rw - 10}" y="${y + 15}" fill="white" font-family="${font}" font-size="10" font-weight="bold" text-anchor="end">AMOUNT</text>`;
  y += gridH;
  const items: [string, number][] = [
    ["Tuition", r.tuition], ["Registration Fee", r.regFee], ["Technology Fee", r.techFee],
    ["Health Services Fee", r.healthFee], ["Student Activity Fee", r.activityFee],
    ["Laboratory Fee", r.labFee], ["Facilities Fee", r.facilitiesFee]
  ];
  items.forEach(([desc, amt], i) => {
    const bg = i % 2 === 0 ? "#f9fafb" : "#fff";
    svg += `
    <rect x="${lx}" y="${y}" width="${rw}" height="${gridH}" fill="${bg}" stroke="#ddd" stroke-width="0.5"/>
    <line x1="${lx + rw - 180}" y1="${y}" x2="${lx + rw - 180}" y2="${y + gridH}" stroke="#ddd" stroke-width="0.5"/>
    <text x="${lx + 5}" y="${y + 15}" fill="#333" font-family="${font}" font-size="10">${desc}</text>
    <text x="${lx + rw - 10}" y="${y + 15}" fill="#333" font-family="${font}" font-size="10" text-anchor="end">$${r.fmt(amt)}</text>`;
    y += gridH;
  });
  svg += `
  <rect x="${lx}" y="${y}" width="${rw}" height="${gridH + 4}" fill="#e5e7eb" stroke="#333" stroke-width="1"/>
  <text x="${lx + 5}" y="${y + 17}" fill="#111" font-family="${font}" font-size="11" font-weight="bold">TOTAL CHARGES</text>
  <text x="${lx + rw - 10}" y="${y + 17}" fill="#111" font-family="${font}" font-size="11" font-weight="bold" text-anchor="end">$${r.fmt(r.totalCharges)}</text>`;
  y += gridH + 10;
  svg += `
  <rect x="${lx}" y="${y}" width="${rw}" height="${gridH}" fill="#f0fdf4" stroke="#bbf7d0" stroke-width="0.5"/>
  <text x="${lx + 5}" y="${y + 15}" fill="#166534" font-family="${font}" font-size="10">Financial Aid / Grant</text>
  <text x="${lx + rw - 10}" y="${y + 15}" fill="#166534" font-family="${font}" font-size="10" text-anchor="end">-$${r.fmt(r.aid)}</text>`;
  y += gridH;
  svg += `
  <rect x="${lx}" y="${y}" width="${rw}" height="${gridH}" fill="#f0fdf4" stroke="#bbf7d0" stroke-width="0.5"/>
  <text x="${lx + 5}" y="${y + 15}" fill="#166534" font-family="${font}" font-size="10">Scholarship</text>
  <text x="${lx + rw - 10}" y="${y + 15}" fill="#166534" font-family="${font}" font-size="10" text-anchor="end">-$${r.fmt(r.scholarship)}</text>`;
  y += gridH + 5;
  svg += `
  <rect x="${lx}" y="${y}" width="${rw}" height="30" fill="${color}" stroke="#333" stroke-width="1"/>
  <text x="${lx + 5}" y="${y + 20}" fill="white" font-family="${font}" font-size="12" font-weight="bold">AMOUNT PAID</text>
  <text x="${lx + rw - 10}" y="${y + 20}" fill="white" font-family="${font}" font-size="13" font-weight="bold" text-anchor="end">$${r.fmt(r.amountPaid)}</text>`;
  y += 40;
  svg += `
  <text x="${lx + 5}" y="${y}" fill="#333" font-family="${font}" font-size="10">BALANCE DUE: $${r.fmt(r.balanceDue)}</text>
  <text x="${lx + rw - 10}" y="${y}" fill="#666" font-family="${font}" font-size="10" text-anchor="end">PAYMENT: ${r.paymentMethod}</text>`;
  y += 35;
  svg += `
  <rect x="${lx}" y="${y}" width="${rw}" height="1" fill="#333"/>
  <text x="${w / 2}" y="${y + 18}" fill="#aaa" font-family="${sans}" font-size="8" text-anchor="middle">${data.collegeName} - Office of Financial Services</text>
</svg>`;
  return svg;
}

function layoutReceiptLetter(data: CardData, color: string, photo: string | null): string {
  const w = 850, h = 1100;
  const r = generateReceiptData(data);
  const font = "Georgia, 'Times New Roman', serif";
  const mono = "'Courier New', monospace";
  let y = 60;
  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="#fffef8"/>
  <text x="80" y="${y}" fill="#1a1a1a" font-family="${font}" font-size="22" font-weight="bold">${data.collegeName}</text>`;
  y += 18;
  svg += `<text x="80" y="${y}" fill="#666" font-family="${font}" font-size="11" font-style="italic">Office of the Bursar - Student Financial Services</text>`;
  y += 12;
  svg += `<line x1="80" y1="${y}" x2="${w - 80}" y2="${y}" stroke="${color}" stroke-width="2"/>`;
  y += 35;
  svg += `<text x="${w - 80}" y="${y}" fill="#333" font-family="${font}" font-size="12" text-anchor="end">${r.paymentDate}</text>`;
  y += 30;
  svg += `<text x="80" y="${y}" fill="#333" font-family="${font}" font-size="12">Receipt No: ${r.receiptNum}</text>`;
  y += 20;
  svg += `<text x="80" y="${y}" fill="#333" font-family="${font}" font-size="12">Account: ${r.accountNum}</text>`;
  y += 35;
  svg += `<text x="80" y="${y}" fill="#333" font-family="${font}" font-size="13">Dear <tspan font-weight="bold">${data.name}</tspan>,</text>`;
  y += 28;
  svg += `<text x="80" y="${y}" fill="#444" font-family="${font}" font-size="12">Thank you for your tuition payment for the ${r.semester} ${r.academicYear} semester.</text>`;
  y += 20;
  svg += `<text x="80" y="${y}" fill="#444" font-family="${font}" font-size="12">Below is a summary of charges applied to your student account (ID: ${data.studentId}, ${data.department}).</text>`;
  y += 40;
  svg += `<text x="80" y="${y}" fill="#1a1a1a" font-family="${font}" font-size="14" font-weight="bold" font-style="italic">Itemized Charges:</text>`;
  y += 25;
  const items: [string, number][] = [
    ["Tuition", r.tuition], ["Registration Fee", r.regFee], ["Technology Fee", r.techFee],
    ["Health Services Fee", r.healthFee], ["Student Activity Fee", r.activityFee],
    ["Laboratory Fee", r.labFee], ["Facilities Fee", r.facilitiesFee]
  ];
  items.forEach(([desc, amt]) => {
    svg += `
    <text x="120" y="${y}" fill="#333" font-family="${font}" font-size="12">${desc}</text>
    <text x="${w - 120}" y="${y}" fill="#333" font-family="${mono}" font-size="12" text-anchor="end">$${r.fmt(amt)}</text>`;
    y += 24;
  });
  y += 5;
  svg += `<line x1="120" y1="${y}" x2="${w - 120}" y2="${y}" stroke="#ccc" stroke-width="0.5"/>`;
  y += 20;
  svg += `
  <text x="120" y="${y}" fill="#1a1a1a" font-family="${font}" font-size="13" font-weight="bold">Total Charges</text>
  <text x="${w - 120}" y="${y}" fill="#1a1a1a" font-family="${mono}" font-size="13" font-weight="bold" text-anchor="end">$${r.fmt(r.totalCharges)}</text>`;
  y += 35;
  svg += `<text x="80" y="${y}" fill="#1a1a1a" font-family="${font}" font-size="14" font-weight="bold" font-style="italic">Financial Aid Applied:</text>`;
  y += 25;
  svg += `
  <text x="120" y="${y}" fill="#166534" font-family="${font}" font-size="12">Financial Aid / Grant</text>
  <text x="${w - 120}" y="${y}" fill="#166534" font-family="${mono}" font-size="12" text-anchor="end">-$${r.fmt(r.aid)}</text>`;
  y += 24;
  svg += `
  <text x="120" y="${y}" fill="#166534" font-family="${font}" font-size="12">Scholarship</text>
  <text x="${w - 120}" y="${y}" fill="#166534" font-family="${mono}" font-size="12" text-anchor="end">-$${r.fmt(r.scholarship)}</text>`;
  y += 30;
  svg += `<line x1="120" y1="${y}" x2="${w - 120}" y2="${y}" stroke="#333" stroke-width="1"/>`;
  y += 25;
  svg += `
  <text x="80" y="${y}" fill="#1a1a1a" font-family="${font}" font-size="15" font-weight="bold">Amount Paid: <tspan fill="${color}" font-family="${mono}">$${r.fmt(r.amountPaid)}</tspan></text>`;
  y += 22;
  svg += `
  <text x="80" y="${y}" fill="#333" font-family="${font}" font-size="13">Balance Due: $${r.fmt(r.balanceDue)}</text>`;
  y += 22;
  svg += `
  <text x="80" y="${y}" fill="#555" font-family="${font}" font-size="12">Payment Method: ${r.paymentMethod}</text>`;
  y += 45;
  svg += `<text x="80" y="${y}" fill="#444" font-family="${font}" font-size="12">Please retain this receipt for your records. If you have any questions regarding</text>`;
  y += 18;
  svg += `<text x="80" y="${y}" fill="#444" font-family="${font}" font-size="12">your account, please contact the Office of the Bursar.</text>`;
  y += 45;
  svg += `<text x="80" y="${y}" fill="#333" font-family="${font}" font-size="12" font-style="italic">Sincerely,</text>`;
  y += 30;
  svg += `<text x="80" y="${y}" fill="#333" font-family="${font}" font-size="13" font-weight="bold">Office of the Bursar</text>`;
  y += 18;
  svg += `<text x="80" y="${y}" fill="#666" font-family="${font}" font-size="11">${data.collegeName}</text>`;
  y += 45;
  svg += `<line x1="80" y1="${y}" x2="${w - 80}" y2="${y}" stroke="${color}" stroke-width="1"/>`;
  y += 15;
  svg += `<text x="${w / 2}" y="${y}" fill="#bbb" font-family="${font}" font-size="8" text-anchor="middle" font-style="italic">This is an electronically generated document and is valid without signature.</text>
</svg>`;
  return svg;
}

export interface TemplateInfo {
  id: number;
  name: string;
  enabled: boolean;
}

export type TemplateCategory = "id_card" | "class_schedule" | "tuition_receipt";

type LayoutEntry = { name: string; fn: (data: CardData, color: string, photo: string | null) => string };

const ID_CARD_TEMPLATES: LayoutEntry[] = [
  { name: "Horizontal Classic", fn: layoutHorizontalClassic },
  { name: "Vertical Badge", fn: layoutVerticalBadge },
  { name: "Modern Split", fn: layoutModernSplit },
  { name: "Top Banner", fn: layoutTopBanner },
  { name: "Minimal Flat", fn: layoutMinimalFlat },
  { name: "Gradient Wave", fn: layoutGradientWave },
  { name: "Dark Mode", fn: layoutDarkMode },
  { name: "Compact Horizontal", fn: layoutCompactHorizontal },
  { name: "Centered Portrait", fn: layoutCenteredPortrait },
  { name: "Sidebar", fn: layoutSidebar },
  { name: "Double Stripe", fn: layoutDoubleStripe },
  { name: "Corner Accent", fn: layoutCornerAccent },
  { name: "Ribbon Header", fn: layoutRibbonHeader },
  { name: "Bottom Heavy", fn: layoutBottomHeavy },
  { name: "Grid Info", fn: layoutGridInfo },
];

const CLASS_SCHEDULE_TEMPLATES: LayoutEntry[] = [
  { name: "Schedule Classic", fn: layoutScheduleClassic },
  { name: "Schedule Modern", fn: layoutScheduleModern },
  { name: "Schedule Grid", fn: layoutScheduleGrid },
  { name: "Schedule Timeline", fn: layoutScheduleTimeline },
  { name: "Schedule Color Block", fn: layoutScheduleColorBlock },
  { name: "Schedule Minimal", fn: layoutScheduleMinimal },
  { name: "Schedule Dark", fn: layoutScheduleDark },
  { name: "Schedule Academic", fn: layoutScheduleAcademic },
  { name: "Schedule Compact", fn: layoutScheduleCompact },
  { name: "Schedule Banded", fn: layoutScheduleBanded },
  { name: "Schedule Split", fn: layoutScheduleSplit },
  { name: "Schedule Cards", fn: layoutScheduleCards },
  { name: "Schedule Weekly", fn: layoutScheduleWeekly },
  { name: "Schedule List", fn: layoutScheduleList },
  { name: "Schedule Stripe", fn: layoutScheduleStripe },
];

const TUITION_RECEIPT_TEMPLATES: LayoutEntry[] = [
  { name: "Receipt Classic", fn: layoutReceiptClassic },
  { name: "Receipt Modern", fn: layoutReceiptModern },
  { name: "Receipt Invoice", fn: layoutReceiptInvoice },
  { name: "Receipt Minimal", fn: layoutReceiptMinimal },
  { name: "Receipt Dark", fn: layoutReceiptDark },
  { name: "Receipt Statement", fn: layoutReceiptStatement },
  { name: "Receipt Compact", fn: layoutReceiptCompact },
  { name: "Receipt Banded", fn: layoutReceiptBanded },
  { name: "Receipt Card", fn: layoutReceiptCard },
  { name: "Receipt Split", fn: layoutReceiptSplit },
  { name: "Receipt Formal", fn: layoutReceiptFormal },
  { name: "Receipt Colorful", fn: layoutReceiptColorful },
  { name: "Receipt Stripe", fn: layoutReceiptStripe },
  { name: "Receipt Tabular", fn: layoutReceiptTabular },
  { name: "Receipt Letter", fn: layoutReceiptLetter },
];

const CATEGORY_MAP: Record<TemplateCategory, LayoutEntry[]> = {
  id_card: ID_CARD_TEMPLATES,
  class_schedule: CLASS_SCHEDULE_TEMPLATES,
  tuition_receipt: TUITION_RECEIPT_TEMPLATES,
};

let disabledTemplateIds: Set<string> = new Set();

export interface CategoryTemplateInfo {
  id: string;
  index: number;
  name: string;
  category: TemplateCategory;
  enabled: boolean;
}

export function getTemplatesList(category?: TemplateCategory): CategoryTemplateInfo[] {
  const categories: TemplateCategory[] = category
    ? [category]
    : ["id_card", "class_schedule", "tuition_receipt"];

  const result: CategoryTemplateInfo[] = [];
  for (const cat of categories) {
    const templates = CATEGORY_MAP[cat];
    templates.forEach((t, i) => {
      const id = `${cat}_${i}`;
      result.push({
        id,
        index: i,
        name: t.name,
        category: cat,
        enabled: !disabledTemplateIds.has(id),
      });
    });
  }
  return result;
}

export async function loadTemplateSettings() {
  try {
    const { storage } = await import("./storage");
    const settings = await storage.getTemplateSettings();
    disabledTemplateIds = new Set(
      settings.filter(s => !s.enabled).map(s => s.templateId)
    );
    const total = ID_CARD_TEMPLATES.length + CLASS_SCHEDULE_TEMPLATES.length + TUITION_RECEIPT_TEMPLATES.length;
    console.log(`[TPL] Loaded settings: ${disabledTemplateIds.size} disabled, ${total - disabledTemplateIds.size} enabled`);
  } catch (e) {
    console.log(`[TPL] Failed to load settings, all enabled by default: ${e}`);
  }
}

export async function setTemplateEnabled(templateId: string, enabled: boolean) {
  const { storage } = await import("./storage");
  await storage.setTemplateSetting(templateId, enabled);
  if (enabled) {
    disabledTemplateIds.delete(templateId);
  } else {
    disabledTemplateIds.add(templateId);
  }
}

export async function bulkSetTemplatesEnabled(ids: string[], enabled: boolean) {
  const { storage } = await import("./storage");
  for (const id of ids) {
    await storage.setTemplateSetting(id, enabled);
    if (enabled) {
      disabledTemplateIds.delete(id);
    } else {
      disabledTemplateIds.add(id);
    }
  }
}

export function getEnabledCategories(): TemplateCategory[] {
  const all: TemplateCategory[] = ["id_card", "class_schedule", "tuition_receipt"];
  return all.filter(cat => {
    const templates = CATEGORY_MAP[cat];
    return templates.some((_t, i) => !disabledTemplateIds.has(`${cat}_${i}`));
  });
}

const templateCounters: Record<string, number> = {
  id_card: 0,
  class_schedule: 0,
  tuition_receipt: 0,
};
const categoryCounter = { value: 0 };

export function generateCardSvgSequential(data: CardData, category?: TemplateCategory): { svg: string; category: TemplateCategory } | null {
  const enabledCats = getEnabledCategories();
  if (enabledCats.length === 0) return null;

  const cat = category || enabledCats[categoryCounter.value % enabledCats.length];
  if (!category) categoryCounter.value++;

  const templates = CATEGORY_MAP[cat];
  const enabledLayouts = templates
    .map((t, i) => ({ ...t, id: `${cat}_${i}` }))
    .filter(t => !disabledTemplateIds.has(t.id));

  if (enabledLayouts.length === 0) return null;

  const idx = templateCounters[cat] % enabledLayouts.length;
  templateCounters[cat]++;
  const layoutFn = enabledLayouts[idx].fn;

  const resolvedPhoto = data.photoUrl ? resolvePhotoToBase64(data.photoUrl) : null;
  const svg = layoutFn(data, data.primaryColor, resolvedPhoto);
  console.log(`[TPL] Sequential pick: ${cat} template #${idx} (${enabledLayouts[idx].id})`);
  return { svg, category: cat };
}

export function generateCardSvg(data: CardData, category: TemplateCategory = "id_card"): string | null {
  const templates = CATEGORY_MAP[category];
  const enabledLayouts = templates
    .map((t, i) => ({ ...t, id: `${category}_${i}` }))
    .filter(t => !disabledTemplateIds.has(t.id));

  if (enabledLayouts.length === 0) {
    return null;
  }

  const h = hashName(data.collegeName + data.studentId);
  const layoutIndex = h % enabledLayouts.length;
  const layoutFn = enabledLayouts[layoutIndex].fn;

  const resolvedPhoto = data.photoUrl ? resolvePhotoToBase64(data.photoUrl) : null;
  return layoutFn(data, data.primaryColor, resolvedPhoto);
}
