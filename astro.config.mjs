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
    environments: {
      client: {
        // Share one Svelte runtime between the renderer and hydrated islands.
        optimizeDeps: { include: ['@astrojs/svelte/client.js'] }
      },
      ssr: {
        // Prebundle before Cloudflare evaluates SSR: discovering these during
        // startup can invalidate chunks already being loaded by workerd.
        optimizeDeps: { include: ['astro/app/manifest', '@astrojs/svelte/server.js'] }
      }
    },
    resolve: {
      alias: {
        $lib: fileURLToPath(new URL('./src/lib', import.meta.url))
      }
    }
  }
});
