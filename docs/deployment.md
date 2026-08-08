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
STAGE_PREVIEW_TOKEN=
STAGE_PREVIEW_SECRET=
CLOUDFLARE_PAGES_DEPLOY_HOOK_URL=
STAGE_WEBHOOK_SECRET=
```

## Cloudflare Pages

1. Set build command to `pnpm build`.
2. Set output directory to `dist`.
3. Add the required env vars in Pages settings.
4. Add `CLOUDFLARE_PAGES_DEPLOY_HOOK_URL` and `STAGE_WEBHOOK_SECRET` if Stage should trigger rebuilds.
5. Configure the Stage webhook URL as `https://your-site.com/api/stage/rebuild`.
6. Add `STAGE_PREVIEW_TOKEN` and `STAGE_PREVIEW_SECRET` if editors need preview URLs.

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

## Stage Preview URLs

Configure Stage preview URLs to call the Cloudflare Pages Function:

```txt
https://your-site.com/api/preview?token=STAGE_PREVIEW_TOKEN&redirect=/
https://your-site.com/api/preview?token=STAGE_PREVIEW_TOKEN&redirect=/posts/{slug}
```

Preview requests set the signed, `HttpOnly` preview cookie and redirect with a non-sensitive `stagePreview=1` indicator so the static UI can show its preview banner. Draft reads use the read-only Stage preview client.
