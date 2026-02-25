"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { JobRole } from "@/types";
import BuildDisplay from "@/components/build/BuildDisplay";

const ROLES: { id: JobRole; label: string; icon: string }[] = [
  { id: "mvp", label: "MVP Hunt", icon: "👑" },
  { id: "pve", label: "PvE / Farm", icon: "⚔️" },
  { id: "woe", label: "WoE / GvG", icon: "🏰" },
  { id: "pvp", label: "PvP", icon: "🗡️" },
  { id: "farm", label: "Zeny Farm", icon: "💰" },
];

const BUDGETS = [
  { id: "free", label: "F2P / Acessível" },
  { id: "mid", label: "Mid Budget" },
  { id: "high", label: "High End / BiS" },
];

const CLASS_NAMES: Record<string, string> = {
  archbishop: "Archbishop",
  ranger: "Ranger",
  warlock: "Warlock",
  "royal-guard": "Royal Guard",
  sorcerer: "Sorcerer",
  mechanic: "Mechanic",
  "guillotine-cross": "Guillotine Cross",
  "shadow-chaser": "Shadow Chaser",
  genetic: "Genetic",
  minstrel: "Minstrel",
  wanderer: "Wanderer",
  "rune-knight": "Rune Knight",
};

export default function ClassPage() {
  const params = useParams();
  const classId = params.classId as string;
  const className = CLASS_NAMES[classId] ?? classId;

  const [selectedRole, setSelectedRole] = useState<JobRole | null>(null);
  const [selectedBudget, setSelectedBudget] = useState("high");
  const [recommendation, setRecommendation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConsult() {
    if (!selectedRole) return;
    setLoading(true);
    setError(null);
    setRecommendation(null);

    try {
      const res = await fetch("/api/builds/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId,
          role: selectedRole,
          budget: selectedBudget,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Erro ao consultar build");
      }

      const data = await res.json();
      setRecommendation(data.recommendation);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      <Link
        href="/"
        className="text-slate-400 hover:text-white text-sm mb-6 inline-block"
      >
        ← Voltar
      </Link>

      <h1 className="text-3xl font-bold text-ro-gold mb-2">{className}</h1>
      <p className="text-slate-400 mb-8">
        Selecione o papel e orçamento para receber a build recomendada pelo
        consultor IA.
      </p>

      {/* Role selector */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Papel
        </h2>
        <div className="flex flex-wrap gap-3">
          {ROLES.map((role) => (
            <button
              key={role.id}
              onClick={() => setSelectedRole(role.id)}
              className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                selectedRole === role.id
                  ? "bg-ro-blue border-ro-blue text-white"
                  : "bg-slate-800 border-slate-600 text-slate-300 hover:border-slate-400"
              }`}
            >
              {role.icon} {role.label}
            </button>
          ))}
        </div>
      </section>

      {/* Budget selector */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Orçamento
        </h2>
        <div className="flex flex-wrap gap-3">
          {BUDGETS.map((b) => (
            <button
              key={b.id}
              onClick={() => setSelectedBudget(b.id)}
              className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                selectedBudget === b.id
                  ? "bg-ro-gold border-ro-gold text-slate-900"
                  : "bg-slate-800 border-slate-600 text-slate-300 hover:border-slate-400"
              }`}
            >
              {b.label}
            </button>
          ))}
        </div>
      </section>

      <button
        onClick={handleConsult}
        disabled={!selectedRole || loading}
        className="w-full py-3 rounded-lg bg-ro-blue hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 font-semibold transition-all text-white"
      >
        {loading ? "Consultando IA..." : "Gerar Build Recomendada"}
      </button>

      {error && (
        <div className="mt-6 p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}

      {loading && (
        <div className="mt-8 flex items-center gap-3 text-slate-400">
          <div className="w-5 h-5 border-2 border-ro-blue border-t-transparent rounded-full animate-spin" />
          Analisando meta e montando build...
        </div>
      )}

      {recommendation && (
        <BuildDisplay content={recommendation} className={className} role={selectedRole!} />
      )}
    </main>
  );
}
