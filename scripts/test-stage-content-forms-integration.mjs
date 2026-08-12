import {createStageClient, createStagePublicFormsClient} from '@ooopsstudio/stage-api';

const baseUrl = (process.env.OOOPS_STAGE_API_BASE_URL || process.env.STAGE_API_BASE_URL || '').replace(/\/+$/, '');
const token = process.env.OOOPS_STAGE_API_TOKEN || process.env.STAGE_API_TOKEN || '';
const formShareToken = process.env.OOOPS_STAGE_INTEGRATION_FORM_SHARE_TOKEN || '';
const formTestEmail = process.env.OOOPS_STAGE_INTEGRATION_FORM_TEST_EMAIL || '';

if (!baseUrl || !token) {
  console.log('[stage-integration] Skipped: set OOOPS_STAGE_API_BASE_URL and OOOPS_STAGE_API_TOKEN to run against a real Stage environment.');
  process.exit(0);
}

const stage = createStageClient({baseUrl, token, timeoutMs: 15_000});
const isRecord = (value) => value !== null && typeof value === 'object';
const assert = (condition, message) => {
  if (!condition) throw new Error(`[stage-integration] ${message}`);
};

const singles = await stage.content.listSingles();
assert(isRecord(singles), 'listSingles must return an object response.');

const homepage = await stage.content.getSingle('homepage');
assert(isRecord(homepage), 'homepage must return an object response.');
assert(isRecord(homepage.content), 'homepage response must contain content.');

const collections = await stage.content.listCollections();
assert(isRecord(collections), 'listCollections must return an object response.');

const posts = await stage.content.listCollectionEntries('posts', {limit: 1});
assert(isRecord(posts), 'posts must return an object response.');
assert(Array.isArray(posts.items), 'posts response must contain an items array.');

if (posts.items.length > 0) {
  const firstPost = posts.items[0];
  assert(isRecord(firstPost), 'post items must be objects.');
  const idOrSlug = typeof firstPost.slug === 'string' && firstPost.slug
    ? firstPost.slug
    : typeof firstPost.id === 'string' ? firstPost.id : '';
  assert(Boolean(idOrSlug), 'the first post must expose an id or slug.');
  const post = await stage.content.getCollectionEntry('posts', idOrSlug);
  assert(isRecord(post) && isRecord(post.item), 'a post detail response must contain item.');
}

const forms = await stage.forms.list();
assert(isRecord(forms), 'forms must return an object response.');
const formItems = Array.isArray(forms.forms) ? forms.forms : Array.isArray(forms.items) ? forms.items : [];
assert(Array.isArray(formItems), 'forms response must contain forms or items.');
const newsletter = formItems.find((form) => isRecord(form) && (form.key === 'newsletter' || form.title === 'Newsletter signup'));
assert(newsletter, 'the bootstrap newsletter form was not found. Run pnpm stage:bootstrap for this Stage organization.');
const newsletterId = typeof newsletter.id === 'string' ? newsletter.id : '';
assert(Boolean(newsletterId), 'the newsletter form must expose an id.');
const newsletterDetail = await stage.forms.get(newsletterId);
assert(isRecord(newsletterDetail), 'the newsletter form detail response must be an object.');

if (formShareToken || formTestEmail) {
  assert(formShareToken && formTestEmail, 'set both OOOPS_STAGE_INTEGRATION_FORM_SHARE_TOKEN and OOOPS_STAGE_INTEGRATION_FORM_TEST_EMAIL to test a public submission.');
  const publicForms = createStagePublicFormsClient({baseUrl, timeoutMs: 15_000});
  const submission = await publicForms.forms.submit(formShareToken, {
    answers: {email: formTestEmail},
    metadata: {source: 'ooops-astro-template-stage-integration'}
  });
  assert(isRecord(submission), 'the public newsletter submission response must be an object.');
}

const formMessage = formShareToken ? 'newsletter public submission accepted' : 'newsletter form readable';
console.log(`[stage-integration] Passed: homepage, posts (${posts.items.length} inspected), and ${formMessage} from ${new URL(baseUrl).origin}.`);
