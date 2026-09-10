# Phoneticle Puzzle Style Guide

Rules for writing or editing any puzzle content — Classic Mode
(`CLASSIC_LEVELS` in `index.html`) and Daily Mode
(`puzzles-archive.json`). Read this before authoring or editing a
single clue.

**This is a living document.** Whenever the user gives a new
instruction about puzzle content or design, add it here — with a
one-line rationale if one was given — before the session ends, and
commit it alongside whatever puzzle changes prompted it. Don't wait to
be asked to update it.

## Clue type caps

- At most **one** `"big"` (bold letter/fragment) clue per puzzle, and
  it must be a **single character**. No multi-letter fragments like
  `"THE"`, `"KRIS"`, `"MOD"` — even as the one allowed big clue.
  Stacking bold letters spells the answer out directly; that isn't a
  clue.
- At most **one** `"text"` (definition) clue per puzzle where
  feasible. Favor emoji, a struck-antonym pair, or the one allowed
  big letter instead. Text is fine when nothing else fits — just cap
  it at one.
- Text clue wording: **max ~8 words**. Cut long "as in ___" examples
  when the core definition alone already nails it.
- **One clue = one idea, no exceptions.** Never stack a definition
  with a redundant confirmation, e.g. "To use your eyes, like the
  letter C" — the second half adds nothing; cut to "To use your eyes."

## Banned clue content

- No "Exclamation of X" clues, no "hesitation sound", no "sound you
  make when..." — cheap filler that doesn't require real thought.
- No bare vowel-sound-quality descriptions ("Open vowel sound, as in
  'father'", "Short vowel sound of the letter U") — same category as
  the exclamation ban, just dressed up.
- **Letter-identity clues are the allowed fallback** for a lone
  letter or vowel sound: "The letter after D", "The first letter of
  the alphabet", "The letter that comes before Q". These require
  actually knowing the alphabet, unlike a vowel-quality description.
- No literal restating of the answer's real meaning.
- No spelling out a chunk of a proper noun's actual name via multiple
  "big" fragments (e.g. "KRIS" for Chris, "DEZ" for Mendes) — not
  genuine wordplay, just a shortcut.

## Answer selection

- Don't use "thin" name answers. A real person/character name is
  fine **only** if it has enough genuine material (real words, emoji)
  to build clues without falling back on bare letters plus filler.
  - Fine: Dumbledore, Beethoven, Hermione, Kardashian, Einstein —
    rich material to work with.
  - Bad: Selena — nothing but "SELL" + two bare letters + filler.
- Movie/show titles that aren't just a person's name (Stranger
  Things, The Office, Toy Story) are always fine regardless of the
  above.

## Structural requirements

- Clue-count minimums: easy ≥ 3, medium ≥ 4, hard ≥ 4.
- 2+ distinct clue types per puzzle (never all-text, never all-big).
- No duplicate clue (same type + content) within one puzzle.
- No duplicate answer across Classic Mode and the Daily archive, or
  within the Daily archive.
- Struck clues need a genuine dictionary antonym pair.
- Every clue's `sound` must concatenate correctly with the others to
  actually reconstruct the answer's real pronunciation. Never pad
  with an extra sound that doesn't belong just to hit the clue-count
  minimum — that's how a puzzle stops making sense.

## Fallback techniques for stubborn fragments

When no emoji/struck/real-word clue fits a fragment:

- Rhyme: "Rhymes with 'stir'"
- Letter identity: "The letter after T"
- Consonant blend: "The consonant blend at the start of 'stop'"
- Prefer emoji over text whenever a natural pictograph exists for the
  sound — it's the most visual, least-reading option.

## Before shipping any puzzle-content change

- Verify: no exclamation-style or vowel-quality clues, ≤1 big clue
  (single char), ≤1 text clue where feasible, ≤8 words per clue, no
  duplicate clues/answers, clue-count minimums met, 2+ clue types.
- Verify JS/JSON syntax is still valid before committing.

## Weekly Daily-archive top-up (recurring)

A scheduled task runs every **Saturday morning** and adds **10 new
days (30 puzzles: 10 easy + 10 medium + 10 hard)** to
`puzzles-archive.json`. This keeps the archive's day count growing
faster than the rotation consumes it (1 day/day = 7/week; 10/week
added), so the "which day repeats when" cycle described in
`activate-daily-puzzle.js` never actually has to wrap.

Process for that run (or for any manual batch-authoring session):

1. Read this whole file first.
2. Use `tools/gen_helpers.js` to author 10 new `day()` objects (30
   puzzles) as a batch script — see `tools/gen_helpers.js` for the
   `pz`/`day`/`t`/`e`/`b`/`s` builder functions.
3. **Manually read every single puzzle's clue sequence and confirm it
   phonetically reconstructs the answer when spoken aloud in order.**
   This is the step that actually catches real bugs — a redundant
   clue that overlaps a chunk already covered by an earlier clue (e.g.
   an emoji for "BLUE" plus a separate clue that also tries to
   produce part of "blue") is a common mistake that no automated
   check below can catch on its own.
4. Run `node tools/validate_batch.js <yourBatch.js>` — this only
   catches structural issues (duplicate answers/clues, clue-count
   minimums, the single-letter big-clue cap, word-length cap, banned
   clue patterns, type diversity). A clean run here is necessary but
   NOT sufficient — step 3 still has to happen.
5. Fix anything flagged, re-run steps 3-4 until clean.
6. `git fetch`/merge first (the daily-activation cron may have pushed
   same-day), then `node tools/merge_batch.js <yourBatch.js>`.
7. Run the full-archive validation (same checks as step 4, but against
   the whole `puzzles-archive.json`, not just the new batch) to catch
   anything the merge could have disturbed.
8. Commit and push.

If a week's run is ever skipped or fails, nothing breaks immediately —
`activate-daily-puzzle.js` just wraps to day 0 once the buffer runs
out, same as it always has. The buffer built up week over week is the
safety margin for exactly that scenario.

## Author's Pick mode

A third mode alongside Classic and Daily: one hand-authored puzzle a
day, written by Phoneticle's creator (not generated). Data lives in
`author-puzzles-archive.json` (same `{days, nextIndex}` rotation shape
as the Daily archive, but each entry is a single puzzle object, not an
easy/medium/hard set), activated daily into `author-puzzle.json` by
`activate-author-puzzle.js` in the same GitHub Actions workflow as
Daily Mode. If the archive is empty, activation writes a null puzzle
and the site shows a "no puzzles yet" state rather than erroring.

**How entries get added:** the creator describes a new puzzle in a
chat session; whoever's assisting (Claude) encodes it into the
correct format, validates it the same way as any other puzzle (see
"Before shipping any puzzle-content change" above — still applies
here even though there's no batch/rotation-buffer concern for a
single entry), appends it to `author-puzzles-archive.json`, and
commits. There's no in-app authoring form.

**These entries are also a style reference.** Because they're written
by the person who set every rule in this document, they're the
clearest signal available for what "good" looks like beyond the
written rules — which clue types get reached for, how terse the
wording is, what kind of wordplay gets used for a given sound. Before
writing new Daily-archive content (the weekly top-up run included),
skim the current entries in `author-puzzles-archive.json` if any
exist, and lean toward matching that style where this document doesn't
already dictate something specific.

**Observed style notes** (update this list as more entries come in):

- Comfortable stacking celebrity/pop-culture trivia across every clue
  in a puzzle (e.g. "Kendrick Lamar" = male Barbie + Drake's real name
  + a lamb emoji + "automatic rifle, for short") even when that means
  every remaining clue is "text" type. The 2+ clue-type rule bent for
  this puzzle only because a clean, non-forced emoji fit (🐑 for LAMB)
  was available — the fix was "use the one that's obviously better,"
  not "hit the type quota." Don't force a type-diversity fix that
  waters down a clue just to satisfy the rule; ask first if no natural
  fit exists, the way this one got resolved.
- Willing to lean on layered, moderately obscure trivia (an NFL wide
  receiver's first name, a rapper's legal name) rather than sticking
  to widely-known facts — depth over accessibility, for this mode at
  least.
