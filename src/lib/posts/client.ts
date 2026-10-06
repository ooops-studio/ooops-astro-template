import { entryFields, entryMedia } from '../cms/mappers';
import { getCmsCollectionEntries, getCmsCollectionEntry } from '../cms/client';
import { asRecord, asString, localizedField, type LocalizedValue, type PublicMediaMap } from '../cms/content-helpers';
import { contentApiIds, contentModel, postPath, postRouteSlug, type ContentModel } from '../cms/content-model';
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

export const mapPostSummary = (entry: Record<string, unknown>, model: ContentModel = contentModel): PostSummary => {
  const fields = entryFields(entry);
  const title = localizedField(fields.title as LocalizedValue) || 'Untitled post';
  const slug = postRouteSlug(localizedField(fields.slug as LocalizedValue) || asString(entry.slug) || asString(entry.id));
  const heroImage = entryMedia(entry, model === 'demo' ? 'cover.image' : Object.hasOwn(fields, 'heroImage') ? 'heroImage' : 'hero-image', title);

  return {
    id: asString(entry.id) || slug,
    title,
    slug,
    excerpt: localizedField(fields[model === 'demo' ? 'description' : 'excerpt'] as LocalizedValue),
    heroImage: heroImage.value,
    heroImageUrl: heroImage.url,
    heroImageAlt: heroImage.alt,
    publishedAt: asDateString(entry.publishedAt) || asDateString(fields.publishedAt),
    updatedAt: asDateString(entry.updatedAt) || asDateString(fields.updatedAt)
  };
};

export const mapPostDetail = (entry: Record<string, unknown>, model: ContentModel = contentModel): PostDetail => {
  const fields = entryFields(entry);
  const summary = mapPostSummary(entry, model);

  return {
    ...summary,
    body: localizedField(fields.body as LocalizedValue),
    mediaMap: asRecord(entry._media) as PublicMediaMap,
    seo: seoFromFields({
      fields,
      path: postPath(summary.slug),
      fallbackTitle: summary.title,
      fallbackDescription: summary.excerpt
    })
  };
};

export const getPosts = async (): Promise<PostSummary[]> => {
  const entries = await getCmsCollectionEntries(contentApiIds(contentModel).posts);
  return (entries as Record<string, unknown>[] | undefined)?.map((entry) => mapPostSummary(entry)).filter((post) => post.slug) ?? [];
};

export const getPost = async (slug: string): Promise<PostDetail | null> => {
  let lookup = slug;
  if (contentModel === 'demo' && !/^[0-9a-f-]{36}$/i.test(slug)) {
    const routeSlug = postRouteSlug(slug);
    const summary = (await getPosts()).find((post) => post.slug === routeSlug);
    if (!summary) return null;
    lookup = summary.id;
  }
  const entry = await getCmsCollectionEntry(contentApiIds(contentModel).posts, lookup);
  return entry ? mapPostDetail(entry) : null;
};

export const getPostSitemapPaths = async () => {
  const posts = await getPosts();
  return posts.map((post) => ({
    path: postPath(post.slug),
    lastmod: post.updatedAt || post.publishedAt
  }));
};
