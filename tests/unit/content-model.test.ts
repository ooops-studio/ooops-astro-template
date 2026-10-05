import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readContentModel, contentApiIds, postRouteSlug, postPath } from '../../src/lib/cms/content-model';
import { mapHome } from '../../src/lib/cms/homepage';
import { mapPostDetail } from '../../src/lib/posts/client';

test('model selection is explicit and unsupported configuration fails closed', () => {
  assert.equal(readContentModel(undefined), 'starter');
  assert.deepEqual(contentApiIds('starter'), { home: 'homepage', posts: 'posts' });
  assert.deepEqual(contentApiIds(readContentModel('demo')), { home: 'home-page', posts: 'news' });
  assert.throws(() => readContentModel('Demo'));
});

test('Demo maps the published localized group instead of starter fallback copy', () => {
  const home = mapHome({ hero: { en: { title: 'Moving together', description: '<p>Published introduction.</p>' }, el: { title: 'Ελληνικά' } }, 'page-title': { en: 'Home' } }, 'demo');
  assert.equal(home.heading, 'Moving together');
  assert.equal(home.description, 'Published introduction.');
  assert.equal(home.eyebrow, 'Home');
  assert.throws(() => mapHome(null, 'demo'));
  assert.equal(mapHome({ heading: 'Starter heading', description: 'Starter intro' }, 'starter').heading, 'Starter heading');
});

test('Demo news keeps stable identity, localized body and per-language media contract', () => {
  const post = mapPostDetail({ id: 'stable-entry-id', title: { en: 'Published news', el: 'Είδηση' }, slug: { en: 'closing%3A-news', el: '%CE%BD%CE%AD%CE%B1' }, description: { en: 'News summary' }, body: { en: '<p>English body</p>', el: '<p>Ελληνικά</p>' }, cover: { en: { image: [{ assetId: 'cover-en' }] }, el: { image: [{ assetId: 'cover-el' }] } }, _media: { 'cover-en': { url: 'https://media.example.test/cover.png', alt: '' }, 'cover-el': { url: 'https://media.example.test/el.png', alt: 'Εικόνα' } }, _mediaUsages: { 'cover.image': { en: [{ assetId: 'cover-en', alt: '' }], el: [] } } }, 'demo');
  assert.equal(post.id, 'stable-entry-id');
  assert.equal(post.title, 'Published news');
  assert.equal(post.excerpt, 'News summary');
  assert.equal(post.body, '<p>English body</p>');
  assert.equal(post.slug, 'closing:-news');
  assert.equal(post.heroImageUrl, 'https://media.example.test/cover.png');
  assert.equal(post.heroImageAlt, '');
  assert.ok(post.seo.canonical.endsWith('/posts/closing%3A-news'));
});

test('route encoding happens once and rejects path-breaking CMS slugs', () => {
  assert.equal(postPath(postRouteSlug('%CE%BD%CE%AD%CE%B1')), '/posts/%CE%BD%CE%AD%CE%B1');
  assert.equal(postPath(postRouteSlug('literal%text')), '/posts/literal%25text');
  for (const slug of ['..', '%2Fadmin', 'x?y', 'x#y', 'x\\y']) assert.throws(() => postRouteSlug(slug));
});

test('Demo respects an explicitly hidden cover and starter post fields remain supported', () => {
  const hidden = mapPostDetail({ id: 'hidden', title: 'Hidden', slug: 'hidden', cover: { en: { image: [{ assetId: 'photo' }] } }, _media: { photo: { url: 'https://media.example.test/photo.png' } }, _mediaUsages: { 'cover.image': { en: [] } } }, 'demo');
  assert.equal(hidden.heroImageUrl, null);
  const starter = mapPostDetail({ id: 'starter', title: 'Starter post', slug: 'starter', excerpt: 'Starter summary', body: '<p>Starter body</p>' }, 'starter');
  assert.equal(starter.excerpt, 'Starter summary');
  assert.equal(starter.body, '<p>Starter body</p>');
});
