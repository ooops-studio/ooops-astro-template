import { readdirSync, readFileSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadModuleManifests, validateModuleManifest } from './lib/module-manifest.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));

const ignoredDirectories = new Set([
  '.astro',
  '.cache',
  '.git',
  'dist',
  'node_modules'
]);

const scannedExtensions = new Set([
  '.astro',
  '.css',
  '.html',
  '.js',
  '.json',
  '.md',
  '.mjs',
  '.svelte',
  '.svg',
  '.ts',
  '.txt',
  '.yaml',
  '.yml'
]);

const requiredFiles = [
  '.env.example',
  'optional/cloudflare-rebuild/README.md',
  'optional/newsletter/README.md',
  'optional/preview/README.md',
  'docs/deployment.md',
  'docs/security.md',
  'docs/accessibility.md',
  'docs/content-models.md',
  'docs/i18n.md',
  'docs/package-extraction.md',
  'docs/redirects-and-headers.md',
  'docs/svelte-islands.md',
  'docs/testing.md',
  'docs/ui-components.md',
  'functions/api/preview.ts',
  'functions/api/stage/rebuild.ts',
  'scripts/test-stage-webhook-signature.mjs',
  'scripts/test-stage-signature.mjs',
  'scripts/test-i18n-helpers.mjs',
  'scripts/test-newsletter-module.mjs',
  'scripts/test-template-modules.mjs',
  'scripts/generate-editor.mjs',
  'scripts/check-editor.mjs',
  'scripts/validate-env.mjs',
  'scripts/check-content-health.mjs',
  'scripts/setup-client-project.mjs',
  'scripts/setup-module.mjs',
  'src/components/stage/AnalyticsConsent.astro',
  'src/components/stage/PreviewBanner.astro',
  'src/components/stage/StageAnalytics.astro',
  'src/components/stage/StageImage.astro',
  'src/components/islands/IslandStatus.svelte',
  'src/components/ui/ErrorState.astro',
  'src/components/ui/InputField.astro',
  'src/components/ui/TextareaField.astro',
  'src/components/ui/CheckboxField.astro',
  'src/components/ui/RadioGroupField.astro',
  'src/components/ui/SwitchField.astro',
  'src/components/ui/ComboboxField.astro',
  'src/components/ui/MultiSelectField.astro',
  'src/components/ui/DropdownMenu.astro',
  'src/components/ui/Tooltip.astro',
  'src/components/ui/Tabs.astro',
  'src/components/ui/Accordion.astro',
  'src/components/ui/SliderField.astro',
  'src/components/ui/NumberInputField.astro',
  'src/components/ui/SegmentedControl.astro',
  'src/lib/i18n/routing.ts',
  'src/lib/editor/registry.ts',
  'src/components/editor/EditorBoundary.astro',
  'src/lib/posts/client.ts',
  'src/lib/posts/sitemap.ts',
  'src/lib/stage/client.ts',
  'src/lib/stage/content-helpers.ts',
  'src/lib/stage/homepage.ts',
  'src/lib/stage/mappers.ts',
  'src/lib/seo/sitemap.ts',
  'src/lib/seo/schema.ts',
  'src/pages/404.astro',
  'src/pages/500.astro',
  'src/pages/posts/index.astro',
  'src/pages/posts/[slug].astro',
  'src/template.config.ts',
  'src/styles/fonts.css',
  'src/styles/global.css',
  'src/styles/reset.css',
  'src/styles/tokens.css',
  'editor/template.json',
  'editor/components.json',
  'editor/design-tokens.json',
  'src/styles/typography.css',
  'public/assets/fonts/NotoSans-Regular.woff2',
  'public/assets/fonts/NotoSans-Bold.woff2',
  'public/_headers',
  'public/assets/images/fallback-image.svg',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  'template-policy.json',
  'src/components/ui/Popover.astro'
];

const forbiddenFragments = [
  ['/api/public', '/content'].join(''),
  ['/api/public', '/site'].join(''),
  ['flop', 'artcollective'].join(''),
  ['Flop', ' Art Collective'].join('')
];

const forbiddenLocalEnvFiles = [
  '.env',
  '.env.local',
  '.env.development',
  '.env.production'
];

const requiredBlankExampleSecrets = [
  'OOOPS_STAGE_API_TOKEN',
  'STAGE_PREVIEW_TOKEN',
  'STAGE_PREVIEW_SECRET',
  'PUBLIC_NEWSLETTER_FORM_TOKEN',
  'PUBLIC_STAGE_ANALYTICS_SCRIPT_URL',
  'PUBLIC_STAGE_ANALYTICS_WEBSITE_ID',
  'PUBLIC_STAGE_ANALYTICS_REPLAY_SCRIPT_URL',
  'CLOUDFLARE_PAGES_DEPLOY_HOOK_URL',
  'STAGE_WEBHOOK_SECRET'
];

const browserFacingRoots = [
  'src/components/',
  'src/layouts/',
  'src/pages/',
  'optional/newsletter/'
];

const manifests = loadModuleManifests();

function fail(message) {
  console.error(`[template-guard] ${message}`);
  process.exitCode = 1;
}

function read(relativePath) {
  return readFileSync(join(root, relativePath), 'utf8');
}

function exists(relativePath) {
  try {
    statSync(join(root, relativePath));
    return true;
  } catch {
    return false;
  }
}

function moduleEnabled(name) {
  const configSource = read('src/template.config.ts');
  const match = configSource.match(new RegExp(`${name}:\\s*(true|false)`));
  return !match || match[1] === 'true';
}

function isGitIgnored(relativePath) {
  try {
    execFileSync('git', ['check-ignore', '--quiet', relativePath], { cwd: root, stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function walk(directory) {
  const entries = readdirSync(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolutePath = join(directory, entry.name);
    const relativePath = relative(root, absolutePath);

    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        files.push(...walk(absolutePath));
      }
      continue;
    }

    if (entry.isFile() && scannedExtensions.has(extname(entry.name))) {
      files.push(relativePath);
    }
  }

  return files;
}

const activeRequiredFiles = requiredFiles.filter((file) => {
  if (file === 'functions/api/preview.ts') return moduleEnabled('preview');
  if (file === 'functions/api/stage/rebuild.ts') return moduleEnabled('rebuildWebhook');
  if (file === 'src/pages/posts/index.astro' || file === 'src/pages/posts/[slug].astro') return moduleEnabled('posts');
  if (file === 'src/components/islands/IslandStatus.svelte') return moduleEnabled('svelteIslands');
  return true;
});

const manifestErrors = manifests.flatMap(validateModuleManifest);
for (const error of manifestErrors) fail(error);

for (const file of activeRequiredFiles) {
  if (!exists(file)) {
    fail(`Missing required template file: ${file}`);
  }
}

for (const file of forbiddenLocalEnvFiles) {
  if (exists(file) && !isGitIgnored(file)) {
    fail(`Do not commit local environment file: ${file}`);
  }
}

const envExample = read('.env.example');
const enabledSensitiveEnv = new Set(['OOOPS_STAGE_API_TOKEN']);
if (moduleEnabled('preview')) {
  enabledSensitiveEnv.add('STAGE_PREVIEW_TOKEN');
  enabledSensitiveEnv.add('STAGE_PREVIEW_SECRET');
}
if (moduleEnabled('newsletter')) enabledSensitiveEnv.add('PUBLIC_NEWSLETTER_FORM_TOKEN');
if (moduleEnabled('analytics')) {
  enabledSensitiveEnv.add('PUBLIC_STAGE_ANALYTICS_SCRIPT_URL');
  enabledSensitiveEnv.add('PUBLIC_STAGE_ANALYTICS_WEBSITE_ID');
  enabledSensitiveEnv.add('PUBLIC_STAGE_ANALYTICS_REPLAY_SCRIPT_URL');
}
if (moduleEnabled('rebuildWebhook')) {
  enabledSensitiveEnv.add('CLOUDFLARE_PAGES_DEPLOY_HOOK_URL');
  enabledSensitiveEnv.add('STAGE_WEBHOOK_SECRET');
}

for (const variable of requiredBlankExampleSecrets.filter((item) => enabledSensitiveEnv.has(item))) {
  const match = envExample.match(new RegExp(`^${variable}=(.*)$`, 'm'));
  if (!match) {
    fail(`Missing ${variable} in .env.example`);
    continue;
  }
  if (match[1].trim() !== '') {
    fail(`${variable} must stay blank in .env.example`);
  }
}

const packageJson = JSON.parse(read('package.json'));
const templatePolicy = JSON.parse(read('template-policy.json'));

if (packageJson.engines?.node !== templatePolicy.runtime?.node) {
  fail(`package.json engines.node must be ${templatePolicy.runtime?.node}.`);
}
if (packageJson.packageManager !== templatePolicy.runtime?.packageManager) {
  fail(`package.json packageManager must be ${templatePolicy.runtime?.packageManager}.`);
}
if (!/^\^7(?:\.|$)/.test(packageJson.dependencies?.astro ?? '')) {
  fail('Astro must use a compatible major-7 range.');
}
if (exists('package-lock.json')) {
  fail('package-lock.json is forbidden; pnpm-lock.yaml is the canonical lockfile.');
}

const astroConfig = read('astro.config.mjs');
if (!/output:\s*['"]static['"]/.test(astroConfig)) {
  fail('astro.config.mjs must keep output: "static".');
}

const templateConfigSource = read('src/template.config.ts');
if (!/defaultLocale:\s*['"]en['"]/.test(templateConfigSource)) {
  fail('src/template.config.ts must keep en as the default locale.');
}

const ciWorkflow = read('.github/workflows/ci.yml');
for (const requiredFragment of [
  'permissions:',
  'contents: read',
  'version: 11.13.1',
  'node-version: 22.14.0',
  'pnpm install --frozen-lockfile'
]) {
  if (!ciWorkflow.includes(requiredFragment)) {
    fail(`CI workflow must include ${requiredFragment}.`);
  }
}

for (const adapter of [
  '@ooopsstudio/analytics-consent-astro',
  '@ooopsstudio/accessibility-astro',
  '@ooopsstudio/ui-astro'
]) {
  const manifestPath = `node_modules/${adapter}/package.json`;
  if (!exists(manifestPath)) continue;
  const peerRange = JSON.parse(read(manifestPath)).peerDependencies?.astro ?? '';
  if (!peerRange.includes('7') || !peerRange.includes('<8')) {
    fail(`${adapter} must declare an Astro 7-compatible peer range.`);
  }
}

for (const [dependency, expectedRange] of Object.entries(templatePolicy.canonicalPackages ?? {})) {
  if (packageJson.dependencies?.[dependency] !== expectedRange) {
    fail(`Required runtime dependency ${dependency} must use ${expectedRange}.`);
  }
}

for (const [file, imports] of Object.entries(templatePolicy.ownedImports ?? {})) {
  const source = read(file);
  for (const dependency of imports) {
    if (!source.includes(dependency)) fail(`${file} must delegate behavior to ${dependency}.`);
  }
}

const uiWrapperRoot = templatePolicy.ownershipGuardrails?.uiWrapperRoot ?? 'src/components/ui/';
const forbiddenUiControllerPatterns = templatePolicy.ownershipGuardrails?.forbiddenUiControllerPatterns ?? [];
for (const file of walk(join(root, uiWrapperRoot))) {
  const source = read(file);
  for (const pattern of forbiddenUiControllerPatterns) {
    if (source.includes(pattern)) fail(`${file} must delegate ${pattern} behavior to the canonical UI packages.`);
  }
}

for (const section of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
  const dependencies = packageJson[section] && typeof packageJson[section] === 'object' ? packageJson[section] : {};
  for (const [name, version] of Object.entries(dependencies)) {
    if (name.startsWith('@ooopsstudio/') && typeof version === 'string' && /^(file:|link:|workspace:|\.\.?\/)/.test(version)) {
      fail(`Use a published semver version for ${name}; local dependency paths are not allowed in ${section}.`);
    }
  }
}

for (const manifest of manifests) {
  if (!exists(manifest.manifestPath)) fail(`Missing module manifest for ${manifest.id}`);
  for (const file of manifest.files ?? []) {
    if (!exists(file.from)) fail(`${manifest.id} missing source file ${file.from}`);
  }
}

for (const manifest of manifests) {
  for (const [dependency, version] of Object.entries(manifest.dependencies ?? {})) {
    const actual = packageJson.dependencies?.[dependency];
    if (moduleEnabled(manifest.id) && actual !== version) {
      fail(`${manifest.id} requires ${dependency}@${version}.`);
    }
    if (!moduleEnabled(manifest.id) && actual !== undefined) {
      fail(`${manifest.id} is disabled but ${dependency} remains installed.`);
    }
  }
}

const stageSource = [
  read('src/lib/stage/client.ts'),
  read('src/lib/stage/homepage.ts'),
  read('src/lib/posts/client.ts')
].join('\n');

const stageClientSource = read('src/lib/stage/client.ts');
if (!stageClientSource.includes("@ooopsstudio/stage-api")) {
  fail('src/lib/stage/client.ts must use @ooopsstudio/stage-api.');
}
if (!stageClientSource.includes("@ooopsstudio/stage-astro")) {
  fail('src/lib/stage/client.ts must use @ooopsstudio/stage-astro for Astro env/client setup.');
}
for (const forbidden of ['class OoopsStageClient', 'authorization:', 'Bearer ${', 'fetchImpl']) {
  if (stageClientSource.includes(forbidden)) {
    fail(`src/lib/stage/client.ts must not reimplement a low-level Stage REST client (${forbidden}).`);
  }
}

const cloudflareFunctionSource = [
  moduleEnabled('preview') && exists('functions/api/preview.ts') ? read('functions/api/preview.ts') : '',
  moduleEnabled('rebuildWebhook') && exists('functions/api/stage/rebuild.ts') ? read('functions/api/stage/rebuild.ts') : ''
].join('\n');
if ((moduleEnabled('preview') || moduleEnabled('rebuildWebhook')) && !cloudflareFunctionSource.includes('@ooopsstudio/stage-cloudflare')) {
  fail('Cloudflare Functions must use @ooopsstudio/stage-cloudflare helpers.');
}

for (const [file, label] of [
  ['src/lib/seo/sitemap.ts', 'sitemap'],
  ['src/lib/seo/schema.ts', 'schema.org'],
  ['src/lib/i18n/routing.ts', 'i18n routing']
]) {
  if (!read(file).includes('@ooopsstudio/stage-astro')) {
    fail(`${file} must delegate generic ${label} helpers to @ooopsstudio/stage-astro.`);
  }
}

if (!stageSource.includes('getStageSingle') && !stageSource.includes('getSingle')) {
  fail('Expected Stage API v1 single-type client usage was not found.');
}

if (!stageSource.includes('getStageCollectionEntries') && !stageSource.includes('listCollectionEntries')) {
  fail('Expected Stage API v1 collection client usage was not found.');
}

const packageScripts = packageJson.scripts && typeof packageJson.scripts === 'object' ? packageJson.scripts : {};
for (const script of ['test:i18n', 'test:signatures', 'test:newsletter', 'setup:client']) {
  if (!packageScripts[script]) {
    fail(`Missing package script: ${script}`);
  }
}

for (const script of ['validate:env', 'check:content-health', 'test:modules', 'setup:module']) {
  if (!packageScripts[script]) {
    fail(`Missing package script: ${script}`);
  }
}

const headers = read('public/_headers');
for (const header of ['Content-Security-Policy', 'X-Frame-Options', 'Permissions-Policy', 'Cache-Control']) {
  if (!headers.includes(header)) fail(`public/_headers must include ${header}`);
}

for (const file of walk(root)) {
  const source = read(file);
  if (/(^|\/)rss(?:\.|\/|$)/i.test(file)) fail(`RSS is outside the template scope: ${file}`);
  for (const fragment of forbiddenFragments) {
    if (source.includes(fragment)) {
      fail(`Forbidden template fragment "${fragment}" found in ${file}`);
    }
  }

  if (browserFacingRoots.some((prefix) => file.startsWith(prefix))) {
    for (const secret of ['OOOPS_STAGE_API_TOKEN', 'STAGE_API_TOKEN', 'STAGE_PREVIEW_TOKEN', 'STAGE_PREVIEW_SECRET']) {
      if (source.includes(secret)) {
        fail(`Browser-facing file must not reference ${secret}: ${file}`);
      }
    }
  }
}

for (const [file, forbidden] of Object.entries({
  'src/components/AccessibilityMenu.astro': ['localStorage', 'createModalFocusController', 'addEventListener'],
  'src/components/stage/AnalyticsConsent.astro': ['localStorage', 'createConsentBanner', 'setConsent(', 'revokeConsent('],
  'src/components/stage/StageAnalytics.astro': ['configurePublicAnalytics(', 'addEventListener'],
  'src/components/ui/SelectField.astro': ['addEventListener', 'role="listbox"', 'keydown'],
  'src/components/ui/Dialog.astro': ['showModal(', 'addEventListener', 'keydown'],
  'src/components/ui/Modal.astro': ['showModal(', 'addEventListener', 'keydown'],
  'src/components/ui/Popover.astro': ['addEventListener', 'keydown']
})) {
  const source = read(file);
  for (const fragment of forbidden) {
    if (source.includes(fragment)) fail(`${file} duplicates canonical package behavior (${fragment}).`);
  }
}

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log('[template-guard] Stage API and template guard passed.');
