import { createExampleStageClient } from './stage-request';

const stage = createExampleStageClient();
const webhookUrl = process.env.WEBHOOK_RECEIVER_URL ?? '';

const forms = await stage.forms.list<{
  ok: true;
  forms?: Array<{ id: string; title: string; shareToken?: string | null }>;
  items?: Array<{ id: string; title: string; shareToken?: string | null }>;
}>();

console.log('Forms');
for (const form of forms.forms ?? forms.items ?? []) {
  console.log(`- ${form.title}: ${form.id}`);
}

if (webhookUrl) {
  const webhook = await stage.webhooks.create<{
    ok: true;
    subscription: { id: string; name: string; eventTypes: string[] };
    signingSecret?: string;
  }>({
    name: 'Template CMS rebuild receiver',
    url: webhookUrl,
    enabled: true,
    eventTypes: ['cms.entry.published', 'media.asset.updated', 'form.submission.created']
  });

  console.log(`Created webhook ${webhook.subscription.id}`);
  if (webhook.signingSecret) console.log(`Store this signing secret securely: ${webhook.signingSecret}`);
} else {
  console.log('Set WEBHOOK_RECEIVER_URL to create a webhook subscription.');
}
