import { getCmsSingle } from './client';
import { asRecord, asString } from './content-helpers';
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

export const getHome = async (): Promise<HomepageContent> => {
  const content = await getCmsSingle('homepage');
  const fields = asRecord(content?.fields || content);
  const heading = asString(fields.heading) || asString(fields.title) || 'Ooops CMS Astro Site';
  const description = asString(fields.description) || 'Public website powered by Ooops CMS.';

  return {
    eyebrow: asString(fields.title) || asString(fields.eyebrow) || 'Ooops CMS + Astro',
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
