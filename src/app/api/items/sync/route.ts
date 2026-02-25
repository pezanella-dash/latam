/**
 * POST /api/items/sync?id=501
 * Fetches a single item from Divine Pride LATAM and upserts into DB.
 *
 * POST /api/items/sync  (body: { ids: number[] })
 * Batch sync multiple items.
 */
import { NextRequest, NextResponse } from "next/server";
import { divinePride } from "@/lib/ro/divine-pride";
import { prisma } from "@/lib/db/prisma";
import { ItemType } from "@prisma/client";

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

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const singleId = searchParams.get("id");

    const ids: number[] = singleId
      ? [parseInt(singleId)]
      : ((await req.json()) as { ids: number[] }).ids;

    const results = await Promise.allSettled(
      ids.map(async (id) => {
        const dp = await divinePride.item(id);
        return prisma.item.upsert({
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
      })
    );

    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    return NextResponse.json({ synced: succeeded, failed, total: ids.length });
  } catch (error) {
    console.error("Item sync error:", error);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
