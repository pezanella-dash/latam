const items = require('../data/database/items.json');
console.log('Total items:', items.length);

let withPt = 0;
let noPt = 0;
let corruptPt = 0;
const sampleNoPt = [];
const sampleCorrupt = [];

for (const i of items) {
  if (i.namePt && i.namePt !== i.nameEn) {
    // Check for corrupted encoding
    if (/[\uFFFD]|[ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞß]/.test(i.namePt) && !/[a-zA-Z]/.test(i.namePt)) {
      corruptPt++;
      if (sampleCorrupt.length < 10) sampleCorrupt.push({ id: i.id, pt: i.namePt, en: i.nameEn });
    }
    withPt++;
  } else {
    noPt++;
    if (sampleNoPt.length < 10) sampleNoPt.push({ id: i.id, pt: i.namePt, en: i.nameEn });
  }
}

console.log('With namePt (different from EN):', withPt);
console.log('Without namePt or same as EN:', noPt);
console.log('Possibly corrupt encoding:', corruptPt);
console.log('\n--- Sample without PT name ---');
sampleNoPt.forEach(i => console.log(i.id, '|', JSON.stringify(i.pt), '|', i.en));
console.log('\n--- Sample corrupt encoding ---');
sampleCorrupt.forEach(i => console.log(i.id, '|', JSON.stringify(i.pt), '|', i.en));

// Search for "memoravel" style items
console.log('\n--- Items with "chapeu" or "hat" in name ---');
const hats = items.filter(i => {
  const name = ((i.namePt || '') + ' ' + (i.nameEn || '')).toLowerCase();
  return name.includes('memorable') || name.includes('memorável');
});
hats.forEach(i => console.log(i.id, '|', i.namePt, '|', i.nameEn));
