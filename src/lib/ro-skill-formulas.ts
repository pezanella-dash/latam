// ─── Ragnarok Online Renewal — Skill Damage Formulas ─────────────────
// Extracted directly from rAthena source code (github.com/rathena/rathena).
// Each skill's calculateSkillRatio() in src/map/skills/{class}/*.cpp
// plus battle.cpp for special formulas (Dragon Breath, Tiger Cannon, etc.).
// IDs from rAthena skill_db.yml. PT names from official bRO LATAM translation.

export interface SkillFormula {
  id: number;
  aegisName: string;
  namePt: string;
  type: "physical" | "magical" | "mixed";
  element: "weapon" | "neutral" | "fire" | "water" | "earth" | "wind" | "holy" | "dark" | "ghost" | "poison" | "undead";
  hitCount: number | number[];        // fixed or per-level
  damagePercent: number[];            // base skillratio per level (index = level - 1)
  baseLvScaling: boolean;             // if true, RE_LVL_DMOD applies
  baseLvDivisor?: number;             // RE_LVL_DMOD divisor (default 100). Some skills use 120 or 150.
  isMelee: boolean;
  canCrit: boolean;
  halfCritBonus?: boolean;            // if true, bCritAtkRate bonus is halved for this skill
  ignoreDefPercent?: number;          // 0-100, % of DEF bypassed
  // Stat-based skillratio bonus: these stat values are added to the skillratio
  // e.g. statScaling: { int: 3 } means skillratio += 3 * totalINT
  statScaling?: Partial<Record<"str" | "agi" | "vit" | "int" | "dex" | "luk", number>>;
  statScalingPerLevel?: boolean;      // if true, stat bonus is multiplied by skill level
  // Special formula types — handled entirely in the damage engine
  formulaType?: "dragonBreath" | "tigerCannon" | "gatesOfHell" | "acidBomb"
  | "diamondDust" | "earthGrave" | "varetyrSpear" | "cartCannon" | "feintBomb" | "ignitionBreak"
  | "asuraStrike" | "spiralPierce";
  postBaseLvFlat?: number;              // flat skillratio added AFTER RE_LVL_DMOD (e.g. CRS spin stacks)
  sizeHitCount?: boolean;              // if true, hit count = 1/2/3 based on Small/Medium/Large target (KN_PIERCE)
  perHitDamage?: boolean;              // if true, each hit is a separate damage calc — total damage = perHit × hitCount (bolts, ground ticks)
  castTime?: number[];                // variable cast (ms) per level
  fixedCast?: number[];               // fixed cast (ms) per level
  cooldown?: number[];                // cooldown (ms) per level
  afterCastDelay?: number[];          // after cast delay (ms) per level
  spCost?: number[];                  // SP per level
  maxLevel: number;
  jobs: string[];                     // class aegis names that use this skill
}

// ─── Helper: build level array ──────────────────────────────────────

function levels(base: number, perLv: number, max: number): number[] {
  return Array.from({ length: max }, (_, i) => base + perLv * (i + 1));
}

function flat(val: number, max: number): number[] {
  return Array(max).fill(val);
}

// ─── Skill Database ─────────────────────────────────────────────────
// All formulas from rAthena source (Feb 2026, master branch).
// Format: skillratio starts at 100, skill does `skillratio += -100 + formula`
// or `skillratio += bonus`. The damagePercent stores the FINAL skillratio value.
//
// RE_LVL_DMOD(val): if BaseLv > 99, skillratio *= BaseLv / val
// Most 3rd class+ skills use baseLvScaling with divisor 100.

export const SKILL_FORMULAS: SkillFormula[] = [
  // ━━━ Auto Attack (Normal Attack) ━━━
  {
    id: 0,
    aegisName: "NORMAL_ATTACK",
    namePt: "Ataque Normal",
    type: "physical",
    element: "weapon",
    hitCount: 1,
    damagePercent: [100],
    baseLvScaling: false,
    isMelee: true,
    canCrit: true,
    maxLevel: 1,
    jobs: [],
  },

  // ━━━ Swordman (rAthena: src/map/skills/swordman/) ━━━
  // SM_BASH: skillratio += 30 * skill_lv
  {
    id: 5, aegisName: "SM_BASH", namePt: "Golpe Fulminante", type: "physical", element: "weapon", hitCount: 1,
    damagePercent: [130, 160, 190, 220, 250, 280, 310, 340, 370, 400], baseLvScaling: false,
    isMelee: true, canCrit: false, spCost: [8, 8, 8, 8, 8, 15, 15, 15, 15, 15], maxLevel: 10,
    jobs: ["Swordman", "Knight", "Crusader"]
  },
  // SM_MAGNUM: skillratio += 20 * skill_lv (inner AoE, fire element forced)
  {
    id: 7, aegisName: "SM_MAGNUM", namePt: "Impacto Explosivo", type: "physical", element: "fire", hitCount: 1,
    damagePercent: [120, 140, 160, 180, 200, 220, 240, 260, 280, 300], baseLvScaling: false,
    isMelee: true, canCrit: false, afterCastDelay: flat(500, 10), spCost: flat(30, 10), maxLevel: 10,
    jobs: ["Swordman", "Knight", "Crusader"]
  },
  // KN_BOWLINGBASH: skillratio += 40 * skill_lv
  {
    id: 62, aegisName: "KN_BOWLINGBASH", namePt: "Impacto de Tyr", type: "physical", element: "weapon", hitCount: 2,
    damagePercent: [140, 180, 220, 260, 300, 340, 380, 420, 460, 500], baseLvScaling: false,
    isMelee: true, canCrit: false, spCost: [13, 14, 15, 16, 17, 18, 19, 20, 21, 22], maxLevel: 10,
    jobs: ["Knight", "Lord_Knight", "Rune_Knight"]
  },
  // KN_PIERCE: skillratio += 10 * skill_lv. Hit count depends on monster size (1/2/3 for small/medium/large).
  // hitCount is set to 1 here; the damage engine overrides it based on target size.
  {
    id: 58, aegisName: "KN_PIERCE", namePt: "Perfurar", type: "physical", element: "weapon", hitCount: 1,
    damagePercent: [110, 120, 130, 140, 150, 160, 170, 180, 190, 200], baseLvScaling: false,
    isMelee: true, canCrit: false, spCost: [7, 7, 7, 7, 7, 7, 7, 7, 7, 7], maxLevel: 10,
    sizeHitCount: true,  // Special: hit count = 1/2/3 based on Small/Medium/Large target
    jobs: ["Knight", "Lord_Knight", "Rune_Knight"]
  },
  // KN_SPEARBOOMERANG: skillratio += 50 * skill_lv
  {
    id: 61, aegisName: "KN_SPEARBOOMERANG", namePt: "Bumerangue", type: "physical", element: "weapon", hitCount: 1,
    damagePercent: [150, 200, 250, 300, 350], baseLvScaling: false,
    isMelee: false, canCrit: false, spCost: [10, 10, 10, 10, 10], maxLevel: 5,
    jobs: ["Knight", "Lord_Knight", "Rune_Knight"]
  },

  // ━━━ Rune Knight / Lord Knight (rAthena: src/map/skills/swordman/) ━━━
  // LK_SPIRALPIERCE: skillratio += 50 + 50 * skill_lv; RE_LVL_DMOD(100); doubles if ChargingPierce >= 10
  // NOTE: Has special base ATK calc with weapon weight in battle.cpp
  {
    id: 396, aegisName: "LK_SPIRALPIERCE", namePt: "Perfurar em Espiral", type: "physical", element: "weapon", hitCount: 5,
    damagePercent: [200, 250, 300, 350, 400], baseLvScaling: true, formulaType: "spiralPierce",
    isMelee: false, canCrit: false, castTime: [300, 500, 700, 900, 1000], fixedCast: flat(500, 5),
    cooldown: flat(2000, 5), spCost: [18, 21, 24, 27, 30], maxLevel: 5, jobs: ["Lord_Knight", "Rune_Knight"]
  },
  // ---------------------------------------------------------
  // RK_SONICWAVE: kRO Rebalance 185/65 -> 1050 + (150 * skill_lv) % ATK. Base Lv Scaling.
  {
    id: 2002, aegisName: "RK_SONICWAVE", namePt: "Onda de Choque", type: "physical", element: "weapon", hitCount: 3,
    damagePercent: [1200, 1350, 1500, 1650, 1800, 1950, 2100, 2250, 2400, 2550], baseLvScaling: true,
    isMelee: false, canCrit: true, castTime: flat(500, 10), fixedCast: flat(500, 10), cooldown: flat(1750, 10),
    spCost: [50, 52, 54, 56, 58, 60, 62, 64, 66, 70], maxLevel: 10, jobs: ["Rune_Knight"]
  },
  // RK_IGNITIONBREAK: kRO Rebalance 185/65 -> (450 * skill_lv)% ATK. Base Lv Scaling.
  {
    id: 2006, aegisName: "RK_IGNITIONBREAK", namePt: "Impacto Flamejante", type: "physical", element: "weapon", hitCount: 1,
    damagePercent: [450, 900, 1350, 1800, 2250], baseLvScaling: true, formulaType: "ignitionBreak", // formulaType can be ignored since we handle distance uniformly now or just pure UI
    isMelee: true, canCrit: true, fixedCast: flat(1000, 5), cooldown: flat(2000, 5),
    spCost: [35, 40, 45, 50, 55], maxLevel: 5, jobs: ["Rune_Knight"]
  },
  // RK_HUNDREDSPEAR: skillratio += -100 + 600 + 200 * skill_lv; + SpiralPierce*50; RE_LVL_DMOD(100)
  {
    id: 2004, aegisName: "RK_HUNDREDSPEAR", namePt: "Lança das Mil Pontas", type: "physical", element: "weapon", hitCount: 5,
    damagePercent: levels(600, 200, 10), baseLvScaling: true,
    isMelee: false, canCrit: false, fixedCast: flat(1000, 10), cooldown: flat(2000, 10),
    spCost: levels(55, 5, 10), maxLevel: 10, jobs: ["Rune_Knight"]
  },
  // RK_WINDCUTTER: kRO Rebalance 185/65 -> (400 * skill_lv)% ATK (assume Spear/Max)
  {
    id: 2005, aegisName: "RK_WINDCUTTER", namePt: "Vento Cortante", type: "physical", element: "weapon", hitCount: 1,
    damagePercent: [400, 800, 1200, 1600, 2000], baseLvScaling: true,
    isMelee: true, canCrit: false, cooldown: [290, 280, 270, 260, 250], spCost: [20, 24, 28, 32, 36], maxLevel: 5,
    jobs: ["Rune_Knight"]
  },
  // RK_DRAGONBREATH: special formula in battle.cpp — (currentHP/50 + maxSP/4) × skillLv × BaseLv/150
  {
    id: 2008, aegisName: "RK_DRAGONBREATH", namePt: "Sopro do Dragão", type: "physical", element: "fire", hitCount: 1,
    damagePercent: flat(100, 10), baseLvScaling: false, formulaType: "dragonBreath",
    isMelee: false, canCrit: false, fixedCast: flat(1000, 10), cooldown: flat(2000, 10),
    spCost: levels(25, 5, 10), maxLevel: 10, jobs: ["Rune_Knight"]
  },
  // RK_DRAGONBREATH_WATER: same formula as fire variant, water element
  {
    id: 5004, aegisName: "RK_DRAGONBREATH_WATER", namePt: "Bafo do Dragão", type: "physical", element: "water", hitCount: 1,
    damagePercent: flat(100, 10), baseLvScaling: false, formulaType: "dragonBreath",
    isMelee: false, canCrit: false, fixedCast: flat(1000, 10), cooldown: flat(2000, 10),
    spCost: levels(25, 5, 10), maxLevel: 10, jobs: ["Rune_Knight"]
  },

  // RK_STORMBLAST (Pertz Runestone): skillratio = (RuneMastery_lv + STR/6) * 100; RE_LVL_DMOD(100)
  // Not per-level — depends purely on Rune Mastery (max 10) and STR.
  // Example: RuneMastery 10 + STR 120 -> (10+20)*100 = 3000%
  // Using RuneMastery 10 + STR ~120 estimate for display
  {
    id: 2011, aegisName: "RK_STORMBLAST", namePt: "Explosão Rúnica", type: "physical", element: "neutral", hitCount: 1,
    damagePercent: [3000], baseLvScaling: true, baseLvDivisor: 100,
    isMelee: true, canCrit: true, spCost: [50], maxLevel: 1, jobs: ["Rune_Knight"]
  },

  // CR_HOLYCROSS: skillratio += 35 * skill_lv; hit = 2
  {
    id: 148, aegisName: "CR_HOLYCROSS", namePt: "Crux Divina", type: "physical", element: "holy", hitCount: 2,
    damagePercent: [135, 170, 205, 240, 275, 310, 345, 380, 415, 450], baseLvScaling: false,
    isMelee: true, canCrit: false, spCost: [10, 11, 12, 13, 14, 15, 16, 17, 18, 20], maxLevel: 10,
    jobs: ["Crusader", "Paladin", "Royal_Guard"]
  },
  // CR_GRANDCROSS: ATK + MATK calculation. We treat as magical/mixed with high ratio.
  {
    id: 153, aegisName: "CR_GRANDCROSS", namePt: "Crux Magnum", type: "mixed", element: "holy", hitCount: 3,
    damagePercent: [140, 180, 220, 260, 300, 340, 380, 420, 460, 500], baseLvScaling: false,
    isMelee: false, canCrit: false, castTime: [3000, 3000, 3000, 3000, 3000, 3000, 3000, 3000, 3000, 3000],
    spCost: [37, 44, 51, 58, 65, 72, 79, 86, 93, 100], maxLevel: 10,
    jobs: ["Crusader", "Paladin", "Royal_Guard"]
  },
  // PA_SHIELDCHAIN (Renewal): skillratio = 200 + 200 * skill_lv + shield_weight/10 + 4*refine; RE_LVL_DMOD(100)
  {
    id: 258, aegisName: "PA_SHIELDCHAIN", namePt: "Choque Rápido", type: "physical", element: "weapon", hitCount: 5,
    damagePercent: [400, 600, 800, 1000, 1200], baseLvScaling: true,
    isMelee: false, canCrit: false, spCost: [28, 31, 34, 37, 40], maxLevel: 5,
    jobs: ["Paladin", "Royal_Guard"]
  },

  // ━━━ Royal Guard (rAthena: src/map/skills/swordman/) ━━━
  // LG_BANISHINGPOINT: skillratio = 100 * skill_lv + Bash_lv*70; RE_LVL_DMOD(100)
  {
    id: 2308, aegisName: "LG_BANISHINGPOINT", namePt: "Toque do Oblívio", type: "physical", element: "weapon", hitCount: 1,
    damagePercent: [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000], baseLvScaling: true,
    isMelee: false, canCrit: false, fixedCast: flat(500, 10), cooldown: flat(500, 10),
    spCost: levels(18, 2, 10), maxLevel: 10, jobs: ["Royal_Guard"]
  },
  // LG_CANNONSPEAR: skillratio += -100 + skill_lv * (120 + STR); +400 if Overbrand; RE_LVL_DMOD(100)
  {
    id: 2307, aegisName: "LG_CANNONSPEAR", namePt: "Disparo Perfurante", type: "physical", element: "weapon", hitCount: 1,
    damagePercent: [120, 240, 360, 480, 600], baseLvScaling: true,
    statScaling: { str: 1 }, statScalingPerLevel: true,
    isMelee: false, canCrit: true, halfCritBonus: true, fixedCast: flat(500, 5), cooldown: flat(2000, 5),
    spCost: [30, 36, 42, 48, 54], maxLevel: 5, jobs: ["Royal_Guard"]
  },
  // LG_OVERBRAND: skillratio = 350 * skill_lv (normal) / 500 * skill_lv (with OverbrandReady); RE_LVL_DMOD(100)
  // + SpearQuicken_lv*50. Using normal (350*lv) base.
  {
    id: 2317, aegisName: "LG_OVERBRAND", namePt: "Lança do Destino", type: "physical", element: "weapon", hitCount: 3,
    damagePercent: [350, 700, 1050, 1400, 1750], baseLvScaling: true,
    isMelee: true, canCrit: false, fixedCast: flat(500, 5), cooldown: flat(300, 5),
    spCost: [20, 30, 40, 50, 60], maxLevel: 5, jobs: ["Royal_Guard"]
  },
  // LG_SHIELDPRESS: skillratio += -100 + 200 * skill_lv + STR + shield_weight/10; RE_LVL_DMOD(100)
  {
    id: 2310, aegisName: "LG_SHIELDPRESS", namePt: "Escudo Compressor", type: "physical", element: "weapon", hitCount: 5,
    damagePercent: [200, 400, 600, 800, 1000, 1200, 1400, 1600, 1800, 2000], baseLvScaling: true,
    statScaling: { str: 1 },
    isMelee: true, canCrit: false, spCost: levels(10, 2, 10), maxLevel: 10, jobs: ["Royal_Guard"]
  },
  // LG_EARTHDRIVE: kRO Rebalance 185/65 -> (380 * skill_lv)% ATK. Replaces shield weight with Lv, STR and VIT. Base Lv Scaling.
  {
    id: 2323, aegisName: "LG_EARTHDRIVE", namePt: "Aegis Inferi", type: "physical", element: "weapon", hitCount: 5,
    damagePercent: [380, 760, 1140, 1520, 1900], baseLvScaling: true,
    statScaling: { str: 1, vit: 1 }, statScalingPerLevel: false, // STR+VIT are flat additions, not per-level
    isMelee: true, canCrit: false, fixedCast: flat(1000, 5), cooldown: flat(3000, 5),
    spCost: [40, 50, 60, 70, 80], maxLevel: 5, jobs: ["Royal_Guard"]
  },
  // LG_MOONSLASHER: skillratio += -100 + 120 * skill_lv + Overbrand_lv*80; RE_LVL_DMOD(100)
  {
    id: 2320, aegisName: "LG_MOONSLASHER", namePt: "Espiral Lunar", type: "physical", element: "weapon", hitCount: 5,
    damagePercent: [120, 240, 360, 480, 600], baseLvScaling: true,
    isMelee: true, canCrit: false, cooldown: flat(2000, 5), spCost: [18, 22, 26, 30, 34], maxLevel: 5, jobs: ["Royal_Guard"]
  },
  // LG_RAYOFGENESIS: skillratio = 350 * skill_lv + INT*3; RE_LVL_DMOD(100)
  {
    id: 2321, aegisName: "LG_RAYOFGENESIS", namePt: "Luz da Criação", type: "magical", element: "holy", hitCount: 7,
    damagePercent: [350, 700, 1050, 1400, 1750, 2100, 2450, 2800, 3150, 3500], baseLvScaling: true,
    statScaling: { int: 3 }, statScalingPerLevel: false,
    isMelee: false, canCrit: false, castTime: flat(3000, 10), fixedCast: flat(1000, 10), cooldown: flat(5000, 10), // HP cost removed, mapped as fixed property in engine.
    spCost: levels(60, 10, 10), maxLevel: 10, jobs: ["Royal_Guard"]
  },

  // ━━━ Archer / Hunter (rAthena: src/map/skills/archer/) ━━━
  // AC_DOUBLE: skillratio += 10 * (skill_lv - 1); 2 hits
  {
    id: 46, aegisName: "AC_DOUBLE", namePt: "Rajada de Flechas", type: "physical", element: "weapon", hitCount: 2,
    damagePercent: [100, 110, 120, 130, 140, 150, 160, 170, 180, 190], baseLvScaling: false,
    isMelee: false, canCrit: false, spCost: flat(12, 10), maxLevel: 10, jobs: ["Archer", "Hunter"]
  },
  // AC_SHOWER (Renewal): skillratio += 50 + 10 * skill_lv
  {
    id: 47, aegisName: "AC_SHOWER", namePt: "Chuva de Flechas", type: "physical", element: "weapon", hitCount: 1,
    damagePercent: [160, 170, 180, 190, 200, 210, 220, 230, 240, 250], baseLvScaling: false,
    isMelee: false, canCrit: false, spCost: flat(15, 10), maxLevel: 10, jobs: ["Archer", "Hunter"]
  },
  // SN_SHARPSHOOTING (Renewal): skillratio += -100 + 300 + 300 * skill_lv; RE_LVL_DMOD(100)
  {
    id: 382, aegisName: "SN_SHARPSHOOTING", namePt: "Tiro Preciso", type: "physical", element: "weapon", hitCount: 1,
    damagePercent: [600, 900, 1200, 1500, 1800], baseLvScaling: true,
    isMelee: false, canCrit: true, halfCritBonus: true, castTime: flat(1500, 5), fixedCast: flat(500, 5),
    spCost: [18, 21, 24, 27, 30], maxLevel: 5, jobs: ["Hunter", "Sniper", "Ranger"]
  },
  // CG_ARROWVULCAN
  {
    id: 384, aegisName: "CG_ARROWVULCAN", namePt: "Vulcão de Flechas", type: "physical", element: "weapon", hitCount: 9,
    damagePercent: [600, 700, 800, 900, 1000, 1100, 1200, 1300, 1400, 1500], baseLvScaling: true,
    isMelee: false, canCrit: false, castTime: [1800, 2000, 2200, 2400, 2600, 2800, 3000, 3200, 3400, 3800],
    spCost: [12, 14, 16, 18, 20, 22, 24, 26, 28, 30], maxLevel: 10, jobs: ["Clown", "Gypsy", "Minstrel", "Wanderer"]
  },

  // ━━━ Ranger (rAthena: src/map/skills/archer/) ━━━
  // RA_ARROWSTORM: skillratio += -100 + 200 + 180 * skill_lv; RE_LVL_DMOD(100)
  // (Fear Breeze variant: 200 + 250*lv — not tracked here)
  {
    id: 2233, aegisName: "RA_ARROWSTORM", namePt: "Tempestade de Flechas", type: "physical", element: "weapon", hitCount: 3,
    damagePercent: [380, 560, 740, 920, 1100, 1280, 1460, 1640, 1820, 2000], baseLvScaling: true,
    isMelee: false, canCrit: false, fixedCast: flat(500, 10), cooldown: flat(3000, 10),
    spCost: levels(25, 5, 10), maxLevel: 10, jobs: ["Ranger"]
  },
  // RA_AIMEDBOLT: kRO Rebalance -> With Fear Breeze active it deals (800 + 35 * skill_lv)% ATK per hit. 5 hits. Base Lv Scaling.
  {
    id: 2236, aegisName: "RA_AIMEDBOLT", namePt: "Disparo Certeiro", type: "physical", element: "weapon", hitCount: 5,
    damagePercent: [835, 870, 905, 940, 975, 1010, 1045, 1080, 1115, 1150], baseLvScaling: true,
    isMelee: false, canCrit: false, castTime: levels(800, 200, 10), fixedCast: flat(500, 10),
    cooldown: flat(3000, 10), spCost: levels(30, 4, 10), maxLevel: 10, jobs: ["Ranger"]
  },
  // RA_WUGSTRIKE: skillratio += -100 + 200 * skill_lv (no BaseLv scaling)
  {
    id: 2243, aegisName: "RA_WUGSTRIKE", namePt: "Investida de Worg", type: "physical", element: "weapon",
    hitCount: 1, damagePercent: [200, 400, 600, 800, 1000], baseLvScaling: false,
    isMelee: false, canCrit: false, spCost: [20, 22, 24, 26, 28], maxLevel: 5, jobs: ["Ranger"]
  },

  // ━━━ Assassin / Guillotine Cross (rAthena: src/map/skills/thief/) ━━━
  // AS_SONICBLOW (Renewal): skillratio += -100 + 200 + 100 * skill_lv; NO BaseLv; +50% if target < 50% HP; 8 hits
  {
    id: 136, aegisName: "AS_SONICBLOW", namePt: "Lâminas Destruidoras", type: "physical", element: "weapon", hitCount: 8,
    damagePercent: [300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200], baseLvScaling: false,
    isMelee: true, canCrit: false, spCost: [16, 18, 20, 22, 24, 26, 28, 30, 32, 34], maxLevel: 10,
    jobs: ["Assassin"]
  },
  // ASC_BREAKER / Soul Destroyer: skillratio = 150 * skill_lv + STR + INT; RE_LVL_DMOD(100)
  {
    id: 379, aegisName: "ASC_BREAKER", namePt: "Destruidor de Almas", type: "physical", element: "weapon", hitCount: 1,
    damagePercent: [150, 300, 450, 600, 750, 900, 1050, 1200, 1350, 1500], baseLvScaling: true,
    statScaling: { str: 1, int: 1 },
    isMelee: false, canCrit: true, halfCritBonus: true,
    spCost: flat(20, 10), maxLevel: 10, jobs: ["Assassin_Cross", "Guillotine_Cross"]
  },
  // ASC_METEORASSAULT (Renewal): skillratio += 100 + 120 * skill_lv; RE_LVL_DMOD(100). No stat scaling.
  {
    id: 380, aegisName: "ASC_METEORASSAULT", namePt: "Tocaia", type: "physical", element: "weapon", hitCount: 1,
    damagePercent: [320, 440, 560, 680, 800, 920, 1040, 1160, 1280, 1400], baseLvScaling: true,
    isMelee: true, canCrit: false, spCost: [10, 12, 14, 16, 18, 20, 22, 24, 26, 28], maxLevel: 10,
    jobs: ["Assassin_Cross", "Guillotine_Cross"]
  },
  // RG_BACKSTAP: skillratio += 240 + 40 * skill_lv
  {
    id: 215, aegisName: "RG_BACKSTAP", namePt: "Apunhalar", type: "physical", element: "weapon", hitCount: 1,
    damagePercent: [340, 380, 420, 460, 500, 540, 580, 620, 660, 700], baseLvScaling: false,
    isMelee: true, canCrit: false, spCost: flat(16, 10), maxLevel: 10,
    jobs: ["Rogue", "Stalker", "Shadow_Chaser"]
  },
  // RG_RAID (Renewal): base_skillratio += -100 + 50 + 150 * skill_lv
  {
    id: 217, aegisName: "RG_RAID", namePt: "Ataque Surpresa", type: "physical", element: "weapon", hitCount: 1,
    damagePercent: [200, 350, 500, 650, 800], baseLvScaling: false,
    isMelee: true, canCrit: false, spCost: [10, 12, 14, 16, 18], maxLevel: 5,
    jobs: ["Rogue", "Stalker", "Shadow_Chaser"]
  },

  // GC_CROSSIMPACT: skillratio = 1400 + 150 * skill_lv; RE_LVL_DMOD(100)
  {
    id: 2022, aegisName: "GC_CROSSIMPACT", namePt: "Lâminas Retalhadoras", type: "physical", element: "weapon", hitCount: 7,
    damagePercent: [1550, 1700, 1850, 2000, 2150], baseLvScaling: true, baseLvDivisor: 100,
    isMelee: true, canCrit: true, halfCritBonus: true, fixedCast: flat(500, 5), cooldown: flat(700, 5),
    spCost: flat(40, 5), maxLevel: 5, jobs: ["Guillotine_Cross"]
  },
  // GC_ROLLINGCUTTER: kRO Rebalance 185/65 -> 50 + (80 * skill_lv)% ATK. Base Lv Scaling.
  {
    id: 2036, aegisName: "GC_ROLLINGCUTTER", namePt: "Lâminas de Loki", type: "physical", element: "weapon", hitCount: 1,
    damagePercent: [130, 210, 290, 370, 450], baseLvScaling: true,
    isMelee: true, canCrit: false, cooldown: flat(200, 5), spCost: flat(5, 5), maxLevel: 5,
    jobs: ["Guillotine_Cross"]
  },
  // GC_CROSSRIPPERSLASHER: kRO Rebalance 185/65 -> (80 * skill_lv) + (AGI * 3)% ATK.
  // RE_LVL_DMOD(100) then + spin * 200. Spin stacks (max 10) added AFTER baseLvScaling.
  {
    id: 2037, aegisName: "GC_CROSSRIPPERSLASHER", namePt: "Castigo de Loki", type: "physical", element: "weapon", hitCount: 1,
    damagePercent: [80, 160, 240, 320, 400], baseLvScaling: true,
    postBaseLvFlat: 2000, // 10 spin stacks × 200, added AFTER RE_LVL_DMOD per rAthena
    statScaling: { agi: 3 }, statScalingPerLevel: false,
    isMelee: false, canCrit: false, castTime: flat(500, 5), cooldown: [500, 450, 400, 350, 300],
    spCost: [20, 24, 28, 32, 36], maxLevel: 5, jobs: ["Guillotine_Cross"]
  },
  // GC_COUNTERSLASH: skillratio += -100 + 300 + 150 * skill_lv; RE_LVL_DMOD(120); + AGI*2 + JobLv*4
  {
    id: 2029, aegisName: "GC_COUNTERSLASH", namePt: "Retaliação", type: "physical", element: "weapon", hitCount: 1,
    damagePercent: [450, 600, 750, 900, 1050, 1200, 1350, 1500, 1650, 1800], baseLvScaling: true, baseLvDivisor: 120,
    statScaling: { agi: 2 },
    isMelee: true, canCrit: false, ignoreDefPercent: 100,
    spCost: [25, 28, 31, 34, 37, 40, 43, 46, 49, 52], maxLevel: 10, jobs: ["Guillotine_Cross"]
  },

  // ━━━ Shadow Chaser (rAthena: src/map/skills/thief/) ━━━
  // SC_TRIANGLESHOT: skillratio += -100 + 230 * skill_lv + AGI*3; RE_LVL_DMOD(100)
  {
    id: 2288, aegisName: "SC_TRIANGLESHOT", namePt: "Disparo Triplo", type: "physical", element: "weapon", hitCount: 3,
    damagePercent: [230, 460, 690, 920, 1150, 1380, 1610, 1840, 2070, 2300], baseLvScaling: true,
    statScaling: { agi: 3 },
    isMelee: false, canCrit: false, spCost: levels(18, 2, 10), maxLevel: 10, jobs: ["Shadow_Chaser"]
  },
  // SC_FATALMENACE: skillratio += -100 + 100 + 120 * skill_lv + AGI; RE_LVL_DMOD(100)
  {
    id: 2284, aegisName: "SC_FATALMENACE", namePt: "Ofensiva Fatal", type: "physical", element: "weapon", hitCount: 1,
    damagePercent: [220, 340, 460, 580, 700, 820, 940, 1060, 1180, 1300], baseLvScaling: true,
    statScaling: { agi: 1 },
    isMelee: true, canCrit: false, cooldown: flat(3000, 10), spCost: levels(20, 4, 10), maxLevel: 10,
    jobs: ["Shadow_Chaser"]
  },
  // SC_FEINTBOMB: skillratio += -100 + (skill_lv + 1) * DEX/2 * (JobLv/10); RE_LVL_DMOD(120)
  // Complex stat formula — engine handles via formulaType
  {
    id: 2304, aegisName: "SC_FEINTBOMB", namePt: "Cópia Explosiva", type: "physical", element: "weapon", hitCount: 1,
    damagePercent: [200, 400, 600, 800, 1000, 1200, 1400, 1600, 1800, 2000], baseLvScaling: true, baseLvDivisor: 120,
    formulaType: "feintBomb",
    isMelee: true, canCrit: false, cooldown: flat(5000, 10), spCost: levels(24, 4, 10), maxLevel: 10,
    jobs: ["Shadow_Chaser"]
  },

  // ━━━ Mage / Wizard (rAthena: src/map/skills/mage/) ━━━
  // MG_SOULSTRIKE
  {
    id: 13, aegisName: "MG_SOULSTRIKE", namePt: "Ataque Espiritual", type: "magical", element: "ghost",
    hitCount: [1, 1, 2, 2, 3, 3, 4, 4, 5, 5], damagePercent: flat(100, 10), baseLvScaling: false,
    perHitDamage: true,  // each hit is a separate 100% MATK calculation
    isMelee: false, canCrit: false, castTime: [500, 500, 500, 500, 500, 500, 500, 500, 500, 500],
    spCost: [18, 14, 24, 20, 30, 26, 36, 32, 42, 38], maxLevel: 10, jobs: ["Mage", "Wizard", "High_Wizard", "Warlock", "Sage", "Professor", "Sorcerer"]
  },
  // Bolt spells: 100% MATK per hit, hits = skill level
  {
    id: 19, aegisName: "MG_FIREBOLT", namePt: "Lanças de Fogo", type: "magical", element: "fire",
    hitCount: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], damagePercent: flat(100, 10), baseLvScaling: false,
    perHitDamage: true,  // each bolt is a separate 100% MATK calculation
    isMelee: false, canCrit: false, castTime: [700, 1400, 2100, 2800, 3500, 4200, 4900, 5600, 6300, 7000],
    spCost: [12, 14, 16, 18, 20, 22, 24, 26, 28, 30], maxLevel: 10, jobs: ["Mage", "Wizard"]
  },
  {
    id: 14, aegisName: "MG_COLDBOLT", namePt: "Lanças de Gelo", type: "magical", element: "water",
    hitCount: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], damagePercent: flat(100, 10), baseLvScaling: false,
    perHitDamage: true,
    isMelee: false, canCrit: false, castTime: [700, 1400, 2100, 2800, 3500, 4200, 4900, 5600, 6300, 7000],
    spCost: [12, 14, 16, 18, 20, 22, 24, 26, 28, 30], maxLevel: 10, jobs: ["Mage", "Wizard"]
  },
  {
    id: 20, aegisName: "MG_LIGHTNINGBOLT", namePt: "Relâmpago", type: "magical", element: "wind",
    hitCount: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], damagePercent: flat(100, 10), baseLvScaling: false,
    perHitDamage: true,
    isMelee: false, canCrit: false, castTime: [700, 1400, 2100, 2800, 3500, 4200, 4900, 5600, 6300, 7000],
    spCost: [12, 14, 16, 18, 20, 22, 24, 26, 28, 30], maxLevel: 10, jobs: ["Mage", "Wizard"]
  },

  // ━━━ Warlock / High Wizard (rAthena: src/map/skills/mage/) ━━━
  // WZ_JUPITEL: skillratio += 0; hitCount = 2 + skill_lv. Each hit is 100% MATK.
  {
    id: 84, aegisName: "WZ_JUPITEL", namePt: "Trovão de Júpiter", type: "magical", element: "wind",
    hitCount: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12], damagePercent: flat(100, 10), baseLvScaling: false,
    perHitDamage: true,  // each bolt is a separate 100% MATK calculation
    isMelee: false, canCrit: false, castTime: [2000, 2500, 3000, 3500, 4000, 4500, 5000, 5500, 6000, 6500],
    spCost: [20, 23, 26, 29, 32, 35, 38, 41, 44, 47], maxLevel: 10, jobs: ["Wizard", "High_Wizard", "Warlock"]
  },
  // WZ_WATERBALL: hitCount max 25 (lv5).
  {
    id: 86, aegisName: "WZ_WATERBALL", namePt: "Esferas D'Água", type: "magical", element: "water",
    hitCount: [1, 5, 9, 15, 25], damagePercent: [130, 160, 190, 220, 250], baseLvScaling: false,
    perHitDamage: true,  // each ball is a separate 130% MATK calculation
    isMelee: false, canCrit: false, castTime: [1000, 2000, 3000, 4000, 5000],
    spCost: [15, 20, 25, 30, 35], maxLevel: 5, jobs: ["Wizard", "High_Wizard", "Warlock"]
  },
  // WZ_HEAVENDRIVE
  {
    id: 85, aegisName: "WZ_HEAVENDRIVE", namePt: "Fúria da Terra", type: "magical", element: "earth",
    hitCount: [1, 2, 3, 4, 5], damagePercent: flat(125, 5), baseLvScaling: false,
    perHitDamage: true,  // each hit is a separate 125% MATK calculation (Renewal +25)
    isMelee: false, canCrit: false, castTime: [1000, 2000, 3000, 4000, 5000],
    spCost: [24, 28, 32, 36, 40], maxLevel: 5, jobs: ["Wizard", "High_Wizard", "Warlock", "Sage", "Professor", "Sorcerer"]
  },
  // WZ_METEOR: Multiple AoE drops, each drop hits multiple times. We simulate 1 drop here.
  // Each hit is 100% MATK
  {
    id: 83, aegisName: "WZ_METEOR", namePt: "Chuva de Meteoros", type: "magical", element: "fire",
    hitCount: [1, 1, 2, 2, 3, 3, 4, 4, 5, 5], damagePercent: flat(125, 10), baseLvScaling: false,
    perHitDamage: true,  // each meteor drop is a separate 125% MATK calculation (Renewal +25)
    isMelee: false, canCrit: false, castTime: [1500, 2000, 3000, 3500, 4500, 5000, 6000, 6500, 7500, 8000],
    cooldown: flat(7000, 10), spCost: [20, 24, 30, 34, 40, 44, 50, 54, 60, 64], maxLevel: 10, jobs: ["Wizard", "High_Wizard", "Warlock"]
  },
  // WZ_STORMGUST (Renewal): 10 hits, each is base_skillratio = 100 - 30 + 50*lv = 70 + 50*lv
  {
    id: 89, aegisName: "WZ_STORMGUST", namePt: "Nevasca", type: "magical", element: "water", hitCount: 10,
    damagePercent: [120, 170, 220, 270, 320, 370, 420, 470, 520, 570], baseLvScaling: false,
    perHitDamage: true,  // ground effect: each of 10 ticks is a separate damage calculation
    isMelee: false, canCrit: false, castTime: [2400, 3200, 4000, 4800, 5600, 6400, 7200, 8000, 8800, 9600], fixedCast: flat(2400, 10),
    cooldown: flat(5000, 10), spCost: [74, 78, 82, 86, 90, 94, 98, 102, 106, 110], maxLevel: 10, jobs: ["Wizard", "High_Wizard", "Warlock"]
  },
  // ---------------------------------------------------------
  // WL_SOULEXPANSION: skillratio = 1000 + 200 * skill_lv + INT; RE_LVL_DMOD(100)
  {
    id: 2202, aegisName: "WL_SOULEXPANSION", namePt: "Impacto Espiritual", type: "magical", element: "ghost", hitCount: 2,
    damagePercent: [1200, 1400, 1600, 1800, 2000], baseLvScaling: true,
    statScaling: { int: 1 },
    isMelee: false, canCrit: false, fixedCast: flat(500, 5), cooldown: flat(2000, 5),
    spCost: [30, 34, 38, 42, 46], maxLevel: 5, jobs: ["Warlock"]
  },
  // WL_JACKFROST: kRO Rebalance 185/65 -> 1000 + (300 * skill_lv)% MATK.
  {
    id: 2204, aegisName: "WL_JACKFROST", namePt: "Esquife de Gelo", type: "magical", element: "water", hitCount: 1,
    damagePercent: [1300, 1600, 1900, 2200, 2500], baseLvScaling: true, // Bonus vs Frost handled by state manager (1200 + 600*lv) assumed static for now or manual max
    isMelee: false, canCrit: false, castTime: [2000, 2500, 3000, 3500, 4000], fixedCast: flat(1000, 5),
    cooldown: flat(4000, 5), spCost: [50, 60, 70, 80, 90], maxLevel: 5, jobs: ["Warlock"]
  },
  // WL_FROSTMISTY: kRO Rebalance 185/65 -> 200 + (100 * skill_lv)% MATK. (x skill level hits). Base Lv Scaling.
  {
    id: 2205, aegisName: "WL_FROSTMISTY", namePt: "Nevasca", type: "magical", element: "water", hitCount: [1, 2, 3, 4, 5],
    damagePercent: [300, 400, 500, 600, 700], baseLvScaling: true,
    isMelee: false, canCrit: false, castTime: [1000, 1500, 2000, 2500, 3000], fixedCast: flat(500, 5),
    cooldown: flat(2000, 5), spCost: [40, 45, 50, 55, 60], maxLevel: 5, jobs: ["Warlock"]
  },
  // WL_CRIMSONROCK: kRO Rebalance 185/65 -> 700 + (600 * skill_lv)% MATK. Entire Formula Base Level Scaled.
  {
    id: 2211, aegisName: "WL_CRIMSONROCK", namePt: "Meteoro Escarlate", type: "magical", element: "fire", hitCount: 7,
    damagePercent: [1300, 1900, 2500, 3100, 3700], baseLvScaling: true,
    isMelee: false, canCrit: false, castTime: [3000, 3500, 4000, 4500, 5000], fixedCast: flat(1000, 5),
    cooldown: flat(5000, 5), spCost: [60, 70, 80, 90, 100], maxLevel: 5, jobs: ["Warlock"]
  },
  // WL_CHAINLIGHTNING: skillratio += 400 + 100 * skill_lv; + 100*chain_count; RE_LVL_DMOD(100)
  {
    id: 2214, aegisName: "WL_CHAINLIGHTNING", namePt: "Corrente Elétrica", type: "magical", element: "wind", hitCount: 1,
    damagePercent: [600, 700, 800, 900, 1000], baseLvScaling: true,
    isMelee: false, canCrit: false, castTime: [3000, 3500, 4000, 4500, 5000], fixedCast: flat(1000, 5),
    cooldown: flat(3000, 5), spCost: [80, 90, 100, 110, 120], maxLevel: 5, jobs: ["Warlock"]
  },
  // WL_EARTHSTRAIN: kRO Rebalance 185/65 -> 1000 + (600 * skill_lv)% MATK. Base Lv Scaling.
  {
    id: 2216, aegisName: "WL_EARTHSTRAIN", namePt: "Abalo Sísmico", type: "magical", element: "earth", hitCount: 10,
    damagePercent: [1600, 2200, 2800, 3400, 4000], baseLvScaling: true,
    isMelee: false, canCrit: false, castTime: [3000, 3500, 4000, 4500, 5000], fixedCast: flat(1000, 5),
    cooldown: flat(5000, 5), spCost: [70, 80, 90, 100, 110], maxLevel: 5, jobs: ["Warlock"]
  },
  // WL_COMET: skillratio += -100 + 2500 + 700 * skill_lv; RE_LVL_DMOD(100)
  {
    id: 2213, aegisName: "WL_COMET", namePt: "Cometa", type: "magical", element: "neutral", hitCount: 10,
    damagePercent: [3200, 3900, 4600, 5300, 6000], baseLvScaling: true,
    isMelee: false, canCrit: false, castTime: [8000, 9000, 10000, 11000, 12000], fixedCast: flat(2000, 5),
    cooldown: flat(20000, 5), spCost: flat(400, 5), maxLevel: 5, jobs: ["Warlock"]
  },
  // WL_HELLINFERNO: Fire hit: (skill_lv * 400)% MATK.
  // Shadow hit (kRO rebalance): (skill_lv * 600)% MATK. Displayed in 3 hits. (Calculated together as 1000*skill_lv)
  {
    id: 2212, aegisName: "WL_HELLINFERNO", namePt: "Chamas de Hela", type: "magical", element: "fire", hitCount: 1,
    damagePercent: [1000, 2000, 3000, 4000, 5000], baseLvScaling: true, // Merged Fire (400) + Shadow (600) into flat 1000 multiplier per level
    isMelee: false, canCrit: false, castTime: flat(2000, 5), fixedCast: flat(500, 5),
    cooldown: flat(3000, 5), spCost: [64, 70, 76, 82, 88], maxLevel: 5, jobs: ["Warlock"]
  },
  // WL_DRAINLIFE: skillratio += -100 + 200 * skill_lv + INT; RE_LVL_DMOD(100)
  {
    id: 2210, aegisName: "WL_DRAINLIFE", namePt: "Drenar Vida", type: "magical", element: "neutral", hitCount: 1,
    damagePercent: [200, 400, 600, 800, 1000], baseLvScaling: true,
    statScaling: { int: 1 },
    isMelee: false, canCrit: false, castTime: flat(1000, 5), fixedCast: flat(500, 5),
    spCost: [20, 24, 28, 32, 36], maxLevel: 5, jobs: ["Warlock"]
  },

  // (GC_ROLLINGCUTTER and GC_CROSSRIPPERSLASHER defined above with kRO Rebalance values)

  // ━━━ Sorcerer (rAthena: src/map/skills/mage/) ━━━
  // SO_PSYCHIC_WAVE: skillratio += -100 + 70 * skill_lv + 3 * INT; RE_LVL_DMOD(100)
  {
    id: 2449, aegisName: "SO_PSYCHIC_WAVE", namePt: "Onda Psíquica", type: "magical", element: "neutral", hitCount: 7,
    damagePercent: [70, 140, 210, 280, 350], baseLvScaling: true,
    statScaling: { int: 3 },
    isMelee: false, canCrit: false, castTime: flat(5000, 5), fixedCast: flat(1000, 5),
    cooldown: flat(5000, 5), spCost: [48, 56, 64, 72, 80], maxLevel: 5, jobs: ["Sorcerer"]
  },
  // SO_DIAMONDDUST: skillratio += -100 + 2*INT + 300*FrostWeapon + INT*skill_lv; RE_LVL_DMOD(100)
  // Depends on Frost Weapon skill level — engine handles via formulaType
  {
    id: 2447, aegisName: "SO_DIAMONDDUST", namePt: "Pó de Diamante", type: "magical", element: "water", hitCount: 2,
    damagePercent: [200, 400, 600, 800, 1000], baseLvScaling: true,
    formulaType: "diamondDust",
    isMelee: false, canCrit: false, castTime: flat(5000, 5), fixedCast: flat(1000, 5),
    cooldown: flat(5000, 5), spCost: [48, 56, 64, 72, 80], maxLevel: 5, jobs: ["Sorcerer"]
  },
  // SO_VARETYR_SPEAR: skillratio += -100 + (2*INT + 150*(Striking+LightLoad) + INT*lv/2)/3; RE_LVL_DMOD(100)
  // Depends on Striking/Lightning Loader levels — engine handles via formulaType
  {
    id: 2454, aegisName: "SO_VARETYR_SPEAR", namePt: "Lanças dos Aesir", type: "magical", element: "wind", hitCount: 3,
    damagePercent: [200, 400, 600, 800, 1000, 1200, 1400, 1600, 1800, 2000], baseLvScaling: true,
    formulaType: "varetyrSpear",
    isMelee: false, canCrit: false, castTime: [2000, 2500, 3000, 3500, 4000, 4500, 5000, 5500, 6000, 6500], fixedCast: flat(500, 10),
    cooldown: flat(2000, 10), spCost: levels(55, 7, 10), maxLevel: 10, jobs: ["Sorcerer"]
  },
  // SO_POISON_BUSTER: skillratio += -100 + 1000 + 300 * skill_lv + INT; RE_LVL_DMOD(100)
  // +200*skill_lv if target has Poison Cloud
  {
    id: 2448, aegisName: "SO_POISON_BUSTER", namePt: "Implosão Tóxica", type: "magical", element: "poison", hitCount: 1,
    damagePercent: [1300, 1600, 1900, 2200, 2500], baseLvScaling: true,
    statScaling: { int: 1 },
    isMelee: false, canCrit: false, castTime: flat(2000, 5), fixedCast: flat(500, 5),
    cooldown: flat(2000, 5), spCost: [50, 60, 70, 80, 90], maxLevel: 5, jobs: ["Sorcerer"]
  },
  // SO_EARTHGRAVE: skillratio += -100 + 2*INT + 300*SeismicWeapon + INT*skill_lv; RE_LVL_DMOD(100)
  // Depends on Seismic Weapon skill level — engine handles via formulaType
  {
    id: 2446, aegisName: "SO_EARTHGRAVE", namePt: "Castigo de Nerthus", type: "magical", element: "earth", hitCount: 1,
    damagePercent: [200, 400, 600, 800, 1000], baseLvScaling: true,
    formulaType: "earthGrave",
    isMelee: false, canCrit: false, castTime: flat(3000, 5), fixedCast: flat(500, 5),
    cooldown: flat(3000, 5), spCost: [50, 60, 70, 80, 90], maxLevel: 5, jobs: ["Sorcerer"]
  },
  // SO_SPELLFIST: kRO Rebalance 185/65 -> 200% base damage. Ends if SP drops to 0.
  {
    id: 2444, aegisName: "SO_SPELLFIST", namePt: "Punho Arcano", type: "magical", element: "weapon", hitCount: 1,
    damagePercent: [200, 200, 200, 200, 200, 200, 200, 200, 200, 200], baseLvScaling: false,
    isMelee: true, canCrit: false, spCost: [40, 40, 40, 40, 40, 40, 40, 40, 40, 40], maxLevel: 10, jobs: ["Sorcerer"] // 20 SP per hit mechanically
  },
  // SO_CLOUD_KILL: kRO Rebalance 185/65 -> (40 * skill_lv)% MATK.
  {
    id: 2443, aegisName: "SO_CLOUD_KILL", namePt: "Nuvem Tóxica", type: "magical", element: "poison", hitCount: 10,
    damagePercent: [40, 80, 120, 160, 200], baseLvScaling: true,
    statScaling: { int: 3 },
    perHitDamage: true,  // ground effect: each of 10 ticks is a separate damage calculation
    isMelee: false, canCrit: false, castTime: flat(2000, 5), fixedCast: flat(500, 5),
    cooldown: flat(2000, 5), spCost: [30, 40, 50, 60, 70], maxLevel: 5, jobs: ["Sorcerer"]
  },

  // ━━━ Arch Bishop (rAthena: src/map/skills/acolyte/) ━━━
  // AB_JUDEX: skillratio = 300 + 70 * skill_lv; RE_LVL_DMOD(100)
  {
    id: 2038, aegisName: "AB_JUDEX", namePt: "Judex", type: "magical", element: "holy", hitCount: 3,
    damagePercent: [370, 440, 510, 580, 650, 720, 790, 860, 930, 1000], baseLvScaling: true,
    isMelee: false, canCrit: false, fixedCast: flat(500, 10), cooldown: flat(500, 10),
    spCost: levels(20, 3, 10), maxLevel: 10, jobs: ["Arch_Bishop"]
  },
  // AB_ADORAMUS: rAthena master (kRO Rebalance) -> skillratio = 300 + 250 * skill_lv. RE_LVL_DMOD(100).
  // Confirmed on LATAM/bRO via RagnaPlace & Divine Pride: 550-2800%.
  {
    id: 2040, aegisName: "AB_ADORAMUS", namePt: "Adoramus", type: "magical", element: "holy", hitCount: 10,
    damagePercent: [550, 800, 1050, 1300, 1550, 1800, 2050, 2300, 2550, 2800], baseLvScaling: true,
    isMelee: false, canCrit: false, castTime: levels(1000, 200, 10), fixedCast: flat(1000, 10),
    cooldown: flat(2500, 10), spCost: levels(20, 8, 10), maxLevel: 10, jobs: ["Arch_Bishop"]
  },
  // AB_DUPLELIGHT_PHYS: base_skillratio += 50 + 15 * skill_lv. No RE_LVL_DMOD.
  {
    id: 2045, aegisName: "AB_DUPLELIGHT_PHYS", namePt: "Gemini Lumen (Físico)", type: "physical", element: "holy", hitCount: 1,
    damagePercent: [165, 180, 195, 210, 225, 240, 255, 270, 285, 300], baseLvScaling: false,
    isMelee: false, canCrit: false, maxLevel: 10, jobs: ["Arch_Bishop"]
  },
  // AB_DUPLELIGHT_MAGIC: base_skillratio += 300 + 40 * skill_lv. No RE_LVL_DMOD.
  {
    id: 2046, aegisName: "AB_DUPLELIGHT_MAGIC", namePt: "Gemini Lumen (Mágico)", type: "magical", element: "holy", hitCount: 1,
    damagePercent: [440, 480, 520, 560, 600, 640, 680, 720, 760, 800], baseLvScaling: false,
    isMelee: false, canCrit: false, maxLevel: 10, jobs: ["Arch_Bishop"]
  },
  // AL_HOLYLIGHT: skillratio += 25 (base 100 + 25 = 125, no BaseLv)
  {
    id: 156, aegisName: "AL_HOLYLIGHT", namePt: "Luz Divina", type: "magical", element: "holy", hitCount: 1,
    damagePercent: [125], baseLvScaling: false,
    isMelee: false, canCrit: false, spCost: [15], maxLevel: 1, jobs: ["Acolyte", "Priest"]
  },
  // PR_MAGNUS: skillratio += 30 (base 100 + 30 = 130 per hit); no BaseLv scaling
  // Hits multiple times over duration (Amount: 14 in skill_db.yml), each hit = 130%
  {
    id: 79, aegisName: "PR_MAGNUS", namePt: "Magnus Exorcismus", type: "magical", element: "holy", hitCount: 1,
    damagePercent: flat(130, 10), baseLvScaling: false,
    isMelee: false, canCrit: false, castTime: flat(8000, 10), fixedCast: flat(2000, 10),
    cooldown: flat(6000, 10), spCost: [40, 42, 44, 46, 48, 50, 52, 54, 56, 60], maxLevel: 10, jobs: ["Priest", "Arch_Bishop"]
  },

  // ━━━ Sura / Champion / Monk (rAthena: src/map/skills/acolyte/) ━━━
  // MO_EXTREMITYFIST (Asura Strike): Special formula
  // ATK * (8 + SP/10) + 250 + (150*skill_lv)
  {
    id: 271, aegisName: "MO_EXTREMITYFIST", namePt: "Punho Supremo de Asura", type: "physical", element: "neutral", hitCount: 1,
    damagePercent: flat(100, 5), baseLvScaling: false, formulaType: "asuraStrike",
    isMelee: true, canCrit: false, fixedCast: [1000, 1500, 2000, 2500, 3000],
    cooldown: flat(10000, 5), spCost: flat(1, 5), maxLevel: 5, jobs: ["Monk", "Champion", "Sura"]
  },
  // MO_INVESTIGATE (Renewal): base_skillratio = 100 * skill_lv
  {
    id: 261, aegisName: "MO_INVESTIGATE", namePt: "Palma de Fúria", type: "physical", element: "neutral", hitCount: 1,
    damagePercent: [100, 200, 300, 400, 500], baseLvScaling: false,
    isMelee: false, canCrit: false, castTime: [1000, 1000, 1000, 1000, 1000],
    spCost: [10, 14, 18, 22, 26], maxLevel: 5, jobs: ["Monk", "Champion", "Sura"]
  },
  // MO_FINGEROFFENSIVE
  {
    id: 263, aegisName: "MO_FINGEROFFENSIVE", namePt: "Disparo de Esferas Espirituais", type: "physical", element: "neutral",
    hitCount: [1, 2, 3, 4, 5], damagePercent: [800, 1000, 1200, 1400, 1600], baseLvScaling: false,
    perHitDamage: true,  // each sphere: base_skillratio = 600 + 200*lv
    isMelee: false, canCrit: false, castTime: [1000, 1500, 2000, 2500, 3000],
    spCost: [10, 10, 10, 10, 10], maxLevel: 5, jobs: ["Monk", "Champion", "Sura"]
  },
  // ---------------------------------------------------------
  // SR_DRAGONCOMBO: skillratio += 100 + 80 * skill_lv; RE_LVL_DMOD(100). Final = 200 + 80*lv
  {
    id: 2326, aegisName: "SR_DRAGONCOMBO", namePt: "Punho do Dragão", type: "physical", element: "weapon", hitCount: 2,
    damagePercent: [280, 360, 440, 520, 600, 680, 760, 840, 920, 1000], baseLvScaling: true,
    isMelee: true, canCrit: false, spCost: levels(5, 2, 10), maxLevel: 10, jobs: ["Sura"]
  },
  // SR_FALLENEMPIRE: kRO Rebalance 185/65 -> (100 + 300 * skill_lv)% ATK. Bonus based on weight/size removed. Note: we remove baseLvDivisor=150 since standard baseLv / 100 is usually the unified approach, but text didn't explicitly mention it changing, let's keep base as is unless specified, wait Text says: Removes bonus damage from target's carrying weight. No longer immobilize.
  {
    id: 2329, aegisName: "SR_FALLENEMPIRE", namePt: "Ruína", type: "physical", element: "weapon", hitCount: 2,
    damagePercent: [400, 700, 1000, 1300, 1600, 1900, 2200, 2500, 2800, 3100], baseLvScaling: true, baseLvDivisor: 150,
    isMelee: true, canCrit: false, spCost: levels(20, 5, 10), maxLevel: 10, jobs: ["Sura"]
  },
  // SR_EARTHSHAKER: non-hidden: skillratio = 400 * skill_lv; RE_LVL_DMOD(100); + STR*2 (post-baseLv)
  {
    id: 2328, aegisName: "SR_EARTHSHAKER", namePt: "Tremor de Terra", type: "physical", element: "weapon", hitCount: 1,
    damagePercent: [400, 800, 1200, 1600, 2000], baseLvScaling: true,
    statScaling: { str: 2 },
    isMelee: true, canCrit: false, spCost: levels(30, 2, 5), maxLevel: 5, jobs: ["Sura"]
  },
  // SR_LIGHTNINGWALK (Lightning Ride?): kRO Rebalance -> changes to 90 * skilllv if Knuckle. Default 40 * skilllv.
  {
    id: 2335, aegisName: "SR_RIDEINLIGHTNING", namePt: "Investida de Shura", type: "physical", element: "wind", hitCount: 5, // We default to 5 hits (1 per sphere max)
    damagePercent: [90, 180, 270, 360, 450], baseLvScaling: true, // Assuming max knuckle dmg.
    isMelee: false, canCrit: false, spCost: levels(30, 5, 5), maxLevel: 5, jobs: ["Sura"]
  },
  // SR_TIGERCANNON: special formula in tigercannon.cpp
  // hp = MaxHP * (10 + skill_lv*2)%; sp = MaxSP * (5 + skill_lv)%
  // Combo: (hp+sp)/2; Normal: (hp+sp)/4; then RE_LVL_DMOD(100)
  // Plus flat bonus from battle.cpp: skill_lv*240 + targetLv*40 (or skill_lv*500 + targetLv*40 with combo)
  {
    id: 2330, aegisName: "SR_TIGERCANNON", namePt: "Garra de Tigre", type: "physical", element: "neutral", hitCount: 1,
    damagePercent: flat(100, 10), baseLvScaling: false, formulaType: "tigerCannon",
    isMelee: true, canCrit: false, fixedCast: flat(500, 10), cooldown: flat(1000, 10),
    spCost: levels(40, 10, 10), maxLevel: 10, jobs: ["Sura"]
  },
  // SR_KNUCKLEARROW: kRO Rebalance -> Deal more damage against Boss. (500 + 200 * skill_lv )% ATK total. Base Lv Scaling.
  {
    id: 2336, aegisName: "SR_KNUCKLEARROW", namePt: "Pancada Corporal", type: "physical", element: "weapon", hitCount: 1,
    damagePercent: [700, 900, 1100, 1300, 1500, 1700, 1900, 2100, 2300, 2500], baseLvScaling: true,
    isMelee: false, canCrit: false, cooldown: flat(1000, 10), spCost: levels(10, 5, 10), maxLevel: 10, jobs: ["Sura"]
  },
  // SR_HOWLINGOFLION: kRO Rebalance 185/65 -> (500 * skill_lv)% ATK. Base Lv/100. Long ranged physical.
  {
    id: 2331, aegisName: "SR_HOWLINGOFLION", namePt: "Rugido do Leão", type: "physical", element: "weapon", hitCount: 1,
    damagePercent: [500, 1000, 1500, 2000, 2500], baseLvScaling: true, baseLvDivisor: 100,
    isMelee: false, canCrit: false, castTime: flat(1000, 5), fixedCast: flat(500, 5),
    cooldown: flat(3000, 5), spCost: flat(70, 5), maxLevel: 5, jobs: ["Sura"]
  },
  // SR_RAMPAGEBLASTER: kRO Rebalance -> (FuryLevel * 200) + (350 * Skill Lv) % ATK. (With Earth Shaker effect it adds more, assuming base).
  {
    id: 2332, aegisName: "SR_RAMPAGEBLASTER", namePt: "Explosão Espiritual", type: "physical", element: "weapon", hitCount: 1,
    damagePercent: [1350, 1700, 2050, 2400, 2750], baseLvScaling: true, baseLvDivisor: 150, // normal: 1000 + 350*lv, RE_LVL_DMOD(150)
    isMelee: false, canCrit: false, castTime: flat(1000, 5), fixedCast: flat(500, 5),
    cooldown: flat(5000, 5), spCost: [100, 100, 100, 100, 100], maxLevel: 5, jobs: ["Sura"] // SP consumption reduced from 150 to 100
  },
  // SR_SKYNETBLOW: kRO Rebalance 185/65 -> (200 * skill_lv)% ATK.
  {
    id: 2327, aegisName: "SR_SKYNETBLOW", namePt: "Soco Furacão", type: "physical", element: "weapon", hitCount: 3,
    damagePercent: [200, 400, 600, 800, 1000], baseLvScaling: true,
    isMelee: true, canCrit: false, cooldown: flat(500, 5), spCost: [10, 14, 18, 22, 26], maxLevel: 5, jobs: ["Sura"]
  },
  // SR_GATEOFHELL: Without combo: skillratio += -100 + 500 * skill_lv; RE_LVL_DMOD(100)
  // With Fallen Empire combo: skillratio += -100 + 800 * skill_lv
  // Plus flat bonus from battle.cpp: (MaxHP-CurHP) + CurSP*(1+Lv*2/10) + BaseLv*10
  {
    id: 2343, aegisName: "SR_GATEOFHELL", namePt: "Portões do Inferno", type: "physical", element: "neutral", hitCount: 7,
    damagePercent: [500, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000], baseLvScaling: true,
    formulaType: "gatesOfHell",
    isMelee: true, canCrit: false, castTime: flat(1000, 10), fixedCast: flat(1000, 10),
    cooldown: flat(5000, 10), spCost: flat(200, 10), maxLevel: 10, jobs: ["Sura"]
  },

  // ━━━ Mechanic (rAthena: src/map/skills/merchant/) ━━━
  // NC_ARMSCANNON: skillratio = 400 + 350 * skill_lv; RE_LVL_DMOD(100)
  {
    id: 2261, aegisName: "NC_ARMSCANNON", namePt: "Canhão", type: "physical", element: "neutral", hitCount: 1,
    damagePercent: [750, 1100, 1450, 1800, 2150], baseLvScaling: true, baseLvDivisor: 100,
    isMelee: false, canCrit: false, castTime: [1000, 1500, 2000, 2500, 3000], fixedCast: flat(500, 5),
    cooldown: flat(2000, 5), spCost: [30, 35, 40, 45, 50], maxLevel: 5, jobs: ["Mechanic"]
  },
  // NC_AXETORNADO: kRO Rebalance 185/65 -> (200 + 180 * skill_lv)% ATK. Base Lv / 100.
  {
    id: 2280, aegisName: "NC_AXETORNADO", namePt: "Fúria do Furacão", type: "physical", element: "weapon", hitCount: 6,
    damagePercent: [380, 560, 740, 920, 1100], baseLvScaling: true, baseLvDivisor: 100,
    isMelee: true, canCrit: false, fixedCast: flat(500, 5), cooldown: flat(2000, 5),
    spCost: [18, 20, 22, 24, 26], maxLevel: 5, jobs: ["Mechanic"]
  },
  // NC_POWERSWING: skillratio = 300 + 100 * skill_lv + (STR+DEX)/2; RE_LVL_DMOD(100)
  {
    id: 2275, aegisName: "NC_POWERSWING", namePt: "Choque de Carrinho", type: "physical", element: "weapon", hitCount: 1,
    damagePercent: [400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1300], baseLvScaling: true, baseLvDivisor: 100,
    isMelee: true, canCrit: false, spCost: flat(20, 10), maxLevel: 10, jobs: ["Mechanic"]
  },
  // NC_BOOSTKNUCKLE: skillratio = 260 * skill_lv + DEX; RE_LVL_DMOD(100)
  {
    id: 2259, aegisName: "NC_KNUCKLEBOOST", namePt: "Punho Foguete", type: "physical", element: "neutral", hitCount: 1,
    damagePercent: [260, 520, 780, 1040, 1300], baseLvScaling: true, baseLvDivisor: 100,
    statScaling: { dex: 1 },
    isMelee: false, canCrit: false, spCost: [15, 18, 21, 24, 27], maxLevel: 5, jobs: ["Mechanic"]
  },
  // NC_VULCANARM: skillratio = 230 * skill_lv + DEX; RE_LVL_DMOD(100)
  {
    id: 2260, aegisName: "NC_VULCANARM", namePt: "Metralhadora", type: "physical", element: "neutral", hitCount: 1,
    damagePercent: [230, 460, 690], baseLvScaling: true, baseLvDivisor: 100,
    statScaling: { dex: 1 },
    isMelee: false, canCrit: false, cooldown: flat(100, 3), spCost: [6, 11, 15], maxLevel: 3, jobs: ["Mechanic"]
  },
  // NC_AXEBOOMERANG: skillratio += 150 + 50 * skill_lv + WeaponWeight/10; RE_LVL_DMOD(100)
  {
    id: 2278, aegisName: "NC_AXEBOOMERANG", namePt: "Arremesso de Machado", type: "physical", element: "weapon", hitCount: 1,
    damagePercent: [300, 350, 400, 450, 500], baseLvScaling: true,
    isMelee: false, canCrit: false, fixedCast: flat(500, 5), cooldown: flat(5000, 5),
    spCost: [20, 22, 24, 26, 28], maxLevel: 5, jobs: ["Mechanic"]
  },
  // MC_MAMMONITE: skillratio += 50 * skill_lv
  {
    id: 42, aegisName: "MC_MAMMONITE", namePt: "Mammonita", type: "physical", element: "weapon", hitCount: 1,
    damagePercent: [150, 200, 250, 300, 350, 400, 450, 500, 550, 600], baseLvScaling: false,
    isMelee: true, canCrit: false, spCost: flat(5, 10), maxLevel: 10, jobs: ["Merchant", "Blacksmith", "Whitesmith", "Alchemist", "Creator", "Mechanic", "Genetic"]
  },
  // MC_CARTREVOLUTION: skillratio += 50 (150% base). Damage increases by up to 100% based on cart weight.
  // We'll assume a full cart for max potential (250% total).
  {
    id: 154, aegisName: "MC_CARTREVOLUTION", namePt: "Cavalo de Pau", type: "physical", element: "neutral", hitCount: 1,
    damagePercent: [250], baseLvScaling: false,
    isMelee: true, canCrit: false, spCost: [12], maxLevel: 1, jobs: ["Merchant", "Blacksmith", "Whitesmith", "Alchemist", "Creator", "Mechanic", "Genetic"]
  },
  // WS_CARTTERMINATION: High Speed Cart Ram
  {
    id: 386, aegisName: "WS_CARTTERMINATION", namePt: "Choque de Carrinho", type: "physical", element: "weapon", hitCount: 1,
    damagePercent: [200, 400, 600, 800, 1000, 1200, 1400, 1600, 1800, 2000], baseLvScaling: false,
    isMelee: true, canCrit: false, spCost: flat(15, 10), maxLevel: 10, jobs: ["Whitesmith", "Mechanic"]
  },
  // AM_ACIDTERROR
  {
    id: 228, aegisName: "AM_ACIDTERROR", namePt: "Terror Ácido", type: "physical", element: "neutral", hitCount: 1,
    damagePercent: [200, 400, 600, 800, 1000], baseLvScaling: false,
    isMelee: false, canCrit: false, spCost: flat(15, 5), maxLevel: 5, jobs: ["Alchemist", "Creator", "Genetic"]
  },
  // AM_DEMONSTRATION
  {
    id: 226, aegisName: "AM_DEMONSTRATION", namePt: "Fogo Grego", type: "physical", element: "fire", hitCount: 1,
    damagePercent: [120, 140, 160, 180, 200], baseLvScaling: false,
    isMelee: false, canCrit: false, spCost: flat(10, 5), maxLevel: 5, jobs: ["Alchemist", "Creator", "Genetic"]
  },
  // NC_BOOSTKNUCKLE: skillratio += -100 + 260 * skill_lv + DEX; RE_LVL_DMOD(100)
  {
    id: 2256, aegisName: "NC_BOOSTKNUCKLE", namePt: "Punho Foguete", type: "physical", element: "weapon", hitCount: 1,
    damagePercent: [260, 520, 780, 1040, 1300], baseLvScaling: true,
    statScaling: { dex: 1 },
    isMelee: false, canCrit: false, cooldown: flat(1000, 5),
    spCost: [10, 15, 20, 25, 30], maxLevel: 5, jobs: ["Mechanic"]
  },
  // (NC_VULCANARM and NC_POWERSWING defined above with kRO Rebalance values)

  // ━━━ Genetic (rAthena: src/map/skills/merchant/) ━━━
  // GN_CARTCANNON: skillratio += -100 + (250 + 20*CartRemodel) * skill_lv + 2*INT/(6-CartRemodel); RE_LVL_DMOD(100)
  // Complex formula depends on Cart Remodeling skill level — engine handles via formulaType
  {
    id: 2477, aegisName: "GN_CARTCANNON", namePt: "Canhão de Prótons", type: "physical", element: "neutral", hitCount: 1,
    damagePercent: [350, 700, 1050, 1400, 1750], baseLvScaling: true,
    formulaType: "cartCannon",
    isMelee: false, canCrit: false, castTime: flat(500, 5), fixedCast: flat(500, 5),
    cooldown: flat(500, 5), spCost: [40, 42, 44, 46, 48], maxLevel: 5, jobs: ["Genetic"]
  },
  // GN_CART_TORNADO: skillratio += -100 + 200 * skill_lv + cart_weight_bonus + CartRemodel*50; NO BaseLv
  {
    id: 2476, aegisName: "GN_CART_TORNADO", namePt: "Tornado de Carrinho", type: "physical", element: "weapon", hitCount: 3,
    damagePercent: [200, 400, 600, 800, 1000, 1200, 1400, 1600, 1800, 2000], baseLvScaling: false,
    isMelee: true, canCrit: false, cooldown: flat(500, 10), spCost: levels(15, 3, 10), maxLevel: 10, jobs: ["Genetic"]
  },
  // CR_ACIDDEMONSTRATION (Renewal): skillratio += -100 + 200 * skill_lv + INT + targetVIT
  // Halved vs players. Uses caster INT + target VIT. NO BaseLv scaling.
  {
    id: 490, aegisName: "CR_ACIDDEMONSTRATION", namePt: "Bomba Ácida", type: "physical", element: "weapon", hitCount: 1,
    damagePercent: [200, 400, 600, 800, 1000, 1200, 1400, 1600, 1800, 2000], baseLvScaling: false,
    formulaType: "acidBomb",
    isMelee: false, canCrit: false, castTime: flat(1000, 10), fixedCast: flat(500, 10),
    cooldown: flat(1000, 10), spCost: levels(30, 5, 10), maxLevel: 10, jobs: ["Genetic", "Creator"]
  },
  // GN_SPORE_EXPLOSION: skillratio += -100 + 400 + 200 * skill_lv; RE_LVL_DMOD(100)
  {
    id: 2481, aegisName: "GN_SPORE_EXPLOSION", namePt: "Esporo Explosivo", type: "physical", element: "neutral", hitCount: 1,
    damagePercent: [600, 800, 1000, 1200, 1400, 1600, 1800, 2000, 2200, 2400], baseLvScaling: true,
    isMelee: false, canCrit: false, castTime: flat(1000, 10), fixedCast: flat(500, 10),
    cooldown: flat(2000, 10), spCost: levels(55, 5, 10), maxLevel: 10, jobs: ["Genetic"]
  },

  // ━━━ Minstrel / Wanderer (rAthena: src/map/skills/archer/) ━━━
  // WM_METALICSOUND: skillratio = 120 * skill_lv + 60 * WM_LESSON_lv; RE_LVL_DMOD(100). +50% vs Sound Blend.
  {
    id: 2413, aegisName: "WM_METALICSOUND", namePt: "Ruído Estridente", type: "magical", element: "neutral", hitCount: 2,
    damagePercent: [120, 240, 360, 480, 600], baseLvScaling: true,
    isMelee: false, canCrit: false, castTime: flat(2000, 5), fixedCast: flat(1000, 5),
    cooldown: flat(2000, 5), spCost: [64, 68, 72, 76, 80], maxLevel: 5, jobs: ["Minstrel", "Wanderer"]
  },
  // WM_REVERBERATION: skillratio = 700 + 300 * skill_lv; RE_LVL_DMOD(100). +50% vs Sound Blend.
  {
    id: 2414, aegisName: "WM_REVERBERATION", namePt: "Ressonância", type: "magical", element: "neutral", hitCount: 1,
    damagePercent: [1000, 1300, 1600, 1900, 2200], baseLvScaling: true,
    isMelee: false, canCrit: false, fixedCast: flat(500, 5), cooldown: flat(2000, 5),
    spCost: [28, 32, 36, 40, 44], maxLevel: 5, jobs: ["Minstrel", "Wanderer"]
  },
  // WA_GREAT_ECHO: skillratio = 250 + 500 * skill_lv + WM_LESSON*50; RE_LVL_DMOD(100). x2 if partner performer.
  {
    id: 2419, aegisName: "WA_GREAT_ECHO", namePt: "Ressonância Metálica", type: "physical", element: "neutral", hitCount: 1,
    damagePercent: [750, 1250, 1750, 2250, 2750], baseLvScaling: true,
    isMelee: false, canCrit: false,
    castTime: flat(2000, 5), fixedCast: flat(500, 5), cooldown: flat(10000, 5),
    spCost: [80, 90, 100, 110, 120], maxLevel: 5, jobs: ["Minstrel", "Wanderer"]
  },
  // WM_SEVERE_RAINSTORM: kRO Rebalance 185/65 -> (120 * skill_lv)% ATK when equipping musical instrument/whip. Deals 12 hits.
  {
    id: 2418, aegisName: "WM_SEVERE_RAINSTORM", namePt: "Temporal de Flechas", type: "physical", element: "weapon", hitCount: 12,
    damagePercent: [120, 240, 360, 480, 600], baseLvScaling: true,
    perHitDamage: true,  // ground effect: each of 12 ticks is a separate damage calculation
    isMelee: false, canCrit: false, castTime: [2000, 2500, 3000, 3500, 4000], fixedCast: flat(500, 5),
    cooldown: flat(5000, 5), spCost: [90, 95, 100, 105, 110], maxLevel: 5, jobs: ["Minstrel", "Wanderer"]
  },

  // ━━━ Rebellion (rAthena: src/map/skills/gunslinger/) ━━━
  // RL_FIREDANCE: skillratio += 100 + 100 * skill_lv + Desperado*20; RE_LVL_DMOD(100)
  {
    id: 2561, aegisName: "RL_FIREDANCE", namePt: "Descarregar Tambor", type: "physical", element: "weapon", hitCount: 1,
    damagePercent: [300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200], baseLvScaling: true,
    isMelee: false, canCrit: false, spCost: [10, 12, 14, 16, 18, 20, 22, 24, 26, 30], maxLevel: 10, jobs: ["Rebellion"]
  },
  // RL_R_TRIP: skillratio += -100 + 350 * skill_lv; RE_LVL_DMOD(100)
  {
    id: 2565, aegisName: "RL_R_TRIP", namePt: "Expurgar", type: "physical", element: "weapon", hitCount: 1,
    damagePercent: [350, 700, 1050, 1400, 1750, 2100, 2450, 2800, 3150, 3500], baseLvScaling: true,
    isMelee: false, canCrit: false, cooldown: flat(2000, 10), spCost: [30, 32, 34, 36, 38, 40, 42, 44, 46, 50], maxLevel: 10, jobs: ["Rebellion"]
  },
  // RL_FIRE_RAIN: skillratio += -100 + 3500 + 300 * skill_lv; NO BaseLv
  // waves = skill_lv + 5 (6-10 waves, each 80ms apart)
  {
    id: 2567, aegisName: "RL_FIRE_RAIN", namePt: "Disparo Labareda", type: "physical", element: "weapon", hitCount: [6, 7, 8, 9, 10],
    damagePercent: [3800, 4100, 4400, 4700, 5000], baseLvScaling: false,
    isMelee: false, canCrit: false, castTime: flat(1000, 5), fixedCast: flat(500, 5),
    cooldown: flat(5000, 5), spCost: [80, 85, 90, 95, 100], maxLevel: 5, jobs: ["Rebellion"]
  },

  // ━━━ Kagerou / Oboro (rAthena: src/map/skills/ninja/) ━━━
  // KO_JYUMONJIKIRI: skillratio += -100 + 200 * skill_lv; RE_LVL_DMOD(120)  ← divisor 120!
  // +skill_lv*BaseLv if target has Jyumonji debuff
  {
    id: 3004, aegisName: "KO_JYUMONJIKIRI", namePt: "Impacto Cruzado", type: "physical", element: "weapon", hitCount: 2,
    damagePercent: [200, 400, 600, 800, 1000, 1200, 1400, 1600, 1800, 2000], baseLvScaling: true, baseLvDivisor: 120,
    isMelee: true, canCrit: false, fixedCast: flat(500, 10), cooldown: flat(3000, 10),
    spCost: [10, 15, 20, 25, 30, 35, 40, 45, 50, 55], maxLevel: 10, jobs: ["KagerouOboro", "Kagerou", "Oboro"]
  },

  // ━━━ Doram (Summoner / Spirit Handler) (rAthena: src/map/skills/summoner/) ━━━
  // SU_PICKYPECK: skillratio += 100 + 100 * skill_lv; NO BaseLv; doubles if target HP < 50%
  {
    id: 5033, aegisName: "SU_PICKYPECK", namePt: "Chilique de Picky", type: "physical", element: "neutral",
    hitCount: 5, damagePercent: [300, 400, 500, 600, 700], baseLvScaling: false,
    isMelee: false, canCrit: false, fixedCast: flat(500, 5), cooldown: flat(1000, 5),
    spCost: [10, 12, 14, 16, 18], maxLevel: 5, jobs: ["Summoner", "Spirit_Handler"]
  },
  // SU_LUNATICCARROTBEAT: skillratio += 100 + 100 * skill_lv; + STR if BaseLv>99; RE_LVL_DMOD(100)
  {
    id: 5036, aegisName: "SU_LUNATICCARROTBEAT", namePt: "Cometas Lunáticos", type: "physical", element: "neutral",
    hitCount: 3, damagePercent: [300, 400, 500, 600, 700], baseLvScaling: true,
    statScaling: { str: 1 },
    isMelee: false, canCrit: false, castTime: flat(1000, 5), fixedCast: flat(500, 5),
    cooldown: flat(1000, 5), spCost: [30, 35, 40, 45, 50], maxLevel: 5, jobs: ["Summoner", "Spirit_Handler"]
  },

  // ━━━ Star Emperor (rAthena: src/map/skills/taekwon/) ━━━
  // SJ_SOLARBURST: skillratio += -100 + 900 + 220 * skill_lv; RE_LVL_DMOD(100)
  {
    id: 2592, aegisName: "SJ_SOLARBURST", namePt: "Explosão Solar", type: "physical", element: "fire", hitCount: 3,
    damagePercent: [1220, 1440, 1660, 1880, 2100, 2320, 2540, 2760, 2980, 3200], baseLvScaling: true,
    isMelee: false, canCrit: false, castTime: flat(1000, 10), fixedCast: flat(500, 10),
    cooldown: flat(3000, 10), spCost: [30, 32, 34, 36, 38, 40, 42, 44, 46, 50], maxLevel: 10,
    jobs: ["Star_Gladiator", "Star_Emperor"]
  },
  // SJ_FULLMOONKICK: skillratio += -100 + 1000 + 100 * skill_lv; RE_LVL_DMOD(100)
  {
    id: 2576, aegisName: "SJ_FULLMOONKICK", namePt: "Chute Lunar", type: "physical", element: "neutral", hitCount: 1,
    damagePercent: [1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900, 2000, 2100], baseLvScaling: true,
    isMelee: true, canCrit: false, fixedCast: flat(500, 10), cooldown: flat(2000, 10),
    spCost: [50, 52, 54, 56, 58, 60, 62, 64, 66, 70], maxLevel: 10, jobs: ["Star_Gladiator", "Star_Emperor"]
  },

  // ━━━ Soul Reaper (rAthena: src/map/skills/taekwon/) ━━━
  // SP_SPA (Espa): skillratio += -100 + 400 + 250 * skill_lv; RE_LVL_DMOD(100)
  {
    id: 2602, aegisName: "SP_SPA", namePt: "Espa", type: "magical", element: "neutral",
    hitCount: 1, damagePercent: [750, 1000, 1250, 1500, 1750, 2000, 2250, 2500, 2750, 3000], baseLvScaling: true,
    isMelee: false, canCrit: false, castTime: flat(1000, 10), fixedCast: flat(500, 10),
    cooldown: flat(1000, 10), spCost: [60, 65, 70, 75, 80, 85, 90, 95, 100, 100], maxLevel: 10, jobs: ["Soul_Linker", "Soul_Reaper"]
  },
];

// ─── Lookup helpers ─────────────────────────────────────────────────

const _byAegis = new Map<string, SkillFormula>();
const _byJob = new Map<string, SkillFormula[]>();

function buildIndices() {
  if (_byAegis.size > 0) return;
  for (const sk of SKILL_FORMULAS) {
    _byAegis.set(sk.aegisName, sk);
    for (const job of sk.jobs) {
      const arr = _byJob.get(job) || [];
      arr.push(sk);
      _byJob.set(job, arr);
    }
  }
}

export function getSkillByAegis(aegisName: string): SkillFormula | undefined {
  buildIndices();
  return _byAegis.get(aegisName);
}

export function getSkillsForJob(jobName: string): SkillFormula[] {
  buildIndices();
  const autoAtk = _byAegis.get("NORMAL_ATTACK");
  const jobSkills = _byJob.get(jobName) || [];
  return autoAtk ? [autoAtk, ...jobSkills] : jobSkills;
}

export function getSkillsForJobs(jobNames: string[]): SkillFormula[] {
  buildIndices();
  const seen = new Set<string>();
  const result: SkillFormula[] = [];
  const autoAtk = _byAegis.get("NORMAL_ATTACK");
  if (autoAtk) {
    result.push(autoAtk);
    seen.add(autoAtk.aegisName);
  }
  for (const job of jobNames) {
    for (const sk of _byJob.get(job) || []) {
      if (!seen.has(sk.aegisName)) {
        seen.add(sk.aegisName);
        result.push(sk);
      }
    }
  }
  return result;
}

export function getHitCount(skill: SkillFormula, level: number): number {
  if (typeof skill.hitCount === "number") return skill.hitCount;
  return skill.hitCount[Math.min(level - 1, skill.hitCount.length - 1)] || 1;
}

export function getDamagePercent(skill: SkillFormula, level: number): number {
  return skill.damagePercent[Math.min(level - 1, skill.damagePercent.length - 1)] || 100;
}
