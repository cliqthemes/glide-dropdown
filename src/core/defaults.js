export const defaultOptions = {
  multiple: false,
  disabled: false,
  searchable: true,
  theme: 'light',
  // Visual behavior. `dropdown` preserves the classic portaled combobox;
  // chips and always-open are persistent, accordion expands in document flow,
  // and popup opens a wider, responsive option grid.
  presentation: 'dropdown',
  // Render selected multi-select values as removable chips in the control.
  // Set false for a cleaner persistent list (the search input remains when
  // searchable is enabled).
  showSelectedChips: true,
  panelLabel: undefined,
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
