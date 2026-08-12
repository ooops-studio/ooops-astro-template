import { readCmsAstroEnv } from '@ooopsstudio/cms-astro';

const runtimeEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env ?? process.env;
const cmsEnv = readCmsAstroEnv(runtimeEnv);

export const cmsApiBaseUrl = cmsEnv.apiBaseUrl;
export const cmsApiToken = cmsEnv.apiToken;
export const siteUrl = cmsEnv.siteUrl;
