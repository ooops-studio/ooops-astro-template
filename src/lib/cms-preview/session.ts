import {
  clearCmsPreviewSessionCookie,
  createCmsPreviewSession,
  readCmsPreviewSession,
  serializeCmsPreviewSessionCookie,
  type CmsPreviewKind,
  type CmsPreviewSession
} from '@ooopsstudio/cms-cloudflare';

const COOKIE_NAME = 'ooops_cms_preview';
const SESSION_TTL_SECONDS = 30 * 60;

type RuntimeEnv = Record<string, string | undefined>;

const getSecret = (env: RuntimeEnv) => env.OOOPS_CMS_PREVIEW_SESSION_SECRET?.trim() || '';

export type PreviewKind = CmsPreviewKind;
export type PreviewSession = CmsPreviewSession;

export const previewSessionCookieName = COOKIE_NAME;

export const createPreviewSession = ({
  apiId,
  kind,
  previewToken,
  slug
}: Omit<PreviewSession, 'expiresAt'>): PreviewSession => createCmsPreviewSession({
  apiId,
  kind,
  previewToken,
  ...(slug ? { slug } : {}),
  ttlSeconds: SESSION_TTL_SECONDS
});

export const serializePreviewSessionCookie = (
  session: PreviewSession,
  env: RuntimeEnv,
  secure: boolean
) => serializeCmsPreviewSessionCookie(session, {
  secret: getSecret(env),
  secure,
  cookieName: COOKIE_NAME,
  ttlSeconds: SESSION_TTL_SECONDS
});

export const readPreviewSession = (
  request: Request,
  env: RuntimeEnv
): Promise<PreviewSession | null> => readCmsPreviewSession(request, {
  secret: getSecret(env),
  cookieName: COOKIE_NAME
});

export const clearPreviewSessionCookie = (secure: boolean) => clearCmsPreviewSessionCookie({
  secure,
  cookieName: COOKIE_NAME
});
