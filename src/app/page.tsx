"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { itemImageUrl, monsterImageUrl } from "@/lib/utils";
import { Search, X, Swords, Skull, Sparkles, ChevronRight } from "lucide-react";
import { searchItems, searchMonsters } from "@/lib/db/supabase";

interface QuickItem {
  id: number;
  nameEn: string;
  namePt: string;
  type: string;
}
interface QuickMonster {
  id: number;
  name: string;
  level: number;
  isMvp: boolean;
}


export default function HomePage() {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<QuickItem[]>([]);
  const [monsters, setMonsters] = useState<QuickMonster[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!query || query.length < 2) {
      setItems([]);
      setMonsters([]);
      setOpen(false);
      return;
    }
    const t = setTimeout(async () => {
      const [iRes, mRes] = await Promise.all([
        searchItems({ query, limit: 10 }),
        searchMonsters({ query, limit: 8 }),
      ]);
      setItems((iRes.items || []) as QuickItem[]);
      setMonsters((mRes.monsters || []) as QuickMonster[]);
      setOpen(true);
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const hasResults = items.length > 0 || monsters.length > 0;

  return (
    <main>
      {/* Hero */}
      <section className="relative pt-24 pb-32 flex flex-col items-center">
        {/* Subtle Background Art */}
        <div className="absolute inset-x-0 top-0 h-[600px] pointer-events-none z-0">
          <div
            className="absolute inset-0 bg-center bg-cover bg-no-repeat opacity-[0.10]"
            style={{ backgroundImage: `url('${process.env.NEXT_PUBLIC_BASE_PATH || ""}/images/img1.jpg')` }}
          />
          {/* Fades layered ON TOP of the translucent image, at 100% opacity */}
          <div className="absolute inset-x-0 top-0 h-[150px] bg-gradient-to-b from-[var(--ro-bg)] to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-[300px] bg-gradient-to-t from-[var(--ro-bg)] via-[var(--ro-bg)]/90 to-transparent" />
          <div className="absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-[var(--ro-bg)] to-transparent" />
          <div className="absolute inset-y-0 right-0 w-1/4 bg-gradient-to-l from-[var(--ro-bg)] to-transparent" />
        </div>

        <div className="absolute inset-0 pointer-events-none flex justify-center mt-[-10%] z-0">
          <div className="w-[800px] h-[300px] bg-ro-gold/10 blur-[120px] rounded-[100%]" />
        </div>

        <div className="max-w-4xl w-full px-4 text-center relative z-10">
          {/* Title */}
          <div className="mb-8 animate-fade-in group w-fit mx-auto cursor-default">
            <div className="flex items-center gap-2 px-5 py-2 rounded-full border border-ro-border/60 bg-ro-surface/30 backdrop-blur-xl shadow-sm hover:border-ro-gold/40 hover:bg-ro-gold/5 transition-all duration-300">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-ro-gold opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-ro-gold"></span>
              </span>
              <span className="text-xs font-semibold uppercase tracking-widest text-ro-text">Ragnarok Online LATAM</span>
            </div>
          </div>

          <h1 className="text-5xl md:text-7xl font-black mb-8 tracking-tighter text-ro-text text-balance">
            A essência definitiva <br className="hidden md:block" /> das suas <span className="text-transparent bg-clip-text bg-gradient-to-r from-ro-gold to-ro-gold-light">consultas</span>
          </h1>

          <p className="text-ro-text-secondary text-lg md:text-xl mb-12 max-w-2xl mx-auto leading-relaxed font-medium">
            Explore a mais completa base de dados do RO LATAM. Descubra os mistérios, os monstros lendários e os itens sagrados em segundos.
          </p>

          {/* Search */}
          <div ref={ref} className="relative max-w-2xl mx-auto z-50 group">
            <div className="relative flex items-center">
              <div className="absolute left-6 text-ro-muted group-focus-within:text-ro-gold transition-colors duration-300">
                <Search size={22} strokeWidth={2.5} />
              </div>
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setOpen(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && query.trim()) {
                    setOpen(false);
                    router.push(`/database?q=${encodeURIComponent(query.trim())}`);
                  }
                }}
                placeholder="Busque por um item, monstro ou habilidade..."
                className="w-full bg-ro-surface/80 backdrop-blur-2xl border border-ro-border-light hover:border-ro-border focus:border-ro-gold/50 pl-16 pr-20 text-lg py-5 shadow-2xl focus:shadow-[0_0_40px_rgba(245,158,11,0.15)] focus:ring-4 focus:ring-ro-gold/10 rounded-[2rem] text-ro-text placeholder-ro-muted transition-all duration-300 outline-none"
                autoFocus
              />
              <div className="absolute right-6 flex items-center gap-2">
                {query ? (
                  <button
                    onClick={() => {
                      setQuery("");
                      setOpen(false);
                    }}
                    className="p-1 rounded-full hover:bg-ro-border-light text-ro-muted hover:text-ro-text transition-all"
                  >
                    <X size={20} />
                  </button>
                ) : (
                  <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-ro-border-light bg-ro-surface/50 text-xs font-semibold text-ro-muted shadow-sm">
                    <span className="font-mono">⌘</span>
                    <span>K</span>
                  </div>
                )}
              </div>
            </div>


            {/* Quick Results Dropdown */}
            {open && hasResults && (
              <div className="absolute top-full left-0 right-0 mt-2 ro-panel p-2 max-h-[70vh] overflow-y-auto z-50 animate-fade-in">
                {items.length > 0 && (
                  <div className="mb-2">
                    <div className="text-[10px] uppercase tracking-widest text-ro-gold-dim px-3 py-1.5 font-medium">
                      Itens
                    </div>
                    {items.map((item) => (
                      <Link
                        key={item.id}
                        href={`/database?tab=items&q=${item.id}`}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-ro-panel transition-colors"
                        onClick={() => setOpen(false)}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={itemImageUrl(item.id)}
                          alt=""
                          className="w-8 h-8 object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display =
                              "none";
                          }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium truncate text-[var(--ro-text)]">
                            {item.namePt || item.nameEn}
                          </div>
                          <div className="text-[10px] text-ro-muted">
                            #{item.id} · {item.type}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
                {monsters.length > 0 && (
                  <div>
                    {items.length > 0 && <div className="ro-divider my-1" />}
                    <div className="text-[10px] uppercase tracking-widest text-ro-gold-dim px-3 py-1.5 font-medium">
                      Monstros
                    </div>
                    {monsters.map((mob) => (
                      <Link
                        key={mob.id}
                        href={`/database?tab=monsters&q=${mob.id}`}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-ro-panel transition-colors"
                        onClick={() => setOpen(false)}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={monsterImageUrl(mob.id)}
                          alt=""
                          className="w-8 h-8 object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display =
                              "none";
                          }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium truncate text-[var(--ro-text)]">
                            {mob.isMvp && (
                              <span className="text-ro-gold mr-1">★</span>
                            )}
                            {mob.name}
                          </div>
                          <div className="text-[10px] text-ro-muted">
                            #{mob.id} · Lv {mob.level}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}

                <div className="ro-divider my-2 opacity-50" />
                <Link
                  href={`/database?q=${encodeURIComponent(query)}`}
                  className="flex items-center justify-center gap-2 px-3 py-3 w-full text-center text-sm font-semibold text-ro-text hover:text-ro-gold transition-colors rounded-xl hover:bg-ro-border-light"
                  onClick={() => setOpen(false)}
                >
                  <span>Ver todos os resultados</span>
                  <ChevronRight size={16} />
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>


    </main>
  );
}
