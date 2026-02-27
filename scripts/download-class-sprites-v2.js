/**
 * Download RO class standing sprites from multiple sources.
 * Tries NovaRO chargen, then alternative CDNs.
 */

const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");

const OUT_DIR = path.join(__dirname, "..", "public", "sprites", "classes");

// Class ID → RO job sprite ID (for chargen APIs)
const CLASSES = [
  { id: "rune_knight",       jobId: 4060, jobIdF: 4061, gender: "male" },
  { id: "royal_guard",       jobId: 4066, jobIdF: 4067, gender: "male" },
  { id: "warlock",           jobId: 4062, jobIdF: 4063, gender: "male" },
  { id: "sorcerer",          jobId: 4064, jobIdF: 4065, gender: "male" },
  { id: "ranger",            jobId: 4068, jobIdF: 4069, gender: "male" },
  { id: "minstrel",          jobId: 4075, gender: "male" },
  { id: "wanderer",          jobIdF: 4076, gender: "female" },
  { id: "arch_bishop",       jobId: 4073, jobIdF: 4074, gender: "male" },
  { id: "sura",              jobId: 4077, jobIdF: 4078, gender: "male" },
  { id: "mechanic",          jobId: 4071, jobIdF: 4072, gender: "male" },
  { id: "genetic",           jobId: 4070, jobIdF: 4079, gender: "male" },
  { id: "guillotine_cross",  jobId: 4080, jobIdF: 4081, gender: "male" },
  { id: "shadow_chaser",     jobId: 4082, jobIdF: 4083, gender: "male" },
  { id: "rebellion",         jobId: 4215, gender: "male" },
  { id: "star_emperor",      jobId: 4239, jobIdF: 4240, gender: "male" },
  { id: "soul_reaper",       jobId: 4241, jobIdF: 4242, gender: "male" },
  { id: "kagerou",           jobId: 4211, gender: "male" },
  { id: "oboro",             jobIdF: 4212, gender: "female" },
  { id: "super_novice",      jobId: 23, gender: "male" },
  { id: "spirit_handler",    jobId: 4218, gender: "male" },
];

function downloadUrl(url, filepath) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith("https") ? https : http;
    const file = fs.createWriteStream(filepath);
    proto.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "image/png,image/*,*/*",
        "Referer": "https://www.divine-pride.net/",
      },
      timeout: 10000,
    }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        fs.unlinkSync(filepath);
        const location = res.headers.location;
        if (!location) return resolve({ ok: false, status: "no-redirect" });
        const fullUrl = location.startsWith("http") ? location : new URL(location, url).href;
        return downloadUrl(fullUrl, filepath).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        file.close();
        if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
        return resolve({ ok: false, status: res.statusCode });
      }
      res.pipe(file);
      file.on("finish", () => {
        file.close();
        const stat = fs.statSync(filepath);
        // Check if it's a real image (not placeholder)
        if (stat.size < 500) {
          fs.unlinkSync(filepath);
          resolve({ ok: false, status: `too_small_${stat.size}` });
        } else {
          resolve({ ok: true, size: stat.size });
        }
      });
    }).on("error", (e) => {
      file.close();
      if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
      resolve({ ok: false, status: e.message });
    }).on("timeout", () => {
      file.close();
      if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
      resolve({ ok: false, status: "timeout" });
    });
  });
}

async function trySource(classId, jobId, gender) {
  const filepath = path.join(OUT_DIR, `${classId}.png`);
  if (fs.existsSync(filepath) && fs.statSync(filepath).size > 500) {
    console.log(`  SKIP ${classId}.png (exists, ${fs.statSync(filepath).size}b)`);
    return true;
  }

  const g = gender === "female" ? 0 : 1; // chargen: 1=male, 0=female

  // Source list - try each one
  const sources = [
    // NovaRO chargen - renders actual game sprites
    `https://www.novaragnarok.com/ROChargenPHP/chargen/?id=${jobId}-${g}&act=stand`,
    // Alternative chargen path
    `https://www.novaragnarok.com/ROChargenPHP/chargen/?id=${jobId}-${g}`,
    // Try iRO-style paths
    `https://static.divine-pride.net/images/character/${jobId}/${g}_0.png`,
    // Try db path
    `https://static.divine-pride.net/images/character/body/${g}/${jobId}.png`,
    // roBrowser renders
    `https://www.divine-pride.net/img/character/${jobId}/${g}`,
  ];

  for (const url of sources) {
    try {
      const result = await downloadUrl(url, filepath);
      if (result.ok) {
        console.log(`  OK ${classId}.png (${result.size}b) ← ${url}`);
        return true;
      }
    } catch (e) {
      // continue
    }
  }

  return false;
}

async function main() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  console.log("Downloading class sprites...\n");

  let ok = 0, fail = 0;

  for (const cls of CLASSES) {
    const jobId = cls.jobId || cls.jobIdF;
    const gender = cls.gender || "male";
    console.log(`${cls.id} (job ${jobId}, ${gender}):`);

    const success = await trySource(cls.id, jobId, gender);
    if (success) ok++;
    else {
      console.log(`  FAIL ${cls.id}`);
      fail++;
    }

    await new Promise(r => setTimeout(r, 300));
  }

  console.log(`\nDone: ${ok} ok, ${fail} failed`);

  // Show file sizes
  console.log("\nFile sizes:");
  const files = fs.readdirSync(OUT_DIR).filter(f => f.endsWith(".png"));
  for (const f of files) {
    const size = fs.statSync(path.join(OUT_DIR, f)).size;
    console.log(`  ${f}: ${size} bytes`);
  }
}

main().catch(console.error);
