import { describe, it, expect } from 'vitest';
import { computeVisibleRows, firstSelectableIndex } from '../src/core/visibleRows.js';

const groups = [
  { id: 'g1', label: 'Europe', disabled: false, collapsed: false },
  { id: 'g2', label: 'Asia', disabled: false, collapsed: true },
];

const items = [
  { id: '1', label: 'France', groupId: 'g1', disabled: false },
  { id: '2', label: 'Germany', groupId: 'g1', disabled: true },
  { id: '3', label: 'Japan', groupId: 'g2', disabled: false },
  { id: '4', label: 'Canada', groupId: null, disabled: false },
];

describe('computeVisibleRows', () => {
  it('interleaves group headers with their items and appends ungrouped items last', () => {
    const rows = computeVisibleRows(items, groups, '');
    expect(rows.map((r) => (r.kind === 'group' ? `g:${r.group.id}` : `i:${r.item.id}`))).toEqual([
      'g:g1',
      'i:1',
      'i:2',
      'g:g2',
      'i:4',
    ]);
  });

  it('hides items in a collapsed group but keeps its header (so it can be expanded)', () => {
    const rows = computeVisibleRows(items, groups, '');
    expect(rows.find((r) => r.kind === 'item' && r.item.id === '3')).toBeUndefined();
    expect(rows.find((r) => r.kind === 'group' && r.group.id === 'g2')).toBeDefined();
  });

  it('reveals matches inside a collapsed group while searching', () => {
    const rows = computeVisibleRows(items, groups, 'japan');
    expect(rows.map((r) => (r.kind === 'group' ? `g:${r.group.id}` : `i:${r.item.id}`))).toEqual(['g:g2', 'i:3']);
  });

  it('omits a group header entirely when it has no matches', () => {
    const rows = computeVisibleRows(items, groups, 'canada');
    expect(rows.some((r) => r.kind === 'group')).toBe(false);
    expect(rows).toHaveLength(1);
  });
});

describe('firstSelectableIndex', () => {
  // rows: [0: group g1, 1: item 1 (enabled), 2: item 2 (disabled),
  //        3: group g2 (collapsed header), 4: item 4 (enabled, ungrouped)]
  it('skips disabled items and group headers moving forward', () => {
    const rows = computeVisibleRows(items, groups, '');
    expect(firstSelectableIndex(rows, -1, 1)).toBe(1);
    expect(firstSelectableIndex(rows, 1, 1)).toBe(4);
  });

  it('returns -1 when nothing selectable remains', () => {
    const rows = computeVisibleRows(items, groups, '');
    expect(firstSelectableIndex(rows, 4, 1)).toBe(-1);
  });

  it('walks backward when direction is -1', () => {
    const rows = computeVisibleRows(items, groups, '');
    expect(firstSelectableIndex(rows, rows.length, -1)).toBe(4);
  });
});
