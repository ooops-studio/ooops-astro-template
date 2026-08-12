import { cmsApiBaseUrl } from './env';

export type LocalizedValue = string | null | undefined | Record<string, string | null | undefined>;
export type PublicMediaMap = Record<string, Record<string, unknown>>;

export const firstText = (...values: Array<string | null | undefined>) => {
  for (const value of values) {
    const normalized = value?.trim();
    if (normalized) return normalized;
  }
  return '';
};

export const localizedField = (value: LocalizedValue, locale = 'en', fallback?: LocalizedValue) => {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    return locale === 'en'
      ? firstText(value.en, typeof fallback === 'string' ? fallback : fallback?.en, value.el, fallback && typeof fallback === 'object' ? fallback.el : undefined)
      : firstText(value[locale], value.en, typeof fallback === 'string' ? fallback : fallback?.[locale], fallback && typeof fallback === 'object' ? fallback.en : undefined);
  }
  if (typeof fallback === 'string') return fallback;
  if (fallback && typeof fallback === 'object') return firstText(fallback[locale], fallback.en);
  return '';
};

export const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

export const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

export const asString = (value: unknown): string =>
  typeof value === 'string' && value.trim() ? value.trim() : '';

const cmsOrigin = cmsApiBaseUrl.replace(/\/api\/cms\/v1\/?$/, '');

export const normalizeAssetUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  if (!cmsOrigin) return url;

  try {
    const parsed = new URL(url);
    if (parsed.hostname === 'localhost' && parsed.pathname.startsWith('/assets/')) {
      return `${cmsOrigin}${parsed.pathname}${parsed.search}`;
    }
  } catch {
    return url;
  }

  return url;
};

export const resolveMediaRecord = (value: unknown, mediaMap?: PublicMediaMap): Record<string, unknown> => {
  if (typeof value === 'string' && value.trim()) return asRecord(mediaMap?.[value.trim()]);
  const record = asRecord(value);
  const assetId = asString(record.assetId) || asString(record.value) || asString(record.id);
  return assetId && mediaMap?.[assetId] ? asRecord(mediaMap[assetId]) : record;
};

export const mediaUrl = (value: unknown, mediaMap?: PublicMediaMap): string | null => {
  const record = resolveMediaRecord(value, mediaMap);
  return normalizeAssetUrl(
    asString(record.url) || asString(record.src) || asString(record.publicUrl) || asString(record.thumbnailUrl)
  );
};

export const mediaMimeType = (value: unknown, mediaMap?: PublicMediaMap): string | null => {
  const record = resolveMediaRecord(value, mediaMap);
  return asString(record.mimeType) || asString(record.contentType) || null;
};

export const mediaAlt = (value: unknown, fallback = '', mediaMap?: PublicMediaMap): string => {
  const record = resolveMediaRecord(value, mediaMap);
  return asString(record.alt) || asString(record.altText) || fallback;
};

export const cmsImageWidths = [320, 640, 960, 1280, 1600];

export const withImageWidth = (url: string, width: number): string => {
  try {
    const parsed = new URL(url);
    parsed.searchParams.set('w', String(width));
    return parsed.toString();
  } catch {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}w=${width}`;
  }
};

export const imageSrcSet = (src: string | null, widths = cmsImageWidths): string | null => {
  if (!src) return null;
  return widths.map((width) => `${withImageWidth(src, width)} ${width}w`).join(', ');
};

export const htmlToText = (value: string) =>
  value
    .replace(/<\/p>\s*<p>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?p[^>]*>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
