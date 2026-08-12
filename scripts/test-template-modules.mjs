import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import {
  loadModuleManifests,
  syncModuleDependencies,
  syncModuleEditorExtensions,
  syncModuleEditorScenes,
  syncModuleOverrides,
  validateModuleManifest
} from './lib/module-manifest.mjs';

const manifests = loadModuleManifests();
if (manifests.length < 10) {
  throw new Error(`Expected optional module manifests, found ${manifests.length}.`);
}

const errors = manifests.flatMap(validateModuleManifest);
if (errors.length) {
  throw new Error(errors.join('\n'));
}

const interactiveScene = manifests.find((manifest) => manifest.id === 'interactiveScene');
if (!interactiveScene?.devDependencies?.['@types/three']) {
  throw new Error('interactiveScene must own its Three.js declaration dependency.');
}
const enabledModules = Object.fromEntries(manifests.map((manifest) => [manifest.id, false]));
const editorPackageNames = [
  '@ooopsstudio/accessibility-editor-manifests',
  '@ooopsstudio/editor-astro',
  '@ooopsstudio/editor-contracts',
  '@ooopsstudio/ui-editor-manifests'
];
const editorlessFixture = syncModuleDependencies({dependencies: {}, devDependencies: {}}, manifests, enabledModules);
for (const dependency of editorPackageNames) {
  if (editorlessFixture.dependencies[dependency] || editorlessFixture.devDependencies[dependency]) {
    throw new Error(`Disabled visualEditor leaked ${dependency}.`);
  }
}

enabledModules.interactiveScene = true;
const packageFixture = syncModuleDependencies({dependencies: {}, devDependencies: {}}, manifests, enabledModules);
for (const dependency of ['@ooopsstudio/scene-core', '@ooopsstudio/scene-three', '@ooopsstudio/scene-astro', 'three']) {
  if (!packageFixture.dependencies[dependency]) throw new Error(`interactiveScene is missing ${dependency}.`);
}
if (!packageFixture.devDependencies['@types/three']) {
  throw new Error('interactiveScene did not add @types/three to devDependencies.');
}
for (const dependency of ['pngjs', '@types/pngjs']) {
  if (!packageFixture.devDependencies[dependency]) {
    throw new Error(`interactiveScene did not add ${dependency} to devDependencies.`);
  }
}
const localWorkspace = syncModuleOverrides('packages: []\n\noverrides:\n  esbuild: ^0.28.1\n', manifests, enabledModules, 'local');
if (!localWorkspace.includes("'@ooopsstudio/scene-core': file:../ooops-ui/packages/scene-core")) {
  throw new Error('Local module setup did not generate the scene-core override.');
}
const publishedWorkspace = syncModuleOverrides(localWorkspace, manifests, enabledModules, 'published');
if (publishedWorkspace.includes('@ooopsstudio/scene-core')) {
  throw new Error('Published module setup retained a local scene override.');
}
const registryFixture = syncModuleEditorScenes({scenes: []}, manifests, enabledModules);
if (registryFixture.scenes.length !== 1 || registryFixture.scenes[0].id !== 'reference-scene') {
  throw new Error('interactiveScene did not add its editor scene reference.');
}
const extensionRegistryFixture = syncModuleEditorExtensions({extensions: []}, manifests, enabledModules);
if (extensionRegistryFixture.extensions.length !== 1 || extensionRegistryFixture.extensions[0].id !== 'reference-scene-controls') {
  throw new Error('interactiveScene did not add its editor extension reference.');
}

enabledModules.visualEditor = true;
const editorFixture = syncModuleDependencies({dependencies: {}, devDependencies: {}}, manifests, enabledModules);
for (const dependency of editorPackageNames.filter((name) => name !== '@ooopsstudio/editor-contracts')) {
  if (!editorFixture.dependencies[dependency]) throw new Error(`visualEditor is missing ${dependency}.`);
}
if (!editorFixture.devDependencies['@ooopsstudio/editor-contracts']) {
  throw new Error('visualEditor is missing @ooopsstudio/editor-contracts from devDependencies.');
}
const editorLocalWorkspace = syncModuleOverrides('packages: []\n', manifests, enabledModules, 'local');
for (const dependency of editorPackageNames) {
  if (!editorLocalWorkspace.includes(`'${dependency}': file:`)) {
    throw new Error(`Local visualEditor setup did not generate the ${dependency} override.`);
  }
}

const dryRun = execFileSync('node', ['scripts/setup-client-project.mjs', 'dry-run-site', '--yes', '--dry-run'], {
  encoding: 'utf8'
});
if (!dryRun.includes('[setup] dry run. No files were changed.')) {
  throw new Error('setup-client-project dry-run did not report dry-run mode.');
}
const sceneDryRun = execFileSync('node', [
  'scripts/setup-client-project.mjs',
  'dry-run-scene-site',
  '--yes',
  '--dry-run',
  '--modules=interactiveScene',
  '--package-source=local'
], {encoding: 'utf8'});
for (const expected of ['src/scenes/reference-scene.ts', 'src/scenes/reference-scene.runtime.json']) {
  if (!sceneDryRun.includes(expected)) throw new Error(`interactiveScene dry run is missing ${expected}.`);
}
if (sceneDryRun.includes('editor/scenes/reference-scene.json')) {
  throw new Error('interactiveScene without visualEditor must not install editor scene metadata.');
}
const editorDryRun = execFileSync('node', [
  'scripts/setup-client-project.mjs',
  'dry-run-editor-site',
  '--yes',
  '--dry-run',
  '--modules=interactiveScene,visualEditor',
  '--package-source=local'
], {encoding: 'utf8'});
for (const expected of ['editor', 'src/lib/editor', 'scripts/lib/editor-metadata.mjs', 'editor/scenes/reference-scene.json']) {
  if (!editorDryRun.includes(expected)) throw new Error(`visualEditor dry run is missing ${expected}.`);
}

const list = execFileSync('node', ['scripts/setup-module.mjs', 'list'], { encoding: 'utf8' });
const pnpmList = execFileSync('pnpm', ['setup:module', '--', 'list'], { encoding: 'utf8' });
for (const id of ['newsletter', 'search', 'filters', 'gallery', 'mediaPlayer', 'interactiveScene', 'visualEditor']) {
  if (!list.includes(id)) throw new Error(`setup:module list is missing ${id}.`);
  if (!pnpmList.includes(id)) throw new Error(`pnpm setup:module list is missing ${id}.`);
}

const sourceExpectations = [
  ['optional/search/src/lib/search/headless.ts', 'searchItems'],
  ['optional/filters/src/lib/filters/url-state.ts', 'toggleFilterValue'],
  ['optional/gallery/src/lib/gallery/headless.ts', 'galleryActionFromKey'],
  ['optional/media-player/src/lib/media-player/headless.ts', 'mediaKeyAction'],
  ['optional/newsletter/src/components/newsletter/NewsletterForm.astro', 'role="status"'],
  ['src/components/cms/PreviewBanner.astro', 'Exit preview'],
  ['optional/interactive-scene/src/scenes/reference-scene.ts', 'defineThreeScene'],
  ['optional/interactive-scene/src/scenes/reference-scene.runtime.json', 'reducedMotion'],
  ['optional/interactive-scene/editor/scenes/reference-scene.json', '"internals": "locked"'],
  ['optional/interactive-scene/editor/extensions/reference-scene.json', '"pointer-influence"'],
  ['optional/interactive-scene/tests/e2e/interactive-scene.spec.ts', '100 Astro navigation cycles'],
  ['optional/visual-editor/module.json', '"defaultEnabled": false'],
  ['optional/visual-editor/src/lib/editor/registry.ts', '@ooopsstudio/ui-editor-manifests']
];

for (const [file, fragment] of sourceExpectations) {
  const source = readFileSync(file, 'utf8');
  if (!source.includes(fragment)) throw new Error(`${file} is missing ${fragment}`);
}

console.log('[test-template-modules] Module manifest and installer smoke tests passed.');
