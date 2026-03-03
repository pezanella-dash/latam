"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  itemImageUrl,
  monsterImageUrl,
  parseRODescription,
  formatDropRate,
  dropRateColor,
} from "@/lib/utils";
import {
  searchItems,
  searchMonsters,
  searchSkills,
  getItemById,
  getMonsterById,
  findMonstersDropping,
  resolveDropsToItems,
  getSupabase,
} from "@/lib/db/supabase";
import combosData from "../../../data/database/combos.json";
import monsterSpawnsData from "../../../data/database/monster-spawns.json";
import mapsData from "../../../data/database/maps.json";

// ─── Types ──────────────────────────────────────────────────────────

interface ItemResult {
  id: number;
  nameEn: string;
  namePt: string;
  type: string;
  subType?: string;
  slots: number;
  attack?: number;
  magicAttack?: number;
  defense?: number;
  equipLevelMin?: number;
  weaponLevel?: number;
  armorLevel?: number;
  weight: number;
  refineable: boolean;
  costume: boolean;
  locations: string[];
  jobs: string[];
  description: string[];
  script?: string;
  aegisName?: string;
}

interface MonsterResult {
  id: number;
  name: string;
  namePt: string;
  aegisName: string;
  level: number;
  hp: number;
  attack: number;
  magicAttack: number;
  defense: number;
  magicDefense: number;
  size: string;
  race: string;
  element: string;
  elementLevel: number;
  isMvp: boolean;
  baseExp: number;
  jobExp: number;
  stats: { str: number; agi: number; vit: number; int: number; dex: number; luk: number };
  attackRange: number;
  attackDelay: number;
  walkSpeed: number;
  drops: Array<{ aegisName: string; rate: number }>;
  mvpDrops: Array<{ aegisName: string; rate: number }>;
}

interface SkillResult {
  id: number;
  aegisName: string;
  description: string;
  namePt: string;
  maxLevel: number;
  type: string;
  targetType: string;
}

type Tab = "items" | "monsters" | "skills" | "maps";

// ─── Constants ──────────────────────────────────────────────────────

const PAGE_SIZE = 100;

const ITEM_TYPES: Record<string, string> = {
  Weapon: "Arma",
  Armor: "Armadura",
  Card: "Carta",
  Usable: "Usável",
  Healing: "Poção",
  Consumable: "Consumível",
  Etc: "Etc",
  Ammo: "Munição",
  ShadowGear: "Shadow",
  Unknown: "Exclusivo LATAM",
};

// Display mapping (includes internal types not in filter dropdown)
const ITEM_TYPE_DISPLAY: Record<string, string> = {
  ...ITEM_TYPES,
  DelayConsume: "Consumível",
};

const RACES = [
  "Formless", "Undead", "Brute", "Plant", "Insect",
  "Fish", "Demon", "Demi-Human", "Angel", "Dragon",
];
const ELEMENTS = [
  "Neutral", "Water", "Earth", "Fire", "Wind",
  "Poison", "Holy", "Dark", "Ghost", "Undead",
];
const SKILL_TYPES = ["Weapon", "Magic", "Misc"];

// ─── Map constants ───────────────────────────────────────────────────

const MAP_TYPE_LABELS: Record<string, string> = {
  all: "Todos", town: "Cidades", field: "Campos",
  dungeon: "Masmorras", guild: "Feudo", other: "Outros",
};
const MAP_TYPES = ["all", "town", "field", "dungeon", "guild", "other"] as const;
const MAP_TYPE_BADGE: Record<string, string> = {
  town: "bg-element-holy/10 border-element-holy/20 text-element-holy",
  field: "bg-element-wind/10 border-element-wind/20 text-element-wind",
  dungeon: "bg-element-fire/10 border-element-fire/20 text-element-fire",
  guild: "bg-ro-gold/10 border-ro-gold/20 text-ro-gold",
  other: "bg-ro-surface border-ro-border text-ro-muted",
};

// Inverted spawn index: mapId → [{monsterId, count, respawnMs}]
const mapToMonsters: Record<string, Array<{ monsterId: number; count: number; respawnMs: number }>> = {};
for (const [mobId, locs] of Object.entries(monsterSpawnsData as Record<string, Array<{ mapId: string; count: number; respawnMs: number }>>)) {
  for (const loc of locs) {
    if (!mapToMonsters[loc.mapId]) mapToMonsters[loc.mapId] = [];
    mapToMonsters[loc.mapId].push({ monsterId: parseInt(mobId), count: loc.count, respawnMs: loc.respawnMs });
  }
}

const ELEMENT_COLORS: Record<string, string> = {
  Neutral: "text-slate-300",
  Water: "text-element-water",
  Earth: "text-element-earth",
  Fire: "text-element-fire",
  Wind: "text-element-wind",
  Poison: "text-element-poison",
  Holy: "text-element-holy",
  Dark: "text-element-dark",
  Ghost: "text-element-ghost",
  Undead: "text-element-undead",
};

const RACE_EMOJI: Record<string, string> = {
  Formless: "\uD83D\uDC7B", Undead: "\uD83D\uDC80", Brute: "\uD83D\uDC3E", Plant: "\uD83C\uDF3F", Insect: "\uD83E\uDEB2",
  Fish: "\uD83D\uDC1F", Demon: "\uD83D\uDE08", "Demi-Human": "\uD83E\uDDD1", Angel: "\uD83D\uDC7C", Dragon: "\uD83D\uDC09",
};

// ─── Monster Placeholder SVG ────────────────────────────────────────

function MonsterPlaceholder({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="8" fill="#1a1824" />
      <circle cx="18" cy="20" r="3" fill="#d4a636" opacity="0.5" />
      <circle cx="30" cy="20" r="3" fill="#d4a636" opacity="0.5" />
      <path d="M16 30 Q24 36 32 30" stroke="#d4a636" strokeWidth="2" strokeLinecap="round" opacity="0.3" />
      <path d="M12 14 L16 8 L20 14" stroke="#d4a636" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
      <path d="M28 14 L32 8 L36 14" stroke="#d4a636" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
    </svg>
  );
}

// ─── Image with fallback ────────────────────────────────────────────

function MonsterImage({ id, className }: { id: number; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <MonsterPlaceholder className={className} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={monsterImageUrl(id)}
      alt=""
      className={className}
      onError={() => setFailed(true)}
    />
  );
}

function ItemImage({ id, className }: { id: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={itemImageUrl(id)}
      alt=""
      className={className}
      onError={(e) => { (e.target as HTMLImageElement).style.visibility = "hidden"; }}
    />
  );
}

// ─── Main Component ─────────────────────────────────────────────────

function DatabaseContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [tab, setTab] = useState<Tab>((searchParams.get("tab") as Tab) || "items");
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [filter, setFilter] = useState(searchParams.get("type") || searchParams.get("race") || "");
  const [filter2, setFilter2] = useState(searchParams.get("element") || "");
  const [mvpOnly, setMvpOnly] = useState(searchParams.get("mvp") === "true");
  const [results, setResults] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [selectedMonster, setSelectedMonster] = useState<any>(null);
  const [selectedMap, setSelectedMap] = useState<any>(null);
  const [mapQuery, setMapQuery] = useState("");
  const [mapTypeFilter, setMapTypeFilter] = useState("all");

  const sentinelRef = useRef<HTMLDivElement>(null);
  const hasMore = results.length < total;

  // Sync URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (tab !== "items") params.set("tab", tab);
    if (query) params.set("q", query);
    if (tab === "items" && filter) params.set("type", filter);
    if (tab === "monsters" && filter) params.set("race", filter);
    if (tab === "monsters" && filter2) params.set("element", filter2);
    if (mvpOnly) params.set("mvp", "true");
    if (tab === "skills" && filter) params.set("type", filter);
    const str = params.toString();
    router.replace(str ? `/database?${str}` : "/database", { scroll: false });
  }, [tab, query, filter, filter2, mvpOnly, router]);

  // Fetch from Supabase with given offset
  const fetchData = useCallback(async (offset: number) => {
    if (tab === "items") {
      return searchItems({ query: query || undefined, type: filter || undefined, limit: PAGE_SIZE, offset });
    } else if (tab === "monsters") {
      return searchMonsters({ query: query || undefined, race: filter || undefined, element: filter2 || undefined, mvpOnly, limit: PAGE_SIZE, offset });
    } else {
      return searchSkills({ query: query || undefined, type: filter || undefined, limit: PAGE_SIZE, offset });
    }
  }, [query, tab, filter, filter2, mvpOnly]);

  // Initial search (resets results)
  const search = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchData(0);
      const list = ("items" in data ? data.items : "monsters" in data ? data.monsters : (data as any).skills) || [];
      setResults(list);
      setTotal(data.total || 0);
    } finally {
      setLoading(false);
    }
  }, [fetchData]);

  // Load more (appends results)
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const data = await fetchData(results.length);
      const list = ("items" in data ? data.items : "monsters" in data ? data.monsters : (data as any).skills) || [];
      setResults((prev) => [...prev, ...list]);
      setTotal(data.total || 0);
    } finally {
      setLoadingMore(false);
    }
  }, [fetchData, results.length, loadingMore, hasMore]);

  // Debounced initial search
  useEffect(() => {
    const t = setTimeout(search, 300);
    return () => clearTimeout(t);
  }, [search]);

  // Infinite scroll observer
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          loadMore();
        }
      },
      { rootMargin: "400px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, loadMore]);

  useEffect(() => {
    setFilter("");
    setFilter2("");
    setMvpOnly(false);
    setSelectedItem(null);
    setSelectedMonster(null);
    setSelectedMap(null);
    // Auto-open map from URL param
    if (tab === "maps") {
      const mapId = searchParams.get("mapId");
      if (mapId) {
        const found = (mapsData as any[]).find((m) => m.mapId === mapId);
        if (found) loadMapDetail(found);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const loadItemDetail = async (id: number) => {
    const item = await getItemById(id);
    if (!item) return;
    const droppedBy = await findMonstersDropping(item.id);
    // Find combos containing this item
    const itemCombos = (combosData as any[]).filter((c) =>
      c.allItemIds?.includes(id)
    );
    setSelectedItem({ item, droppedBy, combos: itemCombos });
  };

  const loadMonsterDetail = async (id: number) => {
    const monster = await getMonsterById(id);
    if (!monster) return;
    const drops = await resolveDropsToItems(monster.drops || []);
    const mvpDrops = await resolveDropsToItems(monster.mvpDrops || []);
    setSelectedMonster({ monster, drops, mvpDrops });
  };

  const loadMapDetail = async (mapEntry: { mapId: string; name: string; type: string }) => {
    const spawns = (mapToMonsters[mapEntry.mapId] || [])
      .slice()
      .sort((a, b) => b.count - a.count);
    if (spawns.length === 0) {
      setSelectedMap({ map: mapEntry, monsters: [] });
      return;
    }
    const monsterIds = spawns.map((s) => s.monsterId);
    const { data } = await getSupabase()
      .from("monsters")
      .select("id, name, name_pt, is_mvp, level, race, element, element_level")
      .in("id", monsterIds);
    const monsterMap = new Map((data || []).map((m: any) => [m.id, m]));
    setSelectedMap({
      map: mapEntry,
      monsters: spawns.map((s) => ({ ...s, monsterData: monsterMap.get(s.monsterId) || null })),
    });
  };

  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[var(--ro-text)] mb-1">Database</h1>
        <p className="text-sm text-ro-muted">
          {tab === "items" && "29.916 itens"}
          {tab === "monsters" && "2.675 monstros (193 MVPs)"}
          {tab === "skills" && "1.635 skills"}
          {tab === "maps" && `${(mapsData as any[]).length} mapas`}
          {tab !== "maps" && total > 0 && ` \u00b7 ${total} resultados`}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-ro-surface rounded-xl p-1 w-fit border border-ro-border">
        {([
          ["items", "Itens"],
          ["monsters", "Monstros"],
          ["skills", "Skills"],
          ["maps", "Mapas"],
        ] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${tab === key
                ? "bg-ro-gold text-ro-darker shadow-lg"
                : "text-ro-muted hover:text-[var(--ro-text)] hover:bg-ro-panel"
              }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Search + Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <svg
            className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ro-muted pointer-events-none"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder={
              tab === "items"
                ? "Buscar item (nome, ID)..."
                : tab === "monsters"
                  ? "Buscar monstro (nome, ID)..."
                  : tab === "maps"
                    ? "Buscar mapa (nome, ID)..."
                    : "Buscar skill (nome, ID)..."
            }
            value={tab === "maps" ? mapQuery : query}
            onChange={(e) => tab === "maps" ? setMapQuery(e.target.value) : setQuery(e.target.value)}
            className="search-input pl-11 py-2.5"
          />
          {(tab === "maps" ? mapQuery : query) && (
            <button
              onClick={() => tab === "maps" ? setMapQuery("") : setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ro-muted hover:text-[var(--ro-text)] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {tab === "items" && (
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="ro-select"
          >
            <option value="">Todos os tipos</option>
            {Object.entries(ITEM_TYPES).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        )}

        {tab === "monsters" && (
          <>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="ro-select"
            >
              <option value="">Todas as raças</option>
              {RACES.map((r) => (
                <option key={r} value={r}>{RACE_EMOJI[r] || ""} {r}</option>
              ))}
            </select>
            <select
              value={filter2}
              onChange={(e) => setFilter2(e.target.value)}
              className="ro-select"
            >
              <option value="">Todos os elementos</option>
              {ELEMENTS.map((e) => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-sm text-[var(--ro-text-soft)] cursor-pointer bg-ro-surface border border-ro-border rounded-xl px-3 py-2.5 hover:border-ro-gold-dim transition-colors">
              <input
                type="checkbox"
                checked={mvpOnly}
                onChange={(e) => setMvpOnly(e.target.checked)}
                className="rounded border-ro-border text-ro-gold focus:ring-ro-gold"
              />
              MVP
            </label>
          </>
        )}

        {tab === "skills" && (
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="ro-select"
          >
            <option value="">Todos os tipos</option>
            {SKILL_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        )}

        {tab === "maps" && (
          <div className="flex gap-1 bg-ro-surface rounded-xl p-1 border border-ro-border">
            {MAP_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setMapTypeFilter(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  mapTypeFilter === t
                    ? "bg-ro-gold text-ro-darker shadow"
                    : "text-ro-muted hover:text-[var(--ro-text)] hover:bg-ro-panel"
                }`}
              >
                {MAP_TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="ro-panel p-4 animate-pulse">
              <div className="flex gap-3">
                <div className="w-10 h-10 bg-ro-panel rounded" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-ro-panel rounded w-3/4" />
                  <div className="h-3 bg-ro-surface rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── Detail Modals ──────────────────────────────────────────── */}
      {selectedItem && (
        <DetailModal onClose={() => setSelectedItem(null)}>
          <ItemDetail
            data={selectedItem}
            onMonsterClick={(id) => {
              setSelectedItem(null);
              setTab("monsters");
              loadMonsterDetail(id);
            }}
            onItemClick={(id) => {
              setSelectedItem(null);
              loadItemDetail(id);
            }}
          />
        </DetailModal>
      )}

      {selectedMonster && (
        <DetailModal onClose={() => setSelectedMonster(null)}>
          <MonsterDetail
            data={selectedMonster}
            onItemClick={(id) => {
              setSelectedMonster(null);
              setTab("items");
              loadItemDetail(id);
            }}
          />
        </DetailModal>
      )}

      {selectedMap && (
        <DetailModal onClose={() => setSelectedMap(null)}>
          <MapDetail
            data={selectedMap}
            onMonsterClick={(id) => {
              setSelectedMap(null);
              setTab("monsters");
              loadMonsterDetail(id);
            }}
          />
        </DetailModal>
      )}

      {/* ─── Items Grid ─────────────────────────────────────────────── */}
      {!loading && tab === "items" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {(results as ItemResult[]).map((item) => (
            <button
              key={item.id}
              onClick={() => loadItemDetail(item.id)}
              className="glass-card p-3 text-left transition-all hover:border-ro-gold/30 group flex gap-3"
            >
              <ItemImage id={item.id} className="w-10 h-10 object-contain flex-shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <div className="flex justify-between items-start">
                  <div className="font-semibold text-sm truncate group-hover:text-ro-gold transition-colors text-[var(--ro-text)]">
                    {item.namePt || item.nameEn}
                  </div>
                  <span className="text-[10px] text-ro-muted ml-2 shrink-0">#{item.id}</span>
                </div>
                {item.namePt && item.nameEn && item.namePt !== item.nameEn && (
                  <div className="text-[11px] text-ro-muted truncate">{item.nameEn}</div>
                )}
                <div className="text-xs text-ro-muted mt-0.5 flex flex-wrap gap-x-2">
                  <span>{ITEM_TYPE_DISPLAY[item.type] || item.type}</span>
                  {item.subType && <span className="text-ro-muted">· {item.subType}</span>}
                  {item.slots > 0 && <span className="text-ro-gold">[{item.slots}]</span>}
                </div>
                <div className="text-[11px] text-ro-muted mt-0.5 flex gap-3">
                  {item.attack != null && item.attack > 0 && <span>ATK {item.attack}</span>}
                  {item.magicAttack != null && item.magicAttack > 0 && <span>MATK {item.magicAttack}</span>}
                  {item.defense != null && item.defense > 0 && <span>DEF {item.defense}</span>}
                  {item.equipLevelMin != null && <span>Lv {item.equipLevelMin}</span>}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* ─── Monsters Grid ──────────────────────────────────────────── */}
      {!loading && tab === "monsters" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {(results as MonsterResult[]).map((mob) => (
            <button
              key={mob.id}
              onClick={() => loadMonsterDetail(mob.id)}
              className={`glass-card p-3 text-left transition-all hover:border-ro-blue/30 group flex gap-3 ${mob.isMvp ? "border-ro-gold/15" : ""
                }`}
            >
              <MonsterImage id={mob.id} className="w-12 h-12 object-contain flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex justify-between items-start">
                  <div className="font-semibold text-sm truncate group-hover:text-ro-gold transition-colors text-[var(--ro-text)]">
                    {mob.isMvp && <span className="text-ro-gold mr-1">★</span>}
                    {mob.namePt || mob.name}
                  </div>
                  <span className="text-[10px] text-ro-muted ml-2 shrink-0">#{mob.id}</span>
                </div>
                {mob.namePt && mob.name && mob.namePt !== mob.name && (
                  <div className="text-[11px] text-ro-muted truncate">{mob.name}</div>
                )}
                <div className="text-xs text-ro-muted mt-0.5 flex gap-2">
                  <span>Lv {mob.level ?? 0}</span>
                  <span>HP {(mob.hp ?? 0).toLocaleString()}</span>
                  <span className={ELEMENT_COLORS[mob.element] || ""}>{mob.element || "?"} {mob.elementLevel ?? 0}</span>
                </div>
                <div className="text-[11px] text-ro-muted mt-0.5 flex gap-3">
                  <span>ATK {mob.attack ?? 0}</span>
                  <span>{RACE_EMOJI[mob.race] || ""} {mob.race}</span>
                  <span>{mob.size}</span>
                  {mob.drops?.length > 0 && <span className="text-ro-muted">{mob.drops.length} drops</span>}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* ─── Skills Grid ────────────────────────────────────────────── */}
      {!loading && tab === "skills" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {(results as SkillResult[]).map((skill) => (
            <div key={skill.id} className="glass-card p-3">
              <div className="flex justify-between items-start">
                <div className="font-semibold text-sm text-[var(--ro-text)]">{skill.namePt || skill.description}</div>
                <span className="text-[10px] text-ro-muted ml-2 shrink-0">#{skill.id}</span>
              </div>
              {skill.namePt && skill.description && skill.namePt !== skill.description && (
                <div className="text-[11px] text-ro-muted truncate">{skill.description}</div>
              )}
              <div className="text-xs text-ro-muted mt-1 flex gap-3">
                <span>Max Lv {skill.maxLevel}</span>
                <span
                  className={
                    skill.type === "Magic"
                      ? "text-element-water"
                      : skill.type === "Weapon"
                        ? "text-element-fire"
                        : "text-ro-muted"
                  }
                >
                  {skill.type}
                </span>
                <span>{skill.targetType}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── Maps Grid ──────────────────────────────────────────────── */}
      {tab === "maps" && (() => {
        const q = mapQuery.toLowerCase().trim();
        const filtered = (mapsData as any[]).filter((m) => {
          const typeOk = mapTypeFilter === "all" || m.type === mapTypeFilter;
          const queryOk = !q || m.name.toLowerCase().includes(q) || m.mapId.toLowerCase().includes(q);
          return typeOk && queryOk;
        });
        return (
          <>
            {filtered.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-4xl mb-4 opacity-20">🗺️</div>
                <p className="text-ro-muted">Nenhum mapa encontrado.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {filtered.map((map) => (
                  <button
                    key={map.mapId}
                    onClick={() => loadMapDetail(map)}
                    className="glass-card overflow-hidden text-left transition-all hover:border-ro-gold/30 group"
                  >
                    <div className="aspect-square bg-ro-surface relative">
                      <MapThumb mapId={map.mapId} />
                      <div className="absolute top-1.5 right-1.5">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium border ${MAP_TYPE_BADGE[map.type] || MAP_TYPE_BADGE.other}`}>
                          {MAP_TYPE_LABELS[map.type] || map.type}
                        </span>
                      </div>
                      {mapToMonsters[map.mapId]?.length > 0 && (
                        <div className="absolute bottom-1.5 left-1.5">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-medium border bg-ro-darker/80 border-ro-border text-ro-muted">
                            {mapToMonsters[map.mapId].length} mob{mapToMonsters[map.mapId].length > 1 ? "s" : ""}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="p-2">
                      <div className="text-xs font-medium text-[var(--ro-text)] truncate group-hover:text-ro-gold transition-colors">
                        {map.name}
                      </div>
                      <div className="text-[10px] text-ro-muted truncate">{map.mapId}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        );
      })()}

      {/* ─── Infinite scroll sentinel + loading more ────────────────── */}
      {!loading && hasMore && tab !== "maps" && (
        <div ref={sentinelRef} className="flex justify-center py-8">
          {loadingMore ? (
            <div className="flex items-center gap-2 text-ro-muted text-sm">
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeLinecap="round" />
              </svg>
              Carregando mais...
            </div>
          ) : (
            <div className="text-ro-muted text-xs">
              {results.length} de {total}
            </div>
          )}
        </div>
      )}

      {!loading && !hasMore && results.length > 0 && results.length > PAGE_SIZE && (
        <div className="text-center py-6 text-ro-muted text-xs">
          {total} resultados
        </div>
      )}

      {!loading && tab !== "maps" && results.length === 0 && (
        <div className="text-center py-20">
          <div className="text-4xl mb-4 opacity-20">🔍</div>
          <p className="text-ro-muted">
            {query || filter ? "Nenhum resultado encontrado." : "Digite algo para pesquisar."}
          </p>
        </div>
      )}
    </main>
  );
}

export default function DatabasePage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="h-8 bg-ro-panel rounded w-48 animate-pulse mb-6" />
        </div>
      }
    >
      <DatabaseContent />
    </Suspense>
  );
}

// ─── Detail Modal ───────────────────────────────────────────────────

function DetailModal({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-8 md:pt-16 px-4 overflow-y-auto animate-fade-in"
      style={{ background: "var(--ro-modal-bg)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <div
        className="ro-panel-gold max-w-2xl w-full p-6 mb-12 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="float-right text-ro-muted hover:text-[var(--ro-text)] transition-colors w-8 h-8 flex items-center justify-center rounded-lg hover:bg-ro-panel"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        {children}
      </div>
    </div>
  );
}

// ─── Item Detail ────────────────────────────────────────────────────

function ItemDetail({
  data,
  onMonsterClick,
  onItemClick,
}: {
  data: any;
  onMonsterClick: (id: number) => void;
  onItemClick: (id: number) => void;
}) {
  const { item, droppedBy, combos } = data;
  if (!item) return null;

  const descLines = parseRODescription(item.description || []);

  return (
    <div>
      {/* Header with image */}
      <div className="flex items-start gap-4 mb-4">
        <ItemImage id={item.id} className="w-16 h-16 object-contain flex-shrink-0" />
        <div>
          <h2 className="text-xl font-bold text-ro-gold">{item.namePt || item.nameEn}</h2>
          {item.namePt && item.nameEn && item.namePt !== item.nameEn && (
            <div className="text-sm text-ro-muted">{item.nameEn}</div>
          )}
          <div className="text-xs text-ro-muted mt-0.5">ID {item.id}</div>
        </div>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        <Badge>{ITEM_TYPE_DISPLAY[item.type] || item.type}</Badge>
        {item.subType && <Badge>{item.subType}</Badge>}
        {item.slots > 0 && <Badge variant="gold">[{item.slots}]</Badge>}
        {item.refineable && <Badge variant="green">Refinável</Badge>}
        {item.costume && <Badge variant="purple">Costume</Badge>}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm mb-4">
        {item.attack != null && item.attack > 0 && <Stat label="ATK" value={item.attack} />}
        {item.magicAttack != null && item.magicAttack > 0 && <Stat label="MATK" value={item.magicAttack} />}
        {item.defense != null && item.defense > 0 && <Stat label="DEF" value={item.defense} />}
        {item.range != null && item.range > 0 && <Stat label="Range" value={item.range} />}
        <Stat label="Peso" value={item.weight} />
        {item.equipLevelMin != null && <Stat label="Nível Req." value={item.equipLevelMin} />}
        {item.weaponLevel != null && <Stat label="Nível Arma" value={item.weaponLevel} />}
        {item.armorLevel != null && <Stat label="Nível Armadura" value={item.armorLevel} />}
        {item.buy != null && <Stat label="Compra" value={`${(item.buy ?? 0).toLocaleString()}z`} />}
      </div>

      {/* Locations */}
      {item.locations?.length > 0 && (
        <div className="mb-3">
          <div className="text-xs text-ro-muted mb-1">Equipa em:</div>
          <div className="flex flex-wrap gap-1">
            {item.locations.map((loc: string) => (
              <Badge key={loc} variant="blue">{loc.replace(/_/g, " ")}</Badge>
            ))}
          </div>
        </div>
      )}

      {/* Jobs */}
      {item.jobs?.length > 0 && (
        <div className="mb-3">
          <div className="text-xs text-ro-muted mb-1">Classes:</div>
          <div className="text-xs text-[var(--ro-text-soft)]">{item.jobs.join(", ")}</div>
        </div>
      )}

      {/* Colored Description */}
      {descLines.length > 0 && item.description?.length > 0 && (
        <div className="mb-4 bg-ro-surface rounded-lg p-4 border border-ro-border">
          <div className="text-[10px] uppercase tracking-widest text-ro-gold-dim mb-2 font-medium">
            Descrição LATAM
          </div>
          {descLines.map((segments, i) => (
            <div key={i} className="text-xs leading-relaxed">
              {segments.map((seg, j) => (
                <span
                  key={j}
                  style={seg.color ? { color: seg.color } : undefined}
                  className={seg.color ? undefined : "text-[var(--ro-text-soft)]"}
                >
                  {seg.text}
                </span>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Script */}
      {item.script && (
        <div className="mb-4 bg-ro-surface rounded-lg p-4 border border-ro-border">
          <div className="text-[10px] uppercase tracking-widest text-ro-gold-dim mb-2 font-medium">
            Script
          </div>
          <pre className="text-xs text-ro-green whitespace-pre-wrap font-mono" style={{ color: "#4aba6e" }}>
            {item.script}
          </pre>
        </div>
      )}

      {/* Item Combos */}
      {combos?.length > 0 && (
        <div className="mb-4">
          <div className="text-[10px] uppercase tracking-widest text-ro-gold-dim mb-2 font-medium">
            Faz Combo com
          </div>
          <div className="space-y-2">
            {combos.map((combo: any, ci: number) => {
              // Get the other items in this combo (exclude current item)
              const otherIds = (combo.allItemIds || []).filter((id: number) => id !== item.id && id > 0);
              const otherNames = (combo.requiredItemNames || []);
              const bonusKeys = Object.keys(combo.baseBonuses || {});
              const hasRefine = combo.refineBonuses?.length > 0;

              return (
                <div key={ci} className="bg-ro-surface rounded-lg p-3 border border-ro-border/50">
                  <div className="flex flex-wrap gap-1 mb-1.5">
                    {otherIds.map((otherId: number, oi: number) => (
                      <button
                        key={otherId}
                        onClick={() => onItemClick(otherId)}
                        className="flex items-center gap-1.5 text-xs text-element-water hover:text-ro-gold transition-colors"
                      >
                        <ItemImage id={otherId} className="w-5 h-5 object-contain" />
                        <span className="underline underline-offset-2">
                          {otherNames[oi] || `Item #${otherId}`}
                        </span>
                      </button>
                    ))}
                    {otherIds.length === 0 && otherNames.length > 0 && (
                      <span className="text-xs text-ro-muted">{otherNames.join(", ")}</span>
                    )}
                  </div>
                  {bonusKeys.length > 0 && (
                    <div className="text-[11px] text-green-400">
                      {bonusKeys.map((k) => {
                        const val = combo.baseBonuses[k];
                        if (typeof val === "object") {
                          return Object.entries(val).map(([sk, sv]) => (
                            <span key={sk} className="mr-2">{sk} +{sv as number}%</span>
                          ));
                        }
                        return <span key={k} className="mr-2">{k} +{val}</span>;
                      })}
                    </div>
                  )}
                  {hasRefine && combo.refineBonuses.map((rb: any, ri: number) => (
                    <div key={ri} className="text-[10px] text-ro-muted mt-0.5">
                      {rb.condition}
                      {Object.entries(rb.bonuses || {}).map(([bk, bv]) => {
                        if (typeof bv === "object") {
                          return Object.entries(bv as Record<string, number>).map(([sk, sv]) => (
                            <span key={sk} className="text-green-400 ml-1">{sk} +{sv}%</span>
                          ));
                        }
                        return <span key={bk} className="text-green-400 ml-1">{bk} +{bv as number}</span>;
                      })}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Dropped by */}
      {droppedBy?.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-widest text-ro-gold-dim mb-2 font-medium">
            Dropa em
          </div>
          <div className="space-y-1">
            {droppedBy.map((d: any) => (
              <button
                key={d.monster.id}
                onClick={() => onMonsterClick(d.monster.id)}
                className="w-full text-left bg-ro-surface hover:bg-ro-panel rounded-lg px-3 py-2 text-xs flex items-center gap-2 transition-all border border-transparent hover:border-ro-border"
              >
                <MonsterImage id={d.monster.id} className="w-6 h-6 object-contain" />
                <span className="flex-1 text-[var(--ro-text-secondary)]">
                  {d.monster.isMvp && <span className="text-ro-gold mr-1">★</span>}
                  {d.monster.namePt || d.monster.name}
                  <span className="text-ro-muted ml-1">(Lv {d.monster.level})</span>
                </span>
                <span className={dropRateColor(d.rate)}>{formatDropRate(d.rate)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Monster Detail ─────────────────────────────────────────────────

function MonsterDetail({
  data,
  onItemClick,
}: {
  data: any;
  onItemClick: (id: number) => void;
}) {
  const { monster, drops, mvpDrops } = data;
  if (!monster) return null;

  const elementBadgeVariant = (el: string) => {
    if (el === "Fire") return "red";
    if (el === "Water") return "blue";
    if (el === "Wind" || el === "Earth") return "green";
    if (el === "Holy") return "yellow";
    if (el === "Dark" || el === "Ghost") return "purple";
    return "default";
  };

  return (
    <div>
      {/* Header with sprite */}
      <div className="flex items-start gap-4 mb-4">
        <MonsterImage id={monster.id} className="w-20 h-20 object-contain flex-shrink-0" />
        <div>
          <h2 className="text-xl font-bold text-ro-gold">
            {monster.isMvp && <span className="text-ro-gold mr-1">★</span>}
            {monster.namePt || monster.name}
          </h2>
          {monster.namePt && monster.name && monster.namePt !== monster.name && (
            <div className="text-sm text-ro-muted">{monster.name}</div>
          )}
          <div className="text-xs text-ro-muted mt-0.5">ID {monster.id}</div>
        </div>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        <Badge>Lv {monster.level ?? 0}</Badge>
        <Badge variant="red">HP {(monster.hp ?? 0).toLocaleString()}</Badge>
        <Badge>{monster.size}</Badge>
        <Badge>{RACE_EMOJI[monster.race] || ""} {monster.race}</Badge>
        <Badge variant={elementBadgeVariant(monster.element) as any}>
          {monster.element} Lv{monster.elementLevel}
        </Badge>
        {monster.isMvp && <Badge variant="gold">MVP</Badge>}
        {monster.class !== "Normal" && <Badge variant="purple">{monster.class}</Badge>}
      </div>

      {/* Combat stats */}
      <div className="grid grid-cols-3 gap-x-4 gap-y-1 text-sm mb-4">
        <Stat label="ATK" value={monster.attack ?? 0} />
        <Stat label="MATK" value={monster.magicAttack ?? 0} />
        <Stat label="DEF" value={monster.defense ?? 0} />
        <Stat label="MDEF" value={monster.magicDefense ?? 0} />
        <Stat label="Base EXP" value={(monster.baseExp ?? 0).toLocaleString()} />
        <Stat label="Job EXP" value={(monster.jobExp ?? 0).toLocaleString()} />
      </div>

      {/* Stat bars */}
      <div className="grid grid-cols-1 gap-1.5 mb-4">
        {(["str", "agi", "vit", "int", "dex", "luk"] as const).map((s) => {
          const val = monster.stats?.[s] ?? 0;
          const pct = Math.min((val / 200) * 100, 100);
          const colors: Record<string, string> = {
            str: "bg-element-fire", agi: "bg-element-wind", vit: "bg-element-earth",
            int: "bg-element-water", dex: "bg-element-poison", luk: "bg-element-holy",
          };
          return (
            <div key={s} className="flex items-center gap-2">
              <span className="text-[10px] text-ro-muted w-8 uppercase font-medium">{s}</span>
              <div className="flex-1 h-2 bg-ro-surface rounded-full overflow-hidden border border-ro-border">
                <div
                  className={`h-full ${colors[s]} rounded-full transition-all duration-500`}
                  style={{ width: `${pct}%`, opacity: 0.8 }}
                />
              </div>
              <span className="text-xs text-[var(--ro-text-secondary)] w-8 text-right font-medium">{val}</span>
            </div>
          );
        })}
      </div>

      {/* Combat info */}
      <div className="grid grid-cols-3 gap-2 text-[11px] text-ro-muted mb-4">
        <div>Atk Range: {monster.attackRange ?? 0}</div>
        <div>Atk Delay: {monster.attackDelay ?? 0}ms</div>
        <div>Walk Speed: {monster.walkSpeed ?? 0}</div>
      </div>

      {/* Spawn Locations */}
      <MonsterSpawns monsterId={monster.id} />

      {/* MVP Drops */}
      {mvpDrops?.length > 0 && (
        <div className="mb-4">
          <div className="text-[10px] uppercase tracking-widest text-ro-gold mb-2 font-semibold">
            MVP Drops
          </div>
          <div className="space-y-1">
            {mvpDrops.map((d: any, i: number) => (
              <button
                key={i}
                onClick={() => d.item && onItemClick(d.item.id)}
                disabled={!d.item}
                className="w-full text-left bg-ro-surface border border-ro-gold/10 hover:border-ro-gold/30 rounded-lg px-3 py-2 text-xs flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-default"
              >
                {d.item && (
                  <ItemImage id={d.item.id} className="w-6 h-6 object-contain" />
                )}
                <span className="flex-1 text-[var(--ro-text-soft)]">
                  {d.item ? (d.item.namePt || d.item.nameEn) : d.aegisName.replace(/_/g, " ")}
                </span>
                <span className="text-ro-gold">{formatDropRate(d.rate)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Normal Drops */}
      {drops?.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-widest text-ro-gold-dim mb-2 font-medium">
            Drops
          </div>
          <div className="space-y-1">
            {drops.map((d: any, i: number) => (
              <button
                key={i}
                onClick={() => d.item && onItemClick(d.item.id)}
                disabled={!d.item}
                className="w-full text-left bg-ro-surface hover:bg-ro-panel rounded-lg px-3 py-2 text-xs flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-default border border-transparent hover:border-ro-border"
              >
                {d.item && (
                  <ItemImage id={d.item.id} className="w-6 h-6 object-contain" />
                )}
                <span className="flex-1 text-[var(--ro-text-secondary)]">
                  {d.item ? (d.item.namePt || d.item.nameEn) : d.aegisName.replace(/_/g, " ")}
                  {d.stealProtected && <span className="text-ro-muted ml-1">(protegido)</span>}
                </span>
                <span className={dropRateColor(d.rate)}>{formatDropRate(d.rate)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Monster Spawns ─────────────────────────────────────────────────

const spawnDb = monsterSpawnsData as Record<string, Array<{ mapId: string; count: number; respawnMs: number }>>;
const mapNameLookup: Record<string, string> = {};
for (const m of mapsData as Array<{ mapId: string; name: string }>) {
  mapNameLookup[m.mapId] = m.name;
}

function formatRespawn(ms: number): string {
  if (ms <= 0) return "Imediato";
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}min`;
  const hrs = Math.floor(min / 60);
  const remMin = min % 60;
  if (remMin === 0) return `${hrs}h`;
  return `${hrs}h${remMin}min`;
}

function mapImageUrl(mapId: string): string {
  return `https://www.divine-pride.net/img/map/raw/${mapId}`;
}

function MonsterSpawns({ monsterId }: { monsterId: number }) {
  const spawns = spawnDb[String(monsterId)];
  if (!spawns || spawns.length === 0) return null;

  return (
    <div className="mb-4">
      <div className="text-[10px] uppercase tracking-widest text-ro-gold-dim mb-2 font-medium">
        Localização ({spawns.length} {spawns.length === 1 ? "mapa" : "mapas"})
      </div>
      <div className="space-y-1">
        {spawns.map((s) => (
          <Link
            key={s.mapId}
            href={`/database?tab=maps&mapId=${s.mapId}`}
            className="bg-ro-surface rounded-lg px-3 py-2 text-xs flex items-center gap-2.5 border border-ro-border/50 hover:border-ro-gold/40 hover:bg-ro-panel transition-colors cursor-pointer"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={mapImageUrl(s.mapId)}
              alt=""
              className="w-10 h-10 rounded object-cover flex-shrink-0 bg-ro-panel"
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
            <div className="flex-1 min-w-0">
              <div className="text-[var(--ro-text-secondary)] font-medium truncate group-hover:text-ro-gold">
                {mapNameLookup[s.mapId] || s.mapId}
              </div>
              <div className="text-ro-muted text-[10px]">{s.mapId}</div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-element-water font-mono font-medium">{s.count}x</div>
              <div className="text-ro-muted text-[10px]">{formatRespawn(s.respawnMs)}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ─── Map Thumbnail with fallback ────────────────────────────────────

function MapThumb({ mapId, className }: { mapId: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className={`${className || "w-full h-full"} bg-ro-surface flex items-center justify-center`}>
        <svg className="w-8 h-8 text-ro-muted/20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={mapImageUrl(mapId)}
      alt={mapId}
      className={className || "w-full h-full object-cover"}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}

// ─── Map Detail ──────────────────────────────────────────────────────

function MapDetail({ data, onMonsterClick }: { data: any; onMonsterClick: (id: number) => void }) {
  const { map, monsters } = data;
  if (!map) return null;

  return (
    <div>
      {/* Header */}
      <h2 className="text-xl font-bold text-ro-gold mb-1">{map.name}</h2>
      <div className="flex items-center gap-2 mb-4">
        <span className={`px-2 py-0.5 rounded-md text-[11px] font-medium border ${MAP_TYPE_BADGE[map.type] || MAP_TYPE_BADGE.other}`}>
          {MAP_TYPE_LABELS[map.type] || map.type}
        </span>
        <span className="text-xs text-ro-muted">{map.mapId}</span>
        {monsters.length > 0 && (
          <span className="text-xs text-ro-muted">· {monsters.length} tipo{monsters.length > 1 ? "s" : ""} de monstro</span>
        )}
      </div>

      {/* Minimap */}
      <div className="rounded-lg overflow-hidden border border-ro-border bg-ro-surface mb-4">
        <MapThumb mapId={map.mapId} className="w-full h-auto object-contain" />
      </div>

      {/* Monster list */}
      {monsters.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-widest text-ro-gold-dim mb-2 font-medium">
            Monstros ({monsters.length})
          </div>
          <div className="space-y-1 max-h-96 overflow-y-auto pr-1">
            {monsters.map((s: any) => (
              <button
                key={s.monsterId}
                onClick={() => onMonsterClick(s.monsterId)}
                className="w-full bg-ro-surface rounded-lg px-3 py-2 text-xs flex items-center gap-2.5 border border-ro-border/50 hover:border-ro-gold/40 hover:bg-ro-panel transition-colors text-left"
              >
                <MonsterImage id={s.monsterId} className="w-10 h-10 object-contain flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-[var(--ro-text-secondary)] font-medium truncate">
                    {s.monsterData
                      ? (s.monsterData.is_mvp ? "★ " : "") + (s.monsterData.name_pt || s.monsterData.name)
                      : `Monstro #${s.monsterId}`}
                  </div>
                  {s.monsterData && (
                    <div className="text-ro-muted text-[10px] flex gap-2">
                      <span>Lv {s.monsterData.level}</span>
                      <span className={ELEMENT_COLORS[s.monsterData.element] || ""}>{s.monsterData.element} {s.monsterData.element_level}</span>
                      <span>{s.monsterData.race}</span>
                    </div>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-element-water font-mono font-medium">{s.count}x</div>
                  <div className="text-ro-muted text-[10px]">{formatRespawn(s.respawnMs)}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {monsters.length === 0 && (
        <p className="text-center text-ro-muted text-sm py-4">Nenhum monstro registrado neste mapa.</p>
      )}
    </div>
  );
}

// ─── UI Helpers ─────────────────────────────────────────────────────

function Badge({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: "default" | "blue" | "red" | "green" | "purple" | "yellow" | "gold" | "gray";
}) {
  const styles: Record<string, string> = {
    default: "bg-ro-panel text-[var(--ro-text-soft)] border border-ro-border",
    blue: "bg-ro-panel text-element-water border border-element-water/15",
    red: "bg-ro-panel text-element-fire border border-element-fire/15",
    green: "bg-ro-panel text-element-wind border border-element-wind/15",
    purple: "bg-ro-panel text-element-poison border border-element-poison/15",
    yellow: "bg-ro-panel text-element-holy border border-element-holy/15",
    gold: "bg-ro-panel text-ro-gold border border-ro-gold/15",
    gray: "bg-ro-surface text-ro-muted border border-ro-border",
  };
  return (
    <span className={`px-2 py-0.5 rounded-md text-[11px] font-medium ${styles[variant] || styles.default}`}>
      {children}
    </span>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex justify-between">
      <span className="text-ro-muted">{label}</span>
      <span className="text-[var(--ro-text-secondary)] font-medium">{value}</span>
    </div>
  );
}
