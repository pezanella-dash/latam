/**
 * Mass sync script — populates the DB with LATAM items from Divine Pride.
 *
 * Usage:
 *   npx tsx scripts/sync-items.ts                     # sync default list
 *   npx tsx scripts/sync-items.ts --ids 2101,2102     # specific IDs
 *   npx tsx scripts/sync-items.ts --range 2101-2200   # ID range
 *
 * Divine Pride rate limit: ~3 req/s for free accounts.
 */

import { PrismaClient, ItemType } from "@prisma/client";
import { divinePride, type DPItem } from "../src/lib/ro/divine-pride";

const prisma = new PrismaClient();

// ─── Well-known LATAM item ID ranges ─────────────────────────────
// Adjust these as needed based on your server's actual item IDs.
const DEFAULT_RANGES: [number, number][] = [
  [1100, 1999], // Weapons (1H/2H swords, axes, etc.)
  [2100, 2399], // Armors
  [2400, 2499], // Shields
  [2500, 2599], // Garments
  [2600, 2699], // Shoes
  [2700, 2899], // Accessories
  [4001, 4999], // Cards
  [19100, 19399], // Shadow gear
];

const DP_TYPE_MAP: Record<number, ItemType> = {
  0: ItemType.MISC,
  4: ItemType.ARMOR,
  5: ItemType.WEAPON,
  6: ItemType.CARD,
  10: ItemType.AMMUNITION,
  11: ItemType.CONSUMABLE,
};

function resolveType(dpType: number): ItemType {
  return DP_TYPE_MAP[dpType] ?? ItemType.MISC;
}

async function upsertItem(dp: DPItem) {
  await prisma.item.upsert({
    where: { id: dp.id },
    update: {
      name: dp.identifiedDisplayName,
      type: resolveType(dp.itemTypeId),
      weight: dp.weight,
      atk: dp.attack ?? undefined,
      matk: dp.magicAttack ?? undefined,
      defense: dp.defense ?? undefined,
      slots: dp.slots,
      requiredLevel: dp.requiredLevel ?? undefined,
      description: dp.description,
      imageUrl: dp.imageUrl,
      isEquipment: dp.equipLocationMask > 0,
      refineable: dp.refinable,
    },
    create: {
      id: dp.id,
      name: dp.identifiedDisplayName,
      type: resolveType(dp.itemTypeId),
      weight: dp.weight,
      atk: dp.attack ?? undefined,
      matk: dp.magicAttack ?? undefined,
      defense: dp.defense ?? undefined,
      slots: dp.slots,
      requiredLevel: dp.requiredLevel ?? undefined,
      description: dp.description,
      imageUrl: dp.imageUrl,
      isEquipment: dp.equipLocationMask > 0,
      refineable: dp.refinable,
    },
  });
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function syncIds(ids: number[]) {
  let synced = 0;
  let skipped = 0;
  let failed = 0;

  for (const id of ids) {
    try {
      const item = await divinePride.item(id);
      await upsertItem(item);
      synced++;
      process.stdout.write(`\r✅ ${synced} synced | ${skipped} skipped | ${failed} failed`);
    } catch (err: unknown) {
      const status = (err as { message?: string })?.message?.includes("404") ? 404 : 0;
      if (status === 404) {
        skipped++;
      } else {
        failed++;
        console.error(`\nFailed ID ${id}:`, (err as Error).message);
      }
    }
    // ~3 req/s to stay within DP free tier limits
    await sleep(350);
  }

  console.log(`\n\nDone! ${synced} synced | ${skipped} skipped | ${failed} failed`);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const idsFlag = args.indexOf("--ids");
  const rangeFlag = args.indexOf("--range");

  if (idsFlag !== -1 && args[idsFlag + 1]) {
    return args[idsFlag + 1].split(",").map(Number);
  }

  if (rangeFlag !== -1 && args[rangeFlag + 1]) {
    const [start, end] = args[rangeFlag + 1].split("-").map(Number);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

  // Default: all ranges
  const ids: number[] = [];
  for (const [start, end] of DEFAULT_RANGES) {
    for (let i = start; i <= end; i++) ids.push(i);
  }
  return ids;
}

async function main() {
  const ids = parseArgs();
  console.log(`Starting sync of ${ids.length} item IDs from Divine Pride (server=LATAM)...\n`);
  await syncIds(ids);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
