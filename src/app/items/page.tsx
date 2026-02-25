"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface Item {
  id: number;
  name: string;
  namePt: string | null;
  type: string;
  slots: number;
  atk: number | null;
  matk: number | null;
  defense: number | null;
  requiredLevel: number | null;
  imageUrl: string | null;
}

const TYPE_LABELS: Record<string, string> = {
  WEAPON: "Arma",
  ARMOR: "Armadura",
  CARD: "Card",
  CONSUMABLE: "Consumível",
  MISC: "Misc",
  AMMUNITION: "Munição",
  SHADOW: "Shadow",
};

export default function ItemsPage() {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (type) params.set("type", type);
      const res = await fetch(`/api/items?${params}`);
      const data = await res.json();
      setItems(data.items ?? []);
    } finally {
      setLoading(false);
    }
  }, [query, type]);

  useEffect(() => {
    const t = setTimeout(search, 400);
    return () => clearTimeout(t);
  }, [search]);

  return (
    <main className="max-w-5xl mx-auto px-4 py-10">
      <Link href="/" className="text-slate-400 hover:text-white text-sm mb-6 inline-block">
        ← Voltar
      </Link>

      <h1 className="text-3xl font-bold text-ro-gold mb-6">Database de Itens LATAM</h1>

      <div className="flex gap-3 mb-8">
        <input
          type="text"
          placeholder="Buscar item..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-ro-blue"
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-ro-blue"
        >
          <option value="">Todos os tipos</option>
          {Object.entries(TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {loading && (
        <div className="flex justify-center py-12 text-slate-400">
          <div className="w-6 h-6 border-2 border-ro-blue border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => (
          <div
            key={item.id}
            className="bg-slate-800 border border-slate-600 rounded-lg p-4 flex gap-3"
          >
            {item.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.imageUrl}
                alt={item.name}
                className="w-12 h-12 object-contain flex-shrink-0"
              />
            )}
            <div className="min-w-0">
              <div className="font-semibold text-sm truncate">
                {item.namePt ?? item.name}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                {TYPE_LABELS[item.type] ?? item.type}
                {item.slots > 0 && ` · ${item.slots} slot${item.slots > 1 ? "s" : ""}`}
              </div>
              <div className="text-xs text-slate-500 mt-1 flex gap-2">
                {item.atk != null && <span>ATK {item.atk}</span>}
                {item.matk != null && <span>MATK {item.matk}</span>}
                {item.defense != null && <span>DEF {item.defense}</span>}
                {item.requiredLevel != null && <span>Req Lv {item.requiredLevel}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {!loading && items.length === 0 && (
        <p className="text-slate-500 text-center py-12">
          {query || type ? "Nenhum item encontrado." : "Use a busca acima para encontrar itens."}
        </p>
      )}
    </main>
  );
}
