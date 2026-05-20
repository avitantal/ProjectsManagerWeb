/**
 * Generic, data-agnostic search engine.
 *
 * Designed to be copied as-is into other projects: it knows nothing about
 * projects, tasks, or this app. Callers describe how to extract searchable
 * text from an item, and the engine handles normalization, multi-token
 * matching, and match highlighting.
 *
 * Matching rules:
 *  - case-insensitive
 *  - Hebrew niqqud / cantillation insensitive ("שָׁלוֹם" matches "שלום")
 *  - multi-token AND ("loki bug" matches text containing both words, any order)
 *  - substring based — predictable, every keystroke narrows the result set
 */

// Hebrew niqqud + cantillation marks, plus bidi control characters that sneak
// into pasted text. Stripped before matching so they never block a hit.
const STRIP_RE = /[֑-ׇ‎‏‪-‮⁦-⁩]/g;

/** True when a code point should be dropped during length-aware folding. */
function isStrippable(code: number): boolean {
  if (code >= 0x0591 && code <= 0x05c7) return true; // Hebrew niqqud/cantillation
  if (code === 0x200e || code === 0x200f) return true; // LRM / RLM
  if (code >= 0x202a && code <= 0x202e) return true; // bidi embeddings/overrides
  if (code >= 0x2066 && code <= 0x2069) return true; // bidi isolates
  return false;
}

/** Lowercase, strip niqqud + bidi marks, collapse whitespace. */
export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(STRIP_RE, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Split a raw query into normalized, non-empty tokens. */
export function tokenizeQuery(query: string): string[] {
  return normalizeText(query).split(' ').filter(Boolean);
}

/**
 * True when every token appears as a substring of the haystack. Multi-token
 * queries are AND-matched, so word order and field boundaries don't matter.
 */
export function matchesTokens(haystack: string, tokens: string[]): boolean {
  if (tokens.length === 0) return true;
  const normalized = normalizeText(haystack);
  return tokens.every(token => normalized.includes(token));
}

/**
 * Filter `items` by `query`. `getText` returns all searchable text for an item
 * (concatenate every field you want searched). Order is preserved, so the
 * caller's existing sort is respected. An empty query returns `items` unchanged
 * (same reference) — cheap no-op while the box is empty.
 */
export function searchFilter<T>(
  items: T[],
  query: string,
  getText: (item: T) => string,
): T[] {
  const tokens = tokenizeQuery(query);
  if (tokens.length === 0) return items;
  return items.filter(item => matchesTokens(getText(item), tokens));
}

export interface HighlightSegment {
  text: string;
  match: boolean;
}

/**
 * Length-aware fold: returns the folded (lowercased, niqqud/bidi-stripped)
 * string alongside a map from each folded index back to the original index, so
 * highlight ranges found in the folded string can be projected onto the
 * untouched original text.
 */
function foldWithMap(text: string): { folded: string; map: number[] } {
  let folded = '';
  const map: number[] = [];
  for (let i = 0; i < text.length; i++) {
    if (isStrippable(text.charCodeAt(i))) continue;
    folded += text[i].toLowerCase();
    map.push(i);
  }
  return { folded, map };
}

/**
 * Split `text` into consecutive segments, flagging the ones that match any
 * query token. Matching is case- and niqqud-insensitive, but the returned
 * segments preserve the original text exactly — safe to render verbatim.
 */
export function highlightSegments(text: string, query: string): HighlightSegment[] {
  const tokens = tokenizeQuery(query);
  if (!text) return [];
  if (tokens.length === 0) return [{ text, match: false }];

  const { folded, map } = foldWithMap(text);

  // Collect match ranges in ORIGINAL-string coordinates.
  const ranges: Array<[number, number]> = [];
  for (const token of tokens) {
    let idx = folded.indexOf(token);
    while (idx !== -1) {
      const start = map[idx];
      const end = map[idx + token.length - 1] + 1;
      ranges.push([start, end]);
      idx = folded.indexOf(token, idx + token.length);
    }
  }
  if (ranges.length === 0) return [{ text, match: false }];

  // Merge overlapping / adjacent ranges.
  ranges.sort((a, b) => a[0] - b[0]);
  const merged: Array<[number, number]> = [];
  for (const [start, end] of ranges) {
    const last = merged[merged.length - 1];
    if (last && start <= last[1]) last[1] = Math.max(last[1], end);
    else merged.push([start, end]);
  }

  // Build segments from the original text.
  const segments: HighlightSegment[] = [];
  let cursor = 0;
  for (const [start, end] of merged) {
    if (start > cursor) segments.push({ text: text.slice(cursor, start), match: false });
    segments.push({ text: text.slice(start, end), match: true });
    cursor = end;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), match: false });
  return segments;
}
