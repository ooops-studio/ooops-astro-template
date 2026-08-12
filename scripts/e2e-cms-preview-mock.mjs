import {createServer} from 'node:http'

const port = Number(process.env.CMS_PREVIEW_MOCK_PORT || 4403)
const cmsToken = 'e2e-cms-token'
const previewToken = 'opaque-preview-token-that-must-not-stay-in-the-url'

const json = (response, status, payload) => {
	response.writeHead(status, {'content-type': 'application/json; charset=utf-8'})
	response.end(JSON.stringify(payload))
}

createServer((request, response) => {
	const requestUrl = new URL(request.url || '/', `http://127.0.0.1:${port}`)
	if (requestUrl.pathname === '/health') return json(response, 200, {ok: true})
	if (request.headers.authorization !== `Bearer ${cmsToken}`) return json(response, 401, {ok: false})
	if (requestUrl.searchParams.get('preview') !== previewToken) return json(response, 403, {ok: false})

	if (requestUrl.pathname === '/api/cms/v1/preview/content/singles/homepage') {
		return json(response, 200, {
			ok: true,
			preview: true,
			apiId: 'homepage',
			data: {
				title: 'Draft homepage',
				description: 'Content only visible in the CMS draft preview.',
				body: '<p>Draft-only homepage body.</p>'
			}
		})
	}

	if (requestUrl.pathname === '/api/cms/v1/preview/content/collections/posts/draft-post') {
		return json(response, 200, {
			ok: true,
			preview: true,
			apiId: 'posts',
			item: {
				title: 'Draft collection entry',
				slug: 'draft-post',
				input: {
					excerpt: 'A CMS-only draft collection entry.',
					body: '<p>Draft-only collection body.</p>'
				}
			}
		})
	}

	return json(response, 404, {ok: false})
}).listen(port, '127.0.0.1')
