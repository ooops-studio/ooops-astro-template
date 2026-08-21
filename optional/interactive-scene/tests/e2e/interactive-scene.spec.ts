import AxeBuilder from '@axe-core/playwright'
import {expect, test} from '@playwright/test'
import {PNG} from 'pngjs'

const sceneRoot = (
	page: import('@playwright/test').Page,
	scene = 'reference-scene'
) => page.locator(`[data-ooops-scene-root="${scene}"]`)

const waitForScene = async(
	page: import('@playwright/test').Page,
	scene = 'reference-scene'
) => {
	const root = sceneRoot(page, scene)
	await expect(root).toHaveAttribute('data-ooops-scene-state', 'running', {timeout: 30_000})
	await expect(root).toHaveAttribute('data-ooops-scene-backend', /^(webgpu|webgl2)$/)
	return root
}

test('forced WebGL 2 renders nonblank pixels in every browser', async({page}) => {
	await page.goto('/interactive-scene-webgl2')
	const root = sceneRoot(page, 'reference-scene-webgl2')
	await expect(root).toHaveAttribute('data-ooops-scene-state', 'running', {timeout: 30_000})
	await expect(root).toHaveAttribute('data-ooops-scene-backend', 'webgl2')
	const canvas = root.locator('canvas')
	await expect.poll(async() => screenshotHasPixels(await canvas.screenshot()), {timeout: 15_000}).toBe(true)
})

test('auto backend prefers WebGPU when the browser exposes an adapter', async({page}, testInfo) => {
	test.skip(testInfo.project.name !== 'chromium')
	await page.goto('/interactive-scene')
	const root = await waitForScene(page)
	const canUseWebGpu = await page.evaluate(async() => {
		const gpu = (navigator as Navigator & {
			gpu?: {requestAdapter(): Promise<unknown>}
		}).gpu
		return Boolean(gpu && await gpu.requestAdapter())
	})
	expect(await root.getAttribute('data-ooops-scene-backend')).toBe(
		canUseWebGpu ? 'webgpu' : 'webgl2'
	)
})

test('auto backend falls back to WebGL 2 when WebGPU is unavailable', async({page}) => {
	await page.addInitScript(() => {
		Object.defineProperty(navigator, 'gpu', {
			configurable: true,
			value: undefined
		})
	})
	await page.goto('/interactive-scene')
	const root = await waitForScene(page)
	await expect(root).toHaveAttribute('data-ooops-scene-backend', 'webgl2')
	await expect.poll(async() => screenshotHasPixels(await root.locator('canvas').screenshot()), {
		timeout: 15_000
	}).toBe(true)
})

const screenshotHasPixels = (screenshot: Buffer) => {
	const {data: pixels} = PNG.sync.read(screenshot)
	let minimum = 255
	let maximum = 0
	for (let index = 0; index < pixels.length; index += 4) {
		minimum = Math.min(minimum, pixels[index] ?? 255, pixels[index + 1] ?? 255, pixels[index + 2] ?? 255)
		maximum = Math.max(maximum, pixels[index] ?? 0, pixels[index + 1] ?? 0, pixels[index + 2] ?? 0)
	}
	return maximum - minimum > 8
}

test('reference scene renders pixels, exposes its backend and respects Select/Interact ownership', async({page}) => {
	await page.goto('/interactive-scene')
	const root = await waitForScene(page)
	const canvas = root.locator('canvas')
	await expect.poll(async() => screenshotHasPixels(await canvas.screenshot()), {timeout: 15_000}).toBe(true)
	await expect(canvas).toHaveCSS('pointer-events', 'none')
	await page.evaluate(() => document.dispatchEvent(new CustomEvent('ooops:scene-mode', {
		detail: {sceneId: 'reference-scene', mode: 'interact'}
	})))
	await expect(root).toHaveAttribute('data-ooops-scene-mode', 'interact')
	await expect(canvas).toHaveCSS('pointer-events', 'auto')
	await canvas.hover({position: {x: 48, y: 48}})
	await expect.poll(async() => screenshotHasPixels(await canvas.screenshot())).toBe(true)
})

test('reference scene pause, reduced-motion and WebGL context-loss fallbacks are deterministic', async({page}) => {
	await page.goto('/interactive-scene')
	const root = await waitForScene(page)
	const pause = page.getByRole('button', {name: 'Pause animation'})
	await pause.click()
	await expect(root).toHaveAttribute('data-ooops-scene-state', 'paused')
	await expect(page.getByRole('button', {name: 'Resume animation'})).toHaveAttribute('aria-pressed', 'true')
	await page.getByRole('button', {name: 'Resume animation'}).click()
	await expect(root).toHaveAttribute('data-ooops-scene-state', 'running')

	await page.goto('/interactive-scene-webgl2')
	const webGlRoot = await waitForScene(page, 'reference-scene-webgl2')
	await webGlRoot.locator('canvas').evaluate((canvas) => {
		canvas.dispatchEvent(new Event('webglcontextlost', {cancelable: true}))
	})
	await expect(webGlRoot).toHaveAttribute('data-ooops-scene-state', 'fallback')
	await expect(webGlRoot).toHaveAttribute('data-ooops-scene-fallback', 'context-lost')

	await page.emulateMedia({reducedMotion: 'reduce'})
	await page.goto('/interactive-scene')
	await expect(sceneRoot(page)).toHaveAttribute('data-ooops-scene-state', 'paused', {timeout: 30_000})
	await expect(sceneRoot(page).locator('[data-part="poster"]')).toBeVisible()
})

test('meaningful scene semantics pass automated accessibility checks', async({page}) => {
	await page.goto('/interactive-scene')
	const root = await waitForScene(page)
	await expect(root.locator('canvas')).toHaveAttribute('aria-labelledby')
	await expect(page.getByRole('button', {name: 'Pause animation'})).toBeVisible()
	const results = await new AxeBuilder({page}).analyze()
	expect(results.violations).toEqual([])
})

test('100 Astro navigation cycles retain one scene and no GPU-context exhaustion', async({page}, testInfo) => {
	test.skip(testInfo.project.name !== 'chromium')
	test.setTimeout(300_000)
	const warnings: string[] = []
	page.on('console', (message) => {
		if (/too many active (?:webgl|gpu) contexts/i.test(message.text())) warnings.push(message.text())
	})
	await page.goto('/interactive-scene')
	await waitForScene(page)
	for (let index = 0; index < 100; index += 1) {
		await page.getByRole('link', {name: 'Leave scene'}).click()
		await expect(page).toHaveURL(/\/$/)
		await expect(page.locator('[data-ooops-scene-root]')).toHaveCount(0)
		await page.goBack()
		await waitForScene(page)
		await expect(page.locator('[data-ooops-scene-root]')).toHaveCount(1)
	}
	expect(warnings).toEqual([])
})
