import { describe, it, expect } from 'vitest';
import { filterItems, highlightLabel } from '../src/search/search.js';

const items = [
  { id: '1', label: 'Australia' },
  { id: '2', label: 'Austria' },
  { id: '3', label: 'United States' },
  { id: '4', label: 'Île-de-France' },
];

describe('filterItems', () => {
  it('returns everything, unranked, for an empty query', () => {
    const results = filterItems(items, '', {});
    expect(results.map((r) => r.item.id)).toEqual(['1', '2', '3', '4']);
    expect(results[0].ranges).toBeNull();
  });

  it('is case-insensitive', () => {
    const results = filterItems(items, 'AUSTRA', {});
    expect(results.map((r) => r.item.id)).toEqual(['1']);
  });

  it('is accent-insensitive', () => {
    const results = filterItems(items, 'ile-de-france', {});
    expect(results.map((r) => r.item.id)).toEqual(['4']);
  });

  it('ranks startsWith above contains', () => {
    const results = filterItems(items, 'aus', {});
    expect(results.map((r) => r.item.id)).toEqual(['1', '2']);
  });

  it('contains matches items where the query is in the middle', () => {
    const results = filterItems(items, 'states', {});
    expect(results.map((r) => r.item.id)).toEqual(['3']);
  });

  it('excludes non-matches when fuzzy is disabled', () => {
    const results = filterItems(items, 'usa', { fuzzy: false });
    expect(results).toHaveLength(0);
  });

  it('fuzzy-matches subsequences when enabled', () => {
    const results = filterItems(items, 'utd stts', { fuzzy: true });
    expect(results.map((r) => r.item.id)).toContain('3');
  });
});

describe('highlightLabel', () => {
  it('escapes the label and wraps matched ranges in <mark>', () => {
    const html = highlightLabel('<b>Austria</b>', [[0, 3]]);
    expect(html).toBe('<mark class="glide-highlight">&lt;b&gt;</mark>Austria&lt;/b&gt;');
  });

  it('returns escaped text unchanged when there are no ranges', () => {
    expect(highlightLabel('<script>', null)).toBe('&lt;script&gt;');
  });
});
