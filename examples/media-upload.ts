import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createExampleStageClient } from './stage-request';

const filePath = process.argv[2];
const stage = createExampleStageClient();

if (!filePath) throw new Error('Usage: npm exec tsx examples/media-upload.ts ./image.png');

const fileName = path.basename(filePath);
const file = await readFile(filePath);
const mimeType = fileName.endsWith('.png') ? 'image/png' : fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') ? 'image/jpeg' : 'application/octet-stream';

const signed = await stage.media.signUpload<{
  ok: true;
  uploadUrl: string;
  objectKey: string;
  headers?: Record<string, string>;
}>({ fileName, mimeType, sizeBytes: file.byteLength });

const upload = await fetch(signed.uploadUrl, {
  method: 'PUT',
  headers: { 'content-type': mimeType, ...signed.headers },
  body: file
});
if (!upload.ok) throw new Error(`Upload failed with ${upload.status}`);

const completed = await stage.media.completeUpload<{
  ok: true;
  asset: { id: string; title?: string | null; url?: string | null };
}>({ fileName, objectKey: signed.objectKey, mimeType, sizeBytes: file.byteLength });

console.log(`Uploaded ${completed.asset.title ?? fileName}: ${completed.asset.id}`);
