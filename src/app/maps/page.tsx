"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import mapsData from "../../../data/database/maps.json";

// ─── Types ──────────────────────────────────────────────────────────

interface MapEntry {
  mapId: string;
  name: string;
  type: string;
}

type MapType = "all" | "town" | "field" | "dungeon" | "guild" | "other";

// ─── Constants ──────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  all: "Todos",
  town: "Cidades",
  field: "Campos",
  dungeon: "Masmorras",
  guild: "Feudo",
  other: "Outros",
};

const TYPE_COLORS: Record<string, string> = {
  town: "text-element-holy",
  field: "text-element-wind",
  dungeon: "text-element-fire",
  guild: "text-ro-gold",
  other: "text-ro-muted",
};

const TYPE_BADGE: Record<string, string> = {
  town: "bg-element-holy/10 border-element-holy/20 text-element-holy",
  field: "bg-element-wind/10 border-element-wind/20 text-element-wind",
  dungeon: "bg-element-fire/10 border-element-fire/20 text-element-fire",
  guild: "bg-ro-gold/10 border-ro-gold/20 text-ro-gold",
  other: "bg-ro-surface border-ro-border text-ro-muted",
};

const PAGE_SIZE = 60;

function mapImageUrl(mapId: string): string {
  return `https://static.divine-pride.net/images/maps/raw/${mapId}.png`;
}

// ─── Map Image with Fallback ────────────────────────────────────────

function MapImage({ mapId, className }: { mapId: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className={`${className} bg-ro-surface flex items-center justify-center`}>
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
      className={className}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

// ─── Detail Modal ───────────────────────────────────────────────────

function MapDetailModal({
  map,
  onClose,
}: {
  map: MapEntry;
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
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: "var(--ro-modal-bg)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <div
        className="ro-panel-gold max-w-2xl w-full p-6 animate-slide-up"
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

        <h2 className="text-xl font-bold text-ro-gold mb-1">{map.name}</h2>
        <div className="flex items-center gap-2 mb-4">
          <span className={`px-2 py-0.5 rounded-md text-[11px] font-medium border ${TYPE_BADGE[map.type] || TYPE_BADGE.other}`}>
            {TYPE_LABELS[map.type] || map.type}
          </span>
          <span className="text-xs text-ro-muted">{map.mapId}</span>
        </div>

        <div className="rounded-lg overflow-hidden border border-ro-border bg-ro-surface">
          <MapImage
            mapId={map.mapId}
            className="w-full h-auto object-contain"
          />
        </div>
      </div>
    </div>
  );
}

// ─── Page Component ─────────────────────────────────────────────────

export default function MapsPage() {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<MapType>("all");
  const [selectedMap, setSelectedMap] = useState<MapEntry | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const allMaps = mapsData as MapEntry[];

  const filtered = useMemo(() => {
    let list = allMaps;
    if (typeFilter !== "all") {
      list = list.filter((m) => m.type === typeFilter);
    }
    if (query.trim()) {
      const q = query.toLowerCase().trim();
      list = list.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.mapId.toLowerCase().includes(q)
      );
    }
    return list;
  }, [allMaps, query, typeFilter]);

  // Reset visible count when filters change
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [query, typeFilter]);

  // Infinite scroll
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCount < filtered.length) {
          setVisibleCount((v) => Math.min(v + PAGE_SIZE, filtered.length));
        }
      },
      { rootMargin: "400px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [visibleCount, filtered.length]);

  const visible = filtered.slice(0, visibleCount);

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { all: allMaps.length };
    for (const m of allMaps) {
      counts[m.type] = (counts[m.type] || 0) + 1;
    }
    return counts;
  }, [allMaps]);

  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[var(--ro-text)] mb-1">Mapas</h1>
        <p className="text-sm text-ro-muted">
          {allMaps.length} mapas
          {filtered.length !== allMaps.length && ` · ${filtered.length} resultados`}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        {/* Search */}
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
            placeholder="Buscar mapa (nome, ID)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="search-input pl-11 py-2.5"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ro-muted hover:text-[var(--ro-text)] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Type filter buttons */}
        <div className="flex gap-1 bg-ro-surface rounded-xl p-1 border border-ro-border">
          {(["all", "town", "field", "dungeon", "guild", "other"] as MapType[]).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                typeFilter === t
                  ? "bg-ro-gold text-ro-darker shadow-lg"
                  : "text-ro-muted hover:text-[var(--ro-text)] hover:bg-ro-panel"
              }`}
            >
              {TYPE_LABELS[t]}
              <span className="ml-1 opacity-60">{typeCounts[t] || 0}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Maps Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {visible.map((map) => (
          <button
            key={map.mapId}
            onClick={() => setSelectedMap(map)}
            className="glass-card overflow-hidden text-left transition-all hover:border-ro-gold/30 group"
          >
            <div className="aspect-square bg-ro-surface relative">
              <MapImage
                mapId={map.mapId}
                className="w-full h-full object-cover"
              />
              {/* Type badge overlay */}
              <div className="absolute top-1.5 right-1.5">
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium border ${TYPE_BADGE[map.type] || TYPE_BADGE.other}`}>
                  {TYPE_LABELS[map.type] || map.type}
                </span>
              </div>
            </div>
            <div className="p-2">
              <div className="text-xs font-medium text-[var(--ro-text)] truncate group-hover:text-ro-gold transition-colors">
                {map.name}
              </div>
              <div className="text-[10px] text-ro-muted truncate">
                {map.mapId}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="text-center py-20">
          <p className="text-ro-muted">
            {query || typeFilter !== "all" ? "Nenhum mapa encontrado." : "Nenhum mapa disponível."}
          </p>
        </div>
      )}

      {/* Infinite scroll sentinel */}
      {visibleCount < filtered.length && (
        <div ref={sentinelRef} className="flex justify-center py-8">
          <div className="text-ro-muted text-xs">
            {visibleCount} de {filtered.length}
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedMap && (
        <MapDetailModal
          map={selectedMap}
          onClose={() => setSelectedMap(null)}
        />
      )}
    </main>
  );
}
