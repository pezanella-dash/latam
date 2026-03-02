// ─── Ragnarok Online Class Definitions ───────────────────────────────

export type ClassTier = "trans" | "third" | "expanded" | "doram";

export interface RoClass {
  id: string;              // internal key
  name: string;            // display name (pt-BR)
  nameEn: string;          // English name
  group: ClassGroup;
  tier: ClassTier;
  gender?: "male" | "female" | "both";
  zrendererJobId: number;  // RO client job ID for zrenderer sprite rendering
  costumes?: { label: string; jobId: number }[]; // alternative outfit sprites
  baseAspd: number;        // base aspd (varies by weapon type, simplified)
  hpFactor: number;        // HP multiplier
  spFactor: number;        // SP multiplier
  weapons: string[];       // compatible weapon subTypes
  jobNames: string[];      // matching `jobs` field in items DB
  /** Cumulative job stat bonuses at max job level (rAthena db/re/job_stats.yml).
   *  Applied on top of the player's manually allocated base stats. */
  jobBonus?: { str?: number; agi?: number; vit?: number; int?: number; dex?: number; luk?: number };
}

export type ClassGroup =
  | "swordsman"
  | "mage"
  | "archer"
  | "acolyte"
  | "merchant"
  | "thief"
  | "expanded"
  | "doram";

export const CLASS_GROUPS: Record<ClassGroup, { name: string; color: string }> = {
  swordsman: { name: "Espadachim", color: "#e74c3c" },
  mage: { name: "Mago", color: "#3498db" },
  archer: { name: "Arqueiro", color: "#2ecc71" },
  acolyte: { name: "Noviço", color: "#f1c40f" },
  merchant: { name: "Mercador", color: "#e67e22" },
  thief: { name: "Gatuno", color: "#9b59b6" },
  expanded: { name: "Expandida", color: "#1abc9c" },
  doram: { name: "Doram", color: "#fd79a8" },
};

export const RO_CLASSES: RoClass[] = [
  // ═══ TRANSCENDENT CLASSES ═══════════════════════════════════
  // ─── Swordsman branch ──────────────────────────────────────
  { id: "lord_knight", name: "Lord Knight", nameEn: "Lord Knight", group: "swordsman", tier: "trans", zrendererJobId: 4008, costumes: [{ label: "Knight", jobId: 7 }], baseAspd: 156, hpFactor: 0.97, spFactor: 0.7, weapons: ["1hSword", "2hSword", "1hSpear", "2hSpear", "Dagger"], jobNames: ["Swordman", "Knight", "Lord_Knight"] },
  { id: "paladin", name: "Paladino", nameEn: "Paladin", group: "swordsman", tier: "trans", zrendererJobId: 4015, costumes: [{ label: "Crusader", jobId: 14 }], baseAspd: 154, hpFactor: 0.92, spFactor: 0.8, weapons: ["1hSword", "2hSword", "1hSpear", "2hSpear", "Mace"], jobNames: ["Swordman", "Crusader", "Paladin"] },
  // ─── Mage branch ──────────────────────────────────────────
  { id: "high_wizard", name: "High Wizard", nameEn: "High Wizard", group: "mage", tier: "trans", zrendererJobId: 4010, costumes: [{ label: "Wizard", jobId: 9 }], baseAspd: 140, hpFactor: 0.66, spFactor: 1.4, weapons: ["Staff", "2hStaff", "Dagger"], jobNames: ["Mage", "Wizard", "High_Wizard"] },
  { id: "professor", name: "Professor", nameEn: "Professor", group: "mage", tier: "trans", zrendererJobId: 4017, costumes: [{ label: "Sage", jobId: 16 }], baseAspd: 142, hpFactor: 0.68, spFactor: 1.3, weapons: ["Staff", "2hStaff", "Dagger", "Book"], jobNames: ["Mage", "Sage", "Professor"] },
  // ─── Archer branch ─────────────────────────────────────────
  { id: "sniper", name: "Sniper", nameEn: "Sniper", group: "archer", tier: "trans", zrendererJobId: 4012, costumes: [{ label: "Hunter", jobId: 11 }], baseAspd: 156, hpFactor: 0.75, spFactor: 0.9, weapons: ["Bow", "Dagger"], jobNames: ["Archer", "Hunter", "Sniper"] },
  { id: "clown", name: "Palhaço", nameEn: "Clown", group: "archer", tier: "trans", gender: "male", zrendererJobId: 4020, costumes: [{ label: "Bard", jobId: 19 }], baseAspd: 150, hpFactor: 0.66, spFactor: 1.0, weapons: ["Bow", "Musical", "Dagger"], jobNames: ["Archer", "Bard", "Clown"] },
  { id: "gypsy", name: "Cigana", nameEn: "Gypsy", group: "archer", tier: "trans", gender: "female", zrendererJobId: 4021, costumes: [{ label: "Dancer", jobId: 20 }], baseAspd: 150, hpFactor: 0.66, spFactor: 1.0, weapons: ["Bow", "Whip", "Dagger"], jobNames: ["Archer", "Dancer", "Gypsy"] },
  // ─── Acolyte branch ────────────────────────────────────────
  { id: "high_priest", name: "High Priest", nameEn: "High Priest", group: "acolyte", tier: "trans", zrendererJobId: 4009, costumes: [{ label: "Priest", jobId: 8 }], baseAspd: 148, hpFactor: 0.68, spFactor: 1.2, weapons: ["Mace", "Staff", "2hStaff", "Book", "Knuckle"], jobNames: ["Acolyte", "Priest", "High_Priest"] },
  { id: "champion", name: "Campeão", nameEn: "Champion", group: "acolyte", tier: "trans", zrendererJobId: 4016, costumes: [{ label: "Monk", jobId: 15 }], baseAspd: 160, hpFactor: 0.77, spFactor: 0.9, weapons: ["Knuckle", "Mace", "Staff"], jobNames: ["Acolyte", "Monk", "Champion"] },
  // ─── Merchant branch ───────────────────────────────────────
  { id: "whitesmith", name: "Whitesmith", nameEn: "Whitesmith", group: "merchant", tier: "trans", zrendererJobId: 4011, costumes: [{ label: "Blacksmith", jobId: 10 }], baseAspd: 152, hpFactor: 0.88, spFactor: 0.8, weapons: ["1hAxe", "2hAxe", "Mace", "1hSword", "Dagger"], jobNames: ["Merchant", "Blacksmith", "Whitesmith"] },
  { id: "creator", name: "Criador", nameEn: "Creator", group: "merchant", tier: "trans", zrendererJobId: 4019, costumes: [{ label: "Alchemist", jobId: 18 }], baseAspd: 148, hpFactor: 0.81, spFactor: 1.0, weapons: ["1hAxe", "2hAxe", "Mace", "1hSword", "Dagger"], jobNames: ["Merchant", "Alchemist", "Creator"] },
  // ─── Thief branch ─────────────────────────────────────────
  { id: "assassin_cross", name: "Assassin Cross", nameEn: "Assassin Cross", group: "thief", tier: "trans", zrendererJobId: 4013, costumes: [{ label: "Assassin", jobId: 12 }], baseAspd: 162, hpFactor: 0.88, spFactor: 0.7, weapons: ["Dagger", "1hSword", "Katar"], jobNames: ["Thief", "Assassin", "Assassin_Cross"] },
  { id: "stalker", name: "Stalker", nameEn: "Stalker", group: "thief", tier: "trans", zrendererJobId: 4018, costumes: [{ label: "Rogue", jobId: 17 }], baseAspd: 155, hpFactor: 0.77, spFactor: 0.9, weapons: ["Dagger", "1hSword", "Bow"], jobNames: ["Thief", "Rogue", "Stalker"] },

  // ═══ 3RD CLASSES ════════════════════════════════════════════
  // jobBonus = cumulative stat gains at max job level (rAthena db/re/job_stats.yml)
  // ─── Swordsman branch ──────────────────────────────────────
  { id: "rune_knight", name: "Rune Knight", nameEn: "Rune Knight", group: "swordsman", tier: "third", zrendererJobId: 4060, costumes: [{ label: "Alt", jobId: 4054 }, { label: "Trans", jobId: 4008 }, { label: "2nd", jobId: 7 }], baseAspd: 156, hpFactor: 1.14, spFactor: 0.8, weapons: ["1hSword", "2hSword", "1hSpear", "2hSpear", "Dagger", "Mace"], jobNames: ["Swordman", "Knight", "Lord_Knight", "Rune_Knight"], jobBonus: { str: 15, agi: 8, vit: 12, int: 3, dex: 5, luk: 2 } },
  { id: "royal_guard", name: "Royal Guard", nameEn: "Royal Guard", group: "swordsman", tier: "third", zrendererJobId: 4073, costumes: [{ label: "Alt", jobId: 4066 }, { label: "Trans", jobId: 4015 }, { label: "2nd", jobId: 14 }], baseAspd: 154, hpFactor: 1.08, spFactor: 0.9, weapons: ["1hSword", "2hSword", "1hSpear", "2hSpear", "Dagger", "Mace"], jobNames: ["Swordman", "Crusader", "Paladin", "Royal_Guard"], jobBonus: { str: 10, agi: 5, vit: 15, int: 5, dex: 5, luk: 5 } },
  // ─── Mage branch ──────────────────────────────────────────
  { id: "warlock", name: "Warlock", nameEn: "Warlock", group: "mage", tier: "third", zrendererJobId: 4061, costumes: [{ label: "Alt", jobId: 4055 }, { label: "Trans", jobId: 4010 }, { label: "2nd", jobId: 9 }], baseAspd: 140, hpFactor: 0.78, spFactor: 1.5, weapons: ["Staff", "2hStaff", "Dagger", "1hSword", "Book"], jobNames: ["Mage", "Wizard", "High_Wizard", "Warlock"], jobBonus: { str: 2, agi: 5, vit: 3, int: 15, dex: 15, luk: 5 } },
  { id: "sorcerer", name: "Sorcerer", nameEn: "Sorcerer", group: "mage", tier: "third", zrendererJobId: 4074, costumes: [{ label: "Alt", jobId: 4067 }, { label: "Trans", jobId: 4017 }, { label: "2nd", jobId: 16 }], baseAspd: 142, hpFactor: 0.80, spFactor: 1.4, weapons: ["Staff", "2hStaff", "Dagger", "1hSword", "Book"], jobNames: ["Mage", "Sage", "Professor", "Sorcerer"], jobBonus: { str: 2, agi: 5, vit: 3, int: 15, dex: 12, luk: 8 } },
  // ─── Archer branch ─────────────────────────────────────────
  { id: "ranger", name: "Ranger", nameEn: "Ranger", group: "archer", tier: "third", zrendererJobId: 4062, costumes: [{ label: "Alt", jobId: 4056 }, { label: "Trans", jobId: 4012 }, { label: "2nd", jobId: 11 }], baseAspd: 156, hpFactor: 0.88, spFactor: 1.0, weapons: ["Bow", "Dagger"], jobNames: ["Archer", "Hunter", "Sniper", "Ranger"], jobBonus: { str: 5, agi: 10, vit: 3, int: 3, dex: 15, luk: 9 } },
  { id: "minstrel", name: "Trovador", nameEn: "Minstrel", group: "archer", tier: "third", gender: "male", zrendererJobId: 4075, costumes: [{ label: "Alt", jobId: 4068 }, { label: "Trans", jobId: 4020 }, { label: "2nd", jobId: 19 }], baseAspd: 150, hpFactor: 0.78, spFactor: 1.1, weapons: ["Bow", "Musical", "Dagger"], jobNames: ["Archer", "Bard", "Clown", "Minstrel"], jobBonus: { str: 5, agi: 10, vit: 3, int: 5, dex: 12, luk: 10 } },
  { id: "wanderer", name: "Cigana", nameEn: "Wanderer", group: "archer", tier: "third", gender: "female", zrendererJobId: 4076, costumes: [{ label: "Alt", jobId: 4069 }, { label: "Trans", jobId: 4021 }, { label: "2nd", jobId: 20 }], baseAspd: 150, hpFactor: 0.78, spFactor: 1.1, weapons: ["Bow", "Whip", "Dagger"], jobNames: ["Archer", "Dancer", "Gypsy", "Wanderer"], jobBonus: { str: 5, agi: 10, vit: 3, int: 5, dex: 12, luk: 10 } },
  // ─── Acolyte branch ────────────────────────────────────────
  { id: "arch_bishop", name: "Arcebispo", nameEn: "Arch Bishop", group: "acolyte", tier: "third", zrendererJobId: 4063, costumes: [{ label: "Alt", jobId: 4057 }, { label: "Trans", jobId: 4009 }, { label: "2nd", jobId: 8 }], baseAspd: 148, hpFactor: 0.80, spFactor: 1.3, weapons: ["Mace", "Staff", "2hStaff", "Book", "Knuckle"], jobNames: ["Acolyte", "Priest", "High_Priest", "Arch_Bishop"], jobBonus: { str: 5, agi: 3, vit: 12, int: 12, dex: 8, luk: 5 } },
  { id: "sura", name: "Shura", nameEn: "Sura", group: "acolyte", tier: "third", zrendererJobId: 4077, costumes: [{ label: "Alt", jobId: 4070 }, { label: "Trans", jobId: 4016 }, { label: "2nd", jobId: 15 }], baseAspd: 160, hpFactor: 0.91, spFactor: 1.0, weapons: ["Knuckle", "Mace", "Staff"], jobNames: ["Acolyte", "Monk", "Champion", "Sura"], jobBonus: { str: 12, agi: 12, vit: 8, int: 5, dex: 5, luk: 3 } },
  // ─── Merchant branch ───────────────────────────────────────
  { id: "mechanic", name: "Mecânico", nameEn: "Mechanic", group: "merchant", tier: "third", zrendererJobId: 4064, costumes: [{ label: "Alt", jobId: 4058 }, { label: "Trans", jobId: 4011 }, { label: "2nd", jobId: 10 }], baseAspd: 152, hpFactor: 1.04, spFactor: 0.9, weapons: ["1hAxe", "2hAxe", "Mace", "1hSword", "Dagger"], jobNames: ["Merchant", "Blacksmith", "Whitesmith", "Mechanic"], jobBonus: { str: 15, agi: 8, vit: 10, int: 3, dex: 5, luk: 4 } },
  { id: "genetic", name: "Geneticista", nameEn: "Genetic", group: "merchant", tier: "third", zrendererJobId: 4078, costumes: [{ label: "Alt", jobId: 4071 }, { label: "Trans", jobId: 4019 }, { label: "2nd", jobId: 18 }], baseAspd: 148, hpFactor: 0.95, spFactor: 1.1, weapons: ["1hAxe", "2hAxe", "Mace", "1hSword", "Dagger"], jobNames: ["Merchant", "Alchemist", "Creator", "Genetic"], jobBonus: { str: 10, agi: 8, vit: 8, int: 10, dex: 5, luk: 4 } },
  // ─── Thief branch ─────────────────────────────────────────
  { id: "guillotine_cross", name: "Guillotine Cross", nameEn: "Guillotine Cross", group: "thief", tier: "third", zrendererJobId: 4065, costumes: [{ label: "Alt", jobId: 4059 }, { label: "Trans", jobId: 4013 }, { label: "2nd", jobId: 12 }], baseAspd: 162, hpFactor: 1.03, spFactor: 0.8, weapons: ["Dagger", "1hSword", "Katar"], jobNames: ["Thief", "Assassin", "Assassin_Cross", "Guillotine_Cross"], jobBonus: { str: 12, agi: 14, vit: 5, int: 3, dex: 5, luk: 6 } },
  { id: "shadow_chaser", name: "Shadow Chaser", nameEn: "Shadow Chaser", group: "thief", tier: "third", zrendererJobId: 4079, costumes: [{ label: "Alt", jobId: 4072 }, { label: "Trans", jobId: 4018 }, { label: "2nd", jobId: 17 }], baseAspd: 155, hpFactor: 0.90, spFactor: 1.0, weapons: ["Dagger", "1hSword", "Bow"], jobNames: ["Thief", "Rogue", "Stalker", "Shadow_Chaser"], jobBonus: { str: 8, agi: 10, vit: 5, int: 5, dex: 12, luk: 5 } },

  // ═══ EXPANDED ═══════════════════════════════════════════════
  { id: "rebellion", name: "Rebellion", nameEn: "Rebellion", group: "expanded", tier: "expanded", zrendererJobId: 4215, costumes: [{ label: "Gunslinger", jobId: 24 }], baseAspd: 156, hpFactor: 0.97, spFactor: 0.9, weapons: ["Revolver", "Rifle", "Gatling", "Shotgun", "Grenade"], jobNames: ["Gunslinger", "Rebellion"] },
  { id: "star_emperor", name: "Star Emperor", nameEn: "Star Emperor", group: "expanded", tier: "expanded", zrendererJobId: 4239, costumes: [{ label: "Star Glad.", jobId: 4046 }], baseAspd: 158, hpFactor: 0.97, spFactor: 1.0, weapons: ["Knuckle", "1hSword", "Book"], jobNames: ["Taekwon", "Star_Gladiator", "Star_Emperor"] },
  { id: "soul_reaper", name: "Soul Reaper", nameEn: "Soul Reaper", group: "expanded", tier: "expanded", zrendererJobId: 4240, costumes: [{ label: "Soul Linker", jobId: 4049 }], baseAspd: 145, hpFactor: 0.80, spFactor: 1.3, weapons: ["Staff", "2hStaff", "Dagger", "Book"], jobNames: ["Taekwon", "Soul_Linker", "Soul_Reaper"] },
  { id: "kagerou", name: "Kagerou", nameEn: "Kagerou", group: "expanded", tier: "expanded", gender: "male", zrendererJobId: 4211, costumes: [{ label: "Ninja", jobId: 25 }], baseAspd: 158, hpFactor: 0.80, spFactor: 1.0, weapons: ["Dagger", "1hSword", "Huuma"], jobNames: ["Ninja", "KagerouOboro", "Kagerou"] },
  { id: "oboro", name: "Oboro", nameEn: "Oboro", group: "expanded", tier: "expanded", gender: "female", zrendererJobId: 4212, costumes: [{ label: "Ninja", jobId: 25 }], baseAspd: 158, hpFactor: 0.80, spFactor: 1.0, weapons: ["Dagger", "1hSword", "Huuma"], jobNames: ["Ninja", "KagerouOboro", "Oboro"] },
  { id: "super_novice", name: "Super Novice", nameEn: "Super Novice", group: "expanded", tier: "expanded", zrendererJobId: 23, baseAspd: 150, hpFactor: 0.50, spFactor: 1.0, weapons: ["Dagger", "1hSword", "1hAxe", "Mace", "Staff", "Book", "Knuckle"], jobNames: ["Novice", "SuperNovice"] },

  // ═══ DORAM ══════════════════════════════════════════════════
  { id: "spirit_handler", name: "Spirit Handler", nameEn: "Spirit Handler", group: "doram", tier: "doram", zrendererJobId: 4218, baseAspd: 148, hpFactor: 1.08, spFactor: 1.2, weapons: ["Staff", "2hStaff"], jobNames: ["Summoner", "Spirit_Handler"] },
];

// ─── Equipment slot definitions ──────────────────────────────────────

export interface SlotDef {
  id: string;
  name: string;
  label: string;
  icon: string;       // emoji placeholder
  x: number;          // position in equipment window (%)
  y: number;
  w: number;
  h: number;
  group: "main" | "shadow" | "visual";
}

export const EQUIP_SLOTS: SlotDef[] = [
  // Main equipment — ALT+Q layout
  { id: "head_top", name: "Topo", label: "Capacete", icon: "👑", x: 50, y: 4, w: 40, h: 40, group: "main" },
  { id: "head_mid", name: "Meio", label: "Face", icon: "👓", x: 18, y: 4, w: 40, h: 40, group: "main" },
  { id: "head_low", name: "Baixo", label: "Boca", icon: "😷", x: 82, y: 4, w: 40, h: 40, group: "main" },
  { id: "right_hand", name: "Mão Dir.", label: "Arma", icon: "⚔️", x: 18, y: 52, w: 40, h: 40, group: "main" },
  { id: "left_hand", name: "Mão Esq.", label: "Escudo", icon: "🛡️", x: 82, y: 52, w: 40, h: 40, group: "main" },
  { id: "armor", name: "Armadura", label: "Armadura", icon: "🦺", x: 50, y: 52, w: 40, h: 40, group: "main" },
  { id: "garment", name: "Capa", label: "Capa", icon: "🧥", x: 18, y: 76, w: 40, h: 40, group: "main" },
  { id: "shoes", name: "Sapatos", label: "Calçado", icon: "👢", x: 50, y: 76, w: 40, h: 40, group: "main" },
  { id: "accessory1", name: "Acessório 1", label: "Acessório", icon: "💍", x: 18, y: 100, w: 40, h: 40, group: "main" },
  { id: "accessory2", name: "Acessório 2", label: "Acessório", icon: "💎", x: 82, y: 100, w: 40, h: 40, group: "main" },
  // Shadow equipment
  { id: "shadow_weapon", name: "S. Arma", label: "Shadow Arma", icon: "🗡️", x: 18, y: 4, w: 36, h: 36, group: "shadow" },
  { id: "shadow_shield", name: "S. Escudo", label: "Shadow Escudo", icon: "🔰", x: 82, y: 4, w: 36, h: 36, group: "shadow" },
  { id: "shadow_armor", name: "S. Armadura", label: "Shadow Armadura", icon: "⛓️", x: 50, y: 4, w: 36, h: 36, group: "shadow" },
  { id: "shadow_shoes", name: "S. Sapatos", label: "Shadow Calçado", icon: "🥾", x: 18, y: 52, w: 36, h: 36, group: "shadow" },
  { id: "shadow_earring", name: "S. Brinco", label: "Shadow Brinco", icon: "👂", x: 50, y: 52, w: 36, h: 36, group: "shadow" },
  { id: "shadow_pendant", name: "S. Pingente", label: "Shadow Pingente", icon: "📿", x: 82, y: 52, w: 36, h: 36, group: "shadow" },
  // Visual/costume equipment (overrides sprite appearance)
  { id: "visual_top", name: "V. Capacete", label: "Visual Capacete", icon: "👑", x: 18, y: 4, w: 36, h: 36, group: "visual" },
  { id: "visual_mid", name: "V. Face", label: "Visual Face", icon: "👓", x: 50, y: 4, w: 36, h: 36, group: "visual" },
  { id: "visual_low", name: "V. Boca", label: "Visual Boca", icon: "😷", x: 82, y: 4, w: 36, h: 36, group: "visual" },
  { id: "visual_garment", name: "V. Capa", label: "Visual Capa", icon: "🧥", x: 50, y: 52, w: 36, h: 36, group: "visual" },
];

export function getClassById(id: string): RoClass | undefined {
  return RO_CLASSES.find((c) => c.id === id);
}

export function isItemCompatibleWithClass(
  itemJobs: string[],
  roClass: RoClass
): boolean {
  // Empty jobs array = all classes
  if (!itemJobs || itemJobs.length === 0) return true;
  return roClass.jobNames.some((jn) => itemJobs.includes(jn));
}
