// ─── Ragnarok Online Renewal — Damage Calculation Engine ─────────────
//
// Implements the Renewal damage formula for physical and magical skills.
// All formulas from rAthena source: battle.cpp, status.cpp, individual skill .cpp files.
// References: github.com/rathena/rathena (master branch, Feb 2026)

import type { BaseStats, EquipBonus } from "./ro-stats";
import type { SkillFormula } from "./ro-skill-formulas";
import { getHitCount, getDamagePercent } from "./ro-skill-formulas";

// ─── Types ──────────────────────────────────────────────────────────

export interface DamageInput {
  baseLevel: number;
  baseStats: BaseStats;
  totalBonus: EquipBonus;
  weaponAtk: number;       // base weapon ATK (from item)
  weaponMatk: number;      // base weapon MATK
  weaponLevel: number;     // 1-5 (0 = no weapon / bare fist)
  weaponRefine: number;    // +0 to +20
  weaponSubType?: string;  // Dagger, 1hSword, 2hSword, etc.
  weaponElement: string;   // element of attack (weapon element or skill override)
  aspd: number;            // final ASPD for DPS calc
  // HP/SP — needed for Dragon Breath, Tiger Cannon, Gates of Hell
  maxHp: number;
  currentHp: number;       // Dragon Breath uses currentHP, Gates of Hell uses (max-current)
  maxSp: number;
  currentSp: number;       // Gates of Hell uses currentSP
  skill: SkillFormula;
  skillLevel: number;
  monster: MonsterTarget;
}

export interface MonsterTarget {
  id: number;
  name: string;
  namePt: string;
  level: number;
  hp: number;
  defense: number;       // hard DEF (equipment-like, % reduction)
  magicDefense: number;  // hard MDEF
  stats: { str: number; agi: number; vit: number; int: number; dex: number; luk: number };
  size: string;          // Size_Small, Size_Medium, Size_Large
  race: string;          // RC_Formless, RC_Undead, etc.
  element: string;       // Ele_Neutral, Ele_Fire, etc.
  elementLevel: number;  // 1-4
  class: string;         // Class_Normal, Class_Boss
}

export interface DamageResult {
  minDamage: number;
  maxDamage: number;
  avgDamage: number;
  critDamage: number;
  hitCount: number;
  totalMin: number;
  totalMax: number;
  totalAvg: number;
  totalCrit: number;
  dps: number;
  castCycle: number;     // total time for one cast cycle (ms)
  details: DamageDetails;
}

export interface DamageDetails {
  statusAtk: number;
  weaponAtk: number;
  equipAtk: number;
  skillPercent: number;
  baseLvScaling: number;  // multiplier from BaseLv/divisor
  sizePenalty: number;
  raceModifier: number;
  elementModifier: number;
  sizeModifier: number;
  classModifier: number;
  skillAtkModifier: number;
  longRangeModifier: number;
  atkRateModifier: number;
  elementTableMod: number;
  hardDefReduction: number;
  softDefReduction: number;
  ignoreDefPercent: number;
}

// ─── Element Table (Renewal) ────────────────────────────────────────
// [attackElement][defenseElement][defenseLevel-1]
// Values in % (100 = normal, 200 = 2x, 0 = immune, -100 = heal)
// Verified from rAthena db/re/attr_fix.yml

const ELE_NAMES = [
  "Ele_Neutral", "Ele_Water", "Ele_Earth", "Ele_Fire", "Ele_Wind",
  "Ele_Poison", "Ele_Holy", "Ele_Dark", "Ele_Ghost", "Ele_Undead",
] as const;

// prettier-ignore
const ELEMENT_TABLE: number[][][] = [
  // Neutral attacking
  [[100,100,100,100],[100,100,100,100],[100,100,100,100],[100,100,100,100],[100,100,100,100],[100,100,100,100],[100,100,100,100],[100,100,100,100],[ 90, 70, 50,  0],[100,100,100,100]],
  // Water attacking
  [[100,100,100,100],[ 25,  0,  0,  0],[100,100,100,100],[150,175,200,200],[ 90, 80, 70, 60],[150,150,125,125],[100,100,100,100],[100,100,100,100],[100,100,100,100],[100,100,100,100]],
  // Earth attacking
  [[100,100,100,100],[100,100,100,100],[ 25,  0,  0,  0],[ 90, 80, 70, 60],[150,175,200,200],[150,150,125,125],[100,100,100,100],[100,100,100,100],[100,100,100,100],[100,100,100,100]],
  // Fire attacking
  [[100,100,100,100],[ 90, 80, 70, 60],[150,175,200,200],[ 25,  0,  0,  0],[100,100,100,100],[150,150,125,125],[100,100,100,100],[100,100,100,100],[100,100,100,100],[125,150,175,200]],
  // Wind attacking
  [[100,100,100,100],[150,175,200,200],[ 90, 80, 70, 60],[100,100,100,100],[ 25,  0,  0,  0],[150,150,125,125],[100,100,100,100],[100,100,100,100],[100,100,100,100],[100,100,100,100]],
  // Poison attacking
  [[100,100,100,100],[150,150,125,125],[150,150,125,125],[150,150,125,125],[150,150,125,125],[  0,  0,  0,  0],[ 75, 75, 50, 50],[ 75, 75, 50, 50],[ 75, 75, 50, 50],[ 75, 50, 25,  0]],
  // Holy attacking
  [[100,100,100,100],[100,100,100,100],[100,100,100,100],[100,100,100,100],[100,100,100,100],[ 75, 75, 50, 50],[  0,  0,  0,  0],[125,150,175,200],[100,100,100,100],[125,150,175,200]],
  // Dark/Shadow attacking
  [[100,100,100,100],[100,100,100,100],[100,100,100,100],[100,100,100,100],[100,100,100,100],[ 75, 75, 50, 50],[125,150,175,200],[  0,  0,  0,  0],[100,100,100,100],[  0,  0,  0,  0]],
  // Ghost attacking
  [[ 90, 70, 50,  0],[100,100,100,100],[100,100,100,100],[100,100,100,100],[100,100,100,100],[ 75, 75, 50, 50],[ 90, 80, 70, 60],[ 90, 80, 70, 60],[125,150,175,200],[100,125,150,175]],
  // Undead attacking
  [[100,100,100,100],[100,100,100,100],[100,100,100,100],[ 90, 80, 70, 60],[100,100,100,100],[ 75, 50, 25,  0],[125,150,175,200],[  0,  0,  0,  0],[100,125,150,175],[  0,  0,  0,  0]],
];

function getElementMultiplier(atkElement: string, defElement: string, defLevel: number): number {
  const atkIdx = ELE_NAMES.indexOf(atkElement as typeof ELE_NAMES[number]);
  const defIdx = ELE_NAMES.indexOf(defElement as typeof ELE_NAMES[number]);
  if (atkIdx < 0 || defIdx < 0) return 100;
  const lvl = Math.max(0, Math.min(3, defLevel - 1));
  return ELEMENT_TABLE[atkIdx][defIdx][lvl];
}

// ─── Size Penalty (weapon type → target size) ───────────────────────

const SIZE_PENALTY: Record<string, [number, number, number]> = {
  Fist:     [100, 100,  75],
  Dagger:   [100,  75,  50],
  "1hSword":[75, 100,  75],
  "2hSword":[75,  75, 100],
  "1hSpear":[75,  75, 100],
  "2hSpear":[75,  75, 100],
  "1hAxe":  [50,  75, 100],
  "2hAxe":  [50,  75, 100],
  Mace:     [75, 100, 100],
  "2hMace": [100, 100, 100],
  Staff:    [100, 100, 100],
  "2hStaff":[100, 100, 100],
  Knuckle:  [100, 100,  75],
  Musical:  [75, 100,  75],
  Whip:     [75, 100,  50],
  Book:     [100, 100,  50],
  Katar:    [75, 100,  75],
  Bow:      [100, 100,  75],
  Revolver: [100, 100, 100],
  Rifle:    [100, 100, 100],
  Gatling:  [100, 100, 100],
  Shotgun:  [100, 100, 100],
  Grenade:  [100, 100, 100],
  Huuma:    [75, 100, 100],
  Shuriken: [75,  75, 100],
};

function getSizePenalty(weaponType: string | undefined, targetSize: string): number {
  const penalties = SIZE_PENALTY[weaponType || "Fist"] || SIZE_PENALTY.Fist;
  switch (targetSize) {
    case "Size_Small": return penalties[0];
    case "Size_Medium": return penalties[1];
    case "Size_Large": return penalties[2];
    default: return 100;
  }
}

// ─── Refine ATK Bonus ───────────────────────────────────────────────

const REFINE_TABLE: Record<number, Record<number, { bonus: number; over: number; high: number }>> = {
  1: { 1:{bonus:2,over:0,high:0},2:{bonus:4,over:0,high:0},3:{bonus:6,over:0,high:0},4:{bonus:8,over:0,high:0},5:{bonus:10,over:0,high:0},6:{bonus:12,over:0,high:0},7:{bonus:14,over:0,high:0},8:{bonus:16,over:2,high:0},9:{bonus:18,over:4,high:0},10:{bonus:20,over:6,high:0},11:{bonus:22,over:8,high:0},12:{bonus:24,over:10,high:0},13:{bonus:26,over:12,high:0},14:{bonus:28,over:14,high:0},15:{bonus:30,over:16,high:0},16:{bonus:32,over:18,high:16},17:{bonus:34,over:20,high:17},18:{bonus:36,over:22,high:18},19:{bonus:38,over:24,high:19},20:{bonus:40,over:26,high:20} },
  2: { 1:{bonus:3,over:0,high:0},2:{bonus:6,over:0,high:0},3:{bonus:9,over:0,high:0},4:{bonus:12,over:0,high:0},5:{bonus:15,over:0,high:0},6:{bonus:18,over:0,high:0},7:{bonus:21,over:5,high:0},8:{bonus:24,over:10,high:0},9:{bonus:27,over:15,high:0},10:{bonus:30,over:20,high:0},11:{bonus:33,over:25,high:0},12:{bonus:36,over:30,high:0},13:{bonus:39,over:35,high:0},14:{bonus:42,over:40,high:0},15:{bonus:45,over:45,high:0},16:{bonus:48,over:50,high:32},17:{bonus:51,over:55,high:34},18:{bonus:54,over:60,high:36},19:{bonus:57,over:65,high:38},20:{bonus:60,over:70,high:40} },
  3: { 1:{bonus:5,over:0,high:0},2:{bonus:10,over:0,high:0},3:{bonus:15,over:0,high:0},4:{bonus:20,over:0,high:0},5:{bonus:25,over:0,high:0},6:{bonus:30,over:8,high:0},7:{bonus:35,over:16,high:0},8:{bonus:40,over:24,high:0},9:{bonus:45,over:32,high:0},10:{bonus:50,over:40,high:0},11:{bonus:55,over:48,high:0},12:{bonus:60,over:56,high:0},13:{bonus:65,over:64,high:0},14:{bonus:70,over:72,high:0},15:{bonus:75,over:80,high:0},16:{bonus:80,over:88,high:32},17:{bonus:85,over:96,high:34},18:{bonus:90,over:104,high:36},19:{bonus:95,over:112,high:38},20:{bonus:100,over:120,high:40} },
  4: { 1:{bonus:7,over:0,high:0},2:{bonus:14,over:0,high:0},3:{bonus:21,over:0,high:0},4:{bonus:28,over:0,high:0},5:{bonus:35,over:14,high:0},6:{bonus:42,over:28,high:0},7:{bonus:49,over:42,high:0},8:{bonus:56,over:56,high:0},9:{bonus:63,over:70,high:0},10:{bonus:70,over:84,high:0},11:{bonus:77,over:98,high:0},12:{bonus:84,over:112,high:0},13:{bonus:91,over:126,high:0},14:{bonus:98,over:140,high:0},15:{bonus:105,over:154,high:0},16:{bonus:112,over:168,high:48},17:{bonus:119,over:182,high:51},18:{bonus:126,over:196,high:54},19:{bonus:133,over:210,high:57},20:{bonus:140,over:224,high:60} },
  5: { 1:{bonus:8,over:0,high:0},2:{bonus:16,over:0,high:0},3:{bonus:24,over:0,high:0},4:{bonus:32,over:0,high:0},5:{bonus:40,over:0,high:0},6:{bonus:48,over:0,high:0},7:{bonus:56,over:0,high:0},8:{bonus:64,over:0,high:0},9:{bonus:72,over:0,high:0},10:{bonus:80,over:0,high:0},11:{bonus:88,over:0,high:0},12:{bonus:96,over:0,high:0},13:{bonus:104,over:0,high:0},14:{bonus:112,over:0,high:0},15:{bonus:120,over:0,high:0},16:{bonus:128,over:0,high:0},17:{bonus:136,over:0,high:0},18:{bonus:144,over:0,high:0},19:{bonus:152,over:0,high:0},20:{bonus:160,over:0,high:0} },
};

function getRefineAtkParts(weaponLevel: number, refine: number): { fixed: number; overMax: number } {
  if (refine <= 0 || weaponLevel <= 0) return { fixed: 0, overMax: 0 };
  const table = REFINE_TABLE[weaponLevel];
  if (!table) return { fixed: 0, overMax: 0 };
  const entry = table[Math.min(refine, 20)];
  if (!entry) return { fixed: 0, overMax: 0 };
  return { fixed: entry.bonus + entry.high, overMax: entry.over };
}

function getRefineMatkBonus(weaponLevel: number, refine: number): number {
  if (refine <= 0 || weaponLevel <= 0) return 0;
  const table = REFINE_TABLE[weaponLevel];
  if (!table) return 0;
  const entry = table[Math.min(refine, 20)];
  if (!entry) return 0;
  return entry.bonus + entry.high;
}

// ─── Bonus helpers ──────────────────────────────────────────────────

function sumBonusForTarget(
  bonus: EquipBonus,
  monster: MonsterTarget,
): { race: number; element: number; size: number; class: number } {
  const race = (bonus.addRace?.[monster.race] || 0) + (bonus.addRace?.RC_All || 0);
  const element = (bonus.addEle?.[monster.element] || 0) + (bonus.addEle?.Ele_All || 0);
  const size = (bonus.addSize?.[monster.size] || 0) + (bonus.addSize?.Size_All || 0);
  const cls = (bonus.addClass?.[monster.class] || 0) + (bonus.addClass?.Class_All || 0);
  return { race, element, size, class: cls };
}

// ─── Stat Scaling ───────────────────────────────────────────────────
// Some skills add stats to their skillratio (e.g., +INT, +AGI*3, +VIT*2)

function calcStatBonus(skill: SkillFormula, stats: BaseStats, bonus: EquipBonus, skillLevel: number): number {
  if (!skill.statScaling) return 0;
  const totalStr = stats.str + (bonus.str || 0);
  const totalAgi = stats.agi + (bonus.agi || 0);
  const totalVit = stats.vit + (bonus.vit || 0);
  const totalInt = stats.int + (bonus.int || 0);
  const totalDex = stats.dex + (bonus.dex || 0);
  const totalLuk = stats.luk + (bonus.luk || 0);

  let statAdd = 0;
  if (skill.statScaling.str) statAdd += Math.floor(totalStr * skill.statScaling.str);
  if (skill.statScaling.agi) statAdd += Math.floor(totalAgi * skill.statScaling.agi);
  if (skill.statScaling.vit) statAdd += Math.floor(totalVit * skill.statScaling.vit);
  if (skill.statScaling.int) statAdd += Math.floor(totalInt * skill.statScaling.int);
  if (skill.statScaling.dex) statAdd += Math.floor(totalDex * skill.statScaling.dex);
  if (skill.statScaling.luk) statAdd += Math.floor(totalLuk * skill.statScaling.luk);

  // Some skills multiply stat bonus by skill level (e.g., Cannon Spear: STR * skill_lv)
  if (skill.statScalingPerLevel) {
    statAdd *= skillLevel;
  }

  return statAdd;
}

// ─── BaseLv Scaling (RE_LVL_DMOD) ───────────────────────────────────
// rAthena: if BaseLv > 99, skillratio *= BaseLv / divisor
// Different skills use different divisors (100, 120, 150)

function calcBaseLvMod(skill: SkillFormula, baseLevel: number): number {
  if (!skill.baseLvScaling) return 1;
  if (baseLevel <= 99) return 1;
  const divisor = skill.baseLvDivisor || 100;
  return baseLevel / divisor;
}

// ─── Special Formula: Dragon Breath ─────────────────────────────────
// rAthena battle.cpp: damagevalue = (sstatus->hp / 50 + status_get_max_sp(src) / 4) * skill_lv
// if BaseLv > 100: damagevalue *= BaseLv / 150
// then: damagevalue *= (90 + 10 * dragonTraining) / 100
// NOTE: Uses CURRENT HP (sstatus->hp), not max HP!

function calcDragonBreath(input: DamageInput): number {
  const { currentHp, maxSp, skillLevel, baseLevel } = input;
  let damage = Math.floor(currentHp / 50 + maxSp / 4) * skillLevel;
  if (baseLevel > 100) {
    damage = Math.floor(damage * baseLevel / 150);
  }
  // Dragon Training assumed at lv5 (most builds max it): (90 + 50) / 100 = 1.4
  // TODO: Add dragonTraining level to input when available
  damage = Math.floor(damage * 140 / 100);
  return damage;
}

// ─── Special Formula: Tiger Cannon ──────────────────────────────────
// rAthena tigercannon.cpp:
// hp = MaxHP * (10 + skill_lv * 2) / 100
// sp = MaxSP * (5 + skill_lv) / 100
// Combo (flag&8): skillratio = (hp + sp) / 2
// Normal:         skillratio = (hp + sp) / 4
// Then RE_LVL_DMOD(100)
//
// PLUS flat bonus from battle.cpp:
// Normal: ATK_ADD(skill_lv * 240 + target_base_lv * 40)
// Combo:  ATK_ADD(skill_lv * 500 + target_lv * 40)
//
// The HP/SP values ARE the skillratio (applied to ATK), NOT base damage.

function calcTigerCannonRatio(input: DamageInput, isCombo: boolean): number {
  const { maxHp, maxSp, skillLevel, baseLevel } = input;
  const hp = Math.floor(maxHp * (10 + skillLevel * 2) / 100);
  const sp = Math.floor(maxSp * (5 + skillLevel) / 100);
  let ratio = isCombo ? Math.floor((hp + sp) / 2) : Math.floor((hp + sp) / 4);
  // RE_LVL_DMOD(100)
  if (baseLevel > 99) {
    ratio = Math.floor(ratio * baseLevel / 100);
  }
  return ratio;
}

function calcTigerCannonFlat(input: DamageInput, isCombo: boolean): number {
  const { skillLevel, monster } = input;
  if (isCombo) {
    return skillLevel * 500 + monster.level * 40;
  }
  return skillLevel * 240 + monster.level * 40;
}

// ─── Special Formula: Gates of Hell ─────────────────────────────────
// rAthena gateofhell.cpp:
// Combo (Fallen Empire): skillratio = 800 * skill_lv
// Normal:                skillratio = 500 * skill_lv
// Then RE_LVL_DMOD(100)
//
// Plus flat bonus from battle.cpp:
// Normal: ATK_ADD(maxHP - curHP) + curSP * (1 + skill_lv * 2 / 10) + baseLv * 10
// Combo:  ATK_ADD(maxHP - curHP) + maxSP * (1 + skill_lv * 4 / 10) + baseLv * 40

function calcGatesOfHellBonus(input: DamageInput, isCombo: boolean): number {
  const { maxHp, currentHp, maxSp, currentSp, skillLevel, baseLevel } = input;
  const hpDiff = maxHp - currentHp;
  if (isCombo) {
    return hpDiff + Math.floor(maxSp * (1 + skillLevel * 4 / 10)) + baseLevel * 40;
  }
  return hpDiff + Math.floor(currentSp * (1 + skillLevel * 2 / 10)) + baseLevel * 10;
}

// ─── Special Formula: Acid Demonstration (Renewal) ──────────────────
// rAthena aciddemonstration.cpp:
// skillratio = 200 * skill_lv + caster_INT + target_VIT
// Halved vs players.
// NO BaseLv scaling. Standard physical damage with this ratio.

function calcAcidBombRatio(input: DamageInput): number {
  const { skillLevel, baseStats, totalBonus, monster } = input;
  const casterInt = baseStats.int + (totalBonus.int || 0);
  const targetVit = monster.stats.vit;
  return 200 * skillLevel + casterInt + targetVit;
}

// ─── Main Damage Calculation ────────────────────────────────────────

export function calculateDamage(input: DamageInput): DamageResult {
  const { skill, skillLevel, monster, baseLevel, baseStats, totalBonus } = input;
  const bonusStr = totalBonus.str || 0;
  const bonusInt = totalBonus.int || 0;
  const bonusDex = totalBonus.dex || 0;
  const bonusLuk = totalBonus.luk || 0;

  const totalStr = baseStats.str + bonusStr;
  const totalInt = baseStats.int + bonusInt;
  const totalDex = baseStats.dex + bonusDex;
  const totalLuk = baseStats.luk + bonusLuk;

  const hitCount = getHitCount(skill, skillLevel);

  // Determine attack element
  let atkElement = input.weaponElement || "Ele_Neutral";
  if (skill.element !== "weapon") {
    atkElement = "Ele_" + skill.element.charAt(0).toUpperCase() + skill.element.slice(1);
    const eleMap: Record<string, string> = {
      Ele_Neutral: "Ele_Neutral", Ele_Fire: "Ele_Fire", Ele_Water: "Ele_Water",
      Ele_Earth: "Ele_Earth", Ele_Wind: "Ele_Wind", Ele_Poison: "Ele_Poison",
      Ele_Holy: "Ele_Holy", Ele_Dark: "Ele_Dark", Ele_Ghost: "Ele_Ghost",
      Ele_Undead: "Ele_Undead",
    };
    atkElement = eleMap[atkElement] || atkElement;
  }

  const elementTableMod = getElementMultiplier(atkElement, monster.element, monster.elementLevel);
  const targetBonuses = sumBonusForTarget(totalBonus, monster);
  const skillAtkBonus = totalBonus.skillAtk?.[skill.aegisName] || 0;

  // DEF calculations (Renewal)
  const hardDef = monster.defense;
  const softDef = Math.floor((monster.level + monster.stats.vit) / 2);
  const hardMdef = monster.magicDefense;
  const softMdef = Math.floor((monster.level + monster.stats.int) / 4);

  // Ignore DEF from skill + equipment
  const skillIgnoreDef = skill.ignoreDefPercent || 0;
  const equipIgnoreDef = (totalBonus.ignoreDefRaceRate?.[monster.race] || 0)
    + (totalBonus.ignoreDefRaceRate?.RC_All || 0);
  const equipIgnoreMdef = (totalBonus.ignoreMdefRaceRate?.[monster.race] || 0)
    + (totalBonus.ignoreMdefRaceRate?.RC_All || 0);
  const totalIgnoreDef = Math.min(100, skillIgnoreDef + equipIgnoreDef);
  const totalIgnoreMdef = Math.min(100, skillIgnoreDef + equipIgnoreMdef);
  const effectiveHardDef = Math.floor(hardDef * (100 - totalIgnoreDef) / 100);
  const effectiveHardMdef = Math.floor(hardMdef * (100 - totalIgnoreMdef) / 100);

  // Modifier calculations (shared across most formulas)
  const raceMod = 1 + targetBonuses.race / 100;
  const eleMod = 1 + targetBonuses.element / 100;
  const sizeMod = 1 + targetBonuses.size / 100;
  const classMod = 1 + targetBonuses.class / 100;
  const skillAtkMod = 1 + skillAtkBonus / 100;
  const eleTableMod = elementTableMod / 100;

  // ── Dragon Breath: completely separate formula ──────────────────
  if (skill.formulaType === "dragonBreath") {
    const baseDamage = calcDragonBreath(input);
    const rangeMod = 1 + (totalBonus.longAtkRate || 0) / 100;
    const totalMod = raceMod * eleMod * sizeMod * classMod * skillAtkMod * eleTableMod * rangeMod;
    // Dragon Breath uses SimpleDefense (flat DEF subtraction, not % formula)
    const defReduction = effectiveHardDef + softDef;
    const damage = Math.max(1, Math.floor(baseDamage * totalMod) - defReduction);

    const details: DamageDetails = {
      statusAtk: baseDamage, weaponAtk: 0, equipAtk: 0,
      skillPercent: 100, baseLvScaling: baseLevel > 100 ? baseLevel / 150 : 1,
      sizePenalty: 100, raceModifier: targetBonuses.race, elementModifier: targetBonuses.element,
      sizeModifier: targetBonuses.size, classModifier: targetBonuses.class,
      skillAtkModifier: skillAtkBonus, longRangeModifier: totalBonus.longAtkRate || 0,
      atkRateModifier: 0, elementTableMod,
      hardDefReduction: effectiveHardDef, softDefReduction: softDef, ignoreDefPercent: totalIgnoreDef,
    };
    const castCycle = getCastCycle(skill, skillLevel, totalBonus, input.aspd);
    const dps = castCycle > 0 ? Math.floor(damage / (castCycle / 1000)) : 0;
    return {
      minDamage: damage, maxDamage: damage, avgDamage: damage, critDamage: damage,
      hitCount, totalMin: damage, totalMax: damage, totalAvg: damage, totalCrit: damage,
      dps, castCycle, details,
    };
  }

  // ── Tiger Cannon: HP/SP as skillratio applied to ATK ────────────
  if (skill.formulaType === "tigerCannon") {
    // Tiger Cannon uses standard ATK calculation with a special skillratio
    const isCombo = false; // TODO: Add combo state input
    const tcRatio = calcTigerCannonRatio(input, isCombo);
    const tcFlat = calcTigerCannonFlat(input, isCombo);
    // Uses ATK but with tcRatio as the skillratio
    return calcPhysicalDamage(input, tcRatio, tcFlat, effectiveHardDef, softDef,
      targetBonuses, skillAtkBonus, elementTableMod, totalIgnoreDef);
  }

  // ── Gates of Hell: ATK-based + flat HP/SP bonus ─────────────────
  if (skill.formulaType === "gatesOfHell") {
    const isCombo = false; // TODO: Add combo state input
    const baseRatio = getDamagePercent(skill, skillLevel);
    const baseLvMod = calcBaseLvMod(skill, baseLevel);
    const finalRatio = Math.floor(baseRatio * baseLvMod);
    const gohFlat = calcGatesOfHellBonus(input, isCombo);
    return calcPhysicalDamage(input, finalRatio, gohFlat, effectiveHardDef, softDef,
      targetBonuses, skillAtkBonus, elementTableMod, totalIgnoreDef);
  }

  // ── Acid Demonstration: special ratio using caster INT + target VIT ──
  if (skill.formulaType === "acidBomb") {
    const acidRatio = calcAcidBombRatio(input);
    // Acid Demo has no BaseLv scaling, and uses SimpleDefense
    return calcPhysicalDamage(input, acidRatio, 0, effectiveHardDef, softDef,
      targetBonuses, skillAtkBonus, elementTableMod, totalIgnoreDef);
  }

  // ── Standard skill calculation ──────────────────────────────────
  // Get base skillratio + stat bonus
  let skillRatio = getDamagePercent(skill, skillLevel);
  skillRatio += calcStatBonus(skill, baseStats, totalBonus, skillLevel);
  const baseLvMod = calcBaseLvMod(skill, baseLevel);

  let minDamage: number;
  let maxDamage: number;
  let critDamage: number;

  if (skill.type === "magical") {
    // ── Magical Damage ──
    const statusMatk = Math.floor(baseLevel / 4) + totalInt + Math.floor(totalInt / 2) + Math.floor(totalDex / 5) + Math.floor(totalLuk / 3);
    const weaponMatk = input.weaponMatk + getRefineMatkBonus(input.weaponLevel, input.weaponRefine);
    const equipMatk = totalBonus.matk || 0;
    const matkRate = 1 + (totalBonus.matkRate || 0) / 100;

    const matkMin = Math.floor((statusMatk + Math.floor(weaponMatk * 0.7) + equipMatk) * matkRate);
    const matkMax = Math.floor((statusMatk + weaponMatk + equipMatk) * matkRate);

    const rawMin = Math.floor(matkMin * skillRatio / 100);
    const rawMax = Math.floor(matkMax * skillRatio / 100);

    const totalMod = raceMod * eleMod * sizeMod * classMod * skillAtkMod * eleTableMod;

    // MDEF reduction: damage × (1000 + MDEF) / (1000 + MDEF × 10)
    const hardMdefReduction = effectiveHardMdef > 0
      ? (1000 + effectiveHardMdef) / (1000 + effectiveHardMdef * 10)
      : 1;

    minDamage = Math.max(1, Math.floor(rawMin * baseLvMod * totalMod * hardMdefReduction) - softMdef);
    maxDamage = Math.max(1, Math.floor(rawMax * baseLvMod * totalMod * hardMdefReduction) - softMdef);
    critDamage = maxDamage;

    const details: DamageDetails = {
      statusAtk: statusMatk, weaponAtk: weaponMatk, equipAtk: equipMatk,
      skillPercent: skillRatio, baseLvScaling: baseLvMod,
      sizePenalty: 100, raceModifier: targetBonuses.race, elementModifier: targetBonuses.element,
      sizeModifier: targetBonuses.size, classModifier: targetBonuses.class,
      skillAtkModifier: skillAtkBonus, longRangeModifier: 0,
      atkRateModifier: totalBonus.matkRate || 0, elementTableMod,
      hardDefReduction: effectiveHardMdef, softDefReduction: softMdef, ignoreDefPercent: totalIgnoreMdef,
    };

    const avgDamage = Math.floor((minDamage + maxDamage) / 2);
    const castCycle = getCastCycle(skill, skillLevel, totalBonus, input.aspd);
    const dps = castCycle > 0 ? Math.floor(avgDamage / (castCycle / 1000)) : 0;

    return {
      minDamage, maxDamage, avgDamage, critDamage,
      hitCount, totalMin: minDamage, totalMax: maxDamage, totalAvg: avgDamage, totalCrit: critDamage,
      dps, castCycle, details,
    };
  } else {
    // ── Physical Damage (standard ATK-based) ──
    return calcPhysicalDamage(input, Math.floor(skillRatio * baseLvMod), 0,
      effectiveHardDef, softDef, targetBonuses, skillAtkBonus, elementTableMod, totalIgnoreDef);
  }
}

// ─── Physical Damage Helper (shared by standard + special skills) ───

function calcPhysicalDamage(
  input: DamageInput,
  finalSkillRatio: number,  // already includes baseLvMod if applicable
  flatBonus: number,        // flat damage added after all modifiers (Tiger Cannon, Gates of Hell)
  effectiveHardDef: number,
  softDef: number,
  targetBonuses: { race: number; element: number; size: number; class: number },
  skillAtkBonus: number,
  elementTableMod: number,
  totalIgnoreDef: number,
): DamageResult {
  const { skill, skillLevel, baseLevel, baseStats, totalBonus, monster } = input;
  const hitCount = getHitCount(skill, skillLevel);
  const bonusStr = totalBonus.str || 0;
  const bonusDex = totalBonus.dex || 0;
  const bonusLuk = totalBonus.luk || 0;
  const totalStr = baseStats.str + bonusStr;
  const totalDex = baseStats.dex + bonusDex;
  const totalLuk = baseStats.luk + bonusLuk;

  // Status ATK
  const isRangedWeapon = ["Bow", "Revolver", "Rifle", "Gatling", "Shotgun", "Grenade", "Musical", "Whip"].includes(input.weaponSubType || "");
  const statusAtk = isRangedWeapon
    ? Math.floor(baseLevel / 4) + Math.floor(totalStr / 5) + totalDex + Math.floor(totalLuk / 3)
    : Math.floor(baseLevel / 4) + totalStr + Math.floor(totalDex / 5) + Math.floor(totalLuk / 3);

  // Weapon ATK with stat modifier
  const wpnMultiplierStat = isRangedWeapon ? totalDex : totalStr;
  const weaponBaseModified = Math.floor(input.weaponAtk * (1 + wpnMultiplierStat / 200));

  // Size penalty (weapon ATK only)
  const sizePenalty = getSizePenalty(input.weaponSubType, monster.size);
  const weaponAtkAfterSize = Math.floor(weaponBaseModified * sizePenalty / 100);

  // Refine ATK
  const refineParts = getRefineAtkParts(input.weaponLevel, input.weaponRefine);

  // Equipment ATK
  const equipAtk = totalBonus.atk || 0;
  const atkRate = 1 + (totalBonus.atkRate || 0) / 100;

  // Range modifier
  const rangeMod = skill.isMelee
    ? (totalBonus.shortAtkRate || 0)
    : (totalBonus.longAtkRate || 0);
  const rangeMultiplier = 1 + rangeMod / 100;

  // ATK variance
  const weaponAtkMin = Math.floor(weaponAtkAfterSize * 0.80) + refineParts.fixed;
  const weaponAtkMax = weaponAtkAfterSize + refineParts.fixed + refineParts.overMax;

  const totalAtkMin = Math.floor((statusAtk + weaponAtkMin + equipAtk) * atkRate);
  const totalAtkMax = Math.floor((statusAtk + weaponAtkMax + equipAtk) * atkRate);

  // Apply skill ratio
  const rawMin = Math.floor(totalAtkMin * finalSkillRatio / 100);
  const rawMax = Math.floor(totalAtkMax * finalSkillRatio / 100);

  // Damage modifiers
  const raceMod = 1 + targetBonuses.race / 100;
  const eleMod = 1 + targetBonuses.element / 100;
  const sizeMod = 1 + targetBonuses.size / 100;
  const classMod = 1 + targetBonuses.class / 100;
  const skillAtkMod = 1 + skillAtkBonus / 100;
  const eleTableMod = elementTableMod / 100;

  const totalMod = raceMod * eleMod * sizeMod * classMod * skillAtkMod * eleTableMod * rangeMultiplier;

  // DEF reduction: damage × (4000 + DEF) / (4000 + DEF × 10)
  const hardDefReduction = effectiveHardDef > 0
    ? (4000 + effectiveHardDef) / (4000 + effectiveHardDef * 10)
    : 1;

  const minDamage = Math.max(1, Math.floor(rawMin * totalMod * hardDefReduction) - softDef + flatBonus);
  const maxDamage = Math.max(1, Math.floor(rawMax * totalMod * hardDefReduction) - softDef + flatBonus);

  // Critical damage: max ATK × 1.4
  const critRaw = Math.floor(totalAtkMax * finalSkillRatio / 100);
  const critAtkRate = 1 + (totalBonus.critAtkRate || 0) / 100;
  const effectiveCritRate = skill.halfCritBonus ? 1 + (critAtkRate - 1) * 0.5 : critAtkRate;
  const critDamage = skill.canCrit
    ? Math.max(1, Math.floor(critRaw * 1.4 * effectiveCritRate * totalMod * hardDefReduction) - softDef + flatBonus)
    : maxDamage;

  const details: DamageDetails = {
    statusAtk,
    weaponAtk: weaponAtkAfterSize + refineParts.fixed + Math.floor(refineParts.overMax / 2),
    equipAtk,
    skillPercent: finalSkillRatio,
    baseLvScaling: skill.baseLvScaling ? calcBaseLvMod(skill, baseLevel) : 1,
    sizePenalty,
    raceModifier: targetBonuses.race,
    elementModifier: targetBonuses.element,
    sizeModifier: targetBonuses.size,
    classModifier: targetBonuses.class,
    skillAtkModifier: skillAtkBonus,
    longRangeModifier: rangeMod,
    atkRateModifier: totalBonus.atkRate || 0,
    elementTableMod,
    hardDefReduction: effectiveHardDef,
    softDefReduction: softDef,
    ignoreDefPercent: totalIgnoreDef,
  };

  const avgDamage = Math.floor((minDamage + maxDamage) / 2);
  const castCycle = getCastCycle(skill, skillLevel, totalBonus, input.aspd);
  const dps = castCycle > 0 ? Math.floor(avgDamage / (castCycle / 1000)) : 0;

  return {
    minDamage, maxDamage, avgDamage, critDamage,
    hitCount, totalMin: minDamage, totalMax: maxDamage, totalAvg: avgDamage, totalCrit: critDamage,
    dps, castCycle, details,
  };
}

// ─── Cast Cycle (total time for one skill usage) ────────────────────

function getCastCycle(
  skill: SkillFormula,
  level: number,
  bonus: EquipBonus,
  aspd: number,
): number {
  const idx = Math.min(level - 1, (skill.maxLevel || 1) - 1);

  if (skill.aegisName === "NORMAL_ATTACK") {
    const atkDelay = aspd >= 190 ? 100 : Math.floor((200 - aspd) / 200 * 2000);
    return Math.max(100, atkDelay);
  }

  let varCast = skill.castTime?.[idx] || 0;
  if (varCast > 0) {
    const varCastRate = 1 + (bonus.variableCastrate || 0) / 100;
    varCast = Math.max(0, Math.floor(varCast * varCastRate));
  }

  let fixCast = skill.fixedCast?.[idx] || 0;
  if (fixCast > 0) {
    const fixCastRate = 1 + (bonus.fixedCastrate || 0) / 100;
    fixCast = Math.max(0, Math.floor(fixCast * fixCastRate));
  }

  let afterDelay = skill.afterCastDelay?.[idx] || 0;
  if (afterDelay > 0) {
    const delayRate = 1 + (bonus.delayrate || 0) / 100;
    afterDelay = Math.max(0, Math.floor(afterDelay * delayRate));
  }

  const cooldown = skill.cooldown?.[idx] || 0;
  const animTime = 500;
  const castTotal = varCast + fixCast + afterDelay + animTime;
  return Math.max(castTotal, cooldown + animTime);
}

// ─── Formatting helpers ─────────────────────────────────────────────

export function formatDamage(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "k";
  return n.toLocaleString("pt-BR");
}

export function formatDps(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M/s";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "k/s";
  return n.toLocaleString("pt-BR") + "/s";
}
