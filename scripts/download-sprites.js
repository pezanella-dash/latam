#!/usr/bin/env node
/**
 * Download monster sprites from Divine Pride CDN
 * URL: https://static.divine-pride.net/images/mobs/png/{id}.png
 * Saves to: public/sprites/monsters/{id}.png
 */

const fs = require("fs");
const path = require("path");
const https = require("https");

const DB_PATH = path.join(__dirname, "..", "data", "database", "monsters.json");
const OUT_DIR = path.join(__dirname, "..", "public", "sprites", "monsters");

const CONCURRENCY = 10;
const DELAY_MS = 100;
const RETRY_COUNT = 2;

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https
      .get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
        if (res.statusCode !== 200) {
          file.close();
          fs.unlinkSync(dest);
          return reject(new Error(`HTTP ${res.statusCode}`));
        }
        res.pipe(file);
        file.on("finish", () => {
          file.close();
          resolve();
        });
      })
      .on("error", (err) => {
        file.close();
        if (fs.existsSync(dest)) fs.unlinkSync(dest);
        reject(err);
      });
  });
}

async function downloadWithRetry(id) {
  const url = `https://static.divine-pride.net/images/mobs/png/${id}.png`;
  const dest = path.join(OUT_DIR, `${id}.png`);

  // Skip if already exists
  if (fs.existsSync(dest)) return "skip";

  for (let attempt = 0; attempt <= RETRY_COUNT; attempt++) {
    try {
      await downloadFile(url, dest);
      return "ok";
    } catch (err) {
      if (attempt === RETRY_COUNT) return "fail";
      await new Promise((r) => setTimeout(r, 500));
    }
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const monsters = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
  const ids = monsters.map((m) => m.id);

  console.log(`Downloading ${ids.length} monster sprites...`);
  console.log(`Output: ${OUT_DIR}`);
  console.log(`Concurrency: ${CONCURRENCY}, delay: ${DELAY_MS}ms\n`);

  let ok = 0;
  let skip = 0;
  let fail = 0;
  const failedIds = [];

  for (let i = 0; i < ids.length; i += CONCURRENCY) {
    const batch = ids.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map(downloadWithRetry));

    results.forEach((r, j) => {
      if (r === "ok") ok++;
      else if (r === "skip") skip++;
      else {
        fail++;
        failedIds.push(batch[j]);
      }
    });

    const progress = Math.min(i + CONCURRENCY, ids.length);
    process.stdout.write(
      `\r  ${progress}/${ids.length} (${ok} new, ${skip} cached, ${fail} failed)`
    );

    if (i + CONCURRENCY < ids.length) await sleep(DELAY_MS);
  }

  console.log(`\n\nDone!`);
  console.log(`  Downloaded: ${ok}`);
  console.log(`  Cached: ${skip}`);
  console.log(`  Failed: ${fail}`);
  if (failedIds.length > 0) {
    console.log(`  Failed IDs: ${failedIds.join(", ")}`);
  }
}

main().catch(console.error);
