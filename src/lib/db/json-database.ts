/**
 * JSON-based database — Loads data/database/*.json into memory.
 * Works without PostgreSQL. Cached after first load.
 */

import * as fs from "fs";
import * as path from "path";

// ─── Types ──────────────────────────────────────────────────────────

export interface DbItem {
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
  affix?: { text: string; type: "prefix" | "suffix" };
}

export interface DbMonster {
  id: number;
  aegisName: string;
  name: string;
  namePt: string;
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

export interface DbSkill {
  id: number;
  aegisName: string;
  description: string;
  namePt: string;
  maxLevel: number;
  type: string;
  targetType: string;
}

// ─── Text normalization ─────────────────────────────────────────────

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// ─── Cache ──────────────────────────────────────────────────────────

let _items: DbItem[] | null = null;
let _monsters: DbMonster[] | null = null;
let _skills: DbSkill[] | null = null;
let _aegisToId: Record<string, number> | null = null;

const DB_DIR = path.join(process.cwd(), "data", "database");
const TRANSLATIONS_DIR = path.join(process.cwd(), "data", "translations");

function loadJson<T>(filename: string): T {
  return JSON.parse(fs.readFileSync(path.join(DB_DIR, filename), "utf-8"));
}

function loadTranslation(filename: string): Record<string, string> {
  const filePath = path.join(TRANSLATIONS_DIR, filename);
  if (!fs.existsSync(filePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return {};
  }
}

export function getItems(): DbItem[] {
  if (!_items) {
    const raw = loadJson<DbItem[]>("items.json");
    const affixPath = path.join(TRANSLATIONS_DIR, "card-affixes-pt.json");
    let affixes: Record<string, { text: string; type: "prefix" | "suffix" }> = {};
    if (fs.existsSync(affixPath)) {
      try { affixes = JSON.parse(fs.readFileSync(affixPath, "utf-8")); } catch {}
    }
    _items = raw.map((item) => {
      const a = affixes[String(item.id)];
      return a ? { ...item, affix: a } : item;
    });
  }
  return _items;
}

export function getMonsters(): DbMonster[] {
  if (!_monsters) {
    const raw = loadJson<DbMonster[]>("monsters.json");
    const ptNames = loadTranslation("mob-names-pt.json");
    _monsters = raw.map((m) => ({
      ...m,
      namePt: ptNames[String(m.id)] || m.name,
    }));
  }
  return _monsters;
}

export function getSkills(): DbSkill[] {
  if (!_skills) {
    const raw = loadJson<DbSkill[]>("skills.json");
    const ptNames = loadTranslation("skill-names-pt.json");
    _skills = raw.map((s) => ({
      ...s,
      namePt: ptNames[String(s.id)] || s.description,
    }));
  }
  return _skills;
}

export function getAegisToId(): Record<string, number> {
  if (!_aegisToId) _aegisToId = loadJson<Record<string, number>>("aegis-to-id.json");
  return _aegisToId;
}

// ─── Job name aliases ────────────────────────────────────────────────
// Maps our class jobNames → Divine Pride DB job names (combined names + PT-BR group names)
const JOB_ALIASES: Record<string, string[]> = {
  // Combined jobs
  Bard:       ["BardDancer", "Bardos e evoluções"],
  Dancer:     ["BardDancer", "Odaliscas e evoluções"],
  Minstrel:   ["BardDancer", "Bardos e evoluções"],
  Wanderer:   ["BardDancer", "Odaliscas e evoluções"],
  // PT-BR group names — base classes
  Swordman:   ["Espadachins e evoluções"],
  Mage:       ["Magos e evoluções"],
  Archer:     ["Arqueiros e evoluções"],
  Acolyte:    ["Espiritualistas e evoluções"],
  Merchant:   ["Mercadores e evoluções"],
  Thief:      ["Gatunos e evoluções"],
  Novice:     ["Noviços e evoluções"],
  SuperNovice:["Superaprendizes e evoluções", "Noviços e evoluções"],
  // PT-BR group names — 2nd class
  Knight:     ["Cavaleiros Rúnicos e evoluções", "Espadachins e evoluções"],
  Crusader:   ["Guardiões Reais e evoluções", "Espadachins e evoluções"],
  Wizard:     ["Arcanos e evoluções", "Magos e evoluções"],
  Sage:       ["Feiticeiros e evoluções", "Magos e evoluções"],
  Hunter:     ["Sentinelas e evoluções", "Arqueiros e evoluções"],
  Priest:     ["Arcebispo e evoluções", "Espiritualistas e evoluções"],
  Monk:       ["Shura e evoluções", "Espiritualistas e evoluções"],
  Blacksmith: ["Mecânicos e evoluções", "Mercadores e evoluções"],
  Alchemist:  ["Bioquímicos e evoluções", "Mercadores e evoluções"],
  Assassin:   ["Sicários e evoluções", "Gatunos e evoluções"],
  Rogue:      ["Renegados e evoluções", "Gatunos e evoluções"],
  // PT-BR group names — 3rd class
  Rune_Knight:   ["Cavaleiros Rúnicos e evoluções"],
  Royal_Guard:   ["Guardiões Reais e evoluções"],
  Warlock:       ["Arcanos e evoluções"],
  Sorcerer:      ["Feiticeiros e evoluções"],
  Ranger:        ["Sentinelas e evoluções"],
  Arch_Bishop:   ["Arcebispo e evoluções"],
  Sura:          ["Shura e evoluções"],
  Mechanic:      ["Mecânicos e evoluções"],
  Genetic:       ["Bioquímicos e evoluções"],
  Guillotine_Cross: ["Sicários e evoluções"],
  Shadow_Chaser: ["Renegados e evoluções"],
  // Extended classes
  Gunslinger: ["Justiceiros e evoluções"],
  Rebellion:  ["Justiceiros e evoluções"],
  Ninja:      ["Ninjas e evoluções"],
  KagerouOboro: ["Ninjas e evoluções"],
  Kagerou:    ["KagerouOboro", "Ninjas e evoluções"],
  Oboro:      ["KagerouOboro", "Ninjas e evoluções"],
  Taekwon:    ["Mestres Taekwons e evoluções"],
  StarGladiator: ["Mestres Estelares e evoluções"],
  Star_Emperor:  ["Mestres Estelares e evoluções"],
  SoulLinker:    ["Ceifadores de Almas e evoluções"],
  Soul_Reaper:   ["Ceifadores de Almas e evoluções"],
  Summoner:      ["Invocadores e evoluções"],
  Spirit_Handler:["Invocadores e evoluções"],
};

// ─── Search functions ───────────────────────────────────────────────

export function searchItems(opts: {
  query?: string;
  type?: string;
  location?: string;
  job?: string;
  limit?: number;
  offset?: number;
}): { items: DbItem[]; total: number } {
  const { query, type, location, job, limit = 60, offset = 0 } = opts;
  let results = getItems();

  if (type) {
    if (type === "Consumable") {
      results = results.filter((i) => i.type === "Consumable" || i.type === "DelayConsume");
    } else {
      results = results.filter((i) => i.type === type);
    }
  }

  if (location) {
    const locs = location.split(",");
    // Filter by equip location and exclude cards/consumables (they share location field)
    const nonEquipTypes = new Set(["Card", "Consumable", "DelayConsume", "Delayconsume", "Usable", "Cash", "Healing", "Etc", "Ammo", "Petegg", "PetEgg", "Petarmor", "PetArmor", "Unknown"]);
    results = results.filter((i) =>
      !nonEquipTypes.has(i.type) && i.locations?.some((l: string) => locs.includes(l))
    );
  }

  if (job) {
    const jobNames = job.split(",");
    // Expand jobNames with known aliases from Divine Pride DB
    const expanded = new Set(jobNames);
    for (const jn of jobNames) {
      const aliases = JOB_ALIASES[jn];
      if (aliases) aliases.forEach((a) => expanded.add(a));
    }
    results = results.filter((i) =>
      !i.jobs || i.jobs.length === 0 || i.jobs.includes("All") || i.jobs.some((j: string) => expanded.has(j))
    );
  }

  if (query) {
    const q = normalizeText(query);
    results = results.filter(
      (i) =>
        normalizeText(i.namePt || "").includes(q) ||
        normalizeText(i.nameEn || "").includes(q) ||
        normalizeText(i.aegisName || "").includes(q) ||
        String(i.id) === query.trim()
    );
  }

  const total = results.length;
  return { items: results.slice(offset, offset + limit), total };
}

export function searchMonsters(opts: {
  query?: string;
  race?: string;
  element?: string;
  mvpOnly?: boolean;
  limit?: number;
  offset?: number;
}): { monsters: DbMonster[]; total: number } {
  const { query, race, element, mvpOnly, limit = 60, offset = 0 } = opts;
  let results = getMonsters();

  if (mvpOnly) results = results.filter((m) => m.isMvp);
  if (race) results = results.filter((m) => m.race === race);
  if (element) results = results.filter((m) => m.element === element);

  if (query) {
    const q = normalizeText(query);
    results = results.filter(
      (m) =>
        normalizeText(m.namePt).includes(q) ||
        normalizeText(m.name).includes(q) ||
        normalizeText(m.aegisName).includes(q) ||
        String(m.id) === query.trim()
    );
  }

  const total = results.length;
  return { monsters: results.slice(offset, offset + limit), total };
}

export function searchSkills(opts: {
  query?: string;
  type?: string;
  limit?: number;
  offset?: number;
}): { skills: DbSkill[]; total: number } {
  const { query, type, limit = 60, offset = 0 } = opts;
  let results = getSkills();

  if (type) results = results.filter((s) => s.type === type);

  if (query) {
    const q = normalizeText(query);
    results = results.filter(
      (s) =>
        normalizeText(s.namePt).includes(q) ||
        normalizeText(s.description).includes(q) ||
        normalizeText(s.aegisName).includes(q) ||
        String(s.id) === query.trim()
    );
  }

  const total = results.length;
  return { skills: results.slice(offset, offset + limit), total };
}

export function getItemById(id: number): DbItem | undefined {
  return getItems().find((i) => i.id === id);
}

export function getMonsterById(id: number): DbMonster | undefined {
  return getMonsters().find((m) => m.id === id);
}

export function resolveDropsToItems(
  drops: Array<{ aegisName: string; rate: number; stealProtected?: boolean }>
): Array<{ item: DbItem | null; aegisName: string; rate: number; stealProtected: boolean }> {
  const aegisMap = getAegisToId();
  const items = getItems();

  return drops.map((d) => {
    const itemId = aegisMap[d.aegisName];
    const item = itemId ? items.find((i) => i.id === itemId) ?? null : null;
    return {
      item,
      aegisName: d.aegisName,
      rate: d.rate,
      stealProtected: d.stealProtected || false,
    };
  });
}

// Find which monsters drop a specific item
export function findMonstersDropping(itemId: number): Array<{ monster: DbMonster; rate: number }> {
  const aegisMap = getAegisToId();
  const item = getItemById(itemId);
  if (!item) return [];

  // Find aegis name for this item
  const aegisName = item.aegisName;
  if (!aegisName) return [];

  const results: Array<{ monster: DbMonster; rate: number }> = [];
  for (const mob of getMonsters()) {
    for (const drop of mob.drops) {
      if (drop.aegisName === aegisName) {
        results.push({ monster: mob, rate: drop.rate });
      }
    }
  }
  return results.sort((a, b) => b.rate - a.rate);
}
