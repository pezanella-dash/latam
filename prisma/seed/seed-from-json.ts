/**
 * Database Seeder — Populates PostgreSQL from data/database/ JSON files.
 *
 * Usage:
 *   npx tsx prisma/seed/seed-from-json.ts
 *
 * Prerequisites:
 *   1. docker compose up -d (PostgreSQL running)
 *   2. npx prisma migrate dev (schema applied)
 *   3. npx tsx scripts/build-database.ts (JSON files generated)
 */

import { PrismaClient, ItemType } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();
const DB_DIR = path.join(process.cwd(), "data", "database");

// ─── Type mapping ───────────────────────────────────────────────────

const TYPE_MAP: Record<string, ItemType> = {
  Weapon: ItemType.WEAPON,
  Armor: ItemType.ARMOR,
  Card: ItemType.CARD,
  Consumable: ItemType.CONSUMABLE,
  Healing: ItemType.HEALING,
  Usable: ItemType.USABLE,
  DelayConsume: ItemType.DELAYCONSUME,
  Etc: ItemType.MISC,
  Ammo: ItemType.AMMUNITION,
  ShadowGear: ItemType.SHADOW,
  PetArmor: ItemType.MISC,
  Cash: ItemType.MISC,
  Unknown: ItemType.UNKNOWN,
};

function resolveType(typeStr: string): ItemType {
  return TYPE_MAP[typeStr] || ItemType.MISC;
}

// ─── Batch insert helper ────────────────────────────────────────────

async function batchUpsert<T>(
  items: T[],
  batchSize: number,
  upsertFn: (item: T) => Promise<void>,
  label: string
): Promise<{ ok: number; fail: number }> {
  let ok = 0;
  let fail = 0;

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const results = await Promise.allSettled(batch.map(upsertFn));
    for (const r of results) {
      if (r.status === "fulfilled") ok++;
      else fail++;
    }
    process.stdout.write(
      `\r  ${label}: ${ok + fail}/${items.length} (${ok} ok, ${fail} fail)`
    );
  }
  console.log();
  return { ok, fail };
}

// ─── Seed Items ─────────────────────────────────────────────────────

async function seedItems() {
  const filePath = path.join(DB_DIR, "items.json");
  if (!fs.existsSync(filePath)) {
    console.log("  SKIP: items.json not found");
    return;
  }

  const items = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  console.log(`  Loading ${items.length} items...`);

  const { ok, fail } = await batchUpsert(
    items,
    100,
    async (item: any) => {
      await prisma.item.upsert({
        where: { id: item.id },
        update: {
          aegisName: item.aegisName || "",
          name: item.nameEn || item.namePt || "",
          namePt: item.namePt || null,
          type: resolveType(item.type),
          subType: item.subType || null,
          weight: item.weight || 0,
          atk: item.attack ?? null,
          matk: item.magicAttack ?? null,
          defense: item.defense ?? null,
          range: item.range ?? null,
          slots: item.slots || 0,
          equipLevelMin: item.equipLevelMin ?? null,
          equipLevelMax: item.equipLevelMax ?? null,
          weaponLevel: item.weaponLevel ?? null,
          armorLevel: item.armorLevel ?? null,
          buy: item.buy ?? null,
          sell: item.sell ?? null,
          jobs: item.jobs || [],
          classes: item.classes || [],
          locations: item.locations || [],
          description: item.description || [],
          script: item.script || null,
          equipScript: item.equipScript || null,
          refineable: item.refineable || false,
          gradable: item.gradable || false,
          costume: item.costume || false,
          classNum: item.classNum || 0,
        },
        create: {
          id: item.id,
          aegisName: item.aegisName || "",
          name: item.nameEn || item.namePt || "",
          namePt: item.namePt || null,
          type: resolveType(item.type),
          subType: item.subType || null,
          weight: item.weight || 0,
          atk: item.attack ?? null,
          matk: item.magicAttack ?? null,
          defense: item.defense ?? null,
          range: item.range ?? null,
          slots: item.slots || 0,
          equipLevelMin: item.equipLevelMin ?? null,
          equipLevelMax: item.equipLevelMax ?? null,
          weaponLevel: item.weaponLevel ?? null,
          armorLevel: item.armorLevel ?? null,
          buy: item.buy ?? null,
          sell: item.sell ?? null,
          jobs: item.jobs || [],
          classes: item.classes || [],
          locations: item.locations || [],
          description: item.description || [],
          script: item.script || null,
          equipScript: item.equipScript || null,
          refineable: item.refineable || false,
          gradable: item.gradable || false,
          costume: item.costume || false,
          classNum: item.classNum || 0,
        },
      });
    },
    "Items"
  );

  console.log(`  Items done: ${ok} ok, ${fail} fail`);
}

// ─── Seed Monsters ──────────────────────────────────────────────────

async function seedMonsters() {
  const filePath = path.join(DB_DIR, "monsters.json");
  if (!fs.existsSync(filePath)) {
    console.log("  SKIP: monsters.json not found");
    return;
  }

  const monsters = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  console.log(`  Loading ${monsters.length} monsters...`);

  const { ok, fail } = await batchUpsert(
    monsters,
    50,
    async (m: any) => {
      await prisma.monster.upsert({
        where: { id: m.id },
        update: {
          aegisName: m.aegisName,
          name: m.name,
          level: m.level,
          hp: m.hp,
          sp: m.sp || 0,
          baseExp: m.baseExp,
          jobExp: m.jobExp,
          mvpExp: m.mvpExp || 0,
          attack: m.attack,
          magicAttack: m.magicAttack,
          defense: m.defense,
          magicDefense: m.magicDefense,
          str: m.stats.str,
          agi: m.stats.agi,
          vit: m.stats.vit,
          int_: m.stats.int,
          dex: m.stats.dex,
          luk: m.stats.luk,
          attackRange: m.attackRange,
          skillRange: m.skillRange,
          chaseRange: m.chaseRange,
          size: m.size,
          race: m.race,
          element: m.element,
          elementLevel: m.elementLevel,
          walkSpeed: m.walkSpeed,
          attackDelay: m.attackDelay,
          attackMotion: m.attackMotion,
          damageMotion: m.damageMotion,
          ai: m.ai,
          class: m.class,
          isMvp: m.isMvp,
          modes: m.modes || [],
        },
        create: {
          id: m.id,
          aegisName: m.aegisName,
          name: m.name,
          level: m.level,
          hp: m.hp,
          sp: m.sp || 0,
          baseExp: m.baseExp,
          jobExp: m.jobExp,
          mvpExp: m.mvpExp || 0,
          attack: m.attack,
          magicAttack: m.magicAttack,
          defense: m.defense,
          magicDefense: m.magicDefense,
          str: m.stats.str,
          agi: m.stats.agi,
          vit: m.stats.vit,
          int_: m.stats.int,
          dex: m.stats.dex,
          luk: m.stats.luk,
          attackRange: m.attackRange,
          skillRange: m.skillRange,
          chaseRange: m.chaseRange,
          size: m.size,
          race: m.race,
          element: m.element,
          elementLevel: m.elementLevel,
          walkSpeed: m.walkSpeed,
          attackDelay: m.attackDelay,
          attackMotion: m.attackMotion,
          damageMotion: m.damageMotion,
          ai: m.ai,
          class: m.class,
          isMvp: m.isMvp,
          modes: m.modes || [],
        },
      });
    },
    "Monsters"
  );

  console.log(`  Monsters done: ${ok} ok, ${fail} fail`);
}

// ─── Seed Monster Drops ─────────────────────────────────────────────

async function seedDrops() {
  const monstersPath = path.join(DB_DIR, "monsters.json");
  const aegisPath = path.join(DB_DIR, "aegis-to-id.json");
  if (!fs.existsSync(monstersPath) || !fs.existsSync(aegisPath)) {
    console.log("  SKIP: monsters.json or aegis-to-id.json not found");
    return;
  }

  const monsters = JSON.parse(fs.readFileSync(monstersPath, "utf-8"));
  const aegisToId: Record<string, number> = JSON.parse(
    fs.readFileSync(aegisPath, "utf-8")
  );

  // Clear existing drops
  await prisma.monsterDrop.deleteMany();
  await prisma.monsterMvpDrop.deleteMany();

  let totalDrops = 0;
  let totalMvpDrops = 0;
  let unresolved = 0;

  const dropBatch: Array<{
    monsterId: number;
    itemId: number;
    rate: number;
    stealProtected: boolean;
  }> = [];

  const mvpDropBatch: Array<{
    monsterId: number;
    aegisName: string;
    rate: number;
  }> = [];

  for (const m of monsters) {
    for (const drop of m.drops || []) {
      const itemId = aegisToId[drop.aegisName];
      if (itemId) {
        dropBatch.push({
          monsterId: m.id,
          itemId,
          rate: drop.rate,
          stealProtected: drop.stealProtected || false,
        });
        totalDrops++;
      } else {
        unresolved++;
      }
    }
    for (const drop of m.mvpDrops || []) {
      mvpDropBatch.push({
        monsterId: m.id,
        aegisName: drop.aegisName,
        rate: drop.rate,
      });
      totalMvpDrops++;
    }
  }

  // Batch insert drops
  const BATCH = 500;
  for (let i = 0; i < dropBatch.length; i += BATCH) {
    await prisma.monsterDrop.createMany({
      data: dropBatch.slice(i, i + BATCH),
      skipDuplicates: true,
    });
    process.stdout.write(
      `\r  Drops: ${Math.min(i + BATCH, dropBatch.length)}/${dropBatch.length}`
    );
  }
  console.log();

  for (let i = 0; i < mvpDropBatch.length; i += BATCH) {
    await prisma.monsterMvpDrop.createMany({
      data: mvpDropBatch.slice(i, i + BATCH),
      skipDuplicates: true,
    });
  }

  console.log(
    `  Drops done: ${totalDrops} normal + ${totalMvpDrops} MVP (${unresolved} unresolved items)`
  );
}

// ─── Seed Skills ────────────────────────────────────────────────────

async function seedSkills() {
  const filePath = path.join(DB_DIR, "skills.json");
  if (!fs.existsSync(filePath)) {
    console.log("  SKIP: skills.json not found");
    return;
  }

  const skills = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  console.log(`  Loading ${skills.length} skills...`);

  const { ok, fail } = await batchUpsert(
    skills,
    100,
    async (s: any) => {
      await prisma.skill.upsert({
        where: { id: s.id },
        update: {
          aegisName: s.aegisName,
          name: s.description || s.aegisName,
          maxLevel: s.maxLevel,
          type: s.type || "None",
          targetType: s.targetType || "Passive",
        },
        create: {
          id: s.id,
          aegisName: s.aegisName,
          name: s.description || s.aegisName,
          maxLevel: s.maxLevel,
          type: s.type || "None",
          targetType: s.targetType || "Passive",
        },
      });
    },
    "Skills"
  );

  console.log(`  Skills done: ${ok} ok, ${fail} fail`);
}

// ─── Main ───────────────────────────────────────────────────────────

async function main() {
  console.log("═══════════════════════════════════════════════════════");
  console.log("  LATAM Ragnarok Database Seeder");
  console.log("═══════════════════════════════════════════════════════\n");

  console.log("[1/4] Seeding items...");
  await seedItems();

  console.log("\n[2/4] Seeding monsters...");
  await seedMonsters();

  console.log("\n[3/4] Seeding drops...");
  await seedDrops();

  console.log("\n[4/4] Seeding skills...");
  await seedSkills();

  // Stats
  const itemCount = await prisma.item.count();
  const monsterCount = await prisma.monster.count();
  const dropCount = await prisma.monsterDrop.count();
  const skillCount = await prisma.skill.count();

  console.log("\n═══════════════════════════════════════════════════════");
  console.log("  Seeding complete!");
  console.log("═══════════════════════════════════════════════════════");
  console.log(`  Items:    ${itemCount}`);
  console.log(`  Monsters: ${monsterCount}`);
  console.log(`  Drops:    ${dropCount}`);
  console.log(`  Skills:   ${skillCount}`);
  console.log("\nDatabase ready for AI integration!");
}

main()
  .catch((err) => {
    console.error("Seed error:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
