"use client";

import { useMemo, useCallback } from "react";
import { type SkillTreeNode } from "@/lib/ro-skill-trees";
import SkillNode from "./SkillNode";

interface SkillTreeGridProps {
  skills: SkillTreeNode[];
  allocatedPoints: Record<string, number>;
  onAllocate: (aegisName: string) => void;
  onDeallocate: (aegisName: string) => void;
  onShowDetail: (skill: SkillTreeNode) => void;
}

export default function SkillTreeGrid({
  skills,
  allocatedPoints,
  onAllocate,
  onDeallocate,
  onShowDetail,
}: SkillTreeGridProps) {
  // Build position → skill mapping
  const positionMap = useMemo(() => {
    const map = new Map<number, SkillTreeNode>();
    for (const skill of skills) {
      map.set(skill.position, skill);
    }
    return map;
  }, [skills]);

  // Compute grid dimensions
  const maxRow = useMemo(
    () => Math.max(0, ...skills.map((s) => s.row)),
    [skills]
  );

  // Check if a skill's prerequisites are met
  const arePrereqsMet = useCallback(
    (skill: SkillTreeNode): boolean => {
      for (const prereqPos of skill.prereqs) {
        const prereqSkill = positionMap.get(prereqPos);
        if (!prereqSkill) return false;
        const level = allocatedPoints[prereqSkill.aegisName] || 0;
        if (level <= 0) return false;
      }
      return true;
    },
    [positionMap, allocatedPoints]
  );

  // Check if a skill can be deallocated (no dependent skills allocated)
  const canDeallocate = useCallback(
    (skill: SkillTreeNode): boolean => {
      const currentLevel = allocatedPoints[skill.aegisName] || 0;
      if (currentLevel <= 0) return false;

      // Check if any other skill depends on this one
      for (const other of skills) {
        if (other.prereqs.includes(skill.position)) {
          const otherLevel = allocatedPoints[other.aegisName] || 0;
          if (otherLevel > 0) return false;
        }
      }
      return true;
    },
    [skills, allocatedPoints]
  );

  // Build prerequisite lines
  const prereqLines = useMemo(() => {
    const lines: {
      fromRow: number;
      fromCol: number;
      toRow: number;
      toCol: number;
      met: boolean;
    }[] = [];

    for (const skill of skills) {
      for (const prereqPos of skill.prereqs) {
        const prereqSkill = positionMap.get(prereqPos);
        if (!prereqSkill) continue;

        const prereqLevel = allocatedPoints[prereqSkill.aegisName] || 0;
        lines.push({
          fromRow: prereqSkill.row,
          fromCol: prereqSkill.col,
          toRow: skill.row,
          toCol: skill.col,
          met: prereqLevel > 0,
        });
      }
    }

    return lines;
  }, [skills, positionMap, allocatedPoints]);

  // Cell size constants
  const CELL_W = 72;
  const CELL_H = 72;
  const COLS = 7;
  const rows = maxRow + 1;
  const gridW = COLS * CELL_W;
  const gridH = rows * CELL_H;

  // Build grid cells
  const grid: (SkillTreeNode | null)[][] = [];
  for (let r = 0; r < rows; r++) {
    grid[r] = [];
    for (let c = 0; c < COLS; c++) {
      grid[r][c] = null;
    }
  }
  for (const skill of skills) {
    if (skill.row < rows && skill.col < COLS) {
      grid[skill.row][skill.col] = skill;
    }
  }

  return (
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

          // Draw an L-shaped path (vertical then horizontal)
          const midY = y2;
          const path =
            line.fromCol === line.toCol
              ? `M ${x1} ${y1} L ${x2} ${y2}` // straight vertical
              : line.fromRow === line.toRow
              ? `M ${x1} ${y1} L ${x2} ${y2}` // straight horizontal
              : `M ${x1} ${y1} L ${x1} ${midY} L ${x2} ${midY}`; // L-shape

          return (
            <path
              key={i}
              d={path}
              stroke={line.met ? "rgba(34, 197, 94, 0.4)" : "rgba(100, 100, 100, 0.25)"}
              strokeWidth={line.met ? 2 : 1.5}
              fill="none"
              strokeDasharray={line.met ? "none" : "4 3"}
            />
          );
        })}
      </svg>

      {/* Skill nodes */}
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
          const prereqsMet = arePrereqsMet(skill);

          return (
            <div
              key={skill.aegisName}
              className="flex items-center justify-center"
            >
              <SkillNode
                skill={skill}
                currentLevel={currentLevel}
                canAllocate={prereqsMet}
                canDeallocate={canDeallocate(skill)}
                onAllocate={() => onAllocate(skill.aegisName)}
                onDeallocate={() => onDeallocate(skill.aegisName)}
                onShowDetail={() => onShowDetail(skill)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
