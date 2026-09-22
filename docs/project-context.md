# Project context

This is the project-specific companion to the root `AGENTS.md`. Fill it during client setup and maintain it as decisions are made. Do not store secrets, private exports or unverified completion claims here.

## Purpose and sources

- Site/client and intended audience: not configured.
- Approved scope and design references: not configured.
- Repository/deployment target: verify the current Git remote and deployment configuration.
- Runtime and enabled modules: `package.json`, `src/template.config.ts`, `SETUP.md`.

## Design decisions

Record brand token/font sources and licensing constraints, reusable components, responsive behavior, accessibility theming and approved amendments to reference designs. Link assets and implementation entry points instead of duplicating their values.

## Content contract

Record page-to-CMS mappings, locales and route rules, SEO source, media strategy, forms/consent readiness and empty/error states. Keep credentials in ignored local environment files or deployment secrets. Distinguish public content from draft preview.

## Verification and handoff

Record the tested commit/date, exact commands and browser viewports, evidence paths, mocked versus real integration results, remaining failures and deployment/publication status. Keep historical measurements clearly dated.

## Pending decisions

List unresolved choices and the next concrete step. Client design/content decisions belong here, not in the reusable template's common rules.


## Workspace SDK migration — 21 September 2026

Migration prepared on `codex/workspace-sdk-rename` in an isolated checkout, preserving the original working tree. Imports and canonical dependency declarations use workspace-api 0.4.0, workspace-astro 0.3.0 and workspace-cloudflare 0.4.0; CMS HTTP paths and existing credentials remain unchanged. Single readers support the explicit current and legacy response types.

The three Workspace SDKs were published to npm on 21 September 2026. Temporary SDK link overrides were removed, the lockfile was regenerated from npm, and pnpm validate passed against the published versions. Production deployment remains a separate pending step.

### Workspace localized media adoption (2026-09-22)

Media mappers now consume the shared Workspace API per-language media projection, preserving explicit hidden files and decorative empty alt text. Published registry dependencies are workspace-api 0.5.0, workspace-astro 0.3.1 and workspace-cloudflare 0.4.1. Registry installation and the complete pnpm validate workflow passed, including localized media regression tests. No local Workspace SDK overrides remain. Do not treat this source update as a production deployment.

### Editor preview startup (2026-09-22)

The Cloudflare SSR dependency optimizer now includes `astro/app/manifest` and `@astrojs/svelte/server.js` up front. This prevents repeated discovery/reloads from invalidating an in-flight optimized chunk during editor preview startup. Full template validation and all 15 Editor browser tests passed across Chromium, Firefox and WebKit against this checkout. Deployment and Apple desktop distribution remain separate gates.
