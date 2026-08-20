import { env as cloudflareEnv } from 'cloudflare:workers';
import { createCmsPreviewClient } from '@ooopsstudio/cms-api';
import { cmsPreviewPath } from '@ooopsstudio/cms-cloudflare';
import { createPreviewSession, type PreviewKind, readPreviewSession, serializePreviewSessionCookie } from './session';

type RuntimeEnv = Record<string, string | undefined>;

export type CmsPreviewResponse = {
  apiId: string;
  item?: Record<string, unknown>;
  data?: Record<string, unknown>;
  ok: true;
  preview: true;
};

const runtimeEnv = (value: unknown): RuntimeEnv =>
  value && typeof value === 'object' ? value as RuntimeEnv : {};

const apiConfig = (env: RuntimeEnv) => ({
  baseUrl: env.OOOPS_CMS_API_BASE_URL?.replace(/\/+$/, '') || '',
  token: env.OOOPS_CMS_API_TOKEN || ''
});

const isSecureRequest = (request: Request) => new URL(request.url).protocol === 'https:';

const fetchPreview = async ({
  apiId,
  env,
  kind,
  previewToken,
  slug
}: {
  apiId: string;
  env: RuntimeEnv;
  kind: PreviewKind;
  previewToken: string;
  slug?: string;
}): Promise<CmsPreviewResponse | null> => {
  const { baseUrl, token } = apiConfig(env);
  if (!baseUrl || !token || !previewToken) return null;
  const client = createCmsPreviewClient({ baseUrl, token, previewToken });
  try {
    const payload = kind === 'collection'
      ? await client.content.getCollectionEntry<CmsPreviewResponse>(apiId, slug || '')
      : await client.content.getSingle<CmsPreviewResponse>(apiId);
    return payload.ok && payload.preview ? payload : null;
  } catch {
    return null;
  }
};

export const cloudflareRuntimeEnv = () => {
  const runtime = runtimeEnv(cloudflareEnv);
  const processEnv = typeof process === 'undefined' ? {} : runtimeEnv(process.env);
  return { ...processEnv, ...runtime };
};

export const preparePreview = async ({
  apiId,
  kind,
  request,
  slug,
  previewToken
}: {
  apiId: string;
  kind: PreviewKind;
  request: Request;
  slug?: string;
  previewToken: string | null;
}) => {
  const env = cloudflareRuntimeEnv();
  if (env.OOOPS_CMS_PREVIEW_ENABLED !== 'true') {
    return { payload: null, redirect: null, setCookie: null };
  }
  const expectedPath = cmsPreviewPath({ apiId, kind, slug });
  if (previewToken) {
    const payload = await fetchPreview({ apiId, env, kind, previewToken, slug });
    if (!payload) return { payload: null, redirect: null, setCookie: null };
    const session = createPreviewSession({ apiId, kind, previewToken, ...(slug ? { slug } : {}) });
    return {
      payload,
      redirect: expectedPath,
      setCookie: await serializePreviewSessionCookie(session, env, isSecureRequest(request))
    };
  }

  const session = await readPreviewSession(request, env);
  if (!session || session.kind !== kind || session.apiId !== apiId || session.slug !== slug) {
    return { payload: null, redirect: null, setCookie: null };
  }
  return {
    payload: await fetchPreview({ apiId, env, kind, previewToken: session.previewToken, slug }),
    redirect: null,
    setCookie: null
  };
};

export const publicPreviewPath = ({ apiId, kind, slug }: { apiId: string; kind: PreviewKind; slug?: string }) => {
  if (kind === 'collection' && apiId === 'posts' && slug) return `/posts/${encodeURIComponent(slug)}`;
  if (kind === 'single' && apiId === 'homepage') return '/';
  return '/';
};
