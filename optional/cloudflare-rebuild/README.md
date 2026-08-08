# Cloudflare Pages Rebuild

`functions/api/stage/rebuild.ts` is included in the active template. It should stay a thin Cloudflare Pages adapter over `@ooopsstudio/stage-cloudflare`.

Required Cloudflare env vars:

```env
CLOUDFLARE_PAGES_DEPLOY_HOOK_URL=
STAGE_WEBHOOK_SECRET=
```

Configure Stage to call:

```txt
https://your-site.com/api/stage/rebuild
```

The endpoint expects Stage's signed webhook headers:

```txt
x-stage-timestamp: 2026-05-08T00:00:00.000Z
x-stage-signature: v1=<hex-hmac>
x-stage-event: cms.entry.published
```

Signature verification, timestamp tolerance, ignored-event handling, and deploy-hook triggering are handled by `@ooopsstudio/stage-cloudflare`.
Rebuilds are queued for `cms.*`, `media.*`, and `form.*` events.

Test a copied endpoint locally or after deploy:

```bash
STAGE_WEBHOOK_SECRET=your_secret \
WEBHOOK_TEST_URL=https://your-site.com/api/stage/rebuild \
pnpm test:webhook
```
