import { getCmsSingle } from './client';
import { asRecord, asString, htmlToText, localizedField, type LocalizedValue } from './content-helpers';
import { entryFields } from './mappers';
import { contentApiIds, contentModel, type ContentModel } from './content-model';
import { seoFromFields } from './seo';
import type { HomepageContent } from './types';
import { alternateLocales } from '../i18n/routing';
import { websiteJsonLd } from '../seo/schema';

const safeCmsHref = (value: unknown, fallback: string) => {
  const href = asString(value);
  if (!href) return fallback;
  if (href.startsWith('/') && !href.startsWith('//')) return href;
  try {
    const url = new URL(href);
    return ['http:', 'https:'].includes(url.protocol) ? href : fallback;
  } catch {
    return fallback;
  }
};

export const mapHome = (content: unknown, model: ContentModel): HomepageContent => {
  const fields = entryFields(asRecord(content));
  const heroValue = asRecord(fields.hero);
  const hero = asRecord(heroValue.en || heroValue);
  const text = (value: unknown) => localizedField(value as LocalizedValue);
  const heading = model === 'demo'
    ? asString(hero.title) || text(fields['page-title'])
    : asString(fields.heading) || asString(fields.title) || 'Ooops CMS Astro Site';
  const description = model === 'demo'
    ? htmlToText(asString(hero.description) || text(fields['organization-summary']))
    : htmlToText(asString(fields.description)) || 'Public website powered by Ooops CMS.';
  if (model === 'demo' && !heading) throw new Error('Demo home-page has no published hero title.');

  return {
    eyebrow: model === 'demo' ? text(fields['page-title']) : asString(fields.title) || asString(fields.eyebrow) || 'Ooops CMS + Astro',
    heading,
    description,
    proofText: asString(fields['proof-text']) || '',
    ctaLabel: asString(fields['cta-label']) || 'Read posts',
    ctaHref: safeCmsHref(fields['cta-url'], '/posts'),
    seo: {
      ...seoFromFields({
        fields,
        path: '/',
        fallbackTitle: heading,
        fallbackDescription: description
      }),
      alternates: alternateLocales('/'),
      jsonLd: websiteJsonLd({ name: heading })
    }
  };
};

export const getHome = async (): Promise<HomepageContent> =>
  mapHome(await getCmsSingle(contentApiIds(contentModel).home), contentModel);
