const items = require('../data/database/items.json');
const mobs = require('../data/database/monsters.json');
const skills = require('../data/database/skills.json');
const aegis = require('../data/database/aegis-to-id.json');

console.log('=== ITEMS ===');
console.log('Total:', items.length);
const withPt = items.filter(i => i.namePt && i.namePt !== i.nameEn).length;
console.log('With pt-BR name:', withPt);
console.log('Weapons:', items.filter(i => i.type === 'Weapon').length);
console.log('Armor:', items.filter(i => i.type === 'Armor').length);
console.log('Cards:', items.filter(i => i.type === 'Card').length);
console.log('Usable:', items.filter(i => i.type === 'Usable' || i.type === 'Healing' || i.type === 'DelayConsume').length);
console.log('LATAM-exclusive (GRF only):', items.filter(i => i.type === 'Unknown').length);

// Samples
const samples = [1201, 2346, 4001, 2101, 1101];
for (const id of samples) {
  const item = items.find(i => i.id === id);
  if (item) {
    console.log(`  [${id}] ${item.namePt || item.nameEn} | Type:${item.type} ATK:${item.attack||'-'} DEF:${item.defense||'-'} Slots:${item.slots}`);
  }
}

console.log('\n=== MONSTERS ===');
console.log('Total:', mobs.length);
console.log('MVPs:', mobs.filter(m => m.isMvp).length);
console.log('With drops:', mobs.filter(m => m.drops.length > 0).length);
console.log('Avg drops per mob:', (mobs.reduce((s, m) => s + m.drops.length, 0) / mobs.length).toFixed(1));

// Sample mobs
const sampleMobs = ['PORING', 'EDDGA', 'BAPHOMET', 'MOONLIGHT_FLOWER', 'SCORPION'];
for (const name of sampleMobs) {
  const m = mobs.find(mob => mob.aegisName === name);
  if (m) {
    console.log(`  ${m.name} (Lv${m.level}) HP:${m.hp} ATK:${m.attack} ${m.isMvp?'[MVP]':''} Drops:${m.drops.length} Race:${m.race} Elem:${m.element}`);
  }
}

console.log('\n=== SKILLS ===');
console.log('Total:', skills.length);
const sampleSkills = ['SM_BASH', 'MG_FIREBOLT', 'AL_HEAL', 'KN_BRANDISHSPEAR'];
for (const name of sampleSkills) {
  const s = skills.find(sk => sk.aegisName === name);
  if (s) {
    console.log(`  ${s.aegisName}: "${s.description}" MaxLv:${s.maxLevel} Type:${s.type}`);
  }
}

console.log('\n=== AEGIS LOOKUP ===');
console.log('Total mappings:', Object.keys(aegis).length);
console.log('Poring_Card →', aegis['Poring_Card']);
console.log('Jellopy →', aegis['Jellopy']);

// Cross-reference: resolve Poring drops to item names
const poring = mobs.find(m => m.aegisName === 'PORING');
if (poring) {
  console.log('\nPoring drops resolved:');
  for (const drop of poring.drops) {
    const itemId = aegis[drop.aegisName];
    const item = itemId ? items.find(i => i.id === itemId) : null;
    console.log(`  ${drop.aegisName} → ${item ? item.namePt || item.nameEn : '?'} (${(drop.rate/100).toFixed(2)}%)`);
  }
}

console.log('\n=== SUMMARY ===');
console.log(`${items.length} items | ${mobs.length} monsters (${mobs.filter(m=>m.isMvp).length} MVPs) | ${skills.length} skills`);
console.log(`${withPt} items with Portuguese names from LATAM client`);
console.log('Database ready for AI integration!');
