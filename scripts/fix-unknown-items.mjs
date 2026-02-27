/**
 * fix-unknown-items.mjs
 *
 * Parses the description of items with type "Unknown" in items.json
 * and extracts type, locations, defense, weight, level, jobs, etc.
 * from the Portuguese description text (same format as the client).
 *
 * Usage: node scripts/fix-unknown-items.mjs
 */

import fs from "fs";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "database", "items.json");
const items = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));

// ─── Description parsers ────────────────────────────────────────────

function stripColor(text) {
  return text.replace(/\^[0-9a-fA-F]{6}/g, "");
}

// "Tipo: ^777777Equip. para Cabeça^000000" → "Equip. para Cabeça"
// "Tipo: ^777777Carta^000000" → "Carta"
function parseType(desc) {
  for (const line of desc) {
    const clean = stripColor(line);
    const m = clean.match(/^Tipo:\s*(.+)/i);
    if (m) return m[1].trim();
  }
  return null;
}

// "Equipa em: ^777777Topo^000000" → ["Head_Top"]
const EQUIP_MAP = {
  "Topo": "Head_Top",
  "Meio": "Head_Mid",
  "Baixo": "Head_Low",
  "Topo, Meio": "Head_Top,Head_Mid",
  "Topo, Baixo": "Head_Top,Head_Low",
  "Meio, Baixo": "Head_Mid,Head_Low",
  "Topo, Meio, Baixo": "Head_Top,Head_Mid,Head_Low",
  "Topo, Meio e Baixo": "Head_Top,Head_Mid,Head_Low",
  "Armadura": "Armor",
  "Capa": "Garment",
  "Sapatos": "Shoes",
  "Acessório": "Right_Accessory",
  "Mão Direita": "Right_Hand",
  "Mão Esquerda": "Left_Hand",
  "Ambas as Mãos": "Both_Hand",
  "Arma": "Right_Hand",
  "Escudo": "Left_Hand",
};

function parseLocations(desc) {
  for (const line of desc) {
    const clean = stripColor(line);
    const m = clean.match(/^Equipa em:\s*(.+)/i);
    if (m) {
      const raw = m[1].trim();
      // Try direct match
      if (EQUIP_MAP[raw]) return EQUIP_MAP[raw].split(",");
      // Try partial matches
      for (const [key, val] of Object.entries(EQUIP_MAP)) {
        if (raw.includes(key)) return val.split(",");
      }
      return [raw]; // fallback
    }
  }
  return [];
}

// "DEF: ^7777770^000000" or "DEF: ^7777770^000000 DEFM: ^7777770^000000"
function parseDef(desc) {
  let defense = 0, mdef = 0;
  for (const line of desc) {
    const clean = stripColor(line);
    const defM = clean.match(/DEF:\s*(\d+)/);
    if (defM) defense = parseInt(defM[1]);
    const mdefM = clean.match(/DEFM:\s*(\d+)/);
    if (mdefM) mdef = parseInt(mdefM[1]);
  }
  return { defense, mdef };
}

// "ATQ: ^777777120^000000" or "ATQ: ^777777120^000000 ATQM: ^777777100^000000"
function parseAtk(desc) {
  let attack = 0, magicAttack = 0;
  for (const line of desc) {
    const clean = stripColor(line);
    const atkM = clean.match(/ATQ:\s*(\d+)/);
    if (atkM) attack = parseInt(atkM[1]);
    const matkM = clean.match(/ATQM:\s*(\d+)/);
    if (matkM) magicAttack = parseInt(matkM[1]);
  }
  return { attack, magicAttack };
}

// "Peso: ^77777740^000000" → 40
function parseWeight(desc) {
  for (const line of desc) {
    const clean = stripColor(line);
    const m = clean.match(/^Peso:\s*(\d+)/i);
    if (m) return parseInt(m[1]);
  }
  return 0;
}

// "Nível necessário: ^777777100^000000" → 100
function parseLevel(desc) {
  for (const line of desc) {
    const clean = stripColor(line);
    const m = clean.match(/N[ií]vel necess[aá]rio:\s*(\d+)/i);
    if (m) return parseInt(m[1]);
  }
  return 0;
}

// "Nível da Arma: ^7777774^000000" → 4
function parseWeaponLevel(desc) {
  for (const line of desc) {
    const clean = stripColor(line);
    const m = clean.match(/N[ií]vel da Arma:\s*(\d+)/i);
    if (m) return parseInt(m[1]);
  }
  return undefined;
}

// "Classes: ^777777Todas^000000" → ["All"]
const CLASS_MAP = {
  "Todas": "All",
  "Todas as Classes": "All",
  "Aprendiz": "Novice",
  "Espadachim": "Swordman",
  "Mago": "Mage",
  "Arqueiro": "Archer",
  "Gatuno": "Thief",
  "Mercador": "Merchant",
  "Noviço": "Acolyte",
};

function parseJobs(desc) {
  for (const line of desc) {
    const clean = stripColor(line);
    const m = clean.match(/^Classes:\s*(.+)/i);
    if (m) {
      const raw = m[1].trim();
      if (raw === "Todas" || raw === "Todas as Classes") return [];  // empty = all
      return raw.split(/[,\/]/).map(s => CLASS_MAP[s.trim()] || s.trim());
    }
  }
  return [];
}

// Map Portuguese type to DB type
function mapType(ptType) {
  if (!ptType) return "Unknown";
  const t = ptType.toLowerCase();
  if (t.includes("cabeça") || t.includes("capacete") || t.includes("visual")) return "Armor";
  if (t.includes("armadura")) return "Armor";
  if (t.includes("escudo")) return "Armor";
  if (t.includes("capa") || t.includes("manto")) return "Armor";
  if (t.includes("sapato") || t.includes("bota") || t.includes("calçado")) return "Armor";
  if (t.includes("acessório") || t.includes("acess")) return "Armor";
  if (t.includes("arma") || t.includes("espada") || t.includes("adaga") || t.includes("lança") || t.includes("maça") || t.includes("machado") || t.includes("arco") || t.includes("instrumento") || t.includes("chicote") || t.includes("livro") || t.includes("katar") || t.includes("revólver") || t.includes("rifle") || t.includes("granada") || t.includes("shuriken") || t.includes("punho")) return "Weapon";
  if (t.includes("carta")) return "Card";
  if (t.includes("consumível") || t.includes("poção") || t.includes("item de cura")) return "Consumable";
  if (t.includes("munição") || t.includes("flecha")) return "Ammo";
  return "Armor"; // default for equip-like items
}

// Map Portuguese subType for weapons
function mapWeaponSubType(desc) {
  for (const line of desc) {
    const clean = stripColor(line);
    const m = clean.match(/^Tipo:\s*(.+)/i);
    if (m) {
      const t = m[1].trim().toLowerCase();
      if (t.includes("espada de uma")) return "1hSword";
      if (t.includes("espada de duas") || t.includes("espada duas")) return "2hSword";
      if (t.includes("adaga")) return "Dagger";
      if (t.includes("lança de uma")) return "1hSpear";
      if (t.includes("lança de duas") || t.includes("lança duas")) return "2hSpear";
      if (t.includes("maça de uma") || t.includes("maça")) return "Mace";
      if (t.includes("maça de duas")) return "2hMace";
      if (t.includes("machado de uma")) return "1hAxe";
      if (t.includes("machado de duas") || t.includes("machado duas")) return "2hAxe";
      if (t.includes("arco")) return "Bow";
      if (t.includes("katar")) return "Katar";
      if (t.includes("livro")) return "Book";
      if (t.includes("instrumento") || t.includes("violino")) return "Musical";
      if (t.includes("chicote")) return "Whip";
      if (t.includes("cajado de uma") || t.includes("cajado")) return "1hStaff";
      if (t.includes("cajado de duas") || t.includes("cajado duas")) return "2hStaff";
      if (t.includes("revólver") || t.includes("pistola")) return "Revolver";
      if (t.includes("rifle")) return "Rifle";
      if (t.includes("gatling") || t.includes("metralhadora")) return "Gatling";
      if (t.includes("escopeta") || t.includes("shotgun")) return "Shotgun";
      if (t.includes("granada") || t.includes("lançador")) return "Grenade";
      if (t.includes("huuma") || t.includes("shuriken grande")) return "Huuma";
    }
  }
  return undefined;
}

// ─── Main processing ────────────────────────────────────────────────

let fixed = 0;
let skipped = 0;
const fixedItems = [];

for (const item of items) {
  if (item.type !== "Unknown") continue;
  if (!item.description || item.description.length === 0) {
    skipped++;
    continue;
  }

  const ptType = parseType(item.description);
  const dbType = mapType(ptType);
  const locations = parseLocations(item.description);
  const { defense, mdef } = parseDef(item.description);
  const { attack, magicAttack } = parseAtk(item.description);
  const weight = parseWeight(item.description);
  const equipLevelMin = parseLevel(item.description);
  const weaponLevel = parseWeaponLevel(item.description);
  const jobs = parseJobs(item.description);

  // Only fix if we could determine something useful
  if (dbType === "Unknown" && locations.length === 0) {
    skipped++;
    continue;
  }

  item.type = dbType;
  if (locations.length > 0) item.locations = locations;
  if (defense > 0) item.defense = defense;
  if (mdef > 0) item.mdef = mdef;
  if (attack > 0) item.attack = attack;
  if (magicAttack > 0) item.magicAttack = magicAttack;
  if (weight > 0) item.weight = weight;
  if (equipLevelMin > 0) item.equipLevelMin = equipLevelMin;
  if (weaponLevel) item.weaponLevel = weaponLevel;
  if (jobs.length > 0) item.jobs = jobs;
  item.refineable = item.description.some(d => stripColor(d).toLowerCase().includes("refino"));

  if (dbType === "Weapon") {
    const subType = mapWeaponSubType(item.description);
    if (subType) item.subType = subType;
  }

  // Generate aegisName if missing
  if (!item.aegisName) {
    const name = item.namePt || item.nameEn || `Item_${item.id}`;
    item.aegisName = name
      .replace(/\[|\]/g, "")
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9_]/g, "")
      .substring(0, 50) + "_LATAM";
  }
  if (!item.nameEn) item.nameEn = item.namePt || `Unknown Item ${item.id}`;

  fixed++;
  fixedItems.push({ id: item.id, name: item.namePt, type: item.type, locations: item.locations });
}

// Save
fs.writeFileSync(DB_PATH, JSON.stringify(items, null, 2));

console.log(`\nResults:`);
console.log(`  Total Unknown: ${fixed + skipped}`);
console.log(`  Fixed: ${fixed}`);
console.log(`  Skipped (no useful data): ${skipped}`);
console.log(`\nFixed items sample:`);
fixedItems.slice(0, 30).forEach(i =>
  console.log(`  ${i.id} ${i.name} → ${i.type} [${(i.locations || []).join(",")}]`)
);
