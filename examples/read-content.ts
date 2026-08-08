import { createExampleStageClient } from './stage-request';

const stage = createExampleStageClient();

const homepage = await stage.content.getSingle<{ ok: true; content: Record<string, unknown> }>('homepage');
console.log('Homepage');
console.log(JSON.stringify(homepage.content, null, 2));

const collections = await stage.content.listCollections<{
  ok: true;
  collections?: Array<{ apiId: string; name?: string | null }>;
  contentTypes?: Array<{ apiId: string; name?: string | null }>;
}>();

console.log('Collections');
for (const collection of collections.collections ?? collections.contentTypes ?? []) {
  console.log(`- ${collection.apiId}${collection.name ? ` (${collection.name})` : ''}`);
}
