import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Divine Pride CDN (public, no API key) ──────────────────────────

export function itemImageUrl(id: number): string {
  return `https://static.divine-pride.net/images/items/item/${id}.png`;
}

export function monsterImageUrl(id: number): string {
  return `/sprites/monsters/${id}.png`;
}

export function classImageUrl(classId: string): string {
  return `/sprites/classes/${classId}.gif`;
}

export function classIconUrl(classId: string): string {
  return `/icons/classes/${classId}.png`;
}

// ─── RO description color parser ────────────────────────────────────

export interface DescSegment {
  text: string;
  color: string | null;
}

export function parseRODescription(lines: string[]): DescSegment[][] {
  return lines.map((line) => {
    const segments: DescSegment[] = [];
    const regex = /\^([0-9a-fA-F]{6})/g;
    let lastIndex = 0;
    let currentColor: string | null = null;
    let match;

    while ((match = regex.exec(line)) !== null) {
      if (match.index > lastIndex) {
        const text = line.slice(lastIndex, match.index);
        if (text) segments.push({ text, color: currentColor });
      }
      currentColor = `#${match[1]}`;
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < line.length) {
      segments.push({ text: line.slice(lastIndex), color: currentColor });
    }
    if (segments.length === 0) {
      segments.push({ text: line, color: null });
    }
    return segments;
  });
}

// ─── Drop rate helpers ──────────────────────────────────────────────

export function formatDropRate(rate: number): string {
  return (rate / 100).toFixed(2) + "%";
}

export function dropRateColor(rate: number): string {
  if (rate >= 5000) return "text-green-400";
  if (rate >= 500) return "text-yellow-400";
  if (rate >= 100) return "text-orange-400";
  return "text-red-400";
}
