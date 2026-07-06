import { escapeHtml } from '../utils/escapeHtml.js';
import { highlightLabel } from '../search/search.js';

export const defaultTemplates = {
  option(item, { ranges }) {
    return highlightLabel(item.label, ranges);
  },
  group(group) {
    return escapeHtml(group.label);
  },
  tag(item) {
    return escapeHtml(item.label);
  },
  value(item) {
    return escapeHtml(item.label);
  },
  noResults(query) {
    return query
      ? `No results for &ldquo;${escapeHtml(query)}&rdquo;`
      : 'No options';
  },
  loading() {
    return 'Loading&hellip;';
  },
  createLabel(query) {
    return `Add &ldquo;${escapeHtml(query)}&rdquo;`;
  },
};
