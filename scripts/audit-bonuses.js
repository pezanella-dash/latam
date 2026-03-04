const items = require('../data/database/items.json');
const bonusCounts = {};
items.forEach(i => {
  if (i.script == null) return;
  const matches = i.script.matchAll(/\b(bonus\d?)\s+(b\w+)/g);
  for (const m of matches) {
    const key = m[1] + ' ' + m[2];
    bonusCounts[key] = (bonusCounts[key] || 0) + 1;
  }
});
const sorted = Object.entries(bonusCounts).sort((a,b) => b[1] - a[1]);
sorted.forEach(([key, count]) => console.log(count.toString().padStart(5), key));

// Also check for bonus3/bonus4
console.log('\n--- bonus3/bonus4 patterns ---');
const b34 = {};
items.forEach(i => {
  if (i.script == null) return;
  const matches = i.script.matchAll(/\b(bonus[34])\s+(b\w+)/g);
  for (const m of matches) {
    const key = m[1] + ' ' + m[2];
    b34[key] = (b34[key] || 0) + 1;
  }
});
Object.entries(b34).sort((a,b) => b[1] - a[1]).forEach(([key, count]) => console.log(count.toString().padStart(5), key));

// Check for autobonus
console.log('\n--- autobonus ---');
const autoCount = items.filter(i => i.script && i.script.includes('autobonus')).length;
console.log('Items with autobonus:', autoCount);

// Check for special keywords
console.log('\n--- special keywords ---');
['bNoSizeFix', 'bAtkEle', 'bDefEle', 'bMagicAtkEle', 'bMagicAddRace', 'bWeaponAtkRate', 'bWeaponMatkRate', 'bAddDamageClass', 'bAddMagicDamageClass', 'bAddItemHealRate', 'bHPrecovRate', 'bSPrecovRate', 'bNoWeaponDamage', 'bIgnoreDefClass', 'bIgnoreMDefClass'].forEach(kw => {
  const count = items.filter(i => i.script && i.script.includes(kw)).length;
  if (count > 0) console.log(`  ${kw}: ${count} items`);
});
