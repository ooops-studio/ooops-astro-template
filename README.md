# CMS Astro Site Template

Astro template for public websites powered by Ooops CMS.

The active app is intentionally small and familiar to Astro users:

```txt
src/
  pages/
    index.astro
    posts/
      index.astro
      [slug].astro
    robots.txt.ts
    sitemap.xml.ts
  layouts/
    BaseLayout.astro
  components/
    AccessibilityMenu.astro
    cms/
      AnalyticsConsent.astro
      CmsAnalytics.astro
      CmsImage.astro
    ui/
      Button.astro
      CheckboxField.astro
      Container.astro
      Dialog.astro
      ErrorState.astro
      InputField.astro
      Modal.astro
      SelectField.astro
      Section.astro
      TextareaField.astro
  lib/
    posts/
      client.ts
      sitemap.ts
    cms/
      client.ts
      content-helpers.ts
      env.ts
      homepage.ts
      seo.ts
      types.ts
    seo/
      sitemap.ts
  styles/
    fonts.css
    global.css
    reset.css
    tokens.css
    typography.css
public/
  assets/
    fonts/
    images/
optional/
  analytics/
  accessibility-menu/
  newsletter/
  cookie-consent/
  filters/
  gallery/
  media-player/
  preview/
  search/
examples/
docs/
```

## What Is Active By Default

- Static Astro homepage.
- Svelte islands integration for interactive components while keeping Astro as the shell.
- Build-time CMS API v1 reads through the official CMS client surface with a private `OOOPS_CMS_API_TOKEN`.
- One CMS single type, `homepage`.
- Included `posts` collection example with `/posts` and `/posts/[slug]`.
- Optional i18n helpers with `en` as the unprefixed default locale.
- Basic SEO helper, JSON-LD helper, `robots.txt`, `sitemap.xml`, and Cloudflare `_headers`.
- Empty-content build behavior when CMS env vars are missing, so the template can validate before it is connected to CMS.
- Small copy-editable Astro UI primitives.
- `CmsImage.astro` for CMS media URLs, alt fallback, responsive sizing, lazy loading, and fallback image handling.
- Cloudflare Worker preview routes for CMS drafts using the published CMS preview contract.
- Signed `/api/cms/rebuild` Worker endpoint with durable replay protection for CMS-triggered Workers Builds.
- Preview banner and exit preview link when preview mode is active.
- `validate-env` and content health scripts for production readiness.
- Manifest-driven optional modules and installer.
- Env-gated CMS analytics loader and consent banner. If analytics env vars are blank, no analytics script is loaded.
- A themeable accessibility menu backed by `@ooopsstudio/accessibility-astro`.

Optional examples live in `optional/`. Copy them into `src/` only if you need them.

## Visual Editor Metadata

Visual-editor integration is the optional, disabled-by-default `visualEditor` module. When enabled, it installs the editor runtime plus the UI/accessibility manifest adapters and copies a schema-validated, framework-neutral registry into `editor/`. Projects that leave it disabled keep the same UI and template packages without editor runtime or metadata dependencies.

With the module enabled, global visual tokens are edited in `editor/design-tokens.json`; `pnpm generate:editor` deterministically rebuilds `src/styles/tokens.css`, and `pnpm check:editor` enforces registry, token, controlled positioning and read-only CMS binding consistency. Positioning uses logical offsets and semantic z-index layers from `base` through `toast`; package-owned overlay positioning remains locked.

## UI Primitives

The template includes neutral Astro wrappers in `src/components/ui`:

- `Button.astro`
- `CheckboxField.astro`
- `ComboboxField.astro`
- `Container.astro`
- `Dialog.astro`
- `ErrorState.astro`
- `Section.astro`
- `InputField.astro`
- `MultiSelectField.astro`
- `NumberInputField.astro`
- `Modal.astro`
- `Popover.astro`
- `RadioGroupField.astro`
- `SegmentedControl.astro`
- `SliderField.astro`
- `SwitchField.astro`
- `Tabs.astro`
- `Accordion.astro`
- `DropdownMenu.astro`
- `Tooltip.astro`
- `TextareaField.astro`
- `SelectField.astro`

The wrappers keep project-specific composition and styling local while interaction, validation, layers, keyboard behavior and form projection come from `@ooopsstudio/ui-astro` and `@ooopsstudio/ui-primitives`. See [`docs/ui-components.md`](docs/ui-components.md) for usage and visual-editor metadata.

`Button.astro` can render text, an image-only button, or image + text. Use `imagePosition="before"` or `imagePosition="after"` to control placement.

`SelectField.astro` remains a non-editable custom select. Searchable single and multiple selection use `ComboboxField.astro` and `MultiSelectField.astro`, keeping their semantics separate.

`Dialog.astro` and `Modal.astro` delegate native dialog semantics, Escape handling, focus behavior, and return-focus support to the UI packages. Local wrappers remain the extension point for project composition and styling.

`CmsImage.astro` lives in `src/components/cms`. It accepts a CMS media record or plain `src`, normalizes CMS asset URLs, and uses `/assets/images/fallback-image.svg` when no image is available.
It also supports responsive `srcset`, eager/lazy strategy, and dev warnings for media without alt text.

## Quick Start

Requires Node.js `>=22.14.0` and pnpm `11.13.1` (the version pinned by `packageManager`).

```bash
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm dev
```

Set these values in `.env.local`:

```env
OOOPS_CMS_API_BASE_URL=http://cms.localhost:4175/api/cms/v1
OOOPS_CMS_API_TOKEN=your_private_cms_api_token
PUBLIC_SITE_URL=http://localhost:4321
```

## Checks

```bash
pnpm lint
pnpm typecheck
pnpm check
pnpm validate:env
pnpm check:content-health
pnpm validate
```

`pnpm test:cms-rebuild` covers valid and invalid signatures, completed replays, already-queued builds, concurrent delivery, and retry after a failed Cloudflare trigger.

`pnpm check` runs Astro type checking plus the template guard in `scripts/check-cms-api-contracts.mjs`. The guard enforces `template-policy.json`, canonical package ownership, Node/pnpm/Astro policy, published dependency ranges, forbidden duplicated behavior, secret boundaries, and required template files.

`pnpm check:openapi` fetches `${OOOPS_CMS_API_BASE_URL}/openapi.json` when CMS is configured and checks for the required CMS API v1 paths. It skips locally when CMS is not configured or not running, and fails in CI when a configured OpenAPI endpoint is unreachable.

GitHub Actions validates the published analytics consumer on every push and pull request. The full template validation remains manual because the CMS and Editor packages referenced by the local development overrides are not yet available to a clean GitHub-hosted runner. Restore its push and pull-request trigger after those packages are published or otherwise made available to CI.

## Client Setup Installer

```bash
pnpm setup:client -- my-client-site
pnpm setup:client -- my-client-site --dry-run
pnpm setup:module -- list
pnpm setup:module -- add newsletter
pnpm setup:module -- remove newsletter
```

Each optional module has an `optional/<module>/module.json` manifest describing dependencies, env vars, files, cleanup targets, and validation checks. The installer uses those manifests to generate `.env.example`, `src/template.config.ts`, and `SETUP.md`.

## Expected CMS Content

The fastest setup path is the bootstrap script. Full guide:

- [CMS bootstrap guide](docs/bootstrap.md)

Short version:

```bash
cp .env.example .env.local
# Fill OOOPS_CMS_API_BASE_URL and OOOPS_CMS_API_TOKEN.
pnpm cms:bootstrap
```

The script applies `cms/starter-bundle.json` to the CMS organization attached to your API token. It does not create an organization. It creates missing schemas/content/forms, updates starter content idempotently, and prints `PUBLIC_NEWSLETTER_FORM_TOKEN` when the newsletter form is created.

Create the token in CMS under `Settings -> General -> API access` with the `Site bootstrap` preset.

Recommended setup scopes:

- `cms:schema:write`
- `cms:schema:read`
- `cms:content:write`
- `cms:content:publish`
- `forms:read`
- `forms:write`

After bootstrap, rotate to a narrower read-focused token for production builds when you no longer need setup write access.

The starter bundle creates:

- a CMS single type with API id `homepage`
- a CMS collection type with API id `posts`
- starter homepage and post content
- a public newsletter form token for the optional newsletter component

Recommended fields:

- `heading`
- `description`
- `seo-title`
- `seo-description`
- `ogImage` optional
- `canonical-path-override` optional
- `robots-index` / `robots-follow` optional
- `google-site-verification` optional
- `twitter-handle` optional

You can rename the API id and fields in `src/lib/cms/homepage.ts`.

## Included Posts Collection

The template includes a small collection example:

- `/posts/[slug]` static pages.
- `/posts` static index page.
- CMS collection API reads.
- Per-post SEO.
- Sitemap integration.

Expected collection API id: `posts`.

## Production Starter Guides

- [Accessibility](docs/accessibility.md)
- [Content model examples](docs/content-models.md)
- [Internationalization](docs/i18n.md)
- [Svelte islands](docs/svelte-islands.md)
- [Testing](docs/testing.md)
- [Redirects and headers](docs/redirects-and-headers.md)
- [Future package extraction](docs/package-extraction.md)

## CMS Draft Preview

The template is static by default. Only `/preview/content/**` is rendered by the Cloudflare Worker so editors can view unpublished CMS content without making the public site dynamic.

The CMS opens one of these URLs with its short-lived opaque preview token:

```txt
https://site.example/preview/content/collections/{apiId}/{slug}?preview={opaque-token}
https://site.example/preview/content/singles/{apiId}?preview={opaque-token}
```

The worker validates the token with the CMS preview API, encrypts it into a 30-minute `HttpOnly`, `SameSite=Lax` cookie, and redirects to the same URL without the token. Draft responses are `private, no-store`, `noindex, nofollow`, have no canonical URL, and omit analytics and session replay. Exiting preview clears the cookie and immediately returns to the public static route.

Configure these server-only Cloudflare variables (never `PUBLIC_` variables):

```env
OOOPS_CMS_API_BASE_URL=https://cms.example/api/cms/v1
OOOPS_CMS_API_TOKEN=
OOOPS_CMS_PREVIEW_SESSION_SECRET=
```

The CMS token needs only `cms:content:read`. See [Deployment](docs/deployment.md) and run `pnpm test:preview:e2e` to exercise the complete handoff.

## Optional Newsletter Form

Use `optional/newsletter` if you want browser-side public form submissions.

It demonstrates posting to:

```txt
/api/cms/v1/forms/shares/{token}/submissions
```

No private CMS API token is exposed to the browser.

## CMS Analytics

The active template includes `CmsAnalytics.astro` and `AnalyticsConsent.astro` in the base layout. It is fully env-gated:

- If `PUBLIC_CMS_ANALYTICS_SCRIPT_URL` or `PUBLIC_CMS_ANALYTICS_WEBSITE_ID` is blank, it renders nothing and sends no events.
- Once both values are configured, it loads the CMS analytics script in the browser.
- Optional analytics always requires a current positive consent choice. There is no configuration bypass.
- Performance analytics and replay stay disabled unless their env flags are explicitly enabled and consent allows them.

```env
PUBLIC_CMS_ANALYTICS_SCRIPT_URL=
PUBLIC_CMS_ANALYTICS_WEBSITE_ID=
PUBLIC_CMS_ANALYTICS_RESPECT_DNT=true
# Default for the CMS-hosted Umami endpoint: raw connected-site analytics is deleted after 90 days.
PUBLIC_CMS_ANALYTICS_RETENTION=90 days
PUBLIC_CMS_ANALYTICS_PERFORMANCE_ENABLED=false
PUBLIC_CMS_ANALYTICS_REPLAY_ENABLED=false
PUBLIC_CMS_ANALYTICS_REPLAY_SCRIPT_URL=
PUBLIC_CMS_ANALYTICS_REPLAY_SAMPLE_RATE=0.05
PUBLIC_CMS_ANALYTICS_REPLAY_MASK_LEVEL=moderate
PUBLIC_CMS_ANALYTICS_REPLAY_MAX_DURATION_MS=600000
PUBLIC_CMS_ANALYTICS_REPLAY_BLOCK_SELECTOR=[data-private], [data-sensitive]
PUBLIC_CMS_ANALYTICS_EXCLUDED_PATHS=/preview
PUBLIC_CMS_ANALYTICS_INTERNAL_REFERRER_DOMAINS=
```

These are public browser env vars, not private API tokens. In Astro, they are baked at build time for static deployments.

For local development with the bundled Ooops Suite stack, use:

```env
PUBLIC_CMS_ANALYTICS_SCRIPT_URL=http://localhost:3001/script.js
PUBLIC_CMS_ANALYTICS_WEBSITE_ID=2e3df25b-701f-4c95-8976-c90b1ed87da2
PUBLIC_CMS_ANALYTICS_RESPECT_DNT=true
```

Restart `pnpm dev` after changing these values. Accept analytics in the banner, visit a few pages in the template, then open CMS Analytics for the same organization. The dashboard starts clean unless you seed or generate traffic.

For production, use the analytics script URL and website id from your CMS analytics setup. Keep the private `OOOPS_CMS_API_TOKEN` server/build-only; analytics uses only public browser config.

## Deployment And Security

- [Complete CMS site production guide](docs/cms-site-production-guide.md)
- [Deployment guide](docs/deployment.md)
- [CMS-triggered Cloudflare rebuilds](docs/cms-triggered-rebuilds.md)
- [Security notes](docs/security.md)

## CMS API Examples

Examples live in `examples/`:

- `read-content.ts`
- `newsletter-submit.ts`
- `seo-and-analytics.ts`

Run:

```bash
pnpm example:read-content
pnpm example:newsletter-submit -- subscriber@example.com
```

## Private Env Vars

Never expose these to browser code:

- `OOOPS_CMS_API_TOKEN`
- `OOOPS_CMS_PREVIEW_SESSION_SECRET`
- `OOOPS_CMS_REBUILD_SECRET`
- `OOOPS_CLOUDFLARE_DEPLOY_HOOK_URL` (Worker only; never stored in CMS)
