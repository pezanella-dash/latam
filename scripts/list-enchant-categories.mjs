import fs from "fs";
const items = JSON.parse(fs.readFileSync("data/database/items.json", "utf-8"));
const enchants = items.filter(i => i.type === "Card" && (!i.locations || i.locations.length === 0));

// Group by base name (remove trailing +N or +N%)
const groups = new Map();
enchants.forEach(e => {
  const n = (e.namePt || e.nameEn).trim();
  const base = n.replace(/\s*[+-]?\d+%?\s*$/, "").trim();
  if (!groups.has(base)) groups.set(base, []);
  groups.get(base).push({ name: n, script: e.script || "" });
});

console.log("Unique enchant base names:", groups.size);
console.log("\nAll base names (with count):");
[...groups.entries()]
  .sort((a, b) => a[0].localeCompare(b[0]))
  .forEach(([k, v]) => {
    console.log(`  ${k} (${v.length}) → ${v[0].script.substring(0, 50)}`);
  });

// Check what's missing - common RO enchant categories
console.log("\n\n=== MISSING CATEGORY CHECK ===");
const names = [...groups.keys()].map(k => k.toLowerCase());
const check = [
  "Pós-Conjuração", "Conjuração Variável", "Dano Físico", "Dano Mágico",
  "Dano Ranged", "Dano Melee", "Esquiva Perfeita", "Velocidade de Ataque",
  "Drenagem de HP", "Drenagem de SP", "Resistência", "Redução de Dano",
  "Taxa de Crítico", "Dano Crítico", "Recuperação de HP", "Recuperação de SP",
  "Tolerância", "Precisão", "MaxHP", "MaxSP",
  "After Cast Delay", "Variable Cast", "Fixed Cast",
  "Ranged Damage", "Physical Damage", "Magical Damage",
  "Race Damage", "Size Damage", "Element Damage",
  "Sharp", "Fighting Spirit", "Spell", "Expert Archer",
  "Muscle Fool", "Hawkeye", "Lucky Day",
];
check.forEach(c => {
  const found = names.some(n => n.toLowerCase().includes(c.toLowerCase()));
  console.log(`  ${found ? "✓" : "✗"} ${c}`);
});
