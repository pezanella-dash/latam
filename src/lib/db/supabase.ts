/**
 * Supabase client module — Replaces json-database.ts for online deployment.
 * All data queries go directly to Supabase from the browser.
 */

import { createClient } from "@supabase/supabase-js";

// ─── Client ──────────────────────────────────────────────────────────

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Lazy singleton — avoids crashing during Next.js static prerender when env vars
// are baked into the client bundle but not available on the server render pass.
let _client: ReturnType<typeof createClient> | null = null;
export function getSupabase() {
  if (!_client) {
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Supabase env vars not set — NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY");
    }
    _client = createClient(supabaseUrl, supabaseAnonKey);
  }
  return _client;
}

// Keep a convenient export for direct Supabase queries (e.g. meta page)
// This is safe because it's only called at runtime in the browser, not during prerender.
export const supabase = typeof window !== "undefined"
  ? createClient(supabaseUrl || "https://placeholder.supabase.co", supabaseAnonKey || "placeholder")
  : (null as unknown as ReturnType<typeof createClient>);

// ─── Types (same shape as json-database.ts) ─────────────────────────

export interface DbItem {
  id: number;
  aegisName: string;
  nameEn: string;
  namePt: string;
  type: string;
  subType?: string;
  weight: number;
  attack?: number;
  magicAttack?: number;
  defense?: number;
  range?: number;
  slots: number;
  equipLevelMin?: number;
  equipLevelMax?: number;
  weaponLevel?: number;
  armorLevel?: number;
  refineable: boolean;
  gradable: boolean;
  buy?: number;
  sell?: number;
  locations: string[];
  jobs: string[];
  classes: string[];
  description: string[];
  script?: string;
  equipScript?: string;
  classNum: number;
  costume: boolean;
  affix?: { text: string; type: "prefix" | "suffix" };
}

export interface DbMonster {
  id: number;
  aegisName: string;
  name: string;
  namePt: string;
  level: number;
  hp: number;
  sp: number;
  baseExp: number;
  jobExp: number;
  mvpExp: number;
  attack: number;
  magicAttack: number;
  defense: number;
  magicDefense: number;
  stats: { str: number; agi: number; vit: number; int: number; dex: number; luk: number };
  attackRange: number;
  skillRange: number;
  chaseRange: number;
  size: string;
  race: string;
  element: string;
  elementLevel: number;
  walkSpeed: number;
  attackDelay: number;
  attackMotion: number;
  damageMotion: number;
  ai: string;
  class: string;
  isMvp: boolean;
  modes: string[];
  drops: Array<{ aegisName: string; rate: number; stealProtected: boolean }>;
  mvpDrops: Array<{ aegisName: string; rate: number }>;
}

export interface DbSkill {
  id: number;
  aegisName: string;
  description: string;
  namePt: string;
  maxLevel: number;
  type: string;
  targetType: string;
}

// ─── Row → camelCase mappers ────────────────────────────────────────

function rowToItem(row: any): DbItem {
  return {
    id: row.id,
    aegisName: row.aegis_name,
    nameEn: row.name_en,
    namePt: row.name_pt,
    type: row.type,
    subType: row.sub_type ?? undefined,
    weight: row.weight,
    attack: row.attack ?? undefined,
    magicAttack: row.magic_attack ?? undefined,
    defense: row.defense ?? undefined,
    range: row.range ?? undefined,
    slots: row.slots,
    equipLevelMin: row.equip_level_min ?? undefined,
    equipLevelMax: row.equip_level_max ?? undefined,
    weaponLevel: row.weapon_level ?? undefined,
    armorLevel: row.armor_level ?? undefined,
    refineable: row.refineable,
    gradable: row.gradable,
    buy: row.buy ?? undefined,
    sell: row.sell ?? undefined,
    locations: row.locations || [],
    jobs: row.jobs || [],
    classes: row.classes || [],
    description: row.description || [],
    script: row.script ?? undefined,
    equipScript: row.equip_script ?? undefined,
    classNum: row.class_num,
    costume: row.costume,
    affix: row.affix_text ? { text: row.affix_text, type: row.affix_type } : undefined,
  };
}

function rowToMonster(row: any): Omit<DbMonster, "drops" | "mvpDrops"> {
  return {
    id: row.id,
    aegisName: row.aegis_name,
    name: row.name,
    namePt: row.name_pt,
    level: row.level,
    hp: row.hp,
    sp: row.sp,
    baseExp: row.base_exp,
    jobExp: row.job_exp,
    mvpExp: row.mvp_exp,
    attack: row.attack,
    magicAttack: row.magic_attack,
    defense: row.defense,
    magicDefense: row.magic_defense,
    stats: { str: row.str, agi: row.agi, vit: row.vit, int: row.int, dex: row.dex, luk: row.luk },
    attackRange: row.attack_range,
    skillRange: row.skill_range,
    chaseRange: row.chase_range,
    size: row.size,
    race: row.race,
    element: row.element,
    elementLevel: row.element_level,
    walkSpeed: row.walk_speed,
    attackDelay: row.attack_delay,
    attackMotion: row.attack_motion,
    damageMotion: row.damage_motion,
    ai: row.ai,
    class: row.class,
    isMvp: row.is_mvp,
    modes: row.modes || [],
  };
}

function rowToSkill(row: any): DbSkill {
  return {
    id: row.id,
    aegisName: row.aegis_name,
    description: row.description,
    namePt: row.name_pt,
    maxLevel: row.max_level,
    type: row.type,
    targetType: row.target_type,
  };
}

// ─── Text normalization (for client-side accent stripping) ──────────

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// ─── JOB_ALIASES (identical to json-database.ts) ────────────────────

const JOB_ALIASES: Record<string, string[]> = {
  Bard:       ["BardDancer", "Bardos e evoluções"],
  Dancer:     ["BardDancer", "Odaliscas e evoluções"],
  Minstrel:   ["BardDancer", "Bardos e evoluções"],
  Wanderer:   ["BardDancer", "Odaliscas e evoluções"],
  Swordman:   ["Espadachins e evoluções"],
  Mage:       ["Magos e evoluções"],
  Archer:     ["Arqueiros e evoluções"],
  Acolyte:    ["Espiritualistas e evoluções"],
  Merchant:   ["Mercadores e evoluções"],
  Thief:      ["Gatunos e evoluções"],
  Novice:     ["Noviços e evoluções"],
  SuperNovice:["Superaprendizes e evoluções", "Noviços e evoluções"],
  Knight:     ["Cavaleiros Rúnicos e evoluções", "Espadachins e evoluções"],
  Crusader:   ["Guardiões Reais e evoluções", "Espadachins e evoluções"],
  Wizard:     ["Arcanos e evoluções", "Magos e evoluções"],
  Sage:       ["Feiticeiros e evoluções", "Magos e evoluções"],
  Hunter:     ["Sentinelas e evoluções", "Arqueiros e evoluções"],
  Priest:     ["Arcebispo e evoluções", "Espiritualistas e evoluções"],
  Monk:       ["Shura e evoluções", "Espiritualistas e evoluções"],
  Blacksmith: ["Mecânicos e evoluções", "Mercadores e evoluções"],
  Alchemist:  ["Bioquímicos e evoluções", "Mercadores e evoluções"],
  Assassin:   ["Sicários e evoluções", "Gatunos e evoluções"],
  Rogue:      ["Renegados e evoluções", "Gatunos e evoluções"],
  Rune_Knight:   ["Cavaleiros Rúnicos e evoluções"],
  Royal_Guard:   ["Guardiões Reais e evoluções"],
  Warlock:       ["Arcanos e evoluções"],
  Sorcerer:      ["Feiticeiros e evoluções"],
  Ranger:        ["Sentinelas e evoluções"],
  Arch_Bishop:   ["Arcebispo e evoluções"],
  Sura:          ["Shura e evoluções"],
  Mechanic:      ["Mecânicos e evoluções"],
  Genetic:       ["Bioquímicos e evoluções"],
  Guillotine_Cross: ["Sicários e evoluções"],
  Shadow_Chaser: ["Renegados e evoluções"],
  Gunslinger: ["Justiceiros e evoluções"],
  Rebellion:  ["Justiceiros e evoluções"],
  Ninja:      ["Ninjas e evoluções"],
  KagerouOboro: ["Ninjas e evoluções"],
  Kagerou:    ["KagerouOboro", "Ninjas e evoluções"],
  Oboro:      ["KagerouOboro", "Ninjas e evoluções"],
  Taekwon:    ["Mestres Taekwons e evoluções"],
  StarGladiator: ["Mestres Estelares e evoluções"],
  Star_Emperor:  ["Mestres Estelares e evoluções"],
  SoulLinker:    ["Ceifadores de Almas e evoluções"],
  Soul_Reaper:   ["Ceifadores de Almas e evoluções"],
  Summoner:      ["Invocadores e evoluções"],
  Spirit_Handler:["Invocadores e evoluções"],
};

// ─── Search functions ───────────────────────────────────────────────

export async function searchItems(opts: {
  query?: string;
  type?: string;
  location?: string;
  job?: string;
  limit?: number;
  offset?: number;
}): Promise<{ items: DbItem[]; total: number }> {
  const { query, type, location, job, limit = 60, offset = 0 } = opts;

  let q = getSupabase().from("items").select("*", { count: "exact" });

  if (type) {
    if (type === "Consumable") {
      q = q.or("type.eq.Consumable,type.eq.DelayConsume");
    } else {
      q = q.eq("type", type);
    }
  }

  if (location) {
    const locs = location.split(",");
    q = q.overlaps("locations", locs);
    q = q.not("type", "in", "(Card,Consumable,DelayConsume,Usable,Cash,Healing,Etc,Ammo,Petegg,PetEgg,Petarmor,PetArmor,Unknown)");
  }

  if (job) {
    const jobNames = job.split(",");
    const expanded = new Set(jobNames);
    for (const jn of jobNames) {
      const aliases = JOB_ALIASES[jn];
      if (aliases) aliases.forEach((a) => expanded.add(a));
    }
    // Supabase: items with no jobs restriction OR matching job
    q = q.or(`jobs.eq.{},jobs.ov.{${[...expanded].join(",")}},jobs.cs.{All}`);
  }

  if (query) {
    const trimmed = query.trim();
    if (/^\d+$/.test(trimmed)) {
      q = q.eq("id", parseInt(trimmed));
    } else {
      const normalized = normalizeText(trimmed);
      q = q.ilike("search_text", `%${normalized}%`);
    }
  }

  q = q.range(offset, offset + limit - 1);

  const { data, count, error } = await q;
  if (error) {
    console.error("searchItems error:", error.message);
    return { items: [], total: 0 };
  }

  return {
    items: (data || []).map(rowToItem),
    total: count || 0,
  };
}

export async function searchMonsters(opts: {
  query?: string;
  race?: string;
  element?: string;
  mvpOnly?: boolean;
  limit?: number;
  offset?: number;
}): Promise<{ monsters: (Omit<DbMonster, "drops" | "mvpDrops"> & { drops?: any[]; mvpDrops?: any[] })[]; total: number }> {
  const { query, race, element, mvpOnly, limit = 60, offset = 0 } = opts;

  let q = getSupabase().from("monsters").select("*", { count: "exact" });

  if (mvpOnly) q = q.eq("is_mvp", true);
  if (race) q = q.eq("race", race);
  if (element) q = q.eq("element", element);

  if (query) {
    const trimmed = query.trim();
    if (/^\d+$/.test(trimmed)) {
      q = q.eq("id", parseInt(trimmed));
    } else {
      const normalized = normalizeText(trimmed);
      q = q.ilike("search_text", `%${normalized}%`);
    }
  }

  q = q.range(offset, offset + limit - 1);

  const { data, count, error } = await q;
  if (error) {
    console.error("searchMonsters error:", error.message);
    return { monsters: [], total: 0 };
  }

  return {
    monsters: (data || []).map((row) => ({ ...rowToMonster(row), drops: [], mvpDrops: [] })),
    total: count || 0,
  };
}

export async function searchSkills(opts: {
  query?: string;
  type?: string;
  limit?: number;
  offset?: number;
}): Promise<{ skills: DbSkill[]; total: number }> {
  const { query, type, limit = 60, offset = 0 } = opts;

  let q = getSupabase().from("skills").select("*", { count: "exact" });

  if (type) q = q.eq("type", type);

  if (query) {
    const trimmed = query.trim();
    if (/^\d+$/.test(trimmed)) {
      q = q.eq("id", parseInt(trimmed));
    } else {
      const normalized = normalizeText(trimmed);
      q = q.ilike("search_text", `%${normalized}%`);
    }
  }

  q = q.range(offset, offset + limit - 1);

  const { data, count, error } = await q;
  if (error) {
    console.error("searchSkills error:", error.message);
    return { skills: [], total: 0 };
  }

  return {
    skills: (data || []).map(rowToSkill),
    total: count || 0,
  };
}

// ─── Single record lookups ──────────────────────────────────────────

export async function getItemById(id: number): Promise<DbItem | null> {
  const { data, error } = await getSupabase()
    .from("items")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return rowToItem(data);
}

export async function getMonsterById(id: number): Promise<DbMonster | null> {
  const { data: row, error } = await getSupabase()
    .from("monsters")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !row) return null;

  // Fetch drops
  const { data: drops } = await getSupabase()
    .from("monster_drops")
    .select("aegis_name, rate, steal_protected, is_mvp_drop")
    .eq("monster_id", id);

  const normalDrops = (drops || [])
    .filter((d: any) => !d.is_mvp_drop)
    .map((d: any) => ({ aegisName: d.aegis_name, rate: d.rate, stealProtected: d.steal_protected }));
  const mvpDrops = (drops || [])
    .filter((d: any) => d.is_mvp_drop)
    .map((d: any) => ({ aegisName: d.aegis_name, rate: d.rate }));

  return {
    ...rowToMonster(row),
    drops: normalDrops,
    mvpDrops,
  };
}

// ─── Cross-reference functions ──────────────────────────────────────

export async function resolveDropsToItems(
  drops: Array<{ aegisName: string; rate: number; stealProtected?: boolean }>
): Promise<Array<{ item: DbItem | null; aegisName: string; rate: number; stealProtected: boolean }>> {
  if (!drops.length) return [];

  const aegisNames = drops.map((d) => d.aegisName);

  // Batch lookup aegis → id
  const { data: mappings } = await getSupabase()
    .from("aegis_to_id")
    .select("aegis_name, item_id")
    .in("aegis_name", aegisNames);

  const aegisMap = new Map<string, number>();
  (mappings || []).forEach((m: any) => aegisMap.set(m.aegis_name, m.item_id));

  // Get all items at once
  const itemIds = [...new Set([...aegisMap.values()])];
  let itemMap = new Map<number, DbItem>();
  if (itemIds.length > 0) {
    const { data: items } = await supabase
      .from("items")
      .select("*")
      .in("id", itemIds);
    (items || []).forEach((row: any) => itemMap.set(row.id, rowToItem(row)));
  }

  return drops.map((d) => ({
    item: aegisMap.has(d.aegisName) ? (itemMap.get(aegisMap.get(d.aegisName)!) || null) : null,
    aegisName: d.aegisName,
    rate: d.rate,
    stealProtected: d.stealProtected || false,
  }));
}

export async function findMonstersDropping(itemId: number): Promise<Array<{ monster: Omit<DbMonster, "drops" | "mvpDrops">; rate: number }>> {
  const item = await getItemById(itemId);
  if (!item) return [];

  const { data: drops } = await getSupabase()
    .from("monster_drops")
    .select("monster_id, rate")
    .eq("aegis_name", item.aegisName)
    .eq("is_mvp_drop", false)
    .order("rate", { ascending: false });

  if (!drops || drops.length === 0) return [];

  const monsterIds = [...new Set(drops.map((d: any) => d.monster_id))];
  const { data: monsters } = await getSupabase()
    .from("monsters")
    .select("*")
    .in("id", monsterIds);

  const monsterMap = new Map<number, any>();
  (monsters || []).forEach((m: any) => monsterMap.set(m.id, m));

  return drops
    .filter((d: any) => monsterMap.has(d.monster_id))
    .map((d: any) => ({
      monster: rowToMonster(monsterMap.get(d.monster_id)),
      rate: d.rate,
    }));
}

// ─── Changelog ──────────────────────────────────────────────────────

export async function getChangelog(): Promise<any[]> {
  const { data, error } = await getSupabase()
    .from("changelog")
    .select("data")
    .order("date", { ascending: false });
  if (error) {
    console.error("getChangelog error:", error.message);
    return [];
  }
  return (data || []).map((row: any) => row.data);
}
