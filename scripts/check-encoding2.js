const items = require('../data/database/items.json');

// Really corrupted: names with NO ascii letters at all (Korean garbage decoded as Latin-1)
const corrupted = items.filter(i => {
  const name = i.namePt || '';
  if (!name || name.length < 2) return false;
  // If name has zero ASCII letters (a-z, A-Z), it's garbage
  if (!/[a-zA-Z]/.test(name)) return true;
  return false;
});

console.log('Truly corrupted items:', corrupted.length);
corrupted.slice(0, 30).forEach(i => {
  console.log(i.id, '| PT:', JSON.stringify(i.namePt), '| EN:', i.nameEn || '(none)');
});

// How many have a valid English name to fall back to?
const withEn = corrupted.filter(i => i.nameEn && /[a-zA-Z]/.test(i.nameEn));
console.log('\nWith valid English fallback:', withEn.length, '/', corrupted.length);
