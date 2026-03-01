"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { itemImageUrl } from "@/lib/utils";
import { getChangelog } from "@/lib/db/supabase";

interface ChangelogEntry {
  date: string;
  newItems: Array<{ id: number; namePt: string; nameEn: string; type: string }>;
  changedItems: Array<{ id: number; namePt: string; nameEn: string; type: string; changes: string[] }>;
  removedCount: number;
}

const ITEM_TYPES: Record<string, string> = {
  Weapon: "Arma",
  Armor: "Armadura",
  Card: "Carta",
  Usable: "Usável",
  Healing: "Poção",
  Consumable: "Consumível",
  DelayConsume: "Consumível",
  Etc: "Etc",
  Ammo: "Munição",
  ShadowGear: "Shadow",
  Unknown: "Exclusivo LATAM",
};

export default function NovidadesPage() {
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getChangelog()
      .then((data) => {
        setEntries(data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="h-8 bg-ro-panel rounded w-48 animate-pulse mb-6" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="ro-panel p-6 animate-pulse">
              <div className="h-5 bg-ro-panel rounded w-32 mb-4" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j} className="h-16 bg-ro-surface rounded-lg" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
    );
  }

  const hasContent = entries.some((e) => e.newItems.length > 0 || e.changedItems.length > 0);

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--ro-text)] mb-1">Novidades</h1>
        <p className="text-sm text-ro-muted">
          Itens adicionados ou alterados nas atualizações recentes.
        </p>
      </div>

      {!hasContent && (
        <div className="ro-panel p-12 text-center">
          <div className="text-4xl mb-4 opacity-20">📋</div>
          <p className="text-ro-muted mb-2">Nenhuma atualização registrada ainda.</p>
          <p className="text-sm text-ro-muted">
            Execute <code className="bg-ro-surface px-2 py-0.5 rounded text-xs text-ro-gold">npx tsx scripts/build-database.ts</code> duas
            vezes para gerar o diff entre versões.
          </p>
        </div>
      )}

      {entries.map((entry, idx) => {
        const totalChanges = entry.newItems.length + entry.changedItems.length;
        if (totalChanges === 0 && entry.removedCount === 0) return null;

        return (
          <div key={idx} className="ro-panel-gold mb-6 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-ro-border flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-ro-gold">
                  {formatDate(entry.date)}
                </h2>
                <p className="text-xs text-ro-muted mt-0.5">
                  {entry.newItems.length > 0 && (
                    <span className="text-ro-green mr-3">+{entry.newItems.length} novos</span>
                  )}
                  {entry.changedItems.length > 0 && (
                    <span className="text-element-water mr-3">{entry.changedItems.length} alterados</span>
                  )}
                  {entry.removedCount > 0 && (
                    <span className="text-element-fire">{entry.removedCount} removidos</span>
                  )}
                </p>
              </div>
              <div className="text-2xl font-bold text-ro-gold/20">
                {totalChanges}
              </div>
            </div>

            {/* New Items */}
            {entry.newItems.length > 0 && (
              <div className="px-6 py-4">
                <div className="text-[10px] uppercase tracking-widest text-ro-gold-dim mb-3 font-medium">
                  Novos itens
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {entry.newItems.map((item) => (
                    <Link
                      key={item.id}
                      href={`/database?tab=items&q=${item.id}`}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg bg-ro-surface border border-ro-border hover:border-ro-gold/30 transition-colors group"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={itemImageUrl(item.id)}
                        alt=""
                        className="w-8 h-8 object-contain flex-shrink-0"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.visibility = "hidden";
                        }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate text-[var(--ro-text)] group-hover:text-ro-gold transition-colors">
                          {item.namePt || item.nameEn}
                        </div>
                        <div className="text-[10px] text-ro-muted">
                          #{item.id} · {ITEM_TYPES[item.type] || item.type}
                        </div>
                      </div>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-ro-green/10 text-ro-green border border-ro-green/15">
                        novo
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Changed Items */}
            {entry.changedItems.length > 0 && (
              <div className="px-6 py-4 border-t border-ro-border">
                <div className="text-[10px] uppercase tracking-widest text-element-water mb-3 font-medium">
                  Itens alterados
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {entry.changedItems.map((item) => (
                    <Link
                      key={item.id}
                      href={`/database?tab=items&q=${item.id}`}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg bg-ro-surface border border-ro-border hover:border-element-water/30 transition-colors group"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={itemImageUrl(item.id)}
                        alt=""
                        className="w-8 h-8 object-contain flex-shrink-0"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.visibility = "hidden";
                        }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate text-[var(--ro-text)] group-hover:text-element-water transition-colors">
                          {item.namePt || item.nameEn}
                        </div>
                        <div className="text-[10px] text-ro-muted truncate">
                          {item.changes.join(" · ")}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </main>
  );
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + "T12:00:00");
    return d.toLocaleDateString("pt-BR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}
