# Redirects and Headers

Cloudflare Pages reads `public/_headers` from the generated static output.

The template includes conservative defaults:

- a starter `Content-Security-Policy`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` disabling camera, microphone, geolocation, payment, and USB by default
- `X-Frame-Options: DENY`
- immutable caching for `/assets/*`
- no-store caching for `/api/*`

Add project-specific redirects with Cloudflare Pages `_redirects` or routing rules when needed. Keep redirect policy documented per client project.

The CSP is intentionally a starter. Update `script-src`, `connect-src`, `img-src`, and `media-src` when a client project uses third-party analytics, video embeds, remote media domains, or payment widgets.
