import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const outputPath = resolve('public/search-index.json');
const index = {
  generatedAt: new Date().toISOString(),
  items: []
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(index, null, 2)}\n`);
console.warn(`[search] wrote ${outputPath}`);
