import {defineConfig, devices} from '@playwright/test'

const cmsApiBaseUrl = 'http://127.0.0.1:4403/api/cms/v1'
const cmsToken = 'e2e-cms-token'
const previewSecret = 'e2e-preview-session-secret-for-tests'

export default defineConfig({
	testDir: './tests/e2e',
	testMatch: /cms-preview\.spec\.ts/,
	timeout: 45_000,
	fullyParallel: false,
	workers: 1,
	use: {
		baseURL: 'http://127.0.0.1:4404',
		trace: 'retain-on-failure',
		screenshot: 'only-on-failure',
		video: 'retain-on-failure'
	},
	projects: [{name: 'chromium', use: {...devices['Desktop Chrome']}}],
	webServer: [
		{
			command: 'node scripts/e2e-cms-preview-mock.mjs',
			url: 'http://127.0.0.1:4403/health',
			reuseExistingServer: false,
			timeout: 30_000
		},
		{
			command: `pnpm exec wrangler dev --config dist/server/wrangler.json --ip 127.0.0.1 --port 4404 --local --var OOOPS_CMS_API_BASE_URL:${cmsApiBaseUrl} --var OOOPS_CMS_API_TOKEN:${cmsToken} --var OOOPS_CMS_PREVIEW_SESSION_SECRET:${previewSecret} --var OOOPS_CMS_PREVIEW_ENABLED:true`,
			url: 'http://127.0.0.1:4404/',
			reuseExistingServer: false,
			timeout: 120_000
		}
	]
})
