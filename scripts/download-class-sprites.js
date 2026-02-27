/**
 * Download Ragnarok Online class standing sprites from Divine Pride.
 * Uses the character render endpoint for standing pose.
 *
 * Job IDs for 3rd classes (Renewal):
 * Male body + Female body where applicable
 */

const fs = require("fs");
const path = require("path");
const https = require("https");

const OUT_DIR = path.join(__dirname, "..", "public", "sprites", "classes");

// RO Job IDs → our class IDs
// Source: https://github.com/rathena/rathena/blob/master/db/const.txt
const CLASS_SPRITES = [
  // Swordsman branch
  { id: "rune_knight",       jobId: 4060, jobIdF: 4061 },
  { id: "royal_guard",       jobId: 4066, jobIdF: 4067 },
  // Mage branch
  { id: "warlock",           jobId: 4062, jobIdF: 4063 },
  { id: "sorcerer",          jobId: 4064, jobIdF: 4065 },
  // Archer branch
  { id: "ranger",            jobId: 4068, jobIdF: 4069 },
  { id: "minstrel",          jobId: 4075 },
  { id: "wanderer",          jobIdF: 4076 },
  // Acolyte branch
  { id: "arch_bishop",       jobId: 4073, jobIdF: 4074 },
  { id: "sura",              jobId: 4077, jobIdF: 4078 },
  // Merchant branch
  { id: "mechanic",          jobId: 4071, jobIdF: 4072 },
  { id: "genetic",           jobId: 4070, jobIdF: 4079 },  // genetic female = 4079? varies by server
  // Thief branch
  { id: "guillotine_cross",  jobId: 4080, jobIdF: 4081 },
  { id: "shadow_chaser",     jobId: 4082, jobIdF: 4083 },
  // Expanded
  { id: "rebellion",         jobId: 4215 },
  { id: "star_emperor",      jobId: 4239, jobIdF: 4240 },
  { id: "soul_reaper",       jobId: 4241, jobIdF: 4242 },
  { id: "kagerou",           jobId: 4211 },
  { id: "oboro",             jobIdF: 4212 },
  { id: "super_novice",      jobId: 23, jobIdF: 4190 },
  // Doram
  { id: "spirit_handler",    jobId: 4218, jobIdF: 4218 },
];

// Alternative: use roBrowser sprite renders or direct PNG exports
// For now, try Divine Pride's character image API

function download(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    https.get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        fs.unlinkSync(filepath);
        return download(res.headers.location, filepath).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        file.close();
        fs.unlinkSync(filepath);
        return resolve({ ok: false, status: res.statusCode });
      }
      res.pipe(file);
      file.on("finish", () => {
        file.close();
        const stat = fs.statSync(filepath);
        if (stat.size < 200) {
          fs.unlinkSync(filepath);
          resolve({ ok: false, status: "too_small" });
        } else {
          resolve({ ok: true, size: stat.size });
        }
      });
    }).on("error", (e) => {
      file.close();
      if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
      reject(e);
    });
  });
}

async function tryDownload(classId, jobId, suffix = "") {
  const filename = `${classId}${suffix}.png`;
  const filepath = path.join(OUT_DIR, filename);

  if (fs.existsSync(filepath)) {
    console.log(`  SKIP ${filename} (exists)`);
    return true;
  }

  // Try multiple URL patterns
  const urls = [
    // Divine Pride character render
    `https://static.divine-pride.net/images/jobs/standing/${jobId}.png`,
    // Alternative path
    `https://static.divine-pride.net/images/jobs/${jobId}.png`,
    // RMS style
    `https://www.divine-pride.net/img/character/job/${jobId}`,
  ];

  for (const url of urls) {
    try {
      const result = await download(url, filepath);
      if (result.ok) {
        console.log(`  OK ${filename} (${result.size} bytes) from ${url}`);
        return true;
      }
    } catch (e) {
      // try next URL
    }
  }

  console.log(`  FAIL ${filename} (jobId=${jobId})`);
  return false;
}

async function main() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  console.log("Downloading class sprites...\n");

  let success = 0, fail = 0;

  for (const cls of CLASS_SPRITES) {
    console.log(`${cls.id}:`);

    // Male sprite
    if (cls.jobId) {
      const ok = await tryDownload(cls.id, cls.jobId);
      if (ok) success++;
      else fail++;
    }

    // Female sprite (if different)
    if (cls.jobIdF && cls.jobIdF !== cls.jobId) {
      const ok = await tryDownload(cls.id, cls.jobIdF, "_f");
      if (ok) success++;
      else fail++;
    }

    // Small delay to be nice to the CDN
    await new Promise(r => setTimeout(r, 200));
  }

  console.log(`\nDone: ${success} ok, ${fail} failed`);
}

main().catch(console.error);
