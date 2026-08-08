import { jsonResponse } from '@ooopsstudio/stage-cloudflare';

type PagesContext = {
  request: Request;
};

const previewCookieNames = ['stage_preview', '__stage_preview', 'ooops_stage_preview'];

export const onRequestGet = ({ request }: PagesContext) => {
  const url = new URL(request.url);
  const redirect = url.searchParams.get('redirect') || '/';
  const headers = new Headers({ location: redirect.startsWith('/') ? redirect : '/' });

  for (const name of previewCookieNames) {
    headers.append('set-cookie', `${name}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`);
  }

  return new Response(null, { status: 303, headers });
};

export const onRequest = () => jsonResponse({ ok: false, message: 'Method not allowed.' }, { status: 405 });
