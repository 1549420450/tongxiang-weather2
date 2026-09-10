import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/postcss';
import { fileURLToPath } from 'node:url';

const repository=process.env.GITHUB_REPOSITORY?.split('/')[1];
export default defineConfig({
  base: repository && !repository.endsWith('.github.io') ? `/${repository}/` : '/',
  plugins:[react()],
  resolve:{alias:{'@':fileURLToPath(new URL('.',import.meta.url))}},
  css:{postcss:{plugins:[tailwindcss()]}},
  build:{outDir:'dist-pages'},
});
