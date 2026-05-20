// Hebrew text utilities — see hebrew-nlp-toolkit skill for the underlying principles.
// Used for autocomplete matching: "חָלָב" (with niqqud) and "חלב" should match.

// Niqqud (vowel marks) live in Unicode block U+05B0–U+05BC, U+05BD, U+05BF, U+05C1–U+05C2, U+05C7.
// Cantillation marks (te'amim) U+0591–U+05AF. Strip both for matching.
const HEBREW_DIACRITICS_RE = /[֑-ֽֿׁ-ׂׄ-ׇׅ]/g;

// Quick check: does the string contain any Hebrew letters (U+05D0–U+05EA)?
const HEBREW_LETTER_RE = /[א-ת]/;

/**
 * Normalize a Hebrew (or mixed Hebrew/English) string for matching:
 *   - Unicode NFC
 *   - strip niqqud + te'amim
 *   - lowercase (Latin only — Hebrew has no case)
 *   - collapse whitespace + trim
 *
 * The output is intended for indexing / lookup, not display.
 */
export function normalizeHebrew(input: string): string {
  if (!input) return '';
  return input
    .normalize('NFC')
    .replace(HEBREW_DIACRITICS_RE, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function isMostlyHebrew(input: string): boolean {
  if (!input) return false;
  let hebrew = 0;
  let latin = 0;
  for (const ch of input) {
    if (HEBREW_LETTER_RE.test(ch)) hebrew++;
    else if (/[A-Za-z]/.test(ch)) latin++;
  }
  return hebrew > latin;
}
