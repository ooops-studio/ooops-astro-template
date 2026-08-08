import { createSitemapUrl } from '../seo/sitemap';
import { getPostSitemapPaths } from './client';

export const getPostSitemapUrls = async (siteUrl: string) => {
  const paths = await getPostSitemapPaths();
  return paths.map((item) =>
    createSitemapUrl(siteUrl, item.path, {
      lastmod: item.lastmod,
      changefreq: 'monthly',
      priority: 0.7
    })
  );
};
