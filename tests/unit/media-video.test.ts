import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mediaVideo } from '../../src/lib/cms/content-helpers';
import { responsiveRichTextImages } from '../../src/lib/cms/rich-text-images';
const asset = { id:'video-el',url:'https://media.example/original.mov',width:1920,height:1080,video:{width:1280,height:720,mp4:{url:'https://media.example/fallback.mp4'},hls:{url:'https://media.example/master.m3u8'},poster:{url:'https://media.example/poster.webp'}} };
const map = {'video-el':asset,'video-en':{id:'video-en',url:'https://media.example/english.mp4'}};
test('localized video fields and nested group references resolve stable media IDs',()=>{
 const group={clips:[{video:{en:{assetId:'video-en'},el:{assetId:'video-el'}}}]};
 const greek=mediaVideo(group.clips[0]!.video,map,'el');assert.equal(greek.hls,asset.video.hls.url);assert.equal(greek.width,1280);
 const english=mediaVideo(group.clips[0]!.video,map,'en');assert.equal(english.original,map['video-en'].url);assert.equal(english.hls,null);
});
test('pending and missing variants preserve the original without fabricated URLs',()=>{
 assert.equal(mediaVideo('video-en',map).mp4,null);assert.equal(mediaVideo('missing',map).original,null);
});
test('rich text resolves videos, preserves captions and explicit poster/source children',()=>{
 const html=responsiveRichTextImages('<video controls data-asset-id="video-el" src="https://media.example/original.mov"><track kind="captions" src="/el.vtt"></video>',map,'el');
 assert.match(html,/data-cms-hls="https:\/\/media.example\/master.m3u8"/);assert.match(html,/preload="metadata"/);assert.match(html,/<track kind="captions" src="\/el.vtt">/);
 const explicit=responsiveRichTextImages('<video data-asset-id="video-el" poster="/mine.png"><source src="/mine.mp4"></video>',map);assert.doesNotMatch(explicit,/data-cms-hls/);assert.match(explicit,/poster="\/mine.png"/);
});
