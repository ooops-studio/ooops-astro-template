# Future Package Extraction

The template keeps UI/layout/styles local so client projects can edit them freely.

Code that may become reusable packages later:

- `@ooopsstudio/cms-api`: CMS API client, content helpers and media helpers.
- `@ooopsstudio/cms-astro`: Astro components and SEO/sitemap helpers.
- `@ooopsstudio/cms-cloudflare`: preview/rebuild functions and signature verification.
- `@ooops/accessibility`: accessibility menu state and adapters.

Do not extract packages until the API has been used by several real client projects.
