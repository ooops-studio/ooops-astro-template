export const templateConfig = {
  siteName: 'Ooops CMS Astro Site',
  defaultLocale: 'en',
  locales: ['en', 'el'],
  i18nEnabled: false,
  optionalModules: {
    analytics: true,
    accessibilityMenu: false,
    cookieConsent: false,
    filters: false,
    gallery: false,
    interactiveScene: false,
    mediaPlayer: false,
    newsletter: false,
    preview: true,
    rebuildWebhook: true,
    search: false,
    svelteIslands: true,
    posts: true,
    projects: false,
    visualEditor: false
  }
} as const;

export type TemplateLocale = (typeof templateConfig.locales)[number];
