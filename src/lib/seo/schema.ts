import { siteUrl } from '../cms/env';
import {
  articleJsonLd as createArticleJsonLd,
  websiteJsonLd as createWebsiteJsonLd,
  type JsonLdPayload
} from '@ooopsstudio/cms-astro';

export type { JsonLdPayload } from '@ooopsstudio/cms-astro';

export const websiteJsonLd = ({ name, url = siteUrl }: { name: string; url?: string }): JsonLdPayload =>
  createWebsiteJsonLd({ name, url });

export const articleJsonLd = ({
  title,
  description,
  url,
  image,
  datePublished,
  dateModified
}: {
  title: string;
  description?: string;
  url: string;
  image?: string | null;
  datePublished?: string | null;
  dateModified?: string | null;
}): JsonLdPayload =>
  createArticleJsonLd({
    headline: title,
    description,
    url,
    image,
    datePublished,
    dateModified
  });
