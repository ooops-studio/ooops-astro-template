import {expect, test} from '@playwright/test'

test('editor markers identify wrappers and remount across Astro navigation', async({page}) => {
	const pageErrors: string[] = []
	page.on('pageerror', (error) => pageErrors.push(error.message))
	await page.goto('/')
	await expect.poll(() => page.locator('html').evaluate((element) => {
		const styles = getComputedStyle(element)
		return {
			accent: styles.getPropertyValue('--color-accent').trim(),
			layers: [
				'--z-index-base',
				'--z-index-raised',
				'--z-index-sticky',
				'--z-index-dropdown',
				'--z-index-overlay',
				'--z-index-modal',
				'--z-index-toast'
			].map((token) => Number(styles.getPropertyValue(token).trim()))
		}
	})).toEqual({accent: '#b23b1f', layers: [0, 10, 100, 1000, 1100, 1200, 1300]})
	await expect(page.locator('[data-ooops-editor-id="home-hero"][data-ooops-editor-component="section"]')).toHaveCount(1)
	await expect(page.locator('[data-ooops-editor-id="home-contact"][data-ooops-editor-component="button"]')).toHaveCount(1)

	await page.getByRole('link', {name: 'Contact'}).click()
	await expect(page).toHaveURL(/\/contact\/?$/)
	await expect(page.locator('[data-ooops-editor-id="contact-name"][data-ooops-editor-component="input"]')).toHaveCount(1)
	await expect(page.locator('[data-ooops-editor-id="contact-privacy"][data-ooops-editor-component="dialog"]')).toHaveCount(1)

	await page.getByRole('link', {name: 'Back home'}).click()
	await expect(page.locator('[data-ooops-editor-id="home-hero"]')).toHaveCount(1)
	expect(pageErrors).toEqual([])
})

test('accessibility preview state remains runtime-owned', async({page}) => {
	const pageErrors: string[] = []
	page.on('pageerror', (error) => pageErrors.push(error.message))
	await page.goto('/')
	await page.locator('[data-ooops-a11y-trigger]').click()
	await page.getByRole('button', {name: 'High contrast'}).click()
	await expect(page.locator('html')).toHaveClass(/ooops-a11y-high-contrast/)
	await page.getByRole('button', {name: /reset/i}).click()
	await expect(page.locator('html')).not.toHaveClass(/ooops-a11y-high-contrast/)
	expect(pageErrors).toEqual([])
})
