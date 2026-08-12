import { createCmsClient } from '@ooopsstudio/cms-api';

export const cmsBaseUrl = (
  process.env.OOOPS_CMS_API_BASE_URL ??
  'http://cms.localhost:4175/api/cms/v1'
).replace(/\/$/, '');

export const cmsToken = process.env.OOOPS_CMS_API_TOKEN ?? '';

export const createExampleCmsClient = () => {
  if (!cmsToken) throw new Error('Set OOOPS_CMS_API_TOKEN before running this example.');
  return createCmsClient({ baseUrl: cmsBaseUrl, token: cmsToken });
};
