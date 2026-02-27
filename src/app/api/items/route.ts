import { NextRequest, NextResponse } from "next/server";
import { searchItems, getItemById, findMonstersDropping } from "@/lib/db/json-database";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const type = searchParams.get("type") || undefined;
  const id = searchParams.get("id");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "60"), 500);
  const offset = parseInt(searchParams.get("offset") ?? "0");

  // Single item by ID
  if (id) {
    const item = getItemById(parseInt(id));
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const droppedBy = findMonstersDropping(item.id);
    return NextResponse.json({ item, droppedBy });
  }

  const location = searchParams.get("location") || undefined;
  const job = searchParams.get("job") || undefined;
  const { items, total } = searchItems({ query: q, type, limit, offset, location, job });
  return NextResponse.json({ items, total });
}
