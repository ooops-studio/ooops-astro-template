# Deployment

This template builds static files from Ooops CMS at build time.

## Common Settings

- Install command: `pnpm install --frozen-lockfile`
- Build command: `pnpm build`
- Output directory: `dist`
- Node version: `22.14.0` or newer
- pnpm version: `11.13.0`

Required env vars:

```env
OOOPS_CMS_API_BASE_URL=https://cms.example.com/api/cms/v1
OOOPS_CMS_API_TOKEN=
PUBLIC_SITE_URL=https://www.example.com
```

Optional env vars:

```env
PUBLIC_CMS_API_BASE_URL=https://cms.example.com
PUBLIC_NEWSLETTER_FORM_TOKEN=
PUBLIC_CMS_ANALYTICS_SCRIPT_URL=
PUBLIC_CMS_ANALYTICS_WEBSITE_ID=
PUBLIC_CMS_ANALYTICS_RESPECT_DNT=true
PUBLIC_CMS_ANALYTICS_PERFORMANCE_ENABLED=false
PUBLIC_CMS_ANALYTICS_REPLAY_ENABLED=false
PUBLIC_CMS_ANALYTICS_REPLAY_SCRIPT_URL=
OOOPS_CMS_API_BASE_URL=https://cms.example/api/cms/v1
OOOPS_CMS_API_TOKEN=
OOOPS_CMS_PREVIEW_SESSION_SECRET=
```

## Cloudflare Workers Builds

1. Connect the GitHub repository to Cloudflare Workers Builds.
2. Set the build command to `pnpm build` and the deploy command to `pnpm exec wrangler deploy`.
3. Add the required build-time CMS variables.
4. Add `OOOPS_CMS_API_BASE_URL`, `OOOPS_CMS_API_TOKEN`, and `OOOPS_CMS_PREVIEW_SESSION_SECRET` if editors need CMS draft previews. These are Worker-only secrets; never prefix them with `PUBLIC_`.
5. Create a Deploy Hook for `main`, then store it only as the `OOOPS_CLOUDFLARE_DEPLOY_HOOK_URL` Worker secret.
6. Store the CMS-generated signing secret as the `OOOPS_CMS_REBUILD_SECRET` Worker secret.

The committed custom Worker serves `/api/cms/rebuild`, verifies the signed event, uses a Durable Object for replay protection, and triggers Workers Builds. Full setup: [CMS-triggered Cloudflare rebuilds](cms-triggered-rebuilds.md).

Before deploy, run:

```bash
pnpm validate:env -- --strict
pnpm check:content-health -- --strict
```

`validate:env` checks the enabled modules in `src/template.config.ts` and their `optional/*/module.json` manifests. `check:content-health` audits live CMS content for slugs, duplicate slugs, SEO fields, and media alt text.

## Vercel

1. Framework preset: Astro.
2. Build command: `pnpm build`.
3. Output directory: `dist`.
4. Add required env vars in Project Settings.

## Netlify

1. Build command: `pnpm build`.
2. Publish directory: `dist`.
3. Add required env vars in Site configuration.

## Generic Static Hosting

Run:

```bash
pnpm install --frozen-lockfile
pnpm build
```

Upload the generated `dist/` directory to your static host.

## Local Development

Without CMS env vars the template builds with empty example content:

```bash
pnpm dev
```

For live CMS content:

```env
OOOPS_CMS_API_BASE_URL=http://cms.localhost:4175/api/cms/v1
OOOPS_CMS_API_TOKEN=your_private_cms_api_token
PUBLIC_SITE_URL=http://localhost:4321
```

For local analytics with the bundled Ooops Suite stack:

```env
PUBLIC_CMS_ANALYTICS_SCRIPT_URL=http://localhost:3001/script.js
PUBLIC_CMS_ANALYTICS_WEBSITE_ID=your_cms_analytics_website_id
PUBLIC_CMS_ANALYTICS_RESPECT_DNT=true
```

Restart the Astro dev server after changing public env vars. Accept analytics in the banner, then browser-side events should appear in CMS Analytics for the matching website id.

If this is a fresh CMS organization, run the bootstrap once before expecting live content:

```bash
pnpm cms:bootstrap
```

See [CMS bootstrap](bootstrap.md).

## CMS Draft Preview

The Astro output stays static apart from the Cloudflare Worker routes under `/preview/content/**`. Configure the CMS to open:

```txt
https://your-site.com/preview/content/collections/{apiId}/{slug}?preview={opaque-token}
https://your-site.com/preview/content/singles/{apiId}?preview={opaque-token}
```

The Worker sends the opaque token only to the CMS preview endpoint using `OOOPS_CMS_API_TOKEN`, stores the validated token in an encrypted 30-minute `HttpOnly` cookie, then redirects to the tokenless preview URL. Preview HTML and the exit endpoint are `private, no-store`; preview responses are also `noindex, nofollow`, have no analytics/replay, and cannot leak the token through canonical or referrer metadata. The exit control calls `/preview/content/exit` and clears the preview cookie before returning to the published page.

The committed `wrangler.jsonc` enables `nodejs_compat`, selects the custom Worker entrypoint, and declares the replay Durable Object. Keep those settings when deploying the Worker.
