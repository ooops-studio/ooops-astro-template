import {
  createCmsRebuildHandler,
  type CmsRebuildClaimState,
  type CmsRebuildReplayStore
} from '@ooopsstudio/cms-cloudflare';

type DurableObjectStubLike = {
  fetch(request: Request): Promise<Response>;
};

type DurableObjectNamespaceLike = {
  idFromName(name: string): unknown;
  get(id: unknown): DurableObjectStubLike;
};

export type CmsRebuildWorkerEnv = {
  CMS_REBUILD_REPLAY_GUARD: DurableObjectNamespaceLike;
  OOOPS_CLOUDFLARE_DEPLOY_HOOK_URL?: string;
  OOOPS_CMS_REBUILD_SECRET?: string;
};

const replayOperation = async <T>(
  namespace: DurableObjectNamespaceLike,
  eventId: string,
  operation: 'claim' | 'complete' | 'release',
  expiresAt?: number
) => {
  const stub = namespace.get(namespace.idFromName(eventId));
  const response = await stub.fetch(
    new Request(`https://cms-rebuild-replay.internal/${operation}`, {
      method: 'POST',
      body: expiresAt === undefined ? undefined : JSON.stringify({ expiresAt }),
      headers: expiresAt === undefined ? undefined : { 'content-type': 'application/json' }
    })
  );
  if (!response.ok) throw new Error(`Replay guard ${operation} failed with HTTP ${response.status}.`);
  return (await response.json()) as T;
};

export const createDurableObjectReplayStore = (
  namespace: DurableObjectNamespaceLike
): CmsRebuildReplayStore => ({
  claim: async (eventId, expiresAt) => {
    const result = await replayOperation<{ state: CmsRebuildClaimState }>(
      namespace,
      eventId,
      'claim',
      expiresAt
    );
    return result.state;
  },
  complete: async (eventId, expiresAt) => {
    await replayOperation(namespace, eventId, 'complete', expiresAt);
  },
  release: async (eventId) => {
    await replayOperation(namespace, eventId, 'release');
  }
});

const configurationError = (missing: string[]) =>
  Response.json(
    {
      ok: false,
      code: 'cms_rebuild_configuration_missing',
      message: `Missing Worker secrets: ${missing.join(', ')}.`,
      retryable: false
    },
    { status: 503 }
  );

export const handleCmsRebuildRequest = async (
  request: Request,
  env: CmsRebuildWorkerEnv,
  fetchImpl: typeof globalThis.fetch = globalThis.fetch
) => {
  const missing = [
    !env.OOOPS_CMS_REBUILD_SECRET ? 'OOOPS_CMS_REBUILD_SECRET' : null,
    !env.OOOPS_CLOUDFLARE_DEPLOY_HOOK_URL ? 'OOOPS_CLOUDFLARE_DEPLOY_HOOK_URL' : null,
    !env.CMS_REBUILD_REPLAY_GUARD ? 'CMS_REBUILD_REPLAY_GUARD' : null
  ].filter((value): value is string => Boolean(value));
  if (missing.length > 0) return configurationError(missing);

  const deployHookFetch: typeof globalThis.fetch = async (input, init) => {
    const response = await fetchImpl(input, init);
    if (!response.ok) {
      const body = await response.clone().text().catch(() => '');
      console.error('Cloudflare deploy hook request failed.', {
        status: response.status,
        rayId: response.headers.get('cf-ray'),
        response: body.slice(0, 500)
      });
    }
    return response;
  };

  return createCmsRebuildHandler({
    secret: env.OOOPS_CMS_REBUILD_SECRET!,
    deployHookUrl: env.OOOPS_CLOUDFLARE_DEPLOY_HOOK_URL!,
    replayStore: createDurableObjectReplayStore(env.CMS_REBUILD_REPLAY_GUARD),
    fetch: deployHookFetch
  })(request);
};
