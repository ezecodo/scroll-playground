// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// Tailwind v4 uses the Vite plugin — no separate Astro integration needed.
// Config now lives in CSS via @theme (see src/styles/global.css).
export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
  },
  // Astro 5 keeps scripts deferred + bundled by default; we lean on that.
  build: {
    inlineStylesheets: 'auto',
  },
});
