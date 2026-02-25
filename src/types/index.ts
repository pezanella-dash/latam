export type JobRole = "mvp" | "woe" | "pve" | "pvp" | "farm";

export type BuildSlot =
  | "head_top"
  | "head_mid"
  | "head_low"
  | "body"
  | "weapon"
  | "offhand"
  | "garment"
  | "shoes"
  | "acc1"
  | "acc2"
  | "costume_top"
  | "costume_mid"
  | "costume_low"
  | "costume_garment"
  | "shadow_weapon"
  | "shadow_offhand"
  | "shadow_head"
  | "shadow_body"
  | "shadow_shoes"
  | "shadow_acc1"
  | "shadow_acc2";

export interface BuildRecommendation {
  class: string;
  role: JobRole;
  patch: string;
  summary: string;
  stats: {
    str: number;
    agi: number;
    vit: number;
    int: number;
    dex: number;
    luk: number;
  };
  equipment: Array<{
    slot: BuildSlot;
    itemId: number;
    itemName: string;
    refine: number;
    cards: number[];
    enchants: string[];
    alternative?: string;
  }>;
  skills: Record<number, number>; // skillId -> level
  notes: string;
  alternatives: string;
}
