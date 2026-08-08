import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createStageClient } from '@ooopsstudio/stage-api';

const loadLocalEnv = async () => {
  for (const fileName of ['.env.local', '.env']) {
    const filePath = resolve(process.cwd(), fileName);
    const text = await readFile(filePath, 'utf8').catch(() => '');
    if (!text) continue;
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(trimmed);
      if (!match) continue;
      const [, key, rawValue] = match;
      if (process.env[key] !== undefined) continue;
      process.env[key] = rawValue.replace(/^['"]|['"]$/g, '');
    }
  }
};

await loadLocalEnv();

const baseUrl = (process.env.OOOPS_STAGE_API_BASE_URL || process.env.STAGE_API_BASE_URL || '').replace(/\/+$/, '');
const token = process.env.OOOPS_STAGE_API_TOKEN || process.env.STAGE_API_TOKEN || '';
const bundlePath = resolve(process.cwd(), process.argv[2] || 'stage/starter-bundle.json');

if (!baseUrl || !token) {
  console.error('[stage-bootstrap] Set OOOPS_STAGE_API_BASE_URL and OOOPS_STAGE_API_TOKEN before running bootstrap.');
  process.exit(1);
}

const readBundle = async () => JSON.parse(await readFile(bundlePath, 'utf8'));

const stage = createStageClient({ baseUrl, token });

const printCounts = (label, counts = {}) => {
  const entries = Object.entries(counts).filter(([, value]) => Number(value) > 0);
  if (entries.length === 0) return;
  console.log(`${label}:`);
  for (const [key, value] of entries) {
    console.log(`  - ${key}: ${value}`);
  }
};

try {
  const bundle = await readBundle();
  const validation = await stage.imports.validate(bundle);

  if (!validation?.ok || !validation.valid) {
    console.error('[stage-bootstrap] Bundle validation failed.');
    for (const error of validation?.errors ?? []) {
      console.error(`  - ${error.code || 'error'}: ${error.message || JSON.stringify(error)}`);
    }
    process.exit(1);
  }

  console.log('[stage-bootstrap] Bundle is valid.');
  printCounts('Planned resources', validation.counts);

  const result = await stage.imports.apply(bundle);
  console.log('[stage-bootstrap] Bootstrap complete.');
  printCounts('Created', result.summary?.creates);
  printCounts('Updated', result.summary?.updates);
  printCounts('Skipped', result.summary?.skips);

  const newsletter = result.summary?.outputs?.forms?.find((form) => form.key === 'newsletter');
  if (newsletter?.publicShareToken) {
    console.log('\nAdd this to .env if you copy optional/newsletter into your site:');
    console.log(`PUBLIC_NEWSLETTER_FORM_TOKEN=${newsletter.publicShareToken}`);
  }

  const webhooks = result.summary?.outputs?.webhooks ?? [];
  if (webhooks.length > 0) {
    console.log('\nWebhook signing secrets are shown once:');
    for (const webhook of webhooks) {
      console.log(`  - ${webhook.name}: ${webhook.signingSecret || '(existing webhook; secret unchanged)'}`);
    }
  }
} catch (error) {
  if (typeof error === 'object' && error !== null && 'status' in error) {
    console.error(`[stage-bootstrap] Stage API error ${error.status} (${error.code || 'unknown'}): ${error.message}`);
  } else {
    console.error(`[stage-bootstrap] ${error instanceof Error ? error.message : String(error)}`);
  }
  process.exit(1);
}
