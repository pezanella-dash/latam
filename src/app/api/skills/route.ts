import { NextRequest, NextResponse } from "next/server";
import { searchSkills } from "@/lib/db/json-database";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const type = searchParams.get("type") || undefined;
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "60"), 500);
  const offset = parseInt(searchParams.get("offset") ?? "0");

  const { skills, total } = searchSkills({ query: q, type, limit, offset });
  return NextResponse.json({ skills, total });
}
