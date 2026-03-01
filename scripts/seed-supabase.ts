/**
 * Seed Supabase database from local JSON files.
 *
 * Prerequisites:
 *   1. Run scripts/supabase-schema.sql in Supabase Dashboard → SQL Editor
 *   2. Set env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage:
 *   npx tsx scripts/seed-supabase.ts
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// ─── Config ──────────────────────────────────────────────────────────

const dotenv = fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf-8");
const envVars: Record<string, string> = {};
for (const line of dotenv.split("\n")) {
  const m = line.match(/^([A-Z_]+)="?([^"]*)"?$/);
  if (m) envVars[m[1]] = m[2];
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || envVars.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DB_DIR = path.join(process.cwd(), "data", "database");
const TRANS_DIR = path.join(process.cwd(), "data", "translations");

function loadJson<T>(filename: string, dir = DB_DIR): T {
  return JSON.parse(fs.readFileSync(path.join(dir, filename), "utf-8"));
}

function loadTranslation(filename: string): Record<string, string> {
  const fp = path.join(TRANS_DIR, filename);
  if (!fs.existsSync(fp)) return {};
  try { return JSON.parse(fs.readFileSync(fp, "utf-8")); } catch { return {}; }
}

// ─── Batch upsert helper ────────────────────────────────────────────

async function batchUpsert(table: string, rows: Record<string, unknown>[], batchSize = 500) {
  let inserted = 0;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await supabase.from(table).upsert(batch, { onConflict: "id" });
    if (error) {
      console.error(`  [${table}] batch ${i}..${i + batch.length} ERROR: ${error.message}`);
      // Try individual inserts for the failed batch
      let individualOk = 0;
      for (const row of batch) {
        const { error: e2 } = await supabase.from(table).upsert(row, { onConflict: "id" });
        if (!e2) individualOk++;
      }
      inserted += individualOk;
      console.error(`  [${table}] recovered ${individualOk}/${batch.length} via individual inserts`);
    } else {
      inserted += batch.length;
    }
    if ((i + batchSize) % 5000 === 0 || i + batchSize >= rows.length) {
      console.log(`  [${table}] ${Math.min(i + batchSize, rows.length)}/${rows.length}`);
    }
  }
  console.log(`  [${table}] Done: ${inserted} rows`);
  return inserted;
}

// ─── Seed Items ──────────────────────────────────────────────────────

async function seedItems() {
  console.log("\n📦 Seeding items...");
  const items = loadJson<any[]>("items.json");
  const affixes = (() => {
    try { return loadJson<Record<string, { text: string; type: string }>>("card-affixes-pt.json", TRANS_DIR); } catch { return {}; }
  })();

  const rows = items.map((item) => {
    const affix = affixes[String(item.id)];
    return {
      id: item.id,
      aegis_name: item.aegisName || "",
      name_en: item.nameEn || "",
      name_pt: item.namePt || "",
      type: item.type || "Etc",
      sub_type: item.subType || null,
      weight: item.weight || 0,
      attack: item.attack ?? null,
      magic_attack: item.magicAttack ?? null,
      defense: item.defense ?? null,
      range: item.range ?? null,
      slots: item.slots ?? 0,
      equip_level_min: item.equipLevelMin ?? null,
      equip_level_max: item.equipLevelMax ?? null,
      weapon_level: item.weaponLevel ?? null,
      armor_level: item.armorLevel ?? null,
      refineable: item.refineable ?? false,
      gradable: item.gradable ?? false,
      buy: item.buy ?? null,
      sell: item.sell ?? null,
      locations: item.locations || [],
      jobs: item.jobs || [],
      classes: item.classes || [],
      description: item.description || [],
      script: item.script || null,
      equip_script: item.equipScript || null,
      class_num: item.classNum ?? 0,
      costume: item.costume ?? false,
      affix_text: affix?.text || null,
      affix_type: affix?.type || null,
    };
  });

  return batchUpsert("items", rows);
}

// ─── Seed Monsters ───────────────────────────────────────────────────

async function seedMonsters() {
  console.log("\n👹 Seeding monsters...");
  const monsters = loadJson<any[]>("monsters.json");
  const ptNames = loadTranslation("mob-names-pt.json");

  const rows = monsters.map((m) => ({
    id: m.id,
    aegis_name: m.aegisName || "",
    name: m.name || "",
    name_pt: ptNames[String(m.id)] || m.name || "",
    level: m.level ?? 1,
    hp: m.hp ?? 1,
    sp: m.sp ?? 0,
    base_exp: m.baseExp ?? 0,
    job_exp: m.jobExp ?? 0,
    mvp_exp: m.mvpExp ?? 0,
    attack: m.attack ?? 0,
    magic_attack: m.magicAttack ?? 0,
    defense: m.defense ?? 0,
    magic_defense: m.magicDefense ?? 0,
    str: m.stats?.str ?? 0,
    agi: m.stats?.agi ?? 0,
    vit: m.stats?.vit ?? 0,
    int: m.stats?.int ?? 0,
    dex: m.stats?.dex ?? 0,
    luk: m.stats?.luk ?? 0,
    attack_range: m.attackRange ?? 0,
    skill_range: m.skillRange ?? 0,
    chase_range: m.chaseRange ?? 0,
    size: m.size || "Small",
    race: m.race || "Formless",
    element: m.element || "Neutral",
    element_level: m.elementLevel ?? 1,
    walk_speed: m.walkSpeed ?? 200,
    attack_delay: m.attackDelay ?? 0,
    attack_motion: m.attackMotion ?? 0,
    damage_motion: m.damageMotion ?? 0,
    ai: String(m.ai ?? "06"),
    class: m.class || "Normal",
    is_mvp: m.isMvp ?? false,
    modes: m.modes || [],
  }));

  return batchUpsert("monsters", rows);
}

// ─── Seed Monster Drops ──────────────────────────────────────────────

async function seedMonsterDrops() {
  console.log("\n💎 Seeding monster drops...");
  const monsters = loadJson<any[]>("monsters.json");

  // Collect all drops
  const allDrops: Record<string, unknown>[] = [];
  for (const m of monsters) {
    if (m.drops) {
      for (const d of m.drops) {
        allDrops.push({
          monster_id: m.id,
          aegis_name: d.aegisName,
          rate: d.rate,
          steal_protected: d.stealProtected ?? false,
          is_mvp_drop: false,
        });
      }
    }
    if (m.mvpDrops) {
      for (const d of m.mvpDrops) {
        allDrops.push({
          monster_id: m.id,
          aegis_name: d.aegisName,
          rate: d.rate,
          steal_protected: false,
          is_mvp_drop: true,
        });
      }
    }
  }

  console.log(`  Total drops to insert: ${allDrops.length}`);

  // monster_drops uses SERIAL id, so we can't upsert on id. Delete and re-insert.
  console.log("  Clearing existing drops...");
  const { error: delErr } = await supabase.from("monster_drops").delete().neq("id", 0);
  if (delErr) console.error("  Delete error:", delErr.message);

  // Batch insert (no upsert since serial id)
  let inserted = 0;
  const batchSize = 500;
  for (let i = 0; i < allDrops.length; i += batchSize) {
    const batch = allDrops.slice(i, i + batchSize);
    const { error } = await supabase.from("monster_drops").insert(batch);
    if (error) {
      console.error(`  Drops batch ${i} ERROR: ${error.message}`);
    } else {
      inserted += batch.length;
    }
    if ((i + batchSize) % 5000 === 0 || i + batchSize >= allDrops.length) {
      console.log(`  [monster_drops] ${Math.min(i + batchSize, allDrops.length)}/${allDrops.length}`);
    }
  }
  console.log(`  [monster_drops] Done: ${inserted} rows`);
  return inserted;
}

// ─── Seed Aegis → ID ────────────────────────────────────────────────

async function seedAegisToId() {
  console.log("\n🔗 Seeding aegis_to_id...");
  const map = loadJson<Record<string, number>>("aegis-to-id.json");
  const rows = Object.entries(map).map(([aegis_name, item_id]) => ({
    aegis_name,
    item_id,
  }));

  // Upsert with aegis_name as key
  let inserted = 0;
  const batchSize = 500;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await supabase.from("aegis_to_id").upsert(batch, { onConflict: "aegis_name" });
    if (error) {
      console.error(`  aegis batch ${i} ERROR: ${error.message}`);
    } else {
      inserted += batch.length;
    }
    if ((i + batchSize) % 10000 === 0 || i + batchSize >= rows.length) {
      console.log(`  [aegis_to_id] ${Math.min(i + batchSize, rows.length)}/${rows.length}`);
    }
  }
  console.log(`  [aegis_to_id] Done: ${inserted} rows`);
  return inserted;
}

// ─── Seed Skills ─────────────────────────────────────────────────────

async function seedSkills() {
  console.log("\n⚡ Seeding skills...");
  const skills = loadJson<any[]>("skills.json");
  const ptNames = loadTranslation("skill-names-pt.json");

  const rows = skills.map((s) => ({
    id: s.id,
    aegis_name: s.aegisName || "",
    description: s.description || "",
    name_pt: ptNames[String(s.id)] || s.description || "",
    max_level: s.maxLevel ?? 1,
    type: s.type || "None",
    target_type: s.targetType || "Passive",
  }));

  return batchUpsert("skills", rows);
}

// ─── Seed Changelog ──────────────────────────────────────────────────

async function seedChangelog() {
  console.log("\n📋 Seeding changelog...");
  const entries = loadJson<any[]>("changelog.json");

  // Clear and re-insert
  await supabase.from("changelog").delete().neq("id", 0);

  const rows = entries.map((entry) => ({
    date: entry.date,
    data: entry,
  }));

  let inserted = 0;
  for (const row of rows) {
    const { error } = await supabase.from("changelog").insert(row);
    if (error) console.error(`  Changelog entry ERROR: ${error.message}`);
    else inserted++;
  }
  console.log(`  [changelog] Done: ${inserted} rows`);
  return inserted;
}

// ─── Main ────────────────────────────────────────────────────────────

async function main() {
  console.log("🚀 Ragnarok LATAM — Supabase Seed Script");
  console.log(`   URL: ${SUPABASE_URL}`);
  console.log("");

  // Quick connectivity test
  const { error: testErr } = await supabase.from("items").select("id").limit(1);
  if (testErr && testErr.message.includes("does not exist")) {
    console.error("❌ Table 'items' does not exist!");
    console.error("   Please run scripts/supabase-schema.sql in your Supabase Dashboard → SQL Editor first.");
    process.exit(1);
  }

  const t0 = Date.now();

  await seedItems();
  await seedMonsters();
  await seedMonsterDrops();
  await seedAegisToId();
  await seedSkills();
  await seedChangelog();

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\n✅ Seed complete in ${elapsed}s`);

  // Verify counts
  console.log("\n📊 Verification:");
  for (const table of ["items", "monsters", "monster_drops", "aegis_to_id", "skills", "changelog"]) {
    const { count } = await supabase.from(table).select("*", { count: "exact", head: true });
    console.log(`   ${table}: ${count} rows`);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
