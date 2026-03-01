"use client";

import { useState, useMemo, useCallback } from "react";
import { RotateCcw } from "lucide-react";
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
import SkillDetailModal from "@/components/skill-tree/SkillDetailModal";

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
  const [activeJobIndex, setActiveJobIndex] = useState(0);
  const [allocatedPoints, setAllocatedPoints] = useState<Record<string, number>>({});
  const [detailSkill, setDetailSkill] = useState<SkillTreeNode | null>(null);

  // Get skill trees for selected class
  const jobTrees = useMemo<JobTree[]>(() => {
    if (!selectedClassId) return [];
    return getSkillTreeForClass(selectedClassId);
  }, [selectedClassId]);

  // Current active job tree
  const currentTree = jobTrees[activeJobIndex] || null;

  // Select class
  const handleSelectClass = useCallback((cls: RoClass) => {
    setSelectedClassId(cls.id);
    setActiveJobIndex(0);
    setAllocatedPoints({});
    setDetailSkill(null);
  }, []);

  // Allocate a skill point
  const handleAllocate = useCallback(
    (aegisName: string) => {
      if (!currentTree) return;
      const skill = currentTree.skills.find((s) => s.aegisName === aegisName);
      if (!skill) return;

      const current = allocatedPoints[aegisName] || 0;
      if (current >= skill.maxLevel) return;

      setAllocatedPoints((prev) => ({
        ...prev,
        [aegisName]: current + 1,
      }));
    },
    [currentTree, allocatedPoints]
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

  // Calculate points spent per job
  const pointsPerJob = useMemo(() => {
    const result: Record<number, number> = {};
    for (const tree of jobTrees) {
      let spent = 0;
      for (const skill of tree.skills) {
        spent += allocatedPoints[skill.aegisName] || 0;
      }
      result[tree.jobId] = spent;
    }
    return result;
  }, [jobTrees, allocatedPoints]);

  const totalPointsSpent = Object.values(pointsPerJob).reduce((a, b) => a + b, 0);

  // Get prereq names for detail modal
  const getPrereqNames = useCallback(
    (skill: SkillTreeNode): { name: string; position: number }[] => {
      if (!currentTree) return [];
      return skill.prereqs
        .map((pos) => {
          const prereq = currentTree.skills.find((s) => s.position === pos);
          return prereq
            ? { name: prereq.namePt || prereq.name, position: pos }
            : null;
        })
        .filter((p): p is { name: string; position: number } => p !== null);
    },
    [currentTree]
  );

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[var(--ro-text)] mb-1">
          Simulador de Skills
        </h1>
        <p className="text-sm text-ro-muted">
          Clique para alocar pontos. Clique direito para remover. Duplo-clique para detalhes.
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
          {/* Job tier tabs + controls */}
          <div className="flex items-center justify-between border-b border-ro-border px-4">
            <div className="flex overflow-x-auto">
              {jobTrees.map((tree, idx) => {
                const spent = pointsPerJob[tree.jobId] || 0;
                return (
                  <button
                    key={tree.jobId}
                    onClick={() => setActiveJobIndex(idx)}
                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                      idx === activeJobIndex
                        ? "border-ro-gold text-ro-gold"
                        : "border-transparent text-ro-muted hover:text-ro-text"
                    }`}
                  >
                    {tree.jobName}
                    {spent > 0 && (
                      <span className="ml-1.5 text-[10px] font-mono text-green-400">
                        ({spent})
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3 px-2">
              <div className="text-xs text-ro-muted">
                Total:{" "}
                <span className="font-mono text-ro-gold font-bold">
                  {totalPointsSpent}
                </span>{" "}
                pts
              </div>
              <button
                onClick={handleReset}
                className="flex items-center gap-1 px-2 py-1 rounded text-xs text-ro-muted hover:text-element-fire border border-ro-border hover:border-element-fire/30 transition-colors"
                title="Resetar todos os pontos"
              >
                <RotateCcw size={12} />
                Reset
              </button>
            </div>
          </div>

          {/* Grid */}
          {currentTree && (
            <div className="p-6 overflow-x-auto flex justify-center">
              <SkillTreeGrid
                skills={currentTree.skills}
                allocatedPoints={allocatedPoints}
                onAllocate={handleAllocate}
                onDeallocate={handleDeallocate}
                onShowDetail={setDetailSkill}
              />
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!selectedClassId && (
        <div className="ro-panel p-12 text-center">
          <div className="text-4xl mb-4 opacity-20">🎮</div>
          <p className="text-ro-muted">
            Selecione uma classe acima para começar.
          </p>
        </div>
      )}

      {/* Skill Detail Modal */}
      {detailSkill && (
        <SkillDetailModal
          skill={detailSkill}
          currentLevel={allocatedPoints[detailSkill.aegisName] || 0}
          prereqNames={getPrereqNames(detailSkill)}
          onClose={() => setDetailSkill(null)}
        />
      )}
    </main>
  );
}
