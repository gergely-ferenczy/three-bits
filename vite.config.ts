import path from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    minify: false,
    target: 'es2018',
    sourcemap: true,
    lib: {
      formats: ['cjs', 'es'],
      entry: 'lib/index.ts',
      fileName: (format) => (format === 'es' ? '[name].mjs' : '[name].cjs'),
    },
    rollupOptions: {
      external: (id: string) => !id.startsWith('.') && !path.isAbsolute(id),
      output: {
        preserveModules: true,
      },
    },
  },
});
