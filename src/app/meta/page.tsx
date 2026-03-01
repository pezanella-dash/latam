"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/db/supabase";

const TIER_COLORS: Record<string, string> = {
  S: "bg-yellow-500 text-slate-900",
  A: "bg-green-500 text-slate-900",
  B: "bg-blue-500 text-white",
  C: "bg-slate-500 text-white",
  D: "bg-red-800 text-white",
};

interface TierEntry {
  tier: string;
  notes?: string;
}

interface TierList {
  [classId: string]: {
    [role: string]: TierEntry;
  };
}

export default function MetaPage() {
  const [tierList, setTierList] = useState<TierList>({});
  const [patch, setPatch] = useState("—");
  const [changes, setChanges] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("meta_snapshots")
      .select("*")
      .order("snapshot_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setTierList((data.tier_list ?? {}) as unknown as TierList);
          setPatch(data.patch ?? "—");
          setChanges(data.changes ?? null);
        }
        setLoading(false);
      });
  }, []);

  // Group by tier
  const byTier: Record<string, Array<{ classId: string; role: string; notes?: string }>> = {};
  for (const [classId, roles] of Object.entries(tierList)) {
    for (const [role, entry] of Object.entries(roles)) {
      const tier = (entry as TierEntry).tier;
      if (!byTier[tier]) byTier[tier] = [];
      byTier[tier].push({ classId, role, notes: (entry as TierEntry).notes });
    }
  }

  const tierOrder = ["S", "A", "B", "C", "D"];

  if (loading) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-10">
        <div className="h-8 bg-ro-panel rounded w-48 animate-pulse mb-6" />
      </main>
    );
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      <Link href="/" className="text-slate-400 hover:text-white text-sm mb-6 inline-block">
        ← Voltar
      </Link>

      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-ro-gold">Meta Atual</h1>
        <span className="text-sm text-slate-400 bg-slate-800 px-3 py-1 rounded-full">
          Patch {patch}
        </span>
      </div>

      {changes && (
        <div className="mb-8 p-4 bg-slate-800 border border-slate-600 rounded-lg text-sm text-slate-300">
          <span className="font-semibold text-white">Últimas mudanças: </span>
          {changes}
        </div>
      )}

      {tierOrder
        .filter((t) => byTier[t]?.length > 0)
        .map((tier) => (
          <div key={tier} className="mb-6">
            <div className="flex items-center gap-3 mb-3">
              <span
                className={`w-10 h-10 flex items-center justify-center rounded-lg font-bold text-lg ${TIER_COLORS[tier] ?? "bg-slate-600 text-white"}`}
              >
                {tier}
              </span>
              <div className="h-px flex-1 bg-slate-700" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-2">
              {byTier[tier].map(({ classId, role, notes }) => (
                <Link
                  key={`${classId}-${role}`}
                  href={`/class/${classId}`}
                  className="bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg p-3 transition-all"
                >
                  <div className="font-semibold text-sm capitalize">
                    {classId.replace(/-/g, " ")}
                  </div>
                  <div className="text-xs text-ro-gold capitalize">{role}</div>
                  {notes && (
                    <div className="text-xs text-slate-400 mt-1">{notes}</div>
                  )}
                </Link>
              ))}
            </div>
          </div>
        ))}

      {Object.keys(tierList).length === 0 && (
        <p className="text-slate-400 text-center py-12">
          Nenhum snapshot de meta disponível ainda.
        </p>
      )}
    </main>
  );
}
