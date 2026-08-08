import { createStageClient } from '@ooopsstudio/stage-api';

export const stageBaseUrl = (
  process.env.OOOPS_STAGE_API_BASE_URL ??
  process.env.STAGE_API_BASE_URL ??
  'http://stage.localhost:4275/api/stage/v1'
).replace(/\/$/, '');

export const stageToken = process.env.OOOPS_STAGE_API_TOKEN ?? process.env.STAGE_API_TOKEN ?? '';

export const createExampleStageClient = () => {
  if (!stageToken) throw new Error('Set OOOPS_STAGE_API_TOKEN or STAGE_API_TOKEN before running this example.');
  return createStageClient({ baseUrl: stageBaseUrl, token: stageToken });
};
