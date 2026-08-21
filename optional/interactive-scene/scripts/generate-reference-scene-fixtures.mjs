import {mkdirSync, writeFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {deflateSync} from 'node:zlib'

const root = fileURLToPath(new URL('../../..', import.meta.url))
const output = resolve(root, 'optional/interactive-scene/public/assets/scenes')
mkdirSync(output, {recursive: true})

const crcTable = Array.from({length: 256}, (_, value) => {
  let crc = value
  for (let bit = 0; bit < 8; bit += 1) crc = (crc & 1) ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1
  return crc >>> 0
})
const crc32 = (data) => {
  let crc = 0xffffffff
  for (const byte of data) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}
const pngChunk = (type, data) => {
  const name = Buffer.from(type)
  const chunk = Buffer.alloc(12 + data.length)
  chunk.writeUInt32BE(data.length, 0)
  name.copy(chunk, 4)
  data.copy(chunk, 8)
  chunk.writeUInt32BE(crc32(Buffer.concat([name, data])), 8 + data.length)
  return chunk
}
const width = 640
const height = 360
const rows = Buffer.alloc((width * 4 + 1) * height)
for (let y = 0; y < height; y += 1) {
  const row = y * (width * 4 + 1)
  for (let x = 0; x < width; x += 1) {
    const offset = row + 1 + x * 4
    const mix = x / width
    rows[offset] = Math.round(26 + 229 * mix)
    rows[offset + 1] = Math.round(43 + 104 * (1 - mix))
    rows[offset + 2] = Math.round(58 + 136 * (1 - y / height))
    rows[offset + 3] = 255
  }
}
const header = Buffer.alloc(13)
header.writeUInt32BE(width, 0)
header.writeUInt32BE(height, 4)
header.set([8, 6, 0, 0, 0], 8)
writeFileSync(resolve(output, 'reference-poster.png'), Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  pngChunk('IHDR', header),
  pngChunk('IDAT', deflateSync(rows)),
  pngChunk('IEND', Buffer.alloc(0))
]))

process.stdout.write('[scene-fixtures] generated reference-poster.png\n')
