import {
  handleStageRebuildWebhook,
  jsonResponse,
} from '@ooopsstudio/stage-cloudflare';

type Env = {
  CLOUDFLARE_PAGES_DEPLOY_HOOK_URL?: string;
  STAGE_WEBHOOK_SECRET?: string;
};

type PagesContext = {
  request: Request;
  env: Env;
};

export const onRequestPost = async ({ request, env }: PagesContext) => {
  return handleStageRebuildWebhook(request, {
    secret: env.STAGE_WEBHOOK_SECRET || '',
    deployHookUrl: env.CLOUDFLARE_PAGES_DEPLOY_HOOK_URL || ''
  });
};

export const onRequest = () => jsonResponse({ ok: false, message: 'Method not allowed.' }, { status: 405 });
