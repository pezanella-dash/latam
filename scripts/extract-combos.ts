/**
 * Extract item combo/set bonus definitions from items.json descriptions.
 *
 * Parses the ^FA4E09Conjunto^000000 blocks from item descriptions
 * and generates a combos.json with structured bonus data.
 *
 * Usage:
 *   npx tsx scripts/extract-combos.ts
 */

import * as fs from "fs";
import * as path from "path";

const DATA_DIR = path.join(process.cwd(), "data", "database");
const items: any[] = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "items.json"), "utf-8"));

// ─── Build name → id lookup ─────────────────────────────────────────

const nameToId = new Map<string, number>();
const aegisToId = new Map<string, number>();

for (const item of items) {
  if (item.namePt) nameToId.set(item.namePt.toLowerCase(), item.id);
  if (item.nameEn) nameToId.set(item.nameEn.toLowerCase(), item.id);
  if (item.aegisName) aegisToId.set(item.aegisName.toLowerCase(), item.id);
}

function resolveItemId(name: string): number | null {
  const lower = name.toLowerCase();
  return nameToId.get(lower) ?? null;
}

// ─── Strip color codes ──────────────────────────────────────────────

function stripColor(text: string): string {
  return text.replace(/\^[0-9a-fA-F]{6}/g, "").trim();
}

// ─── Bonus parser from Portuguese descriptions ──────────────────────

interface ParsedBonus {
  atk?: number;
  matk?: number;
  def?: number;
  mdef?: number;
  str?: number;
  agi?: number;
  vit?: number;
  int?: number;
  dex?: number;
  luk?: number;
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
  healPower?: number;
  perfectDodge?: number;
  patk?: number;
  smatk?: number;
  // Records
  addRace?: Record<string, number>;
  addEle?: Record<string, number>;
  addSize?: Record<string, number>;
  addClass?: Record<string, number>;
  subRace?: Record<string, number>;
  subEle?: Record<string, number>;
  skillAtk?: Record<string, number>;
  ignoreDefRaceRate?: Record<string, number>;
  ignoreMdefRaceRate?: Record<string, number>;
  // Unparseable bonus lines (for debugging)
  _unparsed?: string[];
}

// Skill name PT → aegis name mapping (for bSkillAtk parsing)
const SKILL_PT_TO_AEGIS: Record<string, string> = {
  // Rune Knight
  "Ignição": "RK_IGNITIONBREAK", "Ignition Break": "RK_IGNITIONBREAK",
  "Onda Sônica": "RK_SONICWAVE", "Sonic Wave": "RK_SONICWAVE",
  "Sopro do Dragão": "RK_DRAGONBREATH", "Bafo do Dragão": "RK_DRAGONBREATH", "Dragon Breath": "RK_DRAGONBREATH",
  "Sopro do Dragão (Água)": "RK_DRAGONBREATH_WATER", "Dragon Breath (Água)": "RK_DRAGONBREATH_WATER",
  "Cem Lanças": "RK_HUNDREDSPEAR", "Lança das Mil Pontas": "RK_HUNDREDSPEAR", "Hundred Spear": "RK_HUNDREDSPEAR",
  "Cortador de Vento": "RK_WINDCUTTER", "Wind Cutter": "RK_WINDCUTTER",
  "Lança do Destino": "LK_SPIRALPIERCE",
  // Royal Guard
  "Ponto de Fuga": "LG_BANISHINGPOINT", "Banishing Point": "LG_BANISHINGPOINT",
  "Lança Canhão": "LG_CANNONSPEAR", "Cannon Spear": "LG_CANNONSPEAR",
  "Overbrand": "LG_OVERBRAND",
  "Raio Gênese": "LG_RAYOFGENESIS", "Genesis": "LG_RAYOFGENESIS", "Gênese": "LG_RAYOFGENESIS",
  "Crux Magnum": "CR_GRANDCROSS", "Grand Cross": "CR_GRANDCROSS",
  "Luz da Criação": "LG_MOONSLASHER",
  // Arch Bishop
  "Adoramus": "AB_ADORAMUS",
  "Judex": "AB_JUDEX",
  "Magnus Exorcismus": "AB_MAGNUS",
  "Duple Light": "AB_DUPLELIGHT",
  "Curar": "AL_HEAL",
  "Lauda Agnus": "AB_LAUDAAGNUS",
  "Lauda Ramus": "AB_LAUDARAMUS",
  "Silentium": "AB_SILENTIUM",
  // Warlock
  "Expansão Espiritual": "WL_SOULEXPANSION", "Soul Expansion": "WL_SOULEXPANSION",
  "Meteoro Escarlate": "WL_CRIMSONROCK", "Crimson Rock": "WL_CRIMSONROCK",
  "Frio Extremo": "WL_JACKFROST", "Jack Frost": "WL_JACKFROST",
  "Cadeia de Relâmpagos": "WL_CHAINLIGHTNING", "Chain Lightning": "WL_CHAINLIGHTNING",
  "Cometa": "WL_COMET", "Comet": "WL_COMET",
  "Abalo Terrestre": "WL_EARTHSTRAIN", "Earth Strain": "WL_EARTHSTRAIN",
  "Chamas de Hela": "WL_HELLINFERNO", "Hell Inferno": "WL_HELLINFERNO",
  // Sorcerer
  "Onda Psíquica": "SO_PSYCHIC_WAVE", "Psychic Wave": "SO_PSYCHIC_WAVE",
  "Lança de Varetyr": "SO_VARETYR_SPEAR", "Varetyr Spear": "SO_VARETYR_SPEAR",
  "Diamante Gelado": "SO_DIAMONDDUST", "Diamond Dust": "SO_DIAMONDDUST",
  // Ranger
  "Chuva de Flechas": "RA_ARROWSTORM", "Tempestade de Flechas": "RA_ARROWSTORM", "Arrow Storm": "RA_ARROWSTORM",
  "Disparo Certeiro": "RA_AIMEDBOLT", "Aimed Bolt": "RA_AIMEDBOLT",
  "Ataque do Warg": "RA_WUGSTRIKE", "Wug Strike": "RA_WUGSTRIKE",
  // Guillotine Cross
  "Impacto Cruzado": "GC_CROSSIMPACT", "Cross Impact": "GC_CROSSIMPACT",
  "Lâminas Retalhadoras": "GC_ROLLINGCUTTER", "Rolling Cutter": "GC_ROLLINGCUTTER",
  "Lançar Lâminas": "GC_CROSSRIPPERSLASHER", "Cross Ripper Slasher": "GC_CROSSRIPPERSLASHER",
  "Destruidor de Almas": "GC_PHANTOMMENACE",
  "Ilusão Sombria": "GC_DARKILLUSION",
  // Shadow Chaser
  "Tiro Triangular": "SC_TRIANGLESHOT", "Triangle Shot": "SC_TRIANGLESHOT",
  "Ameaça Fatal": "SC_FATALMENACE", "Fatal Menace": "SC_FATALMENACE",
  // Mechanic
  "Tornado de Machado": "NC_AXETORNADO", "Axe Tornado": "NC_AXETORNADO",
  "Canhão de Braço": "NC_ARMSCANNON", "Arm Cannon": "NC_ARMSCANNON",
  "Arremesso de Machado": "NC_AXEBOOMERANG", "Axe Boomerang": "NC_AXEBOOMERANG",
  "Impulso Cerrado": "NC_KNUCKLE_BOOST", "Knuckle Boost": "NC_KNUCKLE_BOOST",
  "Braço Vulcânico": "NC_VULCANARM", "Vulcan Arm": "NC_VULCANARM",
  // Genetic
  "Canhão de Carrinho": "GN_CARTCANNON", "Cart Cannon": "GN_CARTCANNON",
  "Explosão de Esporos": "GN_SPORE_EXPLOSION", "Spore Explosion": "GN_SPORE_EXPLOSION",
  // Sura
  "Garra de Tigre": "SR_TIGERCANNON", "Tiger Cannon": "SR_TIGERCANNON",
  "Seta de Punho": "SR_KNUCKLEARROW", "Knuckle Arrow": "SR_KNUCKLEARROW",
  "Detonação Violenta": "SR_RAMPAGEBLASTER", "Rampage Blaster": "SR_RAMPAGEBLASTER",
  "Golpe de Rede": "SR_SKYNETBLOW", "Sky Net Blow": "SR_SKYNETBLOW",
  "Portas do Inferno": "SR_GATEOFHELL", "Gates of Hell": "SR_GATEOFHELL",
  "Combo Rápido": "SR_DRAGONCOMBO", "Dragon Combo": "SR_DRAGONCOMBO",
  "Império Decadente": "SR_FALLENEMPIRE", "Fallen Empire": "SR_FALLENEMPIRE",
  "Onda de Raio": "SR_LIGHTNINGWALK",
  // Minstrel/Wanderer
  "Som Metálico": "WM_METALICSOUND", "Metallic Sound": "WM_METALICSOUND",
  "Reverberação": "WM_REVERBERATION", "Reverberation": "WM_REVERBERATION",
  "Tempestade Severa": "WM_SEVERE_RAINSTORM", "Severe Rainstorm": "WM_SEVERE_RAINSTORM",
  // Kagerou/Oboro
  "Turbilhão de Pétalas": "KO_JYUMONJIKIRI",
  "Turbilhão de Kunais": "KO_HUUMARANKA",
  "Golpe Cruzado": "KO_SETSUDAN",
  // Rebellion
  "Viagem de Ida": "RL_ROUND_TRIP", "Round Trip": "RL_ROUND_TRIP",
  "Chuva de Fogo": "RL_FIRE_RAIN", "Fire Rain": "RL_FIRE_RAIN",
  // Doram
  "Bicada Picky": "SU_PICKYPECK", "Picky Peck": "SU_PICKYPECK",
  "Cenoura Lunática": "SU_LUNATICCARROTBEAT", "Lunatic Carrot Beat": "SU_LUNATICCARROTBEAT",
  // Basics
  "Bash": "SM_BASH",
  "Magnum Break": "SM_MAGNUM",
  "Bowling Bash": "KN_BOWLINGBASH",
  "Brandish Spear": "KN_BRANDISHSPEAR",
  "Assumptio": "HP_ASSUMPTIO",
  "Sonic Blow": "AS_SONICBLOW",
  // Star Emperor / Soul Reaper
  "Castigo de Loki": "SP_SOULEXPLOSION",
  // More skills
  "Mira na Cabeça": "GS_TRACKING",
  "Despertar": "GS_DESPERADO",
  "Disparo Rápido": "GS_RAPIDSHOWER",
  "Tiro de Poeira": "GS_DUST",
  "Força Total": "GS_FULLBUSTER",
  "Golpe de Lâmina": "AS_SONICBLOW",
};

// Race name PT → key mapping
const RACE_PT: Record<string, string> = {
  "Amorfo": "RC_Formless", "Morto-Vivo": "RC_Undead", "Bruto": "RC_Brute",
  "Planta": "RC_Plant", "Inseto": "RC_Insect", "Peixe": "RC_Fish",
  "Demônio": "RC_Demon", "Humanoide": "RC_DemiHuman", "Anjo": "RC_Angel",
  "Dragão": "RC_Dragon", "Jogador Humano": "RC_Player_Human",
  "todas as raças": "RC_All", "todos os monstros": "RC_All",
};

// Element name PT → key mapping
const ELE_PT: Record<string, string> = {
  "Neutro": "Ele_Neutral", "Água": "Ele_Water", "Terra": "Ele_Earth",
  "Fogo": "Ele_Fire", "Vento": "Ele_Wind", "Veneno": "Ele_Poison",
  "Sagrado": "Ele_Holy", "Sombrio": "Ele_Dark", "Fantasma": "Ele_Ghost",
  "Morto-Vivo": "Ele_Undead",
};

function parseBonusLine(line: string, bonus: ParsedBonus): boolean {
  const clean = stripColor(line).trim();
  if (!clean || clean.startsWith("---")) return false;

  let m: RegExpMatchArray | null;

  // ATQ +N (flat ATK)
  if ((m = clean.match(/^ATQ\s*\+(\d+)/i))) {
    bonus.atk = (bonus.atk || 0) + parseInt(m[1]); return true;
  }
  // ATQ da arma +N% (weapon ATK rate)
  if ((m = clean.match(/ATQ da arma\s*\+(\d+)%/i))) {
    bonus.atkRate = (bonus.atkRate || 0) + parseInt(m[1]); return true;
  }
  // ATQM +N (flat MATK)
  if ((m = clean.match(/^ATQM?\s*\+(\d+)/i))) {
    bonus.matk = (bonus.matk || 0) + parseInt(m[1]); return true;
  }
  // Dano mágico +N%
  if ((m = clean.match(/Dano m[aá]gico\s*\+(\d+)%/i))) {
    bonus.matkRate = (bonus.matkRate || 0) + parseInt(m[1]); return true;
  }
  // Dano físico a distância +N%
  if ((m = clean.match(/Dano f[ií]sico a dist[aâ]ncia\s*\+(\d+)%/i))) {
    bonus.longAtkRate = (bonus.longAtkRate || 0) + parseInt(m[1]); return true;
  }
  // Dano físico corpo a corpo +N%
  if ((m = clean.match(/Dano f[ií]sico corpo a corpo\s*\+(\d+)%/i))) {
    bonus.shortAtkRate = (bonus.shortAtkRate || 0) + parseInt(m[1]); return true;
  }
  // Dano crítico +N%
  if ((m = clean.match(/Dano cr[ií]tico\s*\+(\d+)%/i))) {
    bonus.critAtkRate = (bonus.critAtkRate || 0) + parseInt(m[1]); return true;
  }
  // Pós-conjuração -N%
  if ((m = clean.match(/P[oó]s-conjura[çc][aã]o\s*[+-]?(\d+)%/i))) {
    bonus.delayrate = (bonus.delayrate || 0) - parseInt(m[1]); return true;
  }
  // Conjuração variável -N%
  if ((m = clean.match(/Conjura[çc][aã]o vari[aá]vel\s*[+-]?(\d+)%/i))) {
    bonus.variableCastrate = (bonus.variableCastrate || 0) - parseInt(m[1]); return true;
  }
  // Conjuração fixa -Ns
  if ((m = clean.match(/Conjura[çc][aã]o fixa\s*[+-]?(\d+(?:\.\d+)?)/i))) {
    bonus.fixedCastrate = (bonus.fixedCastrate || 0) - Math.floor(parseFloat(m[1]) * 100); return true;
  }
  // HP máx. +N%
  if ((m = clean.match(/HP\s*m[aá]x\.?\s*\+(\d+)%/i))) {
    bonus.maxHpRate = (bonus.maxHpRate || 0) + parseInt(m[1]); return true;
  }
  // SP máx. +N%
  if ((m = clean.match(/SP\s*m[aá]x\.?\s*\+(\d+)%/i))) {
    bonus.maxSpRate = (bonus.maxSpRate || 0) + parseInt(m[1]); return true;
  }
  // HP e SP máx. +N%
  if ((m = clean.match(/HP e SP m[aá]x\.?\s*\+(\d+)%/i))) {
    const v = parseInt(m[1]);
    bonus.maxHpRate = (bonus.maxHpRate || 0) + v;
    bonus.maxSpRate = (bonus.maxSpRate || 0) + v;
    return true;
  }
  // HP máx. +N (flat)
  if ((m = clean.match(/HP\s*m[aá]x\.?\s*\+(\d+)(?!%)/i)) && !clean.includes("%")) {
    bonus.maxHp = (bonus.maxHp || 0) + parseInt(m[1]); return true;
  }
  // SP máx. +N (flat)
  if ((m = clean.match(/SP\s*m[aá]x\.?\s*\+(\d+)(?!%)/i)) && !clean.includes("%")) {
    bonus.maxSp = (bonus.maxSp || 0) + parseInt(m[1]); return true;
  }
  // Efetividade de cura +N%
  if ((m = clean.match(/Efetividade de cura\s*\+(\d+)%/i))) {
    bonus.healPower = (bonus.healPower || 0) + parseInt(m[1]); return true;
  }
  // Velocidade de ataque +N% (percentage)
  if ((m = clean.match(/Velocidade de ataque\s*\+(\d+)%/i))) {
    bonus.aspdRate = (bonus.aspdRate || 0) + parseInt(m[1]); return true;
  }
  // Velocidade de ataque +N (flat, no %)
  if ((m = clean.match(/Velocidade de ataque\s*\+(\d+)(?!%)/i))) {
    bonus.aspd = (bonus.aspd || 0) + parseInt(m[1]); return true;
  }
  // ASPD +N
  if ((m = clean.match(/^ASPD\s*\+(\d+)/i))) {
    bonus.aspd = (bonus.aspd || 0) + parseInt(m[1]); return true;
  }
  // CRIT +N
  if ((m = clean.match(/^CRIT\s*\+(\d+)/i))) {
    bonus.crit = (bonus.crit || 0) + parseInt(m[1]); return true;
  }
  // DEF +N
  if ((m = clean.match(/^DEF\s*\+(\d+)/i))) {
    bonus.def = (bonus.def || 0) + parseInt(m[1]); return true;
  }
  // DEFM +N
  if ((m = clean.match(/^DEFM\s*\+(\d+)/i))) {
    bonus.mdef = (bonus.mdef || 0) + parseInt(m[1]); return true;
  }
  // Stat bonuses: FOR/AGI/VIT/INT/DES/SOR +N
  if ((m = clean.match(/^FOR\s*\+(\d+)/i))) { bonus.str = (bonus.str || 0) + parseInt(m[1]); return true; }
  if ((m = clean.match(/^AGI\s*\+(\d+)/i))) { bonus.agi = (bonus.agi || 0) + parseInt(m[1]); return true; }
  if ((m = clean.match(/^VIT\s*\+(\d+)/i))) { bonus.vit = (bonus.vit || 0) + parseInt(m[1]); return true; }
  if ((m = clean.match(/^INT\s*\+(\d+)/i))) { bonus.int = (bonus.int || 0) + parseInt(m[1]); return true; }
  if ((m = clean.match(/^DES\s*\+(\d+)/i))) { bonus.dex = (bonus.dex || 0) + parseInt(m[1]); return true; }
  if ((m = clean.match(/^SOR\s*\+(\d+)/i))) { bonus.luk = (bonus.luk || 0) + parseInt(m[1]); return true; }
  // Precision (HIT)
  if ((m = clean.match(/Precis[aã]o\s*\+(\d+)/i))) { bonus.hit = (bonus.hit || 0) + parseInt(m[1]); return true; }
  // Esquiva (FLEE)
  if ((m = clean.match(/Esquiva\s*\+(\d+)/i)) && !clean.includes("perfeita")) {
    bonus.flee = (bonus.flee || 0) + parseInt(m[1]); return true;
  }
  // Esquiva perfeita
  if ((m = clean.match(/Esquiva perfeita\s*\+(\d+)/i))) {
    bonus.perfectDodge = (bonus.perfectDodge || 0) + parseInt(m[1]); return true;
  }

  // Dano de [Skill] +N% (single or multi-skill: "Dano de [X] e [Y] +N%")
  {
    const skillMatches = [...clean.matchAll(/\[([^\]]+)\]/g)];
    const valueMatch = clean.match(/\+(\d+)%/);
    if (skillMatches.length > 0 && valueMatch && clean.match(/^Dano de/i)) {
      const value = parseInt(valueMatch[1]);
      for (const sm of skillMatches) {
        const skillName = sm[1];
        const aegis = SKILL_PT_TO_AEGIS[skillName];
        bonus.skillAtk = bonus.skillAtk || {};
        if (aegis) {
          bonus.skillAtk[aegis] = (bonus.skillAtk[aegis] || 0) + value;
        } else {
          bonus.skillAtk[`_PT_${skillName}`] = (bonus.skillAtk[`_PT_${skillName}`] || 0) + value;
        }
      }
      return true;
    }
  }

  // Dano físico contra (race) +N%
  if ((m = clean.match(/Dano f[ií]sico contra (?:oponentes de )?(?:ra[çc]a )?(\w[\w\s-]*?)\s*\+(\d+)%/i))) {
    const raceName = m[1].trim();
    const value = parseInt(m[2]);
    const raceKey = RACE_PT[raceName];
    if (raceKey) {
      bonus.addRace = bonus.addRace || {};
      bonus.addRace[raceKey] = (bonus.addRace[raceKey] || 0) + value;
      return true;
    }
  }

  // Dano contra (class) +N% (Normais/Chefes)
  if ((m = clean.match(/Dano f[ií]sico contra (Normais|Chefes|Boss)\s*\+(\d+)%/i))) {
    const cls = m[1] === "Normais" ? "Class_Normal" : "Class_Boss";
    bonus.addClass = bonus.addClass || {};
    bonus.addClass[cls] = (bonus.addClass[cls] || 0) + parseInt(m[2]);
    return true;
  }

  // Dano físico contra propriedade X +N%
  if ((m = clean.match(/Dano (?:f[ií]sico|m[aá]gico)? ?contra (?:oponentes de )?propriedade (\w+)\s*\+(\d+)%/i))) {
    const eleName = m[1];
    const value = parseInt(m[2]);
    const eleKey = ELE_PT[eleName];
    if (eleKey) {
      bonus.addEle = bonus.addEle || {};
      bonus.addEle[eleKey] = (bonus.addEle[eleKey] || 0) + value;
      return true;
    }
  }

  // Helper: split element names from Portuguese text
  function splitEleNames(text: string): string[] {
    return text.split(/[,]|\s+e\s+/).map(s => s.trim()).filter(Boolean);
  }

  // Dano (físico/mágico) de propriedade X (+/-)N%
  if ((m = clean.match(/Dano (?:f[ií]sico|m[aá]gico)?\s*de propriedade (.+?)\s*([+-])(\d+)%/i))) {
    const eleNames = splitEleNames(m[1]);
    const sign = m[2] === "-" ? -1 : 1;
    const value = parseInt(m[3]) * sign;
    let found = false;
    for (const eleName of eleNames) {
      const eleKey = ELE_PT[eleName];
      if (eleKey) {
        bonus.addEle = bonus.addEle || {};
        bonus.addEle[eleKey] = (bonus.addEle[eleKey] || 0) + value;
        found = true;
      }
    }
    if (found) return true;
  }
  // Dano (físico/mágico) contra oponentes de propriedade X +N%
  if ((m = clean.match(/Dano (?:f[ií]sico|m[aá]gico)?\s*contra (?:oponentes de )?propriedade (.+?)\s*\+(\d+)%/i))) {
    const eleNames = splitEleNames(m[1]);
    const value = parseInt(m[2]);
    let found = false;
    for (const eleName of eleNames) {
      const eleKey = ELE_PT[eleName];
      if (eleKey) {
        bonus.addEle = bonus.addEle || {};
        bonus.addEle[eleKey] = (bonus.addEle[eleKey] || 0) + value;
        found = true;
      }
    }
    if (found) return true;
  }
  // Resistência a propriedade X (+/-)N%
  if ((m = clean.match(/Resist[êe]ncia?\s*(?:a |à )?(?:oponentes da )?propriedade\s+(.+?)\s*([+-])(\d+)%/i))) {
    const eleNames = splitEleNames(m[1]);
    const sign = m[2] === "-" ? -1 : 1;
    const value = parseInt(m[3]) * sign;
    let found = false;
    for (const eleName of eleNames) {
      const eleKey = ELE_PT[eleName];
      if (eleKey) {
        bonus.subEle = bonus.subEle || {};
        bonus.subEle[eleKey] = (bonus.subEle[eleKey] || 0) + value;
        found = true;
      }
    }
    if (found) return true;
  }
  // Resistência a danos físicos a distância +N%
  if ((m = clean.match(/Resist[êe]ncia?\s*a danos f[ií]sicos a dist[aâ]ncia\s*\+(\d+)%/i))) {
    // This is a long-range damage reduction, stored as negative longAtkRate for enemy
    // We'll store it as a special sub-type (not direct EquipBonus)
    return false; // skip for now
  }
  // Resistência as/à raças X e Y +N% (with accented chars)
  if ((m = clean.match(/Resist[êe]ncia?\s*(?:a |à |as |às )?ra[çc]as?\s+(.+?)\s*\+(\d+)%/i))) {
    const raceNames = m[1].replace(/\s*adicional\.?$/i, "").split(/\s+e\s+/).map(s => s.trim());
    const value = parseInt(m[2]);
    for (const raceName of raceNames) {
      const raceKey = RACE_PT[raceName];
      if (raceKey) {
        bonus.subRace = bonus.subRace || {};
        bonus.subRace[raceKey] = (bonus.subRace[raceKey] || 0) + value;
      }
    }
    return true;
  }
  // Dano físico e mágico +N% (both ATK and MATK rate)
  if ((m = clean.match(/Dano f[ií]sico e m[aá]gico\s*\+(\d+)%/i))) {
    const v = parseInt(m[1]);
    bonus.atkRate = (bonus.atkRate || 0) + v;
    bonus.matkRate = (bonus.matkRate || 0) + v;
    return true;
  }

  // Resist. a raça X +N%
  if ((m = clean.match(/Resist[êe]ncia?\s*(?:a |à )?ra[çc]a\s+(\w[\w\s-]*?)\s*\+(\d+)%/i))) {
    const raceName = m[1].trim();
    const value = parseInt(m[2]);
    const raceKey = RACE_PT[raceName];
    if (raceKey) {
      bonus.subRace = bonus.subRace || {};
      bonus.subRace[raceKey] = (bonus.subRace[raceKey] || 0) + value;
      return true;
    }
  }

  // DEF ignorada raça X N%
  if ((m = clean.match(/DEF ignorada\s*(?:da |de )?ra[çc]a\s+(\w[\w\s-]*?)\s*(\d+)%/i))) {
    const raceName = m[1].trim();
    const value = parseInt(m[2]);
    const raceKey = RACE_PT[raceName];
    if (raceKey) {
      bonus.ignoreDefRaceRate = bonus.ignoreDefRaceRate || {};
      bonus.ignoreDefRaceRate[raceKey] = (bonus.ignoreDefRaceRate[raceKey] || 0) + value;
      return true;
    }
  }

  // Dano físico +N% (generic physical damage, = atkRate)
  if ((m = clean.match(/^Dano f[ií]sico\s*\+(\d+)%/i))) {
    bonus.atkRate = (bonus.atkRate || 0) + parseInt(m[1]); return true;
  }
  // Dano mágico -N% (negative magic damage)
  if ((m = clean.match(/^Dano m[aá]gico\s*-(\d+)%/i))) {
    bonus.matkRate = (bonus.matkRate || 0) - parseInt(m[1]); return true;
  }
  // Dano físico contra oponentes de tamanho X +N%
  if ((m = clean.match(/Dano f[ií]sico contra (?:oponentes de )?tamanho\s+(.+?)\s*\+(\d+)%/i))) {
    const sizeMap: Record<string, string> = { pequeno: "Size_Small", "médio": "Size_Medium", "medio": "Size_Medium", grande: "Size_Large" };
    const sizeKey = sizeMap[m[1].toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")];
    if (sizeKey) {
      bonus.addSize = bonus.addSize || {};
      bonus.addSize[sizeKey] = (bonus.addSize[sizeKey] || 0) + parseInt(m[2]);
      return true;
    }
  }
  // Dano físico e mágico contra oponentes de propriedade X +N%
  if ((m = clean.match(/Dano f[ií]sico e m[aá]gico contra (?:oponentes de )?propriedade (.+?)\s*\+(\d+)%/i))) {
    const eleNames = m[1].split(/[,]|\s+e\s+/).map(s => s.trim()).filter(Boolean);
    const value = parseInt(m[2]);
    for (const eleName of eleNames) {
      const eleKey = ELE_PT[eleName] || ELE_PT[eleName.replace("Maldito", "Undead")];
      if (eleKey) {
        bonus.addEle = bonus.addEle || {};
        bonus.addEle[eleKey] = (bonus.addEle[eleKey] || 0) + value;
      }
    }
    return true;
  }

  // "Todos os atributos +N" (bAllStats)
  if ((m = clean.match(/Todos os atributos\s*\+(\d+)/i))) {
    const v = parseInt(m[1]);
    bonus.str = (bonus.str || 0) + v; bonus.agi = (bonus.agi || 0) + v;
    bonus.vit = (bonus.vit || 0) + v; bonus.int = (bonus.int || 0) + v;
    bonus.dex = (bonus.dex || 0) + v; bonus.luk = (bonus.luk || 0) + v;
    return true;
  }
  // DEF e DEFM +N
  if ((m = clean.match(/DEF e DEFM\s*\+(\d+)/i))) {
    const v = parseInt(m[1]);
    bonus.def = (bonus.def || 0) + v; bonus.mdef = (bonus.mdef || 0) + v;
    return true;
  }
  // Precisão perfeita +N (Perfect Hit)
  if ((m = clean.match(/Precis[aã]o perfeita\s*\+(\d+)/i))) {
    bonus.hit = (bonus.hit || 0) + parseInt(m[1]); return true;
  }
  // Dano contra tamanho multi: "Dano contra oponentes de tamanho Médio e Grande +N%"
  if ((m = clean.match(/Dano f[ií]sico contra (?:oponentes de )?tamanho (.+?)\s*\+(\d+)%/i))) {
    const sizeNames = m[1].replace(/\s*adicional\.?$/i, "").split(/\s+e\s+/).map(s => s.trim());
    const value = parseInt(m[2]);
    const sizeMap: Record<string, string> = { pequeno: "Size_Small", medio: "Size_Medium", grande: "Size_Large" };
    for (const sn of sizeNames) {
      const norm = sn.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const sizeKey = sizeMap[norm];
      if (sizeKey) {
        bonus.addSize = bonus.addSize || {};
        bonus.addSize[sizeKey] = (bonus.addSize[sizeKey] || 0) + value;
      }
    }
    return true;
  }
  // Ignora N% da DEF/MDEF das raças X e Y
  if ((m = clean.match(/Ignora (\d+)% da (DEF|DEFM) das ra[çc]as (.+?)\.?$/i))) {
    const value = parseInt(m[1]);
    const isPhys = m[2] === "DEF";
    const raceNames = m[3].split(/\s+e\s+/).map(s => s.trim());
    for (const raceName of raceNames) {
      const raceKey = RACE_PT[raceName];
      if (raceKey) {
        if (isPhys) {
          bonus.ignoreDefRaceRate = bonus.ignoreDefRaceRate || {};
          bonus.ignoreDefRaceRate[raceKey] = (bonus.ignoreDefRaceRate[raceKey] || 0) + value;
        } else {
          bonus.ignoreMdefRaceRate = bonus.ignoreMdefRaceRate || {};
          bonus.ignoreMdefRaceRate[raceKey] = (bonus.ignoreMdefRaceRate[raceKey] || 0) + value;
        }
      }
    }
    return true;
  }

  // Skip non-bonus lines (conditions, flavor text, proc effects)
  if (clean.match(/^(Soma|Arma|Capa|Calçado|Sapato|Armadura|Equipamento|A cada|Ao |No |\d+,?\d* de chance|porcentagem)/i)) return false;
  if (clean.match(/^(Tipo:|Peso:|Nível|Classes:|Equipa|ATQ:|ATQM:|DEF:)/i)) return false;
  if (clean.match(/^(refin|Se |Quando|Durante|Chance de|Custo de SP|Regeneração|Regen\.|Aumenta a velocidade de movimento|Habilita)/i)) return false;
  if (clean.match(/^(Recarga de|chance de autoconj|Ao realizar|Ao receber|Reflete|Toler[aâ]ncia|Cura recebida|Resist[êe]ncia a (?:Malay|Prision|todas as outras|monstros))/i)) return false;
  if (clean.match(/^(Conjura[çc][aã]o vari[aá]vel de \[)/i)) return false; // skill-specific cast time (not generic)
  if (clean.match(/^EXP /i)) return false; // EXP bonuses not relevant for damage

  // If it contains a number, it's probably a bonus we couldn't parse
  if (clean.match(/\+\d+/) || clean.match(/\d+%/)) {
    bonus._unparsed = bonus._unparsed || [];
    bonus._unparsed.push(clean);
  }

  return false;
}

// ─── Combo block extractor ──────────────────────────────────────────

interface ComboBlock {
  sourceItemId: number;
  sourceItemName: string;
  requiredItemNames: string[];
  requiredItemIds: number[];
  baseBonuses: ParsedBonus;
  refineBonuses: { condition: string; minRefine?: number; bonuses: ParsedBonus }[];
  rawLines: string[];
}

function extractCombos(item: any): ComboBlock[] {
  const desc: string[] = item.description;
  if (!desc || desc.length === 0) return [];

  const combos: ComboBlock[] = [];
  let i = 0;

  while (i < desc.length) {
    // Look for Conjunto header
    const stripped = stripColor(desc[i]);
    if (!stripped.startsWith("Conjunto")) { i++; continue; }

    // Found a combo block
    i++; // skip header

    // Collect required items (lines with [ItemName])
    const requiredNames: string[] = [];
    while (i < desc.length) {
      const line = stripColor(desc[i]);
      const nameMatch = line.match(/^\[([^\]]+)\]$/);
      if (nameMatch) {
        requiredNames.push(nameMatch[1]);
        i++;
      } else {
        break;
      }
    }

    if (requiredNames.length === 0) { continue; }

    // Resolve item IDs
    const requiredIds = requiredNames.map(n => resolveItemId(n));

    // Parse bonus lines until separator or next combo
    const baseBonuses: ParsedBonus = {};
    const refineBonuses: { condition: string; minRefine?: number; bonuses: ParsedBonus }[] = [];
    const rawLines: string[] = [];
    let currentRefineBlock: { condition: string; minRefine?: number; bonuses: ParsedBonus } | null = null;

    while (i < desc.length) {
      const line = desc[i];
      const clean = stripColor(line);

      // End of combo block
      if (clean.startsWith("---") || clean.startsWith("Tipo:") || stripColor(line).startsWith("Conjunto")) break;
      if (line.toLowerCase().includes("conjunto") && line.includes("FA4E09")) break;

      rawLines.push(clean);

      // Check for refine conditions
      let refineMatch;
      if ((refineMatch = clean.match(/Soma dos refinos(?:\s+do conjunto)?\s*(\d+)\s*ou mais/i))) {
        currentRefineBlock = { condition: clean, minRefine: parseInt(refineMatch[1]), bonuses: {} };
        refineBonuses.push(currentRefineBlock);
        i++;
        continue;
      }
      if ((refineMatch = clean.match(/refin(?:o|ados?).*?\+(\d+)/i))) {
        currentRefineBlock = { condition: clean, minRefine: parseInt(refineMatch[1]), bonuses: {} };
        refineBonuses.push(currentRefineBlock);
        i++;
        continue;
      }
      // "A cada refino" patterns
      if (clean.match(/A cada refino/i)) {
        currentRefineBlock = { condition: clean, bonuses: {} };
        refineBonuses.push(currentRefineBlock);
        i++;
        continue;
      }

      // Parse bonus
      if (currentRefineBlock) {
        parseBonusLine(line, currentRefineBlock.bonuses);
      } else {
        parseBonusLine(line, baseBonuses);
      }

      i++;
    }

    // Skip separator
    if (i < desc.length && stripColor(desc[i]).startsWith("---")) i++;

    combos.push({
      sourceItemId: item.id,
      sourceItemName: item.namePt || item.nameEn,
      requiredItemNames: requiredNames,
      requiredItemIds: requiredIds.map(id => id ?? -1),
      baseBonuses,
      refineBonuses,
      rawLines,
    });
  }

  return combos;
}

// ─── Main extraction ────────────────────────────────────────────────

console.log("Extracting combos from items.json...");

const allCombos: ComboBlock[] = [];
let itemsWithCombos = 0;
let unresolvedNames = new Set<string>();

for (const item of items) {
  const combos = extractCombos(item);
  if (combos.length > 0) {
    itemsWithCombos++;
    allCombos.push(...combos);

    for (const combo of combos) {
      for (let j = 0; j < combo.requiredItemIds.length; j++) {
        if (combo.requiredItemIds[j] === -1) {
          unresolvedNames.add(combo.requiredItemNames[j]);
        }
      }
    }
  }
}

// Deduplicate combos: same set of items should appear only once
// A combo from item A referencing item B is the same as B referencing A
const deduped = new Map<string, ComboBlock>();

for (const combo of allCombos) {
  // Make a canonical key from all item IDs involved (sorted)
  const allIds = [combo.sourceItemId, ...combo.requiredItemIds].filter(id => id > 0).sort((a, b) => a - b);
  const key = allIds.join(",") + "|" + JSON.stringify(combo.baseBonuses);

  if (!deduped.has(key)) {
    deduped.set(key, combo);
  }
}

const dedupedCombos = Array.from(deduped.values());

// ─── Stats ──────────────────────────────────────────────────────────

const withBonuses = dedupedCombos.filter(c => {
  const b = c.baseBonuses;
  return Object.keys(b).filter(k => k !== "_unparsed").length > 0 || c.refineBonuses.length > 0;
});

const unparsedAll = new Set<string>();
for (const combo of allCombos) {
  for (const line of combo.baseBonuses._unparsed || []) unparsedAll.add(line);
  for (const rb of combo.refineBonuses) {
    for (const line of rb.bonuses._unparsed || []) unparsedAll.add(line);
  }
}

console.log(`\nResults:`);
console.log(`  Items with combos: ${itemsWithCombos}`);
console.log(`  Total combo blocks: ${allCombos.length}`);
console.log(`  Deduplicated: ${dedupedCombos.length}`);
console.log(`  With parseable bonuses: ${withBonuses.length}`);
console.log(`  Unresolved item names: ${unresolvedNames.size}`);
console.log(`  Unparsed bonus lines: ${unparsedAll.size}`);

if (unresolvedNames.size > 0) {
  console.log(`\nUnresolved names (first 30):`);
  let c = 0;
  for (const name of unresolvedNames) {
    if (c++ >= 30) break;
    console.log(`  - ${name}`);
  }
}

if (unparsedAll.size > 0) {
  console.log(`\nUnparsed bonus lines (first 30):`);
  let c = 0;
  for (const line of unparsedAll) {
    if (c++ >= 30) break;
    console.log(`  - ${line}`);
  }
}

// ─── Output ─────────────────────────────────────────────────────────

// Clean up _unparsed from output
function cleanBonus(b: ParsedBonus): ParsedBonus {
  const result = { ...b };
  delete result._unparsed;
  return result;
}

const output = dedupedCombos.map(c => ({
  sourceItemId: c.sourceItemId,
  sourceItemName: c.sourceItemName,
  requiredItemNames: c.requiredItemNames,
  requiredItemIds: c.requiredItemIds,
  allItemIds: [c.sourceItemId, ...c.requiredItemIds].filter(id => id > 0),
  baseBonuses: cleanBonus(c.baseBonuses),
  refineBonuses: c.refineBonuses.map(rb => ({
    condition: rb.condition,
    minCombinedRefine: rb.minRefine,
    bonuses: cleanBonus(rb.bonuses),
  })),
}));

const outputPath = path.join(DATA_DIR, "combos.json");
fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
console.log(`\nWrote ${output.length} combos to ${outputPath}`);
