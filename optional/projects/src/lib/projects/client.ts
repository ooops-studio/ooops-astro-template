import { getCmsCollectionEntries, getCmsCollectionEntry } from '../cms/client';
import { asArray, asRecord, asString, mediaAlt, mediaUrl, type PublicMediaMap } from '../cms/content-helpers';
import { seoFromFields } from '../cms/seo';
import type { SeoPayload } from '../cms/types';

export type ProjectSummary = {
  id: string;
  title: string;
  slug: string;
  summary: string;
  coverImage: unknown;
  coverImageUrl: string | null;
  coverImageAlt: string;
  year: string;
  tags: string[];
  featured: boolean;
  publishedAt: string | null;
  updatedAt: string | null;
};

export type ProjectDetail = ProjectSummary & {
  description: string;
  credits: string;
  media: unknown[];
  seo: SeoPayload;
};

const asDateString = (value: unknown): string | null => {
  if (typeof value !== 'string' || !value.trim()) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
};

const asTags = (value: unknown) => {
  if (Array.isArray(value)) return asArray(value).map(asString).filter(Boolean);
  return asString(value).split(',').map((tag) => tag.trim()).filter(Boolean);
};

const mapProjectSummary = (entry: Record<string, unknown>): ProjectSummary => {
  const fields = asRecord(entry.fields || entry);
  const mediaMap = asRecord(entry._media) as PublicMediaMap;
  const title = asString(fields.title) || 'Untitled project';
  const slug = asString(fields.slug) || asString(entry.slug) || asString(entry.id);
  const coverImage = fields.coverImage || fields['cover-image'];
  const yearValue = fields.year;

  return {
    id: asString(entry.id) || slug,
    title,
    slug,
    summary: asString(fields.summary),
    coverImage,
    coverImageUrl: mediaUrl(coverImage, mediaMap),
    coverImageAlt: mediaAlt(coverImage, title, mediaMap),
    year: typeof yearValue === 'number' ? String(yearValue) : asString(yearValue),
    tags: asTags(fields.tags),
    featured: fields.featured === true,
    publishedAt: asDateString(entry.publishedAt),
    updatedAt: asDateString(entry.updatedAt)
  };
};

const mapProjectDetail = (entry: Record<string, unknown>): ProjectDetail => {
  const fields = asRecord(entry.fields || entry);
  const summary = mapProjectSummary(entry);

  return {
    ...summary,
    description: asString(fields.description),
    credits: asString(fields.credits),
    media: asArray(fields.media),
    seo: seoFromFields({
      fields,
      path: `/projects/${summary.slug}`,
      fallbackTitle: summary.title,
      fallbackDescription: summary.summary
    })
  };
};

export const getProjects = async (): Promise<ProjectSummary[]> => {
  const entries = await getCmsCollectionEntries('projects');
  return (entries as Record<string, unknown>[] | undefined)?.map(mapProjectSummary).filter((project) => project.slug) ?? [];
};

export const getProject = async (slug: string): Promise<ProjectDetail | null> => {
  const entry = await getCmsCollectionEntry('projects', slug);
  return entry ? mapProjectDetail(entry) : null;
};

export const getProjectSitemapPaths = async () => {
  const projects = await getProjects();
  return projects.map((project) => ({
    path: `/projects/${project.slug}`,
    lastmod: project.updatedAt || project.publishedAt
  }));
};
