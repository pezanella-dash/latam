import { NextRequest, NextResponse } from "next/server";
import { searchMonsters, getMonsterById, resolveDropsToItems } from "@/lib/db/json-database";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const race = searchParams.get("race") || undefined;
  const element = searchParams.get("element") || undefined;
  const mvpOnly = searchParams.get("mvp") === "true";
  const id = searchParams.get("id");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "60"), 500);
  const offset = parseInt(searchParams.get("offset") ?? "0");

  // Single monster by ID
  if (id) {
    const monster = getMonsterById(parseInt(id));
    if (!monster) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const drops = resolveDropsToItems(monster.drops);
    const mvpDrops = resolveDropsToItems(monster.mvpDrops || []);
    return NextResponse.json({ monster, drops, mvpDrops });
  }

  const { monsters, total } = searchMonsters({ query: q, race, element, mvpOnly, limit, offset });
  return NextResponse.json({ monsters, total });
}
