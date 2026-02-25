/**
 * Divine Pride API client for Ragnarok LATAM server
 * Docs: https://www.divine-pride.net/api
 * Server: LATAM (distinct from bRO)
 */

const BASE_URL = "https://www.divine-pride.net/api/database";
const SERVER = "LATAM";

function getApiKey(): string {
  const key = process.env.DIVINE_PRIDE_API_KEY;
  if (!key) throw new Error("DIVINE_PRIDE_API_KEY not set in environment");
  return key;
}

async function fetchDP<T>(endpoint: string): Promise<T> {
  const url = `${BASE_URL}${endpoint}?apiKey=${getApiKey()}&server=${SERVER}`;
  const res = await fetch(url, {
    headers: { "Accept-Language": "pt-BR" },
    next: { revalidate: 3600 }, // Cache for 1 hour (Next.js fetch cache)
  });

  if (!res.ok) {
    throw new Error(`Divine Pride API error ${res.status}: ${endpoint}`);
  }

  return res.json() as Promise<T>;
}

// ─── Types ────────────────────────────────────────────────────────

export interface DPItem {
  id: number;
  name: string;
  description: string;
  type: number;
  subType: number;
  slots: number;
  weight: number;
  attack: number | null;
  magicAttack: number | null;
  defense: number | null;
  range: number | null;
  requiredLevel: number | null;
  jobs: number;
  locations: number;
  refinable: boolean;
  unidentifiedDisplayName: string;
  unidentifiedResourceName: string;
  identifiedDisplayName: string;
  identifiedResourceName: string;
  itemTypeId: number;
  equipLocationMask: number;
  imageUrl: string;
}

export interface DPMonster {
  id: number;
  name: string;
  level: number;
  hp: number;
  baseExp: number;
  jobExp: number;
  attack: [number, number];
  defense: number;
  magicDefense: number;
  stats: {
    str: number;
    agi: number;
    vit: number;
    int: number;
    dex: number;
    luk: number;
  };
  element: number;
  elementLevel: number;
  race: number;
  size: number;
  drops: Array<{
    itemId: number;
    chance: number;
    mvp: boolean;
  }>;
}

export interface DPSkill {
  id: number;
  name: string;
  description: string;
  type: number;
  element: number;
  targetType: number;
  damageFlags: number;
  range: number;
  levels: Array<{
    level: number;
    spCost: number | null;
    cooldown: number | null;
    fixedCastTime: number | null;
    variableCastTime: number | null;
  }>;
}

// ─── API methods ──────────────────────────────────────────────────

export const divinePride = {
  item: (id: number) => fetchDP<DPItem>(`/Item/${id}`),
  monster: (id: number) => fetchDP<DPMonster>(`/Monster/${id}`),
  skill: (id: number) => fetchDP<DPSkill>(`/Skill/${id}`),
};
