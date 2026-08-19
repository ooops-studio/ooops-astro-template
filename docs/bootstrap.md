# CMS Bootstrap

Use the bootstrap flow when you want this template to create the starter CMS schemas, content, and form in your own CMS organization.

The bootstrap script does not create an organization. CMS creates or assigns an organization when you sign in. The script uses your `OOOPS_CMS_API_TOKEN`, and every resource is created inside the organization attached to that token.

## 1. Sign In To CMS

Create a CMS account or sign in to your existing account.

After sign-in, CMS should have an active organization for your user.

## 2. Create A Bootstrap API Token

In CMS, open:

```txt
Settings -> General -> API access
```

Create a token with the `Site bootstrap` preset.

Recommended setup scopes:

- `cms:schema:read`
- `cms:schema:write`
- `cms:content:read`
- `cms:content:write`
- `cms:content:publish`
- `forms:read`
- `forms:write`

Use a short expiry for this setup token. After bootstrap, you can rotate to a read-focused token for production builds.

## 3. Configure Local Env

Copy the env example:

```bash
cp .env.example .env.local
```

Set:

```env
OOOPS_CMS_API_BASE_URL=http://cms.localhost:4175/api/cms/v1
OOOPS_CMS_API_TOKEN=your_private_cms_api_token
PUBLIC_SITE_URL=http://localhost:4321
```

Never expose `OOOPS_CMS_API_TOKEN` in browser code.

## 4. Run Bootstrap

```bash
pnpm cms:bootstrap
```

The script reads:

```txt
cms/starter-bundle.json
```

It creates or updates:

- `homepage` single type
- starter homepage content
- `posts` collection
- one starter post
- public newsletter form

The script is idempotent. Running it again should update/skip existing resources rather than creating duplicates.

## 5. Save Public Form Token

If the newsletter form is created or found, the script prints:

```env
PUBLIC_NEWSLETTER_FORM_TOKEN=...
```

Add that value to `.env.local` only if you copy `optional/newsletter` into your site.

## 6. Run The Site

```bash
pnpm dev
```

The homepage should now load from CMS instead of fixture content.

## 7. Optional Local Analytics

If you want the local template to send pageviews to CMS Analytics, add browser-side analytics env vars:

```env
PUBLIC_CMS_ANALYTICS_SCRIPT_URL=http://localhost:3001/script.js
PUBLIC_CMS_ANALYTICS_WEBSITE_ID=your_cms_analytics_website_id
PUBLIC_CMS_ANALYTICS_RESPECT_DNT=true
```

Restart `pnpm dev`, accept analytics in the banner, visit a few pages, then check the Analytics page in CMS for the same organization.

## Production Token Recommendation

For production static builds, prefer a narrower token when possible:

- `cms:schema:read`
- `cms:content:read`
- `media:read` if your pages render CMS media
- `forms:read` only if your build reads form definitions
- `seo:read` only if your build reads SEO registry data

Keep write scopes only for automation or setup jobs that actually need them.
