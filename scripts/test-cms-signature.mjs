import assert from 'node:assert/strict';

const { signCmsWebhookPayload, verifyCmsWebhookSignature } = await import('@ooopsstudio/cms-cloudflare');

const secret = 'test_secret';
const body = JSON.stringify({ ok: true });
const timestamp = new Date().toISOString();
const signature = await signCmsWebhookPayload({ secret, timestamp, body });

assert.equal(
  (await verifyCmsWebhookSignature({ secret, timestamp, signature, body })).ok,
  true
);
assert.equal(
  (await verifyCmsWebhookSignature({ secret, timestamp, signature: 'v1=bad', body })).ok,
  false
);
assert.equal(
  (await verifyCmsWebhookSignature({ secret, timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(), signature, body })).ok,
  false
);

console.log('[signature-test] CMS signature helpers passed.');
