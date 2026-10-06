import { asRecord, asString, localizedField, type LocalizedValue, type PublicMediaMap } from '../cms/content-helpers';
import { contentModel } from '../cms/content-model';
import { seoFromFields } from '../cms/seo';
import type { SeoPayload } from '../cms/types';

export type PreviewContent = {
  body: string;
  mediaMap: PublicMediaMap;
  description: string;
  fields: Array<{ key: string; value: string }>;
  seo: SeoPayload;
  title: string;
};

const displayValue = (value: unknown) => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value === null || value === undefined) return '';
  return JSON.stringify(value, null, 2);
};

export const previewContent = (data: Record<string, unknown>, path: string, fallbackTitle: string): PreviewContent => {
  const fields = asRecord(data.input || data.fields || data);
  const text = (value: unknown) => localizedField(value as LocalizedValue);
  const heroValue = asRecord(fields.hero);
  const hero = contentModel === 'demo' ? asRecord(heroValue.en || heroValue) : {};
  const title = text(fields.title) || text(data.title) || asString(hero.title) || asString(fields.heading) || fallbackTitle;
  const description = text(fields.description) || text(data.description) || text(fields.excerpt) || asString(hero.description);
  const body = text(fields.body) || text(data.body);
  const ignored = new Set(['input', 'fields', '_media', 'title', 'description', 'excerpt', 'body']);
  return {
    title,
    description,
    body,
    mediaMap: asRecord(data._media) as PublicMediaMap,
    fields: Object.entries({ ...fields, ...data })
      .filter(([key, value]) => !ignored.has(key) && value !== undefined && value !== null)
      .map(([key, value]) => ({ key, value: displayValue(value) })),
    seo: {
      ...seoFromFields({
        fields,
        path,
        fallbackTitle: `${title} · Preview`,
        fallbackDescription: description || 'Private CMS preview.'
      }),
      canonical: '',
      robots: { index: false, follow: false }
    }
  };
};
