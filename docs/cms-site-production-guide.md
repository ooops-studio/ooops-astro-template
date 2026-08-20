# Ooops CMS site production guide

This is the end-to-end guide for running an Astro SSG site from Ooops CMS on
Cloudflare Workers. It covers the content bootstrap, SEO, forms, analytics,
draft preview, and CMS-triggered rebuilds as one production flow.

The public site remains statically generated. Only the private preview routes
and `/api/cms/rebuild` execute in the Worker at request time.

## Architecture

```text
Ooops CMS publish transaction
  -> immutable deployment event and per-site outbox delivery
  -> timestamped HMAC request to /api/cms/rebuild
  -> Worker signature verification and Durable Object replay claim
  -> private Cloudflare Deploy Hook
  -> Workers Build checks out main, builds Astro against the CMS API, and deploys
  -> static site contains the newly published CMS state
```

The Cloudflare Deploy Hook URL is a bearer credential. Store it only in the
site Worker as `OOOPS_CLOUDFLARE_DEPLOY_HOOK_URL`. It must never be entered in
CMS, committed to Git, or exposed through a `PUBLIC_*` variable.

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
`Settings -> General -> API access` and create a short-lived token with the
`Site bootstrap` preset.

Configure a local `.env.local` without committing it:

```env
OOOPS_CMS_API_BASE_URL=https://cms.example.com/api/cms/v1
OOOPS_CMS_API_TOKEN=<short-lived-bootstrap-token>
PUBLIC_SITE_URL=https://www.example.com
```

Apply the starter bundle:

```bash
pnpm cms:bootstrap
```

The idempotent bootstrap creates or updates:

- the `homepage` single and starter content;
- the `posts` collection and one starter post;
- the public newsletter form.

If the script prints `PUBLIC_NEWSLETTER_FORM_TOKEN`, retain it for the optional
newsletter module. After bootstrap, replace the setup token with a narrower
production token. A typical static build and preview token needs
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

## 4. Connect Cloudflare Workers Builds

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

Create or select the site's analytics property in CMS and set the public
browser configuration in Workers Builds:

```env
PUBLIC_CMS_ANALYTICS_SCRIPT_URL=https://analytics.example.com/script.js
PUBLIC_CMS_ANALYTICS_WEBSITE_ID=<site-id>
PUBLIC_CMS_ANALYTICS_RESPECT_DNT=true
PUBLIC_CMS_ANALYTICS_RETENTION=90 days
PUBLIC_CMS_ANALYTICS_PERFORMANCE_ENABLED=true
PUBLIC_CMS_ANALYTICS_REPLAY_ENABLED=false
PUBLIC_CMS_ANALYTICS_EXCLUDED_PATHS=/preview
```

The consent banner controls optional analytics. Analytics and replay are never
rendered inside preview routes. Verify analytics with a new browser profile:

1. Reject optional analytics and confirm no analytics request is sent.
2. Accept analytics and confirm one page-view request is sent with the expected
   website ID.
3. Navigate to another route and confirm client navigation is measured once.
4. Reopen preferences, revoke analytics, and confirm requests stop.
5. Confirm the events appear in the CMS analytics dashboard.

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

Treat a token remaining in the address bar, a cacheable preview response, or an
analytics request during preview as a failed acceptance check.

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

## 10. Production acceptance record

Record non-secret evidence for every production site:

- repository, branch and deployed commit SHA;
- Worker name, custom domain and Worker version ID;
- Workers Build UUID and final status;
- CMS delivery event ID, status transitions and timestamps;
- published and unpublished fixture identifiers;
- screenshots or response assertions for public, preview, analytics and form
  behavior;
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
