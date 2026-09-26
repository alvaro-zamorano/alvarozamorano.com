import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://www.alvarozamorano.com',
  output: 'static',
  trailingSlash: 'ignore',
  build: {
    inlineStylesheets: 'always',
  },
  vite: {
    build: {
      assetsInlineLimit: 0,
    },
  },
});
