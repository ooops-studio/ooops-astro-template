import type { AnalyticsProviderManifest, PrivacyNoticeConfig } from '@ooopsstudio/analytics-consent/privacy';

const scriptUrl = import.meta.env.PUBLIC_STAGE_ANALYTICS_SCRIPT_URL || '';
const websiteId = import.meta.env.PUBLIC_STAGE_ANALYTICS_WEBSITE_ID || '';
const performanceEnabled = ['1', 'true', 'yes', 'on'].includes(
  (import.meta.env.PUBLIC_STAGE_ANALYTICS_PERFORMANCE_ENABLED || '').toLowerCase()
);
const replayEnabled = ['1', 'true', 'yes', 'on'].includes(
  (import.meta.env.PUBLIC_STAGE_ANALYTICS_REPLAY_ENABLED || '').toLowerCase()
);

const providers: AnalyticsProviderManifest[] = scriptUrl && websiteId
  ? [{
      id: 'umami',
      name: 'Umami Analytics',
      privacyHref: 'https://umami.is/privacy',
      role: 'processor',
      categories: [
        'analytics',
        ...(performanceEnabled ? ['performance' as const] : []),
        ...(replayEnabled ? ['replay' as const] : [])
      ],
      purposes: [
        'Measure connected-site page usage and page performance only after your optional consent.'
      ],
      data: [
        'Page path without query string or fragment, referrer domain, browser, device, language and approximate location.'
      ],
      dataClassification: 'pseudonymous',
      classificationDetails: 'The Stage-hosted Umami endpoint receives only the consented public-site analytics payload. It does not receive account email addresses or names from this template.',
      recipients: [],
      retention: import.meta.env.PUBLIC_STAGE_ANALYTICS_RETENTION || '90 days; raw connected-site analytics is deleted by the Stage retention job.',
      storage: [
        {
          name: 'umami*',
          type: 'localStorage',
          purpose: 'Provider runtime state, removed as soon as optional analytics is revoked.',
          duration: 'Until consent is revoked or the provider clears the state.'
        },
        {
          name: 'umami*',
          type: 'sessionStorage',
          purpose: 'Provider session state, removed as soon as optional analytics is revoked.',
          duration: 'Browser session or until consent is revoked.'
        }
      ],
      transfers: []
    }]
  : [];

export const privacyNoticeConfig: PrivacyNoticeConfig = {
  locale: 'en',
  effectiveDate: '2026-08-12',
  policyVersion: 'privacy-v1',
  noticeVersion: 'consent-v3',
  consentDurationDays: 180,
  site: {
    organizationName: 'Ooops Design Studio',
    registeredAddress: 'Aristotelous 136, 11251, Athens, Greece',
    privacyEmail: 'hello@ooops.studio',
    supervisoryAuthority: {
      name: 'Hellenic Data Protection Authority',
      complaintHref: 'https://www.dpa.gr/'
    }
  },
  providers
};
