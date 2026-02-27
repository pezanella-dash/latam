const items = require('../data/database/items.json');
console.log('Total items:', items.length);
let withPt = 0;
let genericNames = 0;
for (const i of items) {
  if (i.namePt && i.namePt !== i.nameEn) withPt++;
  if (i.namePt && (i.namePt.startsWith('Equip.') || i.namePt === 'Item desconhecido')) genericNames++;
}
console.log('With real PT names:', withPt);
console.log('Still generic names (Equip./Item desconhecido):', genericNames);

// Sample searches
const searches = ['espada', 'adaga', 'anel', 'chapéu', 'capa', 'poção', 'memorável', 'vingança'];
for (const q of searches) {
  const norm = q.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const count = items.filter(i => {
    const pt = (i.namePt || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return pt.includes(norm);
  }).length;
  console.log('  ' + q + ':', count, 'results');
}
