"use client";

import type { JobRole } from "@/types";

interface Props {
  content: string;
  className: string;
  role: JobRole;
}

const ROLE_LABELS: Record<JobRole, string> = {
  mvp: "MVP Hunt",
  pve: "PvE / Farm",
  woe: "WoE / GvG",
  pvp: "PvP",
  farm: "Zeny Farm",
};

export default function BuildDisplay({ content, className, role }: Props) {
  return (
    <div className="mt-8 bg-slate-800 border border-slate-600 rounded-xl overflow-hidden">
      <div className="bg-slate-700 px-5 py-3 flex items-center justify-between">
        <div>
          <span className="font-bold text-ro-gold">{className}</span>
          <span className="text-slate-400 text-sm ml-2">— {ROLE_LABELS[role]}</span>
        </div>
        <button
          onClick={() => navigator.clipboard.writeText(content)}
          className="text-xs text-slate-400 hover:text-white transition-colors"
          title="Copiar"
        >
          📋 Copiar
        </button>
      </div>
      <div className="p-5">
        <pre className="whitespace-pre-wrap text-sm text-slate-200 font-sans leading-relaxed">
          {content}
        </pre>
      </div>
    </div>
  );
}
