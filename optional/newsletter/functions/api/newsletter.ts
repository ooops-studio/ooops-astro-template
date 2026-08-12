import { createCmsPublicFormsClient } from '@ooopsstudio/cms-api';

type Env = {
	PUBLIC_CMS_API_BASE_URL?: string;
  PUBLIC_NEWSLETTER_FORM_TOKEN?: string;
};

type PagesContext = {
  request: Request;
  env: Env;
};

const redirectWithStatus = (request: Request, status: 'success' | 'error') => {
  const url = new URL(request.headers.get('referer') || '/', request.url);
  url.searchParams.set('newsletter', status);
  return Response.redirect(url.toString(), 303);
};

export const onRequestPost = async ({ request, env }: PagesContext) => {
  const formData = await request.formData();
  if (String(formData.get('company') || '').trim()) return redirectWithStatus(request, 'success');

  const email = String(formData.get('email') || '').trim();
	const baseUrl = env.PUBLIC_CMS_API_BASE_URL?.replace(/\/$/, '') || '';
  const token = env.PUBLIC_NEWSLETTER_FORM_TOKEN || '';
  if (!email || !baseUrl || !token) return redirectWithStatus(request, 'error');

	const client = createCmsPublicFormsClient({
		baseUrl: baseUrl.endsWith('/api/cms/v1') ? baseUrl : `${baseUrl}/api/cms/v1`
  });

  const response = await client.forms.submit(token, {
      answers: { email },
      submitterIdentity: { email }
  });

  return redirectWithStatus(request, response.ok ? 'success' : 'error');
};

export const onRequest = () => new Response('Method not allowed.', { status: 405 });
