# Phoneticle — AI handoff

Start here. This file explains what the game is, how it runs, and how the
owner wants it maintained. It is the entry point for any AI (or person)
working on the repo. **Read `PUZZLE_STYLE_GUIDE.md` in full before
touching any puzzle content.**

Live site: https://phoneticle.pages.dev · Repo: moisesargy/Phoneticle ·
Cloudflare Pages deploys automatically from `main`.

## What the game is

Phoneticle is a phonetic rebus game ("say it out loud"). Each puzzle shows
a row of clues. Every clue stands for a *sound*; say the sounds in order
and they form the answer. Example: 🚗 (CAR) + D (DEE) + 🐝 (BEE) =
"Cardi B". Players type the answer and may spend hints (reveal one clue's
sound, a plain-language hint, or all sounds). Skipping is allowed with no
penalty.

## Modes

| Mode | Source of puzzles | Notes |
|---|---|---|
| Classic | `CLASSIC_LEVELS` array inline in `index.html` (54 levels) | Fixed order, shuffled so categories don't run in a row. Progress is stored by *answer text*, not level number. |
| Daily | `puzzles.json` (today's set), fed from `puzzles-archive.json` | 3 puzzles a day: easy, medium, hard. Must be solved in that order. Resets at midnight. |
| Author's Puzzle | `author-puzzle.json`, fed from `author-puzzles-archive.json` | One hand-crafted puzzle a day by the owner. Opens straight into the puzzle. If the archive is empty the site shows a "no puzzles yet" state. |

The app is a single-file vanilla JS SPA (`index.html`): a `state` object, a
`render()` function, delegated click handlers using `data-action`. No
build step. Progress lives in `localStorage`. Answers match after
lowercasing and stripping everything except a-z and 0-9; near-misses get a
"close" nudge.

## Data and daily rotation

- `puzzles-archive.json` = `{ days: [{easy, medium, hard}, ...], nextIndex }`.
- A GitHub Actions cron (`.github/workflows/daily-puzzles.yml`, 05:00 UTC)
  runs `activate-daily-puzzle.js` and `activate-author-puzzle.js`. They copy
  the next archive entry into `puzzles.json` / `author-puzzle.json`, advance
  `nextIndex`, then commit and push.
- When the archive runs out, activation wraps to day 0 (a repeat). The owner
  does **not** want repeats, so the archive must always stay ahead of the
  rotation pointer.
- Today the archive has **21 days**. A weekly Saturday routine is meant to
  add 10 more days (30 puzzles), but its pushes currently fail with a 403
  because the Claude GitHub App lacks write access to the repo. Until that
  is fixed, grow the archive manually (process in the style guide).

## Puzzle format

Each puzzle: `{ answer, category, difficulty, clues: [...], hints: [...] }`.
Each clue has a `type` and a `sound`; the sounds read in order must
reconstruct the answer when spoken aloud.

| Clue type | Looks like | Rules |
|---|---|---|
| `emoji` | 🐝 → BEE | Preferred whenever a natural emoji exists. |
| `text` | a short definition, e.g. "Spill a secret" → TELL | Max 8 words. At most one per puzzle where feasible. |
| `big` | one large letter | A single character only, at most one per puzzle. |
| `struck` | a crossed-out word whose opposite is the sound, e.g. ~OUT~ → IN | Must be a clean antonym pair. |
| `acronym` | letters with one highlighted | Highlight says which letter to read as a word. |
| `math` | a sum | Rare. |
| `image` | `{ content: "images/x.svg", alt, sound }` | Picture clue. See the style guide. First one is Classic level 53. |

Difficulty: easy = 3 clues, medium = 3 (4 preferred), hard = 4+. Every puzzle
needs 2+ clue types, no duplicate clues, and no answer reused anywhere
across Classic, Daily and Author. `hints` is built by
`buildLevelHints(n, "Give me a hint", "<one-sentence description>")` in
Classic; Daily/Author store the expanded array (see any entry in
`puzzles-archive.json`).

## Non-negotiable owner rules

1. **Every clue must make sense to an ordinary player.** If a clue needs
   explaining, replace it. A fragment that doesn't read naturally is a bug.
2. **Banned clue content:** "rhymes with…" clues, grammar jargon (article,
   suffix, prefix, pronoun, conjunction, consonant blend, vowel sound…),
   alphabet riddles ("the letter after D"), obscure trivia, vague slang or
   nickname clues, and exclamation or filler clues. Full list and reasons
   are in the style guide. `tools/banned_clues.js` enforces them.
3. **Never reword, tighten or "improve" a clue the owner wrote** (the
   Author's Puzzle entries especially). If one looks wrong, ask.
4. **Never force a bad fragment to hit a quota.** Pick a different answer
   instead.
5. **Whenever the owner states a new content rule, add it to
   `PUZZLE_STYLE_GUIDE.md`** in the same session.
6. No repeats. No duplicate answers across any mode.

## Tools (run from the repo root)

- `node tools/audit_all.js` — audits every puzzle in all three modes
  (banned content, clue counts, type diversity, duplicates). **Must print 0
  problems before any puzzle-content change is pushed.**
- `node tools/validate_batch.js <batch.js>` and `node tools/merge_batch.js
  <batch.js>` — validate and merge a new batch into the archive (helpers in
  `tools/gen_helpers.js`).
- Automated checks cannot confirm that a clue sequence actually *sounds*
  like the answer. Read every new puzzle aloud, clue by clue, yourself.

## Running it locally

`npx serve -l 5173 .` (also configured as `phoneticle-static` in
`.claude/launch.json`), then open http://localhost:5173. Check the browser
console for errors and test at phone width (375px) as well as desktop.

## Working agreements

- Commit and push straight to `main` (that is what deploys); keep commits
  small and described.
- Don't read, extract or reuse cached credentials (e.g. `git credential
  fill`) to call APIs for the owner.
- Windows + Git Bash quirk: inline `node -e` with backslash paths fails;
  put scripts in files.
- `index.html` is large. Edit it with targeted replacements rather than
  rewriting it.

## Known loose ends

- Weekly archive routine blocked by the GitHub App 403 (see above).
- Daily archive is only 21 days; needs more vetted puzzles
  (4+-clue answers are the scarce resource).
- The in-app "How to Play" text still says Daily puzzles are
  "AI-generated"; the owner asked earlier to drop machine-generated wording
  elsewhere, so check it.
- Classic mediums with only 3 clues were deferred by the owner.
