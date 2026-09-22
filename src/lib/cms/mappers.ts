import { resolveWorkspaceContentMedia } from '@ooopsstudio/workspace-api';
import { asRecord, asString, resolveMediaRecord, localizedField, mediaAlt, mediaUrl, type LocalizedValue, type PublicMediaMap } from './content-helpers';

export type CmsEntry = Record<string, unknown>;

export const entryFields = (entry: CmsEntry) => {
  const snapshot = asRecord(entry.snapshot || entry.data || entry);
  return asRecord(snapshot.fields || snapshot.input || snapshot);
};

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

export const entryMedia = (entry: CmsEntry, key: string, fallbackAlt = '', locale = 'en') => {
  const fields = entryFields(entry);
  const mediaMap = entryMediaMap(entry);
  const localized = resolveWorkspaceContentMedia({ ...entry, data: fields }, key, locale);
  const value = localized === undefined ? fields[key] : localized;
  const first = Array.isArray(localized) ? localized[0] : localized;
  return {
    value: resolveMediaRecord(value, mediaMap),
    url: mediaUrl(value, mediaMap),
    alt: typeof first?.alt === 'string' ? first.alt : mediaAlt(value, fallbackAlt, mediaMap, locale)
  };
};
