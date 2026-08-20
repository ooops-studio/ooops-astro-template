import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createCmsClient } from '@ooopsstudio/cms-api';

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

const baseUrl = (process.env.OOOPS_CMS_API_BASE_URL || '').replace(/\/+$/, '');
const token = process.env.OOOPS_CMS_API_TOKEN || '';
const bundlePath = resolve(process.cwd(), process.argv[2] || 'cms/starter-bundle.json');

if (!baseUrl || !token) {
  console.error('[cms-bootstrap] Set OOOPS_CMS_API_BASE_URL and OOOPS_CMS_API_TOKEN before running bootstrap.');
  process.exit(1);
}

const readBundle = async () => JSON.parse(await readFile(bundlePath, 'utf8'));

const cms = createCmsClient({ baseUrl, token });

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
  const validation = await cms.imports.validate(bundle);

  if (!validation?.ok || !validation.valid) {
    console.error('[cms-bootstrap] Bundle validation failed.');
    for (const error of validation?.errors ?? []) {
      console.error(`  - ${error.code || 'error'}: ${error.message || JSON.stringify(error)}`);
    }
    process.exit(1);
  }

  console.log('[cms-bootstrap] Bundle is valid.');
  printCounts('Planned resources', validation.counts);

  const result = await cms.imports.apply(bundle);
  console.log('[cms-bootstrap] Bootstrap complete.');
  printCounts('Created', result.summary?.creates);
  printCounts('Updated', result.summary?.updates);
  printCounts('Skipped', result.summary?.skips);

  const contact = result.summary?.outputs?.forms?.find((form) => form.key === 'contact');
  if (contact?.publicShareToken) {
    console.log('\nA public contact share token was created. Store it as PUBLIC_CONTACT_FORM_TOKEN without printing or committing its value.');
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
    console.error(`[cms-bootstrap] CMS API error ${error.status} (${error.code || 'unknown'}): ${error.message}`);
  } else {
    console.error(`[cms-bootstrap] ${error instanceof Error ? error.message : String(error)}`);
  }
  process.exit(1);
}
