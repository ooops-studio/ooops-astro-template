import { getStageCollectionEntries, getStageCollectionEntry } from '../stage/client';
import { asRecord, asString, mediaAlt, mediaUrl, type PublicMediaMap } from '../stage/content-helpers';
import { seoFromFields } from '../stage/seo';
import type { SeoPayload } from '../stage/types';

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
  seo: SeoPayload;
};

const asDateString = (value: unknown): string | null => {
  if (typeof value !== 'string' || !value.trim()) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
};

const mapPostSummary = (entry: Record<string, unknown>): PostSummary => {
  const fields = asRecord(entry.fields || entry);
  const mediaMap = asRecord(entry._media) as PublicMediaMap;
  const title = asString(fields.title) || 'Untitled post';
  const slug = asString(fields.slug) || asString(entry.slug) || asString(entry.id);
  const heroImage = fields.heroImage || fields['hero-image'];

  return {
    id: asString(entry.id) || slug,
    title,
    slug,
    excerpt: asString(fields.excerpt),
    heroImage,
    heroImageUrl: mediaUrl(heroImage, mediaMap),
    heroImageAlt: mediaAlt(heroImage, title, mediaMap),
    publishedAt: asDateString(fields.publishedAt),
    updatedAt: asDateString(entry.updatedAt) || asDateString(fields.updatedAt)
  };
};

const mapPostDetail = (entry: Record<string, unknown>): PostDetail => {
  const fields = asRecord(entry.fields || entry);
  const summary = mapPostSummary(entry);

  return {
    ...summary,
    body: asString(fields.body),
    seo: seoFromFields({
      fields,
      path: `/posts/${summary.slug}`,
      fallbackTitle: summary.title,
      fallbackDescription: summary.excerpt
    })
  };
};

export const getPosts = async (): Promise<PostSummary[]> => {
  const entries = await getStageCollectionEntries('posts');
  return (entries as Record<string, unknown>[] | undefined)?.map(mapPostSummary).filter((post) => post.slug) ?? [];
};

export const getPost = async (slug: string): Promise<PostDetail | null> => {
  const entry = await getStageCollectionEntry('posts', slug);
  return entry ? mapPostDetail(entry) : null;
};

export const getPostSitemapPaths = async () => {
  const posts = await getPosts();
  return posts.map((post) => ({
    path: `/posts/${post.slug}`,
    lastmod: post.updatedAt || post.publishedAt
  }));
};
