// Debug stat point calculation vs rAthena

// rAthena formula: pc_need_status_point = 1 + (val + 9) / 10  (integer division)
function rathenaStatCost(val) {
  return 1 + Math.floor((val + 9) / 10);
}

// Current (broken) formula
function currentStatCost(val) {
  if (val < 1) return 0;
  if (val < 100) return Math.floor((val - 1) / 10) + 2;
  return 4 * Math.floor((val - 100) / 5) + 16;
}

function statPointsSpent(val, costFn) {
  let total = 0;
  for (let i = 1; i < val; i++) total += costFn(i);
  return total;
}

// rAthena formula: pc_gets_status_point = (level + 14) / 5  (integer division)
function rathenaPointsPerLevel(lv) {
  return Math.floor((lv + 14) / 5);
}

// Current (broken) formula
function currentPointsPerLevel(lv) {
  if (lv <= 99) return Math.floor(lv / 5) + 3;
  if (lv <= 150) return Math.floor(lv / 10) + 13;
  return Math.floor((lv - 150) / 7) + 28;
}

function totalPoints(baseLevel, perLevelFn) {
  let total = 48;
  for (let lv = 2; lv <= baseLevel; lv++) {
    total += perLevelFn(lv);
  }
  return total;
}

// User case: Lv175, stats: 95/60/120/100/107/1, remaining: 6
const level = 175;
const stats = { str: 95, agi: 60, vit: 120, int: 100, dex: 107, luk: 1 };

console.log("=== STAT COST COMPARISON ===");
console.log("Val | Current | rAthena");
for (const v of [1, 10, 50, 90, 95, 99, 100, 101, 105, 110, 115, 120]) {
  console.log(`  ${v.toString().padStart(3)} |    ${currentStatCost(v).toString().padStart(3)} |    ${rathenaStatCost(v).toString().padStart(3)}`);
}

console.log("\n=== POINTS PER LEVEL COMPARISON ===");
console.log("Lv  | Current | rAthena");
for (const lv of [2, 5, 10, 50, 99, 100, 101, 125, 150, 151, 175, 200]) {
  console.log(`  ${lv.toString().padStart(3)} |    ${currentPointsPerLevel(lv).toString().padStart(3)} |    ${rathenaPointsPerLevel(lv).toString().padStart(3)}`);
}

console.log("\n=== TOTAL POINTS AT LEVEL ===");
for (const lv of [99, 150, 175, 185, 200]) {
  console.log(`  Lv${lv}: current=${totalPoints(lv, currentPointsPerLevel)}, rAthena=${totalPoints(lv, rathenaPointsPerLevel)}`);
}

console.log("\n=== USER CASE: Lv175, 95/60/120/100/107/1 ===");
const totalRathena = totalPoints(level, rathenaPointsPerLevel);
const totalCurrent = totalPoints(level, currentPointsPerLevel);

let usedRathena = 0, usedCurrent = 0;
for (const [name, val] of Object.entries(stats)) {
  const spentR = statPointsSpent(val, rathenaStatCost);
  const spentC = statPointsSpent(val, currentStatCost);
  console.log(`  ${name}=${val}: rAthena=${spentR}, current=${spentC}`);
  usedRathena += spentR;
  usedCurrent += spentC;
}

console.log(`\nTotal available: rAthena=${totalRathena}, current=${totalCurrent}`);
console.log(`Total used:      rAthena=${usedRathena}, current=${usedCurrent}`);
console.log(`Remaining:       rAthena=${totalRathena - usedRathena}, current=${totalCurrent - usedCurrent}`);
console.log(`User expects: 6`);
