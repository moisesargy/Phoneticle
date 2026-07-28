#!/usr/bin/env node
"use strict";

/**
 * Activates the next puzzle set from the pre-written archive (puzzles-archive.json)
 * into puzzles.json. No API calls, no cost — just picks the next entry and
 * advances the rotation pointer. Cycles back to the start once the archive
 * is exhausted, so it never runs out; refill puzzles-archive.json with a
 * fresh batch whenever you want new content instead of repeats.
 */

const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const ARCHIVE_PATH = path.join(ROOT, "puzzles-archive.json");
const OUTPUT_PATH = path.join(ROOT, "puzzles.json");

const archive = JSON.parse(fs.readFileSync(ARCHIVE_PATH, "utf8"));
if (!Array.isArray(archive.days) || archive.days.length === 0) {
  console.error("puzzles-archive.json has no days — nothing to activate.");
  process.exitCode = 1;
  return;
}

const idx = ((archive.nextIndex || 0) % archive.days.length + archive.days.length) % archive.days.length;
const day = archive.days[idx];
const dateStr = new Date().toISOString().slice(0, 10);

const output = {
  date: dateStr,
  generatedAt: new Date().toISOString(),
  easy: day.easy,
  medium: day.medium,
  hard: day.hard
};

fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2) + "\n", "utf8");

archive.nextIndex = (idx + 1) % archive.days.length;
fs.writeFileSync(ARCHIVE_PATH, JSON.stringify(archive, null, 2) + "\n", "utf8");

console.log(
  "Activated archive day " + idx + " for " + dateStr + ": " +
  day.easy.answer + " / " + day.medium.answer + " / " + day.hard.answer
);
console.log(
  "Next run will use day " + archive.nextIndex + " of " + archive.days.length +
  (archive.nextIndex === 0 ? " (archive will have cycled back to the start — refill it with fresh puzzles when convenient)" : "")
);
