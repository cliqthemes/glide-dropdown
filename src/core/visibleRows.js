import { filterItems } from '../search/search.js';

/**
 * Derives the flat list of rows the dropdown should render: group headers
 * interleaved with their matching options, in source order. A pure function
 * of (items, groups, query) so it's trivial to unit test and cheap to
 * recompute on every keystroke.
 *
 * Collapsed groups hide their rows — unless the user is actively searching,
 * in which case matches always surface regardless of collapse state (a
 * collapsed group shouldn't be able to hide search results).
 */
export function computeVisibleRows(items, groups, query, { fuzzy = false } = {}) {
  const matches = filterItems(items, query, { fuzzy });
  const matchByGroup = new Map();
  for (const group of groups) matchByGroup.set(group.id, []);
  const ungrouped = [];

  for (const match of matches) {
    const groupId = match.item.groupId;
    if (groupId != null && matchByGroup.has(groupId)) matchByGroup.get(groupId).push(match);
    else ungrouped.push(match);
  }

  const rows = [];
  const isSearching = query.trim().length > 0;

  for (const group of groups) {
    const groupMatches = matchByGroup.get(group.id);
    if (groupMatches.length === 0) continue;
    rows.push({ kind: 'group', group });
    if (group.collapsed && !isSearching) continue;
    for (const match of groupMatches) {
      rows.push({ kind: 'item', item: match.item, ranges: match.ranges });
    }
  }

  for (const match of ungrouped) {
    rows.push({ kind: 'item', item: match.item, ranges: match.ranges });
  }

  return rows;
}

export function firstSelectableIndex(rows, fromIndex = -1, direction = 1) {
  const step = direction >= 0 ? 1 : -1;
  let index = fromIndex + step;
  while (index >= 0 && index < rows.length) {
    const row = rows[index];
    if (row.kind === 'item' && !row.item.disabled) return index;
    index += step;
  }
  return -1;
}
