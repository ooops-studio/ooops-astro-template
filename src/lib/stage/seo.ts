import { siteUrl } from './env';
import { asRecord, asString, mediaUrl } from './content-helpers';
import type { SeoPayload } from './types';

export const seoFromFields = ({
  fields,
  path,
  fallbackTitle,
  fallbackDescription
}: {
  fields: Record<string, unknown>;
  path: string;
  fallbackTitle: string;
  fallbackDescription: string;
}): SeoPayload => {
  const canonicalPath = asString(fields.canonicalPathOverride) || asString(fields['canonical-path-override']) || path;
  const ogImage = mediaUrl(fields.ogImage) || mediaUrl(fields['og-image']) || mediaUrl(fields.ogImageAssetId) || asString(fields.ogImage);
  const site = asRecord(fields.seoSite || fields.site);

  return {
    title: asString(fields.seoTitle) || asString(fields['seo-title']) || fallbackTitle,
    description: asString(fields.seoDescription) || asString(fields['seo-description']) || fallbackDescription,
    canonical: `${siteUrl}${canonicalPath.startsWith('/') ? canonicalPath : `/${canonicalPath}`}`,
    ogImage,
    googleSiteVerification: asString(fields.googleSiteVerification) || asString(fields['google-site-verification']) || asString(site.googleSiteVerification) || null,
    robots: {
      index: fields.robotsIndex !== false && fields['robots-index'] !== false,
      follow: fields.robotsFollow !== false && fields['robots-follow'] !== false
    },
    siteName: asString(fields.siteName) || asString(site.siteName) || null,
    twitterHandle: asString(fields.twitterHandle) || asString(fields['twitter-handle']) || asString(site.twitterHandle) || null,
    type: asString(fields.ogType) || 'website'
  };
};
