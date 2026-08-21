import { createCmsPublicFormsClient } from '@ooopsstudio/cms-api';

export type NewsletterWorkerEnv = {
  PUBLIC_CMS_API_BASE_URL?: string;
  PUBLIC_NEWSLETTER_FORM_TOKEN?: string;
};

const redirectWithStatus = (request: Request, status: 'success' | 'error') => {
  const requestUrl = new URL(request.url);
  let redirectUrl = new URL('/', requestUrl);
  const referer = request.headers.get('referer');
  if (referer) {
    try {
      const candidate = new URL(referer);
      if (candidate.origin === requestUrl.origin) redirectUrl = candidate;
    } catch {
      // Invalid or hostile referrers fall back to the site root.
    }
  }
  redirectUrl.searchParams.set('newsletter', status);
  return new Response(null, {
    status: 303,
    headers: {
      location: redirectUrl.toString(),
      'cache-control': 'private, no-store',
      'referrer-policy': 'same-origin'
    }
  });
};

export const handleNewsletterRequest = async (
  request: Request,
  env: NewsletterWorkerEnv
) => {
  if (request.method !== 'POST') {
    return new Response('Method not allowed.', {
      status: 405,
      headers: { allow: 'POST', 'cache-control': 'no-store' }
    });
  }

  const contentLength = Number(request.headers.get('content-length') || 0);
  if (Number.isFinite(contentLength) && contentLength > 16_384) {
    return new Response('Payload too large.', { status: 413, headers: { 'cache-control': 'no-store' } });
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) return redirectWithStatus(request, 'error');
  if (String(formData.get('company') || '').trim()) return redirectWithStatus(request, 'success');

  const email = String(formData.get('email') || '').trim().toLowerCase();
  const baseUrl = env.PUBLIC_CMS_API_BASE_URL?.replace(/\/+$/, '') || '';
  const token = env.PUBLIC_NEWSLETTER_FORM_TOKEN || '';
  if (!email || email.length > 320 || !email.includes('@') || !baseUrl || !token) {
    return redirectWithStatus(request, 'error');
  }

  try {
    const client = createCmsPublicFormsClient({
      baseUrl: baseUrl.endsWith('/api/cms/v1') ? baseUrl : `${baseUrl}/api/cms/v1`
    });
    const response = await client.forms.submit<{ ok: boolean }>(token, {
      answers: { email },
      submitterIdentity: { email }
    });
    return redirectWithStatus(request, response.ok ? 'success' : 'error');
  } catch {
    return redirectWithStatus(request, 'error');
  }
};
