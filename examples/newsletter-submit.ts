const baseUrl = (process.env.PUBLIC_STAGE_API_BASE_URL ?? 'http://stage.localhost:4275').replace(/\/$/, '');
const token = process.env.PUBLIC_NEWSLETTER_FORM_TOKEN ?? '';
const email = process.argv[2] ?? 'subscriber@example.com';

if (!token) {
  throw new Error('Set PUBLIC_NEWSLETTER_FORM_TOKEN before running this example.');
}

const response = await fetch(`${baseUrl}/api/stage/v1/forms/shares/${encodeURIComponent(token)}/submissions`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    answers: { email },
    submitterIdentity: { email }
  })
});

const body = await response.text();
if (!response.ok) {
  throw new Error(`Newsletter submission failed: ${response.status} ${body}`);
}

console.log(`Submitted ${email}`);

export {};
