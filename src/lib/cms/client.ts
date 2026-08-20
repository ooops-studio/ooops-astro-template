import {
  type CmsCollectionEntryResponse,
  type CmsCollectionResponse,
  type CmsQuery,
  type CmsRecord,
  type CmsSingleResponse,
  type OoopsCmsClient
} from '@ooopsstudio/cms-api';
import { createCmsClientFromAstroEnv } from '@ooopsstudio/cms-astro';
import { cmsApiBaseUrl, cmsApiToken, cmsRuntimeEnv } from './env';

export type {
  CmsCollectionEntryResponse,
  CmsCollectionResponse,
  CmsQuery,
  CmsRecord,
  CmsSingleResponse,
  OoopsCmsClient
} from '@ooopsstudio/cms-api';

type CmsSingleRuntimeResponse =
  | CmsSingleResponse<CmsRecord>
  | { ok: true; apiId?: string; data: CmsRecord };

export const hasCmsConfig = Boolean(cmsApiBaseUrl && cmsApiToken);

export const createCmsClient = (): OoopsCmsClient | null => {
  return createCmsClientFromAstroEnv(cmsRuntimeEnv);
};

export const getCmsSingle = async (apiId: string) => {
  const cms = createCmsClient();
  if (!cms) return null;
  const response = await cms.content.getSingle<CmsSingleRuntimeResponse>(apiId);
  return 'content' in response ? response.content : response.data;
};

export const getCmsCollectionEntries = async (apiId: string, query?: CmsQuery) => {
  const cms = createCmsClient();
  if (!cms) return [];
  const response = await cms.content.listCollectionEntries<CmsCollectionResponse<CmsRecord>>(apiId, query);
  return response.items;
};

export const getCmsCollectionEntry = async (apiId: string, idOrSlug: string) => {
  const cms = createCmsClient();
  if (!cms) return null;
  const response = await cms.content.getCollectionEntry<CmsCollectionEntryResponse<CmsRecord>>(apiId, idOrSlug);
  return response.item;
};
