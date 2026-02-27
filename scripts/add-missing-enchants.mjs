/**
 * add-missing-enchants.mjs
 *
 * Adds missing common random option enchants to the database.
 * Covers ALL common bRO/LATAM enchant categories:
 * - Stats, CRIT, ATK, MATK, DEF, MDEF, Flee, Hit, ASPD
 * - Pós-Conjuração (After Cast Delay)
 * - Conjuração Variável (Variable Cast)
 * - Conjuração Fixa (Fixed Cast)
 * - Dano Físico / Mágico (Physical / Magical Damage %)
 * - Dano a Distância / Corpo a Corpo (Ranged / Melee)
 * - Dano Crítico (Critical Damage)
 * - Dano contra Raça (Race damage)
 * - Dano contra Tamanho (Size damage)
 * - Dano contra Elemento (Element damage)
 * - Resistência a Raça / Elemento
 * - HP/SP regen, drain, max
 * - Esquiva Perfeita, Tolerância
 * - Muscle Fool, Hawkeye, Lucky Day, Sharp, Fighting Spirit, Spell
 *
 * Usage: node scripts/add-missing-enchants.mjs
 */

import fs from "fs";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "database", "items.json");
const items = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));

// Find existing enchant names to avoid duplicates
const existingNames = new Set();
items.forEach((i) => {
  if (i.type === "Card" && (!i.locations || i.locations.length === 0)) {
    existingNames.add((i.namePt || i.nameEn || "").trim());
  }
});

let nextId = Math.max(...items.map((i) => i.id)) + 1;

const toAdd = [];

function add(namePt, script) {
  if (existingNames.has(namePt)) return;
  existingNames.add(namePt); // prevent double-add within this run
  toAdd.push({
    id: nextId++,
    aegisName: `Enchant_${namePt.replace(/[^a-zA-Z0-9]/g, "_")}_LATAM`,
    nameEn: namePt,
    namePt,
    type: "Card",
    subType: "",
    weight: 0,
    slots: 0,
    refineable: false,
    gradable: false,
    locations: [],
    jobs: [],
    classes: [],
    description: [namePt],
    script,
    classNum: 0,
    costume: false,
  });
}

// ─── Helper to generate ranges ─────────────────────────────────────

function range(name, bonus, min, max, step = 1) {
  for (let v = min; v <= max; v += step) {
    add(`${name} +${v}`, `bonus ${bonus},${v};`);
  }
}

function rangeNeg(name, bonus, min, max, step = 1) {
  for (let v = min; v <= max; v += step) {
    add(`${name} -${v}%`, `bonus ${bonus},-${v};`);
  }
}

function rangePct(name, bonus, min, max, step = 1) {
  for (let v = min; v <= max; v += step) {
    add(`${name} +${v}%`, `bonus ${bonus},${v};`);
  }
}

// ═══════════════════════════════════════════════════════════════════
// BASIC STATS (+1 to +10)
// ═══════════════════════════════════════════════════════════════════
range("FOR", "bStr", 1, 10);
range("AGI", "bAgi", 1, 10);
range("VIT", "bVit", 1, 10);
range("INT", "bInt", 1, 10);
range("DES", "bDex", 1, 10);
range("SOR", "bLuk", 1, 10);

// ═══════════════════════════════════════════════════════════════════
// COMBAT STATS
// ═══════════════════════════════════════════════════════════════════

// CRIT +1 to +10
range("CRIT", "bCritical", 1, 10);

// ATQ flat +1 to +25
range("ATQ", "bBaseAtk", 1, 25);

// ATQM flat +1 to +25
range("ATQM", "bMatk", 1, 25);

// ATQ % +1 to +10
rangePct("ATQ", "bAtkRate", 1, 10);

// ATQM % +1 to +10
rangePct("ATQM", "bMatkRate", 1, 10);

// DEF +1 to +10
range("DEF", "bDef", 1, 10);

// DEFM +1 to +10
range("DEFM", "bMdef", 1, 10);

// Flee +1 to +20
range("ESQV", "bFlee", 1, 20);

// Hit +1 to +20
range("PREC", "bHit", 1, 20);

// Perfect Dodge +1 to +5
range("Esquiva Perfeita", "bFlee2", 1, 5);

// ASPD +1 to +3
range("ASPD", "bAspd", 1, 3);

// ASPD % +1 to +5
rangePct("Vel. Ataque", "bAspdRate", 1, 10);

// ═══════════════════════════════════════════════════════════════════
// HP / SP
// ═══════════════════════════════════════════════════════════════════

// HP flat +50 to +1000
for (const v of [50, 100, 150, 200, 250, 300, 400, 500, 600, 700, 800, 900, 1000]) {
  add(`HP +${v}`, `bonus bMaxHP,${v};`);
}

// SP flat +10 to +200
for (const v of [10, 25, 50, 75, 100, 125, 150, 200]) {
  add(`SP +${v}`, `bonus bMaxSP,${v};`);
}

// HP % +1 to +10
rangePct("HP", "bMaxHPrate", 1, 10);

// SP % +1 to +10
rangePct("SP", "bMaxSPrate", 1, 10);

// HP Regen +1 to +5
rangePct("Recup. HP", "bHPrecovRate", 5, 30, 5);

// SP Regen +1 to +5
rangePct("Recup. SP", "bSPrecovRate", 5, 30, 5);

// HP Drain +1 to +5%
for (let v = 1; v <= 5; v++) {
  add(`Drenagem HP +${v}%`, `bonus2 bHPDrainRate,${v * 10},1;`);
}

// SP Drain +1 to +5%
for (let v = 1; v <= 5; v++) {
  add(`Drenagem SP +${v}%`, `bonus2 bSPDrainRate,${v * 10},1;`);
}

// ═══════════════════════════════════════════════════════════════════
// CAST TIME
// ═══════════════════════════════════════════════════════════════════

// Pós-Conjuração (After Cast Delay) -1% to -10%
rangeNeg("Pós-Conjuração", "bDelayrate", 1, 10);

// Conjuração Variável (Variable Cast) -1% to -10%
rangeNeg("Conjuração Variável", "bVariableCastrate", 1, 10);

// Conjuração Fixa (Fixed Cast) -100ms to -1000ms (step 100)
for (let v = 100; v <= 1000; v += 100) {
  add(`Conjuração Fixa -${v}ms`, `bonus bFixedCast,-${v};`);
}

// Conjuração Fixa % -1% to -10%
rangeNeg("Conjuração Fixa", "bFixedCastrate", 1, 10);

// ═══════════════════════════════════════════════════════════════════
// DAMAGE TYPE
// ═══════════════════════════════════════════════════════════════════

// Dano Físico % +1 to +10
rangePct("Dano Físico", "bAtkRate", 1, 10);

// Dano Mágico % +1 to +10
rangePct("Dano Mágico", "bMatkRate", 1, 10);

// Dano a Distância (Ranged) +1 to +10%
rangePct("Dano a Distância", "bLongAtkRate", 1, 15);

// Dano Corpo a Corpo (Melee) +1 to +10%
rangePct("Dano Corpo a Corpo", "bShortAtkRate", 1, 15);

// Dano Crítico +1 to +10%
rangePct("Dano Crítico", "bCritAtkRate", 1, 15);

// ═══════════════════════════════════════════════════════════════════
// DAMAGE VS RACE
// ═══════════════════════════════════════════════════════════════════

const RACES = {
  "Amorfo": "RC_Formless",
  "Morto-Vivo": "RC_Undead",
  "Bruto": "RC_Brute",
  "Planta": "RC_Plant",
  "Inseto": "RC_Insect",
  "Peixe": "RC_Fish",
  "Demônio": "RC_Demon",
  "Demi-Humano": "RC_DemiHuman",
  "Anjo": "RC_Angel",
  "Dragão": "RC_Dragon",
};

for (const [racePt, raceConst] of Object.entries(RACES)) {
  for (let v = 1; v <= 10; v++) {
    add(`Dano vs ${racePt} +${v}%`, `bonus2 bAddRace,${raceConst},${v};`);
  }
}

// Magical damage vs race
for (const [racePt, raceConst] of Object.entries(RACES)) {
  for (let v = 1; v <= 10; v++) {
    add(`Dano Mág. vs ${racePt} +${v}%`, `bonus2 bMagicAddRace,${raceConst},${v};`);
  }
}

// ═══════════════════════════════════════════════════════════════════
// DAMAGE VS SIZE
// ═══════════════════════════════════════════════════════════════════

const SIZES = {
  "Pequeno": "Size_Small",
  "Médio": "Size_Medium",
  "Grande": "Size_Large",
};

for (const [sizePt, sizeConst] of Object.entries(SIZES)) {
  for (let v = 1; v <= 10; v++) {
    add(`Dano vs ${sizePt} +${v}%`, `bonus2 bAddSize,${sizeConst},${v};`);
  }
}

// All sizes
for (let v = 1; v <= 10; v++) {
  add(`Dano vs Todos Tamanhos +${v}%`, `bonus2 bAddSize,Size_Small,${v}; bonus2 bAddSize,Size_Medium,${v}; bonus2 bAddSize,Size_Large,${v};`);
}

// ═══════════════════════════════════════════════════════════════════
// DAMAGE VS ELEMENT
// ═══════════════════════════════════════════════════════════════════

const ELEMENTS = {
  "Neutro": "Ele_Neutral",
  "Água": "Ele_Water",
  "Terra": "Ele_Earth",
  "Fogo": "Ele_Fire",
  "Vento": "Ele_Wind",
  "Veneno": "Ele_Poison",
  "Sagrado": "Ele_Holy",
  "Sombrio": "Ele_Dark",
  "Fantasma": "Ele_Ghost",
  "Maldito": "Ele_Undead",
};

for (const [elemPt, elemConst] of Object.entries(ELEMENTS)) {
  for (let v = 1; v <= 10; v++) {
    add(`Dano vs ${elemPt} +${v}%`, `bonus2 bAddEle,${elemConst},${v};`);
  }
}

// ═══════════════════════════════════════════════════════════════════
// RESISTANCE VS RACE
// ═══════════════════════════════════════════════════════════════════

for (const [racePt, raceConst] of Object.entries(RACES)) {
  for (let v = 1; v <= 5; v++) {
    add(`Resist. vs ${racePt} +${v}%`, `bonus2 bSubRace,${raceConst},${v};`);
  }
}

// ═══════════════════════════════════════════════════════════════════
// RESISTANCE VS ELEMENT
// ═══════════════════════════════════════════════════════════════════

for (const [elemPt, elemConst] of Object.entries(ELEMENTS)) {
  for (let v = 1; v <= 10; v++) {
    add(`Resist. vs ${elemPt} +${v}%`, `bonus2 bSubEle,${elemConst},${v};`);
  }
}

// ═══════════════════════════════════════════════════════════════════
// RESISTANCE VS SIZE
// ═══════════════════════════════════════════════════════════════════

for (const [sizePt, sizeConst] of Object.entries(SIZES)) {
  for (let v = 1; v <= 5; v++) {
    add(`Resist. vs ${sizePt} +${v}%`, `bonus2 bSubSize,${sizeConst},${v};`);
  }
}

// ═══════════════════════════════════════════════════════════════════
// REDUCTION
// ═══════════════════════════════════════════════════════════════════

// Redução de Dano Físico
rangePct("Redução Dano Físico", "bShortSubRate", 1, 5);
rangePct("Redução Dano a Distância", "bLongSubRate", 1, 5);

// ═══════════════════════════════════════════════════════════════════
// TOLERANCE (bSubClass)
// ═══════════════════════════════════════════════════════════════════

for (let v = 1; v <= 5; v++) {
  add(`Tolerância +${v}%`, `bonus2 bSubClass,Class_All,${v};`);
}
for (let v = 1; v <= 5; v++) {
  add(`Tolerância Normal +${v}%`, `bonus2 bSubClass,Class_Normal,${v};`);
}
for (let v = 1; v <= 5; v++) {
  add(`Tolerância Boss +${v}%`, `bonus2 bSubClass,Class_Boss,${v};`);
}

// ═══════════════════════════════════════════════════════════════════
// CLASSIC ENCHANT SERIES (Sharp, Fighting Spirit, Spell, etc.)
// ═══════════════════════════════════════════════════════════════════

// These already exist in EN form but adding PT equivalents

// Muscle Fool (FOR + ATQ)
for (let lv = 1; lv <= 10; lv++) {
  const str = Math.ceil(lv * 0.5);
  const atk = lv * 2;
  add(`Muscle Fool Lv${lv}`, `bonus bStr,${str}; bonus bBaseAtk,${atk};`);
}

// Hawkeye (DES + ranged)
for (let lv = 1; lv <= 10; lv++) {
  const dex = Math.ceil(lv * 0.5);
  const ranged = lv * 2;
  add(`Hawkeye Lv${lv}`, `bonus bDex,${dex}; bonus bLongAtkRate,${ranged};`);
}

// Lucky Day (SOR + CRIT)
for (let lv = 1; lv <= 10; lv++) {
  const luk = Math.ceil(lv * 0.5);
  const crit = lv;
  add(`Lucky Day Lv${lv}`, `bonus bLuk,${luk}; bonus bCritical,${crit};`);
}

// Spell Buster (INT + MATK)
for (let lv = 1; lv <= 10; lv++) {
  const int = Math.ceil(lv * 0.5);
  const matk = lv * 2;
  add(`Spell Buster Lv${lv}`, `bonus bInt,${int}; bonus bMatk,${matk};`);
}

// Health (VIT + HP)
for (let lv = 1; lv <= 10; lv++) {
  const vit = Math.ceil(lv * 0.5);
  const hp = lv * 100;
  add(`Health Lv${lv}`, `bonus bVit,${vit}; bonus bMaxHP,${hp};`);
}

// Speed of Light (AGI + ASPD)
for (let lv = 1; lv <= 5; lv++) {
  const agi = lv;
  add(`Speed of Light Lv${lv}`, `bonus bAgi,${agi}; bonus bAspd,1;`);
}

// ═══════════════════════════════════════════════════════════════════
// DAMAGE VS CLASS (Boss / Normal)
// ═══════════════════════════════════════════════════════════════════

for (let v = 1; v <= 10; v++) {
  add(`Dano vs Boss +${v}%`, `bonus2 bAddClass,Class_Boss,${v};`);
}
for (let v = 1; v <= 10; v++) {
  add(`Dano vs Normal +${v}%`, `bonus2 bAddClass,Class_Normal,${v};`);
}

// Magical
for (let v = 1; v <= 10; v++) {
  add(`Dano Mág. vs Boss +${v}%`, `bonus2 bMagicAddClass,Class_Boss,${v};`);
}
for (let v = 1; v <= 10; v++) {
  add(`Dano Mág. vs Normal +${v}%`, `bonus2 bMagicAddClass,Class_Normal,${v};`);
}

// ═══════════════════════════════════════════════════════════════════
// SP COST
// ═══════════════════════════════════════════════════════════════════

rangeNeg("Custo SP", "bUseSPrate", 1, 10);

// ═══════════════════════════════════════════════════════════════════
// STATUS IMMUNITY / RESISTANCE
// ═══════════════════════════════════════════════════════════════════

const STATUS_EFFECTS = {
  "Atordoamento": "Eff_Stun",
  "Congelamento": "Eff_Freeze",
  "Petrificação": "Eff_Stone",
  "Silêncio": "Eff_Silence",
  "Cegueira": "Eff_Blind",
  "Sono": "Eff_Sleep",
  "Maldição": "Eff_Curse",
  "Sangramento": "Eff_Bleeding",
  "Confusão": "Eff_Confusion",
  "Envenenamento": "Eff_Poison",
};

for (const [statusPt, statusConst] of Object.entries(STATUS_EFFECTS)) {
  for (let v = 10; v <= 50; v += 10) {
    add(`Resist. ${statusPt} +${v}%`, `bonus2 bResEff,${statusConst},${v * 100};`);
  }
}

// ═══════════════════════════════════════════════════════════════════
// SAVE
// ═══════════════════════════════════════════════════════════════════

// Add all new items
for (const item of toAdd) {
  items.push(item);
}

fs.writeFileSync(DB_PATH, JSON.stringify(items, null, 2));

console.log(`\nResults:`);
console.log(`  Existing enchants: ${existingNames.size - toAdd.length}`);
console.log(`  Added: ${toAdd.length}`);

// Group by category for summary
const categories = new Map();
for (const item of toAdd) {
  const base = item.namePt.replace(/\s*[+-]?\d+%?(ms)?\s*$/, "").replace(/\s*Lv\d+$/, "").trim();
  if (!categories.has(base)) categories.set(base, 0);
  categories.set(base, categories.get(base) + 1);
}

console.log(`\nAdded by category:`);
[...categories.entries()]
  .sort((a, b) => a[0].localeCompare(b[0]))
  .forEach(([cat, count]) => console.log(`  ${cat}: ${count} enchants`));
