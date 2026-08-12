import {writeFileSync} from 'node:fs'
import {resolve} from 'node:path'

import {getEnabledModulesFromConfig} from './lib/module-manifest.mjs'

if (!getEnabledModulesFromConfig().visualEditor) {
	console.log('[editor] visual editor integration is disabled; token generation skipped.')
	process.exit(0)
}

const {loadEditorMetadata, renderTokenCss, root} = await import('./lib/editor-metadata.mjs')

const {template, tokens} = loadEditorMetadata()
writeFileSync(resolve(root, template.paths.generatedCss), renderTokenCss(tokens))
console.log(`[editor] generated ${template.paths.generatedCss} from ${template.paths.designTokens}.`)
