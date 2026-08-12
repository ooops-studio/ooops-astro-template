# Content Model Examples

CMS controls content only. Layout and design stay in code.

## Recommended Core Singles

- `siteSettings`: site name, default SEO, social links, analytics settings.
- `navigation`: primary and footer navigation items.
- `homepage`: homepage copy and media references.

## Optional Collections

### Posts / Editorial

Use when the site needs articles, essays, news, or notes.

Recommended fields:

- `title`
- `slug`
- `excerpt`
- `body`
- `heroImage`
- `publishedAt`
- SEO fields from the template README

### Projects / Portfolio

Use for artist, studio, case-study, or showcase pages.

Recommended fields:

- `title`
- `slug`
- `summary`
- `description`
- `coverImage`
- `media`
- `year`
- `credits`
- `tags`
- `featured`
- SEO fields from the template README

### Showcase / Catalog-like Pages

Use for object, product, service, venue, or collection showcases without making the template e-commerce-specific.

Recommended fields:

- `title`
- `slug`
- `summary`
- `gallery`
- `attributes`
- `links`
- `availabilityLabel`
- SEO fields from the template README

## Localization

Fields can be plain strings or localized objects such as:

```json
{
  "title": {
    "en": "About",
    "el": "Σχετικά"
  }
}
```

Use the i18n helpers to resolve localized fields in page code.
