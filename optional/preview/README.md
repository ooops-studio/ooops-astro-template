# CMS Draft Preview

The public site remains static. Only `/preview/content/**` runs in the Cloudflare Worker so CMS editors can view drafts without turning public content into SSR.

Configure the CMS preview URLs as:

```txt
https://your-site.com/preview/content/singles/{apiId}?preview={opaque-token}
https://your-site.com/preview/content/collections/{apiId}/{slug}?preview={opaque-token}
```

Add these Worker-only variables:

```env
OOOPS_CMS_API_BASE_URL=https://cms.example.com/api/cms/v1
OOOPS_CMS_API_TOKEN=
OOOPS_CMS_PREVIEW_SESSION_SECRET=
```

Rules:

- The CMS API token needs only `cms:content:read` and is never sent to the browser.
- The opaque CMS token is exchanged once for a 30-minute encrypted `HttpOnly`, `SameSite=Lax` cookie; the Worker redirects to a tokenless URL.
- Preview HTML is `private, no-store`, `noindex, nofollow`, has no canonical URL, and excludes analytics/replay.
- `/preview/content/exit` clears the preview cookie and takes the editor back to published content.
