import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding Ragnarok LATAM database...");

  // Seed job classes
  await prisma.jobClass.upsert({
    where: { id: "archbishop" },
    update: {},
    create: {
      id: "archbishop",
      name: "Archbishop",
      namePt: "Arcebispo",
      tree: "Novice > Acolyte > Priest > High Priest > Archbishop",
      baseClass: "acolyte",
      roles: ["support", "healer"],
      description: "The ultimate support class with powerful heals and buffs.",
    },
  });

  await prisma.jobClass.upsert({
    where: { id: "ranger" },
    update: {},
    create: {
      id: "ranger",
      name: "Ranger",
      namePt: "Ranger",
      tree: "Novice > Archer > Hunter > Sniper > Ranger",
      baseClass: "archer",
      roles: ["dps"],
      description: "Long-range physical DPS with traps and Warg.",
    },
  });

  await prisma.jobClass.upsert({
    where: { id: "warlock" },
    update: {},
    create: {
      id: "warlock",
      name: "Warlock",
      namePt: "Warlock",
      tree: "Novice > Mage > Wizard > High Wizard > Warlock",
      baseClass: "mage",
      roles: ["dps", "utility"],
      description: "Powerful magic DPS with elemental spells and AoE.",
    },
  });

  // Seed initial meta snapshot
  await prisma.metaSnapshot.create({
    data: {
      patch: "2025-01",
      tierList: {
        archbishop: { support: { tier: "S", notes: "Essential in every party" } },
        ranger: { dps: { tier: "A", notes: "Strong physical DPS" } },
        warlock: { dps: { tier: "A", notes: "Top magic DPS" } },
      },
      topBuilds: {},
      changes: "Initial seed data",
      sources: [],
    },
  });

  console.log("✅ Seed complete");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
