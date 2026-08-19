# Testing

Every project should keep `pnpm validate` passing.

## Included Checks

- `pnpm lint`
- `pnpm typecheck`
- `pnpm check`
- `pnpm validate:env`
- `pnpm check:openapi`
- `pnpm check:content-health`
- `pnpm test:modules`
- `pnpm test:cms:integration` when `OOOPS_CMS_API_BASE_URL` and `OOOPS_CMS_API_TOKEN` are configured
- `pnpm build`

## Recommended Project Smoke Tests

Add Playwright tests for:

- homepage renders without framework errors
- skip link focuses `#main-content`
- primary navigation is keyboard usable
- accessibility menu opens, closes, and persists settings
- newsletter success and error states if the newsletter module is copied
- localized route rendering if i18n is enabled
- CMS preview rejects invalid opaque tokens and does not render draft content
- CMS preview handoff removes the token from the URL; its banner is visible and exit clears the preview session
- optional module installer dry-run does not write files
- selected optional modules are listed in `SETUP.md`

## CI

GitHub Actions runs `pnpm validate` on pushes and pull requests. Keep Cloudflare-specific behavior testable with mocked env values so CI does not require real deploy hooks.

The CI workflow also runs `pnpm test:e2e` in Chromium against the production build. This covers the real layout, contact form, project-local UI styling, dialog focus behavior and Astro view-transition remounting; it is separate from the component laboratory in the `ooops-ui` repository.

## Real CMS Content and Forms Integration

`pnpm test:cms:integration` is an opt-in integration check for a real CMS organization. It uses the official CMS client with `OOOPS_CMS_API_BASE_URL` and `OOOPS_CMS_API_TOKEN`, verifies that the template's `homepage` single and `posts` collection can be read, and retrieves the starter `newsletter` form. It makes no writes and exits successfully as skipped when those credentials are absent, so public CI never needs a shared CMS tenant.

To also prove a real public form submission, provide both `OOOPS_CMS_INTEGRATION_FORM_SHARE_TOKEN` and a disposable `OOOPS_CMS_INTEGRATION_FORM_TEST_EMAIL`. That deliberately creates one newsletter submission, so use a dedicated test form or tenant and a unique test address.
