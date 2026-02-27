/**
 * Divine Pride Web Scraper — No API key required
 * Scrapes item data from divine-pride.net/database/item/{id}?server=LATAM
 * and populates the database directly.
 *
 * Usage:
 *   tsx scripts/scrape-items.ts --test              # test with known items
 *   tsx scripts/scrape-items.ts --ids 1101,1102     # specific IDs
 *   tsx scripts/scrape-items.ts --range 1101-1200   # ID range
 *   tsx scripts/scrape-items.ts                     # all default ranges
 */

import { PrismaClient, ItemType } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import * as https from "https";

const prisma = new PrismaClient();

// ─── Well-known LATAM item ID ranges ─────────────────────────────
const DEFAULT_RANGES: [number, number][] = [
  [1100, 1999],   // Weapons
  [2100, 2399],   // Armors
  [2400, 2499],   // Shields
  [2500, 2599],   // Garments
  [2600, 2699],   // Shoes
  [2700, 2899],   // Accessories
  [4001, 4999],   // Cards
  [19100, 19399], // Shadow gear
];

const TEST_IDS = [1101, 1201, 2301, 2401, 4001, 4003, 2601, 2501];

interface ScrapedItem {
  id: number;
  name: string;
  type: ItemType;
  subType?: string;
  weight: number;
  atk?: number;
  matk?: number;
  defense?: number;
  slots: number;
  requiredLevel?: number;
  description?: string;
  imageUrl?: string;
  isEquipment: boolean;
  refineable: boolean;
  locations: string[];
  jobs: string[];
}

async function fetchPage(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8",
        "Cache-Control": "no-cache",
      },
    }, (res) => {
      if (res.statusCode === 404) {
        reject(new Error("404"));
        return;
      }
      if (res.statusCode && res.statusCode >= 400) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve(data));
    });
    req.on("error", reject);
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error("Timeout"));
    });
  });
}

function stripHtml(str: string): string {
  return str.replace(/<[^>]+>/g, "").trim();
}

function decodeHtml(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code)))
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseNumber(str: string | undefined): number | undefined {
  if (!str) return undefined;
  const n = parseInt(str.replace(/[^\d]/g, ""), 10);
  return isNaN(n) ? undefined : n;
}

function determineItemType(lines: string[], name: string): ItemType {
  // Use the "Tipo:" line from the description block as primary source
  for (const line of lines) {
    const lower = line.toLowerCase();
    if (/^tipo\s*:/.test(lower)) {
      const val = line.split(":").slice(1).join(":").trim().toLowerCase();
      if (val.includes("carta") || val.includes("card")) return ItemType.CARD;
      if (val.includes("muni") || val.includes("flecha") || val.includes("arrow")) return ItemType.AMMUNITION;
      if (val.includes("sombra") || val.includes("shadow")) return ItemType.SHADOW;
      if (val.includes("arm") || val.includes("capa") || val.includes("sapato") || val.includes("escudo") || val.includes("acess")) return ItemType.ARMOR;
      if (val.includes("arma") || val.includes("weapon")) return ItemType.WEAPON;
      // Generic armor/equipment
      if (val) return ItemType.ARMOR;
    }
    // Check "Equipa em:" for card
    if (/^equipa em\s*:/i.test(line) || /^combine com/i.test(line)) return ItemType.CARD;
  }

  // From name — look for "Carta " prefix explicitly
  if (/^carta\s/i.test(name.trim())) return ItemType.CARD;

  // Check if it's a weapon or armor based on stats found
  const hasAtk = lines.some(l => /for[cç]a de ataque|^ataque\s*:|attack/i.test(l));
  const hasDef = lines.some(l => /^def(esa|ensa|ense)?\s*:|^defesa\s*:/i.test(l));

  if (hasAtk) return ItemType.WEAPON;
  if (hasDef) return ItemType.ARMOR;

  return ItemType.MISC;
}

function parseEquipLocation(lines: string[]): string[] {
  const locations: string[] = [];
  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.includes("capacete superior") || lower.includes("top headgear") || lower.includes("parte superior")) locations.push("head_top");
    if (lower.includes("capacete médio") || lower.includes("mid headgear") || lower.includes("parte do meio")) locations.push("head_mid");
    if (lower.includes("capacete inferior") || lower.includes("lower headgear") || lower.includes("parte inferior")) locations.push("head_low");
    if ((lower.includes("armadura") || lower.includes("body")) && !lower.includes("peça")) locations.push("body");
    if (lower.includes("arma") && (lower.includes("mão direita") || lower.includes("right hand"))) locations.push("weapon");
    if (lower.includes("escudo") || lower.includes("shield") || lower.includes("mão esquerda")) locations.push("offhand");
    if (lower.includes("capa") || lower.includes("garment") || lower.includes("manto")) locations.push("garment");
    if (lower.includes("sapato") || lower.includes("shoe") || lower.includes("bota")) locations.push("shoes");
    if (lower.includes("acessório") || lower.includes("accessory")) locations.push("accessory");
  }
  return [...new Set(locations)];
}

async function scrapeItem(id: number): Promise<ScrapedItem> {
  const url = `https://www.divine-pride.net/database/item/${id}?server=LATAM`;
  const html = await fetchPage(url);

  // Check if item page is valid
  if (html.length < 5000) {
    throw new Error("404");
  }

  // Extract item name from page title
  const titleMatch = html.match(/<title>\s*Divine Pride - Item - ([^<]+)\s*<\/title>/i);
  if (!titleMatch) throw new Error("404");
  const name = decodeHtml(titleMatch[1].trim());

  // Image URL from og:image meta or static path
  const imageUrlMatch = html.match(/<meta property="og:image" content="([^"]+)"/i);
  const imageUrl = imageUrlMatch
    ? imageUrlMatch[1]
    : `https://static.divine-pride.net/images/items/collection/${id}.png`;

  // Extract the main description table (mon_table)
  const descTableMatch = html.match(/<table class="mon_table">([\s\S]{0,3000}?)<\/table>/i);
  if (!descTableMatch) throw new Error("404");

  // Convert br tags to newlines, strip HTML, split lines
  const rawDesc = descTableMatch[1]
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .trim();

  const lines = rawDesc
    .split("\n")
    .map(l => decodeHtml(l))
    .filter(l => l.trim().length > 0);

  if (lines.length === 0) throw new Error("404");

  // First line is the item description
  const description = lines[0];

  // Parse stats from remaining lines (key: value format)
  let atk: number | undefined;
  let matk: number | undefined;
  let defense: number | undefined;
  let weight = 0;
  let requiredLevel: number | undefined;
  let subType: string | undefined;

  for (const line of lines.slice(1)) {
    // Handle combined stats line like "DEF: 6 DEFM: 0" or "ATK: 100 MATK: 50"
    // Split by multiple stat patterns on the same line
    const segments = line.split(/\b(?=(?:DEF|ATK|DEFM|MATK|Peso|Weight|Nível|Level|Tipo|Classes?|Equipa|For[cç]a)\s*:)/i);

    for (const seg of segments) {
      const colonIdx = seg.indexOf(":");
      if (colonIdx === -1) continue;
      const key = seg.substring(0, colonIdx).trim().toLowerCase();
      const val = seg.substring(colonIdx + 1).trim().split(/\s+/)[0]; // take first token

      if (/for[cç]a de ataque|^ataque$|^atk$/i.test(key)) {
        atk = parseNumber(val);
      } else if (/ataque m[áa]gico|magic attack|^matk$/i.test(key)) {
        matk = parseNumber(val);
      } else if (/^defm$/i.test(key)) {
        // magic defense - ignore for now
      } else if (/^def(esa|ense|ensa)?$|^defense$/i.test(key)) {
        defense = parseNumber(val);
      } else if (/^peso$|^weight$/i.test(key)) {
        weight = parseNumber(val) ?? 0;
      } else if (/n[íi]vel necess[áa]rio|required level|requires level/i.test(key)) {
        requiredLevel = parseNumber(val);
      } else if (/^tipo$|^type$|classe de item/i.test(key)) {
        subType = seg.substring(colonIdx + 1).trim();
      }
    }
  }

  // Slots from name brackets [N]
  const slotsMatch = name.match(/\[(\d+)\]/);
  const slots = slotsMatch ? parseInt(slotsMatch[1]) : 0;

  // Item type
  const type = determineItemType(lines, name);

  // Equipment locations
  const locations = parseEquipLocation(lines);

  // Is equipment
  const isEquipment = locations.length > 0 || atk !== undefined || defense !== undefined || matk !== undefined;

  // Refineable
  const refineable = html.includes("Refinável") || html.includes("Refinable") ||
    (isEquipment && type !== ItemType.CARD && type !== ItemType.MISC);

  // Jobs from text
  const jobs: string[] = [];
  const jobKeywords = ["Espadachim", "Mago", "Arqueiro", "Acólito", "Mercador", "Gatuno", "Todas", "Aprendiz", "Swordsman", "Mage", "Archer", "Acolyte", "Merchant", "Thief", "All"];
  for (const job of jobKeywords) {
    if (rawDesc.includes(job)) jobs.push(job);
  }

  return {
    id,
    name,
    type,
    subType,
    weight,
    atk,
    matk,
    defense,
    slots,
    requiredLevel,
    description,
    imageUrl,
    isEquipment,
    refineable,
    locations,
    jobs,
  };
}

async function upsertItem(item: ScrapedItem): Promise<void> {
  await prisma.item.upsert({
    where: { id: item.id },
    update: {
      name: item.name,
      type: item.type,
      subType: item.subType,
      weight: item.weight,
      atk: item.atk,
      matk: item.matk,
      defense: item.defense,
      slots: item.slots,
      requiredLevel: item.requiredLevel,
      description: item.description ? [item.description] : [],
      imageUrl: item.imageUrl,
      isEquipment: item.isEquipment,
      refineable: item.refineable,
      locations: item.locations,
      jobs: item.jobs,
    },
    create: {
      id: item.id,
      name: item.name,
      type: item.type,
      subType: item.subType,
      weight: item.weight,
      atk: item.atk,
      matk: item.matk,
      defense: item.defense,
      slots: item.slots,
      requiredLevel: item.requiredLevel,
      description: item.description ? [item.description] : [],
      imageUrl: item.imageUrl,
      isEquipment: item.isEquipment,
      refineable: item.refineable,
      locations: item.locations,
      jobs: item.jobs,
    },
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function scrapeAndSaveIds(ids: number[]): Promise<void> {
  const jsonDir = path.join(process.cwd(), "data", "items");
  if (!fs.existsSync(jsonDir)) fs.mkdirSync(jsonDir, { recursive: true });

  let synced = 0;
  let skipped = 0;
  let failed = 0;
  const scrapedItems: ScrapedItem[] = [];

  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    try {
      const item = await scrapeItem(id);
      await upsertItem(item);
      scrapedItems.push(item);
      synced++;
    } catch (err: unknown) {
      const error = err as Error;
      if (error.message === "404") {
        skipped++;
      } else {
        failed++;
        if (process.env.DEBUG) {
          console.error(`\nFailed ID ${id}:`, error.message);
        }
      }
    }

    const total = i + 1;
    if (total % 5 === 0 || total === ids.length) {
      process.stdout.write(
        `\r  Synced: ${synced} | Skipped (404): ${skipped} | Failed: ${failed} | Progress: ${total}/${ids.length}`
      );
    }

    // Rate limiting: ~2 req/s to be respectful
    await sleep(500);
  }

  // Save collected items as JSON backup
  if (scrapedItems.length > 0) {
    const jsonPath = path.join(jsonDir, "latam-items.json");
    let existing: ScrapedItem[] = [];
    if (fs.existsSync(jsonPath)) {
      try {
        existing = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
      } catch {
        existing = [];
      }
    }
    const existingIds = new Set(existing.map((e) => e.id));
    const merged = [...existing, ...scrapedItems.filter((item) => !existingIds.has(item.id))];
    fs.writeFileSync(jsonPath, JSON.stringify(merged, null, 2));
    console.log(`\n\n  JSON backup: data/items/latam-items.json (${merged.length} total items)`);
  }

  console.log(`\n\nDone! Synced: ${synced} | Skipped (404): ${skipped} | Failed: ${failed}`);
}

function parseArgs(): number[] {
  const args = process.argv.slice(2);

  if (args.includes("--test")) {
    console.log("Running in test mode with IDs:", TEST_IDS.join(", "));
    return TEST_IDS;
  }

  const idsFlag = args.indexOf("--ids");
  if (idsFlag !== -1 && args[idsFlag + 1]) {
    return args[idsFlag + 1].split(",").map(Number);
  }

  const rangeFlag = args.indexOf("--range");
  if (rangeFlag !== -1 && args[rangeFlag + 1]) {
    const [start, end] = args[rangeFlag + 1].split("-").map(Number);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

  // Default: all ranges
  const ids: number[] = [];
  for (const [start, end] of DEFAULT_RANGES) {
    for (let i = start; i <= end; i++) ids.push(i);
  }
  return ids;
}

async function main() {
  const ids = parseArgs();
  console.log(`\nStarting scrape of ${ids.length} item IDs from divine-pride.net (server=LATAM)...`);
  console.log("Mode: Web scraping (no API key required)\n");
  await scrapeAndSaveIds(ids);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
