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
    | "diamondDust" | "earthGrave" | "varetyrSpear" | "cartCannon" | "feintBomb";
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
  { id: 5, aegisName: "SM_BASH", namePt: "Golpe Fulminante", type: "physical", element: "weapon", hitCount: 1,
    damagePercent: [130, 160, 190, 220, 250, 280, 310, 340, 370, 400], baseLvScaling: false,
    isMelee: true, canCrit: false, spCost: [8,8,8,8,8,15,15,15,15,15], maxLevel: 10,
    jobs: ["Swordman", "Knight", "Crusader"] },
  // SM_MAGNUM: skillratio += 20 * skill_lv (inner AoE, fire element forced)
  { id: 7, aegisName: "SM_MAGNUM", namePt: "Impacto Explosivo", type: "physical", element: "fire", hitCount: 1,
    damagePercent: [120, 140, 160, 180, 200, 220, 240, 260, 280, 300], baseLvScaling: false,
    isMelee: true, canCrit: false, afterCastDelay: flat(500,10), spCost: flat(30,10), maxLevel: 10,
    jobs: ["Swordman", "Knight", "Crusader"] },
  // KN_BOWLINGBASH: skillratio += 40 * skill_lv
  { id: 62, aegisName: "KN_BOWLINGBASH", namePt: "Impacto de Tyr", type: "physical", element: "weapon", hitCount: 2,
    damagePercent: [140, 180, 220, 260, 300, 340, 380, 420, 460, 500], baseLvScaling: false,
    isMelee: true, canCrit: false, spCost: [13,14,15,16,17,18,19,20,21,22], maxLevel: 10,
    jobs: ["Knight"] },

  // ━━━ Rune Knight (rAthena: src/map/skills/swordman/) ━━━
  // RK_SONICWAVE: skillratio += -100 + 1050 + 150 * skill_lv; RE_LVL_DMOD(100)
  { id: 2002, aegisName: "RK_SONICWAVE", namePt: "Onda de Choque", type: "physical", element: "weapon", hitCount: 3,
    damagePercent: [1200,1350,1500,1650,1800,1950,2100,2250,2400,2550], baseLvScaling: true,
    isMelee: false, canCrit: true, halfCritBonus: true, castTime: flat(500,10), fixedCast: flat(500,10), cooldown: flat(2000,10),
    spCost: [50,52,54,56,58,60,62,64,66,70], maxLevel: 10, jobs: ["Rune_Knight"] },
  // RK_IGNITIONBREAK: skillratio += -100 + 450 * skill_lv; RE_LVL_DMOD(100)
  { id: 2006, aegisName: "RK_IGNITIONBREAK", namePt: "Impacto Flamejante", type: "physical", element: "weapon", hitCount: 1,
    damagePercent: [450, 900, 1350, 1800, 2250], baseLvScaling: true,
    isMelee: false, canCrit: true, halfCritBonus: true, fixedCast: flat(1000,5), cooldown: flat(2000,5),
    spCost: [35,40,45,50,55], maxLevel: 5, jobs: ["Rune_Knight"] },
  // RK_HUNDREDSPEAR: skillratio += -100 + 600 + 200 * skill_lv; + SpiralPierce*50; RE_LVL_DMOD(100)
  { id: 2004, aegisName: "RK_HUNDREDSPEAR", namePt: "Lança das Mil Pontas", type: "physical", element: "weapon", hitCount: 5,
    damagePercent: levels(600, 200, 10), baseLvScaling: true,
    isMelee: false, canCrit: false, fixedCast: flat(1000,10), cooldown: flat(2000,10),
    spCost: levels(55,5,10), maxLevel: 10, jobs: ["Rune_Knight"] },
  // RK_WINDCUTTER: skillratio += -100 + 300 * skill_lv (default weapon type); RE_LVL_DMOD(100)
  { id: 2005, aegisName: "RK_WINDCUTTER", namePt: "Vento Cortante", type: "physical", element: "wind", hitCount: 1,
    damagePercent: [300,600,900,1200,1500], baseLvScaling: true,
    isMelee: true, canCrit: false, cooldown: flat(2000,5), spCost: [20,24,28,32,36], maxLevel: 5,
    jobs: ["Rune_Knight"] },
  // RK_DRAGONBREATH: special formula in battle.cpp — (currentHP/50 + maxSP/4) × skillLv × BaseLv/150
  { id: 2008, aegisName: "RK_DRAGONBREATH", namePt: "Sopro do Dragão", type: "physical", element: "fire", hitCount: 1,
    damagePercent: flat(100, 10), baseLvScaling: false, formulaType: "dragonBreath",
    isMelee: false, canCrit: false, fixedCast: flat(1000,10), cooldown: flat(2000,10),
    spCost: levels(25,5,10), maxLevel: 10, jobs: ["Rune_Knight"] },
  // RK_DRAGONBREATH_WATER: same formula as fire variant, water element
  { id: 5004, aegisName: "RK_DRAGONBREATH_WATER", namePt: "Bafo do Dragão", type: "physical", element: "water", hitCount: 1,
    damagePercent: flat(100, 10), baseLvScaling: false, formulaType: "dragonBreath",
    isMelee: false, canCrit: false, fixedCast: flat(1000,10), cooldown: flat(2000,10),
    spCost: levels(25,5,10), maxLevel: 10, jobs: ["Rune_Knight"] },

  // ━━━ Royal Guard (rAthena: src/map/skills/swordman/) ━━━
  // LG_BANISHINGPOINT: skillratio += -100 + 100 * skill_lv; + Bash_lv*70; +800 if HolyCross; RE_LVL_DMOD(100)
  { id: 2308, aegisName: "LG_BANISHINGPOINT", namePt: "Toque do Oblívio", type: "physical", element: "weapon", hitCount: 1,
    damagePercent: [100,200,300,400,500,600,700,800,900,1000], baseLvScaling: true,
    isMelee: false, canCrit: false, fixedCast: flat(500,10), cooldown: flat(500,10),
    spCost: levels(18,2,10), maxLevel: 10, jobs: ["Royal_Guard"] },
  // LG_CANNONSPEAR: skillratio += -100 + skill_lv * (120 + STR); +400 if Overbrand; RE_LVL_DMOD(100)
  { id: 2307, aegisName: "LG_CANNONSPEAR", namePt: "Disparo Perfurante", type: "physical", element: "weapon", hitCount: 1,
    damagePercent: [120,240,360,480,600], baseLvScaling: true,
    statScaling: { str: 1 }, statScalingPerLevel: true,
    isMelee: false, canCrit: true, halfCritBonus: true, fixedCast: flat(500,5), cooldown: flat(2000,5),
    spCost: [30,36,42,48,54], maxLevel: 5, jobs: ["Royal_Guard"] },
  // LG_OVERBRAND: skillratio += -100 + 500 * skill_lv (2H) or 350 (1H); + SpearQuicken*50; RE_LVL_DMOD(100)
  { id: 2317, aegisName: "LG_OVERBRAND", namePt: "Lança do Destino", type: "physical", element: "weapon", hitCount: 3,
    damagePercent: [500,1000,1500,2000,2500], baseLvScaling: true,
    isMelee: true, canCrit: false, fixedCast: flat(500,5), cooldown: flat(2000,5),
    spCost: [20,30,40,50,60], maxLevel: 5, jobs: ["Royal_Guard"] },
  // LG_SHIELDPRESS: skillratio += -100 + 200 * skill_lv + STR + shield_weight/10; RE_LVL_DMOD(100)
  { id: 2310, aegisName: "LG_SHIELDPRESS", namePt: "Escudo Compressor", type: "physical", element: "weapon", hitCount: 5,
    damagePercent: [200,400,600,800,1000,1200,1400,1600,1800,2000], baseLvScaling: true,
    statScaling: { str: 1 },
    isMelee: true, canCrit: false, spCost: levels(10,2,10), maxLevel: 10, jobs: ["Royal_Guard"] },
  // LG_EARTHDRIVE: skillratio += -100 + 380 * skill_lv + STR + VIT; RE_LVL_DMOD(100)
  { id: 2323, aegisName: "LG_EARTHDRIVE", namePt: "Aegis Inferi", type: "physical", element: "weapon", hitCount: 5,
    damagePercent: [380,760,1140,1520,1900], baseLvScaling: true,
    statScaling: { str: 1, vit: 1 },
    isMelee: true, canCrit: false, fixedCast: flat(1000,5), cooldown: flat(3000,5),
    spCost: [40,50,60,70,80], maxLevel: 5, jobs: ["Royal_Guard"] },
  // LG_MOONSLASHER: skillratio += -100 + 120 * skill_lv + Overbrand_lv*80; RE_LVL_DMOD(100)
  { id: 2320, aegisName: "LG_MOONSLASHER", namePt: "Espiral Lunar", type: "physical", element: "weapon", hitCount: 5,
    damagePercent: [120,240,360,480,600], baseLvScaling: true,
    isMelee: true, canCrit: false, cooldown: flat(2000,5), spCost: [18,22,26,30,34], maxLevel: 5, jobs: ["Royal_Guard"] },
  // LG_RAYOFGENESIS: skillratio += -100 + 350 * skill_lv + INT*3; RE_LVL_DMOD(100)
  { id: 2321, aegisName: "LG_RAYOFGENESIS", namePt: "Luz da Criação", type: "magical", element: "holy", hitCount: 7,
    damagePercent: levels(0, 350, 10), baseLvScaling: true,
    statScaling: { int: 3 },
    isMelee: false, canCrit: false, castTime: flat(3000,10), fixedCast: flat(1000,10), cooldown: flat(5000,10),
    spCost: levels(60,10,10), maxLevel: 10, jobs: ["Royal_Guard"] },

  // ━━━ Archer / Hunter (rAthena: src/map/skills/archer/) ━━━
  // AC_DOUBLE: skillratio += 10 * (skill_lv - 1); 2 hits
  { id: 46, aegisName: "AC_DOUBLE", namePt: "Rajada de Flechas", type: "physical", element: "weapon", hitCount: 2,
    damagePercent: [100,110,120,130,140,150,160,170,180,190], baseLvScaling: false,
    isMelee: false, canCrit: false, spCost: flat(12,10), maxLevel: 10, jobs: ["Archer", "Hunter"] },
  // AC_SHOWER (Renewal): skillratio += 50 + 10 * skill_lv
  { id: 47, aegisName: "AC_SHOWER", namePt: "Chuva de Flechas", type: "physical", element: "weapon", hitCount: 1,
    damagePercent: [160,170,180,190,200,210,220,230,240,250], baseLvScaling: false,
    isMelee: false, canCrit: false, spCost: flat(15,10), maxLevel: 10, jobs: ["Archer", "Hunter"] },
  // SN_SHARPSHOOTING (Renewal): skillratio += -100 + 300 + 300 * skill_lv; RE_LVL_DMOD(100)
  { id: 382, aegisName: "SN_SHARPSHOOTING", namePt: "Tiro Preciso", type: "physical", element: "weapon", hitCount: 1,
    damagePercent: [600,900,1200,1500,1800], baseLvScaling: true,
    isMelee: false, canCrit: true, halfCritBonus: true, castTime: flat(1500,5), fixedCast: flat(500,5),
    spCost: [18,21,24,27,30], maxLevel: 5, jobs: ["Hunter", "Ranger"] },

  // ━━━ Ranger (rAthena: src/map/skills/archer/) ━━━
  // RA_ARROWSTORM: skillratio += -100 + 200 + 180 * skill_lv; RE_LVL_DMOD(100)
  // (Fear Breeze variant: 200 + 250*lv — not tracked here)
  { id: 2233, aegisName: "RA_ARROWSTORM", namePt: "Tempestade de Flechas", type: "physical", element: "weapon", hitCount: 3,
    damagePercent: [380,560,740,920,1100,1280,1460,1640,1820,2000], baseLvScaling: true,
    isMelee: false, canCrit: false, fixedCast: flat(500,10), cooldown: flat(3000,10),
    spCost: levels(25,5,10), maxLevel: 10, jobs: ["Ranger"] },
  // RA_AIMEDBOLT: skillratio += -100 + 500 + 20 * skill_lv; RE_LVL_DMOD(100)
  // (Fear Breeze: 800 + 35*lv)
  { id: 2236, aegisName: "RA_AIMEDBOLT", namePt: "Disparo Certeiro", type: "physical", element: "weapon", hitCount: 5,
    damagePercent: [520,540,560,580,600,620,640,660,680,700], baseLvScaling: true,
    isMelee: false, canCrit: false, castTime: levels(800,200,10), fixedCast: flat(500,10),
    cooldown: flat(3000,10), spCost: levels(30,4,10), maxLevel: 10, jobs: ["Ranger"] },
  // RA_WUGSTRIKE: skillratio += -100 + 200 * skill_lv (no BaseLv scaling)
  { id: 2243, aegisName: "RA_WUGSTRIKE", namePt: "Investida de Worg", type: "physical", element: "weapon",
    hitCount: 1, damagePercent: [200,400,600,800,1000], baseLvScaling: false,
    isMelee: false, canCrit: false, spCost: [20,22,24,26,28], maxLevel: 5, jobs: ["Ranger"] },

  // ━━━ Assassin / Guillotine Cross (rAthena: src/map/skills/thief/) ━━━
  // AS_SONICBLOW (Renewal): skillratio += -100 + 200 + 100 * skill_lv; NO BaseLv; +50% if target < 50% HP; 8 hits
  { id: 136, aegisName: "AS_SONICBLOW", namePt: "Lâminas Destruidoras", type: "physical", element: "weapon", hitCount: 8,
    damagePercent: [300,400,500,600,700,800,900,1000,1100,1200], baseLvScaling: false,
    isMelee: true, canCrit: false, spCost: [16,18,20,22,24,26,28,30,32,34], maxLevel: 10,
    jobs: ["Assassin"] },
  // ASC_BREAKER / Soul Destroyer (Renewal): skillratio += -100 + 150 * skill_lv + STR + INT; RE_LVL_DMOD(100)
  { id: 379, aegisName: "ASC_BREAKER", namePt: "Destruidor de Almas", type: "physical", element: "weapon", hitCount: 1,
    damagePercent: [150,300,450,600,750,900,1050,1200,1350,1500], baseLvScaling: true,
    statScaling: { str: 1, int: 1 },
    isMelee: false, canCrit: true, halfCritBonus: true,
    spCost: [15,20,25,30,35,40,45,50,55,60], maxLevel: 10, jobs: ["Assassin", "Guillotine_Cross"] },
  // GC_CROSSIMPACT: skillratio += -100 + 1400 + 150 * skill_lv; RE_LVL_DMOD(100)
  { id: 2022, aegisName: "GC_CROSSIMPACT", namePt: "Lâminas Retalhadoras", type: "physical", element: "weapon", hitCount: 7,
    damagePercent: [1550, 1700, 1850, 2000, 2150], baseLvScaling: true,
    isMelee: true, canCrit: true, halfCritBonus: true, fixedCast: flat(500,5), cooldown: flat(1500,5),
    spCost: [25,30,35,40,45], maxLevel: 5, jobs: ["Guillotine_Cross"] },
  // GC_ROLLINGCUTTER: skillratio += -100 + 50 + 80 * skill_lv; RE_LVL_DMOD(100)
  { id: 2036, aegisName: "GC_ROLLINGCUTTER", namePt: "Lâminas de Loki", type: "physical", element: "weapon", hitCount: 1,
    damagePercent: [130,210,290,370,450], baseLvScaling: true,
    isMelee: true, canCrit: false, cooldown: flat(200,5), spCost: flat(5,5), maxLevel: 5,
    jobs: ["Guillotine_Cross"] },
  // GC_CROSSRIPPERSLASHER: skillratio += -100 + 80 * skill_lv + AGI*3; + RollingStacks*200; RE_LVL_DMOD(100)
  { id: 2037, aegisName: "GC_CROSSRIPPERSLASHER", namePt: "Castigo de Loki", type: "physical", element: "weapon", hitCount: 1,
    damagePercent: [80,160,240,320,400], baseLvScaling: true,
    statScaling: { agi: 3 },
    isMelee: false, canCrit: false, castTime: flat(500,5), cooldown: flat(2000,5),
    spCost: [20,24,28,32,36], maxLevel: 5, jobs: ["Guillotine_Cross"] },
  // GC_COUNTERSLASH: skillratio += -100 + 300 + 150 * skill_lv; RE_LVL_DMOD(120); + AGI*2 + JobLv*4
  { id: 2029, aegisName: "GC_COUNTERSLASH", namePt: "Retaliação", type: "physical", element: "weapon", hitCount: 1,
    damagePercent: [450,600,750,900,1050,1200,1350,1500,1650,1800], baseLvScaling: true, baseLvDivisor: 120,
    statScaling: { agi: 2 },
    isMelee: true, canCrit: false, ignoreDefPercent: 100,
    spCost: [25,28,31,34,37,40,43,46,49,52], maxLevel: 10, jobs: ["Guillotine_Cross"] },

  // ━━━ Shadow Chaser (rAthena: src/map/skills/thief/) ━━━
  // SC_TRIANGLESHOT: skillratio += -100 + 230 * skill_lv + AGI*3; RE_LVL_DMOD(100)
  { id: 2288, aegisName: "SC_TRIANGLESHOT", namePt: "Disparo Triplo", type: "physical", element: "weapon", hitCount: 3,
    damagePercent: [230,460,690,920,1150,1380,1610,1840,2070,2300], baseLvScaling: true,
    statScaling: { agi: 3 },
    isMelee: false, canCrit: false, spCost: levels(18,2,10), maxLevel: 10, jobs: ["Shadow_Chaser"] },
  // SC_FATALMENACE: skillratio += -100 + 100 + 120 * skill_lv + AGI; RE_LVL_DMOD(100)
  { id: 2284, aegisName: "SC_FATALMENACE", namePt: "Ofensiva Fatal", type: "physical", element: "weapon", hitCount: 1,
    damagePercent: [220,340,460,580,700,820,940,1060,1180,1300], baseLvScaling: true,
    statScaling: { agi: 1 },
    isMelee: true, canCrit: false, cooldown: flat(3000,10), spCost: levels(20,4,10), maxLevel: 10,
    jobs: ["Shadow_Chaser"] },
  // SC_FEINTBOMB: skillratio += -100 + (skill_lv + 1) * DEX/2 * (JobLv/10); RE_LVL_DMOD(120)
  // Complex stat formula — engine handles via formulaType
  { id: 2304, aegisName: "SC_FEINTBOMB", namePt: "Cópia Explosiva", type: "physical", element: "weapon", hitCount: 1,
    damagePercent: [200,400,600,800,1000,1200,1400,1600,1800,2000], baseLvScaling: true, baseLvDivisor: 120,
    formulaType: "feintBomb",
    isMelee: true, canCrit: false, cooldown: flat(5000,10), spCost: levels(24,4,10), maxLevel: 10,
    jobs: ["Shadow_Chaser"] },

  // ━━━ Mage / Wizard (rAthena: src/map/skills/mage/) ━━━
  // Bolt spells: 100% MATK per hit, hits = skill level
  { id: 19, aegisName: "MG_FIREBOLT", namePt: "Lanças de Fogo", type: "magical", element: "fire",
    hitCount: [1,2,3,4,5,6,7,8,9,10], damagePercent: flat(100,10), baseLvScaling: false,
    isMelee: false, canCrit: false, castTime: [700,1400,2100,2800,3500,4200,4900,5600,6300,7000],
    spCost: [12,14,16,18,20,22,24,26,28,30], maxLevel: 10, jobs: ["Mage", "Wizard"] },
  { id: 14, aegisName: "MG_COLDBOLT", namePt: "Lanças de Gelo", type: "magical", element: "water",
    hitCount: [1,2,3,4,5,6,7,8,9,10], damagePercent: flat(100,10), baseLvScaling: false,
    isMelee: false, canCrit: false, castTime: [700,1400,2100,2800,3500,4200,4900,5600,6300,7000],
    spCost: [12,14,16,18,20,22,24,26,28,30], maxLevel: 10, jobs: ["Mage", "Wizard"] },
  { id: 20, aegisName: "MG_LIGHTNINGBOLT", namePt: "Relâmpago", type: "magical", element: "wind",
    hitCount: [1,2,3,4,5,6,7,8,9,10], damagePercent: flat(100,10), baseLvScaling: false,
    isMelee: false, canCrit: false, castTime: [700,1400,2100,2800,3500,4200,4900,5600,6300,7000],
    spCost: [12,14,16,18,20,22,24,26,28,30], maxLevel: 10, jobs: ["Mage", "Wizard"] },

  // ━━━ Warlock (rAthena: src/map/skills/mage/) ━━━
  // WL_SOULEXPANSION: skillratio += -100 + 1000 + 200 * skill_lv + INT; RE_LVL_DMOD(100)
  { id: 2202, aegisName: "WL_SOULEXPANSION", namePt: "Impacto Espiritual", type: "magical", element: "ghost", hitCount: 2,
    damagePercent: [1200, 1400, 1600, 1800, 2000], baseLvScaling: true,
    statScaling: { int: 1 },
    isMelee: false, canCrit: false, fixedCast: flat(500,5), cooldown: flat(2000,5),
    spCost: [30,34,38,42,46], maxLevel: 5, jobs: ["Warlock"] },
  // WL_JACKFROST: skillratio += -100 + 1000 + 300 * skill_lv; RE_LVL_DMOD(100)
  // (Misty Frost: 1200 + 600*lv — not tracked here, rare buff)
  { id: 2204, aegisName: "WL_JACKFROST", namePt: "Esquife de Gelo", type: "magical", element: "water", hitCount: 1,
    damagePercent: [1300,1600,1900,2200,2500], baseLvScaling: true,
    isMelee: false, canCrit: false, castTime: [2000,2500,3000,3500,4000], fixedCast: flat(1000,5),
    cooldown: flat(4000,5), spCost: [50,60,70,80,90], maxLevel: 5, jobs: ["Warlock"] },
  // WL_CRIMSONROCK: skillratio += -100 + 700 + 600 * skill_lv; RE_LVL_DMOD(100)
  { id: 2211, aegisName: "WL_CRIMSONROCK", namePt: "Meteoro Escarlate", type: "magical", element: "fire", hitCount: 7,
    damagePercent: [1300,1900,2500,3100,3700], baseLvScaling: true,
    isMelee: false, canCrit: false, castTime: [3000,3500,4000,4500,5000], fixedCast: flat(1000,5),
    cooldown: flat(5000,5), spCost: [60,70,80,90,100], maxLevel: 5, jobs: ["Warlock"] },
  // WL_CHAINLIGHTNING: skillratio += 400 + 100 * skill_lv; + 100*chain_count; RE_LVL_DMOD(100)
  { id: 2214, aegisName: "WL_CHAINLIGHTNING", namePt: "Corrente Elétrica", type: "magical", element: "wind", hitCount: 1,
    damagePercent: [600,700,800,900,1000], baseLvScaling: true,
    isMelee: false, canCrit: false, castTime: [3000,3500,4000,4500,5000], fixedCast: flat(1000,5),
    cooldown: flat(3000,5), spCost: [80,90,100,110,120], maxLevel: 5, jobs: ["Warlock"] },
  // WL_EARTHSTRAIN: skillratio += -100 + 1000 + 600 * skill_lv; RE_LVL_DMOD(100)
  { id: 2216, aegisName: "WL_EARTHSTRAIN", namePt: "Abalo Sísmico", type: "magical", element: "earth", hitCount: 10,
    damagePercent: [1600,2200,2800,3400,4000], baseLvScaling: true,
    isMelee: false, canCrit: false, castTime: [3000,3500,4000,4500,5000], fixedCast: flat(1000,5),
    cooldown: flat(5000,5), spCost: [70,80,90,100,110], maxLevel: 5, jobs: ["Warlock"] },
  // WL_COMET: skillratio += -100 + 2500 + 700 * skill_lv; RE_LVL_DMOD(100)
  { id: 2213, aegisName: "WL_COMET", namePt: "Cometa", type: "magical", element: "neutral", hitCount: 10,
    damagePercent: [3200,3900,4600,5300,6000], baseLvScaling: true,
    isMelee: false, canCrit: false, castTime: [8000,9000,10000,11000,12000], fixedCast: flat(2000,5),
    cooldown: flat(20000,5), spCost: flat(400,5), maxLevel: 5, jobs: ["Warlock"] },
  // WL_HELLINFERNO: Fire hit: skillratio += -100 + 400 * skill_lv; RE_LVL_DMOD(100)
  // (Shadow hit: +200*skill_lv — separate damage instance, not tracked in single entry)
  { id: 2212, aegisName: "WL_HELLINFERNO", namePt: "Chamas de Hela", type: "magical", element: "fire", hitCount: 1,
    damagePercent: [400,800,1200,1600,2000], baseLvScaling: true,
    isMelee: false, canCrit: false, castTime: flat(2000,5), fixedCast: flat(500,5),
    cooldown: flat(2000,5), spCost: [35,40,45,50,55], maxLevel: 5, jobs: ["Warlock"] },
  // WL_DRAINLIFE: skillratio += -100 + 200 * skill_lv + INT; RE_LVL_DMOD(100)
  { id: 2210, aegisName: "WL_DRAINLIFE", namePt: "Drenar Vida", type: "magical", element: "neutral", hitCount: 1,
    damagePercent: [200,400,600,800,1000], baseLvScaling: true,
    statScaling: { int: 1 },
    isMelee: false, canCrit: false, castTime: flat(1000,5), fixedCast: flat(500,5),
    spCost: [20,24,28,32,36], maxLevel: 5, jobs: ["Warlock"] },

  // ━━━ Sorcerer (rAthena: src/map/skills/mage/) ━━━
  // SO_PSYCHIC_WAVE: skillratio += -100 + 70 * skill_lv + 3 * INT; RE_LVL_DMOD(100)
  { id: 2449, aegisName: "SO_PSYCHIC_WAVE", namePt: "Onda Psíquica", type: "magical", element: "neutral", hitCount: 7,
    damagePercent: [70,140,210,280,350], baseLvScaling: true,
    statScaling: { int: 3 },
    isMelee: false, canCrit: false, castTime: flat(5000,5), fixedCast: flat(1000,5),
    cooldown: flat(5000,5), spCost: [48,56,64,72,80], maxLevel: 5, jobs: ["Sorcerer"] },
  // SO_DIAMONDDUST: skillratio += -100 + 2*INT + 300*FrostWeapon + INT*skill_lv; RE_LVL_DMOD(100)
  // Depends on Frost Weapon skill level — engine handles via formulaType
  { id: 2447, aegisName: "SO_DIAMONDDUST", namePt: "Pó de Diamante", type: "magical", element: "water", hitCount: 2,
    damagePercent: [200,400,600,800,1000], baseLvScaling: true,
    formulaType: "diamondDust",
    isMelee: false, canCrit: false, castTime: flat(5000,5), fixedCast: flat(1000,5),
    cooldown: flat(5000,5), spCost: [48,56,64,72,80], maxLevel: 5, jobs: ["Sorcerer"] },
  // SO_VARETYR_SPEAR: skillratio += -100 + (2*INT + 150*(Striking+LightLoad) + INT*lv/2)/3; RE_LVL_DMOD(100)
  // Depends on Striking/Lightning Loader levels — engine handles via formulaType
  { id: 2454, aegisName: "SO_VARETYR_SPEAR", namePt: "Lanças dos Aesir", type: "magical", element: "wind", hitCount: 3,
    damagePercent: [200,400,600,800,1000,1200,1400,1600,1800,2000], baseLvScaling: true,
    formulaType: "varetyrSpear",
    isMelee: false, canCrit: false, castTime: [2000,2500,3000,3500,4000,4500,5000,5500,6000,6500], fixedCast: flat(500,10),
    cooldown: flat(2000,10), spCost: levels(55,7,10), maxLevel: 10, jobs: ["Sorcerer"] },
  // SO_POISON_BUSTER: skillratio += -100 + 1000 + 300 * skill_lv + INT; RE_LVL_DMOD(100)
  // +200*skill_lv if target has Poison Cloud
  { id: 2448, aegisName: "SO_POISON_BUSTER", namePt: "Implosão Tóxica", type: "magical", element: "poison", hitCount: 1,
    damagePercent: [1300,1600,1900,2200,2500], baseLvScaling: true,
    statScaling: { int: 1 },
    isMelee: false, canCrit: false, castTime: flat(2000,5), fixedCast: flat(500,5),
    cooldown: flat(2000,5), spCost: [50,60,70,80,90], maxLevel: 5, jobs: ["Sorcerer"] },
  // SO_EARTHGRAVE: skillratio += -100 + 2*INT + 300*SeismicWeapon + INT*skill_lv; RE_LVL_DMOD(100)
  // Depends on Seismic Weapon skill level — engine handles via formulaType
  { id: 2446, aegisName: "SO_EARTHGRAVE", namePt: "Castigo de Nerthus", type: "magical", element: "earth", hitCount: 1,
    damagePercent: [200,400,600,800,1000], baseLvScaling: true,
    formulaType: "earthGrave",
    isMelee: false, canCrit: false, castTime: flat(3000,5), fixedCast: flat(500,5),
    cooldown: flat(3000,5), spCost: [50,60,70,80,90], maxLevel: 5, jobs: ["Sorcerer"] },

  // ━━━ Arch Bishop (rAthena: src/map/skills/acolyte/) ━━━
  // AB_JUDEX: skillratio += -100 + 300 + 70 * skill_lv; RE_LVL_DMOD(100)
  { id: 2038, aegisName: "AB_JUDEX", namePt: "Judex", type: "magical", element: "holy", hitCount: 3,
    damagePercent: [370,440,510,580,650,720,790,860,930,1000], baseLvScaling: true,
    isMelee: false, canCrit: false, fixedCast: flat(500,10), cooldown: flat(500,10),
    spCost: levels(20,3,10), maxLevel: 10, jobs: ["Arch_Bishop"] },
  // AB_ADORAMUS: skillratio += -100 + 300 + 250 * skill_lv; RE_LVL_DMOD(100)
  { id: 2040, aegisName: "AB_ADORAMUS", namePt: "Adoramus", type: "magical", element: "holy", hitCount: 10,
    damagePercent: [550,800,1050,1300,1550,1800,2050,2300,2550,2800], baseLvScaling: true,
    isMelee: false, canCrit: false, castTime: levels(1000,200,10), fixedCast: flat(1000,10),
    cooldown: flat(2500,10), spCost: levels(20,8,10), maxLevel: 10, jobs: ["Arch_Bishop"] },
  // AL_HOLYLIGHT: skillratio += 25 (base 100 + 25 = 125, no BaseLv)
  { id: 156, aegisName: "AL_HOLYLIGHT", namePt: "Luz Divina", type: "magical", element: "holy", hitCount: 1,
    damagePercent: [125], baseLvScaling: false,
    isMelee: false, canCrit: false, spCost: [15], maxLevel: 1, jobs: ["Acolyte", "Priest"] },
  // PR_MAGNUS: skillratio += 30 (base 100 + 30 = 130 per hit); no BaseLv scaling
  // Hits multiple times over duration (Amount: 14 in skill_db.yml), each hit = 130%
  { id: 79, aegisName: "PR_MAGNUS", namePt: "Magnus Exorcismus", type: "magical", element: "holy", hitCount: 1,
    damagePercent: flat(130,10), baseLvScaling: false,
    isMelee: false, canCrit: false, castTime: flat(8000,10), fixedCast: flat(2000,10),
    cooldown: flat(6000,10), spCost: [40,42,44,46,48,50,52,54,56,60], maxLevel: 10, jobs: ["Priest", "Arch_Bishop"] },

  // ━━━ Sura (rAthena: src/map/skills/acolyte/) ━━━
  // SR_DRAGONCOMBO: skillratio += 80 * skill_lv; RE_LVL_DMOD(100)
  { id: 2326, aegisName: "SR_DRAGONCOMBO", namePt: "Punho do Dragão", type: "physical", element: "weapon", hitCount: 2,
    damagePercent: [180,260,340,420,500,580,660,740,820,900], baseLvScaling: true,
    isMelee: true, canCrit: false, spCost: levels(5,2,10), maxLevel: 10, jobs: ["Sura"] },
  // SR_FALLENEMPIRE: skillratio += -100 + 100 + 300 * skill_lv; RE_LVL_DMOD(150)  ← divisor 150!
  { id: 2329, aegisName: "SR_FALLENEMPIRE", namePt: "Ruína", type: "physical", element: "weapon", hitCount: 2,
    damagePercent: [400,700,1000,1300,1600,1900,2200,2500,2800,3100], baseLvScaling: true, baseLvDivisor: 150,
    isMelee: true, canCrit: false, spCost: levels(20,5,10), maxLevel: 10, jobs: ["Sura"] },
  // SR_TIGERCANNON: special formula in tigercannon.cpp
  // hp = MaxHP * (10 + skill_lv*2)%; sp = MaxSP * (5 + skill_lv)%
  // Combo: (hp+sp)/2; Normal: (hp+sp)/4; then RE_LVL_DMOD(100)
  // Plus flat bonus from battle.cpp: skill_lv*240 + targetLv*40 (or skill_lv*500 + targetLv*40 with combo)
  { id: 2330, aegisName: "SR_TIGERCANNON", namePt: "Garra de Tigre", type: "physical", element: "neutral", hitCount: 1,
    damagePercent: flat(100, 10), baseLvScaling: false, formulaType: "tigerCannon",
    isMelee: true, canCrit: false, fixedCast: flat(500,10), cooldown: flat(1000,10),
    spCost: levels(40,10,10), maxLevel: 10, jobs: ["Sura"] },
  // SR_KNUCKLEARROW: skillratio += -100 + 500 + 100 * skill_lv; RE_LVL_DMOD(100)
  // +100*lv extra vs Boss (500 + 200*lv total)
  { id: 2336, aegisName: "SR_KNUCKLEARROW", namePt: "Pancada Corporal", type: "physical", element: "weapon", hitCount: 1,
    damagePercent: [600,700,800,900,1000,1100,1200,1300,1400,1500], baseLvScaling: true,
    isMelee: false, canCrit: false, cooldown: flat(1000,10), spCost: levels(10,5,10), maxLevel: 10, jobs: ["Sura"] },
  // SR_RAMPAGEBLASTER: skillratio += -100 + 1000 + 350 * skill_lv; RE_LVL_DMOD(150)  ← divisor 150!
  { id: 2332, aegisName: "SR_RAMPAGEBLASTER", namePt: "Explosão Espiritual", type: "physical", element: "weapon", hitCount: 1,
    damagePercent: [1350,1700,2050,2400,2750], baseLvScaling: true, baseLvDivisor: 150,
    isMelee: false, canCrit: false, castTime: flat(1000,5), fixedCast: flat(500,5),
    cooldown: flat(5000,5), spCost: [50,60,70,80,90], maxLevel: 5, jobs: ["Sura"] },
  // SR_SKYNETBLOW: skillratio += -100 + 200 * skill_lv + AGI/6; RE_LVL_DMOD(100)
  { id: 2327, aegisName: "SR_SKYNETBLOW", namePt: "Soco Furacão", type: "physical", element: "weapon", hitCount: 3,
    damagePercent: [200,400,600,800,1000], baseLvScaling: true,
    statScaling: { agi: 0.167 },
    isMelee: true, canCrit: false, cooldown: flat(500,5), spCost: [10,14,18,22,26], maxLevel: 5, jobs: ["Sura"] },
  // SR_GATEOFHELL: Without combo: skillratio += -100 + 500 * skill_lv; RE_LVL_DMOD(100)
  // With Fallen Empire combo: skillratio += -100 + 800 * skill_lv
  // Plus flat bonus from battle.cpp: (MaxHP-CurHP) + CurSP*(1+Lv*2/10) + BaseLv*10
  { id: 2343, aegisName: "SR_GATEOFHELL", namePt: "Portões do Inferno", type: "physical", element: "neutral", hitCount: 7,
    damagePercent: [500,1000,1500,2000,2500,3000,3500,4000,4500,5000], baseLvScaling: true,
    formulaType: "gatesOfHell",
    isMelee: true, canCrit: false, castTime: flat(1000,10), fixedCast: flat(1000,10),
    cooldown: flat(5000,10), spCost: flat(200,10), maxLevel: 10, jobs: ["Sura"] },

  // ━━━ Mechanic (rAthena: src/map/skills/merchant/) ━━━
  // NC_ARMSCANNON: skillratio += -100 + 400 + 350 * skill_lv; RE_LVL_DMOD(100)
  { id: 2261, aegisName: "NC_ARMSCANNON", namePt: "Canhão", type: "physical", element: "neutral", hitCount: 1,
    damagePercent: [750,1100,1450,1800,2150], baseLvScaling: true,
    isMelee: false, canCrit: false, castTime: [1000,1500,2000,2500,3000], fixedCast: flat(500,5),
    cooldown: flat(2000,5), spCost: [30,35,40,45,50], maxLevel: 5, jobs: ["Mechanic"] },
  // NC_AXETORNADO: skillratio += -100 + 200 + 180 * skill_lv + VIT*2; RE_LVL_DMOD(100)
  { id: 2280, aegisName: "NC_AXETORNADO", namePt: "Fúria do Furacão", type: "physical", element: "weapon", hitCount: 6,
    damagePercent: [380,560,740,920,1100], baseLvScaling: true,
    statScaling: { vit: 2 },
    isMelee: true, canCrit: false, fixedCast: flat(500,5), cooldown: flat(2000,5),
    spCost: [18,20,22,24,26], maxLevel: 5, jobs: ["Mechanic"] },
  // NC_AXEBOOMERANG: skillratio += 150 + 50 * skill_lv + WeaponWeight/10; RE_LVL_DMOD(100)
  { id: 2278, aegisName: "NC_AXEBOOMERANG", namePt: "Arremesso de Machado", type: "physical", element: "weapon", hitCount: 1,
    damagePercent: [300,350,400,450,500], baseLvScaling: true,
    isMelee: false, canCrit: false, fixedCast: flat(500,5), cooldown: flat(5000,5),
    spCost: [20,22,24,26,28], maxLevel: 5, jobs: ["Mechanic"] },
  // NC_BOOSTKNUCKLE: skillratio += -100 + 260 * skill_lv + DEX; RE_LVL_DMOD(100)
  { id: 2256, aegisName: "NC_BOOSTKNUCKLE", namePt: "Punho Foguete", type: "physical", element: "weapon", hitCount: 1,
    damagePercent: [260,520,780,1040,1300], baseLvScaling: true,
    statScaling: { dex: 1 },
    isMelee: false, canCrit: false, cooldown: flat(1000,5),
    spCost: [10,15,20,25,30], maxLevel: 5, jobs: ["Mechanic"] },
  // NC_VULCANARM: skillratio += -100 + 230 * skill_lv + DEX; RE_LVL_DMOD(100)
  { id: 2258, aegisName: "NC_VULCANARM", namePt: "Metralhadora", type: "physical", element: "weapon", hitCount: 1,
    damagePercent: [230,460,690], baseLvScaling: true,
    statScaling: { dex: 1 },
    isMelee: false, canCrit: false, cooldown: flat(200,3),
    spCost: [2,4,6], maxLevel: 3, jobs: ["Mechanic"] },
  // NC_POWERSWING: skillratio += -100 + (STR+DEX)/2 + 300 + 100 * skill_lv; RE_LVL_DMOD(100)
  { id: 2279, aegisName: "NC_POWERSWING", namePt: "Brandir Machado", type: "physical", element: "weapon", hitCount: 1,
    damagePercent: [400,500,600,700,800,900,1000,1100,1200,1300], baseLvScaling: true,
    statScaling: { str: 0.5, dex: 0.5 },
    isMelee: true, canCrit: false, spCost: levels(10,2,10), maxLevel: 10, jobs: ["Mechanic"] },

  // ━━━ Genetic (rAthena: src/map/skills/merchant/) ━━━
  // GN_CARTCANNON: skillratio += -100 + (250 + 20*CartRemodel) * skill_lv + 2*INT/(6-CartRemodel); RE_LVL_DMOD(100)
  // Complex formula depends on Cart Remodeling skill level — engine handles via formulaType
  { id: 2477, aegisName: "GN_CARTCANNON", namePt: "Canhão de Prótons", type: "physical", element: "neutral", hitCount: 1,
    damagePercent: [350,700,1050,1400,1750], baseLvScaling: true,
    formulaType: "cartCannon",
    isMelee: false, canCrit: false, castTime: flat(500,5), fixedCast: flat(500,5),
    cooldown: flat(500,5), spCost: [40,42,44,46,48], maxLevel: 5, jobs: ["Genetic"] },
  // GN_CART_TORNADO: skillratio += -100 + 200 * skill_lv + cart_weight_bonus + CartRemodel*50; NO BaseLv
  { id: 2476, aegisName: "GN_CART_TORNADO", namePt: "Tornado de Carrinho", type: "physical", element: "weapon", hitCount: 3,
    damagePercent: [200,400,600,800,1000,1200,1400,1600,1800,2000], baseLvScaling: false,
    isMelee: true, canCrit: false, cooldown: flat(500,10), spCost: levels(15,3,10), maxLevel: 10, jobs: ["Genetic"] },
  // CR_ACIDDEMONSTRATION (Renewal): skillratio += -100 + 200 * skill_lv + INT + targetVIT
  // Halved vs players. Uses caster INT + target VIT. NO BaseLv scaling.
  { id: 490, aegisName: "CR_ACIDDEMONSTRATION", namePt: "Bomba Ácida", type: "physical", element: "weapon", hitCount: 1,
    damagePercent: [200,400,600,800,1000,1200,1400,1600,1800,2000], baseLvScaling: false,
    formulaType: "acidBomb",
    isMelee: false, canCrit: false, castTime: flat(1000,10), fixedCast: flat(500,10),
    cooldown: flat(1000,10), spCost: levels(30,5,10), maxLevel: 10, jobs: ["Genetic", "Creator"] },
  // GN_SPORE_EXPLOSION: skillratio += -100 + 400 + 200 * skill_lv; RE_LVL_DMOD(100)
  { id: 2481, aegisName: "GN_SPORE_EXPLOSION", namePt: "Esporo Explosivo", type: "physical", element: "neutral", hitCount: 1,
    damagePercent: [600,800,1000,1200,1400,1600,1800,2000,2200,2400], baseLvScaling: true,
    isMelee: false, canCrit: false, castTime: flat(1000,10), fixedCast: flat(500,10),
    cooldown: flat(2000,10), spCost: levels(55,5,10), maxLevel: 10, jobs: ["Genetic"] },

  // ━━━ Minstrel / Wanderer (rAthena: src/map/skills/archer/) ━━━
  // WM_METALICSOUND: skillratio += -100 + 120 * skill_lv + 60 * Lesson_lv; RE_LVL_DMOD(100)
  // Base (Lesson 0): 120*lv. Lesson adds +60 per level. Sound Blend +50% multiplicative.
  { id: 2413, aegisName: "WM_METALICSOUND", namePt: "Ruído Estridente", type: "magical", element: "neutral", hitCount: 2,
    damagePercent: [120,240,360,480,600], baseLvScaling: true,
    isMelee: false, canCrit: false, castTime: flat(2000,5), fixedCast: flat(1000,5),
    cooldown: flat(2000,5), spCost: [64,68,72,76,80], maxLevel: 5, jobs: ["Minstrel", "Wanderer"] },
  // WM_REVERBERATION: skillratio += -100 + 700 + 300 * skill_lv; RE_LVL_DMOD(100)
  { id: 2414, aegisName: "WM_REVERBERATION", namePt: "Ressonância", type: "magical", element: "neutral", hitCount: 1,
    damagePercent: [1000,1300,1600,1900,2200], baseLvScaling: true,
    isMelee: false, canCrit: false, fixedCast: flat(500,5), cooldown: flat(2000,5),
    spCost: [28,32,36,40,44], maxLevel: 5, jobs: ["Minstrel", "Wanderer"] },
  // WM_SEVERE_RAINSTORM: per tick: skillratio += 100 * skill_lv + DEX/300 + AGI/200; RE_LVL_DMOD(100)
  // +20*lv with Instrument/Whip. ~11 ticks over 3.4s duration.
  { id: 2418, aegisName: "WM_SEVERE_RAINSTORM", namePt: "Temporal de Flechas", type: "physical", element: "weapon", hitCount: 12,
    damagePercent: [200,300,400,500,600], baseLvScaling: true,
    isMelee: false, canCrit: false, castTime: [2000,2500,3000,3500,4000], fixedCast: flat(500,5),
    cooldown: flat(5000,5), spCost: [90,95,100,105,110], maxLevel: 5, jobs: ["Minstrel", "Wanderer"] },

  // ━━━ Rebellion (rAthena: src/map/skills/gunslinger/) ━━━
  // RL_FIREDANCE: skillratio += 100 + 100 * skill_lv + Desperado*20; RE_LVL_DMOD(100)
  { id: 2561, aegisName: "RL_FIREDANCE", namePt: "Descarregar Tambor", type: "physical", element: "weapon", hitCount: 1,
    damagePercent: [300,400,500,600,700,800,900,1000,1100,1200], baseLvScaling: true,
    isMelee: false, canCrit: false, spCost: [10,12,14,16,18,20,22,24,26,30], maxLevel: 10, jobs: ["Rebellion"] },
  // RL_R_TRIP: skillratio += -100 + 350 * skill_lv; RE_LVL_DMOD(100)
  { id: 2565, aegisName: "RL_R_TRIP", namePt: "Expurgar", type: "physical", element: "weapon", hitCount: 1,
    damagePercent: [350,700,1050,1400,1750,2100,2450,2800,3150,3500], baseLvScaling: true,
    isMelee: false, canCrit: false, cooldown: flat(2000,10), spCost: [30,32,34,36,38,40,42,44,46,50], maxLevel: 10, jobs: ["Rebellion"] },
  // RL_FIRE_RAIN: skillratio += -100 + 3500 + 300 * skill_lv; NO BaseLv
  // waves = skill_lv + 5 (6-10 waves, each 80ms apart)
  { id: 2567, aegisName: "RL_FIRE_RAIN", namePt: "Disparo Labareda", type: "physical", element: "weapon", hitCount: [6,7,8,9,10],
    damagePercent: [3800,4100,4400,4700,5000], baseLvScaling: false,
    isMelee: false, canCrit: false, castTime: flat(1000,5), fixedCast: flat(500,5),
    cooldown: flat(5000,5), spCost: [80,85,90,95,100], maxLevel: 5, jobs: ["Rebellion"] },

  // ━━━ Kagerou / Oboro (rAthena: src/map/skills/ninja/) ━━━
  // KO_JYUMONJIKIRI: skillratio += -100 + 200 * skill_lv; RE_LVL_DMOD(120)  ← divisor 120!
  // +skill_lv*BaseLv if target has Jyumonji debuff
  { id: 3004, aegisName: "KO_JYUMONJIKIRI", namePt: "Impacto Cruzado", type: "physical", element: "weapon", hitCount: 2,
    damagePercent: [200,400,600,800,1000,1200,1400,1600,1800,2000], baseLvScaling: true, baseLvDivisor: 120,
    isMelee: true, canCrit: false, fixedCast: flat(500,10), cooldown: flat(3000,10),
    spCost: [10,15,20,25,30,35,40,45,50,55], maxLevel: 10, jobs: ["KagerouOboro", "Kagerou", "Oboro"] },

  // ━━━ Doram (Summoner / Spirit Handler) (rAthena: src/map/skills/summoner/) ━━━
  // SU_PICKYPECK: skillratio += 100 + 100 * skill_lv; NO BaseLv; doubles if target HP < 50%
  { id: 5033, aegisName: "SU_PICKYPECK", namePt: "Chilique de Picky", type: "physical", element: "neutral",
    hitCount: 5, damagePercent: [300,400,500,600,700], baseLvScaling: false,
    isMelee: false, canCrit: false, fixedCast: flat(500,5), cooldown: flat(1000,5),
    spCost: [10,12,14,16,18], maxLevel: 5, jobs: ["Summoner", "Spirit_Handler"] },
  // SU_LUNATICCARROTBEAT: skillratio += 100 + 100 * skill_lv; + STR if BaseLv>99; RE_LVL_DMOD(100)
  { id: 5036, aegisName: "SU_LUNATICCARROTBEAT", namePt: "Cometas Lunáticos", type: "physical", element: "neutral",
    hitCount: 3, damagePercent: [300,400,500,600,700], baseLvScaling: true,
    statScaling: { str: 1 },
    isMelee: false, canCrit: false, castTime: flat(1000,5), fixedCast: flat(500,5),
    cooldown: flat(1000,5), spCost: [30,35,40,45,50], maxLevel: 5, jobs: ["Summoner", "Spirit_Handler"] },

  // ━━━ Star Emperor (rAthena: src/map/skills/taekwon/) ━━━
  // SJ_SOLARBURST: skillratio += -100 + 900 + 220 * skill_lv; RE_LVL_DMOD(100)
  { id: 2592, aegisName: "SJ_SOLARBURST", namePt: "Explosão Solar", type: "physical", element: "fire", hitCount: 3,
    damagePercent: [1220,1440,1660,1880,2100,2320,2540,2760,2980,3200], baseLvScaling: true,
    isMelee: false, canCrit: false, castTime: flat(1000,10), fixedCast: flat(500,10),
    cooldown: flat(3000,10), spCost: [30,32,34,36,38,40,42,44,46,50], maxLevel: 10,
    jobs: ["Star_Gladiator", "Star_Emperor"] },
  // SJ_FULLMOONKICK: skillratio += -100 + 1000 + 100 * skill_lv; RE_LVL_DMOD(100)
  { id: 2576, aegisName: "SJ_FULLMOONKICK", namePt: "Chute Lunar", type: "physical", element: "neutral", hitCount: 1,
    damagePercent: [1200,1300,1400,1500,1600,1700,1800,1900,2000,2100], baseLvScaling: true,
    isMelee: true, canCrit: false, fixedCast: flat(500,10), cooldown: flat(2000,10),
    spCost: [50,52,54,56,58,60,62,64,66,70], maxLevel: 10, jobs: ["Star_Gladiator", "Star_Emperor"] },

  // ━━━ Soul Reaper (rAthena: src/map/skills/taekwon/) ━━━
  // SP_SPA (Espa): skillratio += -100 + 400 + 250 * skill_lv; RE_LVL_DMOD(100)
  { id: 2602, aegisName: "SP_SPA", namePt: "Espa", type: "magical", element: "neutral",
    hitCount: 1, damagePercent: [750,1000,1250,1500,1750,2000,2250,2500,2750,3000], baseLvScaling: true,
    isMelee: false, canCrit: false, castTime: flat(1000,10), fixedCast: flat(500,10),
    cooldown: flat(1000,10), spCost: [60,65,70,75,80,85,90,95,100,100], maxLevel: 10, jobs: ["Soul_Linker", "Soul_Reaper"] },
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
