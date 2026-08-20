import AxeBuilder from '@axe-core/playwright'
import {expect, test} from '@playwright/test'

test.beforeEach(async({page}) => {
	await page.goto('/contact/')
	await expect(page).toHaveURL(/\/contact\/?$/)
})

test('canonical UI wrappers work inside the real layout, form, CSS, and view transitions', async({page}) => {
	let submitted: Record<string, unknown> | null = null
	await page.route('https://cms.example.test/api/cms/public/forms/e2e-contact-share/submissions', async(route) => {
		submitted = route.request().postDataJSON() as Record<string, unknown>
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({submitted: true, thankYouMessage: 'Thanks. Your message has been received.'})
		})
	})
	await page.getByLabel('Name').fill('Ada')
	await page.getByLabel('Email').fill('ada@example.test')
	await page.getByLabel('Message').fill('A production portfolio request.')
	await page.getByRole('button', {name: 'Send request'}).click()
	await expect(page.locator('#contact-result')).toHaveText('Thanks. Your message has been received.')
	expect(submitted).toEqual({
		answers: {
			name: 'Ada',
			email: 'ada@example.test',
			message: 'A production portfolio request.'
		},
		submitterIdentity: {name: 'Ada', email: 'ada@example.test'},
		metadata: {source: 'ooops-ssg-test-contact'}
	})

	const privacy = page.getByRole('button', {name: 'Privacy note'})
	await privacy.click()
	await expect(page.getByRole('dialog', {name: 'Privacy note'})).toBeVisible()
	await page.keyboard.press('Escape')
	await expect(privacy).toBeFocused()

	await page.getByRole('link', {name: 'Back home'}).click()
	await expect(page).toHaveURL(/\/$/)
	await page.getByRole('link', {name: 'Contact'}).click()
	await expect(page.locator('#contact-form[data-mounted="true"]')).toHaveCount(1)
})

test('real contact page has no automated accessibility violations', async({page}) => {
	const results = await new AxeBuilder({page}).analyze()
	expect(results.violations).toEqual([])
})

test('production output contains no visual-editor markers', async({page}) => {
	await expect(page.locator('[data-ooops-editor-id]')).toHaveCount(0)
})
