import { asRecord, asString, localizedField, mediaAlt, mediaUrl, type LocalizedValue, type PublicMediaMap } from './content-helpers';

export type CmsEntry = Record<string, unknown>;

export const entryFields = (entry: CmsEntry) => asRecord(entry.fields || entry);

export const entryMediaMap = (entry: CmsEntry) => asRecord(entry._media) as PublicMediaMap;

export const entryId = (entry: CmsEntry) => asString(entry.id);

export const entrySlug = (entry: CmsEntry) => {
  const fields = entryFields(entry);
  return asString(fields.slug) || asString(entry.slug) || entryId(entry);
};

export const entryTitle = (entry: CmsEntry, fallback = 'Untitled') => {
  const fields = entryFields(entry);
  return asString(fields.title) || asString(fields.heading) || fallback;
};

export const localizedEntryField = (
  fields: Record<string, unknown>,
  key: string,
  locale = 'en',
  fallbackKey?: string
) => localizedField(fields[key] as LocalizedValue, locale, fallbackKey ? (fields[fallbackKey] as LocalizedValue) : undefined);

export const entryMedia = (entry: CmsEntry, key: string, fallbackAlt = '') => {
  const fields = entryFields(entry);
  const mediaMap = entryMediaMap(entry);
  const value = fields[key];
  return {
    value,
    url: mediaUrl(value, mediaMap),
    alt: mediaAlt(value, fallbackAlt, mediaMap)
  };
};
