import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createCmsRebuildSignatureHeaders,
  serializeCmsRebuildEvent,
  type CmsRebuildEvent
} from '@ooopsstudio/cms-cloudflare';

import { handleCmsRebuildRequest, type CmsRebuildWorkerEnv } from '../../src/lib/cms-rebuild/handler';

const secret = 'test-secret-that-is-at-least-thirty-two-bytes-long';
const deployHookUrl = 'https://api.cloudflare.com/client/v4/workers/builds/deploy_hooks/123e4567-e89b-12d3-a456-426614174000';

const event: CmsRebuildEvent = {
  version: 1,
  id: 'event-1',
  type: 'cms.content.published',
  organizationId: 'organization-1',
  occurredAt: '2026-08-20T09:00:00.000Z',
  resource: { kind: 'collection', id: 'entry-1', apiId: 'posts' }
};

const createReplayNamespace = () => {
  const states = new Map<string, 'completed' | 'in_progress'>();
  return {
    states,
    namespace: {
      idFromName: (name: string) => name,
      get: (eventId: unknown) => ({
        fetch: async (request: Request) => {
          const operation = new URL(request.url).pathname;
          const key = String(eventId);
          if (operation === '/claim') {
            const state = states.get(key);
            if (state) return Response.json({ state });
            states.set(key, 'in_progress');
            return Response.json({ state: 'claimed' });
          }
          if (operation === '/complete') {
            states.set(key, 'completed');
            return Response.json({ ok: true });
          }
          if (operation === '/release') {
            states.delete(key);
            return Response.json({ ok: true });
          }
          return new Response(null, { status: 404 });
        }
      })
    }
  };
};

const createEnvironment = (namespace: ReturnType<typeof createReplayNamespace>['namespace']): CmsRebuildWorkerEnv => ({
  CMS_REBUILD_REPLAY_GUARD: namespace,
  OOOPS_CMS_REBUILD_SECRET: secret,
  OOOPS_CLOUDFLARE_DEPLOY_HOOK_URL: deployHookUrl
});

const signedRequest = async (inputEvent = event, signingSecret = secret) => {
  const body = serializeCmsRebuildEvent(inputEvent);
  const headers = await createCmsRebuildSignatureHeaders(body, {
    eventId: inputEvent.id,
    secret: signingSecret
  });
  return new Request('https://example.com/api/cms/rebuild', { method: 'POST', headers, body });
};

const cloudflareSuccess = (alreadyExists = false) =>
  Response.json({
    success: true,
    result: {
      already_exists: alreadyExists,
      branch: 'main',
      build_uuid: 'build-1',
      status: alreadyExists ? 'queued' : 'pending'
    }
  });

test('accepts a valid signed CMS publish event and triggers one build', async () => {
  const replay = createReplayNamespace();
  let hookCalls = 0;
  let redirectMode: RequestRedirect | undefined;
  const response = await handleCmsRebuildRequest(
    await signedRequest(),
    createEnvironment(replay.namespace),
    async (_input, init) => {
      hookCalls += 1;
      redirectMode = init?.redirect;
      return cloudflareSuccess();
    }
  );

  assert.equal(response.status, 202);
  assert.deepEqual(await response.json(), {
    ok: true,
    status: 'accepted',
    eventId: event.id,
    buildId: 'build-1',
    branch: 'main'
  });
  assert.equal(hookCalls, 1);
  assert.equal(redirectMode, 'manual');
  assert.equal(replay.states.get(event.id), 'completed');
});

test('rejects a deploy hook redirect while using the Workers-compatible manual mode', async () => {
  const replay = createReplayNamespace();
  let redirectMode: RequestRedirect | undefined;
  const response = await handleCmsRebuildRequest(
    await signedRequest(),
    createEnvironment(replay.namespace),
    async (_input, init) => {
      redirectMode = init?.redirect;
      return new Response(null, { status: 302, headers: { location: 'https://example.com/' } });
    }
  );

  assert.equal(response.status, 502);
  assert.equal(redirectMode, 'manual');
  assert.equal(replay.states.has(event.id), false);
});

test('rejects an invalid signature without calling Cloudflare', async () => {
  const replay = createReplayNamespace();
  let hookCalls = 0;
  const response = await handleCmsRebuildRequest(
    await signedRequest(event, 'a-different-secret-that-is-also-long-enough'),
    createEnvironment(replay.namespace),
    async () => {
      hookCalls += 1;
      return cloudflareSuccess();
    }
  );

  assert.equal(response.status, 401);
  assert.equal((await response.json() as { code: string }).code, 'signature_invalid');
  assert.equal(hookCalls, 0);
});

test('treats a replayed completed event as a duplicate without another build', async () => {
  const replay = createReplayNamespace();
  let hookCalls = 0;
  const fetch = async () => {
    hookCalls += 1;
    return cloudflareSuccess();
  };

  assert.equal((await handleCmsRebuildRequest(await signedRequest(), createEnvironment(replay.namespace), fetch)).status, 202);
  const duplicate = await handleCmsRebuildRequest(await signedRequest(), createEnvironment(replay.namespace), fetch);
  assert.equal(duplicate.status, 202);
  assert.equal((await duplicate.json() as { status: string }).status, 'duplicate');
  assert.equal(hookCalls, 1);
});

test('reports a Cloudflare duplicate publish as already queued', async () => {
  const replay = createReplayNamespace();
  const response = await handleCmsRebuildRequest(
    await signedRequest(),
    createEnvironment(replay.namespace),
    async () => cloudflareSuccess(true)
  );
  assert.equal(response.status, 202);
  assert.equal((await response.json() as { status: string }).status, 'already_queued');
});

test('releases a failed trigger claim so the exact CMS event can retry', async () => {
  const replay = createReplayNamespace();
  const environment = createEnvironment(replay.namespace);
  const failed = await handleCmsRebuildRequest(
    await signedRequest(),
    environment,
    async () => new Response('unavailable', { status: 503 })
  );
  assert.equal(failed.status, 502);
  assert.equal(replay.states.has(event.id), false);

  const retried = await handleCmsRebuildRequest(
    await signedRequest(),
    environment,
    async () => cloudflareSuccess()
  );
  assert.equal(retried.status, 202);
  assert.equal(replay.states.get(event.id), 'completed');
});

test('returns a retryable conflict while an event is already in progress', async () => {
  const replay = createReplayNamespace();
  replay.states.set(event.id, 'in_progress');
  const response = await handleCmsRebuildRequest(
    await signedRequest(),
    createEnvironment(replay.namespace),
    async () => cloudflareSuccess()
  );
  assert.equal(response.status, 409);
  assert.equal(response.headers.get('retry-after'), '2');
});
