import {
  parseDesignTokenManifest,
  parseTemplateComponentRegistry,
  parseTemplateManifest
} from '@ooopsstudio/editor-contracts';
import { accessibilityAstroEditorManifest } from '@ooopsstudio/accessibility-astro/editor';
import { uiComponentManifests } from '@ooopsstudio/ui-primitives/editor';

import componentSource from '../../../editor/components.json';
import tokenSource from '../../../editor/design-tokens.json';
import templateSource from '../../../editor/template.json';

const unwrap = <Value>(name: string, result: {ok: true; value: Readonly<Value>} | {ok: false; issues: ReadonlyArray<{path: string; message: string}>}) => {
  if (result.ok) return result.value;
  throw new Error(`Invalid ${name}: ${result.issues.map((issue) => `${issue.path} ${issue.message}`).join('; ')}`);
};

export const templateEditorManifest = unwrap('template editor manifest', parseTemplateManifest(templateSource));
export const templateComponentRegistry = unwrap('template component registry', parseTemplateComponentRegistry(componentSource));
export const templateDesignTokens = unwrap('template design tokens', parseDesignTokenManifest(tokenSource));

export const canonicalEditorManifests = Object.freeze({
  ui: uiComponentManifests,
  accessibility: accessibilityAstroEditorManifest.components
});

export const getTemplateComponentReference = (id: string) =>
  templateComponentRegistry.components.find((component) => component.id === id);

export const getTemplateOwnedManifest = (id: string) =>
  templateComponentRegistry.manifests.find((manifest) => manifest.id === id);
