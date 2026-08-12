# Deployment

This template builds static files from Stage CMS at build time.

## Common Settings

- Install command: `pnpm install --frozen-lockfile`
- Build command: `pnpm build`
- Output directory: `dist`
- Node version: `22.14.0` or newer
- pnpm version: `11.13.0`

Required env vars:

```env
OOOPS_STAGE_API_BASE_URL=https://stage.example.com/api/stage/v1
OOOPS_STAGE_API_TOKEN=
PUBLIC_SITE_URL=https://www.example.com
```

Optional env vars:

```env
PUBLIC_STAGE_API_BASE_URL=https://stage.example.com
PUBLIC_NEWSLETTER_FORM_TOKEN=
PUBLIC_STAGE_ANALYTICS_SCRIPT_URL=
PUBLIC_STAGE_ANALYTICS_WEBSITE_ID=
PUBLIC_STAGE_ANALYTICS_REQUIRES_CONSENT=true
PUBLIC_STAGE_ANALYTICS_RESPECT_DNT=true
PUBLIC_STAGE_ANALYTICS_PERFORMANCE_ENABLED=false
PUBLIC_STAGE_ANALYTICS_REPLAY_ENABLED=false
PUBLIC_STAGE_ANALYTICS_REPLAY_SCRIPT_URL=
OOOPS_CMS_API_BASE_URL=https://cms.example/api/cms/v1
OOOPS_CMS_API_TOKEN=
OOOPS_CMS_PREVIEW_SESSION_SECRET=
CLOUDFLARE_PAGES_DEPLOY_HOOK_URL=
STAGE_WEBHOOK_SECRET=
```

## Cloudflare Pages

1. Set build command to `pnpm build`.
2. Set output directory to `dist`.
3. Add the required env vars in Pages settings.
4. Add `CLOUDFLARE_PAGES_DEPLOY_HOOK_URL` and `STAGE_WEBHOOK_SECRET` if Stage should trigger rebuilds.
5. Configure the Stage webhook URL as `https://your-site.com/api/stage/rebuild`.
6. Add `OOOPS_CMS_API_BASE_URL`, `OOOPS_CMS_API_TOKEN`, and `OOOPS_CMS_PREVIEW_SESSION_SECRET` if editors need CMS draft previews. These are Worker-only secrets; never prefix them with `PUBLIC_`.

Before deploy, run:

```bash
pnpm validate:env -- --strict
pnpm check:content-health -- --strict
```

`validate:env` checks the enabled modules in `src/template.config.ts` and their `optional/*/module.json` manifests. `check:content-health` audits live Stage content for slugs, duplicate slugs, SEO fields, and media alt text.

## Vercel

1. Framework preset: Astro.
2. Build command: `pnpm build`.
3. Output directory: `dist`.
4. Add required env vars in Project Settings.
5. Use a Vercel deploy hook if you want Stage publish events to trigger rebuilds.

## Netlify

1. Build command: `pnpm build`.
2. Publish directory: `dist`.
3. Add required env vars in Site configuration.
4. Use a Netlify build hook if you want Stage publish events to trigger rebuilds.

## Generic Static Hosting

Run:

```bash
pnpm install --frozen-lockfile
pnpm build
```

Upload the generated `dist/` directory to your static host.

## Local Development

Without Stage env vars the template builds with empty example content:

```bash
pnpm dev
```

For live Stage content:

```env
OOOPS_STAGE_API_BASE_URL=http://stage.localhost:4275/api/stage/v1
OOOPS_STAGE_API_TOKEN=your_private_stage_api_token
PUBLIC_SITE_URL=http://localhost:4321
```

For local analytics with the bundled Ooops Suite stack:

```env
PUBLIC_STAGE_ANALYTICS_SCRIPT_URL=http://localhost:3001/script.js
PUBLIC_STAGE_ANALYTICS_WEBSITE_ID=your_stage_analytics_website_id
PUBLIC_STAGE_ANALYTICS_REQUIRES_CONSENT=true
PUBLIC_STAGE_ANALYTICS_RESPECT_DNT=true
```

Restart the Astro dev server after changing public env vars. Accept analytics in the banner, then browser-side events should appear in Stage Analytics for the matching website id.

If this is a fresh Stage organization, run the bootstrap once before expecting live content:

```bash
pnpm stage:bootstrap
```

See [Stage bootstrap](bootstrap.md).

## CMS Draft Preview

The Astro output stays static apart from the Cloudflare Worker routes under `/preview/content/**`. Configure the CMS to open:

```txt
https://your-site.com/preview/content/collections/{apiId}/{slug}?preview={opaque-token}
https://your-site.com/preview/content/singles/{apiId}?preview={opaque-token}
```

The Worker sends the opaque token only to the CMS preview endpoint using `OOOPS_CMS_API_TOKEN`, stores the validated token in an encrypted 30-minute `HttpOnly` cookie, then redirects to the tokenless preview URL. Preview HTML and the exit endpoint are `private, no-store`; preview responses are also `noindex, nofollow`, have no analytics/replay, and cannot leak the token through canonical or referrer metadata. The exit control calls `/preview/content/exit` and clears the preview cookie before returning to the published page.

The committed `wrangler.jsonc` enables `nodejs_compat` for the Astro/Svelte SSR runtime. Keep that compatibility flag when deploying the Worker.
