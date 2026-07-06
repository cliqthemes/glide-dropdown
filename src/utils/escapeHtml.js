const ESCAPE_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

const ESCAPE_RE = /[&<>"']/g;

/**
 * Escapes a string for safe insertion into HTML. Used any time user-controlled
 * text (labels, search queries, created tags) is rendered via innerHTML.
 */
export function escapeHtml(value) {
  if (value == null) return '';
  return String(value).replace(ESCAPE_RE, (ch) => ESCAPE_MAP[ch]);
}
