import { execFileSync } from 'node:child_process';
import { copyFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import {
  loadModuleManifests,
  readJson,
  readText,
  renderEnvExample,
  renderSetupMarkdown,
  root,
  syncModuleDependencies,
  syncModuleEditorExtensions,
  syncModuleEditorScenes,
  syncModuleOverrides,
  validateModuleManifest
} from './lib/module-manifest.mjs';

const args = process.argv.slice(2);
const flags = new Map();
const positionals = [];

for (const arg of args) {
  if (!arg.startsWith('--')) {
    positionals.push(arg);
    continue;
  }
  const [key, rawValue] = arg.slice(2).split('=');
  flags.set(key, rawValue ?? true);
}

const projectName = positionals[0];
const yes = flags.has('yes');
const cleanup = !flags.has('no-cleanup');
const dryRun = flags.has('dry-run');
const modulesFlag = typeof flags.get('modules') === 'string' ? String(flags.get('modules')) : '';
const packageSource = typeof flags.get('package-source') === 'string'
  ? String(flags.get('package-source'))
  : 'local';
const manifests = loadModuleManifests();

const knownModules = manifests.map((manifest) => manifest.id);
const manifestErrors = manifests.flatMap(validateModuleManifest);
if (manifestErrors.length) {
  for (const error of manifestErrors) console.error(`[setup] ${error}`);
  process.exit(1);
}
if (!['local', 'published'].includes(packageSource)) {
  console.error('[setup] --package-source must be local or published.');
  process.exit(1);
}

if (!projectName) {
  console.log('Usage: pnpm setup:client -- my-client-site');
  console.log('Flags: --yes --modules=analytics,preview,newsletter --package-source=local|published --no-cleanup --dry-run');
  process.exit(0);
}

const selectedFromFlags = modulesFlag
  ? new Set(
      modulesFlag
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    )
  : null;

const unknownModules = selectedFromFlags ? [...selectedFromFlags].filter((item) => !knownModules.includes(item)) : [];
if (unknownModules.length) {
  console.error(`[setup] Unknown module(s): ${unknownModules.join(', ')}`);
  process.exit(1);
}

const askBoolean = async (rl, question, fallback) => {
  if (yes) return fallback;
  const marker = fallback ? 'Y/n' : 'y/N';
  const answer = (await rl.question(`${question} (${marker}) `)).trim().toLowerCase();
  if (!answer) return fallback;
  return ['y', 'yes', '1', 'true'].includes(answer);
};

const enabledModules = {};
const rl = createInterface({ input, output });
try {
  for (const manifest of manifests) {
    if (selectedFromFlags) {
      enabledModules[manifest.id] = selectedFromFlags.has(manifest.id);
      continue;
    }
    enabledModules[manifest.id] = await askBoolean(rl, `Enable ${manifest.label}?`, Boolean(manifest.defaultEnabled));
  }
} finally {
  rl.close();
}

const operations = [];
const record = (type, target, detail = '') => operations.push({ type, target, detail });

const write = (path, value) => {
  record('write', path);
  if (!dryRun) writeFileSync(resolve(root, path), value);
};

const writeJson = (path, value) => write(path, `${JSON.stringify(value, null, 2)}\n`);

const copyIfPresent = (from, to) => {
  if (!existsSync(resolve(root, from))) return false;
  record('copy', to, `from ${from}`);
  if (!dryRun) {
    mkdirSync(dirname(resolve(root, to)), { recursive: true });
    copyFileSync(resolve(root, from), resolve(root, to));
  }
  return true;
};

const removeIfPresent = (path) => {
  if (!existsSync(resolve(root, path))) return;
  record('remove', path);
  if (!dryRun) rmSync(resolve(root, path), { recursive: true, force: true });
};

const transactionTargets = new Set([
  'package.json',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  'src/template.config.ts',
  '.env.example',
  'SETUP.md',
  'README.md',
  'editor/components.json',
  ...manifests.flatMap((manifest) => (manifest.files ?? []).map((file) => file.to)),
  ...manifests.flatMap((manifest) => manifest.cleanupTargets ?? [])
]);
const backupRoot = dryRun ? null : mkdtempSync(join(tmpdir(), 'ooops-astro-setup-'));
const snapshots = backupRoot
  ? [...transactionTargets].map((target) => {
      const source = resolve(root, target);
      const backup = resolve(backupRoot, target);
      const existed = existsSync(source);
      if (existed) {
        mkdirSync(dirname(backup), {recursive: true});
        cpSync(source, backup, {recursive: true});
      }
      return {source, backup, existed};
    })
  : [];
const restore = () => {
  for (const snapshot of [...snapshots].reverse()) {
    if (existsSync(snapshot.source)) rmSync(snapshot.source, {recursive: true, force: true});
    if (snapshot.existed) {
      mkdirSync(dirname(snapshot.source), {recursive: true});
      cpSync(snapshot.backup, snapshot.source, {recursive: true});
    }
  }
};

try {

const packageJson = readJson('package.json');
packageJson.name = projectName;
packageJson.dependencies = {
  '@astrojs/svelte': packageJson.dependencies?.['@astrojs/svelte'] || '^9.0.1',
  '@ooopsstudio/analytics-consent': packageJson.dependencies?.['@ooopsstudio/analytics-consent'] || '^0.1.0',
  '@ooopsstudio/analytics-consent-astro':
    packageJson.dependencies?.['@ooopsstudio/analytics-consent-astro'] || '^0.1.0',
  '@ooopsstudio/accessibility': packageJson.dependencies?.['@ooopsstudio/accessibility'] || '^0.1.0',
  '@ooopsstudio/accessibility-astro':
    packageJson.dependencies?.['@ooopsstudio/accessibility-astro'] || '^0.1.0',
  '@ooopsstudio/editor-contracts': packageJson.dependencies?.['@ooopsstudio/editor-contracts'] || '^0.2.0',
  '@ooopsstudio/stage-api': packageJson.dependencies?.['@ooopsstudio/stage-api'] || '^0.1.0',
  '@ooopsstudio/stage-astro': packageJson.dependencies?.['@ooopsstudio/stage-astro'] || '^0.1.0',
  '@ooopsstudio/stage-cloudflare': packageJson.dependencies?.['@ooopsstudio/stage-cloudflare'] || '^0.1.0',
  '@ooopsstudio/ui-primitives': packageJson.dependencies?.['@ooopsstudio/ui-primitives'] || '^0.1.0',
  '@ooopsstudio/ui-astro': packageJson.dependencies?.['@ooopsstudio/ui-astro'] || '^0.1.0',
  astro: packageJson.dependencies?.astro || '^7.0.6',
  svelte: packageJson.dependencies?.svelte || '^5.56.4'
};
syncModuleDependencies(packageJson, manifests, enabledModules);
writeJson('package.json', packageJson);
write(
  'pnpm-workspace.yaml',
  syncModuleOverrides(readText('pnpm-workspace.yaml'), manifests, enabledModules, packageSource)
);
writeJson(
  'editor/components.json',
  syncModuleEditorExtensions(
    syncModuleEditorScenes(readJson('editor/components.json'), manifests, enabledModules),
    manifests,
    enabledModules
  )
);

const optionalModuleLines = manifests
  .map((manifest) => `    ${manifest.id}: ${Boolean(enabledModules[manifest.id])}`)
  .join(',\n');

write(
  'src/template.config.ts',
  `export const templateConfig = {
  siteName: '${projectName}',
  defaultLocale: 'en',
  locales: ['en', 'el'],
  i18nEnabled: ${Boolean(enabledModules.i18n)},
  optionalModules: {
${optionalModuleLines}
  }
} as const;

export type TemplateLocale = (typeof templateConfig.locales)[number];
`
);

write('.env.example', renderEnvExample({ manifests, enabledModules }));

for (const manifest of manifests) {
  for (const file of manifest.files ?? []) {
    if (enabledModules[manifest.id]) copyIfPresent(file.from, file.to);
    else if (cleanup) removeIfPresent(file.to);
  }
  if (!enabledModules[manifest.id] && cleanup) {
    for (const target of manifest.cleanupTargets ?? []) removeIfPresent(target);
  }
}

write('SETUP.md', renderSetupMarkdown({ projectName, manifests, enabledModules, packageSource }));

const readmePath = 'README.md';
const readme = readText(readmePath);
const enabledList = manifests
  .map((manifest) => `- ${enabledModules[manifest.id] ? '[x]' : '[ ]'} ${manifest.label} \`${manifest.id}\``)
  .join('\n');
const moduleSection = `## Enabled Modules
<!-- ooops-template-modules:start -->
Project name: \`${projectName}\`

${enabledList}
<!-- ooops-template-modules:end -->`;

const nextReadme = readme.includes('<!-- ooops-template-modules:start -->')
  ? readme.replace(
      /## Enabled Modules\n<!-- ooops-template-modules:start -->[\s\S]*?<!-- ooops-template-modules:end -->/,
      moduleSection
    )
  : `${readme.trim()}\n\n${moduleSection}\n`;
write(readmePath, `${nextReadme.trim()}\n`);

if (dryRun) {
  console.log('[setup] dry run. No files were changed.');
  for (const operation of operations) {
    console.log(`- ${operation.type}: ${operation.target}${operation.detail ? ` (${operation.detail})` : ''}`);
  }
} else {
  execFileSync('pnpm', ['install', '--lockfile-only'], {cwd: root, stdio: 'inherit'});
  console.log(`[setup] package.json name updated to "${projectName}".`);
  console.log(`[setup] enabled modules: ${knownModules.filter((key) => enabledModules[key]).join(', ') || 'none'}.`);
}

console.log('[setup] next steps:');
console.log('1. Run pnpm install after the @ooopsstudio packages are published/available.');
console.log('2. Copy .env.example to .env.local and fill the selected module env vars.');
console.log('3. Run pnpm validate.');
console.log('4. Configure Cloudflare Pages env vars for preview/rebuild if enabled.');
} catch (error) {
  if (!dryRun) restore();
  console.error(`[setup] rolled back: ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
} finally {
  if (backupRoot) rmSync(backupRoot, {recursive: true, force: true});
}
