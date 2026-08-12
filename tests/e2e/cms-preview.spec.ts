import {expect, test} from '@playwright/test'

const previewToken = 'opaque-preview-token-that-must-not-stay-in-the-url'

test('CMS draft preview trades the opaque token for a private cookie and exits to published content', async({context, page}) => {
	const published = await page.goto('/')
	expect(published?.status()).toBe(200)
	await expect(page.locator('body')).not.toContainText('Draft homepage')

	const handoff = await page.goto(`/preview/content/singles/homepage?preview=${previewToken}`)
	expect(handoff?.status()).toBe(200)
	expect(page.url()).toBe('http://127.0.0.1:4404/preview/content/singles/homepage')
	await expect(page.locator('[data-cms-preview-content]')).toContainText('Draft homepage')
	await expect(page.locator('body')).toContainText('Draft-only homepage body.')
	await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,nofollow')
	await expect(page.locator('#stage-analytics-runtime')).toHaveCount(0)
	await expect(page.locator('#stage-analytics-consent')).toHaveCount(0)

	const cookies = await context.cookies()
	const sessionCookie = cookies.find((cookie) => cookie.name === 'ooops_cms_preview')
	expect(sessionCookie?.httpOnly).toBe(true)
	expect(sessionCookie?.path).toBe('/preview/content/')
	expect(sessionCookie?.value).not.toContain(previewToken)

	await page.getByRole('link', {name: 'Exit preview'}).click()
	await expect(page).toHaveURL('http://127.0.0.1:4404/')
	await expect(page.locator('body')).not.toContainText('Draft homepage')
})

test('an invalid opaque token cannot render draft content', async({page}) => {
	const response = await page.goto('/preview/content/singles/homepage?preview=invalid-token')
	expect(response?.status()).toBe(404)
	await expect(page.locator('body')).not.toContainText('Draft homepage')
})

test('collection preview is draft-only, private, and does not retain its token in the address bar', async({page}) => {
	const response = await page.goto(`/preview/content/collections/posts/draft-post?preview=${previewToken}`)
	expect(response?.status()).toBe(200)
	expect(response?.headers()['cache-control']).toContain('private, no-store')
	expect(response?.headers()['x-robots-tag']).toBe('noindex, nofollow')
	expect(page.url()).toBe('http://127.0.0.1:4404/preview/content/collections/posts/draft-post')
	await expect(page.locator('[data-cms-preview-content]')).toContainText('Draft collection entry')
	await expect(page.locator('body')).toContainText('Draft-only collection body.')
})
