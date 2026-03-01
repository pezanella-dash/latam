#!/usr/bin/env npx ts-node
/**
 * Extract monster spawn data from rAthena GitHub npc/re/mobs/ directory.
 * Format: mapname,x,y[,xs,ys]\tmonster\tName\tID,Count,SpawnTime[,DeathTime]
 * Output: data/database/monster-spawns.json
 */

import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface SpawnEntry {
  mapId: string;
  count: number;
  respawnMs: number;
}

const OUTPUT = join(__dirname, "..", "data", "database", "monster-spawns.json");

// All rAthena mob spawn directories to scan
const SPAWN_DIRS = [
  "npc/re/mobs/fields",
  "npc/re/mobs/dungeons",
  "npc/re/mobs",
];

async function fetchGithubTree(dir: string): Promise<string[]> {
  const apiUrl = `https://api.github.com/repos/rathena/rathena/contents/${dir}`;
  const res = await fetch(apiUrl, {
    headers: { "User-Agent": "latam-build-consultant" },
  });
  if (!res.ok) {
    console.warn(`  [WARN] Could not list ${dir}: ${res.status}`);
    return [];
  }
  const entries = (await res.json()) as Array<{ name: string; type: string; download_url: string }>;
  return entries
    .filter((e) => e.type === "file" && e.name.endsWith(".txt"))
    .map((e) => e.download_url);
}

function parseSpawnLine(line: string): { monsterId: number; mapId: string; count: number; respawnMs: number } | null {
  // Skip comments and empty lines
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("#")) return null;

  // Format: mapname,x,y[,xs,ys]\tmonster\tName\tID,Count,SpawnTime[,DeathTime]
  // Some files use spaces+tab mixing, so let's be flexible
  const parts = trimmed.split(/\t+/);
  if (parts.length < 4) return null;

  // parts[0] = "mapname,x,y" or "mapname,x,y,xs,ys"
  // parts[1] = "monster" (keyword)
  // parts[2] = monster display name
  // parts[3] = "ID,Count,SpawnTime[,DeathTime]"

  if (parts[1] !== "monster") return null;

  const locParts = parts[0].split(",");
  const mapId = locParts[0].trim();

  const dataParts = parts[3].split(",");
  if (dataParts.length < 3) return null;

  const monsterId = parseInt(dataParts[0], 10);
  const count = parseInt(dataParts[1], 10);
  const respawnMs = parseInt(dataParts[2], 10);

  if (isNaN(monsterId) || isNaN(count) || isNaN(respawnMs)) return null;
  if (monsterId <= 0 || count <= 0) return null;

  return { monsterId, mapId, count, respawnMs };
}

async function main() {
  console.log("Extracting monster spawn data from rAthena...\n");

  // Collect all .txt file URLs
  const allUrls: string[] = [];
  for (const dir of SPAWN_DIRS) {
    console.log(`Listing ${dir}...`);
    const urls = await fetchGithubTree(dir);
    console.log(`  Found ${urls.length} files`);
    allUrls.push(...urls);
  }

  // Deduplicate by URL
  const uniqueUrls = [...new Set(allUrls)];
  console.log(`\nTotal unique files: ${uniqueUrls.length}\n`);

  // Download and parse each file
  const spawns: Record<number, SpawnEntry[]> = {};
  let totalSpawns = 0;
  let filesDone = 0;

  for (const url of uniqueUrls) {
    const fileName = url.split("/").pop() || url;
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "latam-build-consultant" },
      });
      if (!res.ok) {
        console.warn(`  [WARN] Failed to fetch ${fileName}: ${res.status}`);
        continue;
      }
      const text = await res.text();
      const lines = text.split("\n");

      for (const line of lines) {
        const entry = parseSpawnLine(line);
        if (!entry) continue;

        if (!spawns[entry.monsterId]) {
          spawns[entry.monsterId] = [];
        }

        // Merge same monster on same map (add counts)
        const existing = spawns[entry.monsterId].find((s) => s.mapId === entry.mapId);
        if (existing) {
          existing.count += entry.count;
          // Keep the shorter respawn time
          if (entry.respawnMs > 0 && (existing.respawnMs === 0 || entry.respawnMs < existing.respawnMs)) {
            existing.respawnMs = entry.respawnMs;
          }
        } else {
          spawns[entry.monsterId].push({
            mapId: entry.mapId,
            count: entry.count,
            respawnMs: entry.respawnMs,
          });
          totalSpawns++;
        }
      }

      filesDone++;
      if (filesDone % 10 === 0) {
        process.stdout.write(`  Parsed ${filesDone}/${uniqueUrls.length} files...\r`);
      }
    } catch (err) {
      console.warn(`  [WARN] Error fetching ${fileName}:`, err);
    }
  }

  console.log(`\nParsed ${filesDone} files.`);
  console.log(`Found ${Object.keys(spawns).length} unique monsters with ${totalSpawns} spawn entries.`);

  // Sort spawn entries by count (descending) within each monster
  for (const id of Object.keys(spawns)) {
    spawns[parseInt(id)].sort((a, b) => b.count - a.count);
  }

  // Write output
  writeFileSync(OUTPUT, JSON.stringify(spawns, null, 2), "utf-8");
  console.log(`\nWrote ${OUTPUT}`);
}

main().catch(console.error);
