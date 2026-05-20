import { describe, it, expect } from 'vitest';
import { normalizeText, searchFilter, highlightSegments } from '../lib/search';

describe('search engine', () => {
  it('normalizes case, whitespace and Hebrew niqqud', () => {
    expect(normalizeText('שָׁלוֹם')).toBe('שלום');
    expect(normalizeText('  Hello   World ')).toBe('hello world');
  });

  const items = [
    { id: 1, text: 'תיקון באג בסנכרון הקלנדר' },
    { id: 2, text: 'Loki bug investigation' },
    { id: 3, text: 'הוספת חיפוש למשימות ולפרויקטים' },
  ];
  const getText = (i: { text: string }) => i.text;

  it('filters by substring', () => {
    expect(searchFilter(items, 'באג', getText).map(i => i.id)).toEqual([1]);
  });

  it('AND-matches multiple tokens in any order', () => {
    expect(searchFilter(items, 'bug loki', getText).map(i => i.id)).toEqual([2]);
    expect(searchFilter(items, 'באג קלנדר', getText).map(i => i.id)).toEqual([1]);
  });

  it('is case-insensitive', () => {
    expect(searchFilter(items, 'LOKI', getText).map(i => i.id)).toEqual([2]);
  });

  it('returns the original array for an empty query', () => {
    expect(searchFilter(items, '   ', getText)).toBe(items);
  });

  it('returns no results when a token has no match', () => {
    expect(searchFilter(items, 'nonexistent', getText)).toHaveLength(0);
  });

  it('builds highlight segments that preserve the original text', () => {
    const segments = highlightSegments('Loki bug investigation', 'bug');
    expect(segments.map(s => s.text).join('')).toBe('Loki bug investigation');
    expect(segments.filter(s => s.match).map(s => s.text)).toEqual(['bug']);
  });

  it('highlights matches inside niqqud text without corrupting it', () => {
    const segments = highlightSegments('שָׁלוֹם עולם', 'שלום');
    expect(segments.map(s => s.text).join('')).toBe('שָׁלוֹם עולם');
    expect(segments.some(s => s.match)).toBe(true);
  });

  it('merges overlapping token matches', () => {
    const segments = highlightSegments('abcdef', 'abc cde');
    expect(segments.map(s => s.text).join('')).toBe('abcdef');
    expect(segments.filter(s => s.match).map(s => s.text)).toEqual(['abcde']);
  });
});
