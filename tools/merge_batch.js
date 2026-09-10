// Appends a validated batch of new days onto puzzles-archive.json.
// Run this ONLY after validate_batch.js reports 0 structural issues AND
// every puzzle has been manually read through for phonetic correctness.
// Usage: node tools/merge_batch.js <batchFile.js>
const fs = require('fs');
const path = require('path');

const batchPath = process.argv[2];
if (!batchPath) {
  console.error('Usage: node merge_batch.js <batchFile.js>');
  process.exit(1);
}

const ROOT = path.resolve(__dirname, '..');
const ARCHIVE_PATH = path.join(ROOT, 'puzzles-archive.json');
const archive = JSON.parse(fs.readFileSync(ARCHIVE_PATH, 'utf8'));
const newDays = require(path.resolve(batchPath));
const before = archive.days.length;
archive.days.push(...newDays);
fs.writeFileSync(ARCHIVE_PATH, JSON.stringify(archive, null, 2) + '\n', 'utf8');
console.log('Merged', newDays.length, 'days.', before, '->', archive.days.length,
  '| buffer ahead of nextIndex:', archive.days.length - archive.nextIndex);
