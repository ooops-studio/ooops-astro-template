import { siteUrl } from '../cms/env';
import { templateConfig, type TemplateLocale } from '../../template.config';
import {
  alternateLocales as createAlternateLocales,
  canonicalForLocale as createCanonicalForLocale,
  localeFromPathname as createLocaleFromPathname,
  localePath as createLocalePath
} from '@ooopsstudio/cms-astro';

export const defaultLocale = templateConfig.defaultLocale;
export const supportedLocales = templateConfig.locales;

export const isSupportedLocale = (locale: string | null | undefined): locale is TemplateLocale =>
  typeof locale === 'string' && supportedLocales.some((supported) => supported === locale);

export const localePath = (path = '/', locale: TemplateLocale = defaultLocale) =>
  templateConfig.i18nEnabled
    ? createLocalePath({ ...templateConfig, path, locale })
    : createLocalePath({ locale: defaultLocale, defaultLocale, path });

export const canonicalForLocale = (path = '/', locale: TemplateLocale = defaultLocale) =>
  createCanonicalForLocale({
    siteUrl,
    defaultLocale,
    path,
    locale: templateConfig.i18nEnabled ? locale : defaultLocale
  });

export const alternateLocales = (path = '/') =>
  createAlternateLocales({
    ...templateConfig,
    siteUrl,
    pathByLocale: Object.fromEntries(supportedLocales.map((locale) => [locale, path]))
  }).map(({ locale, href }) => ({
    locale: locale as TemplateLocale,
    hreflang: locale,
    href: templateConfig.i18nEnabled
      ? href
      : canonicalForLocale(path, locale as TemplateLocale)
  }));

export const localeFromPathname = (pathname: string): TemplateLocale =>
  createLocaleFromPathname({
    pathname,
    defaultLocale,
    locales: supportedLocales
  }) as TemplateLocale;
