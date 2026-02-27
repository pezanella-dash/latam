"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// ─── Types ───────────────────────────────────────────────────────────

export interface RenderParams {
  jobId: number;
  gender: 0 | 1;
  headgear: [number, number, number]; // [bottom, top, mid]
  garment: number;
  weapon: number;      // weapon classNum (right hand)
  shield: number;      // shield classNum (left hand)
  head: number;        // hairstyle
  headPalette: number; // hair color
  bodyPalette: number; // cloth color (0 = default)
  action: number;      // pose + direction (action base + direction offset 0-7)
  headdir: number;     // 0=straight, 1=left, 2=right
}

interface CharacterPreviewProps {
  params: RenderParams;
  onParamsChange?: (params: Partial<RenderParams>) => void;
  width?: number;
  height?: number;
  showControls?: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────

const CANVAS = "200x250+100+175";
const DEBOUNCE_MS = 250;

const ACTION_NAMES: { label: string; base: number }[] = [
  { label: "Parado", base: 0 },
  { label: "Andando", base: 8 },
  { label: "Sentado", base: 16 },
  { label: "Ataque", base: 24 },
];

const HAIR_COLORS = [
  { id: 0, label: "1", color: "#e88ca0" },
  { id: 1, label: "2", color: "#d4b060" },
  { id: 2, label: "3", color: "#8b6cc0" },
  { id: 3, label: "4", color: "#c0a070" },
  { id: 4, label: "5", color: "#60a890" },
  { id: 5, label: "6", color: "#9888b8" },
  { id: 6, label: "7", color: "#d0c8c0" },
  { id: 7, label: "8", color: "#906040" },
  { id: 8, label: "9", color: "#d88090" },
];

// ─── Component ───────────────────────────────────────────────────────

const BODY_COLORS = [
  { id: 1, label: "1", color: "#e06060" },
  { id: 2, label: "2", color: "#e09060" },
  { id: 3, label: "3", color: "#e0c060" },
];

export default function CharacterPreview({
  params,
  onParamsChange,
  width = 200,
  height = 280,
  showControls = true,
}: CharacterPreviewProps) {
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prevBlobRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchSprite = useCallback(async (p: RenderParams) => {
    // Cancel previous request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const body: Record<string, unknown> = {
        job: [String(p.jobId)],
        gender: p.gender,
        head: p.head,
        headPalette: p.headPalette,
        headdir: p.headdir,
        headgear: p.headgear,
        garment: p.garment,
        action: p.action,
        canvas: CANVAS,
        frame: 0,
        enableShadow: false,
      };
      if (p.bodyPalette) body.bodyPalette = p.bodyPalette;
      if (p.weapon) body.weapon = p.weapon;
      if (p.shield) body.shield = p.shield;

      const res = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text);
      }

      const blob = await res.blob();
      // Revoke previous blob URL
      if (prevBlobRef.current) {
        URL.revokeObjectURL(prevBlobRef.current);
      }
      const url = URL.createObjectURL(blob);
      prevBlobRef.current = url;
      setImgSrc(url);
      setError(null);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Render failed");
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced fetch on params change
  useEffect(() => {
    const t = setTimeout(() => fetchSprite(params), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [
    params.jobId, params.gender, params.head, params.headPalette, params.bodyPalette,
    params.headdir, params.action, params.garment,
    params.weapon, params.shield,
    params.headgear[0], params.headgear[1], params.headgear[2],
    fetchSprite,
  ]);

  // Cleanup blob on unmount
  useEffect(() => {
    return () => {
      if (prevBlobRef.current) URL.revokeObjectURL(prevBlobRef.current);
    };
  }, []);

  // ─── Rotation helpers ──────────────────────────────────────

  const actionBase = params.action - (params.action % 8);
  const direction = params.action % 8;

  const rotateBody = (delta: number) => {
    const newDir = ((direction + delta) % 8 + 8) % 8;
    onParamsChange?.({ action: actionBase + newDir });
  };

  const cycleHeadDir = (delta: number) => {
    const dirs = [1, 0, 2]; // left, straight, right
    const idx = dirs.indexOf(params.headdir);
    const newIdx = ((idx + delta) % 3 + 3) % 3;
    onParamsChange?.({ headdir: dirs[newIdx] });
  };

  return (
    <div className="flex flex-col items-center gap-1" style={{ width }}>
      {/* Sprite display */}
      <div
        className="relative flex items-center justify-center bg-ro-darker/50 rounded"
        style={{ width, height, imageRendering: "pixelated" }}
      >
        {imgSrc && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imgSrc}
            alt="Character"
            className="max-w-full max-h-full object-contain"
            style={{
              imageRendering: "pixelated",
              opacity: loading ? 0.5 : 1,
              transition: "opacity 150ms",
            }}
          />
        )}
        {loading && !imgSrc && (
          <div className="text-[10px] text-ro-muted animate-pulse">Renderizando...</div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center p-2">
            <span className="text-[9px] text-red-400 text-center leading-tight">
              zrenderer offline
            </span>
          </div>
        )}
      </div>

      {/* Controls */}
      {showControls && onParamsChange && (
        <div className="flex flex-col gap-1 w-full">
          {/* Body rotation + head dir */}
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => rotateBody(1)}
              className="w-6 h-6 rounded bg-ro-surface border border-ro-border text-[10px] text-ro-muted hover:text-ro-gold hover:border-ro-gold/40 transition-colors"
              title="Girar corpo (esq)"
            >
              ◄
            </button>
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => cycleHeadDir(-1)}
                className="w-5 h-5 rounded bg-ro-surface/60 border border-ro-border/50 text-[8px] text-ro-muted hover:text-ro-gold transition-colors"
                title="Virar cabeça"
              >
                ◁
              </button>
              <span className="text-[8px] text-ro-muted/50 w-4 text-center">
                {params.headdir === 0 ? "↑" : params.headdir === 1 ? "←" : "→"}
              </span>
              <button
                onClick={() => cycleHeadDir(1)}
                className="w-5 h-5 rounded bg-ro-surface/60 border border-ro-border/50 text-[8px] text-ro-muted hover:text-ro-gold transition-colors"
                title="Virar cabeça"
              >
                ▷
              </button>
            </div>
            <button
              onClick={() => rotateBody(-1)}
              className="w-6 h-6 rounded bg-ro-surface border border-ro-border text-[10px] text-ro-muted hover:text-ro-gold hover:border-ro-gold/40 transition-colors"
              title="Girar corpo (dir)"
            >
              ►
            </button>
          </div>

          {/* Action + Gender */}
          <div className="flex items-center justify-center gap-1">
            {ACTION_NAMES.map((act) => (
              <button
                key={act.base}
                onClick={() => onParamsChange({ action: act.base + direction })}
                className={`px-1.5 py-0.5 rounded text-[8px] border transition-colors ${
                  actionBase === act.base
                    ? "bg-ro-gold/10 border-ro-gold/40 text-ro-gold"
                    : "bg-ro-surface border-ro-border/40 text-ro-muted hover:text-[var(--ro-text)]"
                }`}
              >
                {act.label}
              </button>
            ))}
            <button
              onClick={() => onParamsChange({ gender: params.gender === 1 ? 0 : 1 })}
              className="px-1.5 py-0.5 rounded text-[8px] border border-ro-border/40 bg-ro-surface text-ro-muted hover:text-ro-gold transition-colors"
              title="Trocar gênero"
            >
              {params.gender === 1 ? "♂" : "♀"}
            </button>
          </div>

          {/* Hair style + color */}
          <div className="flex items-center justify-center gap-1">
            <button
              onClick={() => onParamsChange({ head: Math.max(1, params.head - 1) })}
              className="w-5 h-5 rounded bg-ro-surface border border-ro-border/40 text-[8px] text-ro-muted hover:text-ro-gold transition-colors"
            >
              ‹
            </button>
            <span className="text-[8px] text-ro-muted w-12 text-center">
              Cabelo {params.head}
            </span>
            <button
              onClick={() => onParamsChange({ head: Math.min(31, params.head + 1) })}
              className="w-5 h-5 rounded bg-ro-surface border border-ro-border/40 text-[8px] text-ro-muted hover:text-ro-gold transition-colors"
            >
              ›
            </button>
          </div>

          {/* Hair color dots */}
          <div className="flex items-center justify-center gap-0.5">
            {HAIR_COLORS.map((hc) => (
              <button
                key={hc.id}
                onClick={() => onParamsChange({ headPalette: hc.id })}
                className={`w-3.5 h-3.5 rounded-full border transition-all ${
                  params.headPalette === hc.id
                    ? "border-ro-gold scale-125"
                    : "border-ro-border/30 hover:border-ro-muted"
                }`}
                style={{ backgroundColor: hc.color }}
                title={`Cor ${hc.label}`}
              />
            ))}
          </div>

          {/* Body color dots */}
          <div className="flex items-center justify-center gap-0.5">
            {BODY_COLORS.map((bc) => (
              <button
                key={bc.id}
                onClick={() => onParamsChange({ bodyPalette: bc.id })}
                className={`w-3 h-3 rounded-full border transition-all ${
                  params.bodyPalette === bc.id
                    ? "border-ro-gold scale-125"
                    : "border-ro-border/30 hover:border-ro-muted"
                }`}
                style={{ backgroundColor: bc.color }}
                title={`Roupa ${bc.label}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
