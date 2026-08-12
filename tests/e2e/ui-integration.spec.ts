import AxeBuilder from '@axe-core/playwright'
import {expect, test} from '@playwright/test'

test.beforeEach(async({page}) => {
	await page.goto('/contact/')
	await expect(page).toHaveURL(/\/contact\/?$/)
})

test('canonical UI wrappers work inside the real layout, form, CSS, and view transitions', async({page}) => {
	await page.getByLabel('Name').fill('Ada')
	await page.getByLabel('Email').fill('ada@example.test')
	const topic = page.locator('#contact-topic-trigger')
	await topic.focus()
	await topic.press('ArrowDown')
	await topic.press('Enter')
	await page.getByLabel('Message').fill('A production portfolio request.')
	const consent = page.locator('#contact-consent')
	await consent.focus()
	await consent.press('Space')
	await page.getByRole('button', {name: 'Send request'}).click()
	await expect(page.locator('#contact-result')).toContainText('name=Ada')
	await expect(page.locator('#contact-result')).toContainText('topic=project')
	await expect(page.locator('#contact-result')).toContainText('consent=on')

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
