import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mediaSources, mediaSourceSet, mediaAlt } from '../../src/lib/cms/content-helpers';
import { responsiveRichTextImages } from '../../src/lib/cms/rich-text-images';
const asset = { id: 'photo', url: 'https://cms.test/original.png', width: 1280, height: 800, alt: { el: 'Ελληνικά', en: 'English' }, sources: [
  { url: 'https://cms.test/small.avif', mimeType: 'image/avif', width: 320, height: 200, sizeBytes: 800 },
  { url: 'https://cms.test/large.avif', mimeType: 'image/avif', width: 1280, height: 800, sizeBytes: 3000 },
  { url: 'https://cms.test/large.webp', mimeType: 'image/webp', width: 1280, height: 800, sizeBytes: 4000 },
] };
test('only published source dimensions produce srcsets, including nested record references', () => {
  assert.equal(mediaSourceSet('photo', 'image/avif', { photo: asset }), 'https://cms.test/small.avif 320w, https://cms.test/large.avif 1280w');
  assert.equal(mediaSourceSet({ assetId: 'photo' }, 'image/webp', { photo: asset }), 'https://cms.test/large.webp 1280w');
  assert.deepEqual(mediaSources({ ...asset, sources: [{ url: 'x', width: 0, height: 0, mimeType: 'image/webp' }] }), []);
  assert.equal(mediaSourceSet({ url: asset.url }, 'image/avif'), undefined);
  assert.equal(mediaSourceSet({ ...asset, sources: [asset.sources[0]] }, 'image/avif'), undefined);
  assert.equal(mediaAlt(asset, '', undefined, 'el'), 'Ελληνικά');
});
test('rich text resolves the same sources without rewriting links, escaped markup or existing pictures', () => {
  const html = '<p>&lt;img src="text"&gt;</p><img data-asset-id="photo" src="https://cms.test/original.png"><a href="https://cms.test/original.png">Original</a>';
  const output = responsiveRichTextImages(html, { photo: asset }, 'el');
  assert.match(output, /<picture><source type="image\/avif"/);
  assert.match(output, /type="image\/webp"/);
  assert.match(output, /alt="Ελληνικά"/);
  assert.match(output, /&lt;img/);
  assert.match(output, /<a href="https:\/\/cms.test\/original.png">Original<\/a>/);
  assert.doesNotMatch(output, /\?w=/);
  assert.equal(responsiveRichTextImages(output, { photo: asset }), output);
  const explicit = '<img data-asset-id="photo" src="original.png" srcset="custom.png 300w">';
  assert.doesNotMatch(responsiveRichTextImages(explicit, { photo: asset }), /<picture>/);
});
