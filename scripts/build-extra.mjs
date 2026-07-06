import { build } from 'vite';
import { resolve } from 'node:path';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createContext, runInContext } from 'node:vm';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const root = resolve(__dirname, '..');

const pluginsDir = resolve(root, 'src/plugins');
const pluginFiles = readdirSync(pluginsDir).filter((file) => file.endsWith('.js') && file !== 'index.js');
const pluginEntries = Object.fromEntries(
  pluginFiles.map((file) => [file.replace(/\.js$/, ''), resolve(pluginsDir, file)]),
);

// Each built-in plugin ships as its own ES module so consumers only pay for
// what they import (`import { clearButton } from 'glide-dropdown/plugins/clearButton'`).
await build({
  root,
  configFile: false,
  build: {
    outDir: 'dist/plugins',
    emptyOutDir: true,
    lib: {
      entry: pluginEntries,
      formats: ['es'],
      fileName: (_format, entryName) => `${entryName}.js`,
    },
    minify: 'esbuild',
    sourcemap: true,
  },
});

// UMD/browser-global build: core + every built-in plugin bundled together,
// so a plain <script> tag (no bundler, no ES modules — WordPress themes,
// static HTML, etc.) gets `window.Glide` as the constructor directly, with
// built-ins at `Glide.plugins.*`. Deliberately a separate entry (src/browser.js)
// from the ESM build, which stays tree-shakable and doesn't bundle plugins in.
await build({
  root,
  configFile: false,
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    lib: {
      entry: resolve(root, 'src/browser.js'),
      name: 'Glide',
      formats: ['umd'],
      fileName: () => 'glide.umd.cjs',
    },
    rollupOptions: {
      output: {
        exports: 'default',
      },
    },
    minify: 'esbuild',
    sourcemap: true,
  },
});

// Sanity-check the UMD output the way a plain <script> tag would load it —
// window.Glide must be the constructor itself (not e.g. {Glide, default}),
// with the built-in plugins attached. Fails the build loudly on regression
// instead of only being caught later by someone pasting the WordPress snippet.
{
  const code = readFileSync(resolve(root, 'dist/glide.umd.cjs'), 'utf8');
  const sandbox = {};
  sandbox.globalThis = sandbox;
  sandbox.self = sandbox;
  createContext(sandbox);
  runInContext(code, sandbox);
  const expectedPlugins = ['clearButton', 'checkboxSelection', 'selectAll', 'groupSelect', 'tagCreate'];
  const ok =
    typeof sandbox.Glide === 'function' &&
    expectedPlugins.every((name) => typeof sandbox.Glide.plugins?.[name] === 'function');
  if (!ok) {
    throw new Error(
      'dist/glide.umd.cjs sanity check failed: window.Glide must be the constructor with .plugins.* attached.',
    );
  }
}

// Single combined stylesheet: base structural styles + light theme + dark
// theme (auto-applied via prefers-color-scheme, overridable via data-theme).
await build({
  root,
  configFile: false,
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    rollupOptions: {
      input: resolve(root, 'src/styles/index.css'),
      output: {
        assetFileNames: 'glide.css',
      },
    },
  },
});
