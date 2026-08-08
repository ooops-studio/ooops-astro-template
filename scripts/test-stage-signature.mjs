import assert from 'node:assert/strict';

const { signStagePayload, verifyStageSignature } = await import('@ooopsstudio/stage-cloudflare');

const secret = 'test_secret';
const body = JSON.stringify({ ok: true });
const timestamp = new Date().toISOString();
const signature = await signStagePayload({ secret, timestamp, body });

assert.equal(
  (await verifyStageSignature({ secret, timestamp, signature, body })).ok,
  true
);
assert.equal(
  (await verifyStageSignature({ secret, timestamp, signature: 'v1=bad', body })).ok,
  false
);
assert.equal(
  (await verifyStageSignature({ secret, timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(), signature, body })).ok,
  false
);

console.log('[signature-test] Stage signature helpers passed.');
