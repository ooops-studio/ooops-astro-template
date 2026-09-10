import { parseFragment, serialize, defaultTreeAdapter, html as htmlNamespaces, type DefaultTreeAdapterMap } from 'parse5';
import { mediaSourceSet, mediaUrl, mediaAlt, mediaVideo, type PublicMediaMap } from './content-helpers';

type Node = DefaultTreeAdapterMap['node'];
const ns = htmlNamespaces.NS.HTML;
// Input is the CMS's sanitized HTML. A real HTML parser avoids matching text,
// escaped markup or existing picture elements as image tags.
export function responsiveRichTextImages(html: string, mediaMap: PublicMediaMap = {}, locale = 'en', sizes = '100vw'): string {
  const fragment = parseFragment(html);
  const byUrl = new Map(Object.values(mediaMap).map(asset => [mediaUrl(asset), asset]));
  const walk = (node: Node) => {
    if (!('childNodes' in node)) return;
    for (const child of [...node.childNodes]) {
      if ('tagName' in child && child.tagName === 'video') {
        const attr = (name: string) => child.attrs.find(a => a.name === name)?.value;
        const id = attr('data-asset-id') || attr('data-cms-asset-id');
        const asset = (id ? mediaMap[id] : undefined) || byUrl.get(attr('src') || '');
        // Authored source children and external videos remain under developer control.
        if (asset && !child.childNodes.some(n => 'tagName' in n && n.tagName === 'source')) {
          const video = mediaVideo(asset, mediaMap, locale);
          const set = (name: string, value: string) => { child.attrs = child.attrs.filter(a => a.name !== name); child.attrs.push({ name, value }); };
          if (video.mp4) set('src', video.mp4);
          set('data-cms-video', '');
          if (video.hls) set('data-cms-hls', video.hls);
          if (video.mp4 || video.original) set('data-cms-fallback', video.mp4 || video.original!);
          if (!attr('poster') && video.poster) set('poster', video.poster);
          if (!attr('preload')) set('preload', 'metadata');
          if (!attr('width') && video.width) set('width', String(video.width));
          if (!attr('height') && video.height) set('height', String(video.height));
        }
        continue;
      }
      if (!('tagName' in child) || child.tagName !== 'img') { walk(child); continue; }
      if ('tagName' in node && node.tagName === 'picture') continue;
      const attr = (name: string) => child.attrs.find(a => a.name === name)?.value;
      const id = attr('data-asset-id') || attr('data-cms-asset-id');
      const asset = (id ? mediaMap[id] : undefined) || byUrl.get(attr('src') || '');
      if (!asset || attr('srcset')) continue;
      const avif = mediaSourceSet(asset, 'image/avif'), webp = mediaSourceSet(asset, 'image/webp');
      if (!avif && !webp) continue;
      const picture = defaultTreeAdapter.createElement('picture', ns, []);
      for (const [type, srcset] of [['image/avif', avif], ['image/webp', webp]]) {
        if (srcset) defaultTreeAdapter.appendChild(picture, defaultTreeAdapter.createElement('source', ns, [{ name: 'type', value: type! }, { name: 'srcset', value: srcset }, { name: 'sizes', value: attr('sizes') || sizes }]));
      }
      const setMissing = (name: string, value: string) => { if (attr(name) === undefined && value) child.attrs.push({ name, value }); };
      setMissing('alt', mediaAlt(asset, '', undefined, locale));
      setMissing('src', mediaUrl(asset) || '');
      setMissing('width', typeof asset.width === 'number' ? String(asset.width) : '');
      setMissing('height', typeof asset.height === 'number' ? String(asset.height) : '');
      setMissing('loading', 'lazy');
      setMissing('decoding', 'async');
      defaultTreeAdapter.insertBefore(node, picture, child);
      defaultTreeAdapter.detachNode(child);
      defaultTreeAdapter.appendChild(picture, child);
    }
  };
  walk(fragment);
  return serialize(fragment);
}
