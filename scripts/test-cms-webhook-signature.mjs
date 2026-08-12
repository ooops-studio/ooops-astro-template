import { signCmsWebhookPayload } from '@ooopsstudio/cms-cloudflare';

const secret = process.env.CMS_WEBHOOK_SECRET || '';
const targetUrl = process.env.WEBHOOK_TEST_URL || '';
const eventType = process.env.CMS_WEBHOOK_TEST_EVENT || 'cms.entry.published';

if (!secret || !targetUrl) {
  console.error('Usage: CMS_WEBHOOK_SECRET=... WEBHOOK_TEST_URL=http://localhost:8788/api/cms/rebuild pnpm test:webhook');
  process.exit(1);
}

const body = JSON.stringify({
  id: crypto.randomUUID(),
  event: eventType,
  createdAt: new Date().toISOString(),
  data: {
    apiId: 'homepage',
    entityType: 'single'
  }
});

const timestamp = new Date().toISOString();
const signature = await signCmsWebhookPayload({ secret, timestamp, body });

const response = await fetch(targetUrl, {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'x-cms-timestamp': timestamp,
    'x-cms-signature': signature,
    'x-cms-event': eventType
  },
  body
});

const text = await response.text();
if (!response.ok) {
  console.error(`[webhook-test] ${response.status} ${response.statusText}`);
  console.error(text);
  process.exit(1);
}

console.log(`[webhook-test] ${response.status} ${response.statusText}`);
console.log(text);
