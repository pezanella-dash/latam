/**
 * Download RO class sprites from ai4rei.net npclist.
 * URL: https://nn.ai4rei.net/dev/npclist/i/{NAME}.gif
 */

const fs = require("fs");
const path = require("path");
const https = require("https");

const OUT_DIR = path.join(__dirname, "..", "public", "sprites", "classes");
const BASE = "https://nn.ai4rei.net/dev/npclist/i";

// Map: our class ID → possible sprite names to try (first match wins)
const SPRITES = {
  rune_knight:      ["RUNE_KNIGHT"],
  royal_guard:      ["ROYAL_GUARD", "CRUSADER2", "IMPERIAL_GUARD"],
  warlock:          ["WARLOCK", "HIGH_WIZARD2", "ARCH_MAGE"],
  sorcerer:         ["SORCERER"],
  ranger:           ["RANGER", "SNIPER2", "WINDHAWK"],
  minstrel:         ["MINSTREL"],
  wanderer:         ["WANDERER"],
  arch_bishop:      ["ARCH_BISHOP", "HIGH_PRIEST2", "CARDINAL"],
  sura:             ["SURA"],
  mechanic:         ["MECHANIC"],
  genetic:          ["GENETIC", "BIOCHEMIST2", "BIOLO"],
  guillotine_cross: ["GUILLOTINE_CROSS", "ASSASSIN_CROSS2", "SHADOW_CROSS"],
  shadow_chaser:    ["SHADOW_CHASER", "STALKER2", "ABYSS_CHASER"],
  rebellion:        ["REBELLION", "NIGHT_WATCH"],
  star_emperor:     ["STAR_EMPEROR"],
  soul_reaper:      ["SOUL_REAPER"],
  kagerou:          ["KAGEROU", "SHINKIRO"],
  oboro:            ["OBORO", "SHIRANUI"],
  super_novice:     ["SUPERNOVICE", "HYPER_NOVICE"],
  spirit_handler:   ["SPIRIT_HANDLER", "DO_SUMMONER"],
};

function download(url, filepath) {
  return new Promise((resolve) => {
    const file = fs.createWriteStream(filepath);
    https.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "Referer": "https://nn.ai4rei.net/dev/npclist/",
      },
      timeout: 10000,
    }, (res) => {
      if (res.statusCode !== 200) {
        file.close();
        if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
        return resolve({ ok: false, status: res.statusCode });
      }
      res.pipe(file);
      file.on("finish", () => {
        file.close();
        const stat = fs.statSync(filepath);
        if (stat.size < 200) {
          fs.unlinkSync(filepath);
          resolve({ ok: false, status: `tiny_${stat.size}` });
        } else {
          resolve({ ok: true, size: stat.size });
        }
      });
    }).on("error", (e) => {
      file.close();
      if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
      resolve({ ok: false, status: e.message });
    });
  });
}

async function main() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  console.log("Downloading class sprites from ai4rei.net...\n");

  let ok = 0, fail = 0;

  for (const [classId, names] of Object.entries(SPRITES)) {
    const filepath = path.join(OUT_DIR, `${classId}.gif`);

    if (fs.existsSync(filepath) && fs.statSync(filepath).size > 200) {
      console.log(`  SKIP ${classId}.gif (exists, ${fs.statSync(filepath).size}b)`);
      ok++;
      continue;
    }

    let found = false;
    for (const name of names) {
      const url = `${BASE}/${name}.gif`;
      const result = await download(url, filepath);
      if (result.ok) {
        console.log(`  OK   ${classId}.gif (${result.size}b) ← ${name}.gif`);
        ok++;
        found = true;
        break;
      }
    }

    if (!found) {
      console.log(`  FAIL ${classId} — tried: ${names.join(", ")}`);
      fail++;
    }

    await new Promise(r => setTimeout(r, 200));
  }

  console.log(`\nDone: ${ok} ok, ${fail} failed`);

  // List results
  const files = fs.readdirSync(OUT_DIR).filter(f => f.endsWith(".gif"));
  console.log(`\nFiles (${files.length}):`);
  for (const f of files) {
    const s = fs.statSync(path.join(OUT_DIR, f)).size;
    console.log(`  ${f}: ${s} bytes`);
  }
}

main().catch(console.error);
