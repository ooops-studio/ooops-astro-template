# Ooops CMS production integration

This guide covers the complete production contract for an Astro SSG site that
uses Ooops CMS content, draft preview, analytics, SEO, forms, and
CMS-triggered Cloudflare Workers Builds.

The public site remains static. CMS publishing does not make content requests
from visitors: it triggers a new build, and the build reads the current
published CMS state with a private, read-only API token.

## Architecture

```text
Editor -> Ooops CMS -> signed publish event -> site Worker
                                              |
                                              v
                                    Cloudflare Deploy Hook
                                              |
                                              v
GitHub repository -> Workers Build -> Astro SSG -> Worker deployment

Editor preview -> site Worker -> CMS preview API -> private preview response
Visitor consent -> analytics loader -> CMS analytics provider
Public form -> CMS public form-share endpoint
```

## 1. Prepare the CMS content

Create the starter resources in the CMS UI before connecting the production
build:

- a single type with API ID `homepage`;
- a collection with API ID `posts`;
- one published homepage and at least one published post;
- a published public-share contact form with `name`, `email`, and `message`;
- SEO metadata for the homepage and post.

The expected starter fields are documented in
[Content models](content-models.md). The checked-in `cms/starter-bundle.json`
is a reference fixture. Do not treat `pnpm cms:bootstrap` as a production setup
path unless the connected CMS exposes the bundle import endpoints advertised
by the installed CMS client; the current public CMS API supports reads and
field-scoped draft updates, not schema/content creation or publication.

Create a **Website read token** in `Settings -> Integrations -> API access`.
Give it only the read grants used by the site, such as content/schema and, when
enabled, media, forms, and SEO reads. Keep this token server-side.

## 2. Connect Cloudflare Workers Builds

Connect the GitHub repository to a Cloudflare Worker and use:

| Setting | Value |
| --- | --- |
| Production branch | `main` |
| Root directory | `/` |
| Build command | `pnpm build` |
| Deploy command | `pnpm exec wrangler deploy` |
| Node.js | `22.14.0` or newer |
| pnpm | the version in `packageManager` |

Configure these **build-time** variables on the production trigger:

```env
OOOPS_CMS_API_BASE_URL=https://cms.ooops.studio/api/cms/v1
OOOPS_CMS_API_TOKEN=<website-read-token>
PUBLIC_SITE_URL=https://site.example
```

Mark `OOOPS_CMS_API_TOKEN` as secret. Astro uses these values while generating
the static files; they are not Worker runtime bindings and must never be
prefixed with `PUBLIC_`.

Before the first live build, verify the CMS contract and content health:

```bash
pnpm check:openapi
pnpm check:content-health -- --strict
pnpm validate:env -- --strict
```

## 3. Configure CMS-triggered SSG publishing

Create a Cloudflare Deploy Hook for the production branch. Store its complete
URL only as the Worker secret:

```bash
pnpm exec wrangler secret put OOOPS_CLOUDFLARE_DEPLOY_HOOK_URL
```

In the CMS, open `Settings -> Integrations -> Static site rebuilds` and add:

| Field | Example |
| --- | --- |
| Site name | `Production Astro site` |
| Public URL | `https://site.example` |
| Worker rebuild endpoint | `https://site.example/api/cms/rebuild` |

The CMS shows a signing secret once. Copy that exact value into the Worker:

```bash
pnpm exec wrangler secret put OOOPS_CMS_REBUILD_SECRET
```

Do not generate a second value. The CMS retains the matching encrypted secret.
The Deploy Hook URL never belongs in the CMS.

### Publish acceptance test

1. Change a visible homepage field and publish it.
2. Confirm the CMS delivery changes from `pending` to `succeeded`.
3. Confirm a build with the Deploy Hook as its source appears in Cloudflare.
4. Wait for the build and Worker deployment to complete.
5. Fetch the public site without cache and confirm the new value is present.
6. Unpublish the content, wait for the next successful build, and confirm it is
   absent from the static output.
7. Duplicate an entry, publish the duplicate, and confirm its generated route.
8. For retry coverage, temporarily make the delivery fail, restore the correct
   configuration, select `Retry now`, and confirm a single successful build.

The rebuild endpoint verifies the CMS HMAC signature, timestamp, and event ID.
Its Durable Object prevents duplicate or concurrent deliveries from creating
multiple builds while allowing a failed claim to be retried.

## 4. Configure private draft preview

Preview is the only dynamic content path. Configure these **Worker runtime**
secrets:

```env
OOOPS_CMS_API_BASE_URL=https://cms.ooops.studio/api/cms/v1
OOOPS_CMS_API_TOKEN=<content-read-token>
OOOPS_CMS_PREVIEW_SESSION_SECRET=<long-random-secret>
```

The CMS should open one of these routes with its short-lived opaque token:

```text
https://site.example/preview/content/singles/{apiId}?preview={token}
https://site.example/preview/content/collections/{apiId}/{slug}?preview={token}
```

The Worker validates the token with CMS, stores it in an encrypted 30-minute
`HttpOnly`, `SameSite=Lax` cookie, and redirects to a tokenless URL. Preview
responses are `private, no-store`, `noindex, nofollow`, omit analytics and
replay, and expose no canonical URL. The exit action clears the cookie.

Verify both draft routes, a reload, an invalid/expired token, and preview exit.
Run the local browser contract with:

```bash
pnpm test:preview:e2e
```

## 5. Configure analytics

Analytics is browser-side and remains disabled until both identifiers exist:

```env
PUBLIC_CMS_ANALYTICS_SCRIPT_URL=https://analytics.example/script.js
PUBLIC_CMS_ANALYTICS_WEBSITE_ID=<website-id>
PUBLIC_CMS_ANALYTICS_RESPECT_DNT=true
PUBLIC_CMS_ANALYTICS_PERFORMANCE_ENABLED=false
PUBLIC_CMS_ANALYTICS_REPLAY_ENABLED=false
PUBLIC_CMS_ANALYTICS_EXCLUDED_PATHS=/preview
```

These public values are baked into the static build. Optional analytics loads
only after positive consent. Rejection, withdrawal, expiration, or a policy
version change blocks further analytics activity; preview routes never load
analytics. Performance and replay require their own explicit enablement and
remain consent-gated.

Acceptance checks:

- no analytics request before consent;
- no request after rejecting optional categories;
- pageview after accepting analytics;
- persistence after reload;
- no request on `/preview/**`;
- withdrawal stops provider activity and clears provider-owned state.

Run the packed browser contract with:

```bash
pnpm test:analytics:e2e
```

## 6. Configure SEO

Set `PUBLIC_SITE_URL` to the canonical production origin. Verify the generated
homepage and post output contains the CMS title/description, canonical URL,
robots directives, Open Graph/Twitter metadata, and JSON-LD where configured.
Also verify `robots.txt` and `sitemap.xml` use the production origin and exclude
draft/preview routes.

Run:

```bash
pnpm test:e2e -- --grep "SEO"
```

## 7. Configure public forms

Create the `Contact request` form in CMS, publish it, enable its public share,
and set the returned public share token:

```env
PUBLIC_CONTACT_FORM_TOKEN=<public-share-token>
PUBLIC_CMS_API_BASE_URL=https://cms.ooops.studio/api/cms/v1
```

The browser uses `@ooopsstudio/cms-api` to submit only to
`/api/cms/public/forms/{token}/submissions`; no private CMS API token is
exposed. The public share token authorizes only rate-limited submissions to
that published form. Verify one valid submission appears in CMS and that
invalid input, rate limiting, and revoked/expired share tokens fail safely.

Run the local module contract with:

```bash
pnpm test:newsletter
```

## 8. Release evidence

A production handoff is complete only when it records:

- the CMS deployment SHA;
- the site Git commit, Workers Build UUID, Worker version, and deployment time;
- the CMS delivery ID/status and matching Cloudflare build;
- public content evidence after publish and unpublish;
- duplicate and retry evidence;
- preview privacy/header checks;
- analytics network and consent checks;
- SEO output checks;
- a real form submission visible in CMS.

Local unit or mocked browser tests support these checks but do not replace the
live evidence above.
