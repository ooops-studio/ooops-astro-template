import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

for (const fileName of ['.env.local', '.env']) {
  const filePath = resolve(process.cwd(), fileName);
  let text = '';
  try {
    text = readFileSync(filePath, 'utf8');
  } catch {
    continue;
  }
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(trimmed);
    if (match && process.env[match[1]] === undefined) {
      process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
    }
  }
}

const baseUrl = (process.env.OOOPS_CMS_API_BASE_URL || '').replace(/\/$/, '');
const requiredPaths = [
  '/content/singles/{apiId}',
  '/content/collections/{apiId}/entries',
  '/content/collections/{apiId}/entries/{idOrSlug}',
  '/forms',
  '/analytics/overview',
  '/seo',
  '/preview/content/collections/{apiId}/{slug}',
  '/preview/content/singles/{apiId}'
];

if (!baseUrl) {
  console.log('[openapi-contract] OOOPS_CMS_API_BASE_URL is not set; skipping live OpenAPI check.');
  process.exit(0);
}

let spec;
try {
  const response = await fetch(`${baseUrl}/openapi.json`, { headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  spec = await response.json();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  if (process.env.CI === 'true') {
    console.error(`[openapi-contract] Failed to fetch ${baseUrl}/openapi.json: ${message}`);
    process.exit(1);
  }
  console.log(`[openapi-contract] CMS OpenAPI is unavailable; skipping local check: ${message}`);
  process.exit(0);
}

const paths = spec && typeof spec === 'object' && spec.paths && typeof spec.paths === 'object'
  ? spec.paths
  : {};

const missing = requiredPaths.filter((path) => !(path in paths));
if (missing.length > 0) {
  console.error(`[openapi-contract] Missing required CMS API paths: ${missing.join(', ')}`);
  process.exit(1);
}

console.log('[openapi-contract] Required CMS API v1 paths are present.');
