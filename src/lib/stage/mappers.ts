import { asRecord, asString, localizedField, mediaAlt, mediaUrl, type LocalizedValue, type PublicMediaMap } from './content-helpers';

export type StageEntry = Record<string, unknown>;

export const entryFields = (entry: StageEntry) => asRecord(entry.fields || entry);

export const entryMediaMap = (entry: StageEntry) => asRecord(entry._media) as PublicMediaMap;

export const entryId = (entry: StageEntry) => asString(entry.id);

export const entrySlug = (entry: StageEntry) => {
  const fields = entryFields(entry);
  return asString(fields.slug) || asString(entry.slug) || entryId(entry);
};

export const entryTitle = (entry: StageEntry, fallback = 'Untitled') => {
  const fields = entryFields(entry);
  return asString(fields.title) || asString(fields.heading) || fallback;
};

export const localizedEntryField = (
  fields: Record<string, unknown>,
  key: string,
  locale = 'en',
  fallbackKey?: string
) => localizedField(fields[key] as LocalizedValue, locale, fallbackKey ? (fields[fallbackKey] as LocalizedValue) : undefined);

export const entryMedia = (entry: StageEntry, key: string, fallbackAlt = '') => {
  const fields = entryFields(entry);
  const mediaMap = entryMediaMap(entry);
  const value = fields[key];
  return {
    value,
    url: mediaUrl(value, mediaMap),
    alt: mediaAlt(value, fallbackAlt, mediaMap)
  };
};
