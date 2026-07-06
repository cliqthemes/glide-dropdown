export const defaultOptions = {
  multiple: false,
  disabled: false,
  searchable: true,
  theme: 'light',
  fuzzy: false,
  className: undefined,
  // Instance classes for the two elements className can't reach: the control
  // (an official hook that survives internal re-renders) and the portaled
  // dropdown panel — without the latter, instance-scoped CSS can never theme
  // the panel, since it lives on <body>, outside any consumer scope.
  controlClassName: undefined,
  dropdownClassName: undefined,
  // Where the dropdown panel lives: true (default) portals it to <body> to
  // escape overflow/stacking contexts; false keeps it inside the root (for
  // scoped CSS, focus traps, shadow DOM); an Element portals it there.
  portal: true,
  placeholder: undefined,
  options: undefined,
  value: undefined,
  load: undefined,
  debounceMs: 200,
  loadMoreThreshold: 80,
  loadOnInit: true,
  plugins: [],
  templates: undefined,
};
