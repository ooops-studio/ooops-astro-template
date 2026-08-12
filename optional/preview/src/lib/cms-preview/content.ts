import { asRecord, asString } from '../cms/content-helpers';
import { seoFromFields } from '../cms/seo';
import type { SeoPayload } from '../cms/types';

export type PreviewContent = { body: string; description: string; fields: Array<{ key: string; value: string }>; seo: SeoPayload; title: string };
const displayValue = (value: unknown) => typeof value === 'string' ? value : typeof value === 'number' || typeof value === 'boolean' ? String(value) : value === null || value === undefined ? '' : JSON.stringify(value, null, 2);

export const previewContent = (data: Record<string, unknown>, path: string, fallbackTitle: string): PreviewContent => {
  const fields = asRecord(data.input || data.fields || data);
  const title = asString(data.title) || asString(fields.title) || asString(fields.heading) || fallbackTitle;
  const description = asString(data.description) || asString(fields.description) || asString(fields.excerpt);
  const body = asString(data.body) || asString(fields.body);
  const ignored = new Set(['input', 'fields', '_media', 'title', 'description', 'excerpt', 'body']);
  return { title, description, body, fields: Object.entries({ ...fields, ...data }).filter(([key, value]) => !ignored.has(key) && value !== undefined && value !== null).map(([key, value]) => ({ key, value: displayValue(value) })), seo: { ...seoFromFields({ fields, path, fallbackTitle: `${title} · Preview`, fallbackDescription: description || 'Private CMS preview.' }), canonical: '', robots: { index: false, follow: false } } };
};
