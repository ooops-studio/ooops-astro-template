import {existsSync, readFileSync, readdirSync} from 'node:fs'
import {join, resolve} from 'node:path'

import {parseEditorExtensionManifest, parseInteractiveSceneManifest} from '@ooopsstudio/editor-contracts'

import {loadEditorMetadata, renderTokenCss, root} from './lib/editor-metadata.mjs'
import {getEnabledModulesFromConfig, loadModuleManifests} from './lib/module-manifest.mjs'

const {template, components, tokens} = loadEditorMetadata()
const enabledModules = getEnabledModulesFromConfig()
const moduleManifests = loadModuleManifests()
const errors = []
const fail = (message) => errors.push(message)

const generatedPath = resolve(root, template.paths.generatedCss)
if (!existsSync(generatedPath)) fail(`Missing generated token CSS: ${template.paths.generatedCss}`)
else if (readFileSync(generatedPath, 'utf8') !== renderTokenCss(tokens)) fail(`${template.paths.generatedCss} is stale. Run pnpm generate:editor.`)

const tokenNames = new Set(tokens.tokens.map((token) => token.cssVariable))
const tokensById = new Map(tokens.tokens.map((token) => [token.id, token]))
for (const token of tokens.tokens) {
	for (const value of [token.value, ...Object.values(token.themeValues ?? {})]) {
		for (const match of String(value).matchAll(/var\((--[a-z0-9-]+)/g)) {
			if (!tokenNames.has(match[1])) fail(`${token.id} references undeclared token ${match[1]}.`)
		}
	}
}

const templateManifests = new Map(components.manifests.map((manifest) => [manifest.id, manifest]))
const canonicalModules = new Map()
for (const reference of components.components.filter((entry) => entry.behavior === 'canonical')) {
	if (!canonicalModules.has(reference.manifest)) canonicalModules.set(reference.manifest, await import(reference.manifest))
}

const canonicalManifests = new Map()
for (const [specifier, module] of canonicalModules) {
	const collection = module.uiComponentManifests ?? module.accessibilityAstroComponentManifests ?? module.accessibilityAstroEditorManifest?.components
	const manifests = Array.isArray(collection) ? collection : collection && typeof collection === 'object' ? Object.values(collection) : null
	if (!manifests) fail(`${specifier} does not export a component manifest collection.`)
	else canonicalManifests.set(specifier, new Map(manifests.map((manifest) => [manifest.id, manifest])))
}

const resolvedManifests = []
for (const reference of components.components) {
	if (!existsSync(resolve(root, reference.source))) fail(`${reference.id} source does not exist: ${reference.source}`)
	const manifest = reference.behavior === 'template'
		? templateManifests.get(reference.manifestId)
		: canonicalManifests.get(reference.manifest)?.get(reference.manifestId)
	if (!manifest) fail(`${reference.id} cannot resolve manifest ${reference.manifestId} from ${reference.manifest}.`)
	else resolvedManifests.push(manifest)
}

for (const manifest of resolvedManifests) {
	for (const part of manifest.parts) {
		for (const tokenId of part.positioning.zIndex.tokens) {
			const token = tokensById.get(tokenId)
			if (!token) fail(`${manifest.id}:${part.id} references undeclared z-index token ${tokenId}.`)
			else if (token.category !== 'layer' || token.type !== 'integer') fail(`${tokenId} must be a layer/integer design token.`)
		}
		if (!part.positioning.editable && (part.positioning.offsets.length > 0 || part.positioning.zIndex.editable)) fail(`${manifest.id}:${part.id} exposes locked positioning controls.`)
	}
}

for (const binding of components.bindings) {
	if (binding.mode !== 'read-only') fail(`${binding.id} must remain read-only.`)
	if (!template.providers.some((provider) => provider.id === binding.provider && provider.mode === 'read-only')) fail(`${binding.id} references an unknown read-only provider.`)
	if (/token|secret|credential|password/i.test(`${binding.fieldPath} ${binding.target}`)) fail(`${binding.id} exposes a sensitive binding.`)
}

const resolvedScenes = []
for (const reference of components.scenes ?? []) {
	if (!existsSync(resolve(root, reference.source))) {
		fail(`${reference.id} scene source does not exist: ${reference.source}`)
	}
	if (!existsSync(resolve(root, reference.manifest))) {
		fail(`${reference.id} scene manifest does not exist: ${reference.manifest}`)
		continue
	}
	const parsed = parseInteractiveSceneManifest(
		JSON.parse(readFileSync(resolve(root, reference.manifest), 'utf8'))
	)
	if (!parsed.ok) {
		fail(`${reference.id} scene manifest is invalid: ${parsed.issues.map((issue) => `${issue.path} ${issue.message}`).join('; ')}`)
		continue
	}
	if (parsed.value.id !== reference.manifestId) {
		fail(`${reference.id} references scene manifest ${reference.manifestId}, found ${parsed.value.id}.`)
	}
	if (parsed.value.internals !== 'locked') fail(`${reference.id} scene internals must stay locked.`)
	for (const asset of parsed.value.assets) {
		if (!existsSync(resolve(root, asset.source))) {
			fail(`${reference.id} scene asset does not exist: ${asset.source}`)
		}
	}
	if (!existsSync(resolve(root, parsed.value.fallbacks.poster))) {
		fail(`${reference.id} fallback poster does not exist: ${parsed.value.fallbacks.poster}`)
	}
	for (const specifier of Object.values(parsed.value.adapters)) {
		try { import.meta.resolve(specifier) } catch { fail(`${reference.id} cannot resolve ${specifier}.`) }
	}
	resolvedScenes.push(parsed.value)
}

const componentManifestById = new Map(resolvedManifests.map((manifest) => [manifest.id, manifest]))
const sceneManifestById = new Map(resolvedScenes.map((manifest) => [manifest.id, manifest]))
const resolvedExtensions = []
for (const reference of components.extensions ?? []) {
	if (reference.behavior !== 'template') {
		fail(`${reference.id} canonical extension resolution is not supported by this template.`)
		continue
	}
	if (!existsSync(resolve(root, reference.manifest))) {
		fail(`${reference.id} extension manifest does not exist: ${reference.manifest}`)
		continue
	}
	const parsed = parseEditorExtensionManifest(
		JSON.parse(readFileSync(resolve(root, reference.manifest), 'utf8'))
	)
	if (!parsed.ok) {
		fail(`${reference.id} extension manifest is invalid: ${parsed.issues.map((issue) => `${issue.path} ${issue.message}`).join('; ')}`)
		continue
	}
	if (parsed.value.id !== reference.manifestId) {
		fail(`${reference.id} references extension manifest ${reference.manifestId}, found ${parsed.value.id}.`)
	}
	for (const targetId of parsed.value.targetComponents) {
		const component = componentManifestById.get(targetId)
		const scene = sceneManifestById.get(targetId)
		if (!component && !scene) {
			fail(`${parsed.value.id} targets unknown component ${targetId}.`)
			continue
		}
		for (const control of parsed.value.controls) {
			const binding = control.binding
			if (binding.kind === 'prop') {
				const prop = component?.props.find((entry) => entry.id === binding.prop && entry.editable)
					?? scene?.controls.find((entry) => entry.id === binding.prop && entry.editable)
					?? (scene && binding.prop === 'quality' ? {schema: {kind: 'enum'}} : undefined)
					?? (scene && ['poster', 'description', ...scene.assets.map((asset) => asset.id)].includes(binding.prop) ? {schema: {kind: 'string'}} : undefined)
				if (!prop || prop.schema.kind !== control.schema.kind) fail(`${parsed.value.id}.${control.id} does not match editable prop ${targetId}.${binding.prop}.`)
			} else if (binding.kind === 'style') {
				const part = component?.parts.find((entry) => entry.id === binding.part)
				if (!part?.styleProperties.includes(binding.property)) fail(`${parsed.value.id}.${control.id} does not match editable style ${targetId}.${binding.part}.${binding.property}.`)
				if (binding.state && !part?.states.includes(binding.state)) fail(`${parsed.value.id}.${control.id} references undeclared state ${binding.state}.`)
			} else if (tokensById.get(binding.token)?.editable !== true) {
				fail(`${parsed.value.id}.${control.id} references unavailable token ${binding.token}.`)
			}
		}
	}
	resolvedExtensions.push(parsed.value)
}

for (const manifest of moduleManifests) {
	const expectedScenes = manifest.editor?.scenes ?? []
	for (const expected of expectedScenes) {
		const present = (components.scenes ?? []).some((scene) => scene.id === expected.id)
		if (Boolean(enabledModules[manifest.id]) !== present) {
			fail(`${manifest.id} scene registry state is inconsistent for ${expected.id}.`)
		}
	}
	const expectedExtensions = manifest.editor?.extensions ?? []
	for (const expected of expectedExtensions) {
		const present = (components.extensions ?? []).some((extension) => extension.id === expected.id)
		if (Boolean(enabledModules[manifest.id]) !== present) {
			fail(`${manifest.id} extension registry state is inconsistent for ${expected.id}.`)
		}
	}
	for (const [dependency, version] of Object.entries(manifest.dependencies ?? {})) {
		const actual = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))
			.dependencies?.[dependency]
		if (enabledModules[manifest.id] && actual !== version) {
			fail(`${manifest.id} requires ${dependency}@${version}.`)
		}
		if (!enabledModules[manifest.id] && actual !== undefined) {
			fail(`${manifest.id} is disabled but ${dependency} remains in package.json.`)
		}
	}
}

const walk = (directory) => readdirSync(directory, {withFileTypes: true}).flatMap((entry) => {
	const path = join(directory, entry.name)
	return entry.isDirectory() ? walk(path) : [path]
})
for (const file of walk(resolve(root, 'src')).filter((path) => /\.(?:astro|css)$/.test(path))) {
	const source = readFileSync(file, 'utf8')
	for (const match of source.matchAll(/(--[a-z0-9-]+)\s*:[^;]+;\s*\/\*\s*editor:editable\s*\*\//g)) {
		if (!tokenNames.has(match[1])) fail(`${file.slice(root.length + 1)} declares unregistered editable token ${match[1]}.`)
	}
}

if (errors.length) {
	for (const error of errors) console.error(`[editor] ${error}`)
	process.exit(1)
}
console.log(`[editor] validated ${components.components.length} component references, ${resolvedScenes.length} scenes, ${resolvedExtensions.length} extensions, ${tokens.typographyStyles?.length ?? 0} typography styles, ${components.bindings.length} read-only bindings and ${tokens.tokens.length} design tokens.`)
