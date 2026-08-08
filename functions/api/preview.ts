import { createStagePreviewRedirect, jsonResponse } from '@ooopsstudio/stage-cloudflare';

type Env = {
  STAGE_PREVIEW_SECRET?: string;
  STAGE_PREVIEW_TOKEN?: string;
};

type PagesContext = {
  request: Request;
  env: Env;
};

export const onRequestGet = async ({ request, env }: PagesContext) => {
  return createStagePreviewRedirect(request, {
    previewSecret: env.STAGE_PREVIEW_SECRET || '',
    previewToken: env.STAGE_PREVIEW_TOKEN || '',
    indicatorParam: 'stagePreview'
  });
};

export const onRequest = () => jsonResponse({ ok: false, message: 'Method not allowed.' }, { status: 405 });
