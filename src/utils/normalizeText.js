const DIACRITIC_RE = /[̀-ͯ]/g;

/**
 * Lowercases and strips diacritics (é -> e, ü -> u) so search is accent-insensitive.
 * NFD splits base characters from combining marks, which we then drop.
 */
export function normalizeText(value) {
  if (!value) return '';
  return String(value)
    .normalize('NFD')
    .replace(DIACRITIC_RE, '')
    .toLowerCase()
    .trim();
}
