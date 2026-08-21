import { clearPreviewSessionCookie } from '../../../lib/cms-preview/session';

export const prerender = false;

const safeRedirect = (value: string | null) =>
  value && value.startsWith('/') && !value.startsWith('//') ? value : '/';

export const GET = ({ request }: { request: Request }) => {
  const url = new URL(request.url);
  return new Response(null, {
    status: 303,
    headers: {
      location: safeRedirect(url.searchParams.get('redirect')),
      'set-cookie': clearPreviewSessionCookie(url.protocol === 'https:'),
      'cache-control': 'private, no-store',
      'referrer-policy': 'no-referrer'
    }
  });
};
