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
  delayrate?: number;
  perfectDodge?: number;
  // patk/smatk for 4th jobs
  patk?: number;
  smatk?: number;
  // Healing
  healPower?: number;
  // Race/element modifiers (bonus2)
  subRace?: Record<string, number>;     // damage reduction from race
  subEle?: Record<string, number>;      // damage reduction from element
  addRace?: Record<string, number>;     // extra damage to race
  addEle?: Record<string, number>;      // extra damage to element
  addSize?: Record<string, number>;     // extra damage to size
  addClass?: Record<string, number>;    // extra damage to class (boss/normal)
  subClass?: Record<string, number>;    // damage reduction from class
  // Skill-specific modifiers (bonus2 with quoted skill name)
  skillAtk?: Record<string, number>;    // bonus2 bSkillAtk,"SKILL",N
  skillCooldown?: Record<string, number>; // bonus2 bSkillCooldown,"SKILL",N
  skillUseSP?: Record<string, number>;  // bonus2 bSkillUseSP,"SKILL",N
  // DEF/MDEF ignore by race (bonus2 bIgnoreDefRaceRate, RC_X, N;)
  ignoreDefRaceRate?: Record<string, number>;
  ignoreMdefRaceRate?: Record<string, number>;
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
  value: number,
  prefix: string,
): string {
  const labels = type === "race" ? RACE_LABELS
    : type === "element" ? ELEMENT_LABELS
    : type === "size" ? SIZE_LABELS
    : CLASS_LABELS;
  const label = labels[key] || key;
  return `${prefix} ${label} ${value > 0 ? "+" : ""}${value}%`;
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
  specialBonuses: { label: string; value: number }[];
  // For damage calculator
  totalBonus: EquipBonus;
  weaponAtk: number;
  weaponMatk: number;
  weaponLevel: number;
  weaponRefine: number;
  weaponSubType?: string;
  // Active item combos/sets
  activeCombos: string[];
}

// ─── Equipment slots ─────────────────────────────────────────────────

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
// (e.g. Both_Hand shows when searching right_hand, NOT left_hand)
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
export function getAllOccupiedSlots(locations: string[]): EquipSlot[] {
  const slots = new Set<EquipSlot>();
  for (const loc of locations) {
    const mapped = LOCATION_TO_SLOT[loc];
    if (mapped) mapped.forEach((s) => slots.add(s));
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

/**
 * Flatten if/else blocks by evaluating conditions (must be fully numeric).
 * Processes innermost blocks first to handle nesting.
 */
function evaluateIfBlocks(code: string): string {
  let result = code;
  let changed = true;
  let safety = 20;
  while (changed && safety-- > 0) {
    changed = false;
    // Match innermost if blocks (no nested braces in body)
    result = result.replace(
      /if\s*\(\s*([^()]+?)\s*\)\s*\{([^{}]*)\}/g,
      (_match, condition: string, body: string) => {
        changed = true;
        return safeEvalCondition(condition) ? body : "";
      }
    );
  }
  return result;
}

// ─── Script bonus parser ─────────────────────────────────────────────

// Keys here MUST only refer to number fields of EquipBonus
type NumericBonusKey = Exclude<keyof EquipBonus, "subRace" | "subEle" | "addRace" | "addEle" | "addSize" | "addClass" | "subClass" | "skillAtk" | "skillCooldown" | "skillUseSP" | "ignoreDefRaceRate" | "ignoreMdefRaceRate">;
const BONUS_MAP: Record<string, NumericBonusKey> = {
  bStr: "str",
  bAgi: "agi",
  bVit: "vit",
  bInt: "int",
  bDex: "dex",
  bLuk: "luk",
  bBaseAtk: "atk",
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
  bDelayrate: "delayrate",
  bPAtk: "patk",
  bSMatk: "smatk",
  bHealPower: "healPower",
};

/**
 * Parse bonus statements from RO item script.
 * Handles: arithmetic expressions, if/else conditionals, bAllStats, nested ifs.
 */
export function parseScriptBonuses(
  script: string | undefined,
  refineLevel: number = 0,
  baseLevel: number = 200,
  baseStats?: BaseStats,
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
    // readparam(bStat) — substitute with actual base stats
    .replace(/readparam\(bStr\)/g, pStr)
    .replace(/readparam\(bAgi\)/g, pAgi)
    .replace(/readparam\(bVit\)/g, pVit)
    .replace(/readparam\(bInt\)/g, pInt)
    .replace(/readparam\(bDex\)/g, pDex)
    .replace(/readparam\(bLuk\)/g, pLuk)
    // getskilllv("SKILL") — assume max invested (10)
    .replace(/getskilllv\([^)]*\)/g, "10")
    // max(a,b) — simple 2-arg max
    .replace(/max\((\d+),(\d+)\)/g, (_m, a, b) => String(Math.max(Number(a), Number(b))));

  // Step 2: Parse simple variable assignments (.@var = EXPR;)
  const vars: Record<string, number> = {};
  const varInitRegex = /(\.\@\w+)\s*=\s*([^;+=]+);/g;
  let m;
  while ((m = varInitRegex.exec(processed)) !== null) {
    vars[m[1]] = safeEvalExpr(m[2]);
  }

  // Step 3: Replace known variable references so conditions become numeric
  for (const [name, val] of Object.entries(vars)) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    processed = processed.replace(new RegExp(escaped + "(?!\\w)", "g"), String(val));
  }

  // Step 4: Evaluate if/else blocks (handles nesting via innermost-first)
  processed = evaluateIfBlocks(processed);

  // Step 5: Re-parse variable assignments from surviving code (handles += in if bodies)
  const vars2: Record<string, number> = {};
  const reInitRegex = /(\.\@\w+)\s*=\s*([^;+=]+);/g;
  while ((m = reInitRegex.exec(processed)) !== null) {
    vars2[m[1]] = safeEvalExpr(m[2]);
  }
  const addRegex = /(\.\@\w+)\s*\+=\s*([^;]+);/g;
  while ((m = addRegex.exec(processed)) !== null) {
    vars2[m[1]] = (vars2[m[1]] || 0) + safeEvalExpr(m[2]);
  }
  for (const [name, val] of Object.entries(vars2)) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    processed = processed.replace(new RegExp(escaped + "(?!\\w)", "g"), String(val));
  }

  // Step 6: Parse bAllStats (adds to all 6 base stats)
  const allStatsRegex = /bonus\s+bAllStats\s*,\s*([^;,]+)\s*;/g;
  let match;
  while ((match = allStatsRegex.exec(processed)) !== null) {
    const value = safeEvalExpr(match[1]);
    for (const stat of ["str", "agi", "vit", "int", "dex", "luk"] as NumericBonusKey[]) {
      bonus[stat] = (bonus[stat] || 0) + value;
    }
  }

  // Step 7: Parse bonus bXXX, EXPR;  (expression-aware)
  const bonusRegex = /\bbonus\s+(b\w+)\s*(?:,\s*([^;,]+))?\s*;/g;
  while ((match = bonusRegex.exec(processed)) !== null) {
    const bonusName = match[1];
    if (bonusName === "bAllStats") continue; // already handled above
    const value = match[2] ? safeEvalExpr(match[2]) : 1;
    const key = BONUS_MAP[bonusName];
    if (key) {
      bonus[key] = (bonus[key] || 0) + value;
    }
  }

  // Step 8: Parse bonus2 with identifier params: bonus2 bXXX, TYPE, EXPR;
  const bonus2Regex = /bonus2\s+(b\w+)\s*,\s*(\w+)\s*,\s*([^;]+)\s*;/g;
  while ((match = bonus2Regex.exec(processed)) !== null) {
    const bonusName = match[1];
    const param = match[2];
    const value = safeEvalExpr(match[3]);

    switch (bonusName) {
      case "bSubRace":
        bonus.subRace = bonus.subRace || {};
        bonus.subRace[param] = (bonus.subRace[param] || 0) + value;
        break;
      case "bSubEle":
        bonus.subEle = bonus.subEle || {};
        bonus.subEle[param] = (bonus.subEle[param] || 0) + value;
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
      case "bIgnoreDefRaceRate":
        bonus.ignoreDefRaceRate = bonus.ignoreDefRaceRate || {};
        bonus.ignoreDefRaceRate[param] = (bonus.ignoreDefRaceRate[param] || 0) + value;
        break;
      case "bIgnoreMdefRaceRate":
        bonus.ignoreMdefRaceRate = bonus.ignoreMdefRaceRate || {};
        bonus.ignoreMdefRaceRate[param] = (bonus.ignoreMdefRaceRate[param] || 0) + value;
        break;
      default: {
        const key = BONUS_MAP[bonusName];
        if (key) bonus[key] = (bonus[key] || 0) + value;
      }
    }
  }

  // Step 9: Parse bonus2 with quoted params: bonus2 bSkillAtk,"SKILL",EXPR;
  const bonus2QuotedRegex = /bonus2\s+(b\w+)\s*,\s*"([^"]+)"\s*,\s*([^;]+)\s*;/g;
  while ((match = bonus2QuotedRegex.exec(processed)) !== null) {
    const bonusName = match[1];
    const param = match[2];
    const value = safeEvalExpr(match[3]);

    switch (bonusName) {
      case "bSkillAtk":
        bonus.skillAtk = bonus.skillAtk || {};
        bonus.skillAtk[param] = (bonus.skillAtk[param] || 0) + value;
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
let _combosCache: ComboJsonEntry[] | null = null;
function getCombos(): ComboJsonEntry[] {
  if (!_combosCache) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      _combosCache = require("../../../data/database/combos.json") as ComboJsonEntry[];
    } catch {
      _combosCache = [];
    }
  }
  return _combosCache;
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
    if (!item || item._blockedBy || slotKey.startsWith("visual_")) continue;
    equippedIds.add(item.id);
    itemRefines.set(item.id, item.refine || 0);
  }

  const activeCombos: string[] = [];
  const combos = getCombos();

  for (const combo of combos) {
    // All items in the combo must be equipped
    const allPresent = combo.allItemIds.every(id => id > 0 && equippedIds.has(id));
    if (!allPresent) continue;

    // Build display name
    const comboName = `${combo.sourceItemName} + ${combo.requiredItemNames.join(" + ")}`;
    activeCombos.push(comboName);

    // Apply base combo bonuses
    if (Object.keys(combo.baseBonuses).length > 0) {
      mergeBonus(totalBonus, combo.baseBonuses);
    }

    // Apply refine-gated bonuses
    for (const rb of combo.refineBonuses) {
      if (rb.minCombinedRefine && Object.keys(rb.bonuses).length > 0) {
        const combinedRefine = combo.allItemIds.reduce((sum, id) => sum + (itemRefines.get(id) || 0), 0);
        if (combinedRefine >= rb.minCombinedRefine) {
          mergeBonus(totalBonus, rb.bonuses);
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
}

export function calculateDerivedStats(build: BuildConfig): DerivedStats {
  const { baseLevel, baseStats, equipment, hpFactor = 1, spFactor = 1, isTrans = true } = build;
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

  for (const [slotKey, item] of Object.entries(equipment)) {
    if (!item) continue;
    // Skip secondary slots of multi-slot items (bonuses already counted from primary slot)
    if (item._blockedBy) continue;
    // Skip visual/costume slots (appearance only, no stat bonuses)
    if (slotKey.startsWith("visual_")) continue;

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
    }

    // Refine bonuses
    const rb = getRefineBonus(item);
    weaponAtk += rb.atk;
    weaponMatk += rb.matk;
    equipDef += rb.def;

    // Script bonuses (item + cards + enchantments)
    const scripts = [
      item.script,
      ...item.cards.filter(Boolean).map((c) => c!.script),
      ...(item.enchants || []).filter(Boolean).map((e) => e!.script),
    ];
    for (const scr of scripts) {
      const sb = parseScriptBonuses(scr, item.refine, baseLevel, baseStats);
      for (const [k, v] of Object.entries(sb)) {
        const key = k as keyof EquipBonus;
        if (typeof v === "object" && v !== null) {
          const existing = (totalBonus[key] || {}) as Record<string, number>;
          for (const [rk, rv] of Object.entries(v as Record<string, number>)) {
            existing[rk] = (existing[rk] || 0) + rv;
          }
          (totalBonus as Record<string, unknown>)[key] = existing;
        } else {
          (totalBonus as Record<string, unknown>)[key] = ((totalBonus[key] as number) || 0) + (v as number);
        }
      }
    }
  }

  // Apply item combo/set bonuses (e.g., Temporal FOR Set)
  const activeCombos = applyComboBonus(equipment, totalBonus);

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

  // Base MATK from INT
  const baseMatk = Math.floor(totalInt) + Math.floor(totalInt / 2) + Math.floor(totalDex / 5) + Math.floor(totalLuk / 3);
  const totalWeaponMatk = weaponMatk + (totalBonus.matk || 0);

  // DEF
  const baseDef = Math.floor(totalVit / 2) + Math.floor(totalAgi / 5);
  const totalEquipDef = equipDef + (totalBonus.def || 0);

  // MDEF
  const baseMdef = Math.floor(totalInt / 2) + Math.floor(totalVit / 5) + Math.floor(totalDex / 5);
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

  // HP (Renewal formula: cumulative per-level with class factor, VIT %, trans mod)
  // baseHP = 35 + hpFactor * sum(level) + 25 * hpFactor * level
  // Simplified: 35 + hpFactor * (level*(level+1)/2) + 25 * hpFactor * level
  const hpBase = 35 + hpFactor * (baseLevel * (baseLevel + 1)) / 2 + 25 * hpFactor * baseLevel;
  const baseHp = Math.floor(hpBase * (1 + totalVit * 0.01) * transMod);

  // SP (Renewal formula: base + spFactor * 4 per level, INT %, trans mod)
  const spBase = 10 + spFactor * 4 * baseLevel;
  const baseSp = Math.floor(spBase * (1 + totalInt * 0.01) * transMod);

  const hpBonus = totalBonus.maxHp || 0;
  const spBonus = totalBonus.maxSp || 0;
  const hpRate = 1 + (totalBonus.maxHpRate || 0) / 100;
  const spRate = 1 + (totalBonus.maxSpRate || 0) / 100;

  // Build special bonuses list
  const specialBonuses: { label: string; value: number }[] = [];

  const addSpecials = (
    record: Record<string, number> | undefined,
    type: "race" | "element" | "size" | "class",
    prefix: string,
  ) => {
    if (!record) return;
    for (const [key, val] of Object.entries(record)) {
      if (val !== 0) {
        specialBonuses.push({
          label: formatSpecialBonus(type, key, val, prefix),
          value: val,
        });
      }
    }
  };

  addSpecials(totalBonus.subRace, "race", "Resist.");
  addSpecials(totalBonus.subEle, "element", "Resist.");
  addSpecials(totalBonus.subClass, "class", "Resist.");
  addSpecials(totalBonus.addRace, "race", "Dano vs");
  addSpecials(totalBonus.addEle, "element", "Dano vs");
  addSpecials(totalBonus.addSize, "size", "Dano vs");
  addSpecials(totalBonus.addClass, "class", "Dano vs");

  // DEF/MDEF ignore by race
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

  // Heal power
  if (totalBonus.healPower) {
    specialBonuses.push({ label: `Cura +${totalBonus.healPower}%`, value: totalBonus.healPower });
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
    activeCombos,
  };
}

// ─── Stat Point System ──────────────────────────────────────────────

/**
 * Cost in stat points to raise a stat from `currentValue` to `currentValue + 1`.
 */
export function getStatCost(currentValue: number): number {
  if (currentValue < 1) return 0;
  if (currentValue < 100) {
    return Math.floor((currentValue - 1) / 10) + 2;
  }
  // Stats 100+: expensive (3rd job only)
  return 4 * Math.floor((currentValue - 100) / 5) + 16;
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
 * Includes the 48 starting points + level-up gains.
 */
export function getTotalStatPoints(baseLevel: number): number {
  let total = 48; // starting stat points at level 1
  for (let lv = 2; lv <= baseLevel; lv++) {
    if (lv <= 99) {
      total += Math.floor(lv / 5) + 3;
    } else if (lv <= 150) {
      total += Math.floor(lv / 10) + 13;
    } else {
      total += Math.floor((lv - 150) / 7) + 28;
    }
  }
  return total;
}
