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
  weaponWeight?: number;   // weapon weight (for Spiral Pierce formula)
  weaponElement: string;   // element of attack (weapon element or skill override)
  aspd: number;            // final ASPD for DPS calc
  // HP/SP — needed for Dragon Breath, Tiger Cannon, Gates of Hell
  maxHp: number;
  currentHp: number;       // Dragon Breath uses currentHP, Gates of Hell uses (max-current)
  maxSp: number;
  currentSp?: number;       // Gates of Hell uses currentSP
  skill: SkillFormula;
  skillLevel: number;
  monster: MonsterTarget;
  activeBuffs?: string[];
  /** Job stat bonuses (added on top of raw allocated baseStats) */
  jobBonus?: { str?: number; agi?: number; vit?: number; int?: number; dex?: number; luk?: number };
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
  /** Expected average damage accounting for effective crit chance vs monster LUK.
   *  For non-crit skills, equals totalAvg. */
  totalExpected: number;
  /** Effective crit chance (0–1) used for totalExpected calculation. */
  critChance: number;
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
  [[100, 100, 100, 100], [100, 100, 100, 100], [100, 100, 100, 100], [100, 100, 100, 100], [100, 100, 100, 100], [100, 100, 100, 100], [100, 100, 100, 100], [100, 100, 100, 100], [90, 70, 50, 0], [100, 100, 100, 100]],
  // Water attacking
  [[100, 100, 100, 100], [25, 0, 0, 0], [100, 100, 100, 100], [150, 175, 200, 200], [90, 80, 70, 60], [150, 150, 125, 125], [100, 100, 100, 100], [100, 100, 100, 100], [100, 100, 100, 100], [100, 100, 100, 100]],
  // Earth attacking
  [[100, 100, 100, 100], [100, 100, 100, 100], [25, 0, 0, 0], [90, 80, 70, 60], [150, 175, 200, 200], [150, 150, 125, 125], [100, 100, 100, 100], [100, 100, 100, 100], [100, 100, 100, 100], [100, 100, 100, 100]],
  // Fire attacking
  [[100, 100, 100, 100], [90, 80, 70, 60], [150, 175, 200, 200], [25, 0, 0, 0], [100, 100, 100, 100], [150, 150, 125, 125], [100, 100, 100, 100], [100, 100, 100, 100], [100, 100, 100, 100], [125, 150, 175, 200]],
  // Wind attacking
  [[100, 100, 100, 100], [150, 175, 200, 200], [90, 80, 70, 60], [100, 100, 100, 100], [25, 0, 0, 0], [150, 150, 125, 125], [100, 100, 100, 100], [100, 100, 100, 100], [100, 100, 100, 100], [100, 100, 100, 100]],
  // Poison attacking
  [[100, 100, 100, 100], [150, 150, 125, 125], [150, 150, 125, 125], [150, 150, 125, 125], [150, 150, 125, 125], [0, 0, 0, 0], [75, 75, 50, 50], [75, 75, 50, 50], [75, 75, 50, 50], [75, 50, 25, 0]],
  // Holy attacking
  [[100, 100, 100, 100], [100, 100, 100, 100], [100, 100, 100, 100], [100, 100, 100, 100], [100, 100, 100, 100], [75, 75, 50, 50], [0, 0, 0, 0], [125, 150, 175, 200], [100, 100, 100, 100], [125, 150, 175, 200]],
  // Dark/Shadow attacking
  [[100, 100, 100, 100], [100, 100, 100, 100], [100, 100, 100, 100], [100, 100, 100, 100], [100, 100, 100, 100], [75, 75, 50, 50], [125, 150, 175, 200], [0, 0, 0, 0], [100, 100, 100, 100], [0, 0, 0, 0]],
  // Ghost attacking
  [[90, 70, 50, 0], [100, 100, 100, 100], [100, 100, 100, 100], [100, 100, 100, 100], [100, 100, 100, 100], [75, 75, 50, 50], [90, 80, 70, 60], [90, 80, 70, 60], [125, 150, 175, 200], [100, 125, 150, 175]],
  // Undead attacking
  [[100, 100, 100, 100], [100, 100, 100, 100], [100, 100, 100, 100], [90, 80, 70, 60], [100, 100, 100, 100], [75, 50, 25, 0], [125, 150, 175, 200], [0, 0, 0, 0], [100, 125, 150, 175], [0, 0, 0, 0]],
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
  Fist: [100, 100, 75],
  Dagger: [100, 75, 50],
  "1hSword": [75, 100, 75],
  "2hSword": [75, 75, 100],
  "1hSpear": [75, 75, 100],
  "2hSpear": [75, 75, 100],
  "1hAxe": [50, 75, 100],
  "2hAxe": [50, 75, 100],
  Mace: [75, 100, 100],
  "2hMace": [100, 100, 100],
  Staff: [100, 100, 100],
  "2hStaff": [100, 100, 100],
  Knuckle: [100, 100, 75],
  Musical: [75, 100, 75],
  Whip: [75, 100, 50],
  Book: [100, 100, 50],
  Katar: [75, 100, 75],
  Bow: [100, 100, 75],
  Revolver: [100, 100, 100],
  Rifle: [100, 100, 100],
  Gatling: [100, 100, 100],
  Shotgun: [100, 100, 100],
  Grenade: [100, 100, 100],
  Huuma: [75, 100, 100],
  Shuriken: [75, 75, 100],
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
  1: { 1: { bonus: 2, over: 0, high: 0 }, 2: { bonus: 4, over: 0, high: 0 }, 3: { bonus: 6, over: 0, high: 0 }, 4: { bonus: 8, over: 0, high: 0 }, 5: { bonus: 10, over: 0, high: 0 }, 6: { bonus: 12, over: 0, high: 0 }, 7: { bonus: 14, over: 0, high: 0 }, 8: { bonus: 16, over: 2, high: 0 }, 9: { bonus: 18, over: 4, high: 0 }, 10: { bonus: 20, over: 6, high: 0 }, 11: { bonus: 22, over: 8, high: 0 }, 12: { bonus: 24, over: 10, high: 0 }, 13: { bonus: 26, over: 12, high: 0 }, 14: { bonus: 28, over: 14, high: 0 }, 15: { bonus: 30, over: 16, high: 0 }, 16: { bonus: 32, over: 18, high: 16 }, 17: { bonus: 34, over: 20, high: 17 }, 18: { bonus: 36, over: 22, high: 18 }, 19: { bonus: 38, over: 24, high: 19 }, 20: { bonus: 40, over: 26, high: 20 } },
  2: { 1: { bonus: 3, over: 0, high: 0 }, 2: { bonus: 6, over: 0, high: 0 }, 3: { bonus: 9, over: 0, high: 0 }, 4: { bonus: 12, over: 0, high: 0 }, 5: { bonus: 15, over: 0, high: 0 }, 6: { bonus: 18, over: 0, high: 0 }, 7: { bonus: 21, over: 5, high: 0 }, 8: { bonus: 24, over: 10, high: 0 }, 9: { bonus: 27, over: 15, high: 0 }, 10: { bonus: 30, over: 20, high: 0 }, 11: { bonus: 33, over: 25, high: 0 }, 12: { bonus: 36, over: 30, high: 0 }, 13: { bonus: 39, over: 35, high: 0 }, 14: { bonus: 42, over: 40, high: 0 }, 15: { bonus: 45, over: 45, high: 0 }, 16: { bonus: 48, over: 50, high: 32 }, 17: { bonus: 51, over: 55, high: 34 }, 18: { bonus: 54, over: 60, high: 36 }, 19: { bonus: 57, over: 65, high: 38 }, 20: { bonus: 60, over: 70, high: 40 } },
  3: { 1: { bonus: 5, over: 0, high: 0 }, 2: { bonus: 10, over: 0, high: 0 }, 3: { bonus: 15, over: 0, high: 0 }, 4: { bonus: 20, over: 0, high: 0 }, 5: { bonus: 25, over: 0, high: 0 }, 6: { bonus: 30, over: 8, high: 0 }, 7: { bonus: 35, over: 16, high: 0 }, 8: { bonus: 40, over: 24, high: 0 }, 9: { bonus: 45, over: 32, high: 0 }, 10: { bonus: 50, over: 40, high: 0 }, 11: { bonus: 55, over: 48, high: 0 }, 12: { bonus: 60, over: 56, high: 0 }, 13: { bonus: 65, over: 64, high: 0 }, 14: { bonus: 70, over: 72, high: 0 }, 15: { bonus: 75, over: 80, high: 0 }, 16: { bonus: 80, over: 88, high: 32 }, 17: { bonus: 85, over: 96, high: 34 }, 18: { bonus: 90, over: 104, high: 36 }, 19: { bonus: 95, over: 112, high: 38 }, 20: { bonus: 100, over: 120, high: 40 } },
  4: { 1: { bonus: 7, over: 0, high: 0 }, 2: { bonus: 14, over: 0, high: 0 }, 3: { bonus: 21, over: 0, high: 0 }, 4: { bonus: 28, over: 0, high: 0 }, 5: { bonus: 35, over: 14, high: 0 }, 6: { bonus: 42, over: 28, high: 0 }, 7: { bonus: 49, over: 42, high: 0 }, 8: { bonus: 56, over: 56, high: 0 }, 9: { bonus: 63, over: 70, high: 0 }, 10: { bonus: 70, over: 84, high: 0 }, 11: { bonus: 77, over: 98, high: 0 }, 12: { bonus: 84, over: 112, high: 0 }, 13: { bonus: 91, over: 126, high: 0 }, 14: { bonus: 98, over: 140, high: 0 }, 15: { bonus: 105, over: 154, high: 0 }, 16: { bonus: 112, over: 168, high: 48 }, 17: { bonus: 119, over: 182, high: 51 }, 18: { bonus: 126, over: 196, high: 54 }, 19: { bonus: 133, over: 210, high: 57 }, 20: { bonus: 140, over: 224, high: 60 } },
  5: { 1: { bonus: 8, over: 0, high: 0 }, 2: { bonus: 16, over: 0, high: 0 }, 3: { bonus: 24, over: 0, high: 0 }, 4: { bonus: 32, over: 0, high: 0 }, 5: { bonus: 40, over: 0, high: 0 }, 6: { bonus: 48, over: 0, high: 0 }, 7: { bonus: 56, over: 0, high: 0 }, 8: { bonus: 64, over: 0, high: 0 }, 9: { bonus: 72, over: 0, high: 0 }, 10: { bonus: 80, over: 0, high: 0 }, 11: { bonus: 88, over: 0, high: 0 }, 12: { bonus: 96, over: 0, high: 0 }, 13: { bonus: 104, over: 0, high: 0 }, 14: { bonus: 112, over: 0, high: 0 }, 15: { bonus: 120, over: 0, high: 0 }, 16: { bonus: 128, over: 0, high: 0 }, 17: { bonus: 136, over: 0, high: 0 }, 18: { bonus: 144, over: 0, high: 0 }, 19: { bonus: 152, over: 0, high: 0 }, 20: { bonus: 160, over: 0, high: 0 } },
};

function getRefineAtkParts(weaponLevel: number, refine: number): { fixed: number; overMax: number } {
  if (refine <= 0 || weaponLevel <= 0) return { fixed: 0, overMax: 0 };
  const table = REFINE_TABLE[weaponLevel];
  if (!table) return { fixed: 0, overMax: 0 };
  const entry = table[Math.min(refine, 20)];
  if (!entry) return { fixed: 0, overMax: 0 };
  // 'high' bonus only applies to items with enchant grade > 0 (getenchantgrade())
  // LATAM server has no grade enchant system, so high is always 0
  return { fixed: entry.bonus, overMax: entry.over };
}

function getRefineMatkBonus(weaponLevel: number, refine: number): number {
  if (refine <= 0 || weaponLevel <= 0) return 0;
  const table = REFINE_TABLE[weaponLevel];
  if (!table) return 0;
  const entry = table[Math.min(refine, 20)];
  if (!entry) return 0;
  // No enchant grade on LATAM — exclude 'high' column
  return entry.bonus;
}

// ─── Bonus helpers ──────────────────────────────────────────────────

function sumPhysBonusForTarget(
  bonus: EquipBonus,
  monster: MonsterTarget,
): { race: number; element: number; size: number; class: number } {
  const race = (bonus.addRace?.[monster.race] || 0) + (bonus.addRace?.RC_All || 0);
  const element = (bonus.addEle?.[monster.element] || 0) + (bonus.addEle?.Ele_All || 0);
  const size = (bonus.addSize?.[monster.size] || 0) + (bonus.addSize?.Size_All || 0);
  const cls = (bonus.addClass?.[monster.class] || 0) + (bonus.addClass?.Class_All || 0);
  return { race, element, size, class: cls };
}

function sumMagicBonusForTarget(
  bonus: EquipBonus,
  monster: MonsterTarget,
  atkElement: string,
): { race: number; element: number; size: number; class: number; magicEle: number } {
  // Magical damage uses bMagicAddRace/Ele/Size/Class, NOT bAddRace etc.
  const race = (bonus.magicAddRace?.[monster.race] || 0) + (bonus.magicAddRace?.RC_All || 0);
  const element = (bonus.magicAddEle?.[monster.element] || 0) + (bonus.magicAddEle?.Ele_All || 0);
  const size = (bonus.magicAddSize?.[monster.size] || 0) + (bonus.magicAddSize?.Size_All || 0);
  const cls = (bonus.magicAddClass?.[monster.class] || 0) + (bonus.magicAddClass?.Class_All || 0);
  // bMagicAtkEle — bonus % for magic of this element type
  const magicEle = (bonus.magicAtkEle?.[atkElement] || 0) + (bonus.magicAtkEle?.Ele_All || 0);
  return { race, element, size, class: cls, magicEle };
}

// ─── Stat Scaling ───────────────────────────────────────────────────
// Some skills add stats to their skillratio (e.g., +INT, +AGI*3, +VIT*2)

function calcStatBonus(skill: SkillFormula, stats: BaseStats, bonus: EquipBonus, skillLevel: number, jb?: DamageInput["jobBonus"]): number {
  if (!skill.statScaling) return 0;
  const totalStr = stats.str + (bonus.str || 0) + (jb?.str || 0);
  const totalAgi = stats.agi + (bonus.agi || 0) + (jb?.agi || 0);
  const totalVit = stats.vit + (bonus.vit || 0) + (jb?.vit || 0);
  const totalInt = stats.int + (bonus.int || 0) + (jb?.int || 0);
  const totalDex = stats.dex + (bonus.dex || 0) + (jb?.dex || 0);
  const totalLuk = stats.luk + (bonus.luk || 0) + (jb?.luk || 0);

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
  if (baseLevel <= 100) return 1;  // rAthena RE_LVL_DMOD: > 100
  const divisor = skill.baseLvDivisor || 100;
  return baseLevel / divisor;
}

// ─── Special Formula: Dragon Breath ─────────────────────────────────
// rAthena battle.cpp: damagevalue = (sstatus->hp / 50 + status_get_max_sp(src) / 4) * skill_lv
// if BaseLv > 100: damagevalue *= BaseLv / 150
// then: damagevalue *= (90 + 10 * dragonTraining) / 100
// NOTE: Uses CURRENT HP (sstatus->hp), not max HP!
// RE_LVL_DMOD(150) — LATAM server uses divisor 150, NOT 100.
// kRO 185/65 rebalance changed to /100, but LATAM has NOT applied this yet.

function calcDragonBreath(input: DamageInput): number {
  const { currentHp, maxSp, skillLevel, baseLevel } = input;
  let damage = Math.floor(currentHp / 50 + maxSp / 4) * skillLevel;
  // RE_LVL_DMOD(150): LATAM server uses /150 divisor
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
  return hpDiff + Math.floor((currentSp || 0) * (1 + skillLevel * 2 / 10)) + baseLevel * 10;
}

// ─── Special Formula: Acid Demonstration (Renewal) ──────────────────
// rAthena aciddemonstration.cpp:
// skillratio = 200 * skill_lv + caster_INT + target_VIT
// Halved vs players.
// NO BaseLv scaling. Standard physical damage with this ratio.

function calcAcidBombRatio(input: DamageInput): number {
  const { skillLevel, baseStats, totalBonus, monster, jobBonus: jb } = input;
  const casterInt = baseStats.int + (totalBonus.int || 0) + (jb?.int || 0);
  const targetVit = monster.stats.vit;
  return 200 * skillLevel + casterInt + targetVit;
}

// ─── Main Damage Calculation ────────────────────────────────────────

export function calculateDamage(input: DamageInput): DamageResult {
  const { skill, skillLevel, monster, baseLevel, baseStats, totalBonus, jobBonus: jb } = input;
  const bonusStr = totalBonus.str || 0;
  const bonusInt = totalBonus.int || 0;
  const bonusDex = totalBonus.dex || 0;
  const bonusLuk = totalBonus.luk || 0;

  const totalStr = baseStats.str + bonusStr + (jb?.str || 0);
  const totalInt = baseStats.int + bonusInt + (jb?.int || 0);
  const totalDex = baseStats.dex + bonusDex + (jb?.dex || 0);
  const totalLuk = baseStats.luk + bonusLuk + (jb?.luk || 0);

  let hitCount = getHitCount(skill, skillLevel);

  // KN_PIERCE: hit count depends on target size (1/2/3 for small/medium/large)
  if (skill.sizeHitCount) {
    switch (monster.size) {
      case "Size_Small": hitCount = 1; break;
      case "Size_Medium": hitCount = 2; break;
      case "Size_Large": hitCount = 3; break;
    }
  }

  // Determine attack element
  // Priority: skill override > bAtkEle (endow/converter) > weapon base element
  let atkElement = input.weaponElement || "Ele_Neutral";
  // Equipment/endow element override (bAtkEle)
  if (totalBonus.atkEle) {
    atkElement = totalBonus.atkEle;
  }
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
  const physBonuses = sumPhysBonusForTarget(totalBonus, monster);
  const magicBonuses = sumMagicBonusForTarget(totalBonus, monster, atkElement);

  // Skill ATK bonus: check the exact skill name first, then any aliases
  let skillAtkBonus = totalBonus.skillAtk?.[skill.aegisName] || 0;

  // Some cards reference parent skills — check aliases
  // e.g. Alma de Eremes boosts GC_CROSSIMPACT, and also GC_CROSSRIPPERSLASHER via hotfix in ro-stats
  if (skill.aegisName === "WM_SEVERE_RAINSTORM") {
    skillAtkBonus += totalBonus.skillAtk?.["WM_SEVERE_RAINSTORM_MELEE"] || 0;
  }

  const skillAtkBonusCombined = skillAtkBonus;

  // DEF calculations (Renewal)
  const hardDef = monster.defense;
  const softDef = Math.floor((monster.level + monster.stats.vit) / 2);
  const hardMdef = monster.magicDefense;
  const softMdef = Math.floor((monster.level + monster.stats.int) / 4);

  // Ignore DEF from skill + equipment (race-based + class-based)
  const skillIgnoreDef = skill.ignoreDefPercent || 0;
  const equipIgnoreDefByRace = (totalBonus.ignoreDefRaceRate?.[monster.race] || 0)
    + (totalBonus.ignoreDefRaceRate?.RC_All || 0);
  const equipIgnoreDefByClass = (totalBonus.ignoreDefClassRate?.[monster.class] || 0)
    + (totalBonus.ignoreDefClassRate?.Class_All || 0);
  const equipIgnoreMdefByRace = (totalBonus.ignoreMdefRaceRate?.[monster.race] || 0)
    + (totalBonus.ignoreMdefRaceRate?.RC_All || 0);
  const equipIgnoreMdefByClass = (totalBonus.ignoreMdefClassRate?.[monster.class] || 0)
    + (totalBonus.ignoreMdefClassRate?.Class_All || 0);
  const totalIgnoreDef = Math.min(100, skillIgnoreDef + equipIgnoreDefByRace + equipIgnoreDefByClass);
  const totalIgnoreMdef = Math.min(100, skillIgnoreDef + equipIgnoreMdefByRace + equipIgnoreMdefByClass);
  const effectiveHardDef = Math.floor(hardDef * (100 - totalIgnoreDef) / 100);
  const effectiveHardMdef = Math.floor(hardMdef * (100 - totalIgnoreMdef) / 100);

  // ─── EDP (Enchant Deadly Poison) — rAthena Renewal formula ───
  // battle_attack_sc_bonus() in battle.cpp:
  //   ATK_RATE(weaponAtk, 250 + edp_lv * 30)  → 4.0× at level 5
  //   ATK_RATE(equipAtk,  250 + edp_lv * 30)  → 4.0× at level 5
  // Same multiplier for both weapon and equip ATK.
  // Excluded skills: no EDP bonus at all (list from rAthena switch statement)
  const hasEdp = input.activeBuffs?.includes("edp") ?? false;
  const edpLevel = 5; // Assume max level EDP
  let edpMult = 1.0;
  if (hasEdp && skill.type === "physical") {
    const edpExcluded = [
      "TF_SPRINKLESAND", "AS_SPLASHER", "ASC_METEORASSAULT",
      "AS_GRIMTOOTH", "AS_VENOMKNIFE",
    ];
    if (!edpExcluded.includes(skill.aegisName)) {
      edpMult = (250 + edpLevel * 30) / 100;  // 4.0× at lv5
    }
  }

  // ── Dragon Breath: completely separate formula ──────────────────
  // rAthena flow: base HP/SP damage → cardfix (additive) → bSkillAtk → bLongAtkRate → element table → DEF
  if (skill.formulaType === "dragonBreath") {
    let damage = calcDragonBreath(input);

    // rAthena cardfix: race/ele/size/class bonuses are ADDITIVE (not multiplicative)
    // battle_calc_cardfix(): cardfix = 1000 + sum(bonuses*10), then damage * cardfix / 1000
    const cardfix = 1000 + physBonuses.race * 10 + physBonuses.element * 10
                        + physBonuses.size * 10 + physBonuses.class * 10;
    const baseDamage = damage; // save for details
    damage = Math.floor(damage * cardfix / 1000);

    // bSkillAtk — separate ATK_ADDRATE (damage += damage * bonus / 100)
    if (skillAtkBonusCombined > 0) {
      damage = damage + Math.floor(damage * skillAtkBonusCombined / 100);
    }

    // bLongAtkRate — separate ATK_ADDRATE
    const longAtkRate = totalBonus.longAtkRate || 0;
    if (longAtkRate > 0) {
      damage = damage + Math.floor(damage * longAtkRate / 100);
    }

    // Element table multiplier
    damage = Math.floor(damage * elementTableMod / 100);

    // DEF reduction (flat subtraction for Dragon Breath)
    const defReduction = effectiveHardDef + softDef;
    damage = Math.max(1, damage - defReduction);

    const details: DamageDetails = {
      statusAtk: baseDamage, weaponAtk: 0, equipAtk: 0,
      skillPercent: 100, baseLvScaling: baseLevel > 100 ? baseLevel / 150 : 1,
      sizePenalty: 100, raceModifier: physBonuses.race, elementModifier: physBonuses.element,
      sizeModifier: physBonuses.size, classModifier: physBonuses.class,
      skillAtkModifier: skillAtkBonusCombined, longRangeModifier: longAtkRate,
      atkRateModifier: 0, elementTableMod,
      hardDefReduction: effectiveHardDef, softDefReduction: softDef, ignoreDefPercent: totalIgnoreDef,
    };
    const castCycle = getCastCycle(skill, skillLevel, totalBonus, input.aspd);
    const dps = castCycle > 0 ? Math.floor(damage / (castCycle / 1000)) : 0;
    return {
      minDamage: damage, maxDamage: damage, avgDamage: damage, critDamage: damage,
      hitCount, totalMin: damage, totalMax: damage, totalAvg: damage, totalCrit: damage,
      totalExpected: damage, critChance: 0,
      dps, castCycle, details,
    };
  }

  // ── Tiger Cannon: HP/SP as skillratio applied to ATK ────────────
  if (skill.formulaType === "tigerCannon") {
    const isCombo = true; // Assumes combo (Fallen Empire → Tiger Cannon)
    const tcRatio = calcTigerCannonRatio(input, isCombo);
    const tcFlat = calcTigerCannonFlat(input, isCombo);
    return calcPhysicalDamage(input, tcRatio, tcFlat, effectiveHardDef, softDef,
      physBonuses, skillAtkBonusCombined, elementTableMod, totalIgnoreDef, edpMult);
  }

  // ── Gates of Hell: ATK-based + flat HP/SP bonus ─────────────────
  if (skill.formulaType === "gatesOfHell") {
    const isCombo = true; // Assumes combo (Fallen Empire → Gates of Hell)
    // Combo: 800 * skill_lv; Normal: 500 * skill_lv (from skill DB damagePercent)
    const baseRatio = isCombo ? 800 * skillLevel : getDamagePercent(skill, skillLevel);
    const baseLvMod = calcBaseLvMod(skill, baseLevel);
    const finalRatio = Math.floor(baseRatio * baseLvMod);
    // Flat bonus: (MaxHP - CurHP) + SP portion + BaseLv portion
    // NOTE: currentHp = maxHp from UI, so HP sacrifice = 0 (user needs to account for HP loss)
    const gohFlat = calcGatesOfHellBonus(input, isCombo);
    return calcPhysicalDamage(input, finalRatio, gohFlat, effectiveHardDef, softDef,
      physBonuses, skillAtkBonusCombined, elementTableMod, totalIgnoreDef, edpMult);
  }

  // ── Acid Demonstration: special ratio using caster INT + target VIT ──
  if (skill.formulaType === "acidBomb") {
    const acidRatio = calcAcidBombRatio(input);
    return calcPhysicalDamage(input, acidRatio, 0, effectiveHardDef, softDef,
      physBonuses, skillAtkBonusCombined, elementTableMod, totalIgnoreDef, edpMult);
  }

  // ── Ignition Break: 1.5x damage if attacking with Fire element ────
  if (skill.formulaType === "ignitionBreak") {
    let ibRatio = getDamagePercent(skill, skillLevel);
    if (atkElement === "Ele_Fire") {
      ibRatio = Math.floor(ibRatio * 1.5);
    }
    const baseLvMod = calcBaseLvMod(skill, baseLevel);
    const finalRatio = Math.floor(ibRatio * baseLvMod);
    return calcPhysicalDamage(input, finalRatio, 0, effectiveHardDef, softDef,
      physBonuses, skillAtkBonusCombined, elementTableMod, totalIgnoreDef, edpMult);
  }

  // ── Asura Strike: ATK * (8 + SP/10) + 250 + (150*skillLevel) ────
  if (skill.formulaType === "asuraStrike") {
    const spFactor = 8 + (input.maxSp / 10);
    const asuraFlat = 250 + (150 * skillLevel);
    const finalRatio = Math.floor(100 * spFactor);
    return calcPhysicalDamage(input, finalRatio, asuraFlat, effectiveHardDef, softDef,
      physBonuses, skillAtkBonusCombined, elementTableMod, totalIgnoreDef, edpMult);
  }

  // ── Spiral Pierce: weight-based calculation ────
  if (skill.formulaType === "spiralPierce") {
    const weaponWeight = input.weaponWeight || 0;
    let spiralRatio = getDamagePercent(skill, skillLevel);
    spiralRatio += Math.floor(weaponWeight * 0.8 / 10 * 50);
    return calcPhysicalDamage(input, spiralRatio, 0, effectiveHardDef, softDef,
      physBonuses, skillAtkBonusCombined, elementTableMod, totalIgnoreDef, edpMult);
  }

  // ── Standard skill calculation ──────────────────────────────────
  let skillRatio = getDamagePercent(skill, skillLevel);
  skillRatio += calcStatBonus(skill, baseStats, totalBonus, skillLevel, jb);

  // Injetar fórmulas complexas dependentes de INT/DEX ou buffs assumidos no nível máximo
  if (skill.formulaType === "diamondDust") {
    // Diamond Dust (kRO Balance): 200 * skill_lv * (INT / 10) base modifier (Simplified since we don't have baseRatio yet)
    // Real rAthena: src/map/battle.cpp -> skillratio += 2*INT + 300(Endow) + INT*skill_lv;
    skillRatio += 2 * totalInt + 1500 + totalInt * skillLevel;
  } else if (skill.formulaType === "earthGrave") {
    // Earth Grave: similar to Diamond Dust
    skillRatio += 2 * totalInt + 1500 + totalInt * skillLevel;
  } else if (skill.formulaType === "varetyrSpear") {
    // Varetyr Spear: (2*INT + 1500 + INT*skill_lv/2) / 3
    skillRatio += Math.floor((2 * totalInt + 1500 + Math.floor(totalInt * skillLevel / 2)) / 3);
  } else if (skill.formulaType === "cartCannon") {
    // Cart Cannon kRO Rebalance 185/65: damage = ((250 * skill_lv) + ((20 * skill_lv) * CartRemodeling))% ATK.
    // The base 350*lv (assuming Cart Remodeling Lv 5) is already inside ro-skill-formulas damagePercent array.
    // We only need to add the doubled INT factor: + INT * 2.
    skillRatio += Math.floor(totalInt * 2);
  } else if (skill.formulaType === "feintBomb") {
    // Feint Bomb (SC_FEINTBOMB) kRO: skillratio = (DEX / 2) * (JobLv / 10) * skill_lv
    // Base skillRatio from ro-skill-formulas is already 200*skillLv, so we just add the stat part
    // Assuming JobLv 60 for 3rd class max
    skillRatio += Math.floor((totalDex / 2) * 6 * skillLevel);
  } else if (skill.formulaType === "acidBomb") {
    // Acid Bomb (CR_ACIDDEMONSTRATION) kRO Rebalance 185/65:
    // Regular physical damage, 200 * skill_lv % ATK (handled by base).
    // Plus INT and target VIT modifiers.
    // targetVit = monster.stats.vit. Caster INT = totalInt.
    skillRatio += totalInt + monster.stats.vit;
  }

  // Warlock kRO 185/65 Balance: Jack Frost deals (1200 + 600 * skill_lv)% MATK against targets inside Frost Status (Frost Misty applied)
  // We assume the target is under Frost Mist debuff for absolute DPS calculations.
  if (skill.aegisName === "WL_JACKFROST") {
    // Base ratio from ro-skill-formulas is 1300/1600/1900/2200/2500 -> 1000 + 300 * lv
    // Frost Debuff bumps it to -> 1200 + 600 * lv 
    // Diff to apply on top: 200 + 300 * lv
    skillRatio += (200 + 300 * skillLevel);
  }

  // Minstrel / Wanderer kRO 185/65 Balance: Voice Lessons increases damage for Reverberation and Great Echo
  // We assume Voice Lessons is maxed out at Level 10 for absolute DPS calculations.
  if (skill.aegisName === "WM_REVERBERATION" || skill.aegisName === "WA_GREAT_ECHO") {
    // VoiceLessons Level 10 gives additional modifiers to skill ratios.
    // E.g., Great Echo = Base Damage + (VoiceLessons * 100)% + (BaseLv/100) scaling
    // Reverberation = Base Damage + (VoiceLessons * 50)% + (BaseLv/100) scaling
    const voiceLessonsLv = 10;
    if (skill.aegisName === "WA_GREAT_ECHO") skillRatio += (voiceLessonsLv * 100);
    if (skill.aegisName === "WM_REVERBERATION") skillRatio += (voiceLessonsLv * 50);
  }

  if (skill.aegisName === "SR_KNUCKLEARROW" && monster.class === "Class_Boss") {
    skillRatio += 100 * skillLevel;
  }

  const baseLvMod = calcBaseLvMod(skill, baseLevel);

  if (skill.type === "magical") {
    // ── Magical Damage (rAthena Renewal pipeline) ──
    // Pipeline: MATK → cardfix(APPLY_CARDFIX_RE) → skillratio → MDEF → bSkillAtk → element fix
    // Ref: rAthena battle.cpp battle_calc_magic_attack + battle_calc_cardfix
    const statusMatk = Math.floor(baseLevel / 4) + totalInt + Math.floor(totalInt / 2) + Math.floor(totalDex / 5) + Math.floor(totalLuk / 3);
    const weaponMatk = input.weaponMatk + getRefineMatkBonus(input.weaponLevel, input.weaponRefine);
    const equipMatk = totalBonus.matk || 0;
    const matkRate = 1 + (totalBonus.matkRate || 0) / 100;

    const matkMin = Math.floor((statusMatk + Math.floor(weaponMatk * 0.7) + equipMatk) * matkRate);
    const matkMax = Math.floor((statusMatk + weaponMatk + equipMatk) * matkRate);

    // MDEF reduction: damage × (1000 + MDEF) / (1000 + MDEF × 10)
    const hardMdefReduction = effectiveHardMdef > 0
      ? (1000 + effectiveHardMdef) / (1000 + effectiveHardMdef * 10)
      : 1;

    // ── Step 1: Cardfix — APPLY_CARDFIX_RE (sequential, multiplicative with floor) ──
    // rAthena Renewal order: size → race2 → ele → debuffs → atkEle → race → class
    // Each category applied separately: damage = damage + floor(damage * bonus / 100)
    let magDmgMin = matkMin;
    let magDmgMax = matkMax;

    // Size (bMagicAddSize)
    if (magicBonuses.size !== 0) {
      magDmgMin = magDmgMin + Math.floor(magDmgMin * magicBonuses.size / 100);
      magDmgMax = magDmgMax + Math.floor(magDmgMax * magicBonuses.size / 100);
    }
    // Element defense (bMagicAddEle — target's defensive element)
    if (magicBonuses.element !== 0) {
      magDmgMin = magDmgMin + Math.floor(magDmgMin * magicBonuses.element / 100);
      magDmgMax = magDmgMax + Math.floor(magDmgMax * magicBonuses.element / 100);
    }
    // Attack element (bMagicAtkEle — caster's magic element bonus, e.g. +Holy%)
    if (magicBonuses.magicEle !== 0) {
      magDmgMin = magDmgMin + Math.floor(magDmgMin * magicBonuses.magicEle / 100);
      magDmgMax = magDmgMax + Math.floor(magDmgMax * magicBonuses.magicEle / 100);
    }
    // Race (bMagicAddRace)
    if (magicBonuses.race !== 0) {
      magDmgMin = magDmgMin + Math.floor(magDmgMin * magicBonuses.race / 100);
      magDmgMax = magDmgMax + Math.floor(magDmgMax * magicBonuses.race / 100);
    }
    // Class (bMagicAddClass — boss/normal)
    if (magicBonuses.class !== 0) {
      magDmgMin = magDmgMin + Math.floor(magDmgMin * magicBonuses.class / 100);
      magDmgMax = magDmgMax + Math.floor(magDmgMax * magicBonuses.class / 100);
    }

    // ── Step 2: Skill Ratio × BaseLv scaling (RE_LVL_DMOD) ──
    const effectiveSkillRatio = Math.floor(skillRatio * baseLvMod);
    magDmgMin = Math.floor(magDmgMin * effectiveSkillRatio / 100);
    magDmgMax = Math.floor(magDmgMax * effectiveSkillRatio / 100);

    // ── Step 3: MDEF reduction ──
    magDmgMin = Math.floor(magDmgMin * hardMdefReduction);
    magDmgMax = Math.floor(magDmgMax * hardMdefReduction);
    // Soft MDEF subtraction
    magDmgMin = Math.max(1, magDmgMin - softMdef);
    magDmgMax = Math.max(1, magDmgMax - softMdef);

    // ── Step 4: bSkillAtk — post-DEF (pc_skillatk_bonus) ──
    if (skillAtkBonusCombined > 0) {
      magDmgMin = magDmgMin + Math.floor(magDmgMin * skillAtkBonusCombined / 100);
      magDmgMax = magDmgMax + Math.floor(magDmgMax * skillAtkBonusCombined / 100);
    }

    // ── Step 5: Element table (battle_attr_fix) ──
    magDmgMin = Math.floor(magDmgMin * elementTableMod / 100);
    magDmgMax = Math.floor(magDmgMax * elementTableMod / 100);

    const perHitMin = magDmgMin;
    const perHitMax = magDmgMax;

    // perHitDamage: bolt spells and ground ticks calculate damage separately per hit
    const hitMult = skill.perHitDamage && hitCount > 1 ? hitCount : 1;
    const minDamage = perHitMin * hitMult;
    const maxDamage = perHitMax * hitMult;
    const critDamage = maxDamage;

    const details: DamageDetails = {
      statusAtk: statusMatk, weaponAtk: weaponMatk, equipAtk: equipMatk,
      skillPercent: skillRatio, baseLvScaling: baseLvMod,
      sizePenalty: 100, raceModifier: magicBonuses.race, elementModifier: magicBonuses.element,
      sizeModifier: magicBonuses.size, classModifier: magicBonuses.class,
      skillAtkModifier: skillAtkBonusCombined, longRangeModifier: magicBonuses.magicEle,
      atkRateModifier: totalBonus.matkRate || 0, elementTableMod: elementTableMod,
      hardDefReduction: effectiveHardMdef, softDefReduction: softMdef, ignoreDefPercent: totalIgnoreMdef,
    };

    const avgDamage = Math.floor((minDamage + maxDamage) / 2);
    const castCycle = getCastCycle(skill, skillLevel, totalBonus, input.aspd);
    const dps = castCycle > 0 ? Math.floor(avgDamage / (castCycle / 1000)) : 0;

    return {
      minDamage, maxDamage, avgDamage, critDamage,
      hitCount, totalMin: minDamage, totalMax: maxDamage, totalAvg: avgDamage, totalCrit: critDamage,
      totalExpected: avgDamage, critChance: 0,
      dps, castCycle, details,
    };
  } else {
    // ── Physical Damage (standard ATK-based) ──
    let finalSkillRatio = Math.floor(skillRatio * baseLvMod);
    // postBaseLvFlat: flat ratio added AFTER RE_LVL_DMOD (e.g. CRS spin stacks)
    if (skill.postBaseLvFlat) {
      finalSkillRatio += skill.postBaseLvFlat;
    }

    return calcPhysicalDamage(input, finalSkillRatio, 0,
      effectiveHardDef, softDef, physBonuses, skillAtkBonusCombined, elementTableMod, totalIgnoreDef, edpMult);
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
  edpMult: number = 1.0,  // EDP multiplier for weapon+equip ATK (4.0× at lv5)
): DamageResult {
  const { skill, skillLevel, baseLevel, baseStats, totalBonus, monster, jobBonus: jb } = input;
  let hitCount = getHitCount(skill, skillLevel);
  // KN_PIERCE: size-based hit count
  if (skill.sizeHitCount) {
    switch (monster.size) {
      case "Size_Small": hitCount = 1; break;
      case "Size_Medium": hitCount = 2; break;
      case "Size_Large": hitCount = 3; break;
    }
  }

  const bonusStr = (totalBonus.str || 0);
  const bonusDex = (totalBonus.dex || 0);
  const bonusLuk = (totalBonus.luk || 0);
  const totalStr = baseStats.str + bonusStr + (jb?.str || 0);
  const totalDex = baseStats.dex + bonusDex + (jb?.dex || 0);
  const totalLuk = baseStats.luk + bonusLuk + (jb?.luk || 0);

  // 1. Status ATK (Base Stats only, never affected by Weapon Size or EDP)
  const isRangedWeapon = ["Bow", "Revolver", "Rifle", "Gatling", "Shotgun", "Grenade", "Musical", "Whip"].includes(input.weaponSubType || "");
  const statusAtk = isRangedWeapon
    ? Math.floor(baseLevel / 4) + Math.floor(totalStr / 5) + totalDex + Math.floor(totalLuk / 3)
    : Math.floor(baseLevel / 4) + totalStr + Math.floor(totalDex / 5) + Math.floor(totalLuk / 3);

  // 2. Weapon ATK with stat scaling
  const wpnMultiplierStat = isRangedWeapon ? totalDex : totalStr;
  const weaponBaseModified = Math.floor(input.weaponAtk * (1 + wpnMultiplierStat / 200));

  // weaponAtkRate: Overthrust (+25%), Overthrust Max (+100%), Spear Dynamo (+25%)
  const weaponAtkRateMod = 1 + (totalBonus.weaponAtkRate || 0) / 100;
  const weaponBaseWithOT = Math.floor(weaponBaseModified * weaponAtkRateMod);

  // Size penalty (only affects Weapon ATK)
  const sizePenalty = input.totalBonus.noSizeFix ? 100 : getSizePenalty(input.weaponSubType, monster.size);
  const weaponAtkAfterSize = Math.floor(weaponBaseWithOT * sizePenalty / 100);

  // Refine ATK (Flat bonus added to Weapon ATK variance)
  const refineParts = getRefineAtkParts(input.weaponLevel, input.weaponRefine);

  // Weapon ATK = base after size + refine bonus
  const weaponAtkMin = weaponAtkAfterSize + refineParts.fixed;
  const weaponAtkMax = weaponAtkAfterSize + refineParts.fixed + refineParts.overMax;

  // 3. Equipment ATK (Cards, Gear, Buffs - FLAT values)
  const equipAtk = (totalBonus.atk || 0);
  const atkRate = 1 + (totalBonus.atkRate || 0) / 100;

  // 4. EDP: Same multiplier for weapon and equip ATK (rAthena Renewal)
  // ATK_RATE(weaponAtk, 250 + edp_lv * 30) → 4.0× at lv5
  // ATK_RATE(equipAtk,  250 + edp_lv * 30) → 4.0× at lv5
  const weaponAtkMinEDP = Math.floor(weaponAtkMin * edpMult);
  const weaponAtkMaxEDP = Math.floor(weaponAtkMax * edpMult);
  const equipAtkEDP = Math.floor(equipAtk * edpMult);

  // 5. Range modifier
  let rangeMod = skill.isMelee ? (totalBonus.shortAtkRate || 0) : (totalBonus.longAtkRate || 0);

  // Cross Ripper Slasher uses long range modifiers despite isMelee flag
  if (skill.aegisName === "GC_CROSSRIPPERSLASHER") {
    rangeMod = (totalBonus.longAtkRate || 0);
  }

  // Raw damage = (StatusATK + WeaponATK_EDP + EquipATK_EDP) * AtkRate
  const calcRawDamage = (wAtk: number, eAtk: number) => Math.floor((statusAtk + wAtk + eAtk) * atkRate);

  // Weapon variance: skills always use max weapon ATK, only normal attacks have 80-100% variance
  const varianceMod = skill.aegisName === "NORMAL_ATTACK" ? 0.8 : 1;

  const rawMin = calcRawDamage(Math.floor(weaponAtkMinEDP * varianceMod), equipAtkEDP);
  const rawMax = calcRawDamage(weaponAtkMaxEDP, equipAtkEDP);

  // 6. Apply final skill ratio
  let skillDmgMin = Math.floor(rawMin * (finalSkillRatio / 100));
  let skillDmgMax = Math.floor(rawMax * (finalSkillRatio / 100));

  // 7. Flat Damage Bonuses (Tiger Cannon, Gates of Hell) AFTER skill ratio
  skillDmgMin += flatBonus;
  skillDmgMax += flatBonus;

  // 8. Card fix: rAthena battle_calc_cardfix() — race/ele/size/class are ADDITIVE
  const cardfix = 1000 + targetBonuses.race * 10 + targetBonuses.element * 10
                       + targetBonuses.size * 10 + targetBonuses.class * 10;
  let damageBeforeDefMin = Math.floor(skillDmgMin * cardfix / 1000);
  let damageBeforeDefMax = Math.floor(skillDmgMax * cardfix / 1000);

  // Range modifier (bLongAtkRate/bShortAtkRate) — separate ATK_ADDRATE
  if (rangeMod !== 0) {
    damageBeforeDefMin = damageBeforeDefMin + Math.floor(damageBeforeDefMin * rangeMod / 100);
    damageBeforeDefMax = damageBeforeDefMax + Math.floor(damageBeforeDefMax * rangeMod / 100);
  }

  // 8b. Advance Katar Mastery (rAthena step 15: AFTER skill ratio, BEFORE DEF)
  // ATK_ADDRATE(wd.damage, 10 + 2 * katar_skill) — assumed max lv10 = +30%
  if (input.weaponSubType === "Katar") {
    damageBeforeDefMin = Math.floor(damageBeforeDefMin * 130 / 100);
    damageBeforeDefMax = Math.floor(damageBeforeDefMax * 130 / 100);
  }

  // 9. Hard DEF reduction: Renewal formula
  const defReduction = effectiveHardDef > 0
    ? (4000 + effectiveHardDef) / (4000 + effectiveHardDef * 10)
    : 1;

  // 10. Final Damage (subtract soft DEF)
  let minDamageBeforeCrit = Math.max(1, Math.floor(damageBeforeDefMin * defReduction) - softDef);
  let maxDamageBeforeCrit = Math.max(1, Math.floor(damageBeforeDefMax * defReduction) - softDef);

  // 10b. Post-DEF modifiers — separate ATK_ADDRATE steps (rAthena integer math)
  // bSkillAtk
  if (skillAtkBonus > 0) {
    minDamageBeforeCrit = minDamageBeforeCrit + Math.floor(minDamageBeforeCrit * skillAtkBonus / 100);
    maxDamageBeforeCrit = maxDamageBeforeCrit + Math.floor(maxDamageBeforeCrit * skillAtkBonus / 100);
  }
  // Element table
  minDamageBeforeCrit = Math.floor(minDamageBeforeCrit * elementTableMod / 100);
  maxDamageBeforeCrit = Math.floor(maxDamageBeforeCrit * elementTableMod / 100);

  // Dark Claw: +150% melee damage (total 2.5x) applied after DEF
  if (skill.isMelee && input.activeBuffs?.includes("dark_claw")) {
    minDamageBeforeCrit = Math.floor(minDamageBeforeCrit * 2.5);
    maxDamageBeforeCrit = Math.floor(maxDamageBeforeCrit * 2.5);
  }

  // perHitDamage: bolt/ground-tick skills calculate damage separately per hit
  const hitMult = skill.perHitDamage && hitCount > 1 ? hitCount : 1;
  const minDamage = Math.max(1, minDamageBeforeCrit) * hitMult;
  const maxDamage = Math.max(1, maxDamageBeforeCrit) * hitMult;

  // 11. Critical damage: max variance * 1.4 baseline + AKM + post-DEF mods
  let critRaw = Math.floor(damageBeforeDefMax * 1.4);

  const critAtkRate = 1 + (totalBonus.critAtkRate || 0) / 100;
  const effectiveCritRate = skill.halfCritBonus ? 1 + (critAtkRate - 1) * 0.5 : critAtkRate;

  let baseCritDamage = Math.max(1, Math.floor(critRaw * effectiveCritRate * defReduction) - softDef);
  // Apply post-DEF modifiers (bSkillAtk + eleTable) to crit — same integer math
  if (skillAtkBonus > 0) {
    baseCritDamage = baseCritDamage + Math.floor(baseCritDamage * skillAtkBonus / 100);
  }
  baseCritDamage = Math.floor(baseCritDamage * elementTableMod / 100);

  if (skill.isMelee && input.activeBuffs?.includes("dark_claw")) {
    baseCritDamage = Math.floor(baseCritDamage * 2.5);
  }

  const critDamage = skill.canCrit ? baseCritDamage * hitMult : maxDamage;

  const details: DamageDetails = {
    statusAtk,
    weaponAtk: Math.floor((weaponAtkMin + weaponAtkMax) / 2),
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

  // Effective crit chance vs this monster (for kill counter expected damage)
  let critChance = 0;
  if (skill.canCrit) {
    const playerCrit = 1 + Math.floor(totalLuk * 0.3) + (totalBonus.crit || 0);
    const isKatar = input.weaponSubType === "Katar";
    // Katar doubles crit rate; halfCritBonus skills halve it
    const rawCrit = isKatar ? playerCrit * 2 : playerCrit;
    const skillCritMod = skill.halfCritBonus ? 0.5 : 1.0;
    const monsterLukPenalty = Math.floor(monster.stats.luk / 25);
    const effectiveCrit = Math.round(rawCrit * skillCritMod) - monsterLukPenalty;
    critChance = Math.max(0, Math.min(100, effectiveCrit)) / 100;
  }
  const totalExpected = skill.canCrit && critChance > 0
    ? Math.floor(critChance * critDamage + (1 - critChance) * avgDamage)
    : avgDamage;

  return {
    minDamage, maxDamage, avgDamage, critDamage,
    hitCount, totalMin: minDamage, totalMax: maxDamage, totalAvg: avgDamage, totalCrit: critDamage,
    totalExpected, critChance,
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
    // Flat fixed cast reduction (bFixedCast) — e.g. Temporal DEX Boots -500ms
    const flatFixedReduction = bonus.fixedCast || 0;
    fixCast = Math.max(0, fixCast + flatFixedReduction); // flatFixedReduction is negative
    // Percentage fixed cast reduction (bFixedCastrate) — e.g. -50%
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
