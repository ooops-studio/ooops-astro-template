import {execFileSync} from 'node:child_process'
import {
	cpSync,
	existsSync,
	mkdtempSync,
	mkdirSync,
	rmSync,
	writeFileSync
} from 'node:fs'
import {tmpdir} from 'node:os'
import {dirname, join, resolve} from 'node:path'
import {
	getEnabledModulesFromConfig,
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
} from './lib/module-manifest.mjs'

const args = process.argv.slice(2).filter((argument) => argument !== '--')
const command = args[0]
const moduleId = args[1]
const packageSourceArgument = args.find((argument) => argument.startsWith('--package-source='))
const skipInstall = args.includes('--skip-install')
const packageSource = packageSourceArgument?.split('=')[1]
	?? (readText('pnpm-workspace.yaml').includes('file:../ooops-') ? 'local' : 'published')
const manifests = loadModuleManifests()
const errors = manifests.flatMap(validateModuleManifest)
if (errors.length) {
	for (const error of errors) console.error(`[setup:module] ${error}`)
	process.exit(1)
}
if (!['local', 'published'].includes(packageSource)) {
	console.error('[setup:module] --package-source must be local or published.')
	process.exit(1)
}

const enabledModules = getEnabledModulesFromConfig()
const manifest = manifests.find((item) => item.id === moduleId)
const usage = () => {
	console.log(
		'Usage: pnpm setup:module -- list|status|add <module>|remove <module> [--package-source=local|published] [--skip-install]'
	)
}

if (!command || command === 'list') {
	for (const item of manifests) console.log(`${item.id}\t${item.label}`)
	process.exit(0)
}
if (command === 'status') {
	for (const item of manifests) {
		console.log(`${enabledModules[item.id] ? '[x]' : '[ ]'} ${item.id}\t${item.label}`)
	}
	process.exit(0)
}
if (!['add', 'remove'].includes(command) || !manifest) {
	usage()
	process.exit(1)
}

for (const file of manifest.files ?? []) {
	if (command === 'add' && !existsSync(resolve(root, file.from))) {
		throw new Error(`Missing module source: ${file.from}`)
	}
}

const backupRoot = mkdtempSync(join(tmpdir(), 'ooops-astro-module-'))
const targets = new Set([
	'package.json',
	'pnpm-lock.yaml',
	'pnpm-workspace.yaml',
	'src/template.config.ts',
	'.env.example',
	'SETUP.md',
	'editor/components.json',
	...manifests.flatMap((item) => (item.files ?? []).map((file) => file.to)),
	...manifests.flatMap((item) => item.cleanupTargets ?? [])
])
const snapshots = [...targets].map((target) => {
	const source = resolve(root, target)
	const backup = resolve(backupRoot, target)
	const existed = existsSync(source)
	if (existed) {
		mkdirSync(dirname(backup), {recursive: true})
		cpSync(source, backup, {recursive: true})
	}
	return {target, source, backup, existed}
})

const write = (path, value) => {
	mkdirSync(dirname(resolve(root, path)), {recursive: true})
	writeFileSync(resolve(root, path), value)
}
const writeJson = (path, value) => write(path, `${JSON.stringify(value, null, 2)}\n`)
const restore = () => {
	for (const snapshot of [...snapshots].reverse()) {
		if (existsSync(snapshot.source)) rmSync(snapshot.source, {recursive: true, force: true})
		if (snapshot.existed) {
			mkdirSync(dirname(snapshot.source), {recursive: true})
			cpSync(snapshot.backup, snapshot.source, {recursive: true})
		}
	}
}

try {
	enabledModules[manifest.id] = command === 'add'
	for (const item of manifests) {
		for (const file of item.files ?? []) {
			const editorOwned = file.to === 'editor' || file.to.startsWith('editor/')
			const shouldCopy = enabledModules[item.id] && (!editorOwned || enabledModules.visualEditor)
			if (shouldCopy) {
				mkdirSync(dirname(resolve(root, file.to)), {recursive: true})
				cpSync(resolve(root, file.from), resolve(root, file.to), {recursive: true})
			} else {
				rmSync(resolve(root, file.to), {recursive: true, force: true})
			}
		}
	}
	if (!enabledModules[manifest.id]) {
		for (const target of manifest.cleanupTargets ?? []) {
			rmSync(resolve(root, target), {recursive: true, force: true})
		}
	}

	const config = readText('src/template.config.ts')
	let nextConfig = config
	for (const item of manifests) {
		if (item.id === 'i18n') continue
		const value = Boolean(enabledModules[item.id])
		const pattern = new RegExp(`(${item.id}:\\s*)(true|false)`)
		if (!pattern.test(nextConfig)) {
			throw new Error(`src/template.config.ts is missing module state for ${item.id}.`)
		}
		nextConfig = nextConfig.replace(pattern, `$1${value}`)
	}
	nextConfig = nextConfig.replace(
		/i18nEnabled:\s*(true|false)/,
		`i18nEnabled: ${Boolean(enabledModules.i18n)}`
	)
	write('src/template.config.ts', nextConfig)

	writeJson(
		'package.json',
		syncModuleDependencies(readJson('package.json'), manifests, enabledModules)
	)
	write(
		'pnpm-workspace.yaml',
		syncModuleOverrides(readText('pnpm-workspace.yaml'), manifests, enabledModules, packageSource)
	)
	if (enabledModules.visualEditor) {
		writeJson(
			'editor/components.json',
			syncModuleEditorExtensions(
				syncModuleEditorScenes(readJson('editor/components.json'), manifests, enabledModules),
				manifests,
				enabledModules
			)
		)
	}
	write('.env.example', renderEnvExample({manifests, enabledModules}))
	write(
		'SETUP.md',
		renderSetupMarkdown({
			projectName: readJson('package.json').name,
			manifests,
			enabledModules,
			packageSource
		})
	)
	if (!skipInstall) execFileSync('pnpm', ['install'], {cwd: root, stdio: 'inherit'})
	console.log(`[setup:module] ${command === 'add' ? 'enabled' : 'removed'} ${manifest.id}`)
} catch (error) {
	restore()
	console.error(`[setup:module] rolled back ${moduleId}: ${error instanceof Error ? error.message : error}`)
	process.exitCode = 1
} finally {
	rmSync(backupRoot, {recursive: true, force: true})
}
