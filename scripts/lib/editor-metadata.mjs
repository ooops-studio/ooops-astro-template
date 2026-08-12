import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {fileURLToPath} from 'node:url'

import {
	parseDesignTokenManifest,
	parseTemplateComponentRegistry,
	parseTemplateManifest
} from '@ooopsstudio/editor-contracts'

export const root = fileURLToPath(new URL('../..', import.meta.url))

const readJson = (path) => JSON.parse(readFileSync(resolve(root, path), 'utf8'))

const unwrap = (name, result) => {
	if (result.ok) return result.value
	throw new Error(`${name} is invalid:\n${result.issues.map((issue) => `- ${issue.path} [${issue.code}] ${issue.message}`).join('\n')}`)
}

export const loadEditorMetadata = () => ({
	template: unwrap('editor/template.json', parseTemplateManifest(readJson('editor/template.json'))),
	components: unwrap('editor/components.json', parseTemplateComponentRegistry(readJson('editor/components.json'))),
	tokens: unwrap('editor/design-tokens.json', parseDesignTokenManifest(readJson('editor/design-tokens.json')))
})

const renderDeclarations = (tokens, valueFor) => tokens
	.map((token) => {
		const value = valueFor(token)
		return value === undefined ? null : `    ${token.cssVariable}: ${String(value)};`
	})
	.filter(Boolean)
	.join('\n')

export const renderTokenCss = (manifest) => {
	const base = renderDeclarations(manifest.tokens, (token) => token.value)
	const dark = renderDeclarations(manifest.tokens, (token) => token.themeValues?.dark)
	const system = renderDeclarations(manifest.tokens, (token) => token.themeValues?.system ?? token.themeValues?.[manifest.systemTheme ?? 'dark'])

	return `/* Generated from editor/design-tokens.json by pnpm generate:editor. */
@layer tokens {
  :root,
  :root[data-theme='light'] {
    color-scheme: light;

${base}
  }

  :root[data-theme='dark'] {
    color-scheme: dark;

${dark}
  }

  @media (prefers-color-scheme: dark) {
    :root:not([data-theme]) {
      color-scheme: dark;

${system.replace(/^ {4}/gm, '      ')}
    }
  }
}
`
}
