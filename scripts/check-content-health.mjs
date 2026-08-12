const args = new Set(process.argv.slice(2));
const strict = args.has('--strict');
const collectionsArg = [...args].find((arg) => arg.startsWith('--collections='));
const collections = (collectionsArg?.split('=')[1] || 'posts,projects')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

let cmsApi = null;
try {
	cmsApi = await import('@ooopsstudio/cms-api');
} catch {
	cmsApi = null;
}

if (!cmsApi) {
	const message = '[content-health] @ooopsstudio/cms-api is not installed; skipping live content audit.';
  if (strict) {
    console.error(message);
    process.exit(1);
  }
  console.warn(message);
  process.exit(0);
}

const { createCmsClient } = cmsApi;
let client = null;
try {
	const baseUrl = process.env.OOOPS_CMS_API_BASE_URL?.replace(/\/$/, '');
	const token = process.env.OOOPS_CMS_API_TOKEN;
	if (baseUrl && token) client = createCmsClient({baseUrl, token});
} catch {
  client = null;
}

if (!client) {
	const message = '[content-health] CMS env is missing; skipping live content audit.';
  if (strict) {
    console.error(message);
    process.exit(1);
  }
  console.warn(message);
  process.exit(0);
}

const issues = [];

const mediaUrl = (value) => {
	if (!value || typeof value !== 'object') return '';
	return typeof value.url === 'string' ? value.url : typeof value.src === 'string' ? value.src : '';
};

const mediaAlt = (value, fallback = '') => {
	if (!value || typeof value !== 'object') return fallback;
	return typeof value.alt === 'string' ? value.alt.trim() : fallback;
};

const getField = (entry, key) => {
  const fields = entry?.fields && typeof entry.fields === 'object' ? entry.fields : entry;
  return typeof fields?.[key] === 'string' ? fields[key].trim() : fields?.[key];
};

const checkMediaAlt = (value, path) => {
  if (!value) return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => checkMediaAlt(item, `${path}[${index}]`));
    return;
  }
  if (typeof value === 'object') {
    if (mediaUrl(value) && !mediaAlt(value, '')) issues.push(`${path} has media without alt text`);
    for (const [key, child] of Object.entries(value)) checkMediaAlt(child, `${path}.${key}`);
  }
};

for (const collection of collections) {
  const response = await client.content.listCollectionEntries(collection).catch(() => null);
  const items = response?.items ?? [];
  const slugs = new Map();

  for (const entry of items) {
    const id = entry.id || entry._id || 'unknown';
    const slug = getField(entry, 'slug') || entry.slug;
    if (!slug) issues.push(`${collection}/${id} is missing slug`);
    else if (slugs.has(slug)) issues.push(`${collection} has duplicate slug "${slug}"`);
    else slugs.set(slug, id);

    const seo = getField(entry, 'seo') || {};
    const seoTitle = getField(seo, 'title') || getField(entry, 'seoTitle');
    const seoDescription = getField(seo, 'description') || getField(entry, 'seoDescription');
    if (!seoTitle) issues.push(`${collection}/${slug || id} is missing SEO title`);
    if (!seoDescription) issues.push(`${collection}/${slug || id} is missing SEO description`);

    checkMediaAlt(entry, `${collection}/${slug || id}`);
  }
}

if (!issues.length) {
  console.log('[content-health] Content health check passed.');
  process.exit(0);
}

for (const issue of issues) console.warn(`[content-health] ${issue}`);
if (strict) process.exit(1);
