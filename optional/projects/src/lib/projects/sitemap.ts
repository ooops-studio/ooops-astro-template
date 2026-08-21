import { createSitemapUrl } from '../seo/sitemap';
import { getProjectSitemapPaths } from './client';

export const getProjectSitemapUrls = async (siteUrl: string) => {
  const paths = await getProjectSitemapPaths();
  return paths.map((item) =>
    createSitemapUrl(siteUrl, item.path, {
      lastmod: item.lastmod,
      changefreq: 'monthly',
      priority: 0.8
    })
  );
};
