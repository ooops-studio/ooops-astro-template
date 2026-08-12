const COOKIE_NAME = 'ooops_cms_preview';
const SESSION_TTL_SECONDS = 30 * 60;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

export type PreviewKind = 'collection' | 'single';
export type PreviewSession = { apiId: string; expiresAt: number; kind: PreviewKind; previewToken: string; slug?: string };
type RuntimeEnv = Record<string, string | undefined>;

const toBase64Url = (value: Uint8Array) => { let binary = ''; for (const byte of value) binary += String.fromCharCode(byte); return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, ''); };
const fromBase64Url = (value: string) => { const normalized = value.replace(/-/g, '+').replace(/_/g, '/'); const binary = atob(normalized + '='.repeat((4 - (normalized.length % 4)) % 4)); return Uint8Array.from(binary, (character) => character.charCodeAt(0)); };
const parseCookies = (header: string | null) => Object.fromEntries((header || '').split(';').map((part) => part.trim()).filter(Boolean).map((part) => { const separator = part.indexOf('='); return separator === -1 ? [part, ''] : [part.slice(0, separator), part.slice(separator + 1)]; }));
const getSecret = (env: RuntimeEnv) => env.OOOPS_CMS_PREVIEW_SESSION_SECRET?.trim() || '';
const getCookieKey = async (secret: string) => crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'PBKDF2' }, false, ['deriveKey']).then((material) => crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', iterations: 100_000, salt: encoder.encode('ooops-cms-preview-v1') }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']));
const sessionValue = async (session: PreviewSession, secret: string) => { const iv = crypto.getRandomValues(new Uint8Array(12)); const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await getCookieKey(secret), encoder.encode(JSON.stringify(session))); return `${toBase64Url(iv)}.${toBase64Url(new Uint8Array(encrypted))}`; };
const asSession = (value: unknown): PreviewSession | null => { if (!value || typeof value !== 'object' || Array.isArray(value)) return null; const input = value as Record<string, unknown>; if ((input.kind !== 'collection' && input.kind !== 'single') || typeof input.apiId !== 'string' || !input.apiId || typeof input.previewToken !== 'string' || !input.previewToken || typeof input.expiresAt !== 'number' || input.expiresAt <= Date.now() || (input.slug !== undefined && typeof input.slug !== 'string')) return null; return { apiId: input.apiId, expiresAt: input.expiresAt, kind: input.kind, previewToken: input.previewToken, ...(typeof input.slug === 'string' ? { slug: input.slug } : {}) }; };

export const createPreviewSession = ({ apiId, kind, previewToken, slug }: Omit<PreviewSession, 'expiresAt'>): PreviewSession => ({ apiId, expiresAt: Date.now() + SESSION_TTL_SECONDS * 1_000, kind, previewToken, ...(slug ? { slug } : {}) });
export const serializePreviewSessionCookie = async (session: PreviewSession, env: RuntimeEnv, secure: boolean) => { const secret = getSecret(env); if (!secret) throw new Error('OOOPS_CMS_PREVIEW_SESSION_SECRET is not configured.'); const value = await sessionValue(session, secret); return `${COOKIE_NAME}=${value}; Path=/preview/content/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}${secure ? '; Secure' : ''}`; };
export const readPreviewSession = async (request: Request, env: RuntimeEnv): Promise<PreviewSession | null> => { const secret = getSecret(env); const value = parseCookies(request.headers.get('cookie'))[COOKIE_NAME]; if (!secret || !value) return null; const [rawIv, rawCiphertext, ...rest] = value.split('.'); if (!rawIv || !rawCiphertext || rest.length > 0) return null; try { const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64Url(rawIv) }, await getCookieKey(secret), fromBase64Url(rawCiphertext)); return asSession(JSON.parse(decoder.decode(decrypted))); } catch { return null; } };
export const clearPreviewSessionCookie = (secure: boolean) => `${COOKIE_NAME}=; Path=/preview/content/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? '; Secure' : ''}`;
