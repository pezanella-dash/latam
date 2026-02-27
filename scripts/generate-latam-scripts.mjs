/**
 * generate-latam-scripts.mjs
 *
 * Parses Portuguese descriptions of LATAM-exclusive items
 * and generates approximate rAthena bonus scripts.
 *
 * Usage: node scripts/generate-latam-scripts.mjs
 */

import fs from "fs";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "database", "items.json");
const items = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));

function stripColor(text) {
  return text.replace(/\^[0-9a-fA-F]{6}/g, "");
}

// ─── Bonus pattern matchers ──────────────────────────────────────────
// Each returns an array of script lines or null

const PATTERNS = [
  // === STATS ===
  // "FOR +2" / "AGI +3" etc
  { re: /^FOR\s*\+(\d+)/i, gen: (m) => `bonus bStr,${m[1]};` },
  { re: /^AGI\s*\+(\d+)/i, gen: (m) => `bonus bAgi,${m[1]};` },
  { re: /^VIT\s*\+(\d+)/i, gen: (m) => `bonus bVit,${m[1]};` },
  { re: /^INT\s*\+(\d+)/i, gen: (m) => `bonus bInt,${m[1]};` },
  { re: /^DES\s*\+(\d+)/i, gen: (m) => `bonus bDex,${m[1]};` },
  { re: /^SOR\s*\+(\d+)/i, gen: (m) => `bonus bLuk,${m[1]};` },

  // "FOR e AGI +2" / "VIT e DES +2"
  { re: /^FOR e AGI\s*\+(\d+)/i, gen: (m) => `bonus bStr,${m[1]};\nbonus bAgi,${m[1]};` },
  { re: /^FOR e VIT\s*\+(\d+)/i, gen: (m) => `bonus bStr,${m[1]};\nbonus bVit,${m[1]};` },
  { re: /^FOR e INT\s*\+(\d+)/i, gen: (m) => `bonus bStr,${m[1]};\nbonus bInt,${m[1]};` },
  { re: /^FOR e DES\s*\+(\d+)/i, gen: (m) => `bonus bStr,${m[1]};\nbonus bDex,${m[1]};` },
  { re: /^FOR e SOR\s*\+(\d+)/i, gen: (m) => `bonus bStr,${m[1]};\nbonus bLuk,${m[1]};` },
  { re: /^AGI e VIT\s*\+(\d+)/i, gen: (m) => `bonus bAgi,${m[1]};\nbonus bVit,${m[1]};` },
  { re: /^AGI e INT\s*\+(\d+)/i, gen: (m) => `bonus bAgi,${m[1]};\nbonus bInt,${m[1]};` },
  { re: /^AGI e DES\s*\+(\d+)/i, gen: (m) => `bonus bAgi,${m[1]};\nbonus bDex,${m[1]};` },
  { re: /^VIT e DES\s*\+(\d+)/i, gen: (m) => `bonus bVit,${m[1]};\nbonus bDex,${m[1]};` },
  { re: /^VIT e INT\s*\+(\d+)/i, gen: (m) => `bonus bVit,${m[1]};\nbonus bInt,${m[1]};` },
  { re: /^INT e DES\s*\+(\d+)/i, gen: (m) => `bonus bInt,${m[1]};\nbonus bDex,${m[1]};` },
  { re: /^INT e SOR\s*\+(\d+)/i, gen: (m) => `bonus bInt,${m[1]};\nbonus bLuk,${m[1]};` },

  // "Todos os atributos +X"
  { re: /^Todos os atributos\s*\+(\d+)/i, gen: (m) => `bonus bAllStats,${m[1]};` },

  // === ATK / MATK ===
  { re: /^ATQ e ATQM\s*\+(\d+)/i, gen: (m) => `bonus bBaseAtk,${m[1]};\nbonus bMatk,${m[1]};` },
  { re: /^ATQ\s*\+(\d+)\.\s*ATQM\s*\+(\d+)/i, gen: (m) => `bonus bBaseAtk,${m[1]};\nbonus bMatk,${m[2]};` },
  { re: /^ATQ\s*\+(\d+)/i, gen: (m) => `bonus bBaseAtk,${m[1]};` },
  { re: /^ATQM\s*\+(\d+)/i, gen: (m) => `bonus bMatk,${m[1]};` },

  // ATQ da arma +X%
  { re: /^ATQ da arma\s*\+(\d+)%/i, gen: (m) => `bonus bAtkRate,${m[1]};` },

  // === DEF / MDEF ===
  { re: /^DEF\s*\+(\d+)/i, gen: (m) => `bonus bDef,${m[1]};` },
  { re: /^DEFM\s*\+(\d+)/i, gen: (m) => `bonus bMdef,${m[1]};` },

  // === HP / SP ===
  { re: /^HP m[aá]x\.\s*\+(\d[\d.]+)/i, gen: (m) => `bonus bMaxHP,${m[1].replace(/\./g, "")};` },
  { re: /^HP m[aá]x\.\s*\+(\d+)%/i, gen: (m) => `bonus bMaxHPrate,${m[1]};` },
  { re: /^SP m[aá]x\.\s*\+(\d[\d.]+)/i, gen: (m) => `bonus bMaxSP,${m[1].replace(/\./g, "")};` },
  { re: /^SP m[aá]x\.\s*\+(\d+)%/i, gen: (m) => `bonus bMaxSPrate,${m[1]};` },
  { re: /^HP e SP m[aá]x\.\s*\+(\d+)%/i, gen: (m) => `bonus bMaxHPrate,${m[1]};\nbonus bMaxSPrate,${m[1]};` },
  { re: /^Max\. HP\s*\+(\d+)%/i, gen: (m) => `bonus bMaxHPrate,${m[1]};` },
  { re: /^Max\. SP\s*\+(\d+)%/i, gen: (m) => `bonus bMaxSPrate,${m[1]};` },

  // === HIT / FLEE / CRIT / ASPD ===
  { re: /^Precis[aã]o\s*\+(\d+)/i, gen: (m) => `bonus bHit,${m[1]};` },
  { re: /^Precis[aã]o perfeita\s*\+(\d+)/i, gen: (m) => `bonus bHit,${m[1]};` },
  { re: /^Esquiva perfeita\s*\+(\d+)/i, gen: (m) => `bonus bFlee2,${m[1]};` },
  { re: /^CRIT\s*\+(\d+)/i, gen: (m) => `bonus bCritical,${m[1]};` },
  { re: /^CRIT [àa] dist[âa]ncia\s*\+(\d+)/i, gen: (m) => `bonus bCritical,${m[1]};` },
  { re: /^Velocidade de ataque\s*\+(\d+)\./i, gen: (m) => `bonus bAspd,${m[1]};` },
  { re: /^Velocidade de ataque\s*\+(\d+)%/i, gen: (m) => `bonus bAspdRate,${m[1]};` },

  // === Damage % ===
  // Physical damage (all, melee, ranged)
  { re: /^Dano f[ií]sico\s*\+(\d+)%/i, gen: (m) => `bonus bShortAtkRate,${m[1]};\nbonus bLongAtkRate,${m[1]};` },
  { re: /^Dano f[ií]s?co? corpo a corpo\s*\+(\d+)%/i, gen: (m) => `bonus bShortAtkRate,${m[1]};` },
  { re: /^Dano f[ií]s?co? a dist[âa]ncia\s*\+(\d+)%/i, gen: (m) => `bonus bLongAtkRate,${m[1]};` },
  { re: /^Dano cr[ií]tico\s*\+(\d+)%/i, gen: (m) => `bonus bCritAtkRate,${m[1]};` },

  // Magical damage
  { re: /^Dano m[aá]gico\s*\+(\d+)%/i, gen: (m) => `bonus bMatkRate,${m[1]};` },
  { re: /^Dano m[aá]gico de todas as propriedades\s*\+(\d+)%/i, gen: (m) => `bonus bMatkRate,${m[1]};` },

  // Damage vs race
  { re: /^Dano f[ií]sico contra todas as ra[çc]as\s*\+(\d+)%/i, gen: (m) => `bonus bShortAtkRate,${m[1]};\nbonus bLongAtkRate,${m[1]};` },
  { re: /^Dano m[aá]gico contra todas as ra[çc]as\s*\+(\d+)%/i, gen: (m) => `bonus bMatkRate,${m[1]};` },
  { re: /^Dano f[ií]sico contra Humano e Doram\s*\+(\d+)%/i, gen: (m) => `bonus2 bAddRace,RC_DemiHuman,${m[1]};\nbonus2 bAddRace,RC_Player_Human,${m[1]};` },
  { re: /^Dano f[ií]sico contra o tamanho M[eé]dio\s*\+(\d+)%/i, gen: (m) => `bonus2 bAddSize,Size_Medium,${m[1]};` },
  { re: /^Dano f[ií]sico contra todos os tamanhos\s*\+(\d+)%/i, gen: (m) => `bonus2 bAddSize,Size_Small,${m[1]};\nbonus2 bAddSize,Size_Medium,${m[1]};\nbonus2 bAddSize,Size_Large,${m[1]};` },
  { re: /^Dano m[aá]gico contra todos os Tamanhos\s*\+(\d+)%/i, gen: (m) => `bonus bMatkRate,${m[1]};` },
  { re: /^Dano f[ií]sico contra monstros Chefes\s*\+(\d+)%/i, gen: (m) => `bonus2 bAddClass,Class_Boss,${m[1]};` },
  { re: /^Dano m[aá]gico contra monstros Chefes\s*\+(\d+)%/i, gen: (m) => `bonus2 bAddClass,Class_Boss,${m[1]};` },

  // Damage vs race (physical) - Bruto e Inseto, Demônio e Morto-vivo
  { re: /^Dano f[ií]sico contra as ra[çc]as Bruto e Inseto\s*\+(\d+)%/i, gen: (m) => `bonus2 bAddRace,RC_Brute,${m[1]};\nbonus2 bAddRace,RC_Insect,${m[1]};` },
  { re: /^Dano f[ií]sico contra as ra[çc]as Dem[ôo]nio e Morto-vivo\s*\+(\d+)%/i, gen: (m) => `bonus2 bAddRace,RC_Demon,${m[1]};\nbonus2 bAddRace,RC_Undead,${m[1]};` },
  { re: /^Dano m[aá]gico contra as ra[çc]as Bruto e Inseto\s*\+(\d+)%/i, gen: (m) => `bonus2 bAddRace,RC_Brute,${m[1]};\nbonus2 bAddRace,RC_Insect,${m[1]};` },
  { re: /^Dano m[aá]gico contra as ra[çc]as Dem[ôo]nio e Morto-vivo\s*\+(\d+)%/i, gen: (m) => `bonus2 bAddRace,RC_Demon,${m[1]};\nbonus2 bAddRace,RC_Undead,${m[1]};` },

  // Resistance vs race
  { re: /^Resist[êe]ncia as ra[çc]as Humano e Humanoide\s*\+(\d+)%/i, gen: (m) => `bonus2 bSubRace,RC_DemiHuman,${m[1]};\nbonus2 bSubRace,RC_Player_Human,${m[1]};` },
  { re: /^Resist[êe]ncia a monstros Chefes\s*\+(\d+)%/i, gen: (m) => `bonus2 bSubClass,Class_Boss,${m[1]};` },
  { re: /^Resist[êe]ncia a monstros Normais\s*\+(\d+)%/i, gen: (m) => `bonus2 bSubClass,Class_Normal,${m[1]};` },

  // === Cast ===
  { re: /^Conjura[çc][ãa]o vari[áa]vel\s*-(\d+)%/i, gen: (m) => `bonus bVariableCastrate,-${m[1]};` },
  { re: /^Conjura[çc][ãa]o fixa\s*-(\d[\d,.]*).*segundo/i, gen: (m) => {
    const val = Math.round(parseFloat(m[1].replace(",", ".")) * 1000);
    return `bonus bFixedCastrate,-${val};`;
  }},
  { re: /^P[óo]s-conjura[çc][ãa]o\s*-(\d+)%/i, gen: (m) => `bonus bDelayrate,-${m[1]};` },

  // === SP cost ===
  { re: /^Custo de SP das habilidades\s*-(\d+)%/i, gen: (m) => `bonus bUseSPrate,-${m[1]};` },
  { re: /^Custo de SP das habilidades\s*\+(\d+)%/i, gen: (m) => `bonus bUseSPrate,${m[1]};` },
];

// ─── Context-aware parser ────────────────────────────────────────────
// Handles "A cada X refinos:" + bonus line, "Refino +Y ou mais:" + bonus

function generateScript(item) {
  const desc = (item.description || []).map(stripColor);
  const lines = [];
  let refineContext = null; // e.g. { type: "per", interval: 2 } or { type: "min", threshold: 7 }
  let skipNext = false;

  for (let i = 0; i < desc.length; i++) {
    const line = desc[i].trim();
    if (!line || line.startsWith("---") || line.startsWith("Tipo:") || line.startsWith("Equipa em:") ||
        line.startsWith("DEF:") || line.startsWith("ATQ:") || line.startsWith("Peso:") ||
        line.startsWith("Nível") || line.startsWith("Classes:") || line.startsWith("Classe:") ||
        line.startsWith("Nota:") || line.startsWith("Intrans") || line.startsWith("Exibe") ||
        line.startsWith("Não pode") || line.startsWith("Nível da arma") ||
        line.match(/^Conjunto/) || line.match(/^\[/) || line.match(/^<NAVI>/) ||
        line.startsWith("Efeito") || line.startsWith("Durante") || line.startsWith("Desequipar")) {
      refineContext = null;
      continue;
    }

    // "A cada X refinos:" context
    const perRefine = line.match(/^A cada (\d+) refinos?:?$/i);
    if (perRefine) {
      refineContext = { type: "per", interval: parseInt(perRefine[1]) };
      continue;
    }

    // "A cada refino:" = per 1 refine
    if (line.match(/^A cada refino:?$/i)) {
      refineContext = { type: "per", interval: 1 };
      continue;
    }

    // "Refino +X ou mais:"
    const minRefine = line.match(/^Refino \+(\d+) ou mais:?$/i);
    if (minRefine) {
      refineContext = { type: "min", threshold: parseInt(minRefine[1]) };
      continue;
    }

    // Skip combo-related, weapon refine, and conditional contexts we can't handle
    if (line.match(/^Arma com refino/) || line.match(/^Armadura com refino/) ||
        line.match(/^Soma dos refinos/) || line.match(/^Nv\. base/) ||
        line.match(/^Nivel de base/) || line.match(/^Nível de base/) ||
        line.match(/base 125 ou mais/) || line.match(/^A cada \d+ n[ií]veis/) ||
        line.match(/^A cada n[ií]vel/) || line.match(/^Equipado no/) ||
        line.match(/^Ao /) || line.match(/^\d+% de chance/) ||
        line.match(/^100% de chance/)) {
      refineContext = { type: "skip" };
      continue;
    }

    if (refineContext?.type === "skip") continue;

    // Try matching bonus patterns
    for (const { re, gen } of PATTERNS) {
      const m = line.match(re);
      if (m) {
        const script = gen(m);
        if (refineContext?.type === "per") {
          // Wrap in per-refine: if(getrefine()>=interval) bonus ..., value * (getrefine()/interval)
          const scriptLines = script.split("\n");
          for (const sl of scriptLines) {
            // Extract the value from the bonus and make it refine-dependent
            const bonusMatch = sl.match(/^(bonus2?\s+\w+(?:,\s*\w+)?)\s*,\s*(-?\d+)\s*;$/);
            if (bonusMatch) {
              lines.push(`${bonusMatch[1]},${bonusMatch[2]}*(getrefine()/${refineContext.interval});`);
            } else {
              lines.push(sl);
            }
          }
        } else if (refineContext?.type === "min") {
          lines.push(`if(getrefine()>=${refineContext.threshold}) { ${script} }`);
        } else {
          lines.push(script);
        }
        break;
      }
    }
  }

  return lines.length > 0 ? lines.join("\n") : null;
}

// ─── Process items ───────────────────────────────────────────────────

let generated = 0;
let noMatch = 0;
const examples = [];

for (const item of items) {
  if (!(item.aegisName && item.aegisName.endsWith("_LATAM"))) continue;
  if (item.script) continue; // already has script

  const script = generateScript(item);
  if (script) {
    item.script = script;
    generated++;
    if (examples.length < 15) {
      examples.push({ id: item.id, name: item.namePt, script });
    }
  } else {
    noMatch++;
  }
}

fs.writeFileSync(DB_PATH, JSON.stringify(items, null, 2));

console.log(`\nResults:`);
console.log(`  Generated scripts: ${generated}`);
console.log(`  No matchable bonuses: ${noMatch}`);
console.log(`\nExamples:`);
examples.forEach(e => {
  console.log(`\n  ${e.id} ${e.name}:`);
  console.log(`    ${e.script.replace(/\n/g, "\n    ")}`);
});
