#!/usr/bin/env node
"use strict";

/**
 * Generates today's three Daily Mode puzzles (easy/medium/hard) via the
 * Claude API and writes them to puzzles.json. Run locally (reads .env) or
 * in CI (reads ANTHROPIC_API_KEY from the environment / a GitHub secret).
 *
 * This intentionally mirrors the prompt, parsing, and antonym-correction
 * logic that used to live client-side in index.html, so puzzle quality and
 * correctness guarantees carry over unchanged.
 */

const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const OUTPUT_PATH = path.join(ROOT, "puzzles.json");

// ---------- .env loader (local runs only; CI sets the env var directly) ----------
function loadDotEnvIfPresent() {
  const envPath = path.join(ROOT, ".env");
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadDotEnvIfPresent();

const API_KEY = process.env.ANTHROPIC_API_KEY;
if (!API_KEY) {
  console.error("ANTHROPIC_API_KEY is not set (checked process.env and .env). Aborting.");
  process.exit(1);
}

const DAILY_DIFFS = ["easy", "medium", "hard"];

// ---------- hint helpers (ported from index.html) ----------
function h(clueIdx, label) { return { label, ci: clueIdx }; }
function textHint(label, text) { return { label, ci: -1, text }; }
function allHint() { return { label: "Reveal all sounds", ci: -2 }; }
function buildLevelHints(clueCount, flavorLabel, flavorText) {
  const hints = [];
  for (let i = 0; i < clueCount; i++) hints.push(h(i, "Reveal clue " + (i + 1) + " sound"));
  hints.push(textHint(flavorLabel, flavorText));
  hints.push(allHint());
  return hints;
}

// ---------- antonym safety net (ported verbatim from index.html) ----------
function normWordUpper(s) {
  return String(s || "").toUpperCase().replace(/[^A-Z]/g, "");
}

const ANTONYM_PAIRS = [
  ["UP","DOWN"],["HOT","COLD"],["PUSH","PULL"],["IN","OUT"],["ON","OFF"],
  ["BIG","SMALL"],["FAST","SLOW"],["DAY","NIGHT"],["TRUE","FALSE"],["WET","DRY"],
  ["OPEN","CLOSED"],["BUY","SELL"],["LOVE","HATE"],["HIGH","LOW"],["BLACK","WHITE"],
  ["BOY","GIRL"],["MAN","WOMAN"],["YES","NO"],["LEFT","RIGHT"],["EARLY","LATE"],
  ["HAPPY","SAD"],["FULL","EMPTY"],["RICH","POOR"],["OLD","NEW"],
  ["STRONG","WEAK"],["LIGHT","DARK"],["LOUD","QUIET"],["NEAR","FAR"],["HARD","SOFT"],
  ["THICK","THIN"],["WIDE","NARROW"],["DEEP","SHALLOW"],["CLEAN","DIRTY"],["SAFE","DANGEROUS"],
  ["CHEAP","EXPENSIVE"],["EASY","DIFFICULT"],["BEGIN","END"],["START","STOP"],
  ["LAUGH","CRY"],["AWAKE","ASLEEP"],["ALIVE","DEAD"],["BEFORE","AFTER"],["FIRST","LAST"],
  ["TOP","BOTTOM"],["FRONT","BACK"],["INSIDE","OUTSIDE"],["MORE","LESS"],["ALWAYS","NEVER"],
  ["SAME","DIFFERENT"],["GOOD","BAD"],["BEST","WORST"],["ME","YOU"],["HERE","THERE"],
  ["ABOVE","BELOW"],["OVER","UNDER"],["ENTER","EXIT"],["ASK","ANSWER"],["BORROW","LEND"],
  ["BUILD","DESTROY"],["FOUND","LOST"],["GIVE","TAKE"],["RAISE","LOWER"],["REMEMBER","FORGET"],
  ["SIT","STAND"],["SPEAK","LISTEN"],["FRIEND","ENEMY"],["WAR","PEACE"],["SHARP","DULL"],
  ["SMOOTH","ROUGH"],["SWEET","SOUR"],["TALL","SHORT"],["WORK","REST"],["INTERESTED","BORED"],
  ["WIN","LOSE"],["ACCEPT","REJECT"],["ARRIVE","DEPART"],["ATTACK","DEFEND"],["INCREASE","DECREASE"]
];
const ANTONYM_MAP = (function () {
  const map = new Map();
  ANTONYM_PAIRS.forEach(function (pair) {
    [[pair[0], pair[1]], [pair[1], pair[0]]].forEach(function (kv) {
      if (map.has(kv[0]) && map.get(kv[0]) !== kv[1]) {
        console.warn("ANTONYM_PAIRS ambiguous entry ignored:", kv[0], "already ->", map.get(kv[0]), "(tried ->", kv[1] + ")");
        return;
      }
      map.set(kv[0], kv[1]);
    });
  });
  return map;
})();

function fixStruckClueAntonyms(puzzle) {
  if (!Array.isArray(puzzle.clues)) return;
  puzzle.clues.forEach(function (clue) {
    if (!clue || clue.type !== "struck") return;
    const knownOpposite = ANTONYM_MAP.get(normWordUpper(clue.content));
    if (knownOpposite && normWordUpper(clue.sound) !== knownOpposite) {
      clue.sound = knownOpposite;
    }
  });
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

// ---------- prompt (ported verbatim from index.html buildSinglePuzzlePrompt) ----------
const DIFFICULTY_GUIDANCE = {
  easy: "a short, very well-known, everyday answer, assembled from about 2 to 3 clue pieces",
  medium: "a well-known, everyday answer (not obscure) assembled from about 4 to 5 clue pieces — the larger number of pieces to track and blend, not an unfamiliar answer, is what makes it trickier than easy",
  hard: "a well-known, everyday answer — still NOT obscure, technical, or niche; a typical adult should recognize it instantly once revealed — assembled from about 5 to 7 clue pieces (use 7 when a clean breakdown exists, but a strong 5-piece puzzle beats a forced 7-piece one). Difficulty must come from having more pieces to mentally hold and blend together, never from the answer itself being hard to know"
};

function buildSinglePuzzlePrompt(dateStr, difficulty) {
  const guidance = DIFFICULTY_GUIDANCE[difficulty] || DIFFICULTY_GUIDANCE.easy;
  return [
    'You are generating ONE puzzle for Phoneticle, a rebus/phonetic word puzzle game. Correctness matters far more than cleverness — a puzzle with one wrong clue is broken and unplayable.',
    '',
    'HOW A PUZZLE WORKS: players see a row of clues. Each clue, when solved and read aloud, produces a short SOUND. The sounds are strung together in order and, said quickly out loud, blend into the pronunciation of a single answer (a word or short phrase). Example: an angry-face emoji ("MAD") + a gas pump emoji ("GAS") + a car emoji ("CAR") = "Madagascar". Example: a bee emoji ("BEE") + the crossed-out word "OFF" meaning its opposite "ON" + the clue "what you do when you speak" ("SAY") = "Beyoncé".',
    '',
    'BANNED PATTERN: for multi-word answers, do not clue each of the answer\'s own words one-for-one (e.g. "Two Birds, One Stone" clued as two/birds/one/stone) — that just restates the phrase, it is not a puzzle. Every clue\'s solution must be a different word/concept than the answer\'s own words, whose SOUND just happens to match a chunk of the answer. Example: "GAY" (LGBT) + "MUFF" (a muffed punt) + "THROW" (what a QB does) + "NS" = "Game of Thrones" — none of those clue words appear in the answer.',
    '',
    'Generate exactly ONE puzzle at difficulty "' + difficulty + '": ' + guidance + '. Difficulty comes only from the clue count, never from an obscure answer — even "hard" must use an everyday, instantly-recognizable answer.',
    '',
    'RULES:',
    '- Pick an answer: a real word or short phrase (movie, country, celebrity, historical figure, brand, object, book, city, food, etc) that a typical adult would immediately recognize. Make it fresh — avoid the most common textbook examples like "Madagascar" or "Beyoncé" — but freshness means a different everyday answer, not an obscure one.',
    '- First work out the phonetic SOUNDS of the answer as spoken aloud (not the spelling), and split it into roughly the number of sound chunks called for by the difficulty above. For multi-word answers, do not default to one chunk per existing word — re-segment across word breaks so chunks don\'t line up with the answer\'s own words.',
    '- For every sound chunk invent one clue whose single, obvious solution — when said aloud — produces that sound. Prefer this order of clue types, and mix at least 2 different types per puzzle:',
    '  "emoji" (STRONGLY PREFERRED — use one whenever a sound has an emoji with an exact, unambiguous common one- or two-word spoken name) -> content is one emoji; sound is that exact common name, in capitals.',
    '  "big" -> content is a short, standard, unambiguous abbreviation/initial/fill-in fragment; sound is exactly how it is normally said aloud, in capitals.',
    '  "struck" -> content is a single common word to show crossed out; sound is its real dictionary OPPOSITE, in capitals.',
    '  "text" (use LAST, and sparingly — no more than about half the clues in a puzzle) -> content is a short clue with exactly ONE obvious answer.',
    '',
    'TIGHT-CLUE RULE FOR "text" CLUES — this is critical: a plain open-ended definition (e.g. "a container you drink coffee from") is BANNED because it usually has several equally valid one-word answers (CUP? MUG? GLASS?) and the player is left guessing which synonym you meant. Every "text" clue must instead be anchored so only one exact word can possibly complete it, using one of these techniques: (a) a fill-in-the-blank quote, idiom, or fixed phrase, e.g. "Ed ___, famous ginger singer" -> ED, or "as in \"mock ___\"" -> TRIAL-style anchoring; (b) a specific named pop-culture reference with one answer, e.g. "Grunkle ___ from Gravity Falls" -> STAN; (c) a term with no real synonym at all, e.g. "adult female horse" -> MARE. If you cannot anchor a definition this tightly, do not use a "text" clue for that sound — use "emoji", "big", or "struck" instead.',
    '- Every clue must have exactly ONE unambiguous, obvious solution — if you can think of a second plausible word that also fits, rewrite or replace the clue.',
    '- category is a short 1-3 word noun for what kind of thing the answer is (e.g. "Country", "Film", "Book", "Celebrity", "Brand", "City", "Object", "Food").',
    '- Also produce a "hints" array: one entry per clue shaped like {"label":"Reveal clue N sound","ci":<zero-indexed clue position>}; exactly one entry shaped like {"label":"Give me a hint","ci":-1,"text":"<a short flavor sentence about the answer that does NOT give it away>"}; and one final entry shaped like {"label":"Reveal all sounds","ci":-2}.',
    '- Before finalizing, briefly double-check every clue has one obvious answer, every struck word\'s sound is its true antonym, and the sounds blend into the answer when read quickly. Keep this check to a sentence or two, not an essay.',
    '- Today\'s date is ' + dateStr + ' — use only as loose inspiration for variety, never reference it in the puzzle.',
    '',
    'Output ONLY valid JSON, no markdown fences, no commentary before or after it, in EXACTLY this shape:',
    '{"answer":"...","category":"...","difficulty":"' + difficulty + '","clues":[{"type":"emoji","content":"😡","sound":"MAD"}],"hints":[{"label":"Reveal clue 1 sound","ci":0},{"label":"Give me a hint","ci":-1,"text":"A country in Africa"},{"label":"Reveal all sounds","ci":-2}]}'
  ].join("\n");
}

function parsePuzzleJSON(text) {
  let cleaned = String(text || "").trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      try { return JSON.parse(cleaned.slice(start, end + 1)); }
      catch (e2) { /* fall through */ }
    }
    throw new Error("Could not parse JSON from the model's response: " + e.message);
  }
}

function defaultHintsFor(puzzle) {
  const n = Array.isArray(puzzle.clues) ? puzzle.clues.length : 0;
  return buildLevelHints(n, "Give me a hint", "Category: " + (puzzle.category || "?"));
}

function normalizeSinglePuzzle(parsed, expectedDifficulty) {
  if (!parsed || !parsed.answer || !Array.isArray(parsed.clues) || !parsed.clues.length) {
    throw new Error("Response is missing a valid puzzle.");
  }
  parsed.difficulty = expectedDifficulty;
  fixStruckClueAntonyms(parsed);
  if (!Array.isArray(parsed.hints) || !parsed.hints.length) {
    parsed.hints = defaultHintsFor(parsed);
  }
  if (!parsed.category) parsed.category = "Mystery";
  return parsed;
}

// ---------- Claude API call (Node fetch, streaming — no browser-access header needed) ----------
// Streaming (rather than waiting for one large non-streaming response) is
// required here: with the larger max_tokens + adaptive thinking this now
// uses, a single request can take several minutes end-to-end, which trips
// Node's default fetch headers timeout (UND_ERR_HEADERS_TIMEOUT) and risks
// the Claude API's own duration limit for non-streaming requests. Streaming
// opens the connection and starts receiving data immediately, sidestepping
// both.
async function fetchSinglePuzzle(dateStr, difficulty) {
  const prompt = buildSinglePuzzlePrompt(dateStr, difficulty);
  let res;
  try {
    res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 28000,
        thinking: { type: "adaptive" },
        output_config: { effort: "medium" },
        stream: true,
        messages: [{ role: "user", content: prompt }]
      })
    });
  } catch (networkErr) {
    const causeMsg = networkErr && networkErr.cause ? (" (" + (networkErr.cause.code || networkErr.cause.message || networkErr.cause) + ")") : "";
    throw new Error(capitalize(difficulty) + " puzzle — network error reaching the Claude API: " + networkErr.message + causeMsg);
  }

  if (!res.ok) {
    let msg = "API request failed with status " + res.status;
    try {
      const errBody = await res.json();
      if (errBody && errBody.error && errBody.error.message) msg = errBody.error.message;
    } catch (e) { /* ignore */ }
    throw new Error(capitalize(difficulty) + " puzzle — " + msg);
  }

  let rawText = "";
  let stopReason = null;
  let apiError = null;
  const decoder = new TextDecoder();
  let buffer = "";
  for await (const chunk of res.body) {
    buffer += decoder.decode(chunk, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop(); // keep the last (possibly partial) line for the next chunk
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const jsonStr = line.slice(5).trim();
      if (!jsonStr) continue;
      let evt;
      try { evt = JSON.parse(jsonStr); } catch (e) { continue; }
      if (evt.type === "content_block_delta" && evt.delta && evt.delta.type === "text_delta") {
        rawText += evt.delta.text;
      } else if (evt.type === "message_delta" && evt.delta && evt.delta.stop_reason) {
        stopReason = evt.delta.stop_reason;
      } else if (evt.type === "error") {
        apiError = evt.error && evt.error.message ? evt.error.message : JSON.stringify(evt.error);
      }
    }
  }

  if (apiError) {
    throw new Error(capitalize(difficulty) + " puzzle — " + apiError);
  }
  if (!rawText) {
    if (stopReason === "refusal") {
      throw new Error(capitalize(difficulty) + " puzzle — Claude declined to generate it.");
    }
    if (stopReason === "max_tokens") {
      throw new Error(capitalize(difficulty) + " puzzle — Claude ran out of room before writing the final answer.");
    }
    throw new Error(capitalize(difficulty) + " puzzle — API response did not contain any text content" + (stopReason ? " (stop reason: " + stopReason + ")." : "."));
  }

  const parsed = parsePuzzleJSON(rawText);
  return normalizeSinglePuzzle(parsed, difficulty);
}

// ---------- main ----------
async function main() {
  const dateStr = new Date().toISOString().slice(0, 10); // UTC date — matches when GitHub Actions runs

  // The model occasionally runs out of its token budget mid-thought (see
  // index.html's git history for the same issue on the old client-side
  // generator). This runs unattended once a day, so a transient miss
  // shouldn't cost the whole day's puzzles — retry each difficulty a couple
  // of times before giving up on it.
  async function fetchWithRetries(diff, attempts) {
    let lastErr;
    for (let i = 1; i <= attempts; i++) {
      try {
        console.log("  requesting " + diff + " puzzle (attempt " + i + "/" + attempts + ")...");
        return await fetchSinglePuzzle(dateStr, diff);
      } catch (err) {
        lastErr = err;
        console.warn("  " + diff + " attempt " + i + " failed: " + (err && err.message ? err.message : err));
        // Back off before retrying so a transient network blip (e.g. a
        // momentary DNS/TLS hiccup reaching the Claude API from the runner)
        // has time to clear instead of hitting the same failure instantly.
        if (i < attempts) {
          const delayMs = 3000 * i;
          console.log("  waiting " + (delayMs / 1000) + "s before retrying " + diff + "...");
          await new Promise(function (resolve) { setTimeout(resolve, delayMs); });
        }
      }
    }
    throw lastErr;
  }

  console.log("Generating puzzles for " + dateStr + "...");
  const results = await Promise.all(
    DAILY_DIFFS.map(function (diff) {
      return fetchWithRetries(diff, 3);
    })
  );

  const output = { date: dateStr, generatedAt: new Date().toISOString() };
  DAILY_DIFFS.forEach(function (diff, i) {
    output[diff] = results[i];
    console.log("  " + diff + ": " + results[i].answer + " (" + results[i].clues.length + " clues)");
  });

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2) + "\n", "utf8");
  console.log("Wrote " + OUTPUT_PATH);
}

main().catch(function (err) {
  console.error("Failed to generate puzzles:", err && err.message ? err.message : err);
  // Prefer exitCode over process.exit() so Node drains pending I/O (in-flight
  // fetches from the other Promise.all branches) before shutting down —
  // calling exit() immediately here crashes on some Node/Windows builds
  // (libuv assertion in async.c) because it tears down handles mid-close.
  process.exitCode = 1;
});
