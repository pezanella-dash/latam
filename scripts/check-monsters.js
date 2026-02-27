const fs = require('fs');
const j = JSON.parse(fs.readFileSync('C:/tmp/mob80.json', 'utf8'));
console.log('total:', j.total, 'returned:', j.monsters.length);
const broken = j.monsters.filter(m => !m.name || !m.level);
console.log('broken monsters:', broken.length);
j.monsters.slice(0, 5).forEach(m => {
  console.log(m.id, m.name, 'hp:', m.hp, 'atk:', m.attack, 'drops:', m.drops?.length);
});
// Check for any with missing stats
const noStats = j.monsters.filter(m => !m.stats);
console.log('missing stats:', noStats.length);
