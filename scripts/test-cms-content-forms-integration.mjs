import {createCmsClient, createCmsPublicFormsClient} from '@ooopsstudio/cms-api';

const baseUrl = (process.env.OOOPS_CMS_API_BASE_URL || '').replace(/\/+$/, '');
const token = process.env.OOOPS_CMS_API_TOKEN || '';
const formShareToken = process.env.OOOPS_CMS_INTEGRATION_FORM_SHARE_TOKEN || '';
const formTestEmail = process.env.OOOPS_CMS_INTEGRATION_FORM_TEST_EMAIL || '';

if (!baseUrl || !token) {
  console.log('[cms-integration] Skipped: set OOOPS_CMS_API_BASE_URL and OOOPS_CMS_API_TOKEN to run against a real CMS environment.');
  process.exit(0);
}

const cms = createCmsClient({baseUrl, token, timeoutMs: 15_000});
const isRecord = (value) => value !== null && typeof value === 'object';
const assert = (condition, message) => {
  if (!condition) throw new Error(`[cms-integration] ${message}`);
};

const singles = await cms.content.listSingles();
assert(isRecord(singles), 'listSingles must return an object response.');

const homepage = await cms.content.getSingle('homepage');
assert(isRecord(homepage), 'homepage must return an object response.');
assert(isRecord(homepage.content), 'homepage response must contain content.');

const collections = await cms.content.listCollections();
assert(isRecord(collections), 'listCollections must return an object response.');

const posts = await cms.content.listCollectionEntries('posts', {limit: 1});
assert(isRecord(posts), 'posts must return an object response.');
assert(Array.isArray(posts.items), 'posts response must contain an items array.');

if (posts.items.length > 0) {
  const firstPost = posts.items[0];
  assert(isRecord(firstPost), 'post items must be objects.');
  const idOrSlug = typeof firstPost.slug === 'string' && firstPost.slug
    ? firstPost.slug
    : typeof firstPost.id === 'string' ? firstPost.id : '';
  assert(Boolean(idOrSlug), 'the first post must expose an id or slug.');
  const post = await cms.content.getCollectionEntry('posts', idOrSlug);
  assert(isRecord(post) && isRecord(post.item), 'a post detail response must contain item.');
}

const forms = await cms.forms.list();
assert(isRecord(forms), 'forms must return an object response.');
const formItems = Array.isArray(forms.forms) ? forms.forms : Array.isArray(forms.items) ? forms.items : [];
assert(Array.isArray(formItems), 'forms response must contain forms or items.');
const contact = formItems.find((form) => isRecord(form) && (form.key === 'contact' || form.title === 'Contact request'));
assert(contact, 'the contact form was not found. Create the production fixture documented in cms/starter-bundle.json.');
const contactId = typeof contact.id === 'string' ? contact.id : '';
assert(Boolean(contactId), 'the contact form must expose an id.');
const contactDetail = await cms.forms.get(contactId);
assert(isRecord(contactDetail), 'the contact form detail response must be an object.');

if (formShareToken || formTestEmail) {
  assert(formShareToken && formTestEmail, 'set both OOOPS_CMS_INTEGRATION_FORM_SHARE_TOKEN and OOOPS_CMS_INTEGRATION_FORM_TEST_EMAIL to test a public submission.');
  const publicForms = createCmsPublicFormsClient({baseUrl, timeoutMs: 15_000});
  const submission = await publicForms.forms.submit(formShareToken, {
    answers: {
      name: 'Ooops SSG integration test',
      email: formTestEmail,
      message: 'Disposable production integration submission.'
    },
    submitterIdentity: {name: 'Ooops SSG integration test', email: formTestEmail},
    metadata: {source: 'ooops-ssg-test-cms-integration'}
  });
  assert(isRecord(submission), 'the public contact submission response must be an object.');
}

const formMessage = formShareToken ? 'contact public submission accepted' : 'contact form readable';
console.log(`[cms-integration] Passed: homepage, posts (${posts.items.length} inspected), and ${formMessage} from ${new URL(baseUrl).origin}.`);
