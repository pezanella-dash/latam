/**
 * Scrape Portuguese (bRO) names for monsters and skills from RagnaPlace.
 *
 * Usage: node scripts/scrape-pt-names.js [--monsters] [--skills] [--all]
 *
 * Outputs:
 *   data/translations/mob-names-pt.json   — { "1001": "Escorpião", ... }
 *   data/translations/skill-names-pt.json — { "1": "Habilidades Básicas", ... }
 */
const https = require('https');
const fs = require('fs');
const path = require('path');

const CONCURRENCY = 5;       // parallel requests
const DELAY_MS = 200;        // delay between batches
const RETRY_MAX = 2;
const RETRY_DELAY = 3000;

const OUT_DIR = path.join(__dirname, '..', 'data', 'translations');

function fetchTitle(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      timeout: 15000,
    }, res => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return resolve(null); // redirect = not found on bRO
      }
      if (res.statusCode === 404) {
        return resolve(null);
      }
      let data = '';
      res.on('data', c => {
        data += c;
        // Stop reading after we find the title (saves bandwidth)
        if (data.includes('</title>')) {
          res.destroy();
          const m = data.match(/<title>([^<]+)<\/title>/);
          resolve(m ? m[1] : null);
        }
      });
      res.on('end', () => {
        const m = data.match(/<title>([^<]+)<\/title>/);
        resolve(m ? m[1] : null);
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

function parseName(title) {
  if (!title) return null;
  // Format: "Escorpião (1001) · Monster / bRO - RagnaPlace"
  // or: "Habilidades Básicas (1) · Skill / bRO - RagnaPlace"
  const m = title.match(/^(.+?)\s*\(\d+\)/);
  return m ? m[1].trim() : null;
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function fetchWithRetry(url, retries = RETRY_MAX) {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fetchTitle(url);
    } catch (e) {
      if (i < retries) {
        await sleep(RETRY_DELAY);
      } else {
        return null;
      }
    }
  }
}

async function scrapeNames(ids, type) {
  const baseUrl = type === 'mob'
    ? 'https://ragnaplace.com/en/bro/mob/'
    : 'https://ragnaplace.com/en/bro/skill/';

  const result = {};
  let done = 0;
  const total = ids.length;
  let failed = 0;

  // Process in batches of CONCURRENCY
  for (let i = 0; i < ids.length; i += CONCURRENCY) {
    const batch = ids.slice(i, i + CONCURRENCY);
    const promises = batch.map(async (id) => {
      const title = await fetchWithRetry(baseUrl + id + '/x');
      const name = parseName(title);
      if (name) {
        result[id] = name;
      } else {
        failed++;
      }
      done++;
    });

    await Promise.all(promises);

    // Progress
    if (done % 50 === 0 || done === total) {
      const pct = ((done / total) * 100).toFixed(1);
      process.stdout.write(`\r  ${type}: ${done}/${total} (${pct}%) — ${Object.keys(result).length} found, ${failed} missing`);
    }

    if (i + CONCURRENCY < ids.length) {
      await sleep(DELAY_MS);
    }
  }

  console.log(''); // newline
  return result;
}

async function main() {
  const args = process.argv.slice(2);
  const doAll = args.includes('--all') || args.length === 0;
  const doMonsters = doAll || args.includes('--monsters');
  const doSkills = doAll || args.includes('--skills');

  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  if (doMonsters) {
    const monsters = require('../data/database/monsters.json');
    const ids = monsters.map(m => m.id);
    console.log(`\nScraping ${ids.length} monster names from RagnaPlace (bRO)...`);
    const mobNames = await scrapeNames(ids, 'mob');
    const outPath = path.join(OUT_DIR, 'mob-names-pt.json');
    fs.writeFileSync(outPath, JSON.stringify(mobNames, null, 2));
    console.log(`  Saved ${Object.keys(mobNames).length} monster names to ${outPath}`);
  }

  if (doSkills) {
    const skills = require('../data/database/skills.json');
    const ids = skills.map(s => s.id);
    console.log(`\nScraping ${ids.length} skill names from RagnaPlace (bRO)...`);
    const skillNames = await scrapeNames(ids, 'skill');
    const outPath = path.join(OUT_DIR, 'skill-names-pt.json');
    fs.writeFileSync(outPath, JSON.stringify(skillNames, null, 2));
    console.log(`  Saved ${Object.keys(skillNames).length} skill names to ${outPath}`);
  }

  console.log('\nDone!');
}

main().catch(console.error);
