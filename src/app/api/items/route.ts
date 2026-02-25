import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { ItemType } from "@prisma/client";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const type = searchParams.get("type") as ItemType | null;
  const take = Math.min(parseInt(searchParams.get("limit") ?? "60"), 120);

  const items = await prisma.item.findMany({
    where: {
      ...(q && {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { namePt: { contains: q, mode: "insensitive" } },
        ],
      }),
      ...(type && { type }),
    },
    select: {
      id: true,
      name: true,
      namePt: true,
      type: true,
      slots: true,
      atk: true,
      matk: true,
      defense: true,
      requiredLevel: true,
      imageUrl: true,
    },
    orderBy: { name: "asc" },
    take,
  });

  return NextResponse.json({ items });
}
