import type { APIRoute } from 'astro';
import { stagePreviewSecret, stagePreviewToken } from '../../lib/stage/env';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' }
  });

const safePath = (value: string | null) => {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/';
  return value;
};
export const GET: APIRoute = async ({ url, cookies, redirect }) => {
  if (!stagePreviewSecret || !stagePreviewToken) {
    return json({ ok: false, error: 'preview_not_configured' }, 503);
  }

  if (url.searchParams.get('secret') !== stagePreviewSecret) {
    return json({ ok: false, error: 'preview_secret_invalid' }, 401);
  }

  cookies.set('stage_preview', '1', {
    httpOnly: true,
    sameSite: 'lax',
    secure: url.protocol === 'https:',
    path: '/',
    maxAge: 60 * 30
  });

  return redirect(safePath(url.searchParams.get('path')), 302);
};
