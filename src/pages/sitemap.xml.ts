import type { APIRoute } from 'astro';
import { createSitemapUrl, renderSitemapXml } from '../lib/seo/sitemap';
import { getPostSitemapUrls } from '../lib/posts/sitemap';
import { alternateLocales } from '../lib/i18n/routing';

export const GET: APIRoute = async () => {
  const siteUrl = (import.meta.env.PUBLIC_SITE_URL || 'http://localhost:4321').replace(/\/$/, '');
  const postUrls = await getPostSitemapUrls(siteUrl);
  const urls = [
    createSitemapUrl(siteUrl, '/', { changefreq: 'weekly', priority: 1, alternates: alternateLocales('/') }),
    createSitemapUrl(siteUrl, '/posts', { changefreq: 'weekly', priority: 0.8, alternates: alternateLocales('/posts') }),
    ...postUrls
  ];

  return new Response(renderSitemapXml(urls), {
    headers: { 'content-type': 'application/xml; charset=utf-8' }
  });
};
