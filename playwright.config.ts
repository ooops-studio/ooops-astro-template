import {existsSync} from 'node:fs'
import {defineConfig, devices} from '@playwright/test'

const interactiveSceneEnabled = existsSync('src/pages/interactive-scene.astro')
const webGpuTestArgs = [
	'--enable-unsafe-webgpu',
	'--use-webgpu-adapter=swiftshader',
	'--use-gl=angle',
	'--use-angle=swiftshader',
	'--enable-unsafe-swiftshader',
	'--use-gpu-in-tests'
]

export default defineConfig({
	testDir: './tests/e2e',
	testIgnore: /(?:cms-preview|analytics-consent)\.spec\.ts/,
	timeout: 45_000,
	fullyParallel: false,
	workers: 1,
	forbidOnly: Boolean(process.env.CI),
	retries: process.env.CI ? 1 : 0,
	use: {
		baseURL: 'http://127.0.0.1:4405',
		trace: 'retain-on-failure',
		screenshot: 'only-on-failure',
		video: 'retain-on-failure'
	},
	projects: [
		{
			name: 'chromium',
			use: {
				...devices['Desktop Chrome'],
				...(interactiveSceneEnabled ? {launchOptions: {args: webGpuTestArgs}} : {})
			}
		},
		...(interactiveSceneEnabled ? [{
			name: 'scene-firefox',
			testMatch: /interactive-scene\.spec\.ts/,
			use: {...devices['Desktop Firefox']}
		},
		{
			name: 'scene-webkit',
			testMatch: /interactive-scene\.spec\.ts/,
			use: {...devices['Desktop Safari']}
		}] : [])
	],
	webServer: {
		command: 'corepack pnpm exec astro preview --host 127.0.0.1 --port 4405',
		url: 'http://127.0.0.1:4405/',
		reuseExistingServer: false,
		timeout: 120_000
	}
})
