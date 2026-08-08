import {writeFileSync} from 'node:fs'
import {resolve} from 'node:path'

import {loadEditorMetadata, renderTokenCss, root} from './lib/editor-metadata.mjs'

const {template, tokens} = loadEditorMetadata()
writeFileSync(resolve(root, template.paths.generatedCss), renderTokenCss(tokens))
console.log(`[editor] generated ${template.paths.generatedCss} from ${template.paths.designTokens}.`)
