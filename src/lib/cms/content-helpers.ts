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
  if (Array.isArray(value)) return resolveMediaRecord(value[0], mediaMap);
  if (typeof value === 'string' && value.trim()) return asRecord(mediaMap?.[value.trim()]);
  const record = asRecord(value);
  const metadata = asRecord(record.metadata);
  const assetId = asString(record.assetId) || asString(record.value) || asString(record.id);
  const asset = assetId && mediaMap?.[assetId] ? asRecord(mediaMap[assetId]) : null;
  return asset ? {
    ...record, ...asset,
    metadata: { ...asRecord(asset.metadata), ...metadata },
    alt: record.alt ?? metadata.alt ?? asset.alt,
    altText: record.altText ?? asset.altText
  } : record;
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

export const mediaAlt = (value: unknown, fallback = '', mediaMap?: PublicMediaMap, locale = 'en'): string => {
  const record = resolveMediaRecord(value, mediaMap);
  if (mediaIsDecorative(record)) return '';
  const alt = record.alt ?? asRecord(record.metadata).alt;
  if (alt === '') return '';
  return asString(alt) || localizedField(alt as LocalizedValue, locale) || localizedField(record.altText as LocalizedValue, locale) || asString(record[locale === 'el' ? 'altEl' : 'altEn']) || fallback;
};

export const mediaIsDecorative = (value: unknown, mediaMap?: PublicMediaMap): boolean => {
  const record = resolveMediaRecord(value, mediaMap);
  return (asRecord(record.metadata).decorative ?? record.decorative) === true;
};

export type MediaSource = { url: string; mimeType: 'image/avif' | 'image/webp'; width: number; height: number; sizeBytes: number };

// Only URLs and dimensions supplied by the CMS are responsive candidates.
export const mediaSources = (value: unknown, mediaMap?: PublicMediaMap): MediaSource[] => {
  const record = resolveMediaRecord(value, mediaMap);
  return asArray(record.sources).flatMap(source => {
    const row = asRecord(source);
    const url = normalizeAssetUrl(asString(row.url));
    if (!url || !['image/avif', 'image/webp'].includes(asString(row.mimeType)) ||
      !Number.isSafeInteger(row.width) || Number(row.width) < 1 ||
      !Number.isSafeInteger(row.height) || Number(row.height) < 1 ||
      !Number.isSafeInteger(row.sizeBytes) || Number(row.sizeBytes) < 1) return [];
    return [{ url, mimeType: row.mimeType as MediaSource['mimeType'], width: Number(row.width), height: Number(row.height), sizeBytes: Number(row.sizeBytes) }];
  }).sort((a, b) => a.width - b.width);
};

export const mediaSourceSet = (value: unknown, mimeType: MediaSource['mimeType'], mediaMap?: PublicMediaMap): string | undefined => {
  const record = resolveMediaRecord(value, mediaMap);
  const sources = mediaSources(record).filter(source => source.mimeType === mimeType);
  // A format with only small survivors must not replace a larger original on
  // desktop. Other complete formats (or the original) remain available.
  const width = Number(record.width), height = Number(record.height);
  const expectedWidth = width > 0 && height > 0 ? Math.round(width * Math.min(1, 2560 / width, 2560 / height)) : 0;
  if (expectedWidth && Math.max(0, ...sources.map(source => source.width)) < expectedWidth) return undefined;
  const widths = new Map(sources.map(source => [source.width, source]));
  return Array.from(widths.values()).map(source => `${source.url} ${source.width}w`).join(', ') || undefined;
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

export function mediaVideo(value: unknown, mediaMap?: PublicMediaMap, locale = 'en') {
  const localized = asRecord(value);
  const record = resolveMediaRecord(localized[locale] ?? localized.en ?? value, mediaMap);
  const image = mediaMimeType(record)?.startsWith('image/') ? mediaUrl(record) : null;
  const video = asRecord(record.video);
  const source = (key: string) => normalizeAssetUrl(asString(asRecord(video[key]).url));
  return { record, image, original: mediaUrl(record), mp4: image ? null : source('mp4'), hls: image ? null : source('hls'), poster: source('poster'), width: Number(video.width || record.width) || undefined, height: Number(video.height || record.height) || undefined };
}
