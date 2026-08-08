# Future Package Extraction

The template keeps UI/layout/styles local so client projects can edit them freely.

Code that may become reusable packages later:

- `@ooops/stage-client`: Stage API client, content helpers, media helpers.
- `@ooops/stage-astro`: Astro components and SEO/sitemap helpers.
- `@ooops/stage-cloudflare`: preview/rebuild functions and signature verification.
- `@ooops/accessibility`: accessibility menu state and adapters.

Do not extract packages until the API has been used by several real client projects.
