# Cloudflare Pages Rebuild

`functions/api/cms/rebuild.ts` is included in the active template. It should stay a thin Cloudflare Pages adapter over `@ooopsstudio/cms-cloudflare`.

Required Cloudflare env vars:

```env
CLOUDFLARE_PAGES_DEPLOY_HOOK_URL=
CMS_WEBHOOK_SECRET=
```

Configure CMS to call:

```txt
https://your-site.com/api/cms/rebuild
```

The endpoint expects CMS signed webhook headers:

```txt
x-cms-timestamp: 2026-05-08T00:00:00.000Z
x-cms-signature: v1=<hex-hmac>
x-cms-event: cms.entry.published
```

Signature verification, timestamp tolerance, ignored-event handling, and deploy-hook triggering are handled by `@ooopsstudio/cms-cloudflare`.
Rebuilds are queued for `cms.*`, `media.*`, and `form.*` events.

Test a copied endpoint locally or after deploy:

```bash
CMS_WEBHOOK_SECRET=your_secret \
WEBHOOK_TEST_URL=https://your-site.com/api/cms/rebuild \
pnpm test:webhook
```
