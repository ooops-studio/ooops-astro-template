import { createExampleCmsClient } from './cms-request';

const cms = createExampleCmsClient();

const [seo, overview] = await Promise.all([
  cms.seo.get<{ ok: true; site?: unknown; targets?: Array<{ id: string; routePattern: string; targetKind: string }> }>(),
  cms.analytics.overview<{ ok: true; summary?: Record<string, unknown> }>({ range: '30d' })
]);

console.log('SEO targets');
for (const target of seo.targets ?? []) {
  console.log(`- ${target.routePattern} (${target.targetKind})`);
}

console.log('Analytics overview');
console.log(JSON.stringify(overview.summary ?? overview, null, 2));
