# Ooops CMS production integration

This guide defines the production contract for a static site that consumes
Ooops CMS content, SEO, forms, analytics, preview, and publish events. Astro and
Cloudflare are the reference implementation, not requirements of Ooops CMS.

The public site stays static. A normal visitor does not fetch CMS content:
publishing triggers a new build, and that build reads the current published CMS
state with a private, read-only API token. Public forms and optional analytics
are the only browser-to-service integrations.

## Architecture and provider boundary

```text
Editor -> Ooops CMS -> signed publish event -> site rebuild endpoint
                                              |
                                              v
                                     hosting build hook
                                              |
                                              v
Source repository -> SSG build -> static deployment

Editor preview -> dynamic site endpoint -> CMS preview API -> private response
Visitor consent -> analytics loader -> CMS-managed analytics provider
Public form -> CMS public form-share endpoint
```

The hosting provider may be Cloudflare, Vercel, Netlify, Coolify, a custom
server, or another platform with a build hook or CI trigger. The provider
adapter must:

1. expose an HTTPS rebuild endpoint;
2. verify the CMS HMAC signature and timestamp;
3. deduplicate the CMS event ID;
4. invoke the provider's private build hook;
5. return a retry-safe response to the CMS.

Cloudflare-specific steps are isolated below. Do not put Cloudflare product
names or secrets into CMS content models or public browser code.

## 1. Prepare the CMS

### Content and SEO

Create the starter resources in the CMS UI:

- a single type with API ID `homepage`;
- a collection with API ID `posts`;
- one published homepage and at least one published post;
- a published public-share contact form with `name`, `email`, and `message`;
- site SEO defaults plus homepage and post SEO targets.

The expected starter fields are documented in
[Content models](content-models.md). The checked-in `cms/starter-bundle.json`
is a reference fixture. Do not treat `pnpm cms:bootstrap` as a production setup
path unless the connected CMS exposes the required schema/content import
endpoints. The current public CMS API supports reads and field-scoped draft
updates, not schema creation, entry creation, publication, or deletion.

Create a **Website read token** in `Settings -> Integrations -> API access`.
Grant only the reads used by the site: content/schema and, when enabled, media,
forms, analytics, and SEO. Keep this token server-side.

### Forms terminology

There are two separate form surfaces:

- **Public form API:** the browser reads one published form through its public
  share token and submits answers. This is the only surface needed by the
  public contact page.
- **Authenticated Forms SDK/admin listing:** server-side code calls
  `cms.forms.list()` and related private endpoints using a CMS API token to list
  forms or submissions for administration and integration tests. A failure in
  this listing does not mean the public form submission endpoint is broken.

Form submissions contain personal data. The CMS should provide an explicit
retention workflow: archive or spam status for normal operations, plus
permission-guarded anonymization or permanent deletion with confirmation and
audit evidence. Do not add a casual one-click hard delete.

### Collection duplication

Duplicate is appropriate for collection entries, not single types. A duplicate
must get a new entry ID, become a draft, and receive a unique slug before it can
be published. Relations and media should be copied deliberately. Until the CMS
exposes this operation, mark the duplicate acceptance check as unsupported;
do not emulate it with an editor token or direct database writes.

## 2. Configure the static app

Set these server/build values in the chosen hosting platform:

```env
OOOPS_CMS_API_BASE_URL=https://cms.ooops.studio/api/cms/v1
OOOPS_CMS_API_TOKEN=<website-read-token>
PUBLIC_SITE_URL=https://site.example
```

`OOOPS_CMS_API_TOKEN` is private. Never prefix it with `PUBLIC_`, embed it in
generated HTML, or expose it to browser JavaScript.

At build time the app should:

1. fetch published singles and collection entries;
2. normalize the CMS response shape into the site's view models;
3. generate only published collection routes;
4. generate page metadata, `robots.txt`, and `sitemap.xml`;
5. fail the production build when required content or slugs are invalid.

Before the first live build, run:

```bash
pnpm check:openapi
pnpm check:content-health -- --strict
pnpm validate:env -- --strict
pnpm build
```

## 3. Configure CMS-triggered publishing

Create a private build hook in the hosting provider. Store that URL only in the
provider adapter; never expose it to browsers or paste it into CMS content.

In CMS, open `Settings -> Integrations -> Static site rebuilds` and add:

| Field | Example |
| --- | --- |
| Site name | `Production Astro site` |
| Public URL | `https://site.example` |
| Rebuild endpoint | `https://site.example/api/cms/rebuild` |

The CMS displays a signing secret once. Copy that exact value into the hosting
runtime secret named `OOOPS_CMS_REBUILD_SECRET`. Do not generate a second value;
the CMS retains the matching encrypted secret.

### Cloudflare reference adapter

For Cloudflare Workers Builds, connect the repository and use:

| Setting | Value |
| --- | --- |
| Production branch | `main` |
| Root directory | `/` |
| Build command | `pnpm build` |
| Deploy command | `pnpm exec wrangler deploy` |
| Node.js | `22.14.0` or newer |
| pnpm | the version in `packageManager` |

Set `OOOPS_CMS_API_BASE_URL`, `OOOPS_CMS_API_TOKEN`, and `PUBLIC_SITE_URL` on
the production build trigger. Mark the token as encrypted.

Create a Cloudflare Deploy Hook and store it only as the Worker secret:

```bash
pnpm exec wrangler secret put OOOPS_CLOUDFLARE_DEPLOY_HOOK_URL
pnpm exec wrangler secret put OOOPS_CMS_REBUILD_SECRET
```

The reference Worker verifies the signature and uses a Durable Object to reject
concurrent/replayed event IDs while releasing failed claims for retry. If
Cloudflare Bot Fight Mode challenges CMS deliveries, add the narrowest verified
allow rule for the documented CMS egress source; do not disable protection for
the whole site.

Other providers need an equivalent signature-verifying function plus their
own private build hook and idempotency store. Cloudflare is optional.

### Publish acceptance test

1. Change a visible homepage field and publish it.
2. Confirm the CMS delivery changes from `pending` to `succeeded`.
3. Confirm the hosting provider starts the expected production build.
4. Wait for build and deployment success.
5. Fetch the public site without a stale cache and confirm the new value.
6. Publish a collection entry and confirm its generated route.
7. Unpublish it, rebuild, and confirm that route becomes 404.
8. If CMS duplication is supported, duplicate an entry, confirm a new ID and
   unique slug, then publish it. Otherwise record this check as unsupported.
9. Retry a known failed test delivery after correcting its cause. Do not break
   the production secret or endpoint merely to manufacture a failure.

## 4. Configure private draft preview

Preview is dynamic and must fail closed. Configure these server/runtime values:

```env
OOOPS_CMS_API_BASE_URL=https://cms.ooops.studio/api/cms/v1
OOOPS_CMS_API_TOKEN=<content-read-token>
OOOPS_CMS_PREVIEW_SESSION_SECRET=<long-random-secret>
OOOPS_CMS_PREVIEW_ENABLED=false
```

The CMS opens one of these routes with a short-lived opaque token:

```text
https://site.example/preview/content/singles/{apiId}?preview={token}
https://site.example/preview/content/collections/{apiId}/{slug}?preview={token}
```

The site sends the opaque token server-to-server to the CMS preview API. A valid
token must be hashed and matched to an unrevoked, unexpired database record
scoped to the requested content type and entry. An unknown, expired, revoked,
wrong-entry, or wrong-content-type token must return 404. A preview endpoint
must never fall back to published content when a `preview` token was supplied
but failed validation.

After validation, the site stores the token in an encrypted 30-minute
`HttpOnly`, `SameSite=Lax` cookie and redirects to a tokenless URL. Preview
responses must be `private, no-store`, `noindex, nofollow`, omit analytics and
replay, and expose no canonical URL. Exit clears the cookie.

### Required production release gate

Keep `OOOPS_CMS_PREVIEW_ENABLED=false` until all of these pass against the
deployed CMS, not only mocks or local code:

1. a random opaque token returns 404 from the CMS preview API;
2. an expired/revoked token returns 404;
3. a token for a different entry or type returns 404;
4. a freshly issued valid token renders the expected draft;
5. the token disappears from the browser URL after the session exchange;
6. reload and exit behave correctly;
7. the normal public route still shows only published content;
8. preview HTML contains no analytics, canonical URL, or secret values.

Run the local browser contract as supporting evidence:

```bash
pnpm test:preview:e2e
```

Local success does not authorize enabling production preview. Fix and deploy
the CMS validation path first, then repeat the live checks above.

## 5. Configure analytics and consent

### Complete CMS onboarding

In CMS Analytics, complete **Connect site analytics**:

1. set the exact public site origin;
2. choose **Ooops consent banner** or **My own banner**;
3. finish the connection checklist;
4. verify that the CMS has provisioned the matching analytics website.

These are alternative consent UI implementations, not two banners shown to the
same visitor. A custom banner must enforce the same runtime consent, withdrawal,
DNT/GPC, excluded-route, and teardown rules.

### Configure capabilities in the app

```env
PUBLIC_CMS_ANALYTICS_SCRIPT_URL=https://analytics.example/script.js
PUBLIC_CMS_ANALYTICS_WEBSITE_ID=<website-id>
PUBLIC_CMS_ANALYTICS_RESPECT_DNT=true
PUBLIC_CMS_ANALYTICS_RETENTION=90 days
PUBLIC_CMS_ANALYTICS_PERFORMANCE_ENABLED=true
PUBLIC_CMS_ANALYTICS_REPLAY_ENABLED=false
PUBLIC_CMS_ANALYTICS_EXCLUDED_PATHS=/preview
```

There are two independent layers:

1. **Site capability:** build-time configuration decides which optional
   categories exist. With `PERFORMANCE_ENABLED=false`, performance collection is
   unavailable and is not offered to the visitor.
2. **Visitor choice:** the banner stores consent only for the categories the
   site enabled.

The first banner offers `Reject all`, `Manage`, and `Accept all`. `Manage` opens
the granular choices. The footer privacy-settings action reopens that same
granular view later; it is not a second consent system.

`Accept all` means all categories currently configured by the site:

- basic analytics is always included when analytics is configured;
- performance is included only when
  `PUBLIC_CMS_ANALYTICS_PERFORMANCE_ENABLED=true`;
- replay is included only when `PUBLIC_CMS_ANALYTICS_REPLAY_ENABLED=true`.

Therefore, with the reference production values above, `Accept all` accepts
basic analytics and performance measurement. Replay remains unavailable. If
performance is disabled later, rebuild, confirm its choice disappears from
`Manage`, and repeat consent/network tests. Do not silently collect a category
that was not configured or shown.

Rejection, withdrawal, consent expiry, policy-version changes, DNT/GPC,
internal traffic, and preview routes must block tracking. Withdrawal must stop
the provider and clear provider-owned browser state. Raw connected-site
analytics is expected to be removed by the CMS retention job after 90 days; it
is not lifetime storage.

### Analytics ingestion acceptance test

Do not declare analytics complete merely because the script element loaded.
Prove the full path:

1. before consent, no provider script or collection request;
2. after reject, still no collection request;
3. after `Accept all`, a basic pageview collection request succeeds;
4. when performance is enabled and accepted, Core Web Vitals payloads succeed;
5. preview and internal CMS/admin traffic produce no public-site events;
6. withdrawal stops new requests and clears provider state;
7. the CMS Realtime tab shows the accepted visit;
8. the CMS Performance/overview range later shows non-zero visitors and
   pageviews;
9. the dashboard date range matches the selected current period.

If the CMS shows zero, verify onboarding completion, website ID/domain match,
provider request status, retention-job health, CMS reporting credentials, date
range, DNT/GPC, and internal-traffic exclusion before blaming the dashboard.

Run the local consent/runtime contract as supporting evidence:

```bash
pnpm test:analytics:e2e
```

## 6. Configure SEO and indexing

Set `PUBLIC_SITE_URL` to the canonical production origin. Verify homepage and
post HTML contains the CMS title/description, canonical URL, robots directives,
Open Graph/Twitter metadata, and JSON-LD where configured. Verify `robots.txt`
and `sitemap.xml` use the production origin and exclude draft/preview routes.

`hreflang` declares different localized URLs for equivalent pages. Do not emit:

```html
<link rel="alternate" hreflang="en" href="https://site.example/page">
<link rel="alternate" hreflang="el" href="https://site.example/page">
```

Both language labels point to the same document, so a crawler cannot choose an
English versus Greek page. Use one of these valid approaches:

- a single-language site: emit no Greek alternate;
- a localized site: publish real reciprocal routes such as `/page` and
  `/el/page`, each with its own canonical and `en`/`el` alternates;
- add `x-default` only when a genuine language-selector/default URL exists.

SEO-ready output does not prove Google indexing. Add the production property to
Google Search Console, verify ownership, submit `sitemap.xml`, inspect the key
URLs, and request indexing where appropriate. A `site:` query is only a quick
external observation, not a replacement for Search Console coverage data.

Run:

```bash
pnpm test:e2e -- --grep "SEO"
```

## 7. Configure public forms

Create the contact form in CMS, publish it, enable public share, and set:

```env
PUBLIC_CONTACT_FORM_TOKEN=<public-share-token>
PUBLIC_CMS_API_BASE_URL=https://cms.ooops.studio/api/cms/v1
```

The browser must first read the public form schema and map field API IDs such as
`name`, `email`, and `message` to the field UUIDs required by the submission
endpoint. It then submits only to:

```text
/api/cms/public/forms/{token}/submissions
```

No private CMS API token is exposed. The public share token authorizes only
rate-limited submissions to that published form.

Verify:

1. the public schema renders the expected required fields;
2. invalid input fails safely;
3. a valid browser submission receives the success state;
4. that exact submission appears in the CMS;
5. rate limiting and revoked/expired shares fail safely;
6. test submissions are archived, anonymized, or deleted according to the CMS
   retention policy when that capability is available.

For a real CMS integration read, run:

```bash
pnpm test:cms:integration
```

To deliberately create a disposable submission, provide both integration-test
form variables documented in `.env.example` and use a dedicated test form. The
authenticated Forms SDK listing is an additional admin/API check; it is not a
prerequisite for public browser submission.

## 8. Add a second static site

Treat each site as a separate security and deployment boundary:

1. create another CMS static-site registration with its own public URL and
   rebuild endpoint;
2. copy its one-time signing secret only to that site's runtime;
3. create a separate provider build hook;
4. configure that site's read token with only the content grants it needs;
5. use a separate analytics website ID and form share where appropriate;
6. run publish, retry, preview, SEO, analytics, and form acceptance checks for
   the second site independently.

Never reuse one site's rebuild signing secret, deploy hook, preview-session
secret, or analytics website ID for another site.

## 9. Release evidence and troubleshooting

A production handoff is complete only when it records:

- CMS deployment version and site Git commit;
- hosting build/deployment identifier and time;
- CMS delivery ID/status matched to the provider build;
- public content evidence after publish and unpublish;
- duplicate evidence, or an explicit unsupported result;
- retry evidence from a safely corrected failure;
- production preview valid/invalid-token evidence;
- analytics network, Realtime, overview, consent, and withdrawal evidence;
- rendered SEO plus Search Console submission status;
- a real form submission visible in CMS and its cleanup status.

Common boundaries:

- `cms.forms.list()` failing is an authenticated admin API problem; test the
  public form endpoints separately.
- A loaded analytics script is not ingestion proof; require a successful
  collection request and CMS dashboard evidence.
- Correct HTML metadata is not Google indexing proof.
- A local preview mock is not production token-validation proof.
- Cloudflare delivery problems do not make the CMS Cloudflare-dependent; fix or
  replace the provider adapter without changing the CMS content contract.

Never include API tokens, build-hook URLs, signing secrets, preview tokens, or
secret values in screenshots, logs, issue reports, commits, or this guide.
