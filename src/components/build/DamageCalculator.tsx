"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { RoClass } from "@/lib/ro-classes";
import type { BaseStats, EquipBonus, BuildConfig, DerivedStats } from "@/lib/ro-stats";
import { getSkillsForJobs, type SkillFormula, getHitCount, getDamagePercent } from "@/lib/ro-skill-formulas";
import { calculateDamage, formatDamage, formatDps, type MonsterTarget, type DamageResult } from "@/lib/ro-damage";
import { searchMonsters } from "@/lib/db/supabase";

interface DamageCalculatorProps {
  buildConfig: BuildConfig;
  derivedStats: DerivedStats;
  selectedClass: RoClass | null;
}

interface MonsterSearchResult {
  id: number;
  name: string;
  namePt: string;
  level: number;
  hp: number;
  defense: number;
  magicDefense: number;
  stats: { str: number; agi: number; vit: number; int: number; dex: number; luk: number };
  size: string;
  race: string;
  element: string;
  elementLevel: number;
  class: string;
}

// ─── Labels ─────────────────────────────────────────────────────────

const RACE_PT: Record<string, string> = {
  RC_Formless: "Amorfo", RC_Undead: "Morto-Vivo", RC_Brute: "Bruto",
  RC_Plant: "Planta", RC_Insect: "Inseto", RC_Fish: "Peixe",
  RC_Demon: "Demônio", RC_DemiHuman: "Humanoide", RC_Angel: "Anjo",
  RC_Dragon: "Dragão",
};
const ELE_PT: Record<string, string> = {
  Ele_Neutral: "Neutro", Ele_Water: "Água", Ele_Earth: "Terra",
  Ele_Fire: "Fogo", Ele_Wind: "Vento", Ele_Poison: "Veneno",
  Ele_Holy: "Sagrado", Ele_Dark: "Sombrio", Ele_Ghost: "Fantasma",
  Ele_Undead: "Morto-Vivo",
};
const SIZE_PT: Record<string, string> = {
  Size_Small: "Pequeno", Size_Medium: "Médio", Size_Large: "Grande",
};
const CLASS_PT: Record<string, string> = {
  Class_Normal: "Normal", Class_Boss: "Chefe",
};

function formatHP(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return Math.floor(n / 1_000) + "k";
  return String(n);
}

// API returns unprefixed names; bonus system uses prefixed names
function prefixRace(r: string): string { return r.startsWith("RC_") ? r : `RC_${r}`; }
function prefixEle(e: string): string { return e.startsWith("Ele_") ? e : `Ele_${e}`; }
function prefixSize(s: string): string { return s.startsWith("Size_") ? s : `Size_${s}`; }
function prefixClass(c: string): string { return c.startsWith("Class_") ? c : `Class_${c}`; }

// Sprite/icon URLs from Divine Pride CDN
function getMonsterSpriteUrl(id: number): string {
  return `https://static.divine-pride.net/images/mobs/png/${id}.png`;
}
function getSkillIconUrl(id: number): string {
  return `https://static.divine-pride.net/images/skill/${id}.png`;
}

// ─── Component ──────────────────────────────────────────────────────

// Mapping weapon elements to their corresponding Endow spell / item icons
const ELEMENT_ICONS: Record<string, string> = {
  Ele_Fire: "https://static.divine-pride.net/images/skill/280.png",
  Ele_Water: "https://static.divine-pride.net/images/skill/281.png",
  Ele_Wind: "https://static.divine-pride.net/images/skill/282.png",
  Ele_Earth: "https://static.divine-pride.net/images/skill/283.png",
  Ele_Poison: "https://static.divine-pride.net/images/skill/137.png",
  Ele_Holy: "https://static.divine-pride.net/images/skill/68.png",
  Ele_Dark: "https://static.divine-pride.net/images/items/item/3143.png", // Cursed Water
};

export default function DamageCalculator({ derivedStats, buildConfig, selectedClass }: DamageCalculatorProps) {
  const [monster, setMonster] = useState<MonsterSearchResult | null>(null);
  const [monsterQuery, setMonsterQuery] = useState("");
  const [monsterResults, setMonsterResults] = useState<MonsterSearchResult[]>([]);
  const [showMonsterDropdown, setShowMonsterDropdown] = useState(false);

  const [selectedSkill, setSelectedSkill] = useState<SkillFormula | null>(null);
  const [skillLevel, setSkillLevel] = useState(1);
  const [showDetails, setShowDetails] = useState(false);
  const [weaponElement, setWeaponElement] = useState("Ele_Neutral");

  const [damageResult, setDamageResult] = useState<DamageResult | null>(null);

  const monsterInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Available skills for current class
  const availableSkills = selectedClass
    ? getSkillsForJobs(selectedClass.jobNames)
    : [];

  // Auto-select first skill when class changes
  useEffect(() => {
    if (availableSkills.length > 0 && !selectedSkill) {
      setSelectedSkill(availableSkills[0]);
      setSkillLevel(1);
    }
  }, [selectedClass?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Monster search debounce
  useEffect(() => {
    if (!monsterQuery || monsterQuery.length < 2) {
      setMonsterResults([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const { monsters } = await searchMonsters({ query: monsterQuery, limit: 12 });
        setMonsterResults(monsters as MonsterSearchResult[]);
      } catch { /* ignore */ }
    }, 250);
    return () => clearTimeout(t);
  }, [monsterQuery]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowMonsterDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Recalculate damage when inputs change
  useEffect(() => {
    if (!monster || !selectedSkill) {
      setDamageResult(null);
      return;
    }

    const target: MonsterTarget = {
      id: monster.id,
      name: monster.name,
      namePt: monster.namePt,
      level: monster.level,
      hp: monster.hp,
      defense: monster.defense,
      magicDefense: monster.magicDefense,
      stats: monster.stats,
      size: prefixSize(monster.size),
      race: prefixRace(monster.race),
      element: prefixEle(monster.element),
      elementLevel: monster.elementLevel,
      class: prefixClass(monster.class),
    };

    const result = calculateDamage({
      baseLevel: buildConfig.baseLevel,
      baseStats: buildConfig.baseStats,
      totalBonus: derivedStats.totalBonus,
      weaponAtk: derivedStats.weaponAtk,
      weaponMatk: derivedStats.weaponMatk,
      weaponLevel: derivedStats.weaponLevel,
      weaponRefine: derivedStats.weaponRefine,
      weaponSubType: derivedStats.weaponSubType,
      weaponWeight: derivedStats.weaponWeight,
      weaponElement: weaponElement,
      aspd: derivedStats.aspd,
      maxHp: derivedStats.maxHp,
      currentHp: derivedStats.maxHp,
      maxSp: derivedStats.maxSp,
      currentSp: derivedStats.maxSp,
      skill: selectedSkill,
      skillLevel,
      monster: target,
      activeBuffs: buildConfig.activeBuffs || [],
    });

    setDamageResult(result);
  }, [monster, selectedSkill, skillLevel, buildConfig, derivedStats, weaponElement]);

  const selectMonster = useCallback((m: MonsterSearchResult) => {
    setMonster(m);
    setMonsterQuery(m.namePt || m.name);
    setShowMonsterDropdown(false);
  }, []);

  const selectSkill = useCallback((sk: SkillFormula) => {
    setSelectedSkill(sk);
    setSkillLevel(Math.min(skillLevel, sk.maxLevel));
  }, [skillLevel]);

  if (!selectedClass) return null;

  return (
    <div className="ro-panel p-4">
      <div className="text-[10px] uppercase tracking-widest text-ro-gold-dim mb-3 font-semibold flex items-center gap-2">
        <span>Calculadora de Dano</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        {/* ─── Monster selector ─── */}
        <div ref={dropdownRef} className="relative">
          <label className="block text-[10px] text-ro-muted uppercase tracking-wider mb-1">Alvo (Monstro)</label>
          <input
            ref={monsterInputRef}
            type="text"
            value={monsterQuery}
            onChange={(e) => { setMonsterQuery(e.target.value); setShowMonsterDropdown(true); }}
            onFocus={() => { if (monsterResults.length > 0) setShowMonsterDropdown(true); }}
            placeholder="Buscar monstro..."
            className="w-full bg-ro-surface border border-ro-border rounded-lg px-3 py-2 text-xs placeholder-ro-muted focus:outline-none focus:border-ro-gold-dim transition-colors"
            style={{ color: "var(--ro-text)" }}
          />
          {showMonsterDropdown && monsterResults.length > 0 && (
            <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-ro-surface border border-ro-border rounded-lg shadow-xl max-h-48 overflow-y-auto">
              {monsterResults.map((m) => (
                <button
                  key={m.id}
                  onClick={() => selectMonster(m)}
                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-ro-gold/[0.08] transition-colors flex items-center gap-2"
                  style={{ color: "var(--ro-text)" }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getMonsterSpriteUrl(m.id)}
                    alt=""
                    className="w-8 h-8 object-contain shrink-0"
                    loading="lazy"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                  <span className="truncate flex-1">{m.namePt || m.name}</span>
                  <span className="text-ro-muted text-[10px] ml-2 shrink-0">Lv{m.level}</span>
                </button>
              ))}
            </div>
          )}
          {/* Monster info card with sprite */}
          {monster && (
            <div className="mt-1.5 flex items-start gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getMonsterSpriteUrl(monster.id)}
                alt={monster.namePt || monster.name}
                className="w-16 h-16 object-contain shrink-0 bg-ro-panel/30 rounded"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
              <div className="text-[10px] text-ro-muted grid grid-cols-2 gap-x-3 gap-y-0.5 flex-1">
                <span>Lv {monster.level} | HP {formatHP(monster.hp)}</span>
                <span>DEF {monster.defense} | MDEF {monster.magicDefense}</span>
                <span>{RACE_PT[prefixRace(monster.race)] || monster.race}</span>
                <span>{ELE_PT[prefixEle(monster.element)] || monster.element} {monster.elementLevel}</span>
                <span>{SIZE_PT[prefixSize(monster.size)] || monster.size}</span>
                <span>{CLASS_PT[prefixClass(monster.class)] || monster.class}</span>
              </div>
            </div>
          )}
        </div>

        {/* ─── Skill selector ─── */}
        <div>
          <label className="block text-[10px] text-ro-muted uppercase tracking-wider mb-1">Skill</label>
          <div className="flex items-center gap-2">
            {selectedSkill && selectedSkill.id > 0 && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={getSkillIconUrl(selectedSkill.id)}
                alt=""
                className="w-7 h-7 object-contain shrink-0"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            )}
            <select
              value={selectedSkill?.aegisName || ""}
              onChange={(e) => {
                const sk = availableSkills.find((s) => s.aegisName === e.target.value);
                if (sk) selectSkill(sk);
              }}
              className="w-full bg-ro-surface border border-ro-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-ro-gold-dim transition-colors appearance-none"
              style={{ color: "var(--ro-text)" }}
            >
              {availableSkills.map((sk) => (
                <option key={sk.aegisName} value={sk.aegisName}>
                  {sk.namePt}
                </option>
              ))}
            </select>
          </div>

          {selectedSkill && (
            <div className="mt-1.5 flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5">
                <label className="text-[10px] text-ro-muted">Lv</label>
                <select
                  value={skillLevel}
                  onChange={(e) => setSkillLevel(parseInt(e.target.value))}
                  className="bg-ro-surface border border-ro-border rounded px-2 py-1 text-xs focus:outline-none focus:border-ro-gold-dim transition-colors appearance-none"
                  style={{ color: "var(--ro-text)" }}
                >
                  {Array.from({ length: selectedSkill.maxLevel }, (_, i) => (
                    <option key={i + 1} value={i + 1}>{i + 1}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-1.5">
                <label className="text-[10px] text-ro-muted">Elem.</label>
                <div className="flex items-center gap-1 bg-ro-surface border border-ro-border rounded px-1.5 py-0.5">
                  {ELEMENT_ICONS[weaponElement] && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={ELEMENT_ICONS[weaponElement]} alt="" className="w-4 h-4 rounded-sm object-contain shrink-0" />
                  )}
                  <select
                    value={weaponElement}
                    onChange={(e) => setWeaponElement(e.target.value)}
                    className="bg-transparent text-xs focus:outline-none appearance-none"
                    style={{ color: "var(--ro-text)" }}
                  >
                    {Object.entries(ELE_PT).map(([key, label]) => (
                      <option key={key} value={key} className="bg-ro-panel">{label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <span className="text-[10px] text-ro-muted">
                {selectedSkill.type === "physical" ? "Físico" : selectedSkill.type === "magical" ? "Mágico" : "Misto"}
                {" | "}
                {selectedSkill.formulaType === "dragonBreath" ? "HP/SP" :
                  selectedSkill.formulaType === "tigerCannon" ? "HP/SP" :
                    `${getDamagePercent(selectedSkill, skillLevel)}% ATK`}
                {selectedSkill.formulaType === "gatesOfHell" ? " +HP/SP" : ""}
                {" | "}
                {getHitCount(selectedSkill, skillLevel)} hit{getHitCount(selectedSkill, skillLevel) > 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ─── Damage Result ─── */}
      {damageResult && (
        <div className="border-t border-ro-border pt-3">
          {/* Main damage numbers */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
            <DmgBox label="Dano Mín" value={damageResult.minDamage} />
            <DmgBox label="Dano Máx" value={damageResult.maxDamage} />
            <DmgBox label="Dano Médio" value={damageResult.avgDamage} highlight />
            {selectedSkill?.canCrit && (
              <DmgBox label="Crítico" value={damageResult.critDamage} crit />
            )}
          </div>

          {/* Per-hit (when multi-hit) and DPS */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-2">
            <div className="bg-ro-panel/50 rounded-lg px-3 py-2">
              <div className="text-[9px] text-ro-muted uppercase">
                {damageResult.hitCount > 1 ? `Por hit (${damageResult.hitCount}×)` : "Total"}
              </div>
              <div className="text-sm font-mono font-bold text-ro-gold">
                {damageResult.hitCount > 1
                  ? formatDamage(Math.floor(damageResult.avgDamage / damageResult.hitCount))
                  : formatDamage(damageResult.avgDamage)}
              </div>
            </div>
            <div className="bg-ro-panel/50 rounded-lg px-3 py-2">
              <div className="text-[9px] text-ro-muted uppercase">DPS</div>
              <div className="text-sm font-mono font-bold" style={{ color: "var(--ro-text)" }}>{formatDps(damageResult.dps)}</div>
            </div>
            <div className="bg-ro-panel/50 rounded-lg px-3 py-2">
              <div className="text-[9px] text-ro-muted uppercase">Ciclo</div>
              <div className="text-sm font-mono font-bold" style={{ color: "var(--ro-text)" }}>{(damageResult.castCycle / 1000).toFixed(1)}s</div>
            </div>
          </div>

          {/* Hits to kill */}
          {monster && (
            <div className="text-[10px] text-ro-muted mb-2">
              Kills em{" "}
              <span className="text-ro-gold font-mono font-bold">
                {Math.ceil(monster.hp / Math.max(1, damageResult.totalAvg))}
              </span>
              {" "}casts ({Math.ceil(monster.hp / Math.max(1, damageResult.totalAvg)) * damageResult.hitCount} hits)
              {" | "}
              Tempo: {((Math.ceil(monster.hp / Math.max(1, damageResult.totalAvg)) * damageResult.castCycle) / 1000).toFixed(1)}s
            </div>
          )}

          {/* Details toggle */}
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-[10px] text-ro-gold-dim hover:text-ro-gold transition-colors"
          >
            {showDetails ? "Ocultar detalhes" : "Mostrar detalhes"}
          </button>

          {showDetails && (
            <div className="mt-2 text-[10px] grid grid-cols-2 gap-x-4 gap-y-1 text-ro-muted bg-ro-panel/30 p-3 rounded-lg border border-ro-border/50">

              <div className="col-span-2 text-ro-gold font-bold border-b border-ro-border/50 pb-1 mb-1 flex items-center gap-2">
                ATK Bruto
              </div>
              <DetailRow label="Status ATK/MATK" value={damageResult.details.statusAtk} />
              <DetailRow label="Weapon ATK/MATK" value={damageResult.details.weaponAtk} />
              <DetailRow label="Equip ATK/MATK" value={damageResult.details.equipAtk} />
              {damageResult.details.sizePenalty < 100 && (
                <DetailRow label="Penal. Tamanho Arma" value={`${damageResult.details.sizePenalty}%`} negative />
              )}
              {damageResult.details.atkRateModifier !== 0 && (
                <DetailRow label="ATK/MATK Rate" value={`+${damageResult.details.atkRateModifier}%`} positive />
              )}

              <div className="col-span-2 text-ro-gold font-bold border-b border-ro-border/50 pb-1 mt-2 mb-1">
                Multiplicadores Raciais/Físicos
              </div>
              {damageResult.details.raceModifier !== 0 && (
                <DetailRow label="vs Raça" value={`+${damageResult.details.raceModifier}%`} positive />
              )}
              {damageResult.details.elementModifier !== 0 && (
                <DetailRow label="vs Elemento" value={`+${damageResult.details.elementModifier}%`} positive />
              )}
              {damageResult.details.sizeModifier !== 0 && (
                <DetailRow label="vs Tamanho" value={`+${damageResult.details.sizeModifier}%`} positive />
              )}
              {damageResult.details.classModifier !== 0 && (
                <DetailRow label="vs Classe" value={`+${damageResult.details.classModifier}%`} positive />
              )}
              {damageResult.details.raceModifier === 0 && damageResult.details.elementModifier === 0 && damageResult.details.sizeModifier === 0 && damageResult.details.classModifier === 0 && (
                <div className="col-span-2 text-ro-muted italic">Nenhum bônus ativo</div>
              )}

              <div className="col-span-2 text-ro-gold font-bold border-b border-ro-border/50 pb-1 mt-2 mb-1">
                Skill & Range
              </div>
              <DetailRow label="Skill % Base" value={`${damageResult.details.skillPercent}%`} />
              {damageResult.details.baseLvScaling !== 1 && (
                <DetailRow label="BaseLv Scaling" value={`×${damageResult.details.baseLvScaling.toFixed(2)}`} positive />
              )}
              {damageResult.details.skillAtkModifier !== 0 && (
                <DetailRow label="Skill bAdd" value={`+${damageResult.details.skillAtkModifier}%`} positive />
              )}
              {damageResult.details.longRangeModifier !== 0 && (
                <DetailRow label={selectedSkill?.isMelee ? "Curta Distância" : "Longa Distância"} value={`+${damageResult.details.longRangeModifier}%`} positive />
              )}
              <DetailRow label="Tabela Elemental" value={`${damageResult.details.elementTableMod}%`} />

              <div className="col-span-2 text-ro-gold font-bold border-b border-ro-border/50 pb-1 mt-2 mb-1">
                Reduções Defensivas Alvo
              </div>
              {damageResult.details.ignoreDefPercent > 0 && (
                <DetailRow label="Ignora DEF/MDEF" value={`${damageResult.details.ignoreDefPercent}%`} positive />
              )}
              <DetailRow label="Hard DEF/MDEF" value={`Reduz ${(100 - (damageResult.details.hardDefReduction * 100)).toFixed(1)}%`} negative />
              <DetailRow label="Soft DEF/MDEF" value={`-${damageResult.details.softDefReduction}`} negative />
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!damageResult && (
        <div className="text-center text-[11px] text-ro-muted py-4">
          Selecione um monstro e uma skill para calcular o dano
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────

function DmgBox({ label, value, highlight, crit }: { label: string; value: number; highlight?: boolean; crit?: boolean }) {
  return (
    <div className="bg-ro-panel/50 rounded-lg px-3 py-2">
      <div className="text-[9px] text-ro-muted uppercase">{label}</div>
      <div
        className={`text-sm font-mono font-bold ${crit ? "text-red-400" : highlight ? "text-ro-gold" : ""
          }`}
        style={!crit && !highlight ? { color: "var(--ro-text)" } : undefined}
      >
        {formatDamage(value)}
      </div>
    </div>
  );
}

function DetailRow({ label, value, positive, negative }: { label: string; value: string | number; positive?: boolean; negative?: boolean }) {
  return (
    <div className="flex justify-between">
      <span>{label}</span>
      <span className={`font-mono ${positive ? "text-green-400" : negative ? "text-red-400" : ""}`}>
        {value}
      </span>
    </div>
  );
}
