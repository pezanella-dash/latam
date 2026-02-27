/**
 * fix-visual-enchant-stones.mjs
 *
 * Fixes visual enchantment stones (Pedras de Visual) in the database:
 * 1. Changes type from "Etc"/"Usable" to "Card" so they appear in enchant search
 * 2. Adds missing rAthena bonus scripts based on stone names
 *
 * Usage: node scripts/fix-visual-enchant-stones.mjs
 */

import fs from "fs";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "database", "items.json");
const items = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));

// ─── Script mappings based on stone names ─────────────────────────────
// Map patterns in stone names to rAthena bonus scripts

const SCRIPT_MAP = [
  // ─── Basic Stats ─────────────────────────────────────
  [/Pedra de FOR \(/,      "bonus bStr,3;"],
  [/Pedra de INT \(/,      "bonus bInt,3;"],
  [/Pedra de AGI \(/,      "bonus bAgi,3;"],
  [/Pedra de DES \(/,      "bonus bDex,3;"],
  [/Pedra de VIT \(/,      "bonus bVit,3;"],
  [/Pedra de SOR \(/,      "bonus bLuk,3;"],

  // ─── ATQ / ATQM ─────────────────────────────────────
  [/Pedra de ATQ \(Topo\)/,  "bonus bAtkRate,1;"],
  [/Pedra de ATQ \(Meio\)/,  "bonus bAtkRate,1;"],
  [/Pedra de ATQ \(Baixo\)/, "bonus bAtkRate,1;"],
  [/Pedra de ATQM \(Topo\)/,  "bonus bMatkRate,1;"],
  [/Pedra de ATQM \(Meio\)/,  "bonus bMatkRate,1;"],
  [/Pedra de ATQM \(Baixo\)/, "bonus bMatkRate,1;"],

  // ─── DEF / DEFM ─────────────────────────────────────
  [/Pedra de DEF \(/,   "bonus bDef,10;"],
  [/Pedra de DEFM \(/,  "bonus bMdef,3;"],

  // ─── Hit / Flee ──────────────────────────────────────
  [/Pedra de Precisão/,  "bonus bHit,10;"],
  [/Pedra de Esquiva/,   "bonus bFlee,10;"],

  // ─── CRIT ───────────────────────────────────────────
  [/Pedra de CRIT/,      "bonus bCritical,5;"],

  // ─── HP / SP flat ───────────────────────────────────
  [/Pedra de HP \+50/,   "bonus bMaxHP,50;"],
  [/Pedra de SP \+10/,   "bonus bMaxSP,10;"],
  [/Pedra de Mais HP/,   "bonus bMaxHPrate,1;"],
  [/Pedra de Mais SP/,   "bonus bMaxSPrate,1;"],
  [/Pedra de HP máx 1 \(Meio\)/, "bonus bMaxHPrate,1;"],
  [/Pedra de HP máx 1 \(Baixo\)/, "bonus bMaxHPrate,1;"],
  [/Pedra de SP máx 1/,  "bonus bMaxSPrate,1;"],

  // ─── HP/SP Healing & Regen ──────────────────────────
  [/Pedra de Cura Recebida/,  "bonus bHealPower2,2;"],
  [/Pedra de Fator de Cura/,  "bonus bHealPower,3;"],
  [/Pedra de Melhora de HP/,  "bonus bHPrecovRate,10;"],
  [/Pedra de Melhora de SP/,  "bonus bSPrecovRate,10;"],

  // ─── Absorption ─────────────────────────────────────
  [/Pedra de Absorção de HP 1/,  "bonus bHPDrainRate,10,1;"],
  [/Pedra de Absorção de HP 3/,  "bonus bHPDrainRate,30,1;"],
  [/Pedra de Absorção de SP 1/,  "bonus bSPDrainRate,10,1;"],
  [/Pedra de Absorção de SP/,    "bonus bSPDrainRate,10,1;"],

  // ─── Speed / ASPD ──────────────────────────────────
  [/Pedra de Vel\.? ?Atq(?:ue)? ?\+1/,      "bonus bAspd,1;"],
  [/Pedra de Vel\.? ?Ataque 1/,  "bonus bAspd,1;"],

  // ─── Casting ────────────────────────────────────────
  [/Pedra de Fixa -0,3/,       "bonus bFixedCastrate,-300;"],
  [/Pedra de Fixa -0,5/,       "bonus bFixedCastrate,-500;"],
  [/Pedra de Variável -3%/,    "bonus bVariableCastrate,-3;"],
  [/Pedra de Variável -10%/,   "bonus bVariableCastrate,-10;"],
  [/Pedra de Demora 1/,        "bonus bDelayrate,-3;"],
  [/Pedra de Demora 2/,        "bonus bDelayrate,-3;"],
  [/Pedra de Demora 3/,        "bonus bDelayrate,-3;"],

  // ─── Critical / Mortal ──────────────────────────────
  [/Pedra de Mortal 1/,  "bonus bCritAtkRate,3;"],
  [/Pedra de Mortal 2/,  "bonus bCritAtkRate,5;"],
  [/Pedra de Mortal 3/,  "bonus bCritAtkRate,7;"],
  [/Pedra de Mortal 4/,  "bonus bCritAtkRate,10;"],

  // ─── Ranged / Alcance ───────────────────────────────
  [/Pedra de Alcance 1/,  "bonus bLongAtkRate,3;"],
  [/Pedra de Alcance \(Meio\)/, "bonus bLongAtkRate,3;"],

  // ─── Size damage ────────────────────────────────────
  [/Pedra de Grande 1/,   "bonus2 bAddSize,Size_Large,3;"],
  [/Pedra de Médio 1/,    "bonus2 bAddSize,Size_Medium,3;"],
  [/Pedra de Pequeno 1/,  "bonus2 bAddSize,Size_Small,3;"],

  // ─── EXP ────────────────────────────────────────────
  [/Pedra de EXP \+2%/,   "bonus bExpAddRace,RC_All,2;"],

  // ─── Stat Exchange/Change ───────────────────────────
  [/Pedra de Troca de FOR/, "bonus bStr,2;"],
  [/Pedra de Troca de INT/, "bonus bInt,2;"],
  [/Pedra de Troca de AGI/, "bonus bAgi,2;"],
  [/Pedra de Troca de DES/, "bonus bDex,2;"],
  [/Pedra de Troca de VIT/, "bonus bVit,2;"],
  [/Pedra de Troca de SOR/, "bonus bLuk,2;"],
  [/Pedra de Mudança de FOR/, "bonus bStr,2;"],
  [/Pedra de Mudança de INT/, "bonus bInt,2;"],
  [/Pedra de Mudança de AGI/, "bonus bAgi,2;"],
  [/Pedra de Mudança de DES/, "bonus bDex,2;"],
  [/Pedra de Mudança de VIT/, "bonus bVit,2;"],
  [/Pedra de Mudança de SOR/, "bonus bLuk,2;"],

  // ─── Double Attack ──────────────────────────────────
  [/Pedra de Ataque Duplo/, "bonus bDoubleRate,5;"],

  // ─── Utility ────────────────────────────────────────
  [/Pedra de Ganância/,       "/* Ganância: auto-loot */"],
  [/Pedra de Desintoxicar/,   "/* Desintoxicar ao atacar */"],
  [/Pedra de Graça Divina/,   "/* Graça Divina: auto-heal */"],
  [/Pedra de Kyrie Eleison/,  "/* Auto Kyrie Eleison */"],
  [/Pedra de Lex Aeterna/,    "/* Auto Lex Aeterna */"],

  // ─── Graphic stones ─────────────────────────────────
  [/Pedra Gráfica/,           "/* Efeito visual */"],
  [/Pedra de Raios Azuis/,    "/* Efeito visual: raios azuis */"],

  // ─── Class-specific stones: Rune Knight ─────────────
  [/Pedra de Lorde \(Topo\)/,          "/* ATQ +2 por nível de habilidade de Lança */"],
  [/Pedra de Lorde \(Meio\)/,          "bonus2 bSkillAtk,\"LK_SPIRALPIERCE\",15;"],
  [/Pedra de Lorde \(Baixo\)/,         "/* Vel.Ataque +1% por nível de Montaria */"],
  [/Pedra de Cavaleiro Rúnico \(Capa\)/, "bonus2 bSkillAtk,\"RK_DRAGONBREATH\",10; bonus2 bSkillAtk,\"RK_DRAGONBREATH_WATER\",10;"],

  // ─── Warlock ────────────────────────────────────────
  [/Pedra de Arquimago \(Topo\)/,  "/* ATQM +2 por nível de Amplificação Mística */"],
  [/Pedra de Arquimago \(Meio\)/,  "bonus2 bSkillAtk,\"WZ_METEOR\",20;"],
  [/Pedra de Arquimago \(Baixo\)/, "bonus2 bSkillAtk,\"WZ_FIREPILLAR\",20;"],
  [/Pedra de Arcano \(Capa\)/,     "bonus2 bSkillAtk,\"WL_CRIMSONROCK\",10;"],

  // ─── Creator / Genetic ──────────────────────────────
  [/Pedra de Criador \(Topo\)/,      "/* ATQ +2 por nível de Pesquisa de Poções */"],
  [/Pedra de Criador \(Meio\)/,      "/* Efetividade de Cura +2% por Arremessar Poção */"],
  [/Pedra de Criador \(Baixo\)/,     "bonus2 bSkillAtk,\"CR_ACIDDEMONSTRATION\",20;"],
  [/Pedra de Bioquímico \(Capa\)/,   "bonus2 bSkillAtk,\"GN_CARTCANNON\",10;"],

  // ─── High Priest / Arch Bishop ──────────────────────
  [/Pedra de Sumo Sacerdote \(Topo\)/,  "/* Cura +1% por nível de Meditatio */"],
  [/Pedra de Sumo Sacerdote \(Meio\)/,  "/* Dano crítico +2% por Perícia com Maça */"],
  [/Pedra de Sumo Sacerdote \(Baixo\)/, "bonus2 bSkillAtk,\"PR_MAGNUS\",20;"],
  [/Pedra de Arcebispo \(Capa\)/,       "bonus2 bSkillAtk,\"AB_ADORAMUS\",15;"],

  // ─── Paladin / Royal Guard ──────────────────────────
  [/Pedra de Paladino \(Topo\)/,       "/* HP máx +1% por 2 níveis de Fé */"],
  [/Pedra de Paladino \(Meio\)/,       "/* Dano distância +1% por 2 níveis Perícia Lança */"],
  [/Pedra de Paladino \(Baixo\)/,      "bonus2 bSkillAtk,\"LG_OVERBRANDBRANDISH\",20;"],
  [/Pedra de Guardião Real \(Capa\)/,  "bonus2 bSkillAtk,\"LG_OVERBRAND\",15;"],

  // ─── Assassin Cross / Guillotine Cross ──────────────
  [/Pedra de Mercenário \(Topo\)/,  "/* ATQ +2 por nível de Perícia com Katar */"],
  [/Pedra de Mercenário \(Meio\)/,  "/* Precisão +2 por Perícia Mão Esquerda */"],
  [/Pedra de Mercenário \(Baixo\)/, "bonus2 bSkillAtk,\"ASC_METEORASSAULT\",20;"],
  [/Pedra de Sicário \(Capa\)/,     "bonus2 bSkillAtk,\"GC_CROSSIMPACT\",15;"],

  // ─── Sniper / Ranger ────────────────────────────────
  [/Pedra de Atirador de Elite II \(Topo\)/,  "/* Vel.Ataque +1% por 2 níveis Caminho do Vento */"],
  [/Pedra de Atirador de Elite II \(Meio\)/,  "/* Dano distância +1% por 2 Flagelo das Feras */"],
  [/Pedra de Atirador de Elite II \(Baixo\)/, "/* ATQ +2 por Visão Real */"],
  [/Pedra de Sentinela II \(Capa\)/,          "bonus2 bSkillAtk,\"RA_ARROWSTORM\",15;"],

  // ─── Shura ──────────────────────────────────────────
  [/Pedra de Mestre \(Topo\)/,    "/* ATQ +2 por nível de Punhos de Ferro */"],
  [/Pedra de Mestre \(Meio\)/,    "/* Precisão +2 por Cair das Pétalas */"],
  [/Pedra de Mestre \(Baixo\)/,   "bonus2 bSkillAtk,\"MO_CHAINCOMBO\",20;"],
  [/Pedra de Shura \(Capa\)/,     "bonus2 bSkillAtk,\"SR_FALLENEMPIRE\",15;"],
  [/Pedra de Shura II \(Capa\)/,  "bonus2 bSkillAtk,\"SR_KNUCKLEARROW\",15;"],
  [/Pedra de Mestre II \(Topo\)/, "bonus2 bSkillAtk,\"SR_TIGERCANNON\",15;"],
  [/Pedra de Mestre II \(Meio\)/, "bonus2 bSkillAtk,\"SR_RAMPAGEBLASTER\",15;"],
  [/Pedra de Mestre II \(Baixo\)/, "/* ATQ +2 por Proteção Divina */"],

  // ─── Sorcerer ───────────────────────────────────────
  [/Pedra de Professor \(Topo\)/,     "/* Vel.Ataque +1% por Estudo de Livros */"],
  [/Pedra de Professor \(Meio\)/,     "bonus bFixedCastrate,-400; /* Conj. fixa Lanças Duplas -0.4s */"],
  [/Pedra de Professor \(Baixo\)/,    "bonus2 bSkillAtk,\"SA_FLAMELAUNCHER\",20; bonus2 bSkillAtk,\"SA_FROSTWEAPON\",20; bonus2 bSkillAtk,\"SA_LIGHTNINGLOADER\",20;"],
  [/Pedra de Feiticeiro \(Capa\)/,    "bonus2 bSkillAtk,\"SO_PSYCHIC_WAVE\",10;"],
  [/Pedra de Feiticeiro II \(Capa\)/, "bonus2 bSkillAtk,\"SO_DIAMONDDUST\",15;"],
  [/Pedra de Professor II \(Topo\)/,  "bonus2 bSkillAtk,\"SO_EARTHGRAVE\",20;"],
  [/Pedra de Professor II \(Meio\)/,  "bonus2 bSkillAtk,\"SA_FLAMELAUNCHER\",20; bonus2 bSkillAtk,\"SA_FROSTWEAPON\",20; bonus2 bSkillAtk,\"SA_LIGHTNINGLOADER\",20;"],
  [/Pedra de Professor II \(Baixo\)/, "/* ATQM +2 por Desejo Arcano */"],

  // ─── Shadow Chaser ──────────────────────────────────
  [/Pedra de Desordeiro \(Topo\)/,     "/* ATQ +2 por nível de Plágio */"],
  [/Pedra de Desordeiro \(Meio\)/,     "/* Precisão +2 por Olhos de Águia */"],
  [/Pedra de Desordeiro \(Baixo\)/,    "bonus2 bSkillAtk,\"RG_BACKSTAP\",20;"],
  [/Pedra de Renegado \(Capa\)/,       "bonus2 bSkillAtk,\"SC_TRIANGLESHOT\",15;"],
  [/Pedra de Renegado II \(Capa\)/,    "bonus2 bSkillAtk,\"SC_FATALMENACE\",10;"],
  [/Pedra de Desordeiro II \(Topo\)/,  "/* ATQ +2 por Mãos Leves */"],
  [/Pedra de Desordeiro II \(Meio\)/,  "bonus2 bSkillAtk,\"RG_BACKSTAP\",15;"],
  [/Pedra de Desordeiro II \(Baixo\)/, "/* Precisão +1 por Perícia em Esquiva */"],

  // ─── Whitesmith / Mechanic ──────────────────────────
  [/Pedra de Mestre-Ferreiro II \(Topo\)/,  "/* Recarga Arremesso Machado -0.1s por Força Violentíssima */"],
  [/Pedra de Mestre-Ferreiro II \(Meio\)/,  "bonus2 bSkillAtk,\"WS_CARTTERMINATION\",15;"],
  [/Pedra de Mestre-Ferreiro II \(Baixo\)/, "/* Dano distância +1% por 2 níveis Amplificar Poder */"],
  [/Pedra de Mecânico II \(Capa\)/,         "bonus2 bSkillAtk,\"NC_ARMSCANNON\",15;"],

  // ─── High Priest / Arch Bishop II ───────────────────
  [/Pedra de Sumo Sacerdote II \(Topo\)/,  "bonus2 bSkillAtk,\"PR_MAGNUS\",15;"],
  [/Pedra de Sumo Sacerdote II \(Meio\)/,  "/* Dano mágico Sagrado +1% por Assumptio */"],
  [/Pedra de Sumo Sacerdote II \(Baixo\)/, "/* Conj. variável -1% por 2 Kyrie Eleison */"],
  [/Pedra de Arcebispo II \(Capa\)/,       "bonus2 bSkillAtk,\"AB_JUDEX\",15;"],

  // ─── Soul Reaper ────────────────────────────────────
  [/Pedra de Espiritualista \(Topo\)/,     "/* ATQM +2 por Retiro Rápido */"],
  [/Pedra de Espiritualista \(Meio\)/,     "bonus2 bSkillAtk,\"SL_ESMA\",20;"],
  [/Pedra de Espiritualista \(Baixo\)/,    "/* Conj. variável -2% por Kaahi */"],
  [/Pedra de Ceifador de Alma \(Capa\)/,   "bonus2 bSkillAtk,\"SP_CURSEEXPLOSION\",20;"],

  // ─── Star Emperor ───────────────────────────────────
  [/Pedra de Mestre Taekwon \(Topo\)/,  "/* ATQ +2 por Trégua Rápida */"],
  [/Pedra de Mestre Taekwon \(Meio\)/,  "/* Conj. fixa Percepção Solar/Lunar/Estelar -50% */"],
  [/Pedra de Mestre Taekwon \(Baixo\)/, "/* Vel.Ataque +1% por Transmissão Solar */"],
  [/Pedra de Mestre Estelar \(Capa\)/,  "bonus2 bSkillAtk,\"SJ_FALLINGSTAR\",20;"],

  // ─── Kagerou / Oboro ────────────────────────────────
  [/Pedra de Ninja \(Topo\)/,   "bonus bBaseAtk,10; bonus bMatk,10;"],
  [/Pedra de Ninja \(Meio\)/,   "bonus2 bSkillAtk,\"NJ_HUUMA\",20;"],
  [/Pedra de Ninja \(Baixo\)/,  "bonus2 bSkillAtk,\"NJ_KAENSIN\",20; bonus2 bSkillAtk,\"NJ_HYOUSYOURAKU\",20; bonus2 bSkillAtk,\"NJ_KAMAITACHI\",20;"],
  [/Pedra de Kagerou \(Capa\)/, "bonus2 bSkillAtk,\"KO_BAKURETSU\",25;"],
  [/Pedra de Oboro \(Capa\)/,   "bonus2 bSkillAtk,\"KO_MAKIBISHI\",20;"],

  // ─── Rebellion / Gunslinger ─────────────────────────
  [/Pedra de Justiceiro \(Topo\)/,  "/* ATQ +2 por Olhos de Serpente */"],
  [/Pedra de Justiceiro \(Meio\)/,  "bonus2 bSkillAtk,\"GS_DESPERADO\",20;"],
  [/Pedra de Justiceiro \(Baixo\)/, "/* Dano distância +1% por 2 Reação em Cadeia */"],
  [/Pedra de Insurgente \(Capa\)/,  "bonus2 bSkillAtk,\"RL_D_TAIL\",20;"],

  // ─── Doram ──────────────────────────────────────────
  [/Pedra de Invocador \(Topo\)/,  "bonus bBaseAtk,10; bonus bMatk,35;"],
  [/Pedra de Invocador \(Meio\)/,  "bonus2 bSkillAtk,\"SU_LUNATICCARROTBEAT\",20;"],
  [/Pedra de Invocador \(Baixo\)/, "bonus2 bSkillAtk,\"SU_SV_ROOTTWIST\",20;"],
  [/Pedra de Invocador \(Capa\)/,  "bonus2 bSkillAtk,\"SU_PICKYPECK\",20; bonus2 bSkillAtk,\"SU_MEOWMEOW\",20;"],
];

// ─── Process items ────────────────────────────────────────────────────

let fixed = 0;
let scriptsAdded = 0;

for (const item of items) {
  const name = (item.namePt || item.nameEn || "");
  const isVisualStone = name.startsWith("Pedra de") || name.startsWith("Pedra do");

  if (!isVisualStone) continue;

  // Fix type: Etc/Usable → Card (so enchant search finds them)
  if (item.type !== "Card") {
    item.type = "Card";
    item.locations = item.locations || [];
    fixed++;
  }

  // Add missing scripts
  if (!item.script || !item.script.trim()) {
    for (const [pattern, script] of SCRIPT_MAP) {
      if (pattern.test(name)) {
        item.script = script;
        scriptsAdded++;
        break;
      }
    }
  }
}

// ─── Save ─────────────────────────────────────────────────────────────

fs.writeFileSync(DB_PATH, JSON.stringify(items, null, 2), "utf-8");

console.log(`Done! Fixed ${fixed} stone types (→ Card), added ${scriptsAdded} scripts.`);
console.log(`Total visual stones now searchable as enchantments.`);

// Verify
const verify = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
const allStones = verify.filter(i => {
  const n = (i.namePt || i.nameEn || "");
  return (n.startsWith("Pedra de") || n.startsWith("Pedra do")) && i.type === "Card";
});
const stillNoScript = allStones.filter(s => !s.script || !s.script.trim());
console.log(`Verification: ${allStones.length} Card-type visual stones, ${stillNoScript.length} still missing scripts.`);
if (stillNoScript.length > 0) {
  console.log("Missing scripts for:");
  stillNoScript.forEach(s => console.log(`  ${s.id} ${s.namePt || s.nameEn}`));
}
