/**
 * Extract translation files from the Landverse/LATAM GRF
 */
const GRF = require('grf-reader');
const fs = require('fs');
const path = require('path');

const GRF_PATH = 'C:/Program Files (x86)/Ragnarok Landverse America/data.grf';
const OUTPUT_DIR = path.join(__dirname, '..', 'data', 'grf-extracted');

// Files we want to extract
const TARGETS = [
  'data\\luafiles514\\lua files\\datainfo\\npcidentity.lub',
  'data\\luafiles514\\lua files\\datainfo\\jobname.lub',
  'data\\luafiles514\\lua files\\datainfo\\jobidentity.lub',
  'data\\luafiles514\\lua files\\datainfo\\iteminfo.lub',
  'data\\luafiles514\\lua files\\skillinfoz\\skillinfolist.lub',
  'data\\luafiles514\\lua files\\skillinfoz\\skilldescript.lub',
  'data\\luafiles514\\lua files\\skillinfoz\\skillid.lub',
];

async function main() {
  console.log('Opening GRF:', GRF_PATH);
  const g = new GRF(GRF_PATH);
  g.loadEntries();

  const entries = Object.values(g.entries);
  console.log('Total entries:', entries.length);

  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Extract target files
  for (const target of TARGETS) {
    const entry = entries.find(e => e.filename.toLowerCase() === target.toLowerCase());
    if (!entry) {
      console.log(`  NOT FOUND: ${target}`);
      continue;
    }

    try {
      const data = await g.getFile(entry.filename);
      if (data) {
        const safeName = path.basename(entry.filename);
        const outPath = path.join(OUTPUT_DIR, safeName);
        fs.writeFileSync(outPath, data);
        console.log(`  Extracted: ${safeName} (${data.length} bytes)`);
      }
    } catch (err) {
      console.error(`  Error extracting ${entry.filename}:`, err.message);
    }
  }

  console.log('\nDone!');
}

main().catch(console.error);
