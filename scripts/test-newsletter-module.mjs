import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('optional/newsletter/src/components/newsletter/NewsletterForm.astro', 'utf8');
const functionSource = readFileSync('optional/newsletter/functions/api/newsletter.ts', 'utf8');
const workerSource = readFileSync('src/lib/newsletter/handler.ts', 'utf8');

assert.match(source, /name="email"/);
assert.match(source, /type="email"/);
assert.match(source, /required/);
assert.match(source, /name="company"/);
assert.doesNotMatch(source, /CMS_API_TOKEN/);
assert.doesNotMatch(source, /OOOPS_CMS_API_TOKEN/);
assert.match(functionSource, /handleNewsletterRequest/);
assert.match(workerSource, /PUBLIC_CMS_API_BASE_URL/);
assert.match(workerSource, /PUBLIC_NEWSLETTER_FORM_TOKEN/);
assert.match(workerSource, /answers: \{ email \}/);
assert.match(workerSource, /submitterIdentity: \{ email \}/);
assert.match(workerSource, /candidate\.origin === requestUrl\.origin/);
assert.doesNotMatch(functionSource, /CMS_API_TOKEN/);
assert.doesNotMatch(functionSource, /OOOPS_CMS_API_TOKEN/);

console.log('[newsletter-test] Optional newsletter module passed.');
