/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly OOOPS_CMS_API_BASE_URL?: string;
  readonly OOOPS_CMS_API_TOKEN?: string;
  readonly OOOPS_CMS_PREVIEW_SESSION_SECRET?: string;
  readonly OOOPS_CMS_PREVIEW_ENABLED?: string;
  readonly OOOPS_CMS_REBUILD_SECRET?: string;
  readonly OOOPS_CLOUDFLARE_DEPLOY_HOOK_URL?: string;
  readonly PUBLIC_SITE_URL?: string;
  readonly PUBLIC_CMS_API_BASE_URL?: string;
  readonly PUBLIC_CONTACT_FORM_TOKEN?: string;
  readonly PUBLIC_NEWSLETTER_FORM_TOKEN?: string;
  readonly PUBLIC_CMS_ANALYTICS_SCRIPT_URL?: string;
  readonly PUBLIC_CMS_ANALYTICS_WEBSITE_ID?: string;
  readonly PUBLIC_CMS_ANALYTICS_RESPECT_DNT?: string;
  readonly PUBLIC_CMS_ANALYTICS_RETENTION?: string;
  readonly PUBLIC_CMS_ANALYTICS_PERFORMANCE_ENABLED?: string;
  readonly PUBLIC_CMS_ANALYTICS_REPLAY_ENABLED?: string;
  readonly PUBLIC_CMS_ANALYTICS_REPLAY_SCRIPT_URL?: string;
  readonly PUBLIC_CMS_ANALYTICS_REPLAY_SAMPLE_RATE?: string;
  readonly PUBLIC_CMS_ANALYTICS_REPLAY_MASK_LEVEL?: string;
  readonly PUBLIC_CMS_ANALYTICS_REPLAY_MAX_DURATION_MS?: string;
  readonly PUBLIC_CMS_ANALYTICS_REPLAY_BLOCK_SELECTOR?: string;
  readonly PUBLIC_CMS_ANALYTICS_EXCLUDED_PATHS?: string;
  readonly PUBLIC_CMS_ANALYTICS_INTERNAL_REFERRER_DOMAINS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
