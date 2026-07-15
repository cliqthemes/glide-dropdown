# Changelog

All notable changes to Glide Dropdown are documented in this file.

## [0.3.0] - 2026-07-15

### Added

- Chip presentation with direct single- and multi-select toggling.
- Always-open presentation with optional checkbox selection.
- `showSelectedChips` for hiding the selected-value summary in always-open mode.
- In-flow accordion presentation that remains open after selection.
- Wide popup-grid presentation with an optional panel heading.
- CSS variables for chip, panel, popup, and presentation-specific theming.
- Light, dark, Ocean, and Sunset presentation demos with copyable setup snippets.
- Presentation-mode coverage for selection behavior, persistence, accessibility, and popup rendering.

### Changed

- Static rendering is used for wrapping chip and popup-grid layouts.
- Persistent presentations no longer highlight the first option before interaction.
- Accordion panels use accessible `aria-hidden` and `inert` collapsed states.
- The normal build now also regenerates the distributable demo.
- Presentation examples are grouped at the bottom of the demo page.

### Fixed

- Popup controls retain their complete border and corner radii while open.
- Selected chip colors remain independent from popup selected-option colors.
- Inline presentation panels avoid stale portal positioning and clipping behavior.

## [0.2.0] - 2026-07-14

- Added portal control, stable instance class hooks, value-preserving `setOptions`, and scrollbar theming.

