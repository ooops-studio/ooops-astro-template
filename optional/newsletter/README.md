# Optional Newsletter Form

Copy this component into `src/components/newsletter/NewsletterForm.astro` and import it where needed.

```txt
optional/newsletter/src/components/newsletter/NewsletterForm.astro -> src/components/newsletter/NewsletterForm.astro
optional/newsletter/functions/api/newsletter.ts -> functions/api/newsletter.ts
```

If you want client-side status messages, copy the Svelte enhancement example:

```txt
optional/newsletter/src/components/newsletter/NewsletterEnhancement.svelte -> src/components/newsletter/NewsletterEnhancement.svelte
```

The Astro form submits to the local Cloudflare Pages Function, which forwards to Stage public forms as JSON:

```env
PUBLIC_STAGE_API_BASE_URL=https://stage.example.com
PUBLIC_NEWSLETTER_FORM_TOKEN=your_public_form_token
```

Expected form answer key: `email`.

The function uses the public Stage Forms client from `@ooopsstudio/stage-api`. It does not send a private Stage API token.

The default Astro form is progressive-enhancement friendly:

- native browser validation
- required email field
- honeypot spam field
- accessible status message when env vars are missing
- no private Stage API token in browser code

Configure rate limiting at Cloudflare/WAF level for production projects.
