import { normalizeText } from '../utils/normalizeText.js';
import { escapeHtml } from '../utils/escapeHtml.js';

const RANK_START = 0;
const RANK_CONTAINS = 1;
const RANK_FUZZY = 2;

function matchStartsWith(normLabel, normQuery) {
  return normLabel.startsWith(normQuery) ? [[0, normQuery.length]] : null;
}

function matchContains(normLabel, normQuery) {
  const index = normLabel.indexOf(normQuery);
  return index === -1 ? null : [[index, index + normQuery.length]];
}

/**
 * Subsequence fuzzy match: every character of the query must appear in the
 * label, in order, possibly with gaps. Score rewards contiguous runs and an
 * early match start (classic fuzzy-finder heuristic), so "ustn" scores
 * higher against "Austin" than against "United States North".
 */
function matchFuzzy(normLabel, normQuery) {
  const ranges = [];
  let score = 0;
  let labelIndex = 0;
  let runStart = -1;
  let runLength = 0;

  for (let i = 0; i < normQuery.length; i += 1) {
    const ch = normQuery[i];
    const foundAt = normLabel.indexOf(ch, labelIndex);
    if (foundAt === -1) return null;

    if (foundAt === labelIndex && runStart !== -1) {
      runLength += 1;
    } else {
      if (runStart !== -1) ranges.push([runStart, runStart + runLength]);
      runStart = foundAt;
      runLength = 1;
    }

    score += foundAt === labelIndex ? 3 : 1;
    labelIndex = foundAt + 1;
  }
  if (runStart !== -1) ranges.push([runStart, runStart + runLength]);

  score -= runStart >= 0 ? ranges[0][0] : 0;
  return { ranges, score };
}

/**
 * Filters + ranks items against a query. Empty query returns everything in
 * original order (no scoring pass, so it stays O(n) with zero allocation).
 */
export function filterItems(items, query, { fuzzy = false } = {}) {
  const normQuery = normalizeText(query);
  if (!normQuery) {
    return items.map((item) => ({ item, ranges: null }));
  }

  const results = [];
  for (const item of items) {
    const normLabel = normalizeText(item.label);
    let ranges = matchStartsWith(normLabel, normQuery);
    let rank = RANK_START;
    let score = 0;

    if (!ranges) {
      ranges = matchContains(normLabel, normQuery);
      rank = RANK_CONTAINS;
    }
    if (!ranges && fuzzy) {
      const fuzzyResult = matchFuzzy(normLabel, normQuery);
      if (fuzzyResult) {
        ranges = fuzzyResult.ranges;
        score = fuzzyResult.score;
        rank = RANK_FUZZY;
      }
    }
    if (ranges) results.push({ item, ranges, rank, score });
  }

  results.sort((a, b) => a.rank - b.rank || b.score - a.score);
  return results;
}

/** Escapes the label then wraps matched ranges in <mark>, safe for innerHTML. */
export function highlightLabel(label, ranges) {
  const text = String(label);
  if (!ranges || ranges.length === 0) return escapeHtml(text);

  let out = '';
  let cursor = 0;
  for (const [start, end] of ranges) {
    out += escapeHtml(text.slice(cursor, start));
    out += `<mark class="glide-highlight">${escapeHtml(text.slice(start, end))}</mark>`;
    cursor = end;
  }
  out += escapeHtml(text.slice(cursor));
  return out;
}
