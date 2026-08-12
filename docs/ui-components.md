# UI components

The template delegates interactive behavior to `@ooopsstudio/ui-astro` and keeps visual styling in local wrappers under `src/components/ui`.

Available wrappers cover Input, Textarea, Checkbox, RadioGroup, Switch, Select, Combobox, MultiSelect, DropdownMenu, Tooltip, Tabs, Accordion, Slider, NumberInput, SegmentedControl, Dialog, Modal and Popover.

```astro
---
import ComboboxField from '../components/ui/ComboboxField.astro';
const options = [{value: 'gr', label: 'Greece'}];
---

<ComboboxField id="country" name="country" label="Country" {options} clearable />
```

Target stable package hooks such as `[data-part='control']`, `[data-state='open']` and `[data-invalid='true']` from project-local CSS. Do not copy keyboard, layer, validation or form-state controllers into the template.

The portable visual-editor registry lives in `editor/template.json`, `editor/components.json` and `editor/design-tokens.json`. The typed loader at `src/lib/editor/registry.ts` validates those files with `@ooopsstudio/editor-contracts` and resolves the canonical UI/accessibility manifests.

Run `pnpm generate:editor` after changing design tokens. `pnpm check:editor` rejects stale CSS, missing component sources, unresolved package manifests, unsafe token references and writable CMS bindings. Components may expose `editorId`; markers are emitted only in development with `OOOPS_EDITOR_MODE=1`.

Component manifests expose controlled positioning per part. Template roots can use responsive static, relative, absolute, sticky or fixed positioning with logical insets and semantic layer tokens. Runtime-owned listboxes, menus, tooltips, dialogs, modals, popovers, accessibility overlays and skip links deliberately keep their positioning locked.
