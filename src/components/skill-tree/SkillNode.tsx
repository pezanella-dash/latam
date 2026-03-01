"use client";

import { type SkillTreeNode, skillIconUrl } from "@/lib/ro-skill-trees";

interface SkillNodeProps {
  skill: SkillTreeNode;
  currentLevel: number;
  canAllocate: boolean;
  canDeallocate: boolean;
  onAllocate: () => void;
  onDeallocate: () => void;
  onShowDetail: () => void;
}

export default function SkillNode({
  skill,
  currentLevel,
  canAllocate,
  canDeallocate,
  onAllocate,
  onDeallocate,
  onShowDetail,
}: SkillNodeProps) {
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

  return (
    <div
      className={`relative flex flex-col items-center gap-0.5 select-none`}
      title={skill.namePt || skill.name}
    >
      {/* Skill icon button */}
      <button
        className={`relative w-10 h-10 rounded-lg border-2 ${borderColor} bg-ro-surface overflow-hidden transition-all duration-200 ${
          isAvailable ? "cursor-pointer hover:scale-110" : isAllocated ? "cursor-pointer" : "cursor-default"
        }`}
        onClick={(e) => {
          if (e.shiftKey || e.ctrlKey) {
            onShowDetail();
          } else if (isAvailable) {
            onAllocate();
          } else if (isAllocated) {
            onShowDetail();
          }
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          if (canDeallocate && currentLevel > 0) {
            onDeallocate();
          }
        }}
        onDoubleClick={(e) => {
          e.preventDefault();
          onShowDetail();
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
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
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
      <div className={`text-[9px] leading-tight font-mono ${
        isMaxed ? "text-ro-gold" : isAllocated ? "text-green-400" : "text-ro-muted"
      }`}>
        {currentLevel}/{skill.maxLevel}
      </div>

      {/* Skill name (truncated) */}
      <div className="text-[8px] text-ro-muted text-center w-12 truncate leading-tight" title={skill.namePt || skill.name}>
        {(skill.namePt || skill.name).split(" ").slice(0, 2).join(" ")}
      </div>
    </div>
  );
}
