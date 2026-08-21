import assert from 'node:assert/strict';
import test from 'node:test';

import { handleNewsletterRequest } from '../../src/lib/newsletter/handler';

test('newsletter endpoint only accepts POST', async () => {
  const response = await handleNewsletterRequest(new Request('https://italiour.com/api/newsletter'), {});
  assert.equal(response.status, 405);
  assert.equal(response.headers.get('allow'), 'POST');
});

test('newsletter endpoint fails closed and never redirects to an external referrer', async () => {
  const response = await handleNewsletterRequest(new Request('https://italiour.com/api/newsletter', {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      referer: 'https://attacker.example/collect'
    },
    body: new URLSearchParams({ email: 'person@example.com' })
  }), {});

  assert.equal(response.status, 303);
  assert.equal(response.headers.get('location'), 'https://italiour.com/?newsletter=error');
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
});

test('newsletter endpoint forwards only the email answer to the configured CMS form', async () => {
  const originalFetch = globalThis.fetch;
  let submittedUrl = '';
  let submittedBody: unknown = null;
  globalThis.fetch = async (input, init) => {
    submittedUrl = String(input);
    submittedBody = JSON.parse(String(init?.body));
    return Response.json({ ok: true });
  };

  try {
    const response = await handleNewsletterRequest(new Request('https://italiour.com/api/newsletter', {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        referer: 'https://italiour.com/projects'
      },
      body: new URLSearchParams({ email: ' PERSON@EXAMPLE.COM ', company: '' })
    }), {
      PUBLIC_CMS_API_BASE_URL: 'https://cms.ooops.studio',
      PUBLIC_NEWSLETTER_FORM_TOKEN: 'public-newsletter-token'
    });

    assert.equal(response.status, 303);
    assert.equal(response.headers.get('location'), 'https://italiour.com/projects?newsletter=success');
    assert.equal(submittedUrl, 'https://cms.ooops.studio/api/cms/public/forms/public-newsletter-token/submissions');
    assert.deepEqual(submittedBody, {
      answers: { email: 'person@example.com' },
      submitterIdentity: { email: 'person@example.com' }
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
