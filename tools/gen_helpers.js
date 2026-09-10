// Shared helpers for authoring new Daily-archive puzzle days.
// See ../PUZZLE_STYLE_GUIDE.md for the full content rules.
function buildHints(n, hintText) {
  const hints = [];
  for (let i = 0; i < n; i++) hints.push({ label: "Reveal clue " + (i + 1) + " sound", ci: i });
  hints.push({ label: "Give me a hint", ci: -1, text: hintText });
  hints.push({ label: "Reveal all sounds", ci: -2 });
  return hints;
}
function pz(answer, category, difficulty, clues, hint) {
  return { answer, category, difficulty, clues, hints: buildHints(clues.length, hint) };
}
function day(easy, medium, hard) { return { easy, medium, hard }; }
function t(content, sound) { return { type: "text", content, sound }; }
function e(content, sound) { return { type: "emoji", content, sound }; }
function b(content, sound) { return { type: "big", content, sound }; }
function s(content, sound) { return { type: "struck", content, sound }; }

module.exports = { buildHints, pz, day, t, e, b, s };
