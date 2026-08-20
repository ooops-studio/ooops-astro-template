# Ooops CMS site production guide

This is the end-to-end guide for running a static site from Ooops CMS. Astro
and Cloudflare Workers are the reference implementation, not requirements of
Ooops CMS. The same CMS contract can use Vercel, Netlify, Coolify, a custom
server, or another host with a build hook or CI trigger.

The guide covers content, SEO, forms, analytics, draft preview, and
CMS-triggered rebuilds as one production flow while keeping provider-specific
deployment details isolated.

The public site remains statically generated. Only private preview routes and
`/api/cms/rebuild` need a dynamic server/function at request time.

## Architecture

```text
Ooops CMS publish transaction
  -> immutable deployment event and per-site outbox delivery
  -> timestamped HMAC request to /api/cms/rebuild
  -> hosting adapter verifies signature and claims the event ID
  -> private provider build hook
  -> provider checks out the production branch, builds against CMS, and deploys
  -> static site contains the newly published CMS state
```

Every provider build-hook URL is a bearer credential. Store it only in the
hosting adapter. It must never be entered in CMS content, committed to Git, or
exposed through a `PUBLIC_*` variable. The adapter must verify the CMS HMAC
signature and timestamp, deduplicate the CMS event ID, invoke the private hook,
and return a retry-safe response.

## 1. Create the site repository

Create a repository from this template and make these project-specific changes:

1. Change the package name and repository metadata in `package.json`.
2. Give the Worker a unique `name` in `wrangler.jsonc`.
3. Add the site's Cloudflare Custom Domain under `routes`.
4. Set `PUBLIC_SITE_URL` to the same canonical HTTPS origin during builds.

Example route:

```jsonc
{
  "routes": [
    {
      "pattern": "www.example.com",
      "custom_domain": true
    }
  ]
}
```

Run the complete local gate before the first deployment:

```bash
pnpm install --frozen-lockfile
pnpm validate
pnpm exec wrangler deploy --dry-run
```

## 2. Prepare the CMS organization

Sign in to CMS and confirm that the intended organization is active. Open
`Settings -> Integrations -> API access` and create the narrowest token needed
for the setup path.

Configure a local `.env.local` without committing it:

```env
OOOPS_CMS_API_BASE_URL=https://cms.example.com/api/cms/v1
OOOPS_CMS_API_TOKEN=<short-lived-bootstrap-token>
PUBLIC_SITE_URL=https://www.example.com
```

Apply the starter bundle only when the deployed CMS advertises the required
schema/content import endpoints:

```bash
pnpm cms:bootstrap
```

When supported, the idempotent bootstrap creates or updates:

- the `homepage` single and starter content;
- the `posts` collection and one starter post;
- the public newsletter form.

If those import endpoints are unavailable, create the schemas, entries, SEO
targets, and form in the CMS UI. Do not treat a local bootstrap mock as
production evidence. If the script prints `PUBLIC_NEWSLETTER_FORM_TOKEN`,
retain it for the optional newsletter module. After setup, replace the setup
token with a narrower production token. A typical static build and preview
token needs
`cms:schema:read`, `cms:content:read`, `media:read`, `forms:read`, and
`seo:read` only when those resources are consumed by the site.

## 3. Configure SEO and forms

In CMS:

1. Set the public site origin and preview origin to the final HTTPS domain.
2. Create or update the SEO target for the homepage and the posts collection.
3. Publish SEO metadata before the acceptance build.
4. Enable the newsletter form's public share and retain only its public share
   token in `PUBLIC_NEWSLETTER_FORM_TOKEN`.

After deployment, verify:

- page title, description, canonical and Open Graph URL;
- `robots.txt` and `sitemap.xml` use the production origin;
- the published post appears in `/posts` and its generated route;
- a disposable form submission reaches the CMS submissions workspace.

`hreflang` must point to distinct localized URLs. Do not label the same URL as
both English and Greek. For a single-language site, omit the Greek alternate.
For a localized site, publish reciprocal routes such as `/page` and `/el/page`,
each with its own canonical plus matching `en` and `el` alternates.

Correct metadata does not prove Google indexing. Add the production property
to Google Search Console, submit `sitemap.xml`, inspect the important URLs, and
request indexing where appropriate.

Forms have two separate integration surfaces:

- the public form-share API used by the browser to read one published schema
  and submit answers;
- authenticated Forms SDK/admin listing such as `cms.forms.list()`, used by
  server-side administration and integration checks.

The public form must map field API IDs to the UUIDs returned by the public
schema before submitting. A private admin-listing failure does not prove that
public submission is broken. Test both surfaces separately. Test submissions
should follow an explicit archive/anonymize/delete retention policy.

## 4. Connect a hosting provider

The CMS does not require Cloudflare. For another provider, create an equivalent
HTTPS function that verifies the CMS signature, deduplicates the event ID, and
invokes that provider's private production build hook.

### Cloudflare Workers Builds reference

Install the Cloudflare GitHub App for the repository, then connect the Worker to
the repository in `Workers & Pages -> Worker -> Settings -> Builds`.

Use:

- production branch: `main`;
- root directory: `/`;
- build command: `pnpm build`;
- deploy command: `pnpm exec wrangler deploy`;
- Node.js: `22.14.0` or newer;
- pnpm: `11.13.1`.

Configure these production build variables:

```env
OOOPS_CMS_API_BASE_URL=https://cms.example.com/api/cms/v1
OOOPS_CMS_API_TOKEN=<read-only-production-token>
PUBLIC_SITE_URL=https://www.example.com
PUBLIC_NEWSLETTER_FORM_TOKEN=<public-form-share-token>
```

Mark `OOOPS_CMS_API_TOKEN` as secret. It is used only at build time and by the
Worker preview client; it must never be included in browser JavaScript.

## 5. Configure analytics

In CMS Analytics, complete **Connect site analytics**: set the exact public
origin, choose either **Ooops consent banner** or **My own banner**, finish the
checklist, and verify that the matching analytics website was provisioned.
Those choices are alternative consent implementations, not two banners shown
to the same visitor.

Set the public browser configuration in the hosting build:

```env
PUBLIC_CMS_ANALYTICS_SCRIPT_URL=https://analytics.example.com/script.js
PUBLIC_CMS_ANALYTICS_WEBSITE_ID=<site-id>
PUBLIC_CMS_ANALYTICS_RESPECT_DNT=true
PUBLIC_CMS_ANALYTICS_RETENTION=90 days
PUBLIC_CMS_ANALYTICS_PERFORMANCE_ENABLED=true
PUBLIC_CMS_ANALYTICS_REPLAY_ENABLED=false
PUBLIC_CMS_ANALYTICS_EXCLUDED_PATHS=/preview
```

Analytics has two independent layers:

1. build-time configuration decides which categories are available;
2. the visitor grants or rejects the available categories.

The first view offers `Reject all`, `Manage`, and `Accept all`. `Manage` opens
granular choices; the footer privacy-settings action reopens that same view.
`Accept all` accepts all categories that the site enabled. With the reference
values above, it accepts basic analytics and performance measurement, while
replay remains unavailable. If performance is set to `false`, it accepts basic
analytics only and the performance choice must disappear. Replay follows the
same rule.

Analytics and replay are never rendered inside preview routes. Verify the full
ingestion path with a new browser profile:

1. Reject optional analytics and confirm no analytics request is sent.
2. Accept analytics and confirm a successful page-view collection request is
   sent with the expected website ID.
3. Navigate to another route and confirm client navigation is measured once.
4. Reopen preferences, revoke analytics, and confirm requests stop.
5. Confirm the visit appears in CMS Realtime.
6. Confirm the selected Performance/overview range later shows non-zero
   visitors and pageviews.
7. When performance is enabled and accepted, confirm Core Web Vitals payloads.

A loaded script is not ingestion proof. If CMS still shows zero, verify
onboarding status, domain/website-ID match, collection response status,
retention-job health, reporting credentials, date range, DNT/GPC, and
internal-traffic exclusion. Raw connected-site data is retained for 90 days,
not for the visitor's lifetime.

## 6. Configure private Worker secrets

Create a production Deploy Hook for `main`. Store its complete URL only in the
Worker:

```bash
pnpm exec wrangler secret put OOOPS_CLOUDFLARE_DEPLOY_HOOK_URL
```

The Worker also needs these private values for preview:

```bash
pnpm exec wrangler secret put OOOPS_CMS_API_BASE_URL
pnpm exec wrangler secret put OOOPS_CMS_API_TOKEN
pnpm exec wrangler secret put OOOPS_CMS_PREVIEW_SESSION_SECRET
```

Generate `OOOPS_CMS_PREVIEW_SESSION_SECRET` as a separate high-entropy value.
Do not reuse the CMS rebuild signing secret.

## 7. Register the site rebuild endpoint in CMS

Open `Settings -> Integrations -> Static site rebuilds` and create a site:

- site name: a recognizable production label;
- public URL: the canonical HTTPS site origin;
- rebuild endpoint: `https://www.example.com/api/cms/rebuild`.

CMS displays the rebuild signing secret once. Store that exact value in the
Worker:

```bash
pnpm exec wrangler secret put OOOPS_CMS_REBUILD_SECRET
```

CMS retains an encrypted copy for signing. Cloudflare retains the matching
Worker secret for verification. The Deploy Hook itself never crosses this
boundary.

## 8. Verify draft preview

Configure the CMS preview base URL to the production site. From an unpublished
or edited CMS entry, open Preview.

The expected flow is:

1. CMS sends a short-lived opaque preview token in the initial URL.
2. The Worker validates it server-to-server with the private CMS API token.
3. The Worker encrypts the preview state into a 30-minute `HttpOnly` cookie and
   redirects to a URL without the token.
4. The response is `private, no-store`, `noindex, nofollow`, and has no
   analytics or replay scripts.
5. Exit preview clears the scoped cookie and returns to published content.

Preview must fail closed. When a preview token is supplied, the CMS must hash it
and match an unrevoked, unexpired record scoped to the requested type and entry.
It must not fall back to published content when validation fails.

Keep `OOOPS_CMS_PREVIEW_ENABLED=false` until the deployed CMS proves all of the
following:

1. random, expired, revoked, wrong-entry, and wrong-type tokens return 404;
2. a freshly issued valid token renders the intended draft;
3. the token is removed from the browser URL after the session exchange;
4. reload and exit work;
5. the normal route still shows only published content;
6. preview HTML has no analytics, canonical URL, or secret values.

Local mocked tests support this check but do not replace the production gate.
Treat a token remaining in the address bar, a cacheable preview response, an
accepted invalid token, or an analytics request during preview as a failure.

## 9. Verify publish and rebuild end to end

Use a uniquely identifiable text value so the deployed artifact can be proven
to come from the new CMS state.

1. Publish the homepage, a post, a form change, or SEO metadata in CMS.
2. In the CMS delivery history, observe `pending` become `succeeded`.
3. Confirm a Workers Build with trigger source `deploy_hook` appears.
4. Wait for the build and Worker deployment to finish.
5. Fetch the public page without browser cache and confirm the unique value,
   canonical URL, sitemap, and form behavior.
6. Unpublish the test post and confirm a second delivery/build removes its
   generated route or listing entry.

The outbox retries transient failures with bounded exponential delays. After
correcting a failed endpoint or hook, retry the delivery and verify it reaches
`succeeded`.

Replay expectations:

- a completed CMS event returns `duplicate` and does not trigger another build;
- a concurrent copy returns a retryable conflict;
- a failed Cloudflare trigger releases the Durable Object claim so the same
  event can be retried;
- Cloudflare may report an already queued build without creating another one.

Collection duplication is a separate CMS capability. When supported, a
duplicate must receive a new ID, remain a draft, and get a unique slug before
publication. Do not duplicate single types. Until the operation exists, record
the acceptance check as unsupported rather than emulating it with database
writes.

## 10. Add a second static site

Register every static site separately. Give it its own public URL, rebuild
endpoint, one-time signing secret, provider build hook, preview-session secret,
analytics website ID, and least-privilege read token. Never reuse these values
between sites. Run publish, unpublish, retry, preview, SEO, analytics, and form
acceptance checks independently for the second site.

## 11. Production acceptance record

Record non-secret evidence for every production site:

- repository, branch and deployed commit SHA;
- Worker name, custom domain and Worker version ID;
- Workers Build UUID and final status;
- CMS delivery event ID, status transitions and timestamps;
- published and unpublished fixture identifiers;
- screenshots or response assertions for public, preview, analytics and form
  behavior;
- Google Search Console sitemap/indexing status;
- duplicate evidence or an explicit unsupported result;
- cleanup status for disposable submissions;
- confirmation that the Worker has the required secret names, without values.

Run the reusable local checks whenever the integration changes:

```bash
pnpm test:cms-rebuild
pnpm test:cms:integration
pnpm test:preview:e2e
pnpm test:analytics:e2e
pnpm validate
```

See also [CMS-triggered Cloudflare rebuilds](cms-triggered-rebuilds.md),
[deployment](deployment.md), [bootstrap](bootstrap.md), and
[security](security.md).
