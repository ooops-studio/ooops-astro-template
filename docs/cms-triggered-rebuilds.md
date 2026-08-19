# CMS-triggered Cloudflare rebuilds

This template stays an Astro SSG site. Publishing in Ooops CMS sends a signed event to the site's `/api/cms/rebuild` Worker endpoint, and that Worker triggers a Cloudflare Workers Builds Deploy Hook. Cloudflare then checks out the repository, runs the Astro build against the newly published CMS state, and deploys the new static output.

## Trust boundary

There are two separate secrets:

- `OOOPS_CMS_REBUILD_SECRET` is shared between the CMS site configuration and the site's Worker. The CMS uses it only to sign publish events; the Worker uses it only to verify them.
- `OOOPS_CLOUDFLARE_DEPLOY_HOOK_URL` exists only as a Cloudflare Worker secret. Never enter it in CMS, commit it to Git, or place it in `.env.example` with a value.

The endpoint rejects missing, expired, or invalid HMAC signatures. A Durable Object atomically tracks event IDs, returns an idempotent response for completed replays, rejects concurrent duplicates, and releases a failed claim so the CMS outbox can retry it.

## 1. Connect Workers Builds

In the Cloudflare dashboard, create a Worker from this GitHub repository and enable Workers Builds for the production branch.

- Build command: `pnpm build`
- Deploy command: `pnpm exec wrangler deploy`
- Root directory: repository root
- Production branch: `main`
- Node.js: `22.14.0` or newer
- pnpm: `11.13.1`

Add the build-time CMS variables needed by Astro SSG:

```env
OOOPS_CMS_API_BASE_URL=https://cms.example.com/api/cms/v1
OOOPS_CMS_API_TOKEN=read-only-cms-token
PUBLIC_SITE_URL=https://www.example.com
```

Create a production Deploy Hook for `main`. Treat the resulting URL as a secret.

## 2. Configure the Deploy Hook secret

Store the complete Cloudflare Workers Builds Deploy Hook URL as a Worker secret without committing it:

```bash
pnpm exec wrangler secret put OOOPS_CLOUDFLARE_DEPLOY_HOOK_URL
```

The committed `wrangler.jsonc` contains only the Durable Object binding and migration, never either secret value.

## 3. Register the site in CMS

Open `Settings -> Integrations -> Static site rebuilds` in Ooops CMS and add:

- Site name: a human-readable label.
- Public URL: `https://www.example.com`.
- Worker rebuild endpoint: `https://www.example.com/api/cms/rebuild`.

Copy the one-time signing secret shown by CMS and store that exact value as the Worker secret:

```bash
pnpm exec wrangler secret put OOOPS_CMS_REBUILD_SECRET
```

Do not generate a separate signing secret locally: the CMS must retain the matching encrypted value. If you rotate it in CMS, update the Worker secret before another publish.

The CMS stores only the site URL, endpoint, and an encrypted signing secret. It does not receive or store the Deploy Hook URL.

## 4. Verify the flow

Publish content, a form, or SEO in CMS. The delivery should move from `pending` to `succeeded` in the CMS integration history and a Workers Builds run should appear in Cloudflare. The deployed site should contain the published change after the build completes.

Failures use exponential retry and eventually move to `dead`, where an operator can retry after correcting the configuration. Re-sending a completed event does not enqueue another build.

Run the local contract tests with:

```bash
pnpm test:cms-rebuild
```
