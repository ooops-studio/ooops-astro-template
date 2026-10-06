import { defineConfig } from 'astro/config';
import baseConfig from './astro.config.mjs';

// The installed test site reads its existing opaque Worker credential at runtime.
// The reusable starter retains its static output and build-time configuration.
export default defineConfig({ ...baseConfig, output: 'server' });
