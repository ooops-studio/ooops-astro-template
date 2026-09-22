import { entryFields, entryMedia } from '../cms/mappers';
import { getCmsCollectionEntries, getCmsCollectionEntry } from '../cms/client';
import { asRecord, asString, type PublicMediaMap } from '../cms/content-helpers';
import { seoFromFields } from '../cms/seo';
import type { SeoPayload } from '../cms/types';

export type PostSummary = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  heroImage: unknown;
  heroImageUrl: string | null;
  heroImageAlt: string;
  publishedAt: string | null;
  updatedAt: string | null;
};

export type PostDetail = PostSummary & {
  body: string;
  mediaMap: PublicMediaMap;
  seo: SeoPayload;
};

const asDateString = (value: unknown): string | null => {
  if (typeof value !== 'string' || !value.trim()) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
};

const mapPostSummary = (entry: Record<string, unknown>): PostSummary => {
  const fields = entryFields(entry);
  const title = asString(fields.title) || 'Untitled post';
  const slug = asString(fields.slug) || asString(entry.slug) || asString(entry.id);
  const heroImage = entryMedia(entry, Object.hasOwn(fields, 'heroImage') ? 'heroImage' : 'hero-image', title);

  return {
    id: asString(entry.id) || slug,
    title,
    slug,
    excerpt: asString(fields.excerpt),
    heroImage: heroImage.value,
    heroImageUrl: heroImage.url,
    heroImageAlt: heroImage.alt,
    publishedAt: asDateString(entry.publishedAt) || asDateString(fields.publishedAt),
    updatedAt: asDateString(entry.updatedAt) || asDateString(fields.updatedAt)
  };
};

const mapPostDetail = (entry: Record<string, unknown>): PostDetail => {
  const fields = entryFields(entry);
  const summary = mapPostSummary(entry);

  return {
    ...summary,
    body: asString(fields.body),
    mediaMap: asRecord(entry._media) as PublicMediaMap,
    seo: seoFromFields({
      fields,
      path: `/posts/${summary.slug}`,
      fallbackTitle: summary.title,
      fallbackDescription: summary.excerpt
    })
  };
};

export const getPosts = async (): Promise<PostSummary[]> => {
  const entries = await getCmsCollectionEntries('posts');
  return (entries as Record<string, unknown>[] | undefined)?.map(mapPostSummary).filter((post) => post.slug) ?? [];
};

export const getPost = async (slug: string): Promise<PostDetail | null> => {
  const entry = await getCmsCollectionEntry('posts', slug);
  return entry ? mapPostDetail(entry) : null;
};

export const getPostSitemapPaths = async () => {
  const posts = await getPosts();
  return posts.map((post) => ({
    path: `/posts/${post.slug}`,
    lastmod: post.updatedAt || post.publishedAt
  }));
};
