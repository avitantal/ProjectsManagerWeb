import { describe, it, expect, vi, beforeEach } from 'vitest';
import { formatDate, formatDateTime, daysUntil, formatLifetime } from '../lib/utils';

describe('formatDate', () => {
  it('returns dash for null', () => {
    expect(formatDate(null)).toBe('—');
  });

  it('formats a valid date', () => {
    const result = formatDate('2025-06-15');
    expect(result).toMatch(/\d{2}[./-]\d{2}[./-]\d{2}/);
    expect(result).not.toBe('—');
  });
});

describe('daysUntil', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-10T12:00:00Z'));
  });

  it('returns null for null input', () => {
    expect(daysUntil(null)).toBeNull();
  });

  it('returns positive days for future date', () => {
    expect(daysUntil('2025-06-15')).toBeGreaterThan(0);
  });

  it('returns negative days for past date', () => {
    expect(daysUntil('2025-06-01')).toBeLessThan(0);
  });
});

describe('formatLifetime', () => {
  it('returns "פחות מיום" for under 1 day', () => {
    const now = new Date().toISOString();
    expect(formatLifetime(now, null)).toBe('פחות מיום');
  });

  it('returns "יום" for exactly 1 day', () => {
    const created = new Date(Date.now() - 86_400_000).toISOString();
    expect(formatLifetime(created, null)).toBe('יום');
  });

  it('returns days string for 3 days', () => {
    const created = new Date(Date.now() - 3 * 86_400_000).toISOString();
    expect(formatLifetime(created, null)).toBe('3 ימים');
  });

  it('uses closedAt when provided', () => {
    const created = '2025-01-01T00:00:00Z';
    const closed = '2025-01-08T00:00:00Z';
    expect(formatLifetime(created, closed)).toBe('שבוע');
  });
});

describe('formatDateTime', () => {
  it('returns dash for null', () => {
    expect(formatDateTime(null)).toBe('—');
  });

  it('formats a valid datetime', () => {
    const result = formatDateTime('2025-06-15T10:30:00Z');
    expect(result).toBeTruthy();
    expect(result).not.toBe('—');
  });
});
