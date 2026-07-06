import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cpSync, mkdirSync, readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const root = resolve(__dirname, '..');
const distDir = resolve(root, 'dist');
const demoDir = resolve(root, 'demo-dist');

if (!existsSync(distDir)) {
  throw new Error('dist/ not found — run `npm run build` before build-demo.mjs.');
}

rmSync(demoDir, { recursive: true, force: true });
mkdirSync(demoDir, { recursive: true });

// Ship the real built ESM output + per-plugin files — this is exactly what
// an npm consumer gets, so the hosted demo doubles as an integration check.
cpSync(resolve(distDir, 'glide.js'), resolve(demoDir, 'glide.js'));
cpSync(resolve(distDir, 'glide.js.map'), resolve(demoDir, 'glide.js.map'));
cpSync(resolve(distDir, 'glide.css'), resolve(demoDir, 'glide.css'));
cpSync(resolve(distDir, 'plugins'), resolve(demoDir, 'plugins'), { recursive: true });

// Rewrite the example page's dev-server-only `/src/...` imports to point at
// the copied dist files instead, so it works as static hosting with no
// bundler or server-side resolution.
let html = readFileSync(resolve(root, 'examples/index.html'), 'utf8');

html = html.replace('<link rel="stylesheet" href="/src/styles/index.css" />', '<link rel="stylesheet" href="./glide.css" />');

html = html.replace(
  "import { Glide } from '/src/index.js';\n    import { clearButton, checkboxSelection, groupSelect, tagCreate } from '/src/plugins/index.js';",
  [
    "import { Glide } from './glide.js';",
    "    import { clearButton } from './plugins/clearButton.js';",
    "    import { checkboxSelection } from './plugins/checkboxSelection.js';",
    "    import { groupSelect } from './plugins/groupSelect.js';",
    "    import { tagCreate } from './plugins/tagCreate.js';",
  ].join('\n'),
);

if (html.includes('/src/')) {
  throw new Error('build-demo.mjs: examples/index.html still references /src/ after rewriting — update the replacement to match.');
}

writeFileSync(resolve(demoDir, 'index.html'), html);

console.log(`Demo written to ${demoDir}`);
