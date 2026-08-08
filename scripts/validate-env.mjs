import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getEnabledModulesFromConfig, loadModuleManifests, root } from './lib/module-manifest.mjs';

const args = new Set(process.argv.slice(2));
const strict = args.has('--strict');
const envFileArg = [...args].find((arg) => arg.startsWith('--env-file='));
const envFile = envFileArg?.split('=')[1] || '.env.local';

function parseEnvFile(path) {
  const absolute = resolve(root, path);
  if (!existsSync(absolute)) return {};
  return Object.fromEntries(
    readFileSync(absolute, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const index = line.indexOf('=');
        return [line.slice(0, index), line.slice(index + 1)];
      })
  );
}

const localEnv = parseEnvFile(envFile);
const exampleEnv = parseEnvFile('.env.example');
const env = { ...exampleEnv, ...localEnv, ...process.env };
const enabledModules = getEnabledModulesFromConfig();
const manifests = loadModuleManifests();
const missing = [];

const requireEnv = (name, source) => {
  if (!String(env[name] ?? '').trim()) missing.push({ name, source });
};

requireEnv('OOOPS_STAGE_API_BASE_URL', 'core');
requireEnv('PUBLIC_SITE_URL', 'core');

for (const manifest of manifests) {
  if (!enabledModules[manifest.id]) continue;
  for (const variable of manifest.env ?? []) {
    if (variable.required !== false) requireEnv(variable.name, manifest.id);
  }
}

if (!missing.length) {
  console.log('[validate-env] Environment validation passed.');
  process.exit(0);
}

for (const item of missing) {
  console.warn(`[validate-env] Missing ${item.name} (${item.source})`);
}

if (strict) {
  console.error('[validate-env] Missing required env vars in strict mode.');
  process.exit(1);
}

console.warn('[validate-env] Missing env vars were reported as warnings. Use --strict to fail.');
