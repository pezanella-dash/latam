"use client";

import { useMemo, useCallback } from "react";
import {
  type SkillTreeNode,
  type JobTree,
  getMaxSkillPoints,
} from "@/lib/ro-skill-trees";
import SkillNode from "./SkillNode";

interface SkillTreeGridProps {
  jobTrees: JobTree[];
  allocatedPoints: Record<string, number>;
  onAllocate: (aegisName: string) => void;
  onDeallocate: (aegisName: string) => void;
  showInfo: boolean;
}

const CELL_W = 96;
const CELL_H = 96;
const COLS = 7;

export default function SkillTreeGrid({
  jobTrees,
  allocatedPoints,
  onAllocate,
  onDeallocate,
  showInfo,
}: SkillTreeGridProps) {
  // Pre-compute per-tree helpers (position maps, dimensions, points)
  const treeHelpers = useMemo(() => {
    return jobTrees.map((tree) => {
      const positionMap = new Map<number, SkillTreeNode>();
      for (const skill of tree.skills) {
        positionMap.set(skill.position, skill);
      }
      const maxRow =
        tree.skills.length > 0
          ? Math.max(0, ...tree.skills.map((s) => s.row))
          : 0;
      const maxPoints = getMaxSkillPoints(tree.jobId);
      return { positionMap, maxRow, maxPoints };
    });
  }, [jobTrees]);

  // Check if a skill's prerequisites are met (within its own job tree)
  const arePrereqsMet = useCallback(
    (skill: SkillTreeNode, positionMap: Map<number, SkillTreeNode>): boolean => {
      for (const prereqPos of skill.prereqs) {
        const prereqSkill = positionMap.get(prereqPos);
        if (!prereqSkill) return false;
        if ((allocatedPoints[prereqSkill.aegisName] || 0) <= 0) return false;
      }
      return true;
    },
    [allocatedPoints]
  );

  // Check if a skill can be deallocated (no dependents allocated)
  const canDeallocateSkill = useCallback(
    (skill: SkillTreeNode, treeSkills: SkillTreeNode[]): boolean => {
      if ((allocatedPoints[skill.aegisName] || 0) <= 0) return false;
      for (const other of treeSkills) {
        if (other.prereqs.includes(skill.position)) {
          if ((allocatedPoints[other.aegisName] || 0) > 0) return false;
        }
      }
      return true;
    },
    [allocatedPoints]
  );

  const gridW = COLS * CELL_W;

  return (
    <div className="flex flex-col gap-3">
      {jobTrees.map((tree, treeIdx) => {
        const { positionMap, maxRow, maxPoints } = treeHelpers[treeIdx];
        if (tree.skills.length === 0) return null;

        const rows = maxRow + 1;
        const gridH = rows * CELL_H;

        // Points spent in this tier
        let spent = 0;
        for (const skill of tree.skills) {
          spent += allocatedPoints[skill.aegisName] || 0;
        }
        const remaining = maxPoints - spent;

        // Build prerequisite lines for this tree
        const prereqLines: {
          fromRow: number; fromCol: number;
          toRow: number; toCol: number;
          met: boolean;
        }[] = [];
        for (const skill of tree.skills) {
          for (const prereqPos of skill.prereqs) {
            const prereqSkill = positionMap.get(prereqPos);
            if (!prereqSkill) continue;
            prereqLines.push({
              fromRow: prereqSkill.row,
              fromCol: prereqSkill.col,
              toRow: skill.row,
              toCol: skill.col,
              met: (allocatedPoints[prereqSkill.aegisName] || 0) > 0,
            });
          }
        }

        // Build 2D grid cells
        const grid: (SkillTreeNode | null)[][] = [];
        for (let r = 0; r < rows; r++) {
          grid[r] = [];
          for (let c = 0; c < COLS; c++) {
            grid[r][c] = null;
          }
        }
        for (const skill of tree.skills) {
          if (skill.row < rows && skill.col < COLS) {
            grid[skill.row][skill.col] = skill;
          }
        }

        return (
          <div key={tree.jobId}>
            {/* Section header */}
            <div className="flex items-center justify-between px-3 py-2 bg-ro-surface/50 border border-ro-border/30 rounded-lg mb-1">
              <span className="text-sm font-bold text-ro-text">
                {tree.jobName}
              </span>
              <span
                className={`text-xs font-mono font-bold ${
                  remaining <= 0
                    ? remaining < 0
                      ? "text-element-fire"
                      : "text-ro-gold"
                    : "text-green-400"
                }`}
              >
                Restam: {remaining}/{maxPoints}
              </span>
            </div>

            {/* Grid + SVG lines */}
            <div className="relative" style={{ width: gridW, minHeight: gridH }}>
              {/* SVG prerequisite lines */}
              <svg
                className="absolute inset-0 pointer-events-none z-0"
                width={gridW}
                height={gridH}
              >
                {prereqLines.map((line, i) => {
                  const x1 = line.fromCol * CELL_W + CELL_W / 2;
                  const y1 = line.fromRow * CELL_H + CELL_H / 2;
                  const x2 = line.toCol * CELL_W + CELL_W / 2;
                  const y2 = line.toRow * CELL_H + CELL_H / 2;

                  const path =
                    line.fromCol === line.toCol
                      ? `M ${x1} ${y1} L ${x2} ${y2}`
                      : line.fromRow === line.toRow
                      ? `M ${x1} ${y1} L ${x2} ${y2}`
                      : `M ${x1} ${y1} L ${x1} ${y2} L ${x2} ${y2}`;

                  return (
                    <path
                      key={i}
                      d={path}
                      stroke={
                        line.met
                          ? "rgba(34, 197, 94, 0.4)"
                          : "rgba(100, 100, 100, 0.25)"
                      }
                      strokeWidth={line.met ? 2 : 1.5}
                      fill="none"
                      strokeDasharray={line.met ? "none" : "4 3"}
                    />
                  );
                })}
              </svg>

              {/* Skill nodes grid */}
              <div
                className="relative z-10 grid"
                style={{
                  gridTemplateColumns: `repeat(${COLS}, ${CELL_W}px)`,
                  gridTemplateRows: `repeat(${rows}, ${CELL_H}px)`,
                }}
              >
                {grid.flat().map((skill, i) => {
                  if (!skill) {
                    return <div key={i} />;
                  }

                  const currentLevel = allocatedPoints[skill.aegisName] || 0;
                  const prereqsMet = arePrereqsMet(skill, positionMap);

                  return (
                    <div
                      key={skill.aegisName}
                      className="flex items-center justify-center"
                    >
                      <SkillNode
                        skill={skill}
                        currentLevel={currentLevel}
                        canAllocate={prereqsMet}
                        canDeallocate={canDeallocateSkill(skill, tree.skills)}
                        onAllocate={() => onAllocate(skill.aegisName)}
                        onDeallocate={() => onDeallocate(skill.aegisName)}
                        showInfo={showInfo}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
