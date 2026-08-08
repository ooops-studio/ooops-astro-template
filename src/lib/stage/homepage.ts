import { getStageSingle } from './client';
import { asRecord, asString } from './content-helpers';
import { seoFromFields } from './seo';
import type { HomepageContent } from './types';
import { alternateLocales } from '../i18n/routing';
import { websiteJsonLd } from '../seo/schema';

export const getHome = async (): Promise<HomepageContent> => {
  const content = await getStageSingle('homepage');
  const fields = asRecord(content?.fields || content);
  const heading = asString(fields.heading) || asString(fields.title) || 'Stage Astro Site';
  const description = asString(fields.description) || 'Public website powered by Stage CMS.';

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
