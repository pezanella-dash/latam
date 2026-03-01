"use client";

import { useState, useMemo, useCallback } from "react";
import { RotateCcw, Info } from "lucide-react";
import {
  RO_CLASSES,
  CLASS_GROUPS,
  type RoClass,
  type ClassGroup,
} from "@/lib/ro-classes";
import { classIconUrl } from "@/lib/utils";
import {
  getSkillTreeForClass,
  type SkillTreeNode,
  type JobTree,
} from "@/lib/ro-skill-trees";
import SkillTreeGrid from "@/components/skill-tree/SkillTreeGrid";

// ─── Constants ──────────────────────────────────────────────────────

const GROUP_ORDER: ClassGroup[] = [
  "swordsman",
  "mage",
  "archer",
  "acolyte",
  "merchant",
  "thief",
  "expanded",
  "doram",
];

// ─── Page Component ─────────────────────────────────────────────────

export default function SkillTreePage() {
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [allocatedPoints, setAllocatedPoints] = useState<Record<string, number>>({});
  const [showInfo, setShowInfo] = useState(false);

  // Get skill trees for selected class
  const jobTrees = useMemo<JobTree[]>(() => {
    if (!selectedClassId) return [];
    return getSkillTreeForClass(selectedClassId);
  }, [selectedClassId]);

  // Select class
  const handleSelectClass = useCallback((cls: RoClass) => {
    setSelectedClassId(cls.id);
    setAllocatedPoints({});
  }, []);

  // Allocate a skill point (search across all job trees)
  const handleAllocate = useCallback(
    (aegisName: string) => {
      let skill: SkillTreeNode | undefined;
      for (const tree of jobTrees) {
        skill = tree.skills.find((s) => s.aegisName === aegisName);
        if (skill) break;
      }
      if (!skill) return;

      const current = allocatedPoints[aegisName] || 0;
      if (current >= skill.maxLevel) return;

      setAllocatedPoints((prev) => ({
        ...prev,
        [aegisName]: current + 1,
      }));
    },
    [jobTrees, allocatedPoints]
  );

  // Deallocate a skill point
  const handleDeallocate = useCallback(
    (aegisName: string) => {
      const current = allocatedPoints[aegisName] || 0;
      if (current <= 0) return;

      setAllocatedPoints((prev) => {
        const next = { ...prev };
        if (current <= 1) {
          delete next[aegisName];
        } else {
          next[aegisName] = current - 1;
        }
        return next;
      });
    },
    [allocatedPoints]
  );

  // Reset all points
  const handleReset = useCallback(() => {
    setAllocatedPoints({});
  }, []);

  // Total points spent
  const totalPointsSpent = useMemo(() => {
    let total = 0;
    for (const v of Object.values(allocatedPoints)) {
      total += v;
    }
    return total;
  }, [allocatedPoints]);

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[var(--ro-text)] mb-1">
          Simulador de Skills
        </h1>
        <p className="text-sm text-ro-muted">
          Clique para alocar pontos. Clique direito para remover.
        </p>
      </div>

      {/* Class Selector */}
      <div className="ro-panel p-4 mb-6">
        <div className="text-[10px] uppercase tracking-widest text-ro-gold-dim font-medium mb-3">
          Selecione a Classe
        </div>
        <div className="space-y-3">
          {GROUP_ORDER.map((group) => {
            const classes = RO_CLASSES.filter((c) => c.group === group);
            if (classes.length === 0) return null;

            return (
              <div key={group}>
                <div
                  className="text-[10px] font-medium mb-1.5"
                  style={{ color: CLASS_GROUPS[group].color }}
                >
                  {CLASS_GROUPS[group].name}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {classes.map((cls) => (
                    <button
                      key={cls.id}
                      onClick={() => handleSelectClass(cls)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-all ${
                        selectedClassId === cls.id
                          ? "border-ro-gold bg-ro-gold/10 text-ro-gold"
                          : "border-ro-border bg-ro-surface text-ro-muted hover:border-ro-gold/30 hover:text-ro-text"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={classIconUrl(cls.id)}
                        alt=""
                        className="w-5 h-5 object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                      <span>{cls.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Skill Tree Area */}
      {selectedClassId && jobTrees.length > 0 && (
        <div className="ro-panel overflow-hidden">
          {/* Controls bar */}
          <div className="flex items-center justify-between border-b border-ro-border px-4 py-3">
            <div className="text-xs text-ro-muted">
              Total:{" "}
              <span className="font-mono text-ro-gold font-bold">
                {totalPointsSpent}
              </span>{" "}
              pts
            </div>

            <div className="flex items-center gap-2">
              {/* INFO toggle */}
              <button
                onClick={() => setShowInfo(!showInfo)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                  showInfo
                    ? "border-ro-gold bg-ro-gold/10 text-ro-gold"
                    : "border-ro-border bg-ro-surface text-ro-muted hover:border-ro-gold/30"
                }`}
              >
                <Info size={14} />
                INFO
              </button>

              {/* Reset */}
              <button
                onClick={handleReset}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-ro-muted hover:text-element-fire border border-ro-border hover:border-element-fire/30 transition-colors"
                title="Resetar todos os pontos"
              >
                <RotateCcw size={12} />
                Reset
              </button>
            </div>
          </div>

          {/* Unified tree grid */}
          <div className="p-6 overflow-x-auto flex justify-center">
            <SkillTreeGrid
              jobTrees={jobTrees}
              allocatedPoints={allocatedPoints}
              onAllocate={handleAllocate}
              onDeallocate={handleDeallocate}
              showInfo={showInfo}
            />
          </div>
        </div>
      )}

      {/* Empty state */}
      {!selectedClassId && (
        <div className="ro-panel p-12 text-center">
          <p className="text-ro-muted">
            Selecione uma classe acima para começar.
          </p>
        </div>
      )}
    </main>
  );
}
