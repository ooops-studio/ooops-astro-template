export type SeoPayload = {
  title: string;
  description: string;
  canonical: string;
  ogImage?: string | null;
  googleSiteVerification?: string | null;
  robots?: {
    index: boolean;
    follow: boolean;
  };
  siteName?: string | null;
  twitterHandle?: string | null;
  type?: 'website' | 'article' | string;
  alternates?: Array<{ locale: string; href: string }>;
  jsonLd?: Record<string, unknown> | Array<Record<string, unknown>>;
};

export type HomepageContent = {
  heading: string;
  description: string;
  seo: SeoPayload;
};
