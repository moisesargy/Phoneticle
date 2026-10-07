// Audits EVERY puzzle in the game (Classic, Daily archive, Author's Puzzle)
// for banned clue content and structural problems. Run before shipping any
// puzzle change: node tools/audit_all.js
const fs = require('fs');
const path = require('path');
const { bannedReason } = require('./banned_clues');

const ROOT = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
function buildLevelHints() { return []; }
const levels = eval(html.match(/const CLASSIC_LEVELS = (\[[\s\S]*?\n  \]);/)[1]);
const archive = JSON.parse(fs.readFileSync(path.join(ROOT, 'puzzles-archive.json'), 'utf8'));
const author = JSON.parse(fs.readFileSync(path.join(ROOT, 'author-puzzles-archive.json'), 'utf8'));

const all = [];
levels.forEach(l => all.push({ where: 'Classic L' + l.level, p: l }));
archive.days.forEach((d, i) => ['easy', 'medium', 'hard'].forEach(k => all.push({ where: 'Daily D' + i + k[0], p: d[k] })));
author.days.forEach((p, i) => all.push({ where: 'Author #' + i, p, skipBanned: true }));

const minBy = { easy: 3, medium: 3, hard: 4 };
let problems = 0;
const seenAnswers = new Map();
all.forEach(({ where, p, skipBanned }) => {
  const issues = [];
  p.clues.forEach(c => {
    const why = skipBanned ? null : bannedReason(c);
    if (why) issues.push('[' + why + '] "' + c.content + '"=>' + c.sound);
    if (c.type === 'big' && c.content.length > 1) issues.push('multi-letter big: ' + c.content);
    if (c.type === 'text' && c.content.split(/\s+/).length > 8) issues.push('>8 words: "' + c.content + '"');
  });
  if (p.clues.length < minBy[p.difficulty]) issues.push('too few clues (' + p.clues.length + ')');
  if (new Set(p.clues.map(c => c.type)).size < 2) issues.push('only one clue type');
  if (p.clues.filter(c => c.type === 'big').length > 1) issues.push('more than one big clue');
  const seen = new Set();
  p.clues.forEach(c => { const k = c.type + '|' + c.content; if (seen.has(k)) issues.push('duplicate clue "' + c.content + '"'); seen.add(k); });
  const norm = p.answer.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (seenAnswers.has(norm)) issues.push('duplicate answer (also ' + seenAnswers.get(norm) + ')');
  seenAnswers.set(norm, where);
  if (issues.length) { problems++; console.log(where + ' ' + p.answer + '\n    ' + issues.join('\n    ')); }
});
console.log('\nPuzzles audited:', all.length, '| puzzles with problems:', problems);
process.exitCode = problems ? 1 : 0;
