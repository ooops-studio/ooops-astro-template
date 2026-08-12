import {expect, test} from '@playwright/test'

const metaContent = async(page: import('@playwright/test').Page, selector: string) => {
	return page.locator(selector).getAttribute('content')
}

test('home output exposes complete crawl and sharing metadata', async({page}) => {
	await page.goto('/')

	await expect(page).toHaveTitle(/Stage Astro Site/)
	expect(await metaContent(page, 'meta[name="description"]')).toBeTruthy()
	expect(await page.locator('link[rel="canonical"]').getAttribute('href')).toMatch(/\/$/)
	expect(await metaContent(page, 'meta[property="og:type"]')).toBe('website')
	expect(await metaContent(page, 'meta[property="og:title"]')).toBe(await page.title())
	expect(await metaContent(page, 'meta[property="og:description"]')).toBe(await metaContent(page, 'meta[name="description"]'))
	expect(await metaContent(page, 'meta[name="twitter:title"]')).toBe(await page.title())

	const jsonLd = await page.locator('script[type="application/ld+json"]').evaluateAll((scripts) =>
		scripts.map((script) => JSON.parse(script.textContent || '{}'))
	)
	expect(jsonLd).toEqual(expect.arrayContaining([
		expect.objectContaining({'@context': 'https://schema.org'})
	]))
})

test('contact output carries its own canonical and social metadata', async({page}) => {
	await page.goto('/contact/')

	await expect(page).toHaveTitle('Contact | Stage Astro Site')
	expect(await page.locator('link[rel="canonical"]').getAttribute('href')).toMatch(/\/contact$/)
	expect(await metaContent(page, 'meta[property="og:title"]')).toBe('Contact | Stage Astro Site')
	expect(await metaContent(page, 'meta[property="og:description"]')).toBe('Contact form powered by the canonical Ooops UI components.')
	expect(await metaContent(page, 'meta[name="twitter:card"]')).toBe('summary')
})

test('robots and sitemap expose the intended public crawl contract', async({page}) => {
	const robots = await page.request.get('/robots.txt')
	expect(robots.ok()).toBe(true)
	expect(await robots.text()).toMatch(/^User-agent: \*\nAllow: \/\n\nSitemap: https?:\/\//)

	const sitemap = await page.request.get('/sitemap.xml')
	expect(sitemap.ok()).toBe(true)
	expect(sitemap.headers()['content-type']).toContain('application/xml')
	const xml = await sitemap.text()
	expect(xml).toContain('<loc>http://localhost:4321/</loc>')
	expect(xml).toContain('<loc>http://localhost:4321/posts</loc>')
})
