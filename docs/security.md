# Security Notes

## CMS API Tokens

Never expose `OOOPS_CMS_API_TOKEN` in browser code. It is a private build/server token for reading CMS content during static generation.

Browser-side integrations should use only public APIs and scoped public tokens, for example `PUBLIC_NEWSLETTER_FORM_TOKEN` for newsletter submission.

## Analytics

`PUBLIC_CMS_ANALYTICS_*` values are browser-facing configuration values. They are safe to expose, but they should not grant API access.

If `PUBLIC_CMS_ANALYTICS_SCRIPT_URL` or `PUBLIC_CMS_ANALYTICS_WEBSITE_ID` is blank, the template does not load analytics or send events. Enable performance analytics and replay only when the public site has the consent flow you need for your visitors.

Recommended defaults:

- Optional analytics is always consent-gated. The template has no configuration bypass for anonymous or identified analytics.
- Keep `PUBLIC_CMS_ANALYTICS_RESPECT_DNT=true`.
- Keep performance analytics and replay disabled until you have the correct consent UX and legal basis for your site.
- Do not put private CMS API tokens, webhook secrets, or preview-session secrets in any `PUBLIC_*` variable.

## Bootstrap

`pnpm cms:bootstrap` uses `OOOPS_CMS_API_TOKEN` server-side from your terminal to create starter schemas/content/forms in the CMS organization attached to that token. It does not create a new organization. Use a short-lived token with only the documented bootstrap scopes, and revoke or rotate it after setup if you do not need ongoing write access.

## Webhooks

Use a long random `CMS_WEBHOOK_SECRET`. The optional Cloudflare rebuild endpoint verifies:

- `x-cms-timestamp`
- `x-cms-signature`
- `x-cms-event`

The signature is `HMAC-SHA256(timestamp + "." + rawBody)`.

`functions/api/cms/rebuild.ts` verifies the signature and timestamp before triggering a deploy hook.

## Preview Mode

Preview tokens are server-only:

- `OOOPS_CMS_API_TOKEN`
- `OOOPS_CMS_PREVIEW_SESSION_SECRET`

Do not import these from browser components, islands, or client scripts.

The Cloudflare Worker routes under `/preview/content/**` validate a CMS-issued opaque token server-to-server, encrypt it into an `HttpOnly` preview-session cookie, and redirect to a tokenless URL. The browser never receives the CMS API token or the preview-session encryption secret.

## Environment Files

Commit `.env.example`, but never commit `.env`, `.env.local`, `.env.development`, or `.env.production`.

## CMS API Configuration

Production deployments should configure `OOOPS_CMS_API_BASE_URL`, `OOOPS_CMS_API_TOKEN`, and `PUBLIC_SITE_URL` so content and metadata are generated from CMS.
