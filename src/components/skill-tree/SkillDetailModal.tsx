"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { type SkillTreeNode, skillIconUrl } from "@/lib/ro-skill-trees";

interface SkillDetailModalProps {
  skill: SkillTreeNode;
  currentLevel: number;
  prereqNames: { name: string; position: number }[];
  onClose: () => void;
}

const TYPE_LABELS: Record<string, string> = {
  Weapon: "Arma",
  Magic: "Mágica",
  Misc: "Misc",
  None: "Nenhum",
};

const TARGET_LABELS: Record<string, string> = {
  Passive: "Passiva",
  Attack: "Ataque",
  Ground: "Chão",
  Self: "Si mesmo",
  Support: "Suporte",
  Trap: "Armadilha",
};

function formatMs(ms: number): string {
  if (ms <= 0) return "-";
  if (ms < 1000) return `${ms}ms`;
  const sec = ms / 1000;
  return sec % 1 === 0 ? `${sec}s` : `${sec.toFixed(1)}s`;
}

export default function SkillDetailModal({
  skill,
  currentLevel,
  prereqNames,
  onClose,
}: SkillDetailModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const hasLevelData = skill.spCost.some((v) => v > 0) ||
    skill.castTime.some((v) => v > 0) ||
    skill.fixedCast.some((v) => v > 0) ||
    skill.cooldown.some((v) => v > 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        ref={modalRef}
        className="relative ro-panel border border-ro-gold/20 max-w-lg w-full max-h-[80vh] overflow-y-auto shadow-2xl"
      >
        {/* Header */}
        <div className="sticky top-0 bg-ro-panel border-b border-ro-border px-5 py-4 flex items-start gap-4 z-10">
          <div className="flex-shrink-0 w-12 h-12 rounded-lg border-2 border-ro-gold/30 bg-ro-surface overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {skill.id > 0 && (
              <img
                src={skillIconUrl(skill.id)}
                alt=""
                className="w-full h-full object-contain p-1"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-ro-gold truncate">
              {skill.namePt || skill.name}
            </h3>
            {skill.namePt && skill.namePt !== skill.name && (
              <p className="text-xs text-ro-muted">{skill.name}</p>
            )}
            <div className="flex items-center gap-3 mt-1">
              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-ro-surface border border-ro-border text-ro-muted">
                {TYPE_LABELS[skill.type] || skill.type}
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-ro-surface border border-ro-border text-ro-muted">
                {TARGET_LABELS[skill.targetType] || skill.targetType}
              </span>
              {currentLevel > 0 && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-500/10 border border-green-500/20 text-green-400">
                  Lv {currentLevel}/{skill.maxLevel}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-ro-muted hover:text-ro-text transition-colors p-1"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-4 space-y-4">
          {/* Prerequisites */}
          {prereqNames.length > 0 && (
            <div>
              <h4 className="text-[10px] uppercase tracking-widest text-ro-gold-dim font-medium mb-2">
                Pré-requisitos
              </h4>
              <div className="flex flex-wrap gap-2">
                {prereqNames.map((p) => (
                  <span
                    key={p.position}
                    className="px-2 py-1 rounded-md text-xs bg-ro-surface border border-ro-border text-ro-muted"
                  >
                    {p.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Level table */}
          {hasLevelData && (
            <div>
              <h4 className="text-[10px] uppercase tracking-widest text-ro-gold-dim font-medium mb-2">
                Dados por Nível
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-ro-border text-ro-muted">
                      <th className="py-1.5 px-2 text-left font-medium">Nível</th>
                      {skill.spCost.some((v) => v > 0) && (
                        <th className="py-1.5 px-2 text-right font-medium">SP</th>
                      )}
                      {skill.castTime.some((v) => v > 0) && (
                        <th className="py-1.5 px-2 text-right font-medium">Conjuração</th>
                      )}
                      {skill.fixedCast.some((v) => v > 0) && (
                        <th className="py-1.5 px-2 text-right font-medium">Cast Fixo</th>
                      )}
                      {skill.cooldown.some((v) => v > 0) && (
                        <th className="py-1.5 px-2 text-right font-medium">Recarga</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: skill.maxLevel }, (_, i) => (
                      <tr
                        key={i}
                        className={`border-b border-ro-border/30 ${
                          i + 1 === currentLevel
                            ? "bg-ro-gold/5 text-ro-gold"
                            : "text-ro-text"
                        }`}
                      >
                        <td className="py-1 px-2 font-mono">{i + 1}</td>
                        {skill.spCost.some((v) => v > 0) && (
                          <td className="py-1 px-2 text-right font-mono text-element-water">
                            {skill.spCost[i] || 0}
                          </td>
                        )}
                        {skill.castTime.some((v) => v > 0) && (
                          <td className="py-1 px-2 text-right font-mono">
                            {formatMs(skill.castTime[i] || 0)}
                          </td>
                        )}
                        {skill.fixedCast.some((v) => v > 0) && (
                          <td className="py-1 px-2 text-right font-mono">
                            {formatMs(skill.fixedCast[i] || 0)}
                          </td>
                        )}
                        {skill.cooldown.some((v) => v > 0) && (
                          <td className="py-1 px-2 text-right font-mono text-element-fire">
                            {formatMs(skill.cooldown[i] || 0)}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Skill ID info */}
          <div className="pt-2 border-t border-ro-border/30 flex items-center gap-4 text-[10px] text-ro-muted">
            <span>ID: {skill.id}</span>
            <span>Aegis: {skill.aegisName}</span>
            <span>Max Lv: {skill.maxLevel}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
