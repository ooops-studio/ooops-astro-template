import {defineConfig, devices} from '@playwright/test'

export default defineConfig({
	testDir: './tests/editor-e2e',
	workers: 1,
	use: {
		...devices['Desktop Chrome'],
		baseURL: 'http://127.0.0.1:4402',
		trace: 'retain-on-failure',
		screenshot: 'only-on-failure'
	},
	webServer: {
		command: 'ASTRO_DEV_BACKGROUND=0 OOOPS_EDITOR_MODE=1 corepack pnpm exec astro dev --host 127.0.0.1 --port 4402',
		url: 'http://127.0.0.1:4402/',
		reuseExistingServer: false,
		timeout: 120_000
	}
})
