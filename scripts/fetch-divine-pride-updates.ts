/**
 * Fetch latest item updates from Divine Pride LATAM history.
 *
 * Scrapes divine-pride.net/database/history?server=LATAM to get
 * recently added/changed items, then upserts changelog entries
 * into Supabase.
 *
 * Usage:
 *   npx tsx scripts/fetch-divine-pride-updates.ts
 *   npx tsx scripts/fetch-divine-pride-updates.ts --date 2026-02-19
 *   npx tsx scripts/fetch-divine-pride-updates.ts --all   (fetches all available dates)
 *
 * Env vars required:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";

// ─── Config ─────────────────────────────────────────────────────────

const DP_BASE = "https://www.divine-pride.net";
const SERVER = "LATAM";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseKey);

// ─── Types ──────────────────────────────────────────────────────────

interface DPHistoryItem {
  id: number;
  name: string;
  imageUrl: string;
}

interface ChangelogEntry {
  date: string;
  newItems: Array<{ id: number; namePt: string; nameEn: string; type: string }>;
  changedItems: Array<{ id: number; namePt: string; nameEn: string; type: string; changes: string[] }>;
  removedCount: number;
}

// ─── Scraper ────────────────────────────────────────────────────────

async function fetchHistoryPage(date?: string): Promise<string> {
  const url = date
    ? `${DP_BASE}/database/history?server=${SERVER}&date=${date}`
    : `${DP_BASE}/database/history?server=${SERVER}`;

  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; RO-LATAM-Updater/1.0)",
      "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
    },
  });

  if (!res.ok) throw new Error(`HTTP ${res.status} fetching Divine Pride history`);
  return res.text();
}

function parseAvailableDates(html: string): string[] {
  const dates: string[] = [];
  // Match <option> tags in the date selector
  const optionRegex = /<option[^>]*value="(\d{4}-\d{2}-\d{2})"[^>]*>/g;
  let match;
  while ((match = optionRegex.exec(html)) !== null) {
    dates.push(match[1]);
  }
  return [...new Set(dates)].sort().reverse();
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function parseItemsFromHTML(html: string): DPHistoryItem[] {
  const items: DPHistoryItem[] = [];
  const seen = new Set<number>();

  // Pattern 1: <a href="/database/item/ID/slug">Name</a>
  const linkRegex = /href="\/database\/item\/(\d+)\/[^"]*"[^>]*>([^<]+)<\/a>/g;
  let match;
  while ((match = linkRegex.exec(html)) !== null) {
    const id = parseInt(match[1]);
    const name = decodeHtmlEntities(match[2].trim());
    if (!seen.has(id) && name) {
      seen.add(id);
      items.push({
        id,
        name,
        imageUrl: `https://static.divine-pride.net/images/items/item/${id}.png`,
      });
    }
  }

  // Pattern 2: data-id="ID" (backup)
  const dataIdRegex = /data-id="(\d+)"/g;
  while ((match = dataIdRegex.exec(html)) !== null) {
    const id = parseInt(match[1]);
    if (!seen.has(id)) {
      seen.add(id);
      items.push({ id, name: `Item #${id}`, imageUrl: "" });
    }
  }

  return items;
}

// ─── Item type classification ───────────────────────────────────────

function classifyItem(id: number, name: string): string {
  const lower = name.toLowerCase();

  if (id >= 24000 && id < 25000) return "Shadow Gear";
  if (id >= 100000 && id < 110000) return "Consumable";
  if (id >= 310000 && id < 320000) return "Enchant Stone";
  if (id >= 400000 && id < 410000) return "Headgear";
  if (id >= 420000 && id < 430000) return "Costume";
  if (id >= 490000 && id < 500000) return "Accessory";
  if (id >= 540000 && id < 560000) return "Weapon";
  if (id >= 1000000 && id < 1100000) return "Enchant Stone";

  if (lower.includes("shadow")) return "Shadow Gear";
  if (lower.includes("costume")) return "Costume";
  if (lower.includes("stone") && lower.includes("(")) return "Enchant Stone";
  if (lower.includes("cube") || lower.includes("box") || lower.includes("package")) return "Consumable";
  if (lower.includes("card")) return "Card";
  if (lower.includes("ring") || lower.includes("necklace") || lower.includes("earring")) return "Accessory";

  return "Equipment";
}

// ─── Supabase operations ────────────────────────────────────────────

async function getExistingItemIds(): Promise<Set<number>> {
  const { data, error } = await supabase
    .from("items")
    .select("id");
  if (error) {
    console.warn("  Warning: Could not fetch existing items:", error.message);
    return new Set();
  }
  return new Set((data || []).map((r: any) => r.id));
}

async function getExistingChangelogDates(): Promise<Set<string>> {
  const { data } = await supabase
    .from("changelog")
    .select("date");
  return new Set((data || []).map((r: any) => r.date));
}

async function upsertChangelog(entry: ChangelogEntry): Promise<void> {
  const { error } = await supabase
    .from("changelog")
    .upsert(
      { date: entry.date, data: entry },
      { onConflict: "date" }
    );
  if (error) {
    console.error(`  Error upserting changelog for ${entry.date}:`, error.message);
  }
}

// ─── Main ───────────────────────────────────────────────────────────

async function processDate(date: string, existingItemIds: Set<number>): Promise<ChangelogEntry> {
  console.log(`\n📅 Fetching ${date}...`);

  const html = await fetchHistoryPage(date);
  const dpItems = parseItemsFromHTML(html);

  console.log(`  Found ${dpItems.length} items on Divine Pride`);

  const newItems: ChangelogEntry["newItems"] = [];
  const changedItems: ChangelogEntry["changedItems"] = [];

  for (const item of dpItems) {
    const type = classifyItem(item.id, item.name);
    const isNew = !existingItemIds.has(item.id);

    if (isNew) {
      newItems.push({
        id: item.id,
        namePt: item.name,
        nameEn: item.name,
        type,
      });
    } else {
      changedItems.push({
        id: item.id,
        namePt: item.name,
        nameEn: item.name,
        type,
        changes: ["Atualizado no servidor LATAM"],
      });
    }
  }

  console.log(`  → ${newItems.length} novos, ${changedItems.length} atualizados`);

  return { date, newItems, changedItems, removedCount: 0 };
}

async function main() {
  const args = process.argv.slice(2);
  const fetchAll = args.includes("--all");
  const dateArg = args.find((a, i) => args[i - 1] === "--date");

  console.log("🔍 Divine Pride LATAM History Updater\n");

  // Step 1: Get available dates
  console.log("Fetching available dates...");
  const html = await fetchHistoryPage();
  const availableDates = parseAvailableDates(html);
  console.log(`Found ${availableDates.length} dates (${availableDates[0]} to ${availableDates[availableDates.length - 1]})`);

  // Step 2: Determine which dates to process
  const existingDates = await getExistingChangelogDates();
  let datesToProcess: string[];

  if (dateArg) {
    datesToProcess = [dateArg];
  } else if (fetchAll) {
    datesToProcess = availableDates;
  } else {
    // Default: fetch only new dates not yet in changelog
    datesToProcess = availableDates.filter((d) => !existingDates.has(d));
    if (datesToProcess.length === 0) {
      // Always re-fetch the most recent date
      datesToProcess = availableDates.slice(0, 1);
    }
  }

  console.log(`Processing ${datesToProcess.length} date(s): ${datesToProcess.join(", ")}`);

  // Step 3: Get existing item IDs for new vs changed classification
  const existingItemIds = await getExistingItemIds();
  console.log(`Existing items in DB: ${existingItemIds.size}`);

  // Step 4: Process each date
  let totalNew = 0;
  let totalChanged = 0;

  for (const date of datesToProcess) {
    const entry = await processDate(date, existingItemIds);
    await upsertChangelog(entry);
    totalNew += entry.newItems.length;
    totalChanged += entry.changedItems.length;

    // Rate limit: wait between requests
    if (datesToProcess.length > 1) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  // Step 5: Cleanup old generic changelog entries
  // Delete entries that don't come from Divine Pride (e.g. the old seed data)
  const { data: allChangelogs } = await supabase
    .from("changelog")
    .select("id, date")
    .order("date", { ascending: false });

  const dpDates = new Set(datesToProcess);
  const toDelete = (allChangelogs || [])
    .filter((c: any) => !availableDates.includes(c.date) && !dpDates.has(c.date));

  if (toDelete.length > 0) {
    const ids = toDelete.map((c: any) => c.id);
    await supabase.from("changelog").delete().in("id", ids);
    console.log(`\n🗑️  Removed ${toDelete.length} old changelog entries`);
  }

  console.log(`\n✅ Done! ${totalNew} new items, ${totalChanged} updated across ${datesToProcess.length} dates`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
