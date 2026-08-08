import { createStagePreviewClient } from '@ooopsstudio/stage-api';
import { stageApiBaseUrl, stagePreviewToken } from './env';

const createPreviewClient = () => {
  if (!stageApiBaseUrl || !stagePreviewToken) return null;
  return createStagePreviewClient({ baseUrl: stageApiBaseUrl, previewToken: stagePreviewToken });
};

export const getPreviewSingle = async (apiId: string) => {
  const stage = createPreviewClient();
  if (!stage) return null;
  return stage.content.getSingle(apiId);
};

export const getPreviewCollectionEntry = async (apiId: string, idOrSlug: string) => {
  const stage = createPreviewClient();
  if (!stage) return null;
  return stage.content.getCollectionEntry(apiId, idOrSlug);
};
