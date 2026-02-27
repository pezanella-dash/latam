import { NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";

export async function GET() {
  const filePath = path.join(process.cwd(), "data", "database", "changelog.json");

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ entries: [] });
  }

  const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  return NextResponse.json({ entries: data });
}
