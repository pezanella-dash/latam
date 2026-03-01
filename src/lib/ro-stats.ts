// ─── Ragnarok Online Stat Calculation Engine ─────────────────────────

export interface BaseStats {
  str: number;
  agi: number;
  vit: number;
  int: number;
  dex: number;
  luk: number;
}

export interface EquipBonus {
  str?: number;
  agi?: number;
  vit?: number;
  int?: number;
  dex?: number;
  luk?: number;
  atk?: number;
  matk?: number;
  def?: number;
  mdef?: number;
  hit?: number;
  flee?: number;
  crit?: number;
  aspd?: number;
  maxHp?: number;
  maxSp?: number;
  maxHpRate?: number;
  maxSpRate?: number;
  atkRate?: number;
  matkRate?: number;
  longAtkRate?: number;
  shortAtkRate?: number;
  critAtkRate?: number;
  aspdRate?: number;
  variableCastrate?: number;
  fixedCastrate?: number;
  fixedCast?: number;          // flat fixed cast reduction (ms) — bFixedCast
  delayrate?: number;
  perfectDodge?: number;
  // patk/smatk for 4th jobs
  patk?: number;
  smatk?: number;
  // 4th job trait stats
  pow?: number;
  sta?: number;
  wis?: number;
  spl?: number;
  con?: number;
  crt?: number;
  hplus?: number;
  res?: number;
  mres?: number;
  crate?: number;
  // Healing
  healPower?: number;
  // Weapon element override
  atkEle?: string;             // bAtkEle — changes weapon element (e.g., "Ele_Fire")
  // Size penalty bypass
  noSizeFix?: boolean;         // bNoSizeFix — ignore size penalty on weapon
  // Physical modifiers (bonus2)
  subRace?: Record<string, number>;     // damage reduction from race
  subEle?: Record<string, number>;      // damage reduction from element
  subSize?: Record<string, number>;     // damage reduction from size
  addRace?: Record<string, number>;     // extra physical damage to race
  addEle?: Record<string, number>;      // extra physical damage to element
  addSize?: Record<string, number>;     // extra physical damage to size
  addClass?: Record<string, number>;    // extra physical damage to class (boss/normal)
  subClass?: Record<string, number>;    // damage reduction from class
  // Magical modifiers (bonus2) — separate from physical!
  magicAddRace?: Record<string, number>;   // bonus2 bMagicAddRace — magic damage vs race
  magicAddEle?: Record<string, number>;    // bonus2 bMagicAddEle — magic damage vs element
  magicAddSize?: Record<string, number>;   // bonus2 bMagicAddSize — magic damage vs size
  magicAddClass?: Record<string, number>;  // bonus2 bMagicAddClass — magic damage vs class
  magicAtkEle?: Record<string, number>;    // bonus2 bMagicAtkEle — magic damage OF element type %
  // Skill-specific modifiers (bonus2 with quoted skill name)
  skillAtk?: Record<string, number>;    // bonus2 bSkillAtk,"SKILL",N
  skillCooldown?: Record<string, number>; // bonus2 bSkillCooldown,"SKILL",N
  skillUseSP?: Record<string, number>;  // bonus2 bSkillUseSP,"SKILL",N
  // DEF/MDEF ignore by race/class
  ignoreDefRaceRate?: Record<string, number>;
  ignoreMdefRaceRate?: Record<string, number>;
  ignoreDefClassRate?: Record<string, number>;
  ignoreMdefClassRate?: Record<string, number>;
  // Misc damage modifiers
  nonCritAtkRate?: number;     // bNonCritAtkRate — physical damage modifier (non-crit)
  weaponAtkRate?: number;      // bWeaponAtkRate — weapon ATK modifier %
  perfectHitRate?: number;     // bPerfectHitAddRate — perfect hit rate
  criticalAddRace?: Record<string, number>; // bonus2 bCriticalAddRace
}

// ─── Race / Element / Size labels ────────────────────────────────────

const RACE_LABELS: Record<string, string> = {
  RC_Formless: "Amorfo", RC_Undead: "Morto-Vivo", RC_Brute: "Bruto",
  RC_Plant: "Planta", RC_Insect: "Inseto", RC_Fish: "Peixe",
  RC_Demon: "Demônio", RC_DemiHuman: "Humanoide", RC_Angel: "Anjo",
  RC_Dragon: "Dragão", RC_Player_Human: "Jogador Humano",
  RC_Player_Doram: "Jogador Doram", RC_All: "Todas",
};

const ELEMENT_LABELS: Record<string, string> = {
  Ele_Neutral: "Neutro", Ele_Water: "Água", Ele_Earth: "Terra",
  Ele_Fire: "Fogo", Ele_Wind: "Vento", Ele_Poison: "Veneno",
  Ele_Holy: "Sagrado", Ele_Dark: "Sombrio", Ele_Ghost: "Fantasma",
  Ele_Undead: "Morto-Vivo", Ele_All: "Todos",
};

const SIZE_LABELS: Record<string, string> = {
  Size_Small: "Pequeno", Size_Medium: "Médio", Size_Large: "Grande", Size_All: "Todos",
};

const CLASS_LABELS: Record<string, string> = {
  Class_Normal: "Normal", Class_Boss: "Chefe", Class_All: "Todos",
};

// Common skill name translations (aegis → PT display name)
const SKILL_LABELS: Record<string, string> = {
  RK_IGNITIONBREAK: "Ignition Break", RK_DRAGONBREATH: "Dragon Breath", RK_DRAGONBREATH_WATER: "Dragon Breath (Água)",
  RK_SONICWAVE: "Sonic Wave", RK_HUNDREDSPEAR: "Hundred Spear", RK_WINDCUTTER: "Wind Cutter",
  LK_SPIRALPIERCE: "Spiral Pierce", LK_BERSERK: "Frenesi",
  GC_CROSSIMPACT: "Cross Impact", GC_ROLLINGCUTTER: "Rolling Cutter", GC_CROSSRIPPERSLASHER: "Cross Ripper Slasher",
  GC_DARKILLUSION: "Dark Illusion", GC_PHANTOMMENACE: "Phantom Menace",
  RA_ARROWSTORM: "Arrow Storm", RA_AIMEDBOLT: "Aimed Bolt", RA_WUGSTRIKE: "Wug Strike",
  WL_SOULEXPANSION: "Soul Expansion", WL_JACKFROST: "Jack Frost", WL_CRIMSONROCK: "Crimson Rock",
  WL_CHAINLIGHTNING: "Chain Lightning", WL_EARTHSTRAIN: "Earth Strain", WL_COMET: "Comet",
  AB_JUDEX: "Judex", AB_ADORAMUS: "Adoramus", AB_DUPLELIGHT: "Duple Light",
  SR_FALLENEMPIRE: "Fallen Empire", SR_TIGERCANNON: "Tiger Cannon", SR_RAMPAGEBLASTER: "Rampage Blaster",
  SR_KNUCKLEARROW: "Knuckle Arrow", SR_SKYNETBLOW: "Sky Net Blow",
  SC_TRIANGLESHOT: "Triangle Shot", SC_FATALMENACE: "Fatal Menace",
  NC_AXEBOOMERANG: "Axe Boomerang", NC_ARMSCANNON: "Arm Cannon", NC_AXETORNADO: "Axe Tornado",
  GN_CARTCANNON: "Cart Cannon", GN_SPORE_EXPLOSION: "Spore Explosion",
  LG_CANNONSPEAR: "Cannon Spear", LG_BANISHINGPOINT: "Banishing Point", LG_OVERBRAND: "Overbrand",
  SO_PSYCHIC_WAVE: "Psychic Wave", SO_VARETYR_SPEAR: "Varetyr Spear", SO_DIAMONDDUST: "Diamond Dust",
  WM_METALICSOUND: "Metallic Sound", WA_SWING_DANCE: "Swing Dance",
  MH_SONIC_CRAW: "Sonic Claw", MH_TINDER_BREAKER: "Tinder Breaker",
  AC_DOUBLE: "Flecha Dupla", AC_SHOWER: "Chuva de Flechas",
  MG_FROSTDIVER: "Frost Diver", MG_FIREBOLT: "Fire Bolt", MG_COLDBOLT: "Cold Bolt", MG_LIGHTNINGBOLT: "Lightning Bolt",
  AL_HOLYLIGHT: "Holy Light", AL_HEAL: "Curar",
  CR_SHIELDCHARGE: "Shield Charge", CR_SHIELDBOOMERANG: "Shield Boomerang",
  BA_MUSICALSTRIKE: "Musical Strike", DC_THROWARROW: "Throw Arrow",
  AS_SONICBLOW: "Sonic Blow", AS_GRIMTOOTH: "Grimtooth",
  BS_HAMMERFALL: "Hammer Fall", BS_ADRENALINE: "Adrenalina",
  KN_BOWLINGBASH: "Bowling Bash", KN_BRANDISHSPEAR: "Brandish Spear",
  SM_BASH: "Bash", SM_MAGNUM: "Magnum Break",
  SN_SHARPSHOOTING: "Sharp Shooting",
};

export function formatSpecialBonus(
  type: "race" | "element" | "size" | "class",
  key: string,
  _value: number,
  prefix: string,
): string {
  const labels = type === "race" ? RACE_LABELS
    : type === "element" ? ELEMENT_LABELS
      : type === "size" ? SIZE_LABELS
        : CLASS_LABELS;
  const label = labels[key] || key;
  return `${prefix} ${label}`;
}

export interface DerivedStats {
  atk: string;       // "base + equip"
  matk: string;
  def: string;
  mdef: string;
  hit: number;
  flee: number;
  crit: number;
  aspd: number;
  maxHp: number;
  maxSp: number;
  // Per-stat equipment bonuses
  statBonuses: BaseStats;
  // Bonus rates
  atkRate: number;
  matkRate: number;
  longAtkRate: number;
  shortAtkRate: number;
  critAtkRate: number;
  aspdRate: number;
  variableCastrate: number;
  fixedCastrate: number;
  delayrate: number;
  perfectDodge: number;
  // Special bonuses (race/element/size)
  specialBonuses: { label: string; value: number; invertColor?: boolean }[];
  // For damage calculator
  totalBonus: EquipBonus;
  weaponAtk: number;
  weaponMatk: number;
  weaponLevel: number;
  weaponRefine: number;
  weaponSubType?: string;
  weaponWeight: number;     // weapon weight (for Spiral Pierce formula)
  // Active item combos/sets
  activeCombos: string[];
  // Active buff IDs (for special damage formulas like EDP, Dark Claw)
  activeBuffs: string[];
}

// ─── Equipment slots ─────────────────────────────────────────────────

import { applyActiveBuffs } from "./ro-buffs";

export type EquipSlot =
  | "head_top"
  | "head_mid"
  | "head_low"
  | "armor"
  | "right_hand"
  | "left_hand"
  | "garment"
  | "shoes"
  | "accessory1"
  | "accessory2"
  | "shadow_weapon"
  | "shadow_shield"
  | "shadow_armor"
  | "shadow_shoes"
  | "shadow_earring"
  | "shadow_pendant"
  | "visual_top"
  | "visual_mid"
  | "visual_low"
  | "visual_garment";

export interface CardItem {
  id: number;
  nameEn: string;
  namePt?: string;
  script?: string;
  locations?: string[];  // card placement restrictions (matches equipment locations)
  description?: string[];  // colored description lines (^RRGGBB format)
  affix?: { text: string; type: "prefix" | "suffix" };
}

/**
 * Check if a card can be placed in a given equipment slot.
 * A card is compatible if any of its locations maps to the equipment's slot.
 * Cards with empty locations (enchantments) are NOT placeable via card system.
 */
export function isCardCompatibleWithSlot(cardLocations: string[] | undefined, equipSlot: EquipSlot): boolean {
  if (!cardLocations || cardLocations.length === 0) return false;
  for (const loc of cardLocations) {
    const slots = LOCATION_TO_SLOT[loc];
    if (slots && slots.includes(equipSlot)) return true;
  }
  return false;
}

export interface EquippedItem {
  id: number;
  nameEn: string;
  namePt?: string;
  type: string;
  subType?: string;
  attack?: number;
  magicAttack?: number;
  defense?: number;
  mdef?: number;
  script?: string;
  refineable?: boolean;
  refine: number;         // user-chosen refine level 0-20
  slots: number;
  cards: (CardItem | null)[];  // cards in slots (null = empty slot)
  enchants: (CardItem | null)[];  // enchantments (items with empty locations)
  weaponLevel?: number;
  armorLevel?: number;
  weight?: number;          // item weight (for Spiral Pierce formula)
  locations: string[];
  jobs: string[];
  classNum: number;         // sprite view ID for zrenderer (headgear/garment)
  description?: string[];   // colored description lines (^RRGGBB format)
  _blockedBy?: EquipSlot;   // set on secondary slots of multi-slot items (e.g. left_hand for Both_Hand weapons)
}

// Map DB location names to our slot types
const LOCATION_TO_SLOT: Record<string, EquipSlot[]> = {
  Head_Top: ["head_top"],
  Head_Mid: ["head_mid"],
  Head_Low: ["head_low"],
  Armor: ["armor"],
  Right_Hand: ["right_hand"],
  Left_Hand: ["left_hand"],
  Both_Hand: ["right_hand", "left_hand"],
  Garment: ["garment"],
  Shoes: ["shoes"],
  Right_Accessory: ["accessory1"],
  Left_Accessory: ["accessory2"],
  Both_Accessory: ["accessory1", "accessory2"],
  Shadow_Weapon: ["shadow_weapon"],
  Shadow_Shield: ["shadow_shield"],
  Shadow_Armor: ["shadow_armor"],
  Shadow_Shoes: ["shadow_shoes"],
  Shadow_Right_Accessory: ["shadow_earring"],
  Shadow_Left_Accessory: ["shadow_pendant"],
  // Costume/visual locations → visual equip slots
  Costume_Head_Top: ["visual_top"],
  Costume_Head_Mid: ["visual_mid"],
  Costume_Head_Low: ["visual_low"],
  Costume_Garment: ["visual_garment"],
};

export function getCompatibleSlots(locations: string[]): EquipSlot[] {
  const slots = new Set<EquipSlot>();
  for (const loc of locations) {
    const mapped = LOCATION_TO_SLOT[loc];
    if (mapped) mapped.forEach((s) => slots.add(s));
  }
  return Array.from(slots);
}

// Primary slot mapping for search: multi-slot locations only show in their primary slot
// (e.g. Both_Hand shows when searching right_hand, not shield)
const LOCATION_SEARCH_SLOT: Record<string, EquipSlot[]> = {
  ...LOCATION_TO_SLOT,
  Both_Hand: ["right_hand"],      // 2h weapons only in weapon search, not shield
  Both_Accessory: ["accessory1", "accessory2"], // both-acc shows in both accessory slots
};

// Visual slots map to costume DB locations
const VISUAL_LOCATION_FILTERS: Partial<Record<EquipSlot, string[]>> = {
  visual_top: ["Costume_Head_Top"],
  visual_mid: ["Costume_Head_Mid"],
  visual_low: ["Costume_Head_Low"],
  visual_garment: ["Costume_Garment"],
};

// Visual slots → main ALT+Q counterpart (for sprite override logic)
export const VISUAL_TO_MAIN: Partial<Record<EquipSlot, EquipSlot>> = {
  visual_top: "head_top",
  visual_mid: "head_mid",
  visual_low: "head_low",
  visual_garment: "garment",
};

// Reverse: which DB locations match a given slot (for search filtering)
export function getLocationFilters(slot: EquipSlot): string[] {
  // Visual slots use Costume_* locations
  const visualLocs = VISUAL_LOCATION_FILTERS[slot];
  if (visualLocs) return visualLocs;

  const result: string[] = [];
  for (const [loc, slots] of Object.entries(LOCATION_SEARCH_SLOT)) {
    if (slots.includes(slot)) result.push(loc);
  }
  return result;
}

/**
 * Get all EquipSlot positions an item occupies based on its DB locations.
 * For multi-slot items (Both_Hand, Head_Low+Head_Mid masks, etc.) returns all slots.
 * For search purposes use getCompatibleSlots() instead — this is for equip/unequip logic.
 */
export function getAllOccupiedSlots(locations: string[], currentSlot?: EquipSlot): EquipSlot[] {
  const slots = new Set<EquipSlot>();

  // Special case: Accessories that specify both Right and Left can be equipped in EITHER slot,
  // they do not occupy BOTH slots simultaneously.
  const isGenericAccessory = (locations.includes("Right_Accessory") && locations.includes("Left_Accessory")) || locations.includes("Both_Accessory") || locations.includes("Accessory");
  const isGenericShadowAccessory = locations.includes("Shadow_Right_Accessory") && locations.includes("Shadow_Left_Accessory");

  for (const loc of locations) {
    if ((isGenericAccessory || loc === "Both_Accessory" || loc === "Accessory") && (loc === "Right_Accessory" || loc === "Left_Accessory" || loc === "Both_Accessory" || loc === "Accessory")) {
      // If we know the slot it's being equipped to, only occupy that slot
      if (currentSlot === "accessory1" || currentSlot === "accessory2") {
        slots.add(currentSlot);
      }
      continue;
    }

    if (isGenericShadowAccessory && (loc === "Shadow_Right_Accessory" || loc === "Shadow_Left_Accessory")) {
      if (currentSlot === "shadow_earring" || currentSlot === "shadow_pendant") {
        slots.add(currentSlot);
      }
      continue;
    }

    const mapped = LOCATION_TO_SLOT[loc];
    if (mapped) mapped.forEach((s) => slots.add(s));
  }

  // Safety fallback: if an item has unrecognized locations but was explicitly placed in a slot,
  // ensure it at least occupies that slot so it can be unequipped later.
  if (slots.size === 0 && currentSlot) {
    slots.add(currentSlot);
  }

  return Array.from(slots);
}

// ─── Safe arithmetic expression evaluator ───────────────────────────

/**
 * Evaluate a simple arithmetic expression containing +, -, *, / and parentheses.
 * Uses integer division (floor) like RO scripts. Returns 0 on invalid input.
 */
function safeEvalExpr(expr: string | undefined): number {
  if (!expr) return 0;
  const cleaned = expr.replace(/\s+/g, "").trim();
  if (!cleaned) return 0;

  // Fast path: simple integer
  const simple = parseInt(cleaned);
  if (String(simple) === cleaned) return simple;

  // Tokenize: numbers, operators (+, -, *, /), parentheses
  const tokens: (number | string)[] = [];
  let i = 0;
  while (i < cleaned.length) {
    const ch = cleaned[i];
    if (ch === "(" || ch === ")" || ch === "*" || ch === "/" || ch === "+") {
      tokens.push(ch);
      i++;
    } else if (ch === "-") {
      // Unary minus if at start, after operator, or after open paren
      if (i === 0 || "(*/-+".includes(cleaned[i - 1])) {
        let numStr = "-";
        i++;
        while (i < cleaned.length && /\d/.test(cleaned[i])) { numStr += cleaned[i]; i++; }
        tokens.push(parseInt(numStr));
      } else {
        tokens.push("-");
        i++;
      }
    } else if (/\d/.test(ch)) {
      let numStr = "";
      while (i < cleaned.length && /\d/.test(cleaned[i])) { numStr += cleaned[i]; i++; }
      tokens.push(parseInt(numStr));
    } else {
      i++; // skip unknown characters
    }
  }

  // Recursive descent parser
  let pos = 0;
  function parseExpression(): number {
    let left = parseTerm();
    while (pos < tokens.length && (tokens[pos] === "+" || tokens[pos] === "-")) {
      const op = tokens[pos++];
      const right = parseTerm();
      left = op === "+" ? left + right : left - right;
    }
    return left;
  }
  function parseTerm(): number {
    let left = parseFactor();
    while (pos < tokens.length && (tokens[pos] === "*" || tokens[pos] === "/")) {
      const op = tokens[pos++];
      const right = parseFactor();
      left = op === "*" ? left * right : (right !== 0 ? Math.floor(left / right) : 0);
    }
    return left;
  }
  function parseFactor(): number {
    if (tokens[pos] === "(") {
      pos++; // skip (
      const val = parseExpression();
      pos++; // skip )
      return val;
    }
    return (tokens[pos++] as number) || 0;
  }

  try {
    return Math.floor(parseExpression());
  } catch {
    return 0;
  }
}

/**
 * Evaluate a simple comparison: "10 >= 6", "200 > 170", etc.
 */
function safeEvalCondition(condition: string): boolean {
  const m = condition.match(/^\s*([^><=!]+)\s*(>=|<=|>|<|==|!=)\s*([^><=!]+)\s*$/);
  if (!m) return false;
  const left = safeEvalExpr(m[1]);
  const op = m[2];
  const right = safeEvalExpr(m[3]);
  switch (op) {
    case ">=": return left >= right;
    case "<=": return left <= right;
    case ">": return left > right;
    case "<": return left < right;
    case "==": return left === right;
    case "!=": return left !== right;
    default: return false;
  }
}

// evaluateIfBlocks is no longer needed — replaced by single-pass interpreter in parseScriptBonuses

// ─── Script bonus parser ─────────────────────────────────────────────

// Keys here MUST only refer to number fields of EquipBonus
type NumericBonusKey = Exclude<keyof EquipBonus, "subRace" | "subEle" | "subSize" | "addRace" | "addEle" | "addSize" | "addClass" | "subClass" | "magicAddRace" | "magicAddEle" | "magicAddSize" | "magicAddClass" | "magicAtkEle" | "skillAtk" | "skillCooldown" | "skillUseSP" | "ignoreDefRaceRate" | "ignoreMdefRaceRate" | "ignoreDefClassRate" | "ignoreMdefClassRate" | "criticalAddRace" | "atkEle" | "noSizeFix">;
const BONUS_MAP: Record<string, NumericBonusKey> = {
  bStr: "str",
  bAgi: "agi",
  bVit: "vit",
  bInt: "int",
  bDex: "dex",
  bLuk: "luk",
  bBaseAtk: "atk",
  bAtk: "atk",
  bAtk2: "atk",
  bMatk: "matk",
  bDef: "def",
  bMdef: "mdef",
  bDef2: "def",
  bMdef2: "mdef",
  bHit: "hit",
  bFlee: "flee",
  bFlee2: "perfectDodge",
  bCritical: "crit",
  bAspd: "aspd",
  bMaxHP: "maxHp",
  bMaxSP: "maxSp",
  bMaxHPrate: "maxHpRate",
  bMaxSPrate: "maxSpRate",
  bAtkRate: "atkRate",
  bMatkRate: "matkRate",
  bLongAtkRate: "longAtkRate",
  bShortAtkRate: "shortAtkRate",
  bCritAtkRate: "critAtkRate",
  bAspdRate: "aspdRate",
  bVariableCastrate: "variableCastrate",
  bFixedCastrate: "fixedCastrate",
  bFixedCast: "fixedCast",
  bVariableCast: "variableCastrate",
  bDelayrate: "delayrate",
  bPAtk: "patk",
  bSMatk: "smatk",
  bHealPower: "healPower",
  bHealPower2: "healPower",
  bHealpower2: "healPower",
  // 4th job traits
  bPow: "pow",
  bSta: "sta",
  bWis: "wis",
  bSpl: "spl",
  bCon: "con",
  bCrt: "crt",
  bHPlus: "hplus",
  bRes: "res",
  bMRes: "mres",
  bCRate: "crate",
  // Misc
  bNonCritAtkRate: "nonCritAtkRate",
  bWeaponAtkRate: "weaponAtkRate",
  bPerfectHitAddRate: "perfectHitRate",
  bPerfectHitRate: "perfectHitRate",
  bCriticalLong: "crit",
};

/**
 * Parse bonus statements from RO item script.
 * Handles: arithmetic expressions, if/else conditionals, bAllStats, nested ifs,
 * multi-var dependencies, bonus2/bonus3 with all known types.
 *
 * CRITICAL: Variables are resolved LINE-BY-LINE in order, because later vars
 * can depend on earlier vars (e.g., .@bonus = 3*(.@str/10)).
 */
export function parseScriptBonuses(
  script: string | undefined,
  refineLevel: number = 0,
  baseLevel: number = 200,
  baseStats?: BaseStats,
  weaponLevel: number = 1,
): EquipBonus {
  if (!script) return {};
  const bonus: EquipBonus = {};

  const pStr = String(baseStats?.str ?? 130);
  const pAgi = String(baseStats?.agi ?? 130);
  const pVit = String(baseStats?.vit ?? 130);
  const pInt = String(baseStats?.int ?? 130);
  const pDex = String(baseStats?.dex ?? 130);
  const pLuk = String(baseStats?.luk ?? 130);

  // Step 1: Replace global constants and function calls
  let processed = script
    .replace(/BaseLevel/g, String(baseLevel))
    .replace(/JobLevel/g, "70")
    .replace(/getrefine\(\)/g, String(refineLevel))
    .replace(/getenchantgrade\(\)/g, "0")
    .replace(/readparam\(bStr\)/g, pStr)
    .replace(/readparam\(bAgi\)/g, pAgi)
    .replace(/readparam\(bVit\)/g, pVit)
    .replace(/readparam\(bInt\)/g, pInt)
    .replace(/readparam\(bDex\)/g, pDex)
    .replace(/readparam\(bLuk\)/g, pLuk)
    .replace(/readparam\(bPow\)/g, "1")
    .replace(/readparam\(bSta\)/g, "1")
    .replace(/readparam\(bWis\)/g, "1")
    .replace(/readparam\(bSpl\)/g, "1")
    .replace(/readparam\(bCon\)/g, "1")
    .replace(/readparam\(bCrt\)/g, "1")
    .replace(/getskilllv\([^)]*\)/g, "10")
    .replace(/getequipweaponlv\([^)]*\)/g, String(weaponLevel));
  // min/max are handled inside the interpreter's subVars after variable substitution

  // Step 1.5: Strip `autobonus` blocks so we don't grant temporary autocast effects as permanent static stats
  processed = processed.replace(/autobonus[23]?\s*(?:"|')\{[\s\S]*?\}(?:"|').*?;/g, "");

  // Step 2: Single-pass interpreter with if-stack
  // This correctly handles variable assignments inside if blocks (the old 3-pass
  // approach broke because it substituted variable names with values BEFORE evaluating
  // ifs, turning ".@bonus = 3*(.@str/10)" into "39 = 40" which was meaningless).

  // 2a: Tokenize into statements, splitting on newlines, semicolons, and braces
  const rawStmts: string[] = [];
  for (const rawLine of processed.split("\n")) {
    let rem = rawLine;
    while (rem.length > 0) {
      const idx = rem.search(/[{};]/);
      if (idx === -1) {
        const t = rem.trim();
        if (t) rawStmts.push(t);
        break;
      }
      const before = rem.substring(0, idx).trim();
      if (before) rawStmts.push(before);
      const ch = rem[idx];
      if (ch !== ";") rawStmts.push(ch); // push { or }, skip ;
      rem = rem.substring(idx + 1);
    }
  }

  // 2b: Merge "}" + "else" / "else if(...)" into single tokens for clean handling
  const tokens: string[] = [];
  for (let i = 0; i < rawStmts.length; i++) {
    if (rawStmts[i] === "}" && i + 1 < rawStmts.length) {
      const next = rawStmts[i + 1].trim();
      if (next === "else" || /^else\s+if\s*\(/.test(next)) {
        tokens.push("} " + next);
        i++; // skip merged token
        continue;
      }
    }
    tokens.push(rawStmts[i]);
  }

  // 2c: Interpreter state
  interface IfFrame {
    active: boolean;       // is this branch currently active?
    branchTaken: boolean;  // has ANY branch in this if/else chain been taken?
    parentActive: boolean; // was the scope above this if active?
    braceless: boolean;    // true if this if has no braces — only applies to the NEXT statement
  }
  const vars: Record<string, number> = {};
  const ifStack: IfFrame[] = [];
  const outputLines: string[] = [];

  function isActive(): boolean {
    return ifStack.length === 0 || ifStack[ifStack.length - 1].active;
  }

  // Pop all braceless if frames after a statement is processed
  function popBracelessFrames(): void {
    while (ifStack.length > 0 && ifStack[ifStack.length - 1].braceless) {
      ifStack.pop();
    }
  }

  function subVars(text: string): string {
    let result = text;
    for (const [name, val] of Object.entries(vars)) {
      const esc = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      result = result.replace(new RegExp(esc + "(?!\\w)", "g"), String(val));
    }
    // Evaluate min/max after variable substitution
    result = result.replace(/min\(([^,()]+),([^,()]+)\)/g, (_, a: string, b: string) =>
      String(Math.min(safeEvalExpr(a), safeEvalExpr(b))));
    result = result.replace(/max\(([^,()]+),([^,()]+)\)/g, (_, a: string, b: string) =>
      String(Math.max(safeEvalExpr(a), safeEvalExpr(b))));
    // Resolve inline ternary expressions: (COND)?TRUE:FALSE
    // Process innermost first (no nested parens in condition), repeat for nesting
    for (let ti = 0; ti < 20; ti++) {
      const tm = result.match(/\(([^()?]+)\)\s*\?\s*(-?\d+(?:\s*[+\-*/]\s*\d+)*)\s*:\s*(-?\d+(?:\s*[+\-*/]\s*\d+)*)/);
      if (!tm) break;
      const resolved = safeEvalCondition(tm[1]) ? tm[2].trim() : tm[3].trim();
      result = result.replace(tm[0], resolved);
      // Clean up parenthesized numbers left by nested ternary resolution: (-3) → -3
      result = result.replace(/\((-?\d+)\)/g, "$1");
    }
    return result;
  }

  // 2d: Process tokens
  for (let ti = 0; ti < tokens.length; ti++) {
    const token = tokens[ti];

    // Opening brace — mark the top if frame as NOT braceless (it has braces)
    if (token === "{") {
      if (ifStack.length > 0) ifStack[ifStack.length - 1].braceless = false;
      continue;
    }

    // Closing brace — pop if frame
    if (token === "}") {
      if (ifStack.length > 0) ifStack.pop();
      continue;
    }

    // "} else {" — transition to else branch
    if (token === "} else") {
      if (ifStack.length > 0) {
        const frame = ifStack[ifStack.length - 1];
        if (frame.branchTaken) {
          frame.active = false; // a branch was already taken
        } else {
          frame.active = frame.parentActive; // else is active if parent was active
          frame.branchTaken = true;
        }
      }
      continue;
    }

    // "} else if (cond)" — transition to else-if branch
    const elseIfMatch = token.match(/^\}\s*else\s+if\s*\((.+)\)$/);
    if (elseIfMatch) {
      if (ifStack.length > 0) {
        const frame = ifStack[ifStack.length - 1];
        if (frame.branchTaken || !frame.parentActive) {
          frame.active = false; // previous branch taken or parent inactive
        } else {
          const condStr = subVars(elseIfMatch[1]);
          const result = safeEvalCondition(condStr);
          frame.active = result;
          if (result) frame.branchTaken = true;
        }
      }
      continue;
    }

    // "if (cond)" — push new if frame (braceless by default; set to false if "{" follows)
    const ifMatch = token.match(/^if\s*\((.+)\)$/);
    if (ifMatch) {
      const parentActive = isActive();
      if (!parentActive) {
        ifStack.push({ active: false, branchTaken: false, parentActive: false, braceless: true });
      } else {
        const condStr = subVars(ifMatch[1]);
        const result = safeEvalCondition(condStr);
        ifStack.push({ active: result, branchTaken: result, parentActive: true, braceless: true });
      }
      continue;
    }

    // Skip everything in inactive blocks — but still pop braceless frames
    if (!isActive()) {
      // This is a statement inside an inactive block. If it's a braceless if, pop it.
      popBracelessFrames();
      continue;
    }

    // Variable assignment — match BEFORE full substitution to preserve var name on LHS
    const varOpMatch = token.match(/^(\.\@\w+)\s*(\+=|-=|=)\s*(.+)$/);
    if (varOpMatch) {
      const varName = varOpMatch[1];
      const op = varOpMatch[2];
      const rhs = subVars(varOpMatch[3]);
      const value = safeEvalExpr(rhs);
      if (op === "+=") vars[varName] = (vars[varName] || 0) + value;
      else if (op === "-=") vars[varName] = (vars[varName] || 0) - value;
      else vars[varName] = value;
      popBracelessFrames(); // braceless if: this was the single statement
      continue; // consume assignment, don't add to output
    }

    // Non-assignment statement — substitute vars and add to output for bonus parsing
    // Append semicolon since the tokenizer strips them
    outputLines.push(subVars(token) + ";");
    popBracelessFrames(); // braceless if: this was the single statement
  }

  // Rebuild processed from interpreter output
  processed = outputLines.join("\n");
  // Final pass for any remaining variable references
  for (const [name, val] of Object.entries(vars)) {
    const esc = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    processed = processed.replace(new RegExp(esc + "(?!\\w)", "g"), String(val));
  }

  // Step 5: Parse bAllStats (adds to all 6 base stats)
  const allStatsRegex = /bonus\s+bAllStats\s*,\s*([^;,]+)\s*;/g;
  let match;
  while ((match = allStatsRegex.exec(processed)) !== null) {
    const value = safeEvalExpr(match[1]);
    if (isNaN(value)) continue;
    for (const stat of ["str", "agi", "vit", "int", "dex", "luk"] as NumericBonusKey[]) {
      bonus[stat] = (bonus[stat] || 0) + value;
    }
  }

  // bAllTraitStats (adds to all 6 trait stats: pow, sta, wis, spl, con, crt)
  const allTraitRegex = /bonus\s+bAllTraitStats\s*,\s*([^;,]+)\s*;/g;
  while ((match = allTraitRegex.exec(processed)) !== null) {
    const value = safeEvalExpr(match[1]);
    if (isNaN(value)) continue;
    for (const stat of ["pow", "sta", "wis", "spl", "con", "crt"] as NumericBonusKey[]) {
      bonus[stat] = (bonus[stat] || 0) + value;
    }
  }

  // Step 6: Parse simple bonus bXXX, EXPR;
  const bonusRegex = /\bbonus\s+(b\w+)\s*(?:,\s*([^;,]+))?\s*;/g;
  while ((match = bonusRegex.exec(processed)) !== null) {
    const bonusName = match[1];
    if (bonusName === "bAllStats" || bonusName === "bAllTraitStats") continue;

    // Special: bNoSizeFix has no value — it's a flag
    if (bonusName === "bNoSizeFix") {
      bonus.noSizeFix = true;
      continue;
    }

    // Special: bAtkEle,Ele_X; — weapon element override
    if (bonusName === "bAtkEle") {
      if (match[2]) bonus.atkEle = match[2].trim();
      continue;
    }

    // Special: bDefEle — skip (armor element, not relevant for damage output)
    if (bonusName === "bDefEle") continue;

    const value = match[2] ? safeEvalExpr(match[2]) : 1;
    if (isNaN(value)) continue;
    const key = BONUS_MAP[bonusName];
    if (key) {
      bonus[key] = (bonus[key] || 0) + value;
    }
  }

  // Step 7: Parse bonus2 with identifier params: bonus2 bXXX, TYPE, EXPR;
  const bonus2Regex = /bonus2\s+(b\w+)\s*,\s*(\w+)\s*,\s*([^;]+)\s*;/g;
  while ((match = bonus2Regex.exec(processed)) !== null) {
    const bonusName = match[1];
    const param = match[2];
    const value = safeEvalExpr(match[3]);
    if (isNaN(value)) continue;

    switch (bonusName) {
      case "bSubRace":
      case "bSubRace2":
        bonus.subRace = bonus.subRace || {};
        bonus.subRace[param] = (bonus.subRace[param] || 0) + value;
        break;
      case "bSubEle":
        bonus.subEle = bonus.subEle || {};
        bonus.subEle[param] = (bonus.subEle[param] || 0) + value;
        break;
      case "bSubSize":
        bonus.subSize = bonus.subSize || {};
        bonus.subSize[param] = (bonus.subSize[param] || 0) + value;
        break;
      case "bAddRace":
      case "bAddRace2":
        bonus.addRace = bonus.addRace || {};
        bonus.addRace[param] = (bonus.addRace[param] || 0) + value;
        break;
      case "bAddEle":
        bonus.addEle = bonus.addEle || {};
        bonus.addEle[param] = (bonus.addEle[param] || 0) + value;
        break;
      case "bAddSize":
        bonus.addSize = bonus.addSize || {};
        bonus.addSize[param] = (bonus.addSize[param] || 0) + value;
        break;
      case "bAddClass":
        bonus.addClass = bonus.addClass || {};
        bonus.addClass[param] = (bonus.addClass[param] || 0) + value;
        break;
      case "bSubClass":
        bonus.subClass = bonus.subClass || {};
        bonus.subClass[param] = (bonus.subClass[param] || 0) + value;
        break;
      // Magical damage modifiers — SEPARATE from physical!
      case "bMagicAddRace":
      case "bMagicAddRace2":
        bonus.magicAddRace = bonus.magicAddRace || {};
        bonus.magicAddRace[param] = (bonus.magicAddRace[param] || 0) + value;
        break;
      case "bMagicAddEle":
        bonus.magicAddEle = bonus.magicAddEle || {};
        bonus.magicAddEle[param] = (bonus.magicAddEle[param] || 0) + value;
        break;
      case "bMagicAddSize":
        bonus.magicAddSize = bonus.magicAddSize || {};
        bonus.magicAddSize[param] = (bonus.magicAddSize[param] || 0) + value;
        break;
      case "bMagicAddClass":
        bonus.magicAddClass = bonus.magicAddClass || {};
        bonus.magicAddClass[param] = (bonus.magicAddClass[param] || 0) + value;
        break;
      case "bMagicAtkEle":
        bonus.magicAtkEle = bonus.magicAtkEle || {};
        bonus.magicAtkEle[param] = (bonus.magicAtkEle[param] || 0) + value;
        break;
      // DEF/MDEF ignore
      case "bIgnoreDefRaceRate":
        bonus.ignoreDefRaceRate = bonus.ignoreDefRaceRate || {};
        bonus.ignoreDefRaceRate[param] = (bonus.ignoreDefRaceRate[param] || 0) + value;
        break;
      case "bIgnoreMdefRaceRate":
        bonus.ignoreMdefRaceRate = bonus.ignoreMdefRaceRate || {};
        bonus.ignoreMdefRaceRate[param] = (bonus.ignoreMdefRaceRate[param] || 0) + value;
        break;
      case "bIgnoreDefClassRate":
      case "bIgnoreDefRace":  // legacy name
        bonus.ignoreDefClassRate = bonus.ignoreDefClassRate || {};
        bonus.ignoreDefClassRate[param] = (bonus.ignoreDefClassRate[param] || 0) + value;
        break;
      case "bIgnoreMdefClassRate":
      case "bIgnoreMDefClassRate":
        bonus.ignoreMdefClassRate = bonus.ignoreMdefClassRate || {};
        bonus.ignoreMdefClassRate[param] = (bonus.ignoreMdefClassRate[param] || 0) + value;
        break;
      // Critical add by race
      case "bCriticalAddRace":
        bonus.criticalAddRace = bonus.criticalAddRace || {};
        bonus.criticalAddRace[param] = (bonus.criticalAddRace[param] || 0) + value;
        break;
      // Per-skill cast rate (bonus2 bVariableCastrate, SKILL, N; — different from global bVariableCastrate!)
      // We ignore per-skill cast for now as it only affects specific skills
      case "bVariableCastrate":
      case "bFixedCastrate":
        // per-skill cast rate: bonus2 bVariableCastrate, SKILL_ID, N;
        // Skip: too complex to track per-skill. The global bVariableCastrate is handled in bonus1.
        break;
      default: {
        const key = BONUS_MAP[bonusName];
        if (key) {
          bonus[key] = (bonus[key] || 0) + value;
        }
      }
    }
  }

  // Step 8: Parse bonus2 with quoted params: bonus2 bSkillAtk,"SKILL",EXPR;
  const bonus2QuotedRegex = /bonus2\s+(b\w+)\s*,\s*"([^"]+)"\s*,\s*([^;]+)\s*;/g;
  while ((match = bonus2QuotedRegex.exec(processed)) !== null) {
    const bonusName = match[1];
    const param = match[2];
    const value = safeEvalExpr(match[3]);
    if (isNaN(value)) continue;

    switch (bonusName) {
      case "bSkillAtk":
        bonus.skillAtk = bonus.skillAtk || {};
        bonus.skillAtk[param] = (bonus.skillAtk[param] || 0) + value;

        // Latam DB Hotfix: True Eremes Guile buff targets GC_CROSSIMPACT but mathematically buffs GC_CROSSRIPPERSLASHER
        if (param === "GC_CROSSIMPACT") {
          bonus.skillAtk["GC_CROSSRIPPERSLASHER"] = (bonus.skillAtk["GC_CROSSRIPPERSLASHER"] || 0) + value;
        }
        break;
      case "bSkillCooldown":
        bonus.skillCooldown = bonus.skillCooldown || {};
        bonus.skillCooldown[param] = (bonus.skillCooldown[param] || 0) + value;
        break;
      case "bSkillUseSP":
      case "bSkillUseSPrate":
        bonus.skillUseSP = bonus.skillUseSP || {};
        bonus.skillUseSP[param] = (bonus.skillUseSP[param] || 0) + value;
        break;
      case "bSkillVariableCast":
      case "bSkillFixedCast":
        // Per-skill cast changes — skip for now
        break;
      default: {
        const key = BONUS_MAP[bonusName];
        if (key) bonus[key] = (bonus[key] || 0) + value;
      }
    }
  }

  return bonus;
}

// ─── Item Combo / Set Bonus System ──────────────────────────────────
// Loaded from data/database/combos.json (generated by scripts/extract-combos.ts)
// Combos are extracted from item descriptions in items.json.

interface ComboJsonEntry {
  sourceItemId: number;
  sourceItemName: string;
  requiredItemNames: string[];
  requiredItemIds: number[];
  allItemIds: number[];
  baseBonuses: Partial<EquipBonus>;
  refineBonuses: { condition: string; minCombinedRefine?: number; bonuses: Partial<EquipBonus> }[];
}

// Load combo data from JSON (generated by scripts/extract-combos.ts)
// Uses require() because the file is outside src/ directory
import combosData from "../../data/database/combos.json";

function getCombos(): ComboJsonEntry[] {
  return combosData as ComboJsonEntry[];
}

// Helper to merge EquipBonus into totalBonus
function mergeBonus(target: EquipBonus, source: Partial<EquipBonus>): void {
  for (const [k, v] of Object.entries(source)) {
    const key = k as keyof EquipBonus;
    if (typeof v === "object" && v !== null) {
      const existing = ((target[key] as Record<string, number>) || {});
      for (const [rk, rv] of Object.entries(v as Record<string, number>)) {
        existing[rk] = (existing[rk] || 0) + rv;
      }
      (target as Record<string, unknown>)[key] = existing;
    } else {
      (target as Record<string, unknown>)[key] = ((target[key] as number) || 0) + (v as number);
    }
  }
}

/**
 * Check equipped items for combo/set bonuses and apply them.
 * Uses combos.json data (1119 combo definitions from LATAM item descriptions).
 * Returns the list of active combo names for display.
 */
export function applyComboBonus(
  equipment: Partial<Record<EquipSlot, EquippedItem | null>>,
  totalBonus: EquipBonus,
): string[] {
  const equippedIds = new Set<number>();
  const itemRefines = new Map<number, number>();

  for (const [slotKey, item] of Object.entries(equipment)) {
    if (!item || item._blockedBy) continue;
    equippedIds.add(Number(item.id));
    itemRefines.set(Number(item.id), item.refine || 0);

    // Also consider cards and enchantments for combos!
    if (item.cards) {
      for (const card of item.cards) {
        if (card) equippedIds.add(Number(card.id));
      }
    }
    if (item.enchants) {
      for (const enchant of item.enchants) {
        if (enchant) equippedIds.add(Number(enchant.id));
      }
    }
  }

  const activeCombos: string[] = [];
  const combos = getCombos();

  for (const combo of combos) {
    // If the combo has unresolved item IDs (-1), it can never be fully equipped.
    // We must skip it, otherwise it might falsely trigger if only the source item is equipped.
    if (combo.requiredItemIds.some(id => id <= 0)) continue;

    // All items in the combo must be equipped
    const allPresent = combo.allItemIds.every(id => id > 0 && equippedIds.has(Number(id)));

    if (!allPresent) continue;

    // Determine the combined refine scale for dynamic bonuses
    const combinedRefine = combo.allItemIds.reduce((sum, id) => sum + (itemRefines.get(id) || 0), 0);

    // Build display name
    const comboName = `${combo.sourceItemName} + ${combo.requiredItemNames.join(" + ")}`;
    activeCombos.push(comboName);

    // Helper to evaluate dynamic bonuses
    const processDynamic = (bonuses: Partial<EquipBonus> & Record<string, any>) => {
      const b = { ...bonuses };
      if (b.critAtkRate_PerCombinedRefine) {
        b.critAtkRate = (b.critAtkRate || 0) + (b.critAtkRate_PerCombinedRefine * combinedRefine);
        delete b.critAtkRate_PerCombinedRefine;
      }
      if (b.matkRate_PerCombinedRefine) {
        b.matkRate = (b.matkRate || 0) + (b.matkRate_PerCombinedRefine * combinedRefine);
        delete b.matkRate_PerCombinedRefine;
      }
      if (b.atkRate_PerCombinedRefine) {
        b.atkRate = (b.atkRate || 0) + (b.atkRate_PerCombinedRefine * combinedRefine);
        delete b.atkRate_PerCombinedRefine;
      }
      return b;
    };

    // Apply base combo bonuses
    if (Object.keys(combo.baseBonuses).length > 0) {
      mergeBonus(totalBonus, processDynamic(combo.baseBonuses));
    }

    // Apply refine-gated bonuses
    for (const rb of combo.refineBonuses) {
      if (rb.minCombinedRefine && Object.keys(rb.bonuses).length > 0) {
        if (combinedRefine >= rb.minCombinedRefine) {
          mergeBonus(totalBonus, processDynamic(rb.bonuses));
        }
      }
    }
  }

  return activeCombos;
}

// ─── Refine ATK/DEF bonus ────────────────────────────────────────────

const WEAPON_REFINE_ATK: Record<number, number> = {
  1: 2,  // +2 ATK per refine for level 1 weapons
  2: 3,
  3: 5,
  4: 7,
  5: 8,  // 4th job weapons
};

export function getRefineBonus(
  item: EquippedItem
): { atk: number; matk: number; def: number } {
  const r = item.refine;
  if (r <= 0) return { atk: 0, matk: 0, def: 0 };

  if (item.type === "Weapon") {
    const wl = item.weaponLevel || 1;
    const perRefine = WEAPON_REFINE_ATK[wl] || 2;
    // Over-refine bonus (+4 for lv1, +5 lv2, etc.)
    const safeLimit = wl <= 2 ? 7 : 6;
    let overRefine = 0;
    if (r > safeLimit) {
      overRefine = (r - safeLimit) * (perRefine + wl);
    }
    return {
      atk: r * perRefine + overRefine,
      matk: item.subType?.includes("Staff") ? r * perRefine : 0,
      def: 0,
    };
  }

  if (item.type === "Armor" || item.type === "ShadowGear") {
    return { atk: 0, matk: 0, def: r };
  }

  return { atk: 0, matk: 0, def: 0 };
}

// ─── Aggregate stats calculation ─────────────────────────────────────

export interface BuildConfig {
  baseLevel: number;
  jobLevel: number;
  baseStats: BaseStats;
  equipment: Partial<Record<EquipSlot, EquippedItem | null>>;
  hpFactor: number;   // class HP multiplier (from RoClass)
  spFactor: number;   // class SP multiplier (from RoClass)
  isTrans: boolean;   // transcendent/3rd class gets 1.25× HP/SP
  activeBuffs?: string[]; // Array of Buff IDs from ro-buffs
}

export function calculateDerivedStats(build: BuildConfig): DerivedStats {
  const { baseLevel, baseStats, equipment, hpFactor = 1, spFactor = 1, isTrans = true, activeBuffs = [] } = build;
  const s = baseStats;
  const transMod = isTrans ? 1.25 : 1.0;

  // Sum all equipment bonuses
  const totalBonus: EquipBonus = {};
  let weaponAtk = 0;
  let weaponMatk = 0;
  let equipDef = 0;
  let equipMdef = 0;
  // Track main weapon info for damage calculator
  let mainWeaponAtk = 0;
  let mainWeaponMatk = 0;
  let mainWeaponLevel = 0;
  let mainWeaponRefine = 0;
  let mainWeaponSubType: string | undefined;
  let mainWeaponWeight = 0;

  for (const [slotKey, item] of Object.entries(equipment)) {
    if (!item) continue;
    // Skip secondary slots of multi-slot items (bonuses already counted from primary slot)
    if (item._blockedBy) continue;

    const isVisual = slotKey.startsWith("visual_");

    // Visual/costume slots: no base stats or refine, but enchant scripts DO apply
    if (!isVisual) {
      // Base item stats
      if (item.attack) weaponAtk += item.attack;
      if (item.magicAttack) weaponMatk += item.magicAttack;
      if (item.defense) equipDef += item.defense;
      if (item.mdef) equipMdef += item.mdef;

      // Track main weapon (right_hand) for damage calculator
      if (slotKey === "right_hand" && item.type === "Weapon") {
        mainWeaponAtk = item.attack || 0;
        mainWeaponMatk = item.magicAttack || 0;
        mainWeaponLevel = item.weaponLevel || 1;
        mainWeaponRefine = item.refine || 0;
        mainWeaponSubType = item.subType;
        mainWeaponWeight = item.weight || 0;
      }

      // Refine bonuses
      const rb = getRefineBonus(item);
      weaponAtk += rb.atk;
      weaponMatk += rb.matk;
      equipDef += rb.def;
    }

    // Script bonuses (item + cards + enchantments) — applies to ALL slots including visual
    const scripts = [
      ...(isVisual ? [] : [item.script]),   // visual item base script is cosmetic only
      ...item.cards.filter(Boolean).map((c) => c!.script),
      ...(item.enchants || []).filter(Boolean).map((e) => e!.script),
    ];
    for (const scr of scripts) {
      const sb = parseScriptBonuses(scr, item.refine, baseLevel, baseStats, mainWeaponLevel);
      mergeBonus(totalBonus, sb);
    }
  }

  // Apply item combo/set bonuses (e.g., Temporal FOR Set)
  const activeCombos = applyComboBonus(equipment, totalBonus);

  // Apply Consumables/Buffs
  applyActiveBuffs(activeBuffs, totalBonus, baseStats, baseLevel);

  // Apply base stat modifiers
  const bonusStr = totalBonus.str || 0;
  const bonusAgi = totalBonus.agi || 0;
  const bonusVit = totalBonus.vit || 0;
  const bonusInt = totalBonus.int || 0;
  const bonusDex = totalBonus.dex || 0;
  const bonusLuk = totalBonus.luk || 0;

  const totalStr = s.str + bonusStr;
  const totalAgi = s.agi + bonusAgi;
  const totalVit = s.vit + bonusVit;
  const totalInt = s.int + bonusInt;
  const totalDex = s.dex + bonusDex;
  const totalLuk = s.luk + bonusLuk;

  // Base ATK from STR
  const baseAtk = Math.floor(totalStr) + Math.floor(totalDex / 5) + Math.floor(totalLuk / 3);
  const totalWeaponAtk = weaponAtk + (totalBonus.atk || 0);

  // Base MATK (rAthena Renewal: BaseLv/4 + INT + INT/2 + DEX/5 + LUK/3)
  const baseMatk = Math.floor(baseLevel / 4) + Math.floor(totalInt) + Math.floor(totalInt / 2) + Math.floor(totalDex / 5) + Math.floor(totalLuk / 3);
  const totalWeaponMatk = weaponMatk + (totalBonus.matk || 0);

  // DEF (Renewal: level/2 + VIT/2 + AGI/5)
  const baseDef = Math.floor(baseLevel / 2) + Math.floor(totalVit / 2) + Math.floor(totalAgi / 5);
  const totalEquipDef = equipDef + (totalBonus.def || 0);

  // MDEF (Renewal rAthena: INT + BaseLv/4 + VIT/5 + DEX/5)
  const baseMdef = Math.floor(totalInt) + Math.floor(baseLevel / 4) + Math.floor(totalVit / 5) + Math.floor(totalDex / 5);
  const totalEquipMdef = equipMdef + (totalBonus.mdef || 0);

  // HIT
  const hit = 175 + baseLevel + totalDex + (totalBonus.hit || 0);

  // FLEE
  const flee = 100 + baseLevel + totalAgi + (totalBonus.flee || 0);

  // CRIT
  const crit = 1 + Math.floor(totalLuk * 0.3) + (totalBonus.crit || 0);

  // ASPD (simplified — actual formula varies by class and weapon)
  const baseAspd = 156; // average base
  const aspdBonus = Math.floor(totalAgi * 0.2) + Math.floor(totalDex * 0.1) + (totalBonus.aspd || 0);
  const aspd = Math.min(193, baseAspd + aspdBonus);

  // HP (Renewal rAthena formula: 35 + base_level * hp_table[level] / 100)
  // hp_table grows roughly as hpFactor * level, so:
  // hpBase ≈ 35 + hpFactor * level² / 2  (quadratic growth from cumulative per-level)
  const hpBase = 35 + hpFactor * (baseLevel * (baseLevel + 1)) / 2;
  const baseHp = Math.floor(hpBase * (1 + totalVit * 0.01) * transMod);

  // SP (Renewal formula: base + spFactor * 4 per level, INT %, trans mod)
  const spBase = 10 + spFactor * 4 * baseLevel;
  const baseSp = Math.floor(spBase * (1 + totalInt * 0.01) * transMod);

  const hpBonus = totalBonus.maxHp || 0;
  const spBonus = totalBonus.maxSp || 0;
  const hpRate = 1 + (totalBonus.maxHpRate || 0) / 100;
  const spRate = 1 + (totalBonus.maxSpRate || 0) / 100;

  // Build special bonuses list
  const specialBonuses: { label: string; value: number; invertColor?: boolean }[] = [];

  const addSpecials = (
    record: Record<string, number> | undefined,
    type: "race" | "element" | "size" | "class",
    prefix: string,
    invertColor?: boolean,
  ) => {
    if (!record) return;
    for (const [key, val] of Object.entries(record)) {
      if (val !== 0) {
        let finalPrefix = prefix;
        let finalVal = val;
        let finalColor = invertColor;

        // If it's a resistance penalty (e.g. -20% resist), rebrand it as "Dano Recebido"
        if (prefix === "Resist." && val < 0) {
          finalPrefix = "Dano Recebido de";
          finalVal = Math.abs(val);
          // We want it to be red since taking more damage is bad.
          // Since invertColor handles "isGood = invertColor ? val < 0 : val > 0"
          // If finalVal is positive (20), value > 0.
          // If invertColor is true, isGood = val < 0 => False (Red).
          // So we set invertColor to true.
          finalColor = true;
        }

        specialBonuses.push({
          label: formatSpecialBonus(type, key, finalVal, finalPrefix),
          value: finalVal,
          invertColor: finalColor,
        });
      }
    }
  };

  // Physical damage modifiers
  addSpecials(totalBonus.addRace, "race", "Dano Físico vs");
  addSpecials(totalBonus.addEle, "element", "Dano Físico vs");
  addSpecials(totalBonus.addSize, "size", "Dano Físico vs");
  addSpecials(totalBonus.addClass, "class", "Dano Físico vs");

  // Magical damage modifiers
  addSpecials(totalBonus.magicAddRace, "race", "Dano Mágico vs");
  addSpecials(totalBonus.magicAddEle, "element", "Dano Mágico vs");
  addSpecials(totalBonus.magicAddSize, "size", "Dano Mágico vs");
  addSpecials(totalBonus.magicAddClass, "class", "Dano Mágico vs");

  // Magic element damage
  if (totalBonus.magicAtkEle) {
    for (const [key, val] of Object.entries(totalBonus.magicAtkEle)) {
      if (val !== 0) {
        const eleLabel = ELEMENT_LABELS[key] || key;
        specialBonuses.push({ label: `Magia ${eleLabel} +${val}%`, value: val });
      }
    }
  }

  // Resistances — positive values mean damage REDUCTION which is GOOD for the player
  addSpecials(totalBonus.subRace, "race", "Resist.");
  addSpecials(totalBonus.subEle, "element", "Resist.");
  addSpecials(totalBonus.subSize, "size", "Resist.");
  addSpecials(totalBonus.subClass, "class", "Resist.");

  // DEF/MDEF ignore by race/class
  if (totalBonus.ignoreDefRaceRate) {
    for (const [key, val] of Object.entries(totalBonus.ignoreDefRaceRate)) {
      if (val !== 0) {
        const raceLabel = RACE_LABELS[key] || key;
        specialBonuses.push({ label: `DEF ignorada ${raceLabel} ${val}%`, value: val });
      }
    }
  }
  if (totalBonus.ignoreMdefRaceRate) {
    for (const [key, val] of Object.entries(totalBonus.ignoreMdefRaceRate)) {
      if (val !== 0) {
        const raceLabel = RACE_LABELS[key] || key;
        specialBonuses.push({ label: `MDEF ignorada ${raceLabel} ${val}%`, value: val });
      }
    }
  }
  if (totalBonus.ignoreDefClassRate) {
    for (const [key, val] of Object.entries(totalBonus.ignoreDefClassRate)) {
      if (val !== 0) {
        const classLabel = CLASS_LABELS[key] || key;
        specialBonuses.push({ label: `DEF ignorada ${classLabel} ${val}%`, value: val });
      }
    }
  }

  // Heal power
  if (totalBonus.healPower) {
    specialBonuses.push({ label: `Cura +${totalBonus.healPower}%`, value: totalBonus.healPower });
  }

  // Weapon element override
  if (totalBonus.atkEle) {
    const eleLabel = ELEMENT_LABELS[totalBonus.atkEle] || totalBonus.atkEle;
    specialBonuses.push({ label: `Elemento da Arma: ${eleLabel}`, value: 0 });
  }

  // No size penalty
  if (totalBonus.noSizeFix) {
    specialBonuses.push({ label: "Ignora Penalidade de Tamanho", value: 0 });
  }

  // Skill-specific bonuses
  if (totalBonus.skillAtk) {
    for (const [skill, val] of Object.entries(totalBonus.skillAtk)) {
      if (val !== 0) {
        const skillName = SKILL_LABELS[skill] || skill.replace(/_/g, " ");
        specialBonuses.push({ label: `${skillName} +${val}%`, value: val });
      }
    }
  }
  if (totalBonus.skillCooldown) {
    for (const [skill, val] of Object.entries(totalBonus.skillCooldown)) {
      if (val !== 0) {
        const skillName = SKILL_LABELS[skill] || skill.replace(/_/g, " ");
        specialBonuses.push({ label: `${skillName} CD ${val > 0 ? "+" : ""}${val}ms`, value: val });
      }
    }
  }
  if (totalBonus.skillUseSP) {
    for (const [skill, val] of Object.entries(totalBonus.skillUseSP)) {
      if (val !== 0) {
        const skillName = SKILL_LABELS[skill] || skill.replace(/_/g, " ");
        specialBonuses.push({ label: `${skillName} SP ${val > 0 ? "+" : ""}${val}`, value: val });
      }
    }
  }

  return {
    atk: `${baseAtk} + ${totalWeaponAtk}`,
    matk: `${baseMatk} + ${totalWeaponMatk}`,
    def: `${baseDef} + ${totalEquipDef}`,
    mdef: `${baseMdef} + ${totalEquipMdef}`,
    hit,
    flee,
    crit,
    aspd,
    statBonuses: { str: bonusStr, agi: bonusAgi, vit: bonusVit, int: bonusInt, dex: bonusDex, luk: bonusLuk },
    maxHp: Math.floor((baseHp + hpBonus) * hpRate),
    maxSp: Math.floor((baseSp + spBonus) * spRate),
    atkRate: totalBonus.atkRate || 0,
    matkRate: totalBonus.matkRate || 0,
    longAtkRate: totalBonus.longAtkRate || 0,
    shortAtkRate: totalBonus.shortAtkRate || 0,
    critAtkRate: totalBonus.critAtkRate || 0,
    aspdRate: totalBonus.aspdRate || 0,
    variableCastrate: totalBonus.variableCastrate || 0,
    fixedCastrate: totalBonus.fixedCastrate || 0,
    delayrate: totalBonus.delayrate || 0,
    perfectDodge: totalBonus.perfectDodge || 0,
    specialBonuses,
    // For damage calculator
    totalBonus,
    weaponAtk: mainWeaponAtk,
    weaponMatk: mainWeaponMatk,
    weaponLevel: mainWeaponLevel,
    weaponRefine: mainWeaponRefine,
    weaponSubType: mainWeaponSubType,
    weaponWeight: mainWeaponWeight,
    activeCombos,
    activeBuffs,
  };
}

// ─── Stat Point System ──────────────────────────────────────────────

/**
 * Cost in stat points to raise a stat from `currentValue` to `currentValue + 1`.
 * rAthena formula: pc_need_status_point = 1 + (val + 9) / 10
 * Same formula for ALL stat values (no special case at 100+).
 */
export function getStatCost(currentValue: number): number {
  if (currentValue < 1) return 0;
  return 1 + Math.floor((currentValue + 9) / 10);
}

/**
 * Total stat points spent to raise a stat from 1 to `value`.
 */
export function getStatPointsSpent(value: number): number {
  let total = 0;
  for (let i = 1; i < value; i++) {
    total += getStatCost(i);
  }
  return total;
}

/**
 * Total stat points spent across all 6 stats.
 */
export function getTotalStatPointsUsed(stats: BaseStats): number {
  let total = 0;
  for (const val of Object.values(stats)) {
    total += getStatPointsSpent(val);
  }
  return total;
}

/**
 * Total stat points available at a given base level.
 * rAthena formula: pc_gets_status_point = (level + 14) / 5 per level.
 * Includes the 48 starting points + level-up gains.
 */
export function getTotalStatPoints(baseLevel: number): number {
  let total = 48; // starting stat points at level 1
  for (let lv = 2; lv <= baseLevel; lv++) {
    total += Math.floor((lv + 14) / 5);
  }
  return total;
}
