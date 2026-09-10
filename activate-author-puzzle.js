#!/usr/bin/env node
"use strict";

/**
 * Activates the next hand-written puzzle from author-puzzles-archive.json
 * into author-puzzle.json. No API calls, no cost — just picks the next
 * entry and advances the rotation pointer, same mechanism as
 * activate-daily-puzzle.js. Cycles back to the start once the archive is
 * exhausted. Unlike the Daily archive, each entry here is a single puzzle
 * (no easy/medium/hard split) — these are meant to be hand-authored one at
 * a time, not generated in bulk. See PUZZLE_STYLE_GUIDE.md's "Author's
 * Pick" section for how new entries get added.
 *
 * If the archive is empty (no puzzles authored yet), this writes a null
 * puzzle rather than failing, so the site can show a friendly "nothing
 * yet" state instead of a broken fetch.
 */

const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const ARCHIVE_PATH = path.join(ROOT, "author-puzzles-archive.json");
const OUTPUT_PATH = path.join(ROOT, "author-puzzle.json");

const archive = JSON.parse(fs.readFileSync(ARCHIVE_PATH, "utf8"));
const dateStr = new Date().toISOString().slice(0, 10);

if (!Array.isArray(archive.days) || archive.days.length === 0) {
  const output = { date: dateStr, generatedAt: new Date().toISOString(), puzzle: null };
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2) + "\n", "utf8");
  console.log("author-puzzles-archive.json has no entries yet — wrote a null puzzle for " + dateStr + ".");
  return;
}

const idx = ((archive.nextIndex || 0) % archive.days.length + archive.days.length) % archive.days.length;
const puzzle = archive.days[idx];

const output = {
  date: dateStr,
  generatedAt: new Date().toISOString(),
  puzzle: puzzle
};

fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2) + "\n", "utf8");

archive.nextIndex = (idx + 1) % archive.days.length;
fs.writeFileSync(ARCHIVE_PATH, JSON.stringify(archive, null, 2) + "\n", "utf8");

console.log(
  "Activated author archive entry " + idx + " for " + dateStr + ": " + puzzle.answer
);
console.log(
  "Next run will use entry " + archive.nextIndex + " of " + archive.days.length +
  (archive.nextIndex === 0 ? " (archive will have cycled back to the start)" : "")
);
