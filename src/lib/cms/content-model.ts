export type ContentModel = 'starter' | 'demo';

export const readContentModel = (value: unknown): ContentModel => {
  if (value === undefined || value === '') return 'starter';
  if (value === 'starter' || value === 'demo') return value;
  throw new Error('Unsupported OOOPS_CMS_CONTENT_MODEL. Expected starter or demo.');
};

export const contentModel = readContentModel(
  import.meta.env?.OOOPS_CMS_CONTENT_MODEL || process.env.OOOPS_CMS_CONTENT_MODEL
);

export const contentApiIds = (model: ContentModel) => model === 'demo'
  ? { home: 'home-page', posts: 'news' }
  : { home: 'homepage', posts: 'posts' };

// CMS slugs may already be URI-encoded. Astro params are decoded segments;
// links encode them once. Entry reads use the stable ID, not a localized slug.
export const postRouteSlug = (value: string) => {
  let slug = value;
  try { slug = decodeURIComponent(value); } catch { /* Preserve authored literal %. */ }
  if (!slug || (slug.includes('/') || /[\\?#]/.test(slug)) || slug === '.' || slug === '..') {
    throw new Error('Published post slug is not a single route segment.');
  }
  return slug;
};

export const postPath = (slug: string) => `/posts/${encodeURIComponent(slug)}`;
