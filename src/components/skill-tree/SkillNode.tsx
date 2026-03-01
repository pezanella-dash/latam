"use client";

import { useState } from "react";
import { type SkillTreeNode, skillIconUrl } from "@/lib/ro-skill-trees";

const TYPE_LABELS: Record<string, string> = {
  Weapon: "Arma", Magic: "Mágica", Misc: "Misc", None: "—",
};
const TARGET_LABELS: Record<string, string> = {
  Passive: "Passiva", Attack: "Ataque", Ground: "Chão",
  Self: "Si mesmo", Support: "Suporte", Trap: "Armadilha",
};

function fmtMs(ms: number): string {
  if (ms <= 0) return "-";
  if (ms < 1000) return `${ms}ms`;
  const s = ms / 1000;
  return s % 1 === 0 ? `${s}s` : `${s.toFixed(1)}s`;
}

interface SkillNodeProps {
  skill: SkillTreeNode;
  currentLevel: number;
  canAllocate: boolean;
  canDeallocate: boolean;
  onAllocate: () => void;
  onDeallocate: () => void;
  showInfo: boolean;
}

export default function SkillNode({
  skill,
  currentLevel,
  canAllocate,
  canDeallocate,
  onAllocate,
  onDeallocate,
  showInfo,
}: SkillNodeProps) {
  const [isHovered, setIsHovered] = useState(false);
  const isMaxed = currentLevel >= skill.maxLevel;
  const isAllocated = currentLevel > 0;
  const isAvailable = canAllocate && !isMaxed;

  const borderColor = isMaxed
    ? "border-ro-gold shadow-[0_0_8px_rgba(212,175,55,0.3)]"
    : isAllocated
    ? "border-green-500/70 shadow-[0_0_6px_rgba(34,197,94,0.2)]"
    : isAvailable
    ? "border-ro-border hover:border-ro-gold/50"
    : "border-ro-border/50 opacity-50";

  // Info for tooltip: show next level data (or current if maxed)
  const infoIdx = isMaxed ? currentLevel - 1 : isAllocated ? currentLevel : 0;
  const sp = skill.spCost[infoIdx] || 0;
  const cast = skill.castTime[infoIdx] || 0;
  const fixed = skill.fixedCast[infoIdx] || 0;
  const cd = skill.cooldown[infoIdx] || 0;

  return (
    <div
      className="relative flex flex-col items-center gap-0.5 select-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Skill icon button */}
      <button
        className={`relative w-12 h-12 rounded-lg border-2 ${borderColor} bg-ro-surface overflow-hidden transition-all duration-200 ${
          isAvailable ? "cursor-pointer hover:scale-110" : isAllocated ? "cursor-pointer" : "cursor-default"
        }`}
        onClick={() => {
          if (isAvailable) onAllocate();
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          if (canDeallocate && currentLevel > 0) onDeallocate();
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {skill.id > 0 && (
          <img
            src={skillIconUrl(skill.id)}
            alt={skill.name}
            className={`w-full h-full object-contain p-0.5 ${
              !isAllocated && !isAvailable ? "grayscale brightness-50" : ""
            }`}
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            draggable={false}
          />
        )}
        {/* Level badge */}
        {isAllocated && (
          <div className="absolute -bottom-0.5 -right-0.5 bg-ro-dark border border-ro-border rounded text-[9px] font-bold px-0.5 min-w-[16px] text-center leading-tight">
            <span className={isMaxed ? "text-ro-gold" : "text-green-400"}>
              {currentLevel}
            </span>
          </div>
        )}
      </button>

      {/* Level text */}
      <div className={`text-[10px] leading-tight font-mono ${
        isMaxed ? "text-ro-gold" : isAllocated ? "text-green-400" : "text-ro-muted"
      }`}>
        {currentLevel}/{skill.maxLevel}
      </div>

      {/* Skill name */}
      <div className="text-[8px] text-ro-muted text-center w-16 truncate leading-tight">
        {(skill.namePt || skill.name).split(" ").slice(0, 2).join(" ")}
      </div>

      {/* Hover tooltip */}
      {showInfo && isHovered && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none">
          <div className="bg-ro-panel border border-ro-border rounded-lg shadow-xl px-3 py-2 min-w-[180px] max-w-[220px]">
            <div className="text-xs font-bold text-ro-gold truncate">
              {skill.namePt || skill.name}
            </div>
            {skill.namePt && skill.namePt !== skill.name && (
              <div className="text-[9px] text-ro-muted truncate">{skill.name}</div>
            )}
            <div className="flex items-center gap-2 mt-1 text-[9px] text-ro-muted">
              <span>{TYPE_LABELS[skill.type] || skill.type}</span>
              <span>·</span>
              <span>{TARGET_LABELS[skill.targetType] || skill.targetType}</span>
            </div>
            <div className="mt-1 text-[10px] font-mono">
              <span className={isMaxed ? "text-ro-gold" : isAllocated ? "text-green-400" : "text-ro-muted"}>
                Lv {currentLevel}/{skill.maxLevel}
              </span>
            </div>
            {(sp > 0 || cast > 0 || fixed > 0 || cd > 0) && (
              <div className="mt-1 grid grid-cols-2 gap-x-2 gap-y-0.5 text-[9px]">
                {sp > 0 && (
                  <>
                    <span className="text-ro-muted">SP:</span>
                    <span className="text-element-water font-mono">{sp}</span>
                  </>
                )}
                {cast > 0 && (
                  <>
                    <span className="text-ro-muted">Cast:</span>
                    <span className="font-mono" style={{ color: "var(--ro-text)" }}>{fmtMs(cast)}</span>
                  </>
                )}
                {fixed > 0 && (
                  <>
                    <span className="text-ro-muted">Fixo:</span>
                    <span className="font-mono" style={{ color: "var(--ro-text)" }}>{fmtMs(fixed)}</span>
                  </>
                )}
                {cd > 0 && (
                  <>
                    <span className="text-ro-muted">Recarga:</span>
                    <span className="text-element-fire font-mono">{fmtMs(cd)}</span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
