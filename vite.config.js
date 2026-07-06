import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// ESM only here — the UMD/browser-global build comes from a separate entry
// (src/browser.js) built in scripts/build-extra.mjs, since it needs a
// different export shape (`window.Glide` as the constructor directly,
// with plugins attached) than the tree-shakable ESM entry does.
export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.js'),
      name: 'Glide',
      fileName: () => 'glide.js',
      formats: ['es'],
    },
    rollupOptions: {
      output: {
        exports: 'named',
      },
    },
    sourcemap: true,
    minify: 'esbuild',
  },
});
