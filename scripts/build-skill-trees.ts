/**
 * Build Skill Tree JSON from multiple data sources.
 *
 * Sources:
 *   1. data/zrenderer-resources/data/skilltreeview.txt — grid positions & prerequisites
 *   2. data/database/skills.json — skill ID, aegisName, description, type
 *   3. data/rathena/skill_db.yml — SP cost, cast time, fixed cast, cooldown
 *   4. src/lib/ro-skill-formulas.ts — Portuguese names (parsed via regex)
 *
 * Output: data/database/skill-trees.json
 *
 * Usage: npx tsx scripts/build-skill-trees.ts
 */

import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "..");

// ─── Types ──────────────────────────────────────────────────────────

interface RawTreeSkill {
  aegisName: string;
  position: number;
  prereqPositions: number[];
  maxLevel: number;
}

interface SkillInfo {
  id: number;
  aegisName: string;
  description: string;
  maxLevel: number;
  type: string;
  targetType: string;
}

interface SkillCastData {
  spCost: number[];
  castTime: number[];
  fixedCast: number[];
  cooldown: number[];
}

interface OutputSkill {
  aegisName: string;
  id: number;
  position: number;
  row: number;
  col: number;
  maxLevel: number;
  prereqs: number[];
  name: string;
  namePt: string;
  description: string;
  type: string;
  targetType: string;
  spCost: number[];
  castTime: number[];
  fixedCast: number[];
  cooldown: number[];
}

// ─── Job Names ──────────────────────────────────────────────────────

const JOB_NAMES: Record<number, string> = {
  0: "Novice",
  1: "Swordman",
  2: "Mage",
  3: "Archer",
  4: "Acolyte",
  5: "Merchant",
  6: "Thief",
  7: "Knight",
  8: "Priest",
  9: "Wizard",
  10: "Blacksmith",
  11: "Hunter",
  12: "Assassin",
  14: "Crusader",
  15: "Monk",
  16: "Sage",
  17: "Rogue",
  18: "Alchemist",
  19: "Bard",
  20: "Dancer",
  23: "Super Novice",
  24: "Gunslinger",
  25: "Ninja",
  4008: "Lord Knight",
  4009: "High Priest",
  4010: "High Wizard",
  4011: "Whitesmith",
  4012: "Sniper",
  4013: "Assassin Cross",
  4015: "Paladin",
  4016: "Champion",
  4017: "Professor",
  4018: "Stalker",
  4019: "Creator",
  4020: "Clown",
  4021: "Gypsy",
  4046: "Taekwon",
  4047: "Star Gladiator",
  4049: "Soul Linker",
  4054: "Rune Knight",
  4055: "Warlock",
  4056: "Ranger",
  4057: "Arch Bishop",
  4058: "Mechanic",
  4059: "Guillotine Cross",
};

const JOB_CHAINS: Record<string, number[]> = {
  // Trans
  lord_knight: [0, 1, 7, 4008],
  paladin: [0, 1, 14, 4015],
  high_wizard: [0, 2, 9, 4010],
  professor: [0, 2, 16, 4017],
  sniper: [0, 3, 11, 4012],
  clown: [0, 3, 19, 4020],
  gypsy: [0, 3, 20, 4021],
  high_priest: [0, 4, 8, 4009],
  champion: [0, 4, 15, 4016],
  whitesmith: [0, 5, 10, 4011],
  creator: [0, 5, 18, 4019],
  assassin_cross: [0, 6, 12, 4013],
  stalker: [0, 6, 17, 4018],
  // 3rd (with skill tree data available)
  rune_knight: [0, 1, 7, 4008, 4054],
  warlock: [0, 2, 9, 4010, 4055],
  ranger: [0, 3, 11, 4012, 4056],
  arch_bishop: [0, 4, 8, 4009, 4057],
  mechanic: [0, 5, 10, 4011, 4058],
  guillotine_cross: [0, 6, 12, 4013, 4059],
  // 3rd (without own skill tree data — use trans as top)
  royal_guard: [0, 1, 14, 4015],
  sorcerer: [0, 2, 16, 4017],
  minstrel: [0, 3, 19, 4020],
  wanderer: [0, 3, 20, 4021],
  sura: [0, 4, 15, 4016],
  genetic: [0, 5, 18, 4019],
  shadow_chaser: [0, 6, 17, 4018],
  // Expanded
  super_novice: [0, 23],
  rebellion: [24],
  star_emperor: [4046, 4047],
  soul_reaper: [4046, 4049],
  kagerou: [25],
  oboro: [25],
  spirit_handler: [],
};

// ─── Step 1: Parse skilltreeview.txt ────────────────────────────────

function parseSkillTreeView(): Map<number, RawTreeSkill[]> {
  const filePath = path.join(ROOT, "data/zrenderer-resources/data/skilltreeview.txt");
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n").map((l) => l.trim());

  const trees = new Map<number, RawTreeSkill[]>();
  let currentJobId: number | null = null;
  let inBlock = false;

  for (const line of lines) {
    if (!line || line === "") continue;

    if (line === "{") {
      inBlock = true;
      continue;
    }
    if (line === "}") {
      inBlock = false;
      currentJobId = null;
      continue;
    }

    if (!inBlock) {
      // This should be a job ID
      const jobId = parseInt(line);
      if (!isNaN(jobId)) {
        currentJobId = jobId;
        if (!trees.has(jobId)) trees.set(jobId, []);
      }
      continue;
    }

    // Inside block: parse skill entry
    // Format: AEGIS_NAME#position#[prereq_positions...]#maxLevel@
    if (currentJobId === null) continue;

    const cleanLine = line.replace("@", "").trim();
    if (!cleanLine) continue;

    const parts = cleanLine.split("#");
    if (parts.length < 3) continue;

    const aegisName = parts[0];
    const position = parseInt(parts[1]);
    const maxLevel = parseInt(parts[parts.length - 1]);
    const prereqPositions = parts.slice(2, -1).map((p) => parseInt(p)).filter((p) => !isNaN(p));

    trees.get(currentJobId)!.push({
      aegisName,
      position,
      prereqPositions,
      maxLevel,
    });
  }

  return trees;
}

// ─── Step 2: Load skills.json ──────────────────────────────────────

function loadSkillsJson(): Map<string, SkillInfo> {
  const filePath = path.join(ROOT, "data/database/skills.json");
  const data: SkillInfo[] = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  const map = new Map<string, SkillInfo>();
  for (const skill of data) {
    map.set(skill.aegisName, skill);
  }
  return map;
}

// ─── Step 3: Parse skill_db.yml (simplified YAML parser) ──────────

function parseSkillDbYml(): Map<string, SkillCastData> {
  const filePath = path.join(ROOT, "data/rathena/skill_db.yml");
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  const map = new Map<string, SkillCastData>();

  let currentName = "";
  let currentMaxLevel = 1;
  let inSection = ""; // "SpCost", "CastTime", "FixedCastTime", "Cooldown"
  let currentData: SkillCastData = { spCost: [], castTime: [], fixedCast: [], cooldown: [] };
  let levelValues: { level: number; amount: number }[] = [];
  let flatValue: number | null = null;

  function flushSection() {
    if (!inSection) return;
    const key = inSection === "SpCost" ? "spCost"
      : inSection === "CastTime" ? "castTime"
      : inSection === "FixedCastTime" ? "fixedCast"
      : inSection === "Cooldown" ? "cooldown"
      : null;
    if (!key) return;

    if (flatValue !== null) {
      // Flat value: repeat for all levels
      currentData[key] = Array(currentMaxLevel).fill(flatValue);
    } else if (levelValues.length > 0) {
      // Level-based: fill array
      const arr = Array(currentMaxLevel).fill(0);
      for (const lv of levelValues) {
        if (lv.level >= 1 && lv.level <= currentMaxLevel) {
          arr[lv.level - 1] = lv.amount;
        }
      }
      // Forward-fill: if a level has 0 but previous has a value, carry forward
      for (let i = 1; i < arr.length; i++) {
        if (arr[i] === 0 && arr[i - 1] !== 0 && levelValues.length < currentMaxLevel) {
          arr[i] = arr[i - 1];
        }
      }
      currentData[key] = arr;
    }
    levelValues = [];
    flatValue = null;
    inSection = "";
  }

  function flushSkill() {
    flushSection();
    if (currentName) {
      // Fill missing arrays
      if (currentData.spCost.length === 0) currentData.spCost = Array(currentMaxLevel).fill(0);
      if (currentData.castTime.length === 0) currentData.castTime = Array(currentMaxLevel).fill(0);
      if (currentData.fixedCast.length === 0) currentData.fixedCast = Array(currentMaxLevel).fill(0);
      if (currentData.cooldown.length === 0) currentData.cooldown = Array(currentMaxLevel).fill(0);
      map.set(currentName, { ...currentData });
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trimEnd();

    // New skill entry
    const idMatch = trimmed.match(/^  - Id: (\d+)$/);
    if (idMatch) {
      flushSkill();
      currentName = "";
      currentMaxLevel = 1;
      currentData = { spCost: [], castTime: [], fixedCast: [], cooldown: [] };
      inSection = "";
      levelValues = [];
      flatValue = null;
      continue;
    }

    // Name
    const nameMatch = trimmed.match(/^    Name: (.+)$/);
    if (nameMatch) {
      currentName = nameMatch[1].trim();
      continue;
    }

    // MaxLevel
    const maxLvMatch = trimmed.match(/^    MaxLevel: (\d+)$/);
    if (maxLvMatch) {
      currentMaxLevel = parseInt(maxLvMatch[1]);
      continue;
    }

    // Section headers (can be flat value or level-based)
    for (const section of ["SpCost", "CastTime", "FixedCastTime", "Cooldown"]) {
      const sectionMatch = trimmed.match(new RegExp(`^\\s+${section}:\\s*(.*)$`));
      if (sectionMatch) {
        flushSection();
        const val = sectionMatch[1].trim();
        if (val && !val.startsWith("#")) {
          // Flat value
          inSection = section;
          flatValue = parseInt(val);
          if (isNaN(flatValue)) flatValue = null;
        } else {
          // Level-based (next lines are - Level/Amount pairs)
          inSection = section;
          flatValue = null;
        }
        break;
      }
    }

    // Level entry
    const levelMatch = trimmed.match(/^\s+- Level: (\d+)$/);
    if (levelMatch && inSection) {
      // Next line should be Amount or Time
      continue;
    }

    // Amount/Time value
    const amountMatch = trimmed.match(/^\s+(?:Amount|Time): (-?\d+)$/);
    if (amountMatch && inSection) {
      // Find the most recent Level
      const prevLine = lines[i - 1]?.trim();
      const prevLevelMatch = prevLine?.match(/^- Level: (\d+)$/);
      if (prevLevelMatch) {
        levelValues.push({ level: parseInt(prevLevelMatch[1]), amount: parseInt(amountMatch[1]) });
      }
      continue;
    }

    // Detect end of current section (new top-level field under skill)
    if (inSection && trimmed.match(/^    [A-Z]/) && !trimmed.match(/^\s+-/)) {
      flushSection();
    }
  }

  flushSkill();
  return map;
}

// ─── Step 4: Parse Portuguese names from ro-skill-formulas.ts ──────

function parsePtNames(): Map<string, string> {
  const filePath = path.join(ROOT, "src/lib/ro-skill-formulas.ts");
  const content = fs.readFileSync(filePath, "utf-8");
  const map = new Map<string, string>();

  // Match: aegisName: "XXX" ... namePt: "YYY"
  const regex = /aegisName:\s*"([^"]+)"[^}]*?namePt:\s*"([^"]+)"/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    map.set(match[1], match[2]);
  }

  return map;
}

// ─── Step 5: Build output ──────────────────────────────────────────

function main() {
  console.log("Building skill trees...\n");

  // Load all sources
  const rawTrees = parseSkillTreeView();
  console.log(`  Parsed ${rawTrees.size} job trees from skilltreeview.txt`);

  const skillsMap = loadSkillsJson();
  console.log(`  Loaded ${skillsMap.size} skills from skills.json`);

  const castDataMap = parseSkillDbYml();
  console.log(`  Parsed ${castDataMap.size} skills from skill_db.yml`);

  const ptNames = parsePtNames();
  console.log(`  Found ${ptNames.size} Portuguese names from ro-skill-formulas.ts`);

  // Build enriched trees
  const trees: Record<string, OutputSkill[]> = {};
  let totalSkills = 0;
  let missingIds = 0;

  for (const [jobId, rawSkills] of rawTrees) {
    const outputSkills: OutputSkill[] = [];

    for (const raw of rawSkills) {
      const skillInfo = skillsMap.get(raw.aegisName);
      const castData = castDataMap.get(raw.aegisName);

      if (!skillInfo) {
        missingIds++;
        // Create a placeholder
        outputSkills.push({
          aegisName: raw.aegisName,
          id: 0,
          position: raw.position,
          row: Math.floor(raw.position / 7),
          col: raw.position % 7,
          maxLevel: raw.maxLevel,
          prereqs: raw.prereqPositions,
          name: raw.aegisName.replace(/_/g, " "),
          namePt: ptNames.get(raw.aegisName) || raw.aegisName.replace(/_/g, " "),
          description: "",
          type: "None",
          targetType: "Passive",
          spCost: Array(raw.maxLevel).fill(0),
          castTime: Array(raw.maxLevel).fill(0),
          fixedCast: Array(raw.maxLevel).fill(0),
          cooldown: Array(raw.maxLevel).fill(0),
        });
        continue;
      }

      const spCost = castData?.spCost || Array(raw.maxLevel).fill(0);
      const castTime = castData?.castTime || Array(raw.maxLevel).fill(0);
      const fixedCast = castData?.fixedCast || Array(raw.maxLevel).fill(0);
      const cooldown = castData?.cooldown || Array(raw.maxLevel).fill(0);

      outputSkills.push({
        aegisName: raw.aegisName,
        id: skillInfo.id,
        position: raw.position,
        row: Math.floor(raw.position / 7),
        col: raw.position % 7,
        maxLevel: raw.maxLevel,
        prereqs: raw.prereqPositions,
        name: skillInfo.description || raw.aegisName.replace(/_/g, " "),
        namePt: ptNames.get(raw.aegisName) || skillInfo.description || raw.aegisName.replace(/_/g, " "),
        description: skillInfo.description || "",
        type: skillInfo.type || "None",
        targetType: skillInfo.targetType || "Passive",
        spCost: spCost.slice(0, raw.maxLevel),
        castTime: castTime.slice(0, raw.maxLevel),
        fixedCast: fixedCast.slice(0, raw.maxLevel),
        cooldown: cooldown.slice(0, raw.maxLevel),
      });
      totalSkills++;
    }

    trees[jobId.toString()] = outputSkills;
  }

  // Build job name map
  const jobNames: Record<string, string> = {};
  for (const [jobId] of rawTrees) {
    jobNames[jobId.toString()] = JOB_NAMES[jobId] || `Job ${jobId}`;
  }

  const output = {
    trees,
    chains: JOB_CHAINS,
    jobNames,
  };

  // Write output
  const outPath = path.join(ROOT, "data/database/skill-trees.json");
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));

  console.log(`\nDone!`);
  console.log(`  Total skills: ${totalSkills}`);
  console.log(`  Missing IDs: ${missingIds}`);
  console.log(`  Job trees: ${Object.keys(trees).length}`);
  console.log(`  Class chains: ${Object.keys(JOB_CHAINS).length}`);
  console.log(`  Output: ${outPath}`);
}

main();
