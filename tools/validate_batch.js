// Structural validator for a batch of new Daily-archive days before merging.
// Usage: node tools/validate_batch.js <batchFile.js>
// batchFile.js must `module.exports` an array of day() objects (see gen_helpers.js).
//
// This catches STRUCTURAL rule violations only (duplicate clues/answers, clue-count
// minimums, single-letter big-clue cap, word-length cap, banned phrase patterns,
// type diversity). It does NOT verify that a puzzle's clue sounds actually
// concatenate to the real pronunciation of the answer - that requires an actual
// read-through of every puzzle by whoever (or whatever) generated it. See
// PUZZLE_STYLE_GUIDE.md and the "Weekly Daily-archive top-up" section for the
// full required process.
const fs = require('fs');
const path = require('path');

const batchPath = process.argv[2];
if (!batchPath) {
  console.error('Usage: node validate_batch.js <batchFile.js>');
  process.exit(1);
}

const ROOT = path.resolve(__dirname, '..');
const archive = JSON.parse(fs.readFileSync(path.join(ROOT, 'puzzles-archive.json'), 'utf8'));
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const classicMatch = html.match(/const CLASSIC_LEVELS = (\[[\s\S]*?\n  \]);/);
function buildLevelHints() { return []; }
const levels = eval(classicMatch[1]);

const existing = [];
archive.days.forEach(d => ['easy', 'medium', 'hard'].forEach(k => existing.push(d[k].answer)));
levels.forEach(l => existing.push(l.answer));
const existingSet = new Set(existing.map(a => a.toLowerCase().replace(/[^a-z0-9]/g, '')));

const newDays = require(path.resolve(batchPath));
const minByDiff = { easy: 3, medium: 4, hard: 4 };
let issues = 0;
const seenInBatch = new Set();

newDays.forEach((day, di) => {
  ['easy', 'medium', 'hard'].forEach(diff => {
    const p = day[diff];
    if (!p) { console.log('MISSING', di, diff); issues++; return; }
    if (p.difficulty !== diff) { console.log('DIFF MISMATCH', di, diff, p.answer); issues++; }
    const norm = p.answer.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (existingSet.has(norm)) { console.log('DUP vs EXISTING', di, diff, p.answer); issues++; }
    if (seenInBatch.has(norm)) { console.log('DUP WITHIN BATCH', di, diff, p.answer); issues++; }
    seenInBatch.add(norm);
    if (p.clues.length < minByDiff[diff]) { console.log('COUNT VIOLATION', di, diff, p.answer, p.clues.length); issues++; }
    const seenClue = new Set();
    p.clues.forEach(c => {
      const k = c.type + '|' + c.content;
      if (seenClue.has(k)) { console.log('DUP CLUE', di, diff, p.answer, JSON.stringify(c)); issues++; }
      seenClue.add(k);
      if (c.type === 'big' && c.content.length > 1) { console.log('MULTI-LETTER BIG', di, diff, p.answer, c.content); issues++; }
      if (c.type === 'text' && c.content.split(/\s+/).length > 8) { console.log('TOO LONG', di, diff, p.answer, c.content); issues++; }
      if (c.type === 'text' && /exclamation of|hesitation sound|sound you make when/i.test(c.content)) { console.log('BANNED PATTERN', di, diff, p.answer, c.content); issues++; }
    });
    if (new Set(p.clues.map(c => c.type)).size < 2) { console.log('TYPE DIVERSITY', di, diff, p.answer); issues++; }
    const bigCount = p.clues.filter(c => c.type === 'big').length;
    if (bigCount > 1) { console.log('TOO MANY BIG', di, diff, p.answer, bigCount); issues++; }
  });
});
console.log('Batch size:', newDays.length, 'days | Structural issues:', issues);
if (issues === 0) {
  console.log('Structural checks passed. Did you still manually verify every clue sequence actually reconstructs its answer aloud? That step is not automated.');
}
