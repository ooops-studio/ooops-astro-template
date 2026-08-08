import {
  type OoopsStageClient,
  type StageCollectionEntryResponse,
  type StageCollectionResponse,
  type StageQuery,
  type StageRecord,
  type StageSingleResponse
} from '@ooopsstudio/stage-api';
import { createStageClientFromAstroEnv } from '@ooopsstudio/stage-astro';
import { stageApiBaseUrl, stageApiToken } from './env';

export type {
  OoopsStageClient,
  StageCollectionEntryResponse,
  StageCollectionResponse,
  StageQuery,
  StageRecord,
  StageSingleResponse
} from '@ooopsstudio/stage-api';

export const hasStageConfig = Boolean(stageApiBaseUrl && stageApiToken);

export const createStageClient = (): OoopsStageClient | null => {
  return createStageClientFromAstroEnv((import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env ?? process.env);
};

export const getStageSingle = async (apiId: string) => {
  const stage = createStageClient();
  if (!stage) return null;
  const response = await stage.content.getSingle<StageSingleResponse<StageRecord>>(apiId);
  return response.content;
};

export const getStageCollectionEntries = async (apiId: string, query?: StageQuery) => {
  const stage = createStageClient();
  if (!stage) return [];
  const response = await stage.content.listCollectionEntries<StageCollectionResponse<StageRecord>>(apiId, query);
  return response.items;
};

export const getStageCollectionEntry = async (apiId: string, idOrSlug: string) => {
  const stage = createStageClient();
  if (!stage) return null;
  const response = await stage.content.getCollectionEntry<StageCollectionEntryResponse<StageRecord>>(apiId, idOrSlug);
  return response.item;
};
