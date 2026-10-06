import {
  type CmsCollectionEntryResponse,
  type CmsCollectionResponse,
  type CmsQuery,
  type CmsRecord,
  type CmsSingleResponse,
  type CmsLegacySingleResponse,
  type OoopsCmsClient
} from '@ooopsstudio/workspace-api';
import { createCmsClientFromAstroEnv } from '@ooopsstudio/workspace-astro';
import { cmsApiBaseUrl, cmsApiToken, cmsRuntimeEnv } from './env';
import { contentModel } from './content-model';

export type {
  CmsCollectionEntryResponse,
  CmsCollectionResponse,
  CmsQuery,
  CmsRecord,
  CmsSingleResponse,
  OoopsCmsClient
} from '@ooopsstudio/workspace-api';

type CmsSingleRuntimeResponse =
  | CmsSingleResponse<CmsRecord>
  | CmsLegacySingleResponse<CmsRecord>;

export const hasCmsConfig = Boolean(cmsApiBaseUrl && cmsApiToken);

export const createCmsClient = async (): Promise<OoopsCmsClient | null> => {
  const runtime = contentModel === 'demo'
    ? (await import('cloudflare:workers')).env as unknown as Record<string, string | undefined>
    : {};
  return createCmsClientFromAstroEnv({ ...cmsRuntimeEnv, ...runtime }, {
    strict: contentModel === 'demo',
    // Cloudflare fetch is brand-checked; the SDK must not change its receiver.
    fetch: (input, init) => globalThis.fetch(input, init)
  });
};

export const getCmsSingle = async (apiId: string) => {
  const cms = await createCmsClient();
  if (!cms) return null;
  const response = await cms.content.getSingle<CmsSingleRuntimeResponse>(apiId);
  return 'content' in response ? response.content : response.data;
};

export const getCmsCollectionEntries = async (apiId: string, query?: CmsQuery) => {
  const cms = await createCmsClient();
  if (!cms) return [];
  const response = await cms.content.listCollectionEntries<CmsCollectionResponse<CmsRecord>>(apiId, query);
  return response.items;
};

export const getCmsCollectionEntry = async (apiId: string, idOrSlug: string) => {
  const cms = await createCmsClient();
  if (!cms) return null;
  const response = await cms.content.getCollectionEntry<CmsCollectionEntryResponse<CmsRecord>>(apiId, idOrSlug);
  return response.item;
};
