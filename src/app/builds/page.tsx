"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { itemImageUrl, classIconUrl, parseRODescription } from "@/lib/utils";
import { searchItems } from "@/lib/db/supabase";
import CharacterPreview, { type RenderParams } from "@/components/build/CharacterPreview";
import {
  RO_CLASSES,
  CLASS_GROUPS,
  EQUIP_SLOTS,
  type RoClass,
  type ClassTier,
} from "@/lib/ro-classes";
import {
  calculateDerivedStats,
  getLocationFilters,
  getAllOccupiedSlots,
  isCardCompatibleWithSlot,
  getStatCost,
  getStatPointsSpent,
  getTotalStatPoints,
  getTotalStatPointsUsed,
  type BaseStats,
  type EquipSlot,
  type EquippedItem,
  type CardItem,
  type BuildConfig,
} from "@/lib/ro-stats";
import DamageCalculator from "@/components/build/DamageCalculator";
import BuffSelectorModal from "@/components/build/BuffSelectorModal";
import { BUFFS, getBuff } from "@/lib/ro-buffs";

// ─── Types ───────────────────────────────────────────────────────────

interface SearchItem {
  id: number;
  nameEn: string;
  namePt?: string;
  type: string;
  subType?: string;
  attack?: number;
  magicAttack?: number;
  defense?: number;
  mdef?: number;
  slots: number;
  refineable?: boolean;
  weaponLevel?: number;
  armorLevel?: number;
  weight?: number;
  equipLevelMin?: number;
  locations: string[];
  jobs: string[];
  script?: string;
  classNum: number;
  description?: string[];
}

// ─── Constants ───────────────────────────────────────────────────────

const DEFAULT_STATS: BaseStats = { str: 1, agi: 1, vit: 1, int: 1, dex: 1, luk: 1 };
const STAT_KEYS: (keyof BaseStats)[] = ["str", "agi", "vit", "int", "dex", "luk"];
const STAT_LABELS: Record<string, string> = {
  str: "For", agi: "Agi", vit: "Vit", int: "Int", dex: "Des", luk: "Sor",
};


// ─── Saved Builds ───────────────────────────────────────────────────

interface SavedBuild {
  id: string;
  name: string;
  classId: string;
  className: string;
  baseLevel: number;
  jobLevel: number;
  baseStats: BaseStats;
  equipment: Partial<Record<EquipSlot, EquippedItem | null>>;
  previewState: {
    gender: 0 | 1;
    head: number;
    headPalette: number;
    bodyPalette: number;
    action: number;
    headdir: number;
    costumeJobId: number;
  };
  savedAt: number;
}

const BUILDS_STORAGE_KEY = "ro-latam-saved-builds";

function loadSavedBuilds(): SavedBuild[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(BUILDS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function persistBuilds(builds: SavedBuild[]) {
  localStorage.setItem(BUILDS_STORAGE_KEY, JSON.stringify(builds));
}

// ─── Main Page ───────────────────────────────────────────────────────

export default function BuildsPage() {
  const [selectedClass, setSelectedClass] = useState<RoClass | null>(null);
  const [baseLevel, setBaseLevel] = useState(185);
  const [jobLevel, setJobLevel] = useState(65);
  const [baseStats, setBaseStats] = useState<BaseStats>({ ...DEFAULT_STATS });
  const [equipment, setEquipment] = useState<Partial<Record<EquipSlot, EquippedItem | null>>>({});
  const [activeBuffs, setActiveBuffs] = useState<string[]>([]);
  const [showBuffModal, setShowBuffModal] = useState(false);
  const [searchSlot, setSearchSlot] = useState<EquipSlot | null>(null);
  const [cardSearch, setCardSearch] = useState<{ equipSlot: EquipSlot; cardIndex: number } | null>(null);
  const [enchantSearch, setEnchantSearch] = useState<{ equipSlot: EquipSlot; enchantIndex: number } | null>(null);
  const [activeTab, setActiveTab] = useState<"altq" | "altx">("altq");
  const [previewState, setPreviewState] = useState({
    gender: 1 as 0 | 1,
    head: 1,
    headPalette: 0,
    bodyPalette: 0,
    action: 0,
    headdir: 0,
    costumeJobId: 0, // 0 = use default zrendererJobId
  });
  const [tooltipItem, setTooltipItem] = useState<{
    item: { id: number; nameEn: string; namePt?: string; description?: string[]; script?: string; attack?: number; magicAttack?: number; defense?: number; mdef?: number; slots?: number; type?: string; subType?: string; refine?: number };
    rect: DOMRect;
  } | null>(null);

  // Saved builds
  const [savedBuilds, setSavedBuilds] = useState<SavedBuild[]>([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [saveName, setSaveName] = useState("");
  const saveInputRef = useRef<HTMLInputElement>(null);

  // Load saved builds from localStorage on mount
  useEffect(() => {
    setSavedBuilds(loadSavedBuilds());
  }, []);

  const handleSaveBuild = useCallback(() => {
    if (!selectedClass || !saveName.trim()) return;
    const build: SavedBuild = {
      id: `build_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: saveName.trim(),
      classId: selectedClass.id,
      className: selectedClass.name,
      baseLevel,
      jobLevel,
      baseStats: { ...baseStats },
      equipment: JSON.parse(JSON.stringify(equipment)),
      previewState: { ...previewState },
      savedAt: Date.now(),
    };
    const updated = [build, ...savedBuilds];
    setSavedBuilds(updated);
    persistBuilds(updated);
    setSaveName("");
    setShowSaveModal(false);
  }, [selectedClass, saveName, baseLevel, jobLevel, baseStats, equipment, previewState, savedBuilds]);

  const handleLoadBuild = useCallback((build: SavedBuild) => {
    const cls = RO_CLASSES.find((c) => c.id === build.classId);
    if (!cls) return;
    setSelectedClass(cls);
    setBaseLevel(build.baseLevel);
    setJobLevel(build.jobLevel);
    setBaseStats({ ...build.baseStats });
    setEquipment(build.equipment);
    setPreviewState(build.previewState);
    setShowLoadModal(false);
  }, []);

  const handleDeleteBuild = useCallback((buildId: string) => {
    const updated = savedBuilds.filter((b) => b.id !== buildId);
    setSavedBuilds(updated);
    persistBuilds(updated);
  }, [savedBuilds]);

  // Export build as JSON file
  const handleExportBuild = useCallback((build: SavedBuild) => {
    const json = JSON.stringify(build, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${build.name.replace(/[^a-zA-Z0-9_-]/g, "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  // Import build from JSON file
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleImportBuild = useCallback(() => {
    fileInputRef.current?.click();
  }, []);
  const handleFileImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const build = JSON.parse(ev.target?.result as string) as SavedBuild;
        if (!build.classId || !build.name || !build.baseStats) {
          alert("Arquivo inválido: não é uma build válida.");
          return;
        }
        // Give it a new unique id to avoid collisions
        build.id = `build_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        build.savedAt = Date.now();
        const updated = [build, ...savedBuilds];
        setSavedBuilds(updated);
        persistBuilds(updated);
      } catch {
        alert("Erro ao ler o arquivo. Verifique se é um JSON válido.");
      }
    };
    reader.readAsText(file);
    // Reset file input so the same file can be re-imported
    e.target.value = "";
  }, [savedBuilds]);

  // Stat point budget (always available, even before class selection)
  const totalStatPoints = getTotalStatPoints(baseLevel);
  const usedStatPoints = getTotalStatPointsUsed(baseStats);
  const remainingStatPoints = totalStatPoints - usedStatPoints;

  // Build render params from equipment + class
  // Visual headgear overrides ALT+Q, per-slot (they complement each other)
  const renderParams: RenderParams | null = selectedClass
    ? {
      jobId: previewState.costumeJobId || selectedClass.zrendererJobId,
      gender: selectedClass.gender === "female" ? 0 : selectedClass.gender === "male" ? 1 : previewState.gender,
      head: previewState.head,
      headPalette: previewState.headPalette,
      bodyPalette: previewState.bodyPalette,
      action: previewState.action,
      headdir: previewState.headdir,
      headgear: [
        equipment.visual_low?.classNum || equipment.head_low?.classNum || 0,
        equipment.visual_top?.classNum || equipment.head_top?.classNum || 0,
        equipment.visual_mid?.classNum || equipment.head_mid?.classNum || 0,
      ],
      garment: equipment.visual_garment?.classNum || equipment.garment?.classNum || 0,
      weapon: equipment.right_hand?.classNum || 0,
      shield: equipment.left_hand?.classNum || 0,
    }
    : null;

  const handleEquip = (slot: EquipSlot, item: SearchItem, refine: number) => {
    const equipped: EquippedItem = {
      id: item.id, nameEn: item.nameEn, namePt: item.namePt,
      type: item.type, subType: item.subType,
      attack: item.attack, magicAttack: item.magicAttack,
      defense: item.defense, mdef: item.mdef,
      script: item.script, refineable: item.refineable,
      refine, slots: item.slots, cards: Array(item.slots).fill(null),
      enchants: [null, null, null, null],  // 4 enchantment slots
      weaponLevel: item.weaponLevel, armorLevel: item.armorLevel, weight: item.weight,
      locations: item.locations, jobs: item.jobs,
      classNum: item.classNum || 0,
      description: item.description,
    };

    // Multi-slot items: fill all occupied slots
    const allSlots = getAllOccupiedSlots(item.locations, slot);
    setEquipment((prev) => {
      const next = { ...prev };

      // Clear any existing multi-slot items that would conflict
      // 1) If the primary slot currently has an item, clear its secondary slots too
      const existing = next[slot];
      if (existing && !existing._blockedBy) {
        const oldSlots = getAllOccupiedSlots(existing.locations, slot);
        for (const s of oldSlots) {
          if (s !== slot) next[s] = null;
        }
      }
      // 2) If any target secondary slot is blocked by a different primary, clear that primary + its secondaries
      for (const s of allSlots) {
        const target = next[s];
        if (target?._blockedBy && target._blockedBy !== slot) {
          const primary = next[target._blockedBy];
          if (primary) {
            const oldSlots = getAllOccupiedSlots(primary.locations, target._blockedBy);
            for (const os of oldSlots) next[os] = null;
          }
        }
      }

      // Set primary slot
      next[slot] = equipped;
      // Set secondary slots with _blockedBy marker
      for (const s of allSlots) {
        if (s !== slot) {
          next[s] = { ...equipped, _blockedBy: slot };
        }
      }
      return next;
    });
    setSearchSlot(null);
  };

  const handleUnequip = (slot: EquipSlot) => {
    setEquipment((prev) => {
      const item = prev[slot];
      if (!item) return prev;
      const next = { ...prev };

      if (item._blockedBy) {
        // This is a secondary slot — clear both this and the primary
        const primarySlot = item._blockedBy;
        const primary = next[primarySlot];
        if (primary) {
          // Clear all slots occupied by the primary item
          const allSlots = getAllOccupiedSlots(primary.locations, primarySlot);
          for (const s of allSlots) next[s] = null;
        }
        next[slot] = null;
      } else {
        // This is a primary slot — clear all secondary slots too
        const allSlots = getAllOccupiedSlots(item.locations, slot);
        for (const s of allSlots) next[s] = null;
      }
      return next;
    });
  };

  const handleRefineChange = (slot: EquipSlot, refine: number) => {
    setEquipment((prev) => {
      const item = prev[slot];
      if (!item) return prev;
      return { ...prev, [slot]: { ...item, refine } };
    });
  };

  const handleCardEquip = (equipSlot: EquipSlot, cardIndex: number, card: CardItem) => {
    setEquipment((prev) => {
      const item = prev[equipSlot];
      if (!item) return prev;
      const newCards = [...item.cards];
      newCards[cardIndex] = card;
      return { ...prev, [equipSlot]: { ...item, cards: newCards } };
    });
    setCardSearch(null);
  };

  const handleCardUnequip = (equipSlot: EquipSlot, cardIndex: number) => {
    setEquipment((prev) => {
      const item = prev[equipSlot];
      if (!item) return prev;
      const newCards = [...item.cards];
      newCards[cardIndex] = null;
      return { ...prev, [equipSlot]: { ...item, cards: newCards } };
    });
  };

  const handleEnchantEquip = (equipSlot: EquipSlot, enchantIndex: number, enchant: CardItem) => {
    setEquipment((prev) => {
      const item = prev[equipSlot];
      if (!item) return prev;
      const newEnchants = [...(item.enchants || [null, null, null, null])];
      newEnchants[enchantIndex] = enchant;
      return { ...prev, [equipSlot]: { ...item, enchants: newEnchants } };
    });
    setEnchantSearch(null);
  };

  const handleEnchantUnequip = (equipSlot: EquipSlot, enchantIndex: number) => {
    setEquipment((prev) => {
      const item = prev[equipSlot];
      if (!item) return prev;
      const newEnchants = [...(item.enchants || [null, null, null, null])];
      newEnchants[enchantIndex] = null;
      return { ...prev, [equipSlot]: { ...item, enchants: newEnchants } };
    });
  };


  const handleItemTooltip = useCallback((item: { id: number; nameEn: string; namePt?: string; description?: string[]; script?: string; attack?: number; magicAttack?: number; defense?: number; mdef?: number; slots?: number; type?: string; subType?: string; refine?: number }, el: HTMLElement) => {
    setTooltipItem({ item, rect: el.getBoundingClientRect() });
  }, []);

  // Close tooltip when search modals open
  useEffect(() => {
    if (searchSlot || cardSearch || enchantSearch) setTooltipItem(null);
  }, [searchSlot, cardSearch, enchantSearch]);

  // ─── Class selection screen ────────────────────────────────────
  if (!selectedClass) {
    const TIER_SECTIONS: { key: ClassTier; label: string }[] = [
      { key: "trans", label: "Transclasse" },
      { key: "third", label: "3ª Classe" },
      { key: "expanded", label: "Expandida" },
      { key: "doram", label: "Doram" },
    ];

    return (
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[var(--ro-text)] mb-1">Build Planner</h1>
          <p className="text-xs text-ro-muted">Escolha sua classe para montar o equipamento</p>
          {savedBuilds.length > 0 && (
            <button
              onClick={() => setShowLoadModal(true)}
              className="mt-3 px-4 py-1.5 text-xs bg-ro-surface border border-ro-border rounded-lg hover:border-ro-gold-dim transition-colors text-ro-muted hover:text-ro-gold"
            >
              Carregar Build Salva ({savedBuilds.length})
            </button>
          )}
        </div>

        <div className="space-y-6">
          {TIER_SECTIONS.map((section) => {
            const classes = RO_CLASSES.filter((c) => c.tier === section.key);
            if (classes.length === 0) return null;
            return (
              <div key={section.key}>
                <div className="text-[10px] uppercase tracking-widest mb-3 font-semibold pl-1 text-ro-gold">
                  {section.label}
                </div>
                <div className="flex flex-wrap gap-2">
                  {classes.map((cls) => (
                    <button
                      key={cls.id}
                      onClick={() => { setSelectedClass(cls); setPreviewState((prev) => ({ ...prev, costumeJobId: 0 })); }}
                      className="group flex flex-col items-center w-[72px] p-2 rounded-lg border border-ro-border/40 hover:border-ro-gold/40 hover:bg-ro-gold/[0.06] transition-all"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={classIconUrl(cls.id)}
                        alt={cls.name}
                        className="w-9 h-9 object-contain mb-1"
                        style={{ imageRendering: "pixelated" }}
                      />
                      <span className="text-[9px] font-medium text-[var(--ro-text)] group-hover:text-ro-gold transition-colors text-center leading-tight">
                        {cls.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Load modal on class selection screen */}
        {showLoadModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60" onClick={() => setShowLoadModal(false)}>
            <div className="bg-ro-panel border border-ro-border rounded-xl shadow-2xl w-[420px] max-h-[70vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="p-4 border-b border-ro-border">
                <h3 className="text-sm font-bold text-[var(--ro-text)]">Builds Salvas</h3>
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                {savedBuilds.length === 0 ? (
                  <div className="text-center text-ro-muted text-xs py-8">Nenhuma build salva.</div>
                ) : (
                  <div className="space-y-1">
                    {savedBuilds.map((build) => {
                      const cls = RO_CLASSES.find((c) => c.id === build.classId);
                      const clsColor = cls ? CLASS_GROUPS[cls.group].color : "#888";
                      return (
                        <div
                          key={build.id}
                          className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-ro-surface/80 transition-colors group cursor-pointer"
                          onClick={() => handleLoadBuild(build)}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={cls ? classIconUrl(cls.id) : ""} alt="" className="w-6 h-6 shrink-0" style={{ imageRendering: "pixelated" }} />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-[var(--ro-text)] truncate">{build.name}</div>
                            <div className="text-[10px] text-ro-muted flex items-center gap-2">
                              <span style={{ color: clsColor }}>{build.className}</span>
                              <span>Lv{build.baseLevel}/{build.jobLevel}</span>
                              <span>{new Date(build.savedAt).toLocaleDateString("pt-BR")}</span>
                            </div>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteBuild(build.id); }}
                            className="opacity-0 group-hover:opacity-100 text-ro-muted hover:text-red-400 transition-all text-xs px-1"
                            title="Excluir"
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="p-3 border-t border-ro-border flex justify-end">
                <button onClick={() => setShowLoadModal(false)} className="px-3 py-1.5 text-xs text-ro-muted hover:text-[var(--ro-text)] transition-colors">
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    );
  }

  // ─── Build editor ──────────────────────────────────────────────
  const buildConfig: BuildConfig = {
    baseLevel,
    jobLevel,
    baseStats,
    equipment,
    activeBuffs,
    hpFactor: selectedClass?.hpFactor || 1,
    spFactor: selectedClass?.spFactor || 1,
    isTrans: selectedClass?.tier === "trans" || selectedClass?.tier === "third",
    jobBonus: selectedClass?.jobBonus,
  };
  const derivedStats = calculateDerivedStats(buildConfig);
  const groupColor = CLASS_GROUPS[selectedClass.group].color;

  // ALT+Q slot layout — DEFINITIVE bRO order. NEVER CHANGE.
  // Row 1: Topo        | Meio
  // Row 2: Baixo       | Armadura
  // Row 3: Mão Dir.    | Mão Esq.
  // Row 4: Capa        | Sapatos
  // Row 5: Acessório E | Acessório D
  const LEFT_SLOTS: EquipSlot[] = ["head_top", "head_low", "right_hand", "garment", "accessory1"];
  const RIGHT_SLOTS: EquipSlot[] = ["head_mid", "armor", "left_hand", "shoes", "accessory2"];

  // ALT+X — same positions as ALT+Q, visuals replace their counterpart, shadows fill the rest. NEVER CHANGE.
  // Row 1: V. Topo       | V. Meio
  // Row 2: V. Baixo      | S. Armadura
  // Row 3: S. Arma       | S. Escudo
  // Row 4: V. Capa       | S. Sapatos
  // Row 5: S. Brinco     | S. Pingente
  const LEFT_ALTX: EquipSlot[] = ["visual_top", "visual_low", "shadow_weapon", "visual_garment", "shadow_earring"];
  const RIGHT_ALTX: EquipSlot[] = ["visual_mid", "shadow_armor", "shadow_shield", "shadow_shoes", "shadow_pendant"];

  return (
    <main className="max-w-[1100px] mx-auto px-4 py-4" style={{ zoom: 1.25 }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setSelectedClass(null)} className="text-ro-muted hover:text-[var(--ro-text)] transition-colors text-sm">
            ← Classes
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={classIconUrl(selectedClass.id)} alt="" className="w-6 h-6" style={{ imageRendering: "pixelated" }} />
          <h1 className="text-lg font-bold" style={{ color: groupColor }}>{selectedClass.name}</h1>
          <div className="flex items-center gap-1 ml-2">
            <button
              onClick={() => { setShowSaveModal(true); setSaveName(selectedClass.name + " Build"); setTimeout(() => saveInputRef.current?.select(), 50); }}
              className="px-2 py-1 text-[10px] bg-ro-surface border border-ro-border rounded hover:border-ro-gold-dim transition-colors text-ro-muted hover:text-ro-gold"
              title="Salvar build"
            >
              Salvar
            </button>
            <button
              onClick={() => setShowLoadModal(true)}
              className="px-2 py-1 text-[10px] bg-ro-surface border border-ro-border rounded hover:border-ro-gold-dim transition-colors text-ro-muted hover:text-ro-gold"
              title="Carregar build"
            >
              Carregar{savedBuilds.length > 0 && ` (${savedBuilds.length})`}
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-ro-muted">
          <label>Base Lv
            <input type="number" value={baseLevel} onChange={(e) => setBaseLevel(Math.max(1, Math.min(185, parseInt(e.target.value) || 1)))}
              className="ml-1 w-14 bg-ro-surface border border-ro-border rounded px-2 py-1 text-xs text-[var(--ro-text)] text-center" />
          </label>
          <label>Job Lv
            <input type="number" value={jobLevel} onChange={(e) => setJobLevel(Math.max(1, Math.min(65, parseInt(e.target.value) || 1)))}
              className="ml-1 w-12 bg-ro-surface border border-ro-border rounded px-2 py-1 text-xs text-[var(--ro-text)] text-center" />
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4 items-start">
        {/* ══════════ LEFT: Equipment Window + Calculator ══════════ */}
        <div className="flex flex-col gap-4">
          <div className="ro-panel overflow-hidden" style={{ border: `1px solid ${groupColor}30` }}>
            {/* Window title bar — like the game */}
            <div className="flex items-center gap-0 border-b border-ro-border" style={{ background: `${groupColor}08` }}>
              <span className="px-3 py-1.5 text-[11px] font-semibold border-r border-ro-border/30" style={{ color: groupColor }}>
                Equipamentos
              </span>
              <button
                onClick={() => setActiveTab("altq")}
                className={`px-3 py-1.5 text-[10px] transition-colors ${activeTab === "altq" ? "text-ro-gold border-b-2 border-ro-gold font-medium" : "text-ro-muted hover:text-[var(--ro-text)]"}`}
              >
                ALT+Q
              </button>
              <button
                onClick={() => setActiveTab("altx")}
                className={`px-3 py-1.5 text-[10px] transition-colors ${activeTab === "altx" ? "text-ro-gold border-b-2 border-ro-gold font-medium" : "text-ro-muted hover:text-[var(--ro-text)]"}`}
              >
                ALT+X
              </button>
            </div>

            {activeTab === "altq" && (
              <>
                {/* ALT+Q body: row-based grid — left slot | sprite | right slot per row */}
                <div className="grid items-stretch overflow-x-auto" style={{ gridTemplateColumns: 'minmax(120px, 1fr) minmax(200px, 220px) minmax(120px, 1fr)', minHeight: 380 }}>
                  {/* Character sprite preview — center, spans all rows */}
                  <div style={{ gridColumn: 2, gridRow: '1 / 6' }} className="flex items-center justify-center">
                    {renderParams && (
                      <CharacterPreview
                        params={renderParams}

                        onParamsChange={(partial) => {
                          // If jobId changes from costume selector, store as costumeJobId
                          if (partial.jobId !== undefined) {
                            const isDefault = partial.jobId === selectedClass?.zrendererJobId;
                            setPreviewState((prev) => ({ ...prev, ...partial, costumeJobId: isDefault ? 0 : partial.jobId! }));
                          } else {
                            setPreviewState((prev) => ({ ...prev, ...partial }));
                          }
                        }}
                        width={200}
                        height={280}
                        showControls
                      />
                    )}
                  </div>
                  {/* Left slots — content pushed right (near character) */}
                  {LEFT_SLOTS.map((slotId, i) => (
                    <div key={slotId} style={{ gridColumn: 1, gridRow: i + 1 }}
                      className={`flex items-center pl-2 pr-1 ${i % 2 === 1 ? 'bg-[var(--ro-stripe)]' : ''} ${i < 4 ? 'border-b border-[var(--ro-stripe-border)]' : ''}`}>
                      <AltQSlot
                        slotId={slotId}
                        equipment={equipment}
                        align="right"
                        onSearch={() => setSearchSlot(slotId)}
                        onUnequip={() => handleUnequip(slotId)}
                        onRefineChange={(r) => handleRefineChange(slotId, r)}
                        onCardSearch={(idx) => setCardSearch({ equipSlot: slotId, cardIndex: idx })}
                        onCardUnequip={(idx) => handleCardUnequip(slotId, idx)}
                        onEnchantSearch={(idx) => setEnchantSearch({ equipSlot: slotId, enchantIndex: idx })}
                        onEnchantUnequip={(idx) => handleEnchantUnequip(slotId, idx)}
                        onItemClick={handleItemTooltip}
                      />
                    </div>
                  ))}
                  {/* Right slots — content pushed left (near character) */}
                  {RIGHT_SLOTS.map((slotId, i) => (
                    <div key={slotId} style={{ gridColumn: 3, gridRow: i + 1 }}
                      className={`flex items-center justify-start pr-2 pl-1 ${i % 2 === 1 ? 'bg-[var(--ro-stripe)]' : ''} ${i < 4 ? 'border-b border-[var(--ro-stripe-border)]' : ''}`}>
                      <AltQSlot
                        slotId={slotId}
                        equipment={equipment}
                        align="left"
                        onSearch={() => setSearchSlot(slotId)}
                        onUnequip={() => handleUnequip(slotId)}
                        onRefineChange={(r) => handleRefineChange(slotId, r)}
                        onCardSearch={(idx) => setCardSearch({ equipSlot: slotId, cardIndex: idx })}
                        onCardUnequip={(idx) => handleCardUnequip(slotId, idx)}
                        onEnchantSearch={(idx) => setEnchantSearch({ equipSlot: slotId, enchantIndex: idx })}
                        onEnchantUnequip={(idx) => handleEnchantUnequip(slotId, idx)}
                        onItemClick={handleItemTooltip}
                      />
                    </div>
                  ))}
                </div>
              </>
            )}
            {activeTab === "altx" && (
              <>
                {/* ALT+X body: row-based grid — visual + shadow slots */}
                <div className="grid items-stretch overflow-x-auto" style={{ gridTemplateColumns: 'minmax(120px, 1fr) minmax(200px, 220px) minmax(120px, 1fr)', minHeight: 380 }}>
                  {/* Character sprite preview — center, spans all rows */}
                  <div style={{ gridColumn: 2, gridRow: '1 / 6' }} className="flex items-center justify-center">
                    {renderParams && (
                      <CharacterPreview
                        params={renderParams}

                        onParamsChange={(partial) => {
                          // If jobId changes from costume selector, store as costumeJobId
                          if (partial.jobId !== undefined) {
                            const isDefault = partial.jobId === selectedClass?.zrendererJobId;
                            setPreviewState((prev) => ({ ...prev, ...partial, costumeJobId: isDefault ? 0 : partial.jobId! }));
                          } else {
                            setPreviewState((prev) => ({ ...prev, ...partial }));
                          }
                        }}
                        width={200}
                        height={280}
                        showControls
                      />
                    )}
                  </div>
                  {/* Left slots — content pushed right (near character) */}
                  {LEFT_ALTX.map((slotId, i) => (
                    <div key={slotId} style={{ gridColumn: 1, gridRow: i + 1 }}
                      className={`flex items-center pl-2 pr-1 ${i % 2 === 1 ? 'bg-[var(--ro-stripe)]' : ''} ${i < 4 ? 'border-b border-[var(--ro-stripe-border)]' : ''}`}>
                      <AltQSlot
                        slotId={slotId}
                        equipment={equipment}
                        align="right"
                        onSearch={() => setSearchSlot(slotId)}
                        onUnequip={() => handleUnequip(slotId)}
                        onRefineChange={(r) => handleRefineChange(slotId, r)}
                        {...(!slotId.startsWith("visual_") ? {
                          onCardSearch: (idx: number) => setCardSearch({ equipSlot: slotId, cardIndex: idx }),
                          onCardUnequip: (idx: number) => handleCardUnequip(slotId, idx),
                        } : {})}
                        onEnchantSearch={(idx: number) => setEnchantSearch({ equipSlot: slotId, enchantIndex: idx })}
                        onEnchantUnequip={(idx: number) => handleEnchantUnequip(slotId, idx)}
                        onItemClick={handleItemTooltip}
                      />
                    </div>
                  ))}
                  {/* Right slots */}
                  {RIGHT_ALTX.map((slotId, i) => (
                    <div key={slotId} style={{ gridColumn: 3, gridRow: i + 1 }}
                      className={`flex items-center pr-2 pl-1 ${i % 2 === 1 ? 'bg-[var(--ro-stripe)]' : ''} ${i < 4 ? 'border-b border-[var(--ro-stripe-border)]' : ''}`}>
                      <AltQSlot
                        slotId={slotId}
                        equipment={equipment}
                        align="left"
                        onSearch={() => setSearchSlot(slotId)}
                        onUnequip={() => handleUnequip(slotId)}
                        onRefineChange={(r) => handleRefineChange(slotId, r)}
                        {...(!slotId.startsWith("visual_") ? {
                          onCardSearch: (idx: number) => setCardSearch({ equipSlot: slotId, cardIndex: idx }),
                          onCardUnequip: (idx: number) => handleCardUnequip(slotId, idx),
                        } : {})}
                        onEnchantSearch={(idx: number) => setEnchantSearch({ equipSlot: slotId, enchantIndex: idx })}
                        onEnchantUnequip={(idx: number) => handleEnchantUnequip(slotId, idx)}
                        onItemClick={handleItemTooltip}
                      />
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Bottom bar */}
            <div className="border-t border-ro-border/30 px-3 py-1.5 flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-[10px] text-ro-muted cursor-pointer select-none">
                <input type="checkbox" defaultChecked className="w-3 h-3 accent-ro-gold" />
                Exibir Equip
              </label>
            </div>
          </div>

          {/* ─── Damage Calculator ────────────────────────────────────── */}
          <DamageCalculator
            buildConfig={buildConfig}
            derivedStats={derivedStats}
            selectedClass={selectedClass}
          />

        </div>

        {/* ══════════ RIGHT: Stats + Bonus ══════════ */}
        <div className="space-y-3">
          {/* Atributos (RO-style combined panel) */}
          <div className="ro-panel p-2.5 overflow-hidden">
            <div className="text-[10px] uppercase tracking-widest text-ro-gold-dim font-semibold mb-1.5">Atributos</div>
            <table className="w-full text-[10px] font-mono border-collapse table-fixed">
              <tbody>
                {STAT_KEYS.map((stat, i) => {
                  const bonus = derivedStats.statBonuses[stat];
                  const cost = getStatCost(baseStats[stat]);
                  const canIncrease = remainingStatPoints >= cost && baseStats[stat] < 130;
                  const midRow = [
                    { label: "ATQ", value: derivedStats.atk },
                    { label: "ATQM", value: derivedStats.matk },
                    { label: "Precisão", value: derivedStats.hit },
                    { label: "Crítico", value: derivedStats.crit },
                    { label: "Pts Atrib.", value: remainingStatPoints },
                    null,
                  ][i];
                  const rightRow = [
                    { label: "DEF", value: derivedStats.def },
                    { label: "DEFM", value: derivedStats.mdef },
                    { label: "ESQV", value: derivedStats.flee },
                    { label: "VelAtq", value: derivedStats.aspd },
                    null,
                    null,
                  ][i];
                  return (
                    <tr key={stat} className="h-[22px]">
                      <td className="font-semibold font-sans pr-1 whitespace-nowrap" style={{ color: groupColor }}>
                        {STAT_LABELS[stat]}
                      </td>
                      <td className="px-0.5">
                        <StatInput
                          value={baseStats[stat]}
                          onChange={(v) => {
                            const clamped = Math.min(130, Math.max(1, v));
                            const otherUsed = usedStatPoints - getStatPointsSpent(baseStats[stat]);
                            const newUsed = otherUsed + getStatPointsSpent(clamped);
                            if (newUsed > totalStatPoints) return;
                            setBaseStats((prev) => ({ ...prev, [stat]: clamped }));
                          }}
                        />
                      </td>
                      <td className={`text-[9px] whitespace-nowrap w-6 ${bonus > 0 ? "text-green-400" : bonus < 0 ? "text-red-400" : "text-transparent"}`}>
                        {bonus !== 0 ? (bonus > 0 ? `+${bonus}` : `${bonus}`) : "+0"}
                      </td>
                      <td className="pr-0.5 w-5">
                        <button
                          onClick={() => {
                            if (canIncrease) setBaseStats((prev) => ({ ...prev, [stat]: prev[stat] + 1 }));
                          }}
                          disabled={!canIncrease}
                          className={`w-4 h-4 rounded-sm text-[9px] font-bold flex items-center justify-center transition-colors ${canIncrease
                            ? "bg-[#5b9bd5]/20 border border-[#5b9bd5]/50 text-[#7cb9e8] hover:bg-[#5b9bd5]/40 cursor-pointer"
                            : "bg-ro-surface/30 border border-ro-border/20 text-ro-muted/20 cursor-default"
                            }`}
                          title={`+1 (custo: ${cost} pts)`}
                        >
                          &gt;
                        </button>
                      </td>
                      <td className="text-ro-muted/40 text-right pr-2 w-5">{cost}</td>
                      <td className="text-ro-muted font-sans whitespace-nowrap pl-2 pr-1">
                        {midRow?.label ?? ""}
                      </td>
                      <td className={`text-right pr-2 whitespace-nowrap ${i === 4 && remainingStatPoints < 0 ? "text-red-400 font-bold" : ""}`}>
                        {midRow?.value ?? ""}
                      </td>
                      <td className="text-ro-muted font-sans whitespace-nowrap pl-1 pr-1">
                        {rightRow?.label ?? ""}
                      </td>
                      <td className="text-right whitespace-nowrap">
                        {rightRow?.value ?? ""}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="flex justify-between mt-1.5 pt-1.5 border-t border-ro-border/30 text-[10px]">
              <span className="text-ro-gold font-mono font-medium">HP {derivedStats.maxHp.toLocaleString()}</span>
              <span className="text-ro-gold font-mono font-medium">SP {derivedStats.maxSp.toLocaleString()}</span>
            </div>
          </div>

          {/* Bônus */}
          <div className="ro-panel p-3">
            <div className="text-[10px] uppercase tracking-widest text-ro-gold-dim mb-2 font-semibold">Bônus</div>
            <div className="grid grid-cols-1 gap-y-0.5 text-[11px]">
              <BonusRow label="ATK%" value={derivedStats.atkRate} />
              <BonusRow label="MATK%" value={derivedStats.matkRate} />
              <BonusRow label="Long Range%" value={derivedStats.longAtkRate} />
              <BonusRow label="Short Range%" value={derivedStats.shortAtkRate} />
              <BonusRow label="Crit DMG%" value={derivedStats.critAtkRate} />
              <BonusRow label="ASPD%" value={derivedStats.aspdRate} />
              <BonusRow label="V. Cast%" value={derivedStats.variableCastrate} invertColor />
              <BonusRow label="F. Cast%" value={derivedStats.fixedCastrate} invertColor />
              <BonusRow label="After Cast%" value={derivedStats.delayrate} invertColor />
              <BonusRow label="Perfect Dodge" value={derivedStats.perfectDodge} />
            </div>
          </div>

          {/* Active Combos */}
          {derivedStats.activeCombos.length > 0 && (
            <div className="ro-panel p-3">
              <div className="text-[10px] uppercase tracking-widest text-ro-gold-dim mb-2 font-semibold">Combos Ativos</div>
              <div className="space-y-0.5">
                {derivedStats.activeCombos.map((combo, i) => (
                  <div key={i} className="text-[11px] text-green-400 font-medium">{combo}</div>
                ))}
              </div>
            </div>
          )}

          {/* Resistências e Dano Especial */}
          {derivedStats.specialBonuses.length > 0 && (
            <div className="ro-panel p-3">
              <div className="text-[10px] uppercase tracking-widest text-ro-gold-dim mb-2 font-semibold">Resistências &amp; Dano</div>
              <div className="grid grid-cols-1 gap-y-0.5 text-[11px]">
                {derivedStats.specialBonuses.map((sb, i) => {
                  // For resistance stats, negative values are GOOD (less damage taken)
                  const isGood = sb.invertColor ? sb.value < 0 : sb.value > 0;
                  return (
                    <div key={i} className="flex justify-between">
                      <span className="text-ro-muted">{sb.label}</span>
                      {sb.value !== 0 ? (
                        <span className={`font-mono font-medium ${isGood ? "text-green-400" : "text-red-400"}`}>
                          {sb.value > 0 ? `+${sb.value}%` : `${sb.value}%`}
                        </span>
                      ) : (
                        <span className="font-mono font-medium text-green-400">&#10003;</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ─── Buffs Bar ────────────────────────────────────────────── */}
          <div className="ro-panel p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] uppercase tracking-widest text-ro-gold-dim font-semibold">Buffs & Consumíveis</div>
              <button
                onClick={() => setShowBuffModal(true)}
                className="flex items-center justify-center w-5 h-5 rounded bg-ro-surface border border-ro-border hover:border-ro-gold-dim hover:text-ro-gold transition-colors text-ro-muted title-tooltip"
                title="Adicionar Buff/Consumível"
              >
                <span className="text-sm leading-none font-medium">+</span>
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {activeBuffs.length === 0 ? (
                <span className="text-[10px] text-ro-muted italic">Nenhum buff ativo.</span>
              ) : (
                activeBuffs.map((buffId) => {
                  const buff = getBuff(buffId);
                  if (!buff) return null;
                  return (
                    <button
                      key={buffId}
                      onClick={() => setActiveBuffs(prev => prev.filter(b => b !== buffId))}
                      className="relative group shrink-0"
                      title={`Remover ${buff.name}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={buff.iconUrl}
                        alt={buff.name}
                        className="w-7 h-7 rounded-sm border border-[var(--ro-border)] hover:border-ro-gold shadow-sm object-contain transition-all group-hover:scale-[0.98]"
                      />
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-black flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-white text-[8px] font-bold leading-none">&times;</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

        </div>
      </div>

      {/* ─── Item Search Modal ────────────────────────────────────── */}
      {showBuffModal && (
        <BuffSelectorModal
          activeBuffIds={activeBuffs}
          onToggleBuff={(buffId) => {
            setActiveBuffs((prev) =>
              prev.includes(buffId) ? prev.filter(id => id !== buffId) : [...prev, buffId]
            );
          }}
          onClose={() => setShowBuffModal(false)}
        />
      )}

      {searchSlot && (
        <ItemSearchModal
          slot={searchSlot}
          roClass={selectedClass}
          baseLevel={baseLevel}
          onSelect={(item, refine) => handleEquip(searchSlot, item, refine)}
          onClose={() => setSearchSlot(null)}
        />
      )}

      {cardSearch && (
        <CardSearchModal
          equipSlot={cardSearch.equipSlot}
          onSelect={(card) => handleCardEquip(cardSearch.equipSlot, cardSearch.cardIndex, card)}
          onClose={() => setCardSearch(null)}
        />
      )}

      {enchantSearch && (
        <EnchantSearchModal
          onSelect={(enchant) => handleEnchantEquip(enchantSearch.equipSlot, enchantSearch.enchantIndex, enchant)}
          onClose={() => setEnchantSearch(null)}
        />
      )}

      {tooltipItem && (
        <ItemTooltipCard
          item={tooltipItem.item}
          anchorRect={tooltipItem.rect}
          onClose={() => setTooltipItem(null)}
        />
      )}

      {/* ─── Save Build Modal ───────────────────────────────────────── */}
      {showSaveModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60" onClick={() => setShowSaveModal(false)}>
          <div className="bg-ro-panel border border-ro-border rounded-xl shadow-2xl w-[360px] p-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-[var(--ro-text)] mb-3">Salvar Build</h3>
            <input
              ref={saveInputRef}
              type="text"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSaveBuild(); }}
              placeholder="Nome da build..."
              className="w-full bg-ro-surface border border-ro-border rounded-lg px-3 py-2 text-xs text-[var(--ro-text)] placeholder-ro-muted focus:outline-none focus:border-ro-gold-dim mb-3"
              autoFocus
            />
            <div className="flex items-center gap-2 text-[10px] text-ro-muted mb-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={classIconUrl(selectedClass.id)} alt="" className="w-4 h-4" style={{ imageRendering: "pixelated" }} />
              <span>{selectedClass.name} Lv{baseLevel}/{jobLevel}</span>
              <span className="ml-auto">{Object.values(equipment).filter(Boolean).length} itens</span>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowSaveModal(false)}
                className="px-3 py-1.5 text-xs text-ro-muted hover:text-[var(--ro-text)] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveBuild}
                disabled={!saveName.trim()}
                className="px-4 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: `${groupColor}30`, color: groupColor, border: `1px solid ${groupColor}50` }}
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Load Build Modal ───────────────────────────────────────── */}
      {showLoadModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60" onClick={() => setShowLoadModal(false)}>
          <div className="bg-ro-panel border border-ro-border rounded-xl shadow-2xl w-[420px] max-h-[70vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-ro-border">
              <h3 className="text-sm font-bold text-[var(--ro-text)]">Builds Salvas</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {savedBuilds.length === 0 ? (
                <div className="text-center text-ro-muted text-xs py-8">
                  Nenhuma build salva ainda.
                </div>
              ) : (
                <div className="space-y-1">
                  {savedBuilds.map((build) => {
                    const cls = RO_CLASSES.find((c) => c.id === build.classId);
                    const clsColor = cls ? CLASS_GROUPS[cls.group].color : "#888";
                    return (
                      <div
                        key={build.id}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-ro-surface/80 transition-colors group cursor-pointer"
                        onClick={() => handleLoadBuild(build)}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={cls ? classIconUrl(cls.id) : ""}
                          alt=""
                          className="w-6 h-6 shrink-0"
                          style={{ imageRendering: "pixelated" }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-[var(--ro-text)] truncate">{build.name}</div>
                          <div className="text-[10px] text-ro-muted flex items-center gap-2">
                            <span style={{ color: clsColor }}>{build.className}</span>
                            <span>Lv{build.baseLevel}/{build.jobLevel}</span>
                            <span>{new Date(build.savedAt).toLocaleDateString("pt-BR")}</span>
                          </div>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleExportBuild(build); }}
                          className="opacity-0 group-hover:opacity-100 text-ro-muted hover:text-element-water transition-all text-[10px] px-1"
                          title="Exportar build"
                        >
                          ↓
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteBuild(build.id); }}
                          className="opacity-0 group-hover:opacity-100 text-ro-muted hover:text-red-400 transition-all text-xs px-1"
                          title="Excluir"
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="p-3 border-t border-ro-border flex justify-between">
              <button
                onClick={handleImportBuild}
                className="px-3 py-1.5 text-xs rounded-lg border border-element-water/30 text-element-water hover:bg-element-water/10 transition-colors"
              >
                ↑ Importar .json
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleFileImport}
              />
              <button
                onClick={() => setShowLoadModal(false)}
                className="px-3 py-1.5 text-xs text-ro-muted hover:text-[var(--ro-text)] transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

// ─── ALT+Q Slot (game-style equipment slot) ─────────────────────────

function AltQSlot({
  slotId,
  equipment,
  align,
  onSearch,
  onUnequip,
  onRefineChange,
  onCardSearch,
  onCardUnequip,
  onEnchantSearch,
  onEnchantUnequip,
  onItemClick,
}: {
  slotId: EquipSlot;
  equipment: Partial<Record<EquipSlot, EquippedItem | null>>;
  align: "left" | "right";
  onSearch: () => void;
  onUnequip: () => void;
  onRefineChange: (r: number) => void;
  onCardSearch?: (cardIndex: number) => void;
  onCardUnequip?: (cardIndex: number) => void;
  onEnchantSearch?: (enchantIndex: number) => void;
  onEnchantUnequip?: (enchantIndex: number) => void;
  onItemClick?: (item: { id: number; nameEn: string; namePt?: string; description?: string[]; script?: string; attack?: number; magicAttack?: number; defense?: number; mdef?: number; slots?: number; type?: string; subType?: string; refine?: number }, el: HTMLElement) => void;
}) {
  const equipped = equipment[slotId];
  const slotDef = EQUIP_SLOTS.find((s) => s.id === slotId);
  if (!slotDef) return null;
  const isBlocked = !!equipped?._blockedBy;

  // All slots: icon left → name → cards/enchants below
  // Left column (align=right): pushed right near character via ml-auto
  const pushRight = align === "right";
  const hoverSide = pushRight ? "left-0.5" : "right-0.5";

  if (!equipped) {
    // Empty slot — "+" button with slot label
    // Left column: "Label +" (label far, + near character)
    // Right column: "+ Label" (+ near character, label far)
    return (
      <button
        onClick={onSearch}
        className={`group flex items-center gap-1.5 px-2 py-2.5 hover:bg-ro-surface/60 transition-colors w-full ${pushRight ? "flex-row-reverse" : ""}`}
      >
        <span className="w-6 h-6 rounded border border-dashed border-ro-muted/30 flex items-center justify-center text-[10px] text-ro-muted/40 group-hover:border-ro-gold/40 group-hover:text-ro-gold/60 transition-colors flex-shrink-0">+</span>
        <span className="text-[10px] text-ro-muted/40 group-hover:text-ro-muted/70 transition-colors truncate">{slotDef.label}</span>
      </button>
    );
  }

  // Blocked slot — secondary slot of a multi-slot item (e.g. shield slot when 2h weapon equipped)
  if (isBlocked) {
    return (
      <div className={`group relative w-full ${pushRight ? "flex justify-end" : ""}`}>
        <div className={`flex items-center gap-1.5 px-2 py-2.5 opacity-50 ${pushRight ? "flex-row-reverse" : ""}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={itemImageUrl(equipped.id)} alt="" className="w-6 h-6 object-contain flex-shrink-0 grayscale"
            onError={(e) => { (e.target as HTMLImageElement).style.visibility = "hidden"; }} />
          <span className="text-[10px] text-ro-muted/60 leading-tight break-words line-clamp-2">
            {equipped.namePt || equipped.nameEn}
          </span>
        </div>
        {/* Unequip still available */}
        <div className={`absolute top-0 ${hoverSide} h-full flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10`}>
          <button
            onClick={(e) => { e.stopPropagation(); onUnequip(); }}
            className="w-5 h-5 rounded bg-red-600/80 text-white text-[10px] flex items-center justify-center hover:bg-red-500 shadow"
            title="Desequipar"
          >
            ×
          </button>
        </div>
      </div>
    );
  }

  // Equipped slot — item icon + name + card slots + hover actions
  return (
    <div className={`group relative w-full ${pushRight ? "flex justify-end" : ""}`}>
      <button
        onClick={(e) => {
          if (onItemClick) {
            onItemClick(
              { id: equipped.id, nameEn: equipped.nameEn, namePt: equipped.namePt, description: equipped.description, script: equipped.script, attack: equipped.attack, magicAttack: equipped.magicAttack, defense: equipped.defense, mdef: equipped.mdef, slots: equipped.slots, type: equipped.type, subType: equipped.subType, refine: equipped.refine },
              e.currentTarget
            );
          } else {
            onSearch();
          }
        }}
        className={`flex items-start gap-1.5 px-2 py-1.5 hover:bg-ro-gold/[0.06] transition-colors ${pushRight ? "flex-row-reverse" : ""}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={itemImageUrl(equipped.id)} alt="" className="w-6 h-6 object-contain flex-shrink-0 mt-0.5"
          onError={(e) => { (e.target as HTMLImageElement).style.visibility = "hidden"; }} />
        <div className={`min-w-0 flex-1 ${pushRight ? "text-right" : ""}`}>
          {/* Equipment name with card affix (Bi/Tri/Quad for duplicates) */}
          <span className="text-[11px] text-[var(--ro-text)] leading-tight block break-words line-clamp-2">
            {equipped.refine > 0 && <span className="text-ro-gold">+{equipped.refine} </span>}
            {equipped.namePt || equipped.nameEn}
            {(() => {
              const equippedCards = equipped.cards.filter(Boolean);
              if (equippedCards.length > 0) {
                // Group identical cards by ID → Bi/Tri/Quad prefix
                const MULTI: Record<number, string> = { 2: "Bi", 3: "Tri", 4: "Quad" };
                const groups = new Map<number, { card: typeof equippedCards[0]; count: number }>();
                for (const c of equippedCards) {
                  const g = groups.get(c!.id);
                  if (g) g.count++; else groups.set(c!.id, { card: c, count: 1 });
                }
                const parts: string[] = [];
                for (const { card, count } of groups.values()) {
                  const name = card!.affix?.text
                    || (card!.namePt || card!.nameEn).replace(/^Carta\s+/i, "").replace(/\s+Card$/i, "");
                  parts.push(count > 1 ? `${MULTI[count] || count + "x"} ${name}` : name);
                }
                return <span className="text-purple-400"> {parts.join(" ")}</span>;
              }
              if (equipped.slots > 0) return <span className="text-ro-muted/50"> [{equipped.slots}]</span>;
              return null;
            })()}
          </span>
          {/* Card slots row */}
          {equipped.slots > 0 && onCardSearch && (
            <div className={`flex items-center gap-0.5 mt-0.5 flex-wrap ${pushRight ? "justify-end" : ""}`}>
              {equipped.cards.map((card, idx) => (
                <button
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (card && onItemClick) {
                      onItemClick(
                        { id: card.id, nameEn: card.nameEn, namePt: card.namePt, description: card.description, script: card.script },
                        e.currentTarget
                      );
                    } else if (!card) {
                      onCardSearch(idx);
                    }
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault(); e.stopPropagation();
                    if (card && onCardUnequip) onCardUnequip(idx);
                  }}
                  className={`px-1 py-px rounded text-[9px] leading-snug border transition-colors ${card
                    ? "bg-purple-950/80 border-purple-400/50 text-purple-300 hover:bg-purple-900/80 hover:border-purple-300/60"
                    : "bg-ro-darker/80 border-ro-border/50 text-ro-muted/60 hover:border-purple-500/40 hover:text-purple-400/80"
                    }`}
                  title={card ? `${card.namePt || card.nameEn} (clique = ver | botão direito = remover)` : "Adicionar carta"}
                >
                  {card ? (card.namePt || card.nameEn).replace(/^Carta\s+/i, "").substring(0, 14) : "◇"}
                </button>
              ))}
            </div>
          )}
          {/* Enchantment slots row */}
          {onEnchantSearch && (() => {
            const enchants = equipped.enchants || [];
            const filled = enchants.filter(Boolean);
            const nextIdx = enchants.findIndex((e) => e === null);
            const canAdd = filled.length < 4;
            if (filled.length === 0 && canAdd) {
              return (
                <div className={`flex items-center gap-0.5 mt-0.5 ${pushRight ? "justify-end" : ""}`}>
                  <button
                    onClick={(e) => { e.stopPropagation(); onEnchantSearch(0); }}
                    className="px-1 py-px rounded text-[8px] leading-snug border bg-ro-darker/60 border-ro-border/30 text-ro-muted/40 hover:border-teal-500/40 hover:text-teal-400/60 transition-colors"
                    title="Adicionar encantamento"
                  >✦</button>
                </div>
              );
            }
            return (
              <div className={`flex items-center gap-0.5 mt-0.5 flex-wrap ${pushRight ? "justify-end" : ""}`}>
                {enchants.map((ench, idx) => ench ? (
                  <EnchantChip
                    key={`e${idx}`}
                    enchant={ench}
                    onDelete={() => { if (onEnchantUnequip) onEnchantUnequip(idx); }}
                  />
                ) : null)}
                {canAdd && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onEnchantSearch(nextIdx >= 0 ? nextIdx : filled.length); }}
                    className="px-1 py-px rounded text-[8px] leading-snug border bg-ro-darker/60 border-ro-border/30 text-ro-muted/40 hover:border-teal-500/40 hover:text-teal-400/60 transition-colors"
                    title="Adicionar encantamento"
                  >✦</button>
                )}
              </div>
            );
          })()}
        </div>
      </button>

      {/* Hover actions — only covers the name row, not cards/enchants */}
      <div className={`absolute top-0.5 ${hoverSide} flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10`}>
        {equipped.refineable && (
          <select
            value={equipped.refine}
            onChange={(e) => { e.stopPropagation(); onRefineChange(parseInt(e.target.value)); }}
            onClick={(e) => e.stopPropagation()}
            className="h-5 w-10 text-[9px] bg-ro-darker border border-ro-border rounded text-ro-gold text-center appearance-none cursor-pointer"
          >
            {Array.from({ length: 21 }, (_, i) => (
              <option key={i} value={i}>+{i}</option>
            ))}
          </select>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onSearch(); }}
          className="w-5 h-5 rounded bg-ro-surface border border-ro-border text-ro-muted text-[10px] flex items-center justify-center hover:bg-ro-panel hover:text-ro-gold shadow"
          title="Trocar item"
        >
          ↻
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onUnequip(); }}
          className="w-5 h-5 rounded bg-red-600/80 text-white text-[10px] flex items-center justify-center hover:bg-red-500 shadow"
          title="Desequipar"
        >
          ×
        </button>
      </div>
    </div>
  );
}


function BonusRow({ label, value, invertColor }: { label: string; value: number; invertColor?: boolean }) {
  if (value === 0) return (
    <div className="flex justify-between">
      <span className="text-ro-muted/40">{label}</span>
      <span className="font-mono text-ro-muted/30">0</span>
    </div>
  );
  // For reduction stats (cast time, delay), negative values are GOOD (green)
  const isGood = invertColor ? value < 0 : value > 0;
  return (
    <div className="flex justify-between">
      <span className="text-ro-muted">{label}</span>
      <span className={`font-mono font-medium ${isGood ? "text-green-400" : "text-red-400"}`}>
        {value > 0 ? `+${value}%` : `${value}%`}
      </span>
    </div>
  );
}

// ─── Stat Input (clean field on focus, commit on blur) ──────────────

function StatInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  return (
    <input
      type="text"
      inputMode="numeric"
      value={editing ? draft : value}
      onFocus={(e) => {
        setEditing(true);
        setDraft("");
        // defer select to next tick so empty string is set first
        setTimeout(() => e.target.select(), 0);
      }}
      onChange={(e) => {
        const raw = e.target.value.replace(/\D/g, "");
        setDraft(raw);
      }}
      onBlur={() => {
        setEditing(false);
        const v = parseInt(draft);
        if (!isNaN(v) && v >= 1) onChange(v);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          (e.target as HTMLInputElement).blur();
        }
      }}
      className="w-9 bg-ro-surface border border-ro-border rounded px-0.5 py-0 text-[10px] text-[var(--ro-text)] text-center font-mono"
    />
  );
}

// ─── Item Search Modal ───────────────────────────────────────────────

function ItemSearchModal({
  slot,
  roClass,
  baseLevel,
  onSelect,
  onClose,
}: {
  slot: EquipSlot;
  roClass: RoClass;
  baseLevel: number;
  onSelect: (item: SearchItem, refine: number) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedRefine, setSelectedRefine] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const slotDef = EQUIP_SLOTS.find((s) => s.id === slot);
  const locationFilters = getLocationFilters(slot);
  const isWeaponSlot = slot === "right_hand";

  // Stabilize references to avoid re-creating search on every render
  const locationStr = locationFilters.join(",");
  const jobStr = roClass.jobNames.join(",");
  const weaponsRef = useRef(roClass.weapons);
  weaponsRef.current = roClass.weapons;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setTotal(0);
      setLoading(false);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await searchItems({ query, location: locationStr, job: jobStr, limit: 60 });
        if (cancelled) return;
        let items: SearchItem[] = (data.items || []) as SearchItem[];
        // Only show equippable items — exclude cards, consumables, etc.
        const equipTypes = new Set(["Armor", "Weapon", "ShadowGear", "Shadowgear"]);
        items = items.filter((i) => equipTypes.has(i.type || ""));
        if (isWeaponSlot) {
          items = items.filter((i) =>
            i.type !== "Weapon" || weaponsRef.current.includes(i.subType || "")
          );
        }
        items = items.filter((i) => !i.equipLevelMin || i.equipLevelMin <= baseLevel);
        setResults(items);
        setTotal(items.length);
      } catch {
        if (!cancelled) setResults([]);
      }
      if (!cancelled) setLoading(false);
    }, 300);
    return () => { cancelled = true; clearTimeout(t); };
  }, [query, locationStr, jobStr, isWeaponSlot, baseLevel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      style={{ background: "var(--ro-modal-bg)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="ro-panel-gold w-full max-w-lg max-h-[80vh] flex flex-col animate-slide-up">
        <div className="px-4 py-3 border-b border-ro-border flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-[var(--ro-text)] text-sm">
              {slotDef?.icon} {slotDef?.label || slot}
            </h3>
            <p className="text-[10px] text-ro-muted">{total > 0 ? `${total} resultados` : `Buscar itens para ${roClass.name}`}</p>
          </div>
          <button onClick={onClose} className="text-ro-muted hover:text-[var(--ro-text)]">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-4 py-2 border-b border-ro-border flex gap-2">
          <input ref={inputRef} type="text" value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar item por nome ou ID..."
            className="flex-1 bg-ro-surface border border-ro-border rounded-lg px-3 py-2 text-sm text-[var(--ro-text)] placeholder:text-ro-muted"
          />
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-ro-muted">+</span>
            <select value={selectedRefine} onChange={(e) => setSelectedRefine(parseInt(e.target.value))}
              className="w-12 bg-ro-surface border border-ro-border rounded-lg px-1 py-2 text-xs text-ro-gold text-center">
              {Array.from({ length: 21 }, (_, i) => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-1">
          {loading && <div className="text-center text-ro-muted text-xs py-8">Buscando...</div>}
          {!loading && query.length < 2 && (
            <div className="text-center text-ro-muted text-xs py-8">Digite pelo menos 2 letras para buscar...</div>
          )}
          {!loading && query.length >= 2 && results.length === 0 && (
            <div className="text-center text-ro-muted text-xs py-8">Nenhum item encontrado.</div>
          )}
          {results.map((item) => (
            <button key={item.id} onClick={() => onSelect(item, selectedRefine)}
              className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-ro-panel transition-colors">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={itemImageUrl(item.id)} alt="" className="w-8 h-8 object-contain flex-shrink-0"
                onError={(e) => { (e.target as HTMLImageElement).style.visibility = "hidden"; }} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-[var(--ro-text)] truncate">{item.namePt || item.nameEn}</div>
                <div className="text-[10px] text-ro-muted flex gap-2 flex-wrap">
                  <span>#{item.id}</span>
                  {item.attack != null && item.attack > 0 && <span className="text-element-fire">ATK {item.attack}</span>}
                  {item.magicAttack != null && item.magicAttack > 0 && <span className="text-element-water">MATK {item.magicAttack}</span>}
                  {item.defense != null && item.defense > 0 && <span>DEF {item.defense}</span>}
                  {item.slots > 0 && <span className="text-ro-gold">[{item.slots}]</span>}
                  {item.weaponLevel && <span>Nv.Arma {item.weaponLevel}</span>}
                  {item.equipLevelMin && item.equipLevelMin > 0 && <span className="text-yellow-500/80">Lv.{item.equipLevelMin}</span>}
                  {item.subType && <span className="text-ro-muted/60">{item.subType}</span>}
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="px-4 py-2 border-t border-ro-border text-right">
          <button onClick={onClose} className="text-xs text-ro-muted hover:text-[var(--ro-text)]">Cancelar</button>
        </div>
      </div>
    </div>
  );
}

// ─── Card Search Modal ───────────────────────────────────────────────

interface CardResult {
  id: number;
  nameEn: string;
  namePt?: string;
  script?: string;
  locations: string[];
  description?: string[];
  affix?: { text: string; type: "prefix" | "suffix" };
}

function CardSearchModal({
  equipSlot,
  onSelect,
  onClose,
}: {
  equipSlot: EquipSlot;
  onSelect: (card: CardItem) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CardResult[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); setTotal(0); setLoading(false); return; }
    setLoading(true);
    try {
      const data = await searchItems({ query: q, type: "Card", limit: 80 });
      // Filter cards by compatibility with the equipment slot
      const all: CardResult[] = (data.items || []) as CardResult[];
      const compatible = all.filter((c) => isCardCompatibleWithSlot(c.locations, equipSlot));
      setResults(compatible);
      setTotal(compatible.length);
    } catch {
      setResults([]);
    }
    setLoading(false);
  }, [equipSlot]);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    if (query.length < 2) { setResults([]); setTotal(0); setLoading(false); return; }
    const t = setTimeout(() => { setLoading(true); search(query); }, 300);
    return () => clearTimeout(t);
  }, [query, search]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      style={{ background: "var(--ro-modal-bg)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="ro-panel-gold w-full max-w-md max-h-[70vh] flex flex-col animate-slide-up">
        <div className="px-4 py-3 border-b border-ro-border flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-purple-300 text-sm">Adicionar Carta</h3>
            <p className="text-[10px] text-ro-muted">{total > 0 ? `${total} cartas` : "Buscar carta por nome"}</p>
          </div>
          <button onClick={onClose} className="text-ro-muted hover:text-[var(--ro-text)]">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-4 py-2 border-b border-ro-border">
          <input ref={inputRef} type="text" value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar carta..."
            className="w-full bg-ro-surface border border-ro-border rounded-lg px-3 py-2 text-sm text-[var(--ro-text)] placeholder:text-ro-muted"
          />
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-1">
          {loading && <div className="text-center text-ro-muted text-xs py-8">Buscando...</div>}
          {!loading && query.length < 2 && (
            <div className="text-center text-ro-muted text-xs py-8">Digite pelo menos 2 letras...</div>
          )}
          {!loading && query.length >= 2 && results.length === 0 && (
            <div className="text-center text-ro-muted text-xs py-8">Nenhuma carta encontrada.</div>
          )}
          {results.map((card) => (
            <button key={card.id} onClick={() => onSelect({ id: card.id, nameEn: card.nameEn, namePt: card.namePt, script: card.script, locations: card.locations, description: card.description, affix: card.affix })}
              className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-purple-900/20 transition-colors">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={itemImageUrl(card.id)} alt="" className="w-6 h-6 object-contain flex-shrink-0"
                onError={(e) => { (e.target as HTMLImageElement).style.visibility = "hidden"; }} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-purple-200 truncate">{card.namePt || card.nameEn}</div>
                <div className="text-[9px] text-ro-muted">#{card.id}</div>
              </div>
            </button>
          ))}
        </div>

        <div className="px-4 py-2 border-t border-ro-border text-right">
          <button onClick={onClose} className="text-xs text-ro-muted hover:text-[var(--ro-text)]">Cancelar</button>
        </div>
      </div>
    </div>
  );
}

// ─── Enchant Chip (click = info popup, X = delete) ─────────────────────

function EnchantChip({ enchant, onDelete }: { enchant: CardItem; onDelete: () => void }) {
  const [popupRect, setPopupRect] = useState<DOMRect | null>(null);
  const [popupPos, setPopupPos] = useState<{ top: number; left: number } | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  // Compute fixed position after popup mounts
  useEffect(() => {
    if (!popupRect || !popupRef.current) return;
    const el = popupRef.current;
    const pw = el.offsetWidth;
    const ph = el.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Try above the chip, aligned to its left
    let left = popupRect.left;
    let top = popupRect.top - ph - 6;

    // If overflows right, shift left
    if (left + pw > vw - 8) left = vw - pw - 8;
    // If overflows above, show below
    if (top < 8) top = popupRect.bottom + 6;
    // Clamp
    left = Math.max(8, left);
    top = Math.max(8, Math.min(top, vh - ph - 8));

    setPopupPos({ top, left });
  }, [popupRect]);

  // Close popup on outside click or Escape
  useEffect(() => {
    if (!popupRect) return;
    function handleClick(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setPopupRect(null); setPopupPos(null);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") { setPopupRect(null); setPopupPos(null); }
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [popupRect]);

  const descLines = enchant.description?.length
    ? parseRODescription(enchant.description)
    : [];

  const showPopup = !!popupRect;

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (showPopup) { setPopupRect(null); setPopupPos(null); }
          else setPopupRect(e.currentTarget.getBoundingClientRect());
        }}
        className="px-1 py-px rounded text-[8px] leading-snug border bg-teal-950/80 border-teal-400/50 text-teal-300 hover:bg-teal-900/80 hover:border-teal-300/60 transition-colors"
        title={enchant.namePt || enchant.nameEn}
      >
        {(enchant.namePt || enchant.nameEn).substring(0, 12)}
      </button>

      {showPopup && (
        <>
          {/* Invisible backdrop to catch outside clicks */}
          <div className="fixed inset-0 z-[58]" onClick={() => { setPopupRect(null); setPopupPos(null); }} />
          <div
            ref={popupRef}
            className="fixed z-[59] bg-ro-panel border border-ro-border rounded-lg shadow-xl p-3 min-w-[200px] max-w-[280px]"
            style={popupPos ? { top: popupPos.top, left: popupPos.left } : { top: (popupRect?.top ?? 0) - 200, left: popupRect?.left ?? 0, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
          {/* Header with name + delete button */}
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-1.5 min-w-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={itemImageUrl(enchant.id)}
                alt=""
                className="w-5 h-5 object-contain flex-shrink-0"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
              <span className="text-xs font-bold text-teal-300 truncate">
                {enchant.namePt || enchant.nameEn}
              </span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
                setPopupRect(null); setPopupPos(null);
              }}
              className="flex-shrink-0 w-4 h-4 rounded flex items-center justify-center text-[10px] bg-red-900/50 border border-red-500/40 text-red-400 hover:bg-red-800/60 hover:text-red-300 transition-colors"
              title="Remover encantamento"
            >
              ✕
            </button>
          </div>

          {/* Description */}
          {descLines.length > 0 && (
            <div className="text-[10px] leading-relaxed">
              {descLines.map((segments, i) => (
                <div key={i}>
                  {segments.map((seg, j) => (
                    <span
                      key={j}
                      style={seg.color ? { color: seg.color } : undefined}
                      className={seg.color ? undefined : "text-[var(--ro-text-soft)]"}
                    >
                      {seg.text}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Script fallback if no description */}
          {descLines.length === 0 && enchant.script && (
            <pre className="text-[10px] text-green-400/80 whitespace-pre-wrap font-mono">
              {enchant.script}
            </pre>
          )}

          <div className="text-[9px] text-ro-muted mt-1.5">ID: {enchant.id}</div>
        </div>
        </>
      )}
    </div>
  );
}

// ─── Enchant Search Modal ─────────────────────────────────────────────

function EnchantSearchModal({
  onSelect,
  onClose,
}: {
  onSelect: (enchant: CardItem) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CardResult[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); setTotal(0); setLoading(false); return; }
    setLoading(true);
    try {
      const data = await searchItems({ query: q, type: "Card", limit: 80 });
      const all: CardResult[] = (data.items || []) as CardResult[];
      const enchants = all.filter((c: CardResult) => !c.locations || c.locations.length === 0);
      setResults(enchants);
      setTotal(enchants.length);
    } catch {
      setResults([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    if (query.length < 2) { setResults([]); setTotal(0); setLoading(false); return; }
    const t = setTimeout(() => { setLoading(true); search(query); }, 300);
    return () => clearTimeout(t);
  }, [query, search]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      style={{ background: "var(--ro-modal-bg)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="ro-panel-gold w-full max-w-md max-h-[70vh] flex flex-col animate-slide-up">
        <div className="px-4 py-3 border-b border-ro-border flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-teal-300 text-sm">Adicionar Encantamento</h3>
            <p className="text-[10px] text-ro-muted">{total > 0 ? `${total} encantamentos` : "Buscar encantamento por nome"}</p>
          </div>
          <button onClick={onClose} className="text-ro-muted hover:text-[var(--ro-text)]">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-4 py-2 border-b border-ro-border">
          <input ref={inputRef} type="text" value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar encantamento (Sharp, Fighting Spirit...)"
            className="w-full bg-ro-surface border border-ro-border rounded-lg px-3 py-2 text-sm text-[var(--ro-text)] placeholder:text-ro-muted"
          />
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-1">
          {loading && <div className="text-center text-ro-muted text-xs py-8">Buscando...</div>}
          {!loading && query.length < 2 && (
            <div className="text-center text-ro-muted text-xs py-8">Digite pelo menos 2 letras...</div>
          )}
          {!loading && query.length >= 2 && results.length === 0 && (
            <div className="text-center text-ro-muted text-xs py-8">Nenhum encantamento encontrado.</div>
          )}
          {results.map((ench) => (
            <button key={ench.id} onClick={() => onSelect({ id: ench.id, nameEn: ench.nameEn, namePt: ench.namePt, script: ench.script, locations: ench.locations, description: ench.description })}
              className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-teal-900/20 transition-colors">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={itemImageUrl(ench.id)} alt="" className="w-6 h-6 object-contain flex-shrink-0"
                onError={(e) => { (e.target as HTMLImageElement).style.visibility = "hidden"; }} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-teal-200 truncate">{ench.namePt || ench.nameEn}</div>
                <div className="text-[9px] text-ro-muted">#{ench.id}</div>
              </div>
            </button>
          ))}
        </div>

        <div className="px-4 py-2 border-t border-ro-border text-right">
          <button onClick={onClose} className="text-xs text-ro-muted hover:text-[var(--ro-text)]">Cancelar</button>
        </div>
      </div>
    </div>
  );
}

// ─── Item Tooltip Card (RO-style popup) ─────────────────────────────

function ItemTooltipCard({
  item,
  anchorRect,
  onClose,
}: {
  item: { id: number; nameEn: string; namePt?: string; description?: string[]; script?: string; attack?: number; magicAttack?: number; defense?: number; mdef?: number; slots?: number; type?: string; subType?: string; refine?: number };
  anchorRect: DOMRect;
  onClose: () => void;
}) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  // Position the tooltip relative to the anchor element
  useEffect(() => {
    const el = tooltipRef.current;
    if (!el) return;
    const tooltipW = el.offsetWidth;
    const tooltipH = el.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Try to position to the right of the anchor, centered vertically
    let left = anchorRect.right + 8;
    let top = anchorRect.top + anchorRect.height / 2 - tooltipH / 2;

    // If overflows right, position to the left
    if (left + tooltipW > vw - 8) {
      left = anchorRect.left - tooltipW - 8;
    }
    // If still overflows left, center horizontally
    if (left < 8) {
      left = Math.max(8, (vw - tooltipW) / 2);
    }
    // Clamp vertically
    top = Math.max(8, Math.min(top, vh - tooltipH - 8));

    setPos({ top, left });
  }, [anchorRect]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const descLines = parseRODescription(item.description || []);
  const hasDesc = descLines.length > 0 && item.description && item.description.length > 0;
  const hasStats = (item.attack && item.attack > 0) || (item.magicAttack && item.magicAttack > 0) || (item.defense && item.defense > 0) || (item.mdef && item.mdef > 0);

  return (
    <>
      {/* Backdrop — click to close */}
      <div className="fixed inset-0 z-[60]" onClick={onClose} />

      {/* Tooltip card */}
      <div
        ref={tooltipRef}
        className="fixed z-[61] animate-fade-in"
        style={{ top: pos.top, left: pos.left, maxWidth: 320 }}
      >
        <div className="ro-panel-gold rounded-lg overflow-hidden shadow-xl" style={{ maxHeight: 420 }}>
          <div className="overflow-y-auto" style={{ maxHeight: 420 }}>
            {/* Header */}
            <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-ro-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={itemImageUrl(item.id)}
                alt=""
                className="w-8 h-8 object-contain flex-shrink-0"
                onError={(e) => { (e.target as HTMLImageElement).style.visibility = "hidden"; }}
              />
              <div className="min-w-0">
                <div className="text-sm font-semibold text-ro-gold leading-tight truncate">
                  {item.refine != null && item.refine > 0 && <span>+{item.refine} </span>}
                  {item.namePt || item.nameEn}
                </div>
                {item.namePt && item.nameEn && item.namePt !== item.nameEn && (
                  <div className="text-[10px] text-ro-muted truncate">{item.nameEn}</div>
                )}
                <div className="text-[9px] text-ro-muted/60">#{item.id}</div>
              </div>
            </div>

            {/* Quick stats */}
            {hasStats && (
              <div className="flex flex-wrap gap-1.5 px-3 py-2 border-b border-ro-border/50">
                {item.attack != null && item.attack > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-950/50 text-red-300 border border-red-900/40">ATK {item.attack}</span>
                )}
                {item.magicAttack != null && item.magicAttack > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-950/50 text-purple-300 border border-purple-900/40">MATK {item.magicAttack}</span>
                )}
                {item.defense != null && item.defense > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-950/50 text-blue-300 border border-blue-900/40">DEF {item.defense}</span>
                )}
                {item.mdef != null && item.mdef > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950/50 text-cyan-300 border border-cyan-900/40">MDEF {item.mdef}</span>
                )}
                {item.slots != null && item.slots > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-ro-gold/10 text-ro-gold border border-ro-gold/20">[{item.slots}]</span>
                )}
              </div>
            )}

            {/* Colored LATAM description */}
            {hasDesc && (
              <div className="px-3 py-2 border-b border-ro-border/50">
                {descLines.map((segments, i) => (
                  <div key={i} className="text-[11px] leading-relaxed">
                    {segments.map((seg, j) => (
                      <span
                        key={j}
                        style={seg.color ? { color: seg.color } : undefined}
                        className={seg.color ? undefined : "text-[var(--ro-text-soft)]"}
                      >
                        {seg.text}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {/* Raw script */}
            {item.script && (
              <div className="px-3 py-2">
                <div className="text-[8px] uppercase tracking-widest text-ro-gold-dim mb-1 font-medium">Script</div>
                <pre className="text-[10px] whitespace-pre-wrap font-mono leading-relaxed" style={{ color: "#4aba6e" }}>
                  {item.script}
                </pre>
              </div>
            )}

            {/* Fallback if no description or script */}
            {!hasDesc && !item.script && (
              <div className="px-3 py-3 text-center text-xs text-ro-muted/60">
                Sem descrição disponível
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
