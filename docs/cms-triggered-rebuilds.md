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


## Existing Demo test site: Workspace build source connected — 6 October 2026

The human confirmed that `ooops-studio/ooops-ssg-test` was deleted. Its obsolete
connection was replaced through the existing Worker's Cloudflare Builds UI after
separate approval. A real Workspace publish event successfully built and deployed
the replacement source; the earlier manual installation remains available for
rollback.

The saved connection is:

- Repository: existing `ooops-studio/ooops-astro-template`.
- Production and existing deploy-hook branch: `codex/cms-retirement-test-site`.
- Repository root: `/`.
- Build command: `pnpm build:test-site`.
- Deploy command: `pnpm deploy:test-site`.
- Build `OOOPS_CMS_API_BASE_URL` and `PUBLIC_CMS_API_BASE_URL`:
  `https://workspace.ooops.studio/api/cms/v1`.
- Build `PUBLIC_SITE_URL`: `https://test.ooops.studio`.
- Build `PUBLIC_CONTACT_FORM_TOKEN`: the already approved dedicated Demo contact
  share, supplied privately; a missing value fails the build.

Retain the existing deployment API token, opaque runtime CMS read token, runtime secrets,
analytics settings, SESSION namespace, Images and replay namespace. Never deploy
with the generic `wrangler.jsonc`: `deploy:test-site` explicitly selects the
preservation configuration. Retain compatibility date and historical migration
`v1`. The public resource IDs in that config are identities, not credentials.
Do not recreate the Worker, DNS, storage, deployment hook or signing secrets
merely to reconnect the repository. If the provider cannot retain a hook identity,
prepare its exact replacement and matching Worker-secret change for review first.

The human separately approved proceeding without the obsolete encrypted build-time
read-token copy if reconnection did not retain it. The test-site server build does
not require that copy; the operating read credential remains a Worker secret.
No credential was rotated or revoked. The existing deployment token and deploy
hook identities were retained; only the hook's branch changed.

The existing Demo integration was enabled with its original signing credential.
A brief pause/resume of the approved test contact form through the normal
Workspace UI emitted a new publish event while retaining its published version,
schema, active share and one submission. The pause occurred while the integration
was disabled, so it queued no build. Publish event
`ed301cdf-e4be-4542-b076-e326b9893430` succeeded on its first delivery with HTTP
202; its response identifies Cloudflare build
`04b1af7a-bfd6-4cff-a72a-178ce89d763e`, which completed in 49 seconds. Version
`98f125a8-c06b-4b9f-9105-6b32c529c4c7` serves 100% of traffic. The reviewed source
branch head at this cutover was `f79a352`.

Provider readback confirms identical bindings, schedules, compatibility and
observability, the existing custom domain and disabled extra public hostnames.
Public home/posts/contact and all four encoded article URLs return 200, with
correct canonicals and no legacy host. Invalid home/article preview links return
404 with private/no-store and noindex/nofollow. Contact renders at desktop and
390px without overflow or browser errors; the actual article image loads from
the media origin. No second submission was made; other six forms are unchanged.
Private receipts/screenshots are under `test-site-install-review/`, including
`persistent-build-installation-acceptance-20261006.private.json`. Valid private
production preview acceptance and the other CMS retirement gates remain pending.

For this migration only, the human accepted the full local validation pipeline
in place of hosted GitHub `validate` on 6 October 2026. Audit, validation, six UI
browser tests, three preview browser tests, the exact test-site build and the
preservation-config deployment dry run pass. Live API/content checks without
credentials remain skipped. Push this reviewed branch with `[skip ci]`; leave
normal workflows enabled and do not merge around required checks. The separately
approved Cloudflare connection and real signed rebuild still require provider
readback and public production acceptance.
