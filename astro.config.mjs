import { fileURLToPath } from 'node:url';

import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
import ooopsEditor from '@ooopsstudio/editor-astro';

export default defineConfig({
  output: 'static',
  integrations: [svelte(), ooopsEditor()],
  vite: {
    resolve: {
      alias: {
        $lib: fileURLToPath(new URL('./src/lib', import.meta.url))
      }
    }
  }
});
