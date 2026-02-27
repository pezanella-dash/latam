/**
 * LATAM Ragnarok Database Builder
 *
 * Merges data from two sources:
 *   1. LATAM GRF client (iteminfo_new decompiled) → Portuguese names, descriptions
 *   2. rAthena GitHub (item_db, mob_db, skill_db) → Server-side stats, drops, formulas
 *
 * Output: data/database/ with consolidated JSON files ready for DB seeding.
 *
 * Usage:
 *   npx tsx scripts/build-database.ts
 */

import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

const DATA_DIR = path.join(process.cwd(), "data");
const OUTPUT_DIR = path.join(DATA_DIR, "database");

// ─── Source paths ───────────────────────────────────────────────────
const SOURCES = {
  grfItems: path.join(DATA_DIR, "items", "iteminfo_new_decompiled.lua"),
  rathenaEquip: path.join(DATA_DIR, "rathena", "item_db_equip.yml"),
  rathenaUsable: path.join(DATA_DIR, "rathena", "item_db_usable.yml"),
  rathenaEtc: path.join(DATA_DIR, "rathena", "item_db_etc.yml"),
  rathenaMobs: path.join(DATA_DIR, "rathena", "mob_db.yml"),
  rathenaSkills: path.join(DATA_DIR, "rathena", "skill_db.yml"),
  rathenaCombos: path.join(DATA_DIR, "rathena", "item_combos.yml"),
};

// ─── Types ──────────────────────────────────────────────────────────

interface GrfItemEntry {
  id: number;
  namePt: string;
  nameEn: string;
  description: string[];
  slotCount: number;
  classNum: number;
  costume: boolean;
}

interface RathenaItem {
  Id: number;
  AegisName: string;
  Name: string;
  Type: string;
  SubType?: string;
  Buy?: number;
  Sell?: number;
  Weight?: number;
  Attack?: number;
  MagicAttack?: number;
  Defense?: number;
  Range?: number;
  Slots?: number;
  EquipLevelMin?: number;
  EquipLevelMax?: number;
  WeaponLevel?: number;
  ArmorLevel?: number;
  Refineable?: boolean;
  Gradable?: boolean;
  Locations?: Record<string, boolean>;
  Jobs?: Record<string, boolean>;
  Classes?: Record<string, boolean>;
  Script?: string;
  EquipScript?: string;
  UnEquipScript?: string;
}

interface RathenaMob {
  Id: number;
  AegisName: string;
  Name: string;
  JapaneseName?: string;
  Level: number;
  Hp: number;
  Sp?: number;
  BaseExp: number;
  JobExp: number;
  MvpExp?: number;
  Attack: number;
  Attack2: number;
  Defense: number;
  MagicDefense: number;
  Str: number;
  Agi: number;
  Vit: number;
  Int: number;
  Dex: number;
  Luk: number;
  AttackRange: number;
  SkillRange: number;
  ChaseRange: number;
  Size: string;
  Race: string;
  Element: string;
  ElementLevel: number;
  WalkSpeed: number;
  AttackDelay: number;
  AttackMotion: number;
  DamageMotion: number;
  Ai: string;
  Class?: string;
  Modes?: Record<string, boolean>;
  Drops?: Array<{ Item: string; Rate: number; StealProtected?: boolean }>;
  MvpDrops?: Array<{ Item: string; Rate: number }>;
}

interface RathenaSkill {
  Id: number;
  Name: string;
  Description: string;
  MaxLevel: number;
  Type?: string;
  TargetType?: string;
}

// ─── Merged output types ────────────────────────────────────────────

interface MergedItem {
  id: number;
  aegisName: string;
  nameEn: string;
  namePt: string;
  type: string;
  subType?: string;
  weight: number;
  attack?: number;
  magicAttack?: number;
  defense?: number;
  range?: number;
  slots: number;
  equipLevelMin?: number;
  equipLevelMax?: number;
  weaponLevel?: number;
  armorLevel?: number;
  refineable: boolean;
  gradable: boolean;
  buy?: number;
  sell?: number;
  locations: string[];
  jobs: string[];
  classes: string[];
  description: string[];
  script?: string;
  equipScript?: string;
  classNum: number;
  costume: boolean;
}

interface MergedMob {
  id: number;
  aegisName: string;
  name: string;
  level: number;
  hp: number;
  sp: number;
  baseExp: number;
  jobExp: number;
  mvpExp: number;
  attack: number;
  magicAttack: number;
  defense: number;
  magicDefense: number;
  stats: { str: number; agi: number; vit: number; int: number; dex: number; luk: number };
  attackRange: number;
  skillRange: number;
  chaseRange: number;
  size: string;
  race: string;
  element: string;
  elementLevel: number;
  walkSpeed: number;
  attackDelay: number;
  attackMotion: number;
  damageMotion: number;
  ai: string;
  class: string;
  isMvp: boolean;
  modes: string[];
  drops: Array<{ aegisName: string; rate: number; stealProtected: boolean }>;
  mvpDrops: Array<{ aegisName: string; rate: number }>;
}

interface MergedSkill {
  id: number;
  aegisName: string;
  description: string;
  maxLevel: number;
  type: string;
  targetType: string;
}

// ─── YAML Parser (lightweight, no dependencies) ─────────────────────

function parseRathenaYaml(content: string): any[] {
  const items: any[] = [];
  let inBody = false;
  let currentItem: any = null;
  let currentKey = "";
  let currentList: any[] | null = null;
  let currentListKey = "";
  let currentListItem: any = null;
  let scriptBuffer = "";
  let inScript = false;
  let scriptIndent = 0;

  const lines = content.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trimEnd();

    // Skip comments and empty lines
    if (trimmed === "" || trimmed.startsWith("#")) continue;

    // Detect Body section start
    if (trimmed === "Body:") {
      inBody = true;
      continue;
    }
    if (!inBody) continue;

    // Indentation level
    const indent = line.length - line.trimStart().length;
    const content_ = trimmed.trimStart();

    // Handle multiline scripts
    if (inScript) {
      if (indent > scriptIndent || content_.startsWith("|")) {
        if (!content_.startsWith("|")) {
          scriptBuffer += content_ + "\n";
        }
        continue;
      } else {
        // Script ended
        if (currentItem && currentKey) {
          currentItem[currentKey] = scriptBuffer.trim();
        }
        inScript = false;
        scriptBuffer = "";
      }
    }

    // New top-level item: "  - Id: XXXX"
    if (indent === 2 && content_.startsWith("- Id:")) {
      // Save previous item
      if (currentListItem && currentList) {
        currentList.push(currentListItem);
        currentListItem = null;
      }
      if (currentList && currentItem) {
        currentItem[currentListKey] = currentList;
        currentList = null;
      }
      if (currentItem) {
        items.push(currentItem);
      }
      currentItem = {};
      currentItem.Id = parseInt(content_.split(":")[1].trim());
      currentList = null;
      currentListItem = null;
      continue;
    }

    if (!currentItem) continue;

    // Sub-list item: "      - Item: xxx"
    if (content_.startsWith("- ")) {
      if (currentListItem && currentList) {
        currentList.push(currentListItem);
      }
      const kvStr = content_.substring(2);
      const colonIdx = kvStr.indexOf(":");
      if (colonIdx !== -1) {
        currentListItem = {};
        const k = kvStr.substring(0, colonIdx).trim();
        const v = kvStr.substring(colonIdx + 1).trim();
        currentListItem[k] = parseYamlValue(v);
      }
      continue;
    }

    // Sub-list item continuation: "        Rate: 35"
    if (currentListItem && indent >= 8 && content_.includes(":")) {
      const colonIdx = content_.indexOf(":");
      const k = content_.substring(0, colonIdx).trim();
      const v = content_.substring(colonIdx + 1).trim();
      currentListItem[k] = parseYamlValue(v);
      continue;
    }

    // Map key with nested values: "    Jobs:" or "    Locations:"
    if (indent === 4 && content_.endsWith(":") && !content_.includes(": ")) {
      // Flush any pending list
      if (currentListItem && currentList) {
        currentList.push(currentListItem);
        currentListItem = null;
      }
      if (currentList) {
        currentItem[currentListKey] = currentList;
      }

      const key = content_.slice(0, -1);
      // Check if next lines are list items or map entries
      const nextLine = i + 1 < lines.length ? lines[i + 1] : "";
      const nextTrimmed = nextLine.trimStart();
      if (nextTrimmed.startsWith("- ")) {
        currentList = [];
        currentListKey = key;
        currentListItem = null;
      } else {
        // It's a map (Jobs, Locations, Modes, etc.)
        currentItem[key] = {};
        currentKey = key;
        currentList = null;
      }
      continue;
    }

    // Map entries: "      All: true" or "      Right_Hand: true"
    if (indent === 6 && content_.includes(":") && currentKey) {
      const colonIdx = content_.indexOf(":");
      const k = content_.substring(0, colonIdx).trim();
      const v = content_.substring(colonIdx + 1).trim();
      if (!currentItem[currentKey]) currentItem[currentKey] = {};
      currentItem[currentKey][k] = parseYamlValue(v);
      continue;
    }

    // Regular key-value at item level: "    Name: Scorpion"
    if (indent === 4 && content_.includes(":")) {
      // Flush any pending list
      if (currentListItem && currentList) {
        currentList.push(currentListItem);
        currentListItem = null;
      }
      if (currentList) {
        currentItem[currentListKey] = currentList;
        currentList = null;
      }

      const colonIdx = content_.indexOf(":");
      const key = content_.substring(0, colonIdx).trim();
      const value = content_.substring(colonIdx + 1).trim();

      // Check for multiline script
      if (value === "|" || value === "|1" || value === "|-") {
        inScript = true;
        scriptIndent = indent;
        currentKey = key;
        scriptBuffer = "";
        continue;
      }

      currentItem[key] = parseYamlValue(value);
      currentKey = key;
      continue;
    }
  }

  // Save last item
  if (currentListItem && currentList) {
    currentList.push(currentListItem);
  }
  if (currentList && currentItem) {
    currentItem[currentListKey] = currentList;
  }
  if (currentItem) {
    items.push(currentItem);
  }

  return items;
}

function parseYamlValue(str: string): any {
  if (str === "true") return true;
  if (str === "false") return false;
  if (str === "null" || str === "~" || str === "") return null;
  // Remove quotes
  if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
    return str.slice(1, -1);
  }
  // Numbers
  if (/^-?\d+$/.test(str)) return parseInt(str, 10);
  if (/^-?\d+\.\d+$/.test(str)) return parseFloat(str);
  // Handle "01", "02" etc as strings (AI field)
  if (/^0\d+$/.test(str)) return str;
  return str;
}

// ─── GRF Lua Parser ─────────────────────────────────────────────────

function parseGrfLua(content: string): Map<number, GrfItemEntry> {
  const items = new Map<number, GrfItemEntry>();
  const lines = content.split(/\r?\n/);

  let currentId: number | null = null;
  let blockLines: string[] = [];
  let braceDepth = 0;
  let inItem = false;

  for (const line of lines) {
    const itemStart = line.match(/^\s*\[(\d+)\]\s*=\s*\{?\s*$/);
    if (itemStart) {
      if (currentId !== null && blockLines.length > 0) {
        const entry = parseGrfBlock(currentId, blockLines.join("\n"));
        if (entry) items.set(currentId, entry);
      }
      currentId = parseInt(itemStart[1]);
      blockLines = [];
      braceDepth = line.includes("{") ? 1 : 0;
      inItem = true;
      continue;
    }

    if (inItem && braceDepth === 0 && line.trim() === "{") {
      braceDepth = 1;
      continue;
    }

    if (inItem && braceDepth > 0) {
      for (const ch of line) {
        if (ch === "{") braceDepth++;
        if (ch === "}") braceDepth--;
      }
      blockLines.push(line);
      if (braceDepth <= 0) {
        if (currentId !== null) {
          const entry = parseGrfBlock(currentId, blockLines.join("\n"));
          if (entry) items.set(currentId, entry);
        }
        currentId = null;
        blockLines = [];
        inItem = false;
      }
    }
  }

  if (currentId !== null && blockLines.length > 0) {
    const entry = parseGrfBlock(currentId, blockLines.join("\n"));
    if (entry) items.set(currentId, entry);
  }

  return items;
}

function fixLuaEncoding(str: string): string {
  // The decompiled Lua uses \NNN octal-like byte sequences for non-ASCII
  // Actually unluac outputs UTF-8 escape sequences like \195\167 for ç
  return str
    .replace(/\\(\d{1,3})/g, (_, code) => {
      const byte = parseInt(code, 10);
      if (byte < 128) return String.fromCharCode(byte);
      return String.fromCharCode(byte);
    });
}

function decodeUtf8Escapes(str: string): string {
  // Convert sequences like \195\167 (UTF-8 bytes for ç) to actual characters
  const bytes: number[] = [];
  let i = 0;
  while (i < str.length) {
    if (str[i] === "\\" && i + 1 < str.length && /\d/.test(str[i + 1])) {
      let numStr = "";
      let j = i + 1;
      while (j < str.length && /\d/.test(str[j]) && numStr.length < 3) {
        numStr += str[j];
        j++;
      }
      bytes.push(parseInt(numStr, 10));
      i = j;
    } else {
      // Flush any pending bytes
      if (bytes.length > 0) {
        try {
          const buf = Buffer.from(bytes);
          str = str.substring(0, i - bytes.length * 4) + buf.toString("utf-8") + str.substring(i);
          i = i - bytes.length * 4 + buf.toString("utf-8").length;
        } catch {
          // ignore
        }
        bytes.length = 0;
      }
      i++;
    }
  }
  return str;
}

function extractLuaString(block: string, field: string): string {
  // Use word boundary (\b) to prevent "unidentifiedDisplayName" matching "identifiedDisplayName"
  const quotedRe = new RegExp(`(?:^|[^a-zA-Z])${field}\\s*=\\s*"((?:[^"\\\\]|\\\\.)*)"`);
  const quotedMatch = block.match(quotedRe);
  if (quotedMatch) return decodeUtf8Bytes(quotedMatch[1]);

  // Match: field = [=[value]=]
  const longRe = new RegExp(`(?:^|[^a-zA-Z])${field}\\s*=\\s*\\[=*\\[([\\s\\S]*?)\\]=*\\]`);
  const longMatch = block.match(longRe);
  if (longMatch) return longMatch[1].trim();

  return "";
}

function decodeUtf8Bytes(str: string): string {
  // Replace \NNN sequences with actual bytes, then decode as UTF-8
  const byteArray: number[] = [];
  let i = 0;
  while (i < str.length) {
    if (str[i] === "\\" && i + 1 < str.length && /\d/.test(str[i + 1])) {
      let numStr = "";
      let j = i + 1;
      while (j < str.length && /\d/.test(str[j]) && numStr.length < 3) {
        numStr += str[j];
        j++;
      }
      byteArray.push(parseInt(numStr, 10));
      i = j;
    } else {
      // Flush bytes as UTF-8
      if (byteArray.length > 0) {
        const buf = Buffer.from(byteArray);
        const decoded = buf.toString("utf-8");
        // Replace the pending chars
        for (const ch of decoded) {
          byteArray.length = 0;
        }
        // Rebuild: we need a different approach
      }
      byteArray.push(str.charCodeAt(i));
      i++;
    }
  }

  // Actually, let's do it properly
  return decodeBackslashBytes(str);
}

function decodeBackslashBytes(str: string): string {
  // Split into segments: literal text and \NNN byte sequences
  const parts: Array<{ type: "text"; value: string } | { type: "bytes"; values: number[] }> = [];
  let i = 0;
  let textBuf = "";

  while (i < str.length) {
    if (str[i] === "\\" && i + 1 < str.length && /\d/.test(str[i + 1])) {
      if (textBuf) {
        parts.push({ type: "text", value: textBuf });
        textBuf = "";
      }
      let numStr = "";
      let j = i + 1;
      while (j < str.length && /\d/.test(str[j]) && numStr.length < 3) {
        numStr += str[j];
        j++;
      }
      const byte = parseInt(numStr, 10);
      // Merge with previous byte sequence or start new one
      const last = parts[parts.length - 1];
      if (last && last.type === "bytes") {
        last.values.push(byte);
      } else {
        parts.push({ type: "bytes", values: [byte] });
      }
      i = j;
    } else if (str[i] === "\\" && i + 1 < str.length) {
      // Other escape sequences
      const next = str[i + 1];
      if (next === "n") { textBuf += "\n"; i += 2; }
      else if (next === "t") { textBuf += "\t"; i += 2; }
      else if (next === "\\") { textBuf += "\\"; i += 2; }
      else if (next === '"') { textBuf += '"'; i += 2; }
      else { textBuf += str[i]; i++; }
    } else {
      textBuf += str[i];
      i++;
    }
  }
  if (textBuf) parts.push({ type: "text", value: textBuf });

  // Reconstruct string, decoding byte sequences as UTF-8
  let result = "";
  for (const part of parts) {
    if (part.type === "text") {
      result += part.value;
    } else {
      try {
        result += Buffer.from(part.values).toString("utf-8");
      } catch {
        result += part.values.map((b) => String.fromCharCode(b)).join("");
      }
    }
  }

  return result;
}

function extractLuaStringArray(block: string, field: string): string[] {
  const re = new RegExp(`(?:^|[^a-zA-Z])${field}\\s*=\\s*\\{([\\s\\S]*?)\\}`, "m");
  const match = block.match(re);
  if (!match) return [];

  const entries: string[] = [];
  // Match "..." strings
  const strMatches = match[1].matchAll(/"((?:[^"\\]|\\.)*)"/g);
  for (const m of strMatches) {
    entries.push(decodeBackslashBytes(m[1]));
  }

  return entries;
}

function parseGrfBlock(id: number, block: string): GrfItemEntry | null {
  const identifiedDisplayName = extractLuaString(block, "identifiedDisplayName");
  if (!identifiedDisplayName) return null;

  return {
    id,
    namePt: identifiedDisplayName,
    nameEn: extractLuaString(block, "unidentifiedDisplayName") || identifiedDisplayName,
    description: extractLuaStringArray(block, "identifiedDescriptionName"),
    slotCount: parseInt(block.match(/slotCount\s*=\s*(\d+)/)?.[1] || "0"),
    classNum: parseInt(block.match(/ClassNum\s*=\s*(\d+)/)?.[1] || "0"),
    costume: /costume\s*=\s*true/.test(block),
  };
}

// ─── Merge Logic ────────────────────────────────────────────────────

function mergeItems(
  grfItems: Map<number, GrfItemEntry>,
  rathenaItems: any[]
): MergedItem[] {
  const merged: MergedItem[] = [];
  const processedIds = new Set<number>();

  // First pass: rAthena items (they have stats)
  for (const ra of rathenaItems) {
    const id = ra.Id;
    const grf = grfItems.get(id);
    processedIds.add(id);

    merged.push({
      id,
      aegisName: ra.AegisName || "",
      nameEn: ra.Name || "",
      namePt: grf?.namePt || ra.Name || "",
      type: ra.Type || "Etc",
      subType: ra.SubType,
      weight: (ra.Weight || 0) / 10, // rAthena stores weight * 10
      attack: ra.Attack || undefined,
      magicAttack: ra.MagicAttack || undefined,
      defense: ra.Defense || undefined,
      range: ra.Range || undefined,
      slots: ra.Slots || grf?.slotCount || 0,
      equipLevelMin: ra.EquipLevelMin,
      equipLevelMax: ra.EquipLevelMax,
      weaponLevel: ra.WeaponLevel,
      armorLevel: ra.ArmorLevel,
      refineable: ra.Refineable ?? false,
      gradable: ra.Gradable ?? false,
      buy: ra.Buy,
      sell: ra.Sell,
      locations: ra.Locations ? Object.keys(ra.Locations).filter((k) => ra.Locations[k]) : [],
      jobs: ra.Jobs ? Object.keys(ra.Jobs).filter((k) => ra.Jobs[k]) : [],
      classes: ra.Classes ? Object.keys(ra.Classes).filter((k) => ra.Classes[k]) : [],
      description: grf?.description || [],
      script: ra.Script || undefined,
      equipScript: ra.EquipScript || undefined,
      classNum: grf?.classNum || 0,
      costume: grf?.costume || false,
    });
  }

  // Second pass: GRF-only items (items not in rAthena — custom LATAM items)
  let grfOnlyCount = 0;
  for (const [id, grf] of grfItems) {
    if (processedIds.has(id)) continue;
    grfOnlyCount++;
    merged.push({
      id,
      aegisName: "",
      nameEn: "",
      namePt: grf.namePt,
      type: "Unknown",
      weight: 0,
      slots: grf.slotCount,
      refineable: false,
      gradable: false,
      locations: [],
      jobs: [],
      classes: [],
      description: grf.description,
      classNum: grf.classNum,
      costume: grf.costume,
    });
  }

  console.log(`  GRF-only items (LATAM exclusive): ${grfOnlyCount}`);

  // Fix corrupted encoding: Korean EUC-KR decoded as Latin-1 → no ASCII letters
  // Fall back to English name from rAthena when detected
  let fixedEncoding = 0;
  for (const item of merged) {
    if (item.namePt && item.namePt.length >= 2 && !/[a-zA-Z]/.test(item.namePt)) {
      if (item.nameEn && /[a-zA-Z]/.test(item.nameEn)) {
        item.namePt = item.nameEn; // Use English name as fallback
        fixedEncoding++;
      }
    }
  }
  console.log(`  Fixed corrupted encoding (KR→EN fallback): ${fixedEncoding}`);

  return merged.sort((a, b) => a.id - b.id);
}

function toArray(val: any): any[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  // If parser returned an object instead of array, wrap it
  if (typeof val === "object") return [val];
  return [];
}

function buildMobs(rathenaMobs: any[]): MergedMob[] {
  return rathenaMobs.map((m) => ({
    id: m.Id,
    aegisName: m.AegisName || "",
    name: m.Name || "",
    level: m.Level || 1,
    hp: m.Hp || 1,
    sp: m.Sp || 0,
    baseExp: m.BaseExp || 0,
    jobExp: m.JobExp || 0,
    mvpExp: m.MvpExp || 0,
    attack: m.Attack || 0,
    magicAttack: m.Attack2 || 0,
    defense: m.Defense || 0,
    magicDefense: m.MagicDefense || 0,
    stats: {
      str: m.Str || 0,
      agi: m.Agi || 0,
      vit: m.Vit || 0,
      int: m.Int || 0,
      dex: m.Dex || 0,
      luk: m.Luk || 0,
    },
    attackRange: m.AttackRange || 0,
    skillRange: m.SkillRange || 0,
    chaseRange: m.ChaseRange || 0,
    size: m.Size || "Small",
    race: m.Race || "Formless",
    element: m.Element || "Neutral",
    elementLevel: m.ElementLevel || 1,
    walkSpeed: m.WalkSpeed || 200,
    attackDelay: m.AttackDelay || 0,
    attackMotion: m.AttackMotion || 0,
    damageMotion: m.DamageMotion || 0,
    ai: m.Ai || "06",
    class: m.Class || "Normal",
    isMvp: (m.MvpExp || 0) > 0 || toArray(m.MvpDrops).length > 0,
    modes: m.Modes ? Object.keys(m.Modes).filter((k) => m.Modes[k]) : [],
    drops: toArray(m.Drops).map((d: any) => ({
      aegisName: d.Item || "",
      rate: d.Rate || 0,
      stealProtected: d.StealProtected || false,
    })),
    mvpDrops: toArray(m.MvpDrops).map((d: any) => ({
      aegisName: d.Item || "",
      rate: d.Rate || 0,
    })),
  }));
}

function buildSkills(rathenaSkills: any[]): MergedSkill[] {
  return rathenaSkills.map((s) => ({
    id: s.Id,
    aegisName: s.Name || "",
    description: s.Description || "",
    maxLevel: s.MaxLevel || 1,
    type: s.Type || "None",
    targetType: s.TargetType || "Passive",
  }));
}

// ─── Main ───────────────────────────────────────────────────────────

async function main() {
  console.log("═══════════════════════════════════════════════════════");
  console.log("  LATAM Ragnarok Database Builder");
  console.log("═══════════════════════════════════════════════════════\n");

  // Ensure output directory
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // ─── 1. Parse GRF items (pt-BR names) ─────────────────────────────
  console.log("[1/5] Parsing GRF items (LATAM client, pt-BR)...");
  const grfContent = fs.readFileSync(SOURCES.grfItems, "utf-8");
  const grfItems = parseGrfLua(grfContent);
  console.log(`  Found ${grfItems.size} items from GRF\n`);

  // ─── 2. Parse rAthena items (stats) ───────────────────────────────
  console.log("[2/5] Parsing rAthena items (server-side stats)...");
  const rathenaItems: any[] = [];
  for (const file of [SOURCES.rathenaEquip, SOURCES.rathenaUsable, SOURCES.rathenaEtc]) {
    const basename = path.basename(file);
    if (!fs.existsSync(file)) {
      console.log(`  SKIP: ${basename} not found`);
      continue;
    }
    const content = fs.readFileSync(file, "utf-8");
    const parsed = parseRathenaYaml(content);
    console.log(`  ${basename}: ${parsed.length} items`);
    rathenaItems.push(...parsed);
  }
  console.log(`  Total rAthena items: ${rathenaItems.length}\n`);

  // ─── 3. Merge items ───────────────────────────────────────────────
  console.log("[3/5] Merging GRF + rAthena items...");
  const mergedItems = mergeItems(grfItems, rathenaItems);
  const itemsWithPt = mergedItems.filter((i) => i.namePt && i.namePt !== i.nameEn).length;
  console.log(`  Total merged items: ${mergedItems.length}`);
  console.log(`  With Portuguese names: ${itemsWithPt}\n`);

  fs.writeFileSync(
    path.join(OUTPUT_DIR, "items.json"),
    JSON.stringify(mergedItems, null, 2),
    "utf-8"
  );
  console.log(`  → Saved items.json\n`);

  // ─── 4. Parse monsters ────────────────────────────────────────────
  console.log("[4/5] Parsing rAthena monsters...");
  if (fs.existsSync(SOURCES.rathenaMobs)) {
    const mobContent = fs.readFileSync(SOURCES.rathenaMobs, "utf-8");
    const rathenaMobs = parseRathenaYaml(mobContent);
    const mergedMobs = buildMobs(rathenaMobs);
    const mvps = mergedMobs.filter((m) => m.isMvp).length;
    console.log(`  Total monsters: ${mergedMobs.length}`);
    console.log(`  MVPs: ${mvps}\n`);

    fs.writeFileSync(
      path.join(OUTPUT_DIR, "monsters.json"),
      JSON.stringify(mergedMobs, null, 2),
      "utf-8"
    );
    console.log(`  → Saved monsters.json\n`);
  }

  // ─── 5. Parse skills ──────────────────────────────────────────────
  console.log("[5/5] Parsing rAthena skills...");
  if (fs.existsSync(SOURCES.rathenaSkills)) {
    const skillContent = fs.readFileSync(SOURCES.rathenaSkills, "utf-8");
    const rathenaSkills = parseRathenaYaml(skillContent);
    const mergedSkills = buildSkills(rathenaSkills);
    console.log(`  Total skills: ${mergedSkills.length}\n`);

    fs.writeFileSync(
      path.join(OUTPUT_DIR, "skills.json"),
      JSON.stringify(mergedSkills, null, 2),
      "utf-8"
    );
    console.log(`  → Saved skills.json\n`);
  }

  // ─── Summary ──────────────────────────────────────────────────────
  console.log("═══════════════════════════════════════════════════════");
  console.log("  Database build complete!");
  console.log("═══════════════════════════════════════════════════════");
  console.log(`\n  Output directory: ${OUTPUT_DIR}`);

  const files = fs.readdirSync(OUTPUT_DIR);
  for (const f of files) {
    const stat = fs.statSync(path.join(OUTPUT_DIR, f));
    console.log(`    ${f} (${(stat.size / 1024 / 1024).toFixed(1)}MB)`);
  }

  // ─── Create AegisName → ID lookup for drop resolution ─────────────
  const aegisToId: Record<string, number> = {};
  for (const item of mergedItems) {
    if (item.aegisName) aegisToId[item.aegisName] = item.id;
  }
  fs.writeFileSync(
    path.join(OUTPUT_DIR, "aegis-to-id.json"),
    JSON.stringify(aegisToId, null, 2),
    "utf-8"
  );
  console.log(`    aegis-to-id.json (lookup table for drop resolution)`);

  // ─── Diff / Changelog ─────────────────────────────────────────────
  const changelogPath = path.join(OUTPUT_DIR, "changelog.json");
  const snapshotPath = path.join(OUTPUT_DIR, "items-snapshot.json");

  // Load previous snapshot if exists
  let changelog: Array<{
    date: string;
    newItems: Array<{ id: number; namePt: string; nameEn: string; type: string }>;
    changedItems: Array<{ id: number; namePt: string; nameEn: string; type: string; changes: string[] }>;
    removedCount: number;
  }> = [];

  if (fs.existsSync(changelogPath)) {
    try { changelog = JSON.parse(fs.readFileSync(changelogPath, "utf-8")); } catch {}
  }

  if (fs.existsSync(snapshotPath)) {
    console.log("\n[Diff] Comparing with previous snapshot...");
    const oldItems: MergedItem[] = JSON.parse(fs.readFileSync(snapshotPath, "utf-8"));
    const oldMap = new Map(oldItems.map((i) => [i.id, i]));
    const newMap = new Map(mergedItems.map((i) => [i.id, i]));

    const newItemsList: Array<{ id: number; namePt: string; nameEn: string; type: string }> = [];
    const changedItemsList: Array<{ id: number; namePt: string; nameEn: string; type: string; changes: string[] }> = [];

    for (const item of mergedItems) {
      const old = oldMap.get(item.id);
      if (!old) {
        newItemsList.push({ id: item.id, namePt: item.namePt, nameEn: item.nameEn, type: item.type });
      } else {
        // Check for meaningful changes
        const changes: string[] = [];
        if (old.namePt !== item.namePt) changes.push(`nome: "${old.namePt}" → "${item.namePt}"`);
        if (old.type !== item.type) changes.push(`tipo: ${old.type} → ${item.type}`);
        if (old.attack !== item.attack) changes.push(`ATK: ${old.attack} → ${item.attack}`);
        if (old.defense !== item.defense) changes.push(`DEF: ${old.defense} → ${item.defense}`);
        if (old.script !== item.script) changes.push("script alterado");
        if (old.slots !== item.slots) changes.push(`slots: ${old.slots} → ${item.slots}`);
        if (changes.length > 0) {
          changedItemsList.push({ id: item.id, namePt: item.namePt, nameEn: item.nameEn, type: item.type, changes });
        }
      }
    }

    const removedCount = oldItems.filter((i) => !newMap.has(i.id)).length;

    if (newItemsList.length > 0 || changedItemsList.length > 0 || removedCount > 0) {
      const entry = {
        date: new Date().toISOString().split("T")[0],
        newItems: newItemsList,
        changedItems: changedItemsList,
        removedCount,
      };
      // Prepend (newest first), keep last 50 entries
      changelog.unshift(entry);
      if (changelog.length > 50) changelog = changelog.slice(0, 50);

      console.log(`  New items: ${newItemsList.length}`);
      console.log(`  Changed items: ${changedItemsList.length}`);
      console.log(`  Removed items: ${removedCount}`);
    } else {
      console.log("  No changes detected.");
    }
  } else {
    console.log("\n[Diff] No previous snapshot — first build, creating baseline.");
    // First build: all items are "new" — create initial changelog entry
    changelog.unshift({
      date: new Date().toISOString().split("T")[0],
      newItems: mergedItems.slice(0, 20).map((i) => ({ id: i.id, namePt: i.namePt, nameEn: i.nameEn, type: i.type })),
      changedItems: [],
      removedCount: 0,
    });
  }

  // Save changelog and snapshot
  fs.writeFileSync(changelogPath, JSON.stringify(changelog, null, 2), "utf-8");
  fs.writeFileSync(snapshotPath, JSON.stringify(mergedItems), "utf-8");
  console.log("  → Saved changelog.json + items-snapshot.json");

  console.log("\nDone! Ready for DB seeding.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
