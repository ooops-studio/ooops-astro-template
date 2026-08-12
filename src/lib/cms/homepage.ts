import { getCmsSingle } from './client';
import { asRecord, asString } from './content-helpers';
import { seoFromFields } from './seo';
import type { HomepageContent } from './types';
import { alternateLocales } from '../i18n/routing';
import { websiteJsonLd } from '../seo/schema';

export const getHome = async (): Promise<HomepageContent> => {
  const content = await getCmsSingle('homepage');
  const fields = asRecord(content?.fields || content);
  const heading = asString(fields.heading) || asString(fields.title) || 'Ooops CMS Astro Site';
  const description = asString(fields.description) || 'Public website powered by Ooops CMS.';

  return {
    heading,
    description,
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
