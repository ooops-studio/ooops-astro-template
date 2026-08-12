import { fileURLToPath } from 'node:url';

import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import svelte from '@astrojs/svelte';

import { templateConfig } from './src/template.config.ts';

const ooopsEditor = templateConfig.optionalModules.visualEditor
  ? (await import('@ooopsstudio/editor-astro')).default
  : null;

export default defineConfig({
  output: 'static',
  adapter: cloudflare({ prerenderEnvironment: 'node' }),
  integrations: [svelte(), ...(ooopsEditor ? [ooopsEditor()] : [])],
  vite: {
    resolve: {
      alias: {
        $lib: fileURLToPath(new URL('./src/lib', import.meta.url))
      }
    }
  }
});
