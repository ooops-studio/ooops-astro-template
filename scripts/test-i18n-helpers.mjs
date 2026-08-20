import assert from 'node:assert/strict';

const { alternateLocales, canonicalForLocale, localeFromPathname, localePath } = await import('../src/lib/i18n/routing.ts');

assert.equal(localePath('/about', 'en'), '/about');
assert.equal(localePath('/about', 'el'), '/about');
assert.equal(canonicalForLocale('/about', 'en'), 'http://localhost:4321/about');
assert.equal(localeFromPathname('/el/about'), 'el');
assert.equal(localeFromPathname('/about'), 'en');
const disabledRoutingAlternates = alternateLocales('/about');
assert.deepEqual(disabledRoutingAlternates, [
  { locale: 'en', hreflang: 'en', href: 'http://localhost:4321/about' }
]);
assert.equal(
  new Set(disabledRoutingAlternates.map(({ href }) => href)).size,
  disabledRoutingAlternates.length,
  'disabled locale routing must not emit multiple hreflang values for the same URL'
);

console.log('[i18n-test] i18n helpers passed with default disabled routing.');
