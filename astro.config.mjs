import { fileURLToPath } from 'node:url';

import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import svelte from '@astrojs/svelte';

// The visual editor integration is only needed for an explicit editor session.
// Keeping it opt-in keeps production and CMS-preview builds independent from
// editor-only manifest packages.
const ooopsEditor =
  process.env.OOOPS_EDITOR_MODE === '1'
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
