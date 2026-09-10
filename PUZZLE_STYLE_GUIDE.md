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
