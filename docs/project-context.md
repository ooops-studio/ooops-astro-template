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

## Demo test-site migration candidate — 5 October 2026

The user chose to preserve Demo for `test.ooops.studio`. Work is isolated on
`codex/cms-retirement-test-site`, based on `8b2df0f`. The reusable starter keeps
`homepage`/`posts` and static output. The explicit `demo` content profile maps
the existing published `home-page` hero and `news` title, slug, description,
body and `cover.image`, using English localization where present. Public routes
remain `/` and `/posts/*`; stable entry IDs resolve localized article URLs.
Per-language hidden media and empty decorative alt text remain authoritative.

`pnpm build:test-site` uses `astro.test-site.config.mjs` and server output,
matching the installed test site's runtime-secret model. The official SDK reads
the existing Cloudflare credential at request time. Missing configuration and
missing Demo hero content fail closed. Build-time defaults never substitute
starter content for a failed configured Demo request. The candidate fixes the
public API origin and canonical hostname to Workspace and `test.ooops.studio`.

Full `pnpm validate` passed after the source changes; five focused model tests
passed. A separate test-site build and Wrangler dry run passed. Local browser
checks rendered the real published Demo snapshot through an isolated API fixture,
including its five news articles and public media. Desktop and 390px checks
passed. The private preview fixture rejects invalid tokens, redirects valid tokens
to tokenless URLs, disables analytics, and exits to published home/article routes.
These checks do not prove live authentication with the opaque production token.
Private evidence lives in ignored `.cache/cms-migration/`.

Production form inventory found no active matching contact form in Demo. The
installed browser-facing share token returns the same invalid-link 404 from CMS
and Workspace. Four other published Demo forms remain untouched. A reviewed
dedicated contact form, with Name/Email/Message and notifications/newsletters
disabled, was explicitly approved by the user on 5 October 2026. Creation is
pending an actual Demo-owning Workspace session: the current Maria session only
has InDancEdu membership. No form was created or submitted.

No source push, provider installation, new credential, or shared-data mutation
was performed by this candidate preparation. Production deployment must preserve
all existing opaque secrets, the replay Durable Object, session KV, Images,
custom domain, provider settings and schedules. Never install generic generated
bindings over those existing resources. See the Workspace retirement runbook for
the private baseline and exact acceptance boundary.


## Workspace SDK migration — 21 September 2026

Migration prepared on `codex/workspace-sdk-rename` in an isolated checkout, preserving the original working tree. Imports and canonical dependency declarations use workspace-api 0.4.0, workspace-astro 0.3.0 and workspace-cloudflare 0.4.0; CMS HTTP paths and existing credentials remain unchanged. Single readers support the explicit current and legacy response types.

The three Workspace SDKs were published to npm on 21 September 2026. Temporary SDK link overrides were removed, the lockfile was regenerated from npm, and pnpm validate passed against the published versions. Production deployment remains a separate pending step.

### Workspace localized media adoption (2026-09-22)

Media mappers now consume the shared Workspace API per-language media projection, preserving explicit hidden files and decorative empty alt text. Published registry dependencies are workspace-api 0.5.0, workspace-astro 0.3.1 and workspace-cloudflare 0.4.1. Registry installation and the complete pnpm validate workflow passed, including localized media regression tests. No local Workspace SDK overrides remain. Do not treat this source update as a production deployment.

### Editor preview startup (2026-09-22)

The Cloudflare SSR dependency optimizer now includes `astro/app/manifest` and `@astrojs/svelte/server.js` up front. This prevents repeated discovery/reloads from invalidating an in-flight optimized chunk during editor preview startup. Full template validation and all 15 Editor browser tests passed across Chromium, Firefox and WebKit against this checkout. Deployment and Apple desktop distribution remain separate gates.

## Video delivery policy integration — 18 September 2026

`CmsVideo` and rich-text media now consume the additive CMS `video.playbackStatusUrl` contract, defer CMS sources until an allowed response, and show localized poster/error/retry states. A quota block removes source and download links; status failures do not fall back to a larger original. Native HLS and lazy hls.js are both retained, as are explicit external sources, authored tracks and localized/group media resolution. `src/lib/cms/video-player.css` owns the minimal shared status styling. Wrangler generated output is excluded from lint.

Local controller fixtures verified desktop/mobile blocked states, manual retry and playback. The fixture status responses are simulated; they do not constitute live CMS quota/capacity acceptance. The CMS runbook is `../ooops-workspace-core/docs/video-delivery-limits.md`. Production deployment, production-equivalent capacity benchmarking and coordinated activation remain separate pending steps. No CMS content was published or modified by this work.

## Consumer audit fixes — 18 September 2026

The optional visualEditor local dependency closure includes the accessibility runtime. The starter still leaves visualEditor disabled. CI now runs image-source regressions and the private preview browser contract. Playwright preview uses Astro's public JavaScript API with signal-driven shutdown, avoiding CLI agent auto-background detection. The devalue override is 5.9.2. The single reader keeps explicit old content/new data envelope compatibility until the canonical SDK type correction is published.

Local template validate and six Chromium production/UI tests passed after these edits. Remaining editor/native, coordinated CMS contract and video release evidence is tracked in the editor audit implementation report; local checks do not prove live CMS policy/capacity acceptance.

## Audit follow-up: development startup

The current local lockfile resolves Astro 7.3.2. The Cloudflare SSR environment
explicitly prebundles `astro/app/manifest` and `@astrojs/svelte/server.js` to avoid
cold-start dependency reloads invalidating chunks while workerd loads them.
Verified through the disposable editor fixture with the Cloudflare adapter
enabled; the base template still leaves the visual editor module disabled.
The client environment also prebundles `@astrojs/svelte/client.js`, preventing
late optimization from creating duplicate Svelte runtimes during hydration.
