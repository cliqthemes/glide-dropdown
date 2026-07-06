# Glide

A tiny, dependency-free, accessible select/dropdown component for the web. A modern
replacement for Select2: ~9 KB compressed, virtualized to handle
20,000+ options smoothly, and built on plain ES modules — no jQuery, no framework.

**[Live demo →](https://cliqthemes.github.io/glide-dropdown/)**

- 🪶 **Tiny** — core is ~9 KB compressed, zero runtime dependencies
- ⚡ **Fast** — virtualized option list; renders a bounded DOM window regardless of dataset size
- ♿ **Accessible** — full ARIA combobox pattern, keyboard-only operable, screen-reader announcements
- 🎨 **Themeable** — every color/spacing value is a CSS variable; ships light + dark themes
- 🔌 **Extensible** — a small plugin API instead of a kitchen-sink core
- 📦 **Modern data formats** — upgrades a native `<select>`, or accepts arrays / grouped arrays / async data

## Installation

```bash
npm install @cliqthemes/glide-dropdown
```

```js
import { Glide } from '@cliqthemes/glide-dropdown';
import '@cliqthemes/glide-dropdown/style.css';
```

Or drop in the UMD build directly — no bundler, no ES modules, no build
step. This is the one to use in a WordPress theme/plugin, a CMS template,
or any plain HTML page:

```html
<link rel="stylesheet" href="https://unpkg.com/@cliqthemes/glide-dropdown/dist/glide.css" />
<script src="https://unpkg.com/@cliqthemes/glide-dropdown/dist/glide.umd.cjs"></script>
<script>
  const select = new Glide('#country');
</script>
```

`window.Glide` is the constructor itself (not `Glide.Glide` or similar), and
every built-in plugin ships attached at `Glide.plugins.*` in this build —
there's no separate plugin file to load:

```html
<script>
  const select = new Glide('#skills', {
    multiple: true,
    plugins: [Glide.plugins.clearButton(), Glide.plugins.checkboxSelection()],
  });
</script>
```

### WordPress

Same two files, enqueued the normal WordPress way instead of linked directly
— host them yourself (e.g. copy `dist/glide.umd.cjs` and `dist/glide.css`
into your theme) rather than pointing production at unpkg:

```php
function my_theme_enqueue_glide() {
    wp_enqueue_style('glide', get_template_directory_uri() . '/assets/glide.css', [], '0.1.0');
    wp_enqueue_script('glide', get_template_directory_uri() . '/assets/glide.umd.cjs', [], '0.1.0', true);
}
add_action('wp_enqueue_scripts', 'my_theme_enqueue_glide');
```

Then initialize it in your own script (enqueued with `'glide'` as a
dependency so it loads after), same API as everywhere else:

```js
document.addEventListener('DOMContentLoaded', () => {
  new Glide('#my-select');
});
```

### CDN

Every version published to npm is automatically mirrored on jsDelivr and
unpkg — nothing to configure, no separate publish step:

```html
<!-- jsDelivr -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@cliqthemes/glide-dropdown/dist/glide.css" />
<script src="https://cdn.jsdelivr.net/npm/@cliqthemes/glide-dropdown/dist/glide.umd.cjs"></script>

<!-- unpkg -->
<link rel="stylesheet" href="https://unpkg.com/@cliqthemes/glide-dropdown/dist/glide.css" />
<script src="https://unpkg.com/@cliqthemes/glide-dropdown/dist/glide.umd.cjs"></script>
```

Pin an exact version for production (`@cliqthemes/glide-dropdown@0.1.0/...`)
rather than the unpinned URLs above, which always resolve to latest —
convenient for docs/demos, riskier for something you don't control the
timing of.

## Quick start

```html
<select id="country">
  <option value="">Choose a country</option>
  <option value="au">Australia</option>
  <option value="nz">New Zealand</option>
</select>
```

```js
const select = new Glide('#country', {
  searchable: true,
});

select.on('change', ({ value }) => console.log(value));
```

Multi-select works the same way — Glide reads `multiple` straight off the `<select>`:

```html
<select id="skills" multiple>
  <option value="js">JavaScript</option>
  <option value="ts">TypeScript</option>
</select>
```

```js
new Glide('#skills', { fuzzy: true });
```

You don't need a `<select>` at all — pass data directly and mount on any element:

```js
new Glide('#assignee', {
  placeholder: 'Assign to…',
  options: [
    { value: 1, label: 'Grace Hopper' },
    { value: 2, label: 'Ada Lovelace' },
  ],
});
```

See it live at **[cliqthemes.github.io/glide-dropdown](https://cliqthemes.github.io/glide-dropdown/)**,
or run it locally from [`examples/index.html`](examples/index.html) (single/multi
select, groups, creatable tags, custom rendering, async loading with infinite
scroll, and a 20,000-option virtualization stress test) — `npm run dev` and open it.

## Data formats

```js
// Flat array
new Glide(el, { options: [{ value: 1, label: 'One' }] });

// Grouped array
new Glide(el, {
  options: [
    { label: 'Fruit', options: [{ value: 'a', label: 'Apple' }] },
    { value: 'z', label: 'Zucchini' },
  ],
});

// Native <select> / <optgroup> — parsed automatically, no `options` needed
new Glide('#el');

// Async / remote
new Glide(el, {
  async load(query, { page, signal }) {
    const res = await fetch(`/api/search?q=${query}&page=${page}`, { signal });
    const { items, hasMore } = await res.json();
    return { items, hasMore };
  },
});
```

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `multiple` | `boolean` | from `<select multiple>` or `false` | Multi-select mode |
| `disabled` | `boolean` | `false` | Initial disabled state |
| `searchable` | `boolean` | `true` | Show the search input (ignored — always on — when `load` is set) |
| `fuzzy` | `boolean` | `false` | Enable subsequence fuzzy matching once exact/startsWith/contains all miss |
| `theme` | `'light' \| 'dark' \| 'auto'` | `'light'` | `'auto'` follows `prefers-color-scheme`; dark never applies unless requested |
| `className` | `string` | — | Extra class(es) on the root element, for scoping instance-specific CSS |
| `controlClassName` | `string` | — | Extra class(es) on the control element — an official hook that survives internal re-renders |
| `dropdownClassName` | `string` | — | Extra class(es) on the dropdown panel. The panel is portaled to `<body>` by default, so instance-scoped CSS can only reach it through this |
| `portal` | `boolean \| Element` | `true` | Panel container: `true` portals to `<body>` (escapes overflow/stacking contexts); `false` keeps it inside the root (scoped CSS, focus traps, shadow DOM); an `Element` portals it there |
| `placeholder` | `string` | derived from an empty leading `<option>`, else `''` | Placeholder text |
| `options` | `Array` | — | Flat or grouped data (ignored for a native `<select>`) |
| `value` | value \| value[] | — | Initial selection |
| `load` | `(query, meta) => Promise` | — | Async data source. `meta` is `{ page, append, signal }`. Return an array, or `{ items, hasMore }` for pagination |
| `debounceMs` | `number` | `200` | Debounce for `load()` on keystrokes |
| `loadMoreThreshold` | `number` | `80` | Pixels from the bottom of the list that triggers the next page |
| `loadOnInit` | `boolean` | `true` | Call `load('')` once on mount |
| `plugins` | `GlidePlugin[]` | `[]` | See [Plugins](#plugins) |
| `templates` | `Partial<Templates>` | — | Override `option`, `group`, `tag`, `value`, `noResults`, `loading` render functions |

## API

```js
select.open();
select.close();
select.toggle();
select.enable();
select.disable();
select.destroy();

select.clear();
select.select(value);
select.deselect(value);
select.setValue(value);      // single value, or an array in multiple mode
select.getValue();

select.setOptions(data);
select.addOption({ value, label });
select.removeOption(value);
select.getOptions();         // normalized items currently loaded
select.getGroups();
select.refresh();            // force a re-render (e.g. after mutating templates)

select.focus();
select.blur();

const unsubscribe = select.on('change', ({ value }) => { /* ... */ });
select.off('change', handler);
```

### Events

`open`, `close`, `change`, `search`, `clear`, `create`, `select`, `deselect`, `error`, `destroy`.

## Custom rendering

Templates return an HTML string and are inserted via `innerHTML` — **labels are
escaped by default** (`escapeHtml` under the hood), so plain data can never inject
markup. Opting into rich HTML (icons, avatars, badges) is explicit: you build the
string yourself in the template function, and you're responsible for escaping any
untrusted fields you interpolate.

```js
new Glide('#assignee', {
  options: people,
  templates: {
    option(item, { ranges }) {
      return `<img class="avatar" src="${item.data.avatarUrl}"> ${item.label}`;
    },
  },
});
```

## Keyboard support

`Arrow Up/Down`, `Home`, `End`, `Page Up/Down`, `Enter`, `Escape`, `Tab`, `Backspace`
(removes the last tag in multi-select when the input is empty), `Delete`. Typing
filters the list when `searchable` is on, or jumps to the first matching option
(native-`<select>`-style typeahead) when it's off.

## Theming

Every visual value is a CSS variable on `.glide`. Override them globally or scope
an override to one instance:

```css
:root {
  --glide-radius: 4px;
  --glide-border-focus: #7c3aed;
  --glide-active: #ede9fe;
  --glide-active-color: #6d28d9;
}
```

Every instance defaults to `theme: 'light'` regardless of OS preference. Opt in
per instance:

```js
new Glide('#el', { theme: 'dark' });   // always dark
new Glide('#el', { theme: 'auto' });   // follows prefers-color-scheme
select.setTheme('dark');               // change it later
```

Full variable list: `--glide-bg`, `--glide-border`, `--glide-border-focus`,
`--glide-radius`, `--glide-color`, `--glide-placeholder`, `--glide-hover`,
`--glide-active`, `--glide-active-color`, `--glide-shadow`, `--glide-tag-bg`,
`--glide-tag-color`, `--glide-highlight-bg`, `--glide-highlight-color`,
`--glide-group-color`, `--glide-control-min-height`, `--glide-font-size`,
`--glide-scrollbar-thumb`, `--glide-scrollbar-track` (WebKit + `scrollbar-color`,
both driven by the same pair), `--glide-panel-max-h` (caps the option list's
height below the default 280px; the available-viewport clamp still applies).

Animations are CSS-only (a subtle fade/scale on open) and respect
`prefers-reduced-motion`.

## Avoiding a flash of the native select

Like any JS-driven progressive enhancement,
there's a brief window between first paint and your script running where the
native `<select>` is visible as-is. Glide hides it once it initializes, but
can't do anything before that. If it's noticeable, hide it yourself up front
and only reveal Glide's markup:

```css
select.glide-pending { visibility: hidden; }
```

```html
<select id="country" class="glide-pending">...</select>
```

Glide's own markup (`.glide`) isn't hidden by this, since it's a sibling
element inserted only once JS runs — nothing extra to unhide.

## Sizing

The root element is a block box, so — like most form controls — it stretches to
fill its container by default. Constrain it with plain CSS, either against the
`className` option or the fact that the root is always mounted immediately
after the original element:

```js
new Glide('#country', { className: 'country-select' });
```

```css
.country-select { max-width: 320px; }
/* or, without className: */
#country + .glide { max-width: 320px; }
```

There's also a `--glide-max-width` variable (default `none`) if you'd rather
set it globally for every instance on the page.

## Plugins

Core stays deliberately small; everything below is opt-in:

```js
import { Glide } from '@cliqthemes/glide-dropdown';
import { clearButton } from '@cliqthemes/glide-dropdown/plugins/clearButton';
import { checkboxSelection } from '@cliqthemes/glide-dropdown/plugins/checkboxSelection';
import { selectAll } from '@cliqthemes/glide-dropdown/plugins/selectAll';
import { groupSelect } from '@cliqthemes/glide-dropdown/plugins/groupSelect';
import { tagCreate } from '@cliqthemes/glide-dropdown/plugins/tagCreate';

new Glide('#el', {
  multiple: true,
  plugins: [clearButton(), checkboxSelection(), selectAll(), groupSelect(), tagCreate()],
});
```

Using the [UMD build](#wordpress) instead? Every plugin above is already
attached to the global — `Glide.plugins.clearButton()` and so on, no
separate import.

| Plugin | Adds |
| --- | --- |
| `clearButton()` | An "×" button that clears the selection, hidden when empty |
| `checkboxSelection()` | Checkbox indicators in front of every option |
| `selectAll()` | A "Select all / Clear all" button above the list (multi-select) |
| `groupSelect()` | A "Select all" affordance per group header (multi-select) |
| `tagCreate({ validate, format })` | Press Enter on unmatched text to create a new option |

Virtual scrolling and group-collapse are core behavior, not plugins — they're
fundamental to the performance and Groups requirements, not optional add-ons.
Animations are pure CSS, so there's no JS plugin for them either.

### Writing a plugin

A plugin is a factory returning `{ name, init(instance), destroy(instance) }`.
`instance` exposes the full public API above, plus `instance.dom` (`root`,
`control`, `input`, `dropdown`, `viewport`, `content`), `instance.templates`
(mutable — wrap a template function to change rendering), and
`instance.getOptions()` / `instance.selectedSet`.

```js
export function myPlugin() {
  return {
    name: 'myPlugin',
    init(instance) {
      instance.on('change', () => console.log(instance.getValue()));
    },
    destroy(instance) {
      // undo whatever init() did
    },
  };
}
```

## Performance

The option list is virtualized (`src/virtual/VirtualList.js`): regardless of
whether you load 10 or 20,000 options, only the rows intersecting the viewport
(plus a small overscan) exist in the DOM, and elements are recycled between
scroll frames rather than recreated. Search matching is a single linear pass
per keystroke with early-exit ranking (startsWith beats contains beats fuzzy),
and store updates are batched into a microtask so a burst of synchronous state
changes only triggers one render.

## Browser support

Modern evergreen browsers (Chrome, Firefox, Safari, Edge). No IE support.

## Project layout

```
src/
  core/       Glide class, data normalization, async loader, row computation
  store/      Small reactive state container
  renderer/   Control, list, and dropdown-positioning DOM rendering
  keyboard/   Key-to-intent mapping
  search/     Matching (startsWith/contains/fuzzy) + highlighting
  virtual/    Windowed list renderer
  plugins/    Built-in opt-in plugins
  utils/      DOM helpers, escaping, debounce, event emitter
  styles/     Base structural CSS + light/dark themes
```

## License

MIT
