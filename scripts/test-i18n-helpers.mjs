import assert from 'node:assert/strict';

const { alternateLocales, canonicalForLocale, localeFromPathname, localePath } = await import('../src/lib/i18n/routing.ts');

assert.equal(localePath('/about', 'en'), '/about');
assert.equal(localePath('/about', 'el'), '/about');
assert.equal(canonicalForLocale('/about', 'en'), 'http://localhost:4321/about');
assert.equal(localeFromPathname('/el/about'), 'el');
assert.equal(localeFromPathname('/about'), 'en');
assert.deepEqual(alternateLocales('/about'), [
  { locale: 'en', hreflang: 'en', href: 'http://localhost:4321/about' },
  { locale: 'el', hreflang: 'el', href: 'http://localhost:4321/about' }
]);

console.log('[i18n-test] i18n helpers passed with default disabled routing.');
