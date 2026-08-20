import { readCmsAstroEnv } from '@ooopsstudio/cms-astro';

export const cmsRuntimeEnv = {
  OOOPS_CMS_API_BASE_URL:
    import.meta.env?.OOOPS_CMS_API_BASE_URL || process.env.OOOPS_CMS_API_BASE_URL,
  OOOPS_CMS_API_TOKEN: import.meta.env?.OOOPS_CMS_API_TOKEN || process.env.OOOPS_CMS_API_TOKEN,
  PUBLIC_SITE_URL: import.meta.env?.PUBLIC_SITE_URL || process.env.PUBLIC_SITE_URL
};

const cmsEnv = readCmsAstroEnv(cmsRuntimeEnv);

export const cmsApiBaseUrl = cmsEnv.apiBaseUrl;
export const cmsApiToken = cmsEnv.apiToken;
export const siteUrl = cmsEnv.siteUrl;
