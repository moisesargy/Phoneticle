// Shared banned-clue detection. See ../PUZZLE_STYLE_GUIDE.md ("Banned clue content").
// Returns a reason string if a clue's text is banned, otherwise null.
const PATTERNS = [
  [/rhymes? with|rhyming/i, '"rhymes with" clue'],
  [/\b(indefinite|definite) article\b|\barticle\b/i, 'grammar jargon (article)'],
  [/\b(suffix|prefix|comparative|superlative|conjunction|preposition|pronoun|modal verb|adverb|adjective|interjection|syllable|phoneme|consonant|vowel|latin root)\b/i, 'grammar/linguistics jargon'],
  [/\bthe letter (after|before|that comes|right after)\b|\b(first|last|\d+(st|nd|rd|th)) letter of the alphabet\b/i, 'alphabet riddle'],
  [/exclamation of|hesitation sound|sound you make when/i, 'exclamation/filler'],
  [/sounds? like the letter|like the letter [A-Z]\b/i, 'letter-sound confirmation'],
  [/\bdo-re-mi\b|alternately spelled|also spelled/i, 'obscure trivia'],
  [/\bcasual (word|way|term|greeting)\b|\binformal (word|short|name|nickname|slang)\b|\b(common )?nickname for\b|\bslang for\b|\bshort for\b|\b(common )?abbreviation for\b|\bobviously\b/i, 'vague slang/nickname/abbreviation clue'],
];

function bannedReason(clue) {
  if (!clue || clue.type !== 'text') return null;
  for (const [re, why] of PATTERNS) if (re.test(clue.content)) return why;
  return null;
}

module.exports = { bannedReason, PATTERNS };
