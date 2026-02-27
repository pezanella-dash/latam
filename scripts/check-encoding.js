const items = require('../data/database/items.json');

// Find items with corrupted encoding (non-latin garbage characters)
const corrupted = items.filter(i => {
  const name = i.namePt || '';
  // Detect EUC-KR/CP949 garbage: sequences of high-byte Latin-1 chars like ºÎ¸£½ºÆ¼
  // These are bytes 0x80-0xFF being interpreted as Latin-1 instead of EUC-KR
  if (/[\x80-\xFF]{2,}/.test(name)) return true;
  // Also detect mojibake patterns: Ã, Â followed by unexpected chars
  if (/[À-ß][¡-¿]/.test(name) && !/[a-zA-Z\u00C0-\u024F]/.test(name.replace(/[À-ß][¡-¿]/g, ''))) return true;
  return false;
});

console.log('Items with corrupted encoding:', corrupted.length);
corrupted.slice(0, 30).forEach(i => {
  const bytes = Buffer.from(i.namePt);
  console.log(i.id, '|', JSON.stringify(i.namePt), '| bytes:', bytes.toString('hex').match(/../g).join(' '));
});

// Check: do these items have a valid nameEn from rAthena?
console.log('\n--- Do they have English names? ---');
corrupted.slice(0, 15).forEach(i => {
  console.log(i.id, '| PT:', JSON.stringify(i.namePt), '| EN:', i.nameEn);
});
