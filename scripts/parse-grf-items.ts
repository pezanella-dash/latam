/**
 * GRF Item Parser — Extracts item data from LATAM client's itemInfo.lua
 * Reads the Lua table format and converts to structured JSON.
 *
 * Source: C:\Gravity\Ragnarok\System\itemInfo.lua (official LATAM client)
 * Encoding: Windows-1252 (Latin-1)
 *
 * Usage:
 *   npx tsx scripts/parse-grf-items.ts
 *   npx tsx scripts/parse-grf-items.ts --output data/items/latam-grf-items.json
 */

import * as fs from "fs";
import * as path from "path";
import * as iconv from "iconv-lite";

const GRF_ITEM_INFO_PATH =
  process.env.GRF_ITEM_INFO_PATH ||
  "C:/Gravity/Ragnarok/System/itemInfo.lua";

interface GrfItem {
  id: number;
  unidentifiedDisplayName: string;
  identifiedDisplayName: string;
  unidentifiedResourceName: string;
  identifiedResourceName: string;
  slotCount: number;
  classNum: number;
  costume: boolean;
  identifiedDescriptionName: string[];
  unidentifiedDescriptionName: string[];
  // Parsed from description
  weight?: number;
  type?: string;
  atk?: number;
  matk?: number;
  defense?: number;
  requiredLevel?: number;
  equipLocation?: string;
  jobs?: string[];
}

function readFileWithEncoding(filePath: string): string {
  const buffer = fs.readFileSync(filePath);
  // Try UTF-8 first, fallback to Windows-1252
  const utf8 = buffer.toString("utf-8");
  if (!utf8.includes("�")) return utf8;
  // Use iconv-lite if available, otherwise do manual Latin-1 decode
  try {
    return iconv.decode(buffer, "win1252");
  } catch {
    // Fallback: read as latin1
    return buffer.toString("latin1");
  }
}

function stripColorCodes(str: string): string {
  return str.replace(/\^[0-9a-fA-F]{6}/g, "").trim();
}

function parseLuaString(raw: string): string {
  // Handle [=[...]=] long string syntax
  const longMatch = raw.match(/^\[=*\[([\s\S]*?)\]=*\]$/);
  if (longMatch) return longMatch[1];
  // Handle "..." or '...'
  const quotedMatch = raw.match(/^["']([\s\S]*?)["']$/);
  if (quotedMatch) return quotedMatch[1];
  return raw;
}

function parseDescriptionStats(lines: string[]): {
  weight?: number;
  type?: string;
  atk?: number;
  matk?: number;
  defense?: number;
  requiredLevel?: number;
  equipLocation?: string;
  jobs?: string[];
} {
  const result: ReturnType<typeof parseDescriptionStats> = {};
  const jobKeywords = [
    "Todas as classes",
    "Espadachim",
    "Mago",
    "Arqueiro",
    "Acólito",
    "Acólita",
    "Mercador",
    "Gatuno",
    "Aprendiz",
    "Novato",
    "Cavaleiro",
    "Bruxo",
    "Caçador",
    "Sacerdote",
    "Sacerdotisa",
    "Ferreiro",
    "Arruaceiro",
    "Cavaleiro Rúnico",
    "Arcano",
    "Sentinela",
    "Arcebispo",
    "Arcebispa",
    "Mecânico",
    "Sicário",
    "Sicária",
    "Guardião Real",
    "Trovador",
    "Menestrel",
    "Feiticeiro",
    "Feiticeira",
    "Bioquímico",
    "Bioquímica",
    "Renegado",
    "Renegada",
    "Oboro",
    "Kagerou",
    "Justiceiro",
    "Rebelde",
    "Super Aprendiz",
    "Espadachim Taekwon",
    "Star Gladiator",
    "Soul Linker",
    "Ninja",
    "Gunslinger",
    "Summoner",
    "Doram",
  ];

  for (const rawLine of lines) {
    const line = stripColorCodes(rawLine);

    // Weight
    const weightMatch = line.match(/Peso\s*:\s*(\d+)/i);
    if (weightMatch) result.weight = parseInt(weightMatch[1]);

    // Type
    const typeMatch = line.match(/Tipo\s*:\s*(.+)/i);
    if (typeMatch) result.type = typeMatch[1].trim();

    // ATK
    const atkMatch = line.match(
      /(?:Ataque|ATK|Força de Ataque)\s*:\s*(\d+)/i
    );
    if (atkMatch) result.atk = parseInt(atkMatch[1]);

    // MATK
    const matkMatch = line.match(
      /(?:Ataque Mágico|MATK|ATQM)\s*:\s*(\d+)/i
    );
    if (matkMatch) result.matk = parseInt(matkMatch[1]);

    // DEF
    const defMatch = line.match(/(?:Defesa|DEF)\s*:\s*(\d+)/i);
    if (defMatch) result.defense = parseInt(defMatch[1]);

    // Required Level
    const lvlMatch = line.match(
      /(?:Nível Necessário|Nível Requerido|Nível Base)\s*:\s*(\d+)/i
    );
    if (lvlMatch) result.requiredLevel = parseInt(lvlMatch[1]);

    // Equip location
    const locMatch = line.match(/(?:Equipa em|Equipável em|Local)\s*:\s*(.+)/i);
    if (locMatch) result.equipLocation = locMatch[1].trim();

    // Jobs
    for (const job of jobKeywords) {
      if (line.includes(job)) {
        if (!result.jobs) result.jobs = [];
        if (!result.jobs.includes(job)) result.jobs.push(job);
      }
    }
  }

  return result;
}

function parseItemsFromLua(content: string): GrfItem[] {
  const items: GrfItem[] = [];

  // Match each item block: [ID] = { ... }
  // We use a state machine approach for robustness with large files
  const lines = content.split(/\r?\n/);
  let currentId: number | null = null;
  let currentBlock: string[] = [];
  let braceDepth = 0;
  let inItem = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for item start: [12345] = or [12345]=
    const itemStart = line.match(/^\s*\[(\d+)\]\s*=\s*\{?\s*$/);
    if (itemStart) {
      // Save previous item
      if (currentId !== null && currentBlock.length > 0) {
        const item = parseItemBlock(currentId, currentBlock.join("\n"));
        if (item) items.push(item);
      }
      currentId = parseInt(itemStart[1]);
      currentBlock = [];
      braceDepth = line.includes("{") ? 1 : 0;
      inItem = true;
      continue;
    }

    // Start brace on next line after [ID] =
    if (inItem && braceDepth === 0 && line.trim() === "{") {
      braceDepth = 1;
      continue;
    }

    if (inItem && braceDepth > 0) {
      // Count braces
      for (const ch of line) {
        if (ch === "{") braceDepth++;
        if (ch === "}") braceDepth--;
      }
      currentBlock.push(line);

      // Item block ended
      if (braceDepth <= 0) {
        if (currentId !== null) {
          const item = parseItemBlock(currentId, currentBlock.join("\n"));
          if (item) items.push(item);
        }
        currentId = null;
        currentBlock = [];
        inItem = false;
      }
    }
  }

  // Last item
  if (currentId !== null && currentBlock.length > 0) {
    const item = parseItemBlock(currentId, currentBlock.join("\n"));
    if (item) items.push(item);
  }

  return items;
}

function parseItemBlock(id: number, block: string): GrfItem | null {
  try {
    // Extract string fields
    const getName = (field: string): string => {
      // Match: fieldName = [=[value]=] or fieldName = "value"
      const longRe = new RegExp(
        `${field}\\s*=\\s*\\[=*\\[([\\s\\S]*?)\\]=*\\]`
      );
      const longMatch = block.match(longRe);
      if (longMatch) return longMatch[1].trim();

      const quotedRe = new RegExp(`${field}\\s*=\\s*"([^"]*)"`);
      const quotedMatch = block.match(quotedRe);
      if (quotedMatch) return quotedMatch[1].trim();

      return "";
    };

    // Extract number fields
    const getNumber = (field: string): number => {
      const re = new RegExp(`${field}\\s*=\\s*(\\d+)`);
      const match = block.match(re);
      return match ? parseInt(match[1]) : 0;
    };

    // Extract boolean fields
    const getBool = (field: string): boolean => {
      const re = new RegExp(`${field}\\s*=\\s*(true|false)`);
      const match = block.match(re);
      return match ? match[1] === "true" : false;
    };

    // Extract description array
    const getDescArray = (field: string): string[] => {
      const re = new RegExp(
        `${field}\\s*=\\s*\\{([\\s\\S]*?)\\}`,
        "m"
      );
      const match = block.match(re);
      if (!match) return [];

      const arrayContent = match[1];
      const entries: string[] = [];

      // Match [=[...]=] entries
      const longMatches = arrayContent.matchAll(/\[=*\[([\s\S]*?)\]=*\]/g);
      for (const m of longMatches) {
        entries.push(m[1].trim());
      }

      // Match "..." entries
      if (entries.length === 0) {
        const quotedMatches = arrayContent.matchAll(/"([^"]*)"/g);
        for (const m of quotedMatches) {
          entries.push(m[1].trim());
        }
      }

      return entries;
    };

    const identifiedDisplayName = getName("identifiedDisplayName");
    if (!identifiedDisplayName) return null;

    const identifiedDescriptionName = getDescArray(
      "identifiedDescriptionName"
    );
    const stats = parseDescriptionStats(identifiedDescriptionName);

    return {
      id,
      unidentifiedDisplayName: getName("unidentifiedDisplayName"),
      identifiedDisplayName,
      unidentifiedResourceName: getName("unidentifiedResourceName"),
      identifiedResourceName: getName("identifiedResourceName"),
      slotCount: getNumber("slotCount"),
      classNum: getNumber("ClassNum"),
      costume: getBool("costume"),
      identifiedDescriptionName,
      unidentifiedDescriptionName: getDescArray(
        "unidentifiedDescriptionName"
      ),
      ...stats,
    };
  } catch {
    return null;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const outputIdx = args.indexOf("--output");
  const outputPath =
    outputIdx !== -1 && args[outputIdx + 1]
      ? args[outputIdx + 1]
      : "data/items/latam-grf-items.json";

  console.log(`Reading LATAM client itemInfo from: ${GRF_ITEM_INFO_PATH}`);

  if (!fs.existsSync(GRF_ITEM_INFO_PATH)) {
    console.error(`File not found: ${GRF_ITEM_INFO_PATH}`);
    process.exit(1);
  }

  const content = readFileWithEncoding(GRF_ITEM_INFO_PATH);
  console.log(`File size: ${(content.length / 1024 / 1024).toFixed(1)}MB`);

  console.log("Parsing items...");
  const items = parseItemsFromLua(content);
  console.log(`Parsed ${items.length} items`);

  // Stats
  const withName = items.filter((i) => i.identifiedDisplayName).length;
  const withWeight = items.filter((i) => i.weight).length;
  const withAtk = items.filter((i) => i.atk).length;
  const withDef = items.filter((i) => i.defense).length;
  const withSlots = items.filter((i) => i.slotCount > 0).length;
  const withJobs = items.filter((i) => i.jobs && i.jobs.length > 0).length;
  const withType = items.filter((i) => i.type).length;
  const costumes = items.filter((i) => i.costume).length;

  console.log(`\nStats:`);
  console.log(`  With display name: ${withName}`);
  console.log(`  With weight: ${withWeight}`);
  console.log(`  With ATK: ${withAtk}`);
  console.log(`  With DEF: ${withDef}`);
  console.log(`  With slots: ${withSlots}`);
  console.log(`  With jobs: ${withJobs}`);
  console.log(`  With type: ${withType}`);
  console.log(`  Costumes: ${costumes}`);

  // Ensure output dir exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  fs.writeFileSync(outputPath, JSON.stringify(items, null, 2), "utf-8");
  console.log(`\nSaved to ${outputPath}`);

  // Also create a compact version (no descriptions, just structured data)
  const compact = items.map((i) => ({
    id: i.id,
    name: i.identifiedDisplayName,
    slots: i.slotCount,
    classNum: i.classNum,
    costume: i.costume || undefined,
    weight: i.weight,
    type: i.type,
    atk: i.atk,
    matk: i.matk,
    def: i.defense,
    reqLevel: i.requiredLevel,
    equipLocation: i.equipLocation,
    jobs: i.jobs,
  }));
  const compactPath = outputPath.replace(".json", "-compact.json");
  fs.writeFileSync(compactPath, JSON.stringify(compact, null, 2), "utf-8");
  console.log(`Compact version: ${compactPath}`);
}

main().catch(console.error);
