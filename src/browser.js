/**
 * Entry point for the UMD/browser-global build only (dist/glide.umd.cjs).
 * Bundles core + every built-in plugin into a single script-tag-friendly
 * file, so `window.Glide` is directly the constructor — usable without a
 * bundler or ES modules (WordPress themes, plain HTML, etc):
 *
 *   <script src="glide.umd.cjs"></script>
 *   <script>
 *     const select = new Glide('#my-select', {
 *       plugins: [Glide.plugins.clearButton()],
 *     });
 *   </script>
 *
 * The ESM entry (index.js) stays separate and default-export-only-ish
 * (Glide + named export), so bundler users keep clean tree-shaking and
 * import plugins individually instead of paying for all of them.
 */
import { Glide } from './core/Glide.js';
import { clearButton } from './plugins/clearButton.js';
import { checkboxSelection } from './plugins/checkboxSelection.js';
import { selectAll } from './plugins/selectAll.js';
import { groupSelect } from './plugins/groupSelect.js';
import { tagCreate } from './plugins/tagCreate.js';

Glide.plugins = { clearButton, checkboxSelection, selectAll, groupSelect, tagCreate };

export default Glide;
