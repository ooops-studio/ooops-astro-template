import { readStageAstroEnv } from '@ooopsstudio/stage-astro';

const runtimeEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env ?? process.env;
const stageEnv = readStageAstroEnv(runtimeEnv);

export const stageApiBaseUrl = stageEnv.apiBaseUrl;
export const stageApiToken = stageEnv.apiToken;
export const siteUrl = stageEnv.siteUrl;
