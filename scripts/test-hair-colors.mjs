/**
 * Renders character sprites with each headPalette to check actual colors.
 * Calls the zrenderer API directly.
 */
import fs from "fs";

// Read .env.local manually
const envContent = fs.readFileSync(".env.local", "utf-8");
for (const line of envContent.split("\n")) {
  const m = line.match(/^([^#=]+)=["']?(.+?)["']?\s*$/);
  if (m) process.env[m[1].trim()] = m[2].trim();
}

const ZRENDERER_URL = process.env.ZRENDERER_URL;
const ZRENDERER_TOKEN = process.env.ZRENDERER_TOKEN;

async function renderPalette(palette) {
  const isVisualRag = ZRENDERER_URL.includes("ragnarok.wiki");
  const url = isVisualRag
    ? `${ZRENDERER_URL}/render?downloadimage&accesstoken=${ZRENDERER_TOKEN}`
    : `${ZRENDERER_URL}/render?downloadimage`;

  const headers = {
    "Content-Type": isVisualRag ? "application/vnd.api+json" : "application/json",
  };
  if (!isVisualRag) headers["x-accesstoken"] = ZRENDERER_TOKEN;

  const body = {
    job: ["0"],        // Novice
    gender: 1,         // Male
    head: 1,           // Hairstyle 1
    headPalette: palette,
    headdir: 0,
    headgear: [0, 0, 0],
    garment: 0,
    action: 0,         // Standing south
    canvas: "100x120+50+90",
    frame: 0,
    enableShadow: false,
  };

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    console.error(`Palette ${palette}: HTTP ${res.status}`);
    return;
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  const filename = `hair_palette_${palette}.png`;
  fs.writeFileSync(filename, buffer);
  console.log(`Palette ${palette}: saved ${filename} (${buffer.length} bytes)`);
}

// Test headdir too
async function renderHeadDir(headdir, direction) {
  const isVisualRag = ZRENDERER_URL.includes("ragnarok.wiki");
  const url = isVisualRag
    ? `${ZRENDERER_URL}/render?downloadimage&accesstoken=${ZRENDERER_TOKEN}`
    : `${ZRENDERER_URL}/render?downloadimage`;

  const headers = {
    "Content-Type": isVisualRag ? "application/vnd.api+json" : "application/json",
  };
  if (!isVisualRag) headers["x-accesstoken"] = ZRENDERER_TOKEN;

  const body = {
    job: ["0"],
    gender: 1,
    head: 1,
    headPalette: 0,
    headdir: headdir,
    headgear: [0, 0, 0],
    garment: 0,
    action: direction, // body direction
    canvas: "100x120+50+90",
    frame: 0,
    enableShadow: false,
  };

  const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
  if (!res.ok) return;
  const buffer = Buffer.from(await res.arrayBuffer());
  const filename = `headdir_${headdir}_bodydir_${direction}.png`;
  fs.writeFileSync(filename, buffer);
  console.log(`headdir=${headdir} bodydir=${direction}: saved ${filename}`);
}

console.log("=== Hair Palette Colors ===");
for (let i = 0; i <= 8; i++) {
  await renderPalette(i);
}

console.log("\n=== Head Direction Tests ===");
// Test headdir 0,1,2 with body facing south (direction 0)
for (let hd = 0; hd <= 2; hd++) {
  await renderHeadDir(hd, 0);
}
// Test headdir 0,1,2 with body facing east (direction 6)
for (let hd = 0; hd <= 2; hd++) {
  await renderHeadDir(hd, 6);
}
