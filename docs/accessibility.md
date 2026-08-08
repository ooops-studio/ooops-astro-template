# Accessibility

Accessibility is a core responsibility of projects created from this template.

## Included Baseline

- Semantic document structure in `BaseLayout.astro`.
- Skip link targeting `#main-content`, provided by `@ooopsstudio/accessibility-astro`.
- Visible focus states for navigation, cards, form controls, and dialogs.
- Native dialog-based modal wrappers backed by `@ooopsstudio/ui-astro`.
- Keyboard-friendly custom select backed by `@ooopsstudio/ui-primitives`.
- Accessibility menu backed by `@ooopsstudio/accessibility`, with text scaling, line-height, letter-spacing, contrast, monochrome, reading guide, focus highlighting, image hiding, and reduced motion controls.
- Form primitives with labels, validation states, and helper/error slots.

## Project Checklist

- Keep one `<main id="main-content">` per page.
- Do not remove the skip link unless you replace it with an equivalent.
- Every image needs meaningful alt text or an empty `alt=""` when decorative.
- Every custom interactive component must be keyboard operable.
- Respect `prefers-reduced-motion`; avoid essential information that only appears through animation.
- Test forms with invalid, empty, loading, success, and error states.
- Run Playwright smoke tests for keyboard navigation on every client project.

## Theming

The template owns the visual wrapper and overrides. State, persistence, focus handling, no-flash bootstrap and ARIA behavior are owned by the canonical accessibility packages and must not be reimplemented locally.
