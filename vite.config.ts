import path from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    minify: false,
    target: 'esnext',
    sourcemap: true,
    lib: {
      formats: ['es'],
      entry: 'lib/index.ts',
      fileName: () => '[name].js',
    },
    rollupOptions: {
      external: (id: string) => !id.startsWith('.') && !path.isAbsolute(id),
      output: {
        preserveModules: true,
      },
    },
  },
});
