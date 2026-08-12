import { createCmsPublicFormsClient } from '@ooopsstudio/cms-api';

const baseUrl = (process.env.PUBLIC_CMS_API_BASE_URL ?? 'http://cms.localhost:4175').replace(/\/$/, '');
const token = process.env.PUBLIC_NEWSLETTER_FORM_TOKEN ?? '';
const email = process.argv[2] ?? 'subscriber@example.com';

if (!token) {
  throw new Error('Set PUBLIC_NEWSLETTER_FORM_TOKEN before running this example.');
}

const response = await createCmsPublicFormsClient({ baseUrl }).forms.submit(token, {
    answers: { email },
    submitterIdentity: { email }
});

console.log(`Submitted ${email}: ${JSON.stringify(response)}`);

export {};
