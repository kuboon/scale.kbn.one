import { defineConfig } from 'vite';
import yaml from '@modyfi/vite-plugin-yaml';

export default defineConfig({
  plugins: [yaml()],
  build: {
    target: 'es2022',
    outDir: 'dist',
  },
});
