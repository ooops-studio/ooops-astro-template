import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = fileURLToPath(new URL('../..', import.meta.url));
export const optionalRoot = join(root, 'optional');

export const readJson = (path) => JSON.parse(readFileSync(resolve(root, path), 'utf8'));

export const readText = (path) => readFileSync(resolve(root, path), 'utf8');

export const pathExists = (path) => existsSync(resolve(root, path));

export const moduleManifestSchema = {
  requiredString: ['id', 'label', 'readme'],
  arrays: ['deps', 'env', 'files', 'cleanupTargets', 'validationChecks']
};

const dependencyName = /^(?:@[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._-]*|[a-z0-9][a-z0-9._-]*)$/;
const localPath = /^file:(?:\.\.\/)?(?!.*\/\.\.(?:\/|$))[A-Za-z0-9_@./-]+$/;
const safeRelativePath = (value) =>
  typeof value === 'string'
  && Boolean(value)
  && !value.startsWith('/')
  && !value.split('/').includes('..');

export function loadModuleManifests() {
  if (!existsSync(optionalRoot)) return [];

  return readdirSync(optionalRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const manifestPath = join(optionalRoot, entry.name, 'module.json');
      if (!existsSync(manifestPath)) return null;
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
      return {
        ...manifest,
        directory: `optional/${entry.name}`,
        manifestPath: relative(root, manifestPath)
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function validateModuleManifest(manifest) {
  const errors = [];
  for (const key of moduleManifestSchema.requiredString) {
    if (typeof manifest[key] !== 'string' || !manifest[key].trim()) {
      errors.push(`${manifest.manifestPath || manifest.id || 'module'} missing string "${key}"`);
    }
  }
  for (const key of moduleManifestSchema.arrays) {
    if (manifest[key] !== undefined && !Array.isArray(manifest[key])) {
      errors.push(`${manifest.id || manifest.manifestPath} "${key}" must be an array`);
    }
  }
  for (const key of ['dependencies', 'devDependencies', 'localOverrides']) {
    if (manifest[key] === undefined) continue;
    if (!manifest[key] || typeof manifest[key] !== 'object' || Array.isArray(manifest[key])) {
      errors.push(`${manifest.id || manifest.manifestPath} "${key}" must be an object`);
      continue;
    }
    for (const [name, version] of Object.entries(manifest[key])) {
      if (!dependencyName.test(name) || typeof version !== 'string' || !version.trim()) {
        errors.push(`${manifest.id} has an invalid ${key} entry for ${name}`);
      }
      if (key === 'localOverrides' && typeof version === 'string' && !localPath.test(version)) {
        errors.push(`${manifest.id} local override for ${name} must be a contained file: path`);
      }
    }
  }
  if (manifest.editor !== undefined) {
    if (!manifest.editor || typeof manifest.editor !== 'object' || Array.isArray(manifest.editor)) {
      errors.push(`${manifest.id} "editor" must be an object`);
    } else {
      for (const key of ['scenes', 'extensions']) {
        if (manifest.editor[key] !== undefined && !Array.isArray(manifest.editor[key])) {
          errors.push(`${manifest.id} editor.${key} must be an array`);
        }
      }
    }
  }
  if (manifest.readme && !pathExists(manifest.readme)) {
    errors.push(`${manifest.id} readme does not exist: ${manifest.readme}`);
  }
  if (manifest.readme && !safeRelativePath(manifest.readme)) {
    errors.push(`${manifest.id} readme must be a contained relative path`);
  }
  for (const file of manifest.files ?? []) {
    if (!file.from || !file.to) {
      errors.push(`${manifest.id} file entries must include "from" and "to"`);
      continue;
    }
    if (!safeRelativePath(file.from) || !safeRelativePath(file.to)) {
      errors.push(`${manifest.id} file paths must be contained relative paths`);
      continue;
    }
    if (!pathExists(file.from)) errors.push(`${manifest.id} source file does not exist: ${file.from}`);
  }
  for (const target of manifest.cleanupTargets ?? []) {
    if (!safeRelativePath(target)) {
      errors.push(`${manifest.id} cleanup targets must be contained relative paths`);
    }
  }
  return errors;
}

export function syncModuleDependencies(packageJson, manifests, enabledModules) {
  for (const section of ['dependencies', 'devDependencies']) {
    const owned = new Set(manifests.flatMap((manifest) => Object.keys(manifest[section] ?? {})));
    const dependencies = {...(packageJson[section] ?? {})};
    for (const name of owned) delete dependencies[name];
    for (const manifest of manifests) {
      if (!enabledModules[manifest.id]) continue;
      Object.assign(dependencies, manifest[section] ?? {});
    }
    packageJson[section] = Object.fromEntries(
      Object.entries(dependencies).sort(([left], [right]) => left.localeCompare(right))
    );
  }
  return packageJson;
}

export function syncModuleOverrides(workspaceSource, manifests, enabledModules, packageSource = 'published') {
  const start = '  # ooops optional modules:start';
  const end = '  # ooops optional modules:end';
  const pattern = new RegExp(`\\n?${start}[\\s\\S]*?${end}\\n?`, 'm');
  const withoutGenerated = workspaceSource.replace(pattern, '\n');
  if (packageSource !== 'local') return withoutGenerated.trimEnd() + '\n';
  const overrides = {};
  for (const manifest of manifests) {
    if (enabledModules[manifest.id]) Object.assign(overrides, manifest.localOverrides ?? {});
  }
  const entries = Object.entries(overrides).sort(([left], [right]) => left.localeCompare(right));
  if (!entries.length) return withoutGenerated.trimEnd() + '\n';
  const block = [
    start,
    ...entries.map(([name, target]) => `  '${name}': ${target}`),
    end
  ].join('\n');
  return `${withoutGenerated.trimEnd()}\n${block}\n`;
}

export function syncModuleEditorScenes(registry, manifests, enabledModules) {
  const owned = new Set(
    manifests.flatMap((manifest) => (manifest.editor?.scenes ?? []).map((scene) => scene.id))
  );
  const retained = (registry.scenes ?? []).filter((scene) => !owned.has(scene.id));
  const enabled = manifests.flatMap((manifest) =>
    enabledModules[manifest.id] ? (manifest.editor?.scenes ?? []) : []
  );
  registry.scenes = [...retained, ...enabled].sort((left, right) => left.id.localeCompare(right.id));
  return registry;
}

export function syncModuleEditorExtensions(registry, manifests, enabledModules) {
  const owned = new Set(
    manifests.flatMap((manifest) => (manifest.editor?.extensions ?? []).map((extension) => extension.id))
  );
  const retained = (registry.extensions ?? []).filter((extension) => !owned.has(extension.id));
  const enabled = manifests.flatMap((manifest) =>
    enabledModules[manifest.id] ? (manifest.editor?.extensions ?? []) : []
  );
  registry.extensions = [...retained, ...enabled].sort((left, right) => left.id.localeCompare(right.id));
  return registry;
}

export function getEnabledModulesFromConfig() {
  const source = readText('src/template.config.ts');
  const modules = {};
  for (const manifest of loadModuleManifests()) {
    const match = source.match(new RegExp(`${manifest.id}:\\s*(true|false)`));
    modules[manifest.id] = match ? match[1] === 'true' : Boolean(manifest.defaultEnabled);
  }
  return modules;
}

export function renderSetupMarkdown({ projectName, manifests, enabledModules, packageSource = 'published' }) {
  const enabled = manifests.filter((manifest) => enabledModules[manifest.id]);
  const envRows = [
    { module: 'core', name: 'OOOPS_CMS_API_BASE_URL', required: true },
    { module: 'core', name: 'PUBLIC_SITE_URL', required: true },
    ...enabled.flatMap((manifest) => (manifest.env ?? []).map((env) => ({ module: manifest.id, ...env })))
  ];
  const cloudflareRows = enabled
    .filter((manifest) => manifest.cloudflare)
    .map((manifest) => `- ${manifest.label}: ${manifest.cloudflare}`);

  return `# Project Setup

Generated by \`pnpm setup:client\`.

## Project

- Name: \`${projectName}\`
- Enabled modules: ${enabled.length ? enabled.map((item) => `\`${item.id}\``).join(', ') : 'none'}
- Package source: \`${packageSource}\`

## Environment Checklist

${envRows.length ? envRows.map((row) => `- [ ] \`${row.name}\` (${row.module})${row.required === false ? ' optional' : ''}`).join('\n') : '- No module-specific env vars selected.'}

## Cloudflare Checklist

${cloudflareRows.length ? cloudflareRows.join('\n') : '- No Cloudflare-specific optional modules selected.'}

## Editor Metadata

- Portable registry: \`editor/template.json\` and \`editor/components.json\`.
- Design-token source: \`editor/design-tokens.json\`.
- Run \`pnpm generate:editor\` after token edits and \`pnpm check:editor\` before merge.
- CMS bindings are read-only metadata. Keep credentials and write capabilities outside the registry.
- \`OOOPS_EDITOR_MODE=1\` is development-only and enables markers only for components with an \`editorId\`.

## Module Documentation

${enabled.length ? enabled.map((item) => `- ${item.label}: ${item.readme}`).join('\n') : '- No optional module documentation selected.'}

## Next Steps

1. Run \`pnpm install\`.
2. Copy \`.env.example\` to \`.env.local\` and fill every checked env var.
3. Run \`pnpm validate\`.
4. Configure Cloudflare Pages env vars before deploy when preview or rebuild modules are enabled.
`;
}

export function renderEnvExample({ manifests, enabledModules }) {
  const coreLines = [
    'OOOPS_CMS_API_BASE_URL=http://cms.localhost:4175/api/cms/v1',
    'OOOPS_CMS_API_TOKEN=',
    'PUBLIC_SITE_URL=http://localhost:4321'
  ];

  const sections = [['Core CMS/site', coreLines]];
  for (const manifest of manifests) {
    if (!enabledModules[manifest.id]) continue;
    const env = manifest.env ?? [];
    if (!env.length) continue;
    sections.push([
      manifest.label,
      env.map((item) => `${item.name}=${item.example ?? ''}`)
    ]);
  }

  return `${sections.map(([title, lines]) => [`# ${title}`, ...lines].join('\n')).join('\n\n')}\n`;
}
