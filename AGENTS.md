# Agent instructions

These instructions apply to this repository and to client sites created from it.

## Start here

1. Read `README.md`, `SETUP.md`, `docs/project-context.md`, `template-policy.json`, and `package.json` before changing architecture or setup. Read the relevant specialist guide under `docs/` for the task.
2. Check the current branch, remotes, worktree, enabled modules and running service before assuming an older report is current. Preserve unrelated edits; stage explicit paths or hunks.
3. Treat explicit user decisions as the project brief. Ask about unresolved material design choices before implementing them; continue work already authorized without repeated confirmation.
4. Keep `docs/project-context.md` current when the task changes project decisions or delivery status. Record evidence and remaining work without credentials or private content dumps.

## Architecture and packages

- Keep Astro as the page/layout shell. Use Svelte islands only where interaction warrants them; avoid unnecessary client hydration.
- Use the canonical Ooops packages and ownership boundaries in `template-policy.json`. Prefer existing `src/components/ui` wrappers and `@ooopsstudio/ui-astro` components. Keep project composition and styling local; do not copy package-owned controllers, focus traps, validation or keyboard logic.
- Inspect the installed package exports before assuming a component exists. If no appropriate component exists, use a small semantic local wrapper and document why. Shared package changes belong in the owning repository.
- Select optional modules through the setup/module workflow and keep `SETUP.md` accurate. Do not enable analytics, newsletter, visual editor or other integrations merely because they are available.
- Respect disabled visual-editor integration. When enabled, use its documented registry and token generation; CMS editor bindings remain read-only.
- Read `docs/ui-components.md`, `docs/svelte-islands.md` and `docs/package-extraction.md` as relevant.

## Design and accessibility

- Use the project's approved Figma/reference and explicit user amendments. Reuse original assets when available; do not invent client photography, copy or a replacement design.
- Centralize colors, fonts, sizes, spacing, radii and motion in semantic tokens. Use the configured token source; do not edit generated CSS when the visual-editor token generator owns it.
- Use reusable components for repeated sections. Keep labels above form controls with consistent styling. Avoid unrequested implementation details in visitor-facing UI.
- Implement responsive behavior rather than one fixed screenshot. Check narrow phones, tablet/desktop and breakpoint boundaries, long localized copy and enlarged text. Prevent overflow, clipping and overlapping content.
- Preserve semantic headings, landmarks, alt text, visible focus, keyboard access, Escape/return-focus behavior and sufficient contrast. Theme the shared accessibility menu with the site's tokens while preserving its controls and high-contrast overrides.
- Respect both system reduced-motion preferences and accessibility-menu settings. Content must remain available without entrance animations. Follow `docs/accessibility.md`.

## CMS, localization, SEO and media

- Read CMS data through the shared server/build client, not ad hoc browser requests with private tokens. Preserve the organization boundary; never expose private tokens in `PUBLIC_*`, browser artifacts, logs or commits.
- Keep single types, collections and forms distinct. Preserve localized values, stable IDs, groups/repeaters, relation order and media references. Do not substitute sample content when an integration fails.
- Centralize route generation and language switching. Preserve approved legacy URLs or provide explicit redirects; use the same route model for canonical URLs, hreflang, sitemap and internal links.
- Resolve SEO through the CMS SEO contract and project mapping. Do not duplicate SEO into ordinary content fields when the CMS supplies it separately.
- Use `CmsImage`, `CmsVideo` and rich-text media helpers for real CMS-provided variants, dimensions, localized alt, responsive sources and original fallbacks. Never fabricate image variants with query parameters or regenerate CMS derivatives in the site. Preserve groups/repeaters and localized media resolution.
- Keep drafts in the documented secure preview/local flow with noindex and appropriate cache restrictions. Do not silently include drafts in production output or publish CMS records as a side effect of building the site.
- Render real form success/error states only from the configured submission contract. Follow consent and DNT requirements for analytics. Disabled/unconfigured modules must remain inactive.
- Consult `docs/cms-integration-guide.md`, `docs/content-models.md`, `docs/i18n.md`, `docs/security.md`, `docs/redirects-and-headers.md` and `docs/cms-site-production-guide.md`.

## Verification and delivery

- Use the commands actually defined in `package.json`. Keep `pnpm validate` passing before release; for small documentation changes run focused documentation/contract checks. Do not create implementation-mirroring tests for cosmetic edits.
- Run relevant regression tests for behavior changes. For UI, inspect rendered desktop/mobile output and the affected locales; test keyboard, enlarged text and reduced motion where relevant. Check browser errors and capture evidence of the affected state.
- Verify media at the layer being changed: real responsive source selection, fallbacks and video seek/playback where applicable. A build or a record count alone is not visual or integration acceptance.
- Distinguish mocked CI results, actual CMS checks, browser observations and user-confirmed audiovisual review. Missing credentials or skipped tests are not passes. See `docs/testing.md`.
- Before commit/push, inspect the diff and scope; do not overwrite unrelated WIP, force-push shared history, or commit secrets, private exports or local preview artifacts.
- Treat deployment, production content publication and domain cutover as separate actions covered by the user's scope. Follow existing CI/deployment configuration and `docs/deployment.md` / `docs/cms-triggered-rebuilds.md`; do not assume a push means deployment succeeded.
- Report what changed, what was checked, where it was pushed and what remains unverified. Update relevant docs if commands, architecture or CI behavior changed.
