# Testing

Every project should keep `pnpm validate` passing.

## Included Checks

- `pnpm lint`
- `pnpm typecheck`
- `pnpm check`
- `pnpm validate:env`
- `pnpm check:openapi`
- `pnpm check:content-health`
- `pnpm test:signatures`
- `pnpm test:modules`
- `pnpm build`

## Recommended Project Smoke Tests

Add Playwright tests for:

- homepage renders without framework errors
- skip link focuses `#main-content`
- primary navigation is keyboard usable
- accessibility menu opens, closes, and persists settings
- newsletter success and error states if the newsletter module is copied
- localized route rendering if i18n is enabled
- preview endpoint rejects invalid secrets
- preview banner is visible in preview mode and exit preview clears preview state
- optional module installer dry-run does not write files
- selected optional modules are listed in `SETUP.md`

## CI

GitHub Actions runs `pnpm validate` on pushes and pull requests. Keep Cloudflare-specific behavior testable with mocked env values so CI does not require real deploy hooks.

The CI workflow also runs `pnpm test:e2e` in Chromium against the production build. This covers the real layout, contact form, project-local UI styling, dialog focus behavior and Astro view-transition remounting; it is separate from the component laboratory in the `ooops-ui` repository.
