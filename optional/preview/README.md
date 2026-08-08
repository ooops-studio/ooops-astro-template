# Stage Preview Mode

`functions/api/preview.ts` is included in the active template for Cloudflare Pages preview redirects. It should stay a thin adapter over `@ooopsstudio/stage-cloudflare`.

Add server-only env vars:

```env
STAGE_PREVIEW_TOKEN=
STAGE_PREVIEW_SECRET=
```

Configure Stage preview URLs to call:

```txt
https://your-site.com/api/preview?secret=STAGE_PREVIEW_SECRET&type=single&apiId=homepage&path=/
https://your-site.com/api/preview?secret=STAGE_PREVIEW_SECRET&type=collection&apiId=posts&slug={slug}&path=/posts/{slug}
```

Rules:

- `STAGE_PREVIEW_TOKEN` must be server-only.
- Do not expose preview tokens in browser code.
- Preview mode is optional. Static builds should continue using published content.
- Preview redirect signing is handled by `@ooopsstudio/stage-cloudflare`.
