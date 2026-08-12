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

const positions = new Float32Array([
  0, 1, 0,
  -0.866, -0.5, 0.5,
  0.866, -0.5, 0.5,
  0, -0.5, -1
])
const normals = new Float32Array(positions)
const indices = new Uint16Array([0, 1, 2, 0, 2, 3, 0, 3, 1, 1, 3, 2])
const binary = Buffer.concat([
  Buffer.from(positions.buffer),
  Buffer.from(normals.buffer),
  Buffer.from(indices.buffer)
])
const gltf = {
  asset: {version: '2.0', generator: 'Ooops Studio reference fixture'},
  scene: 0,
  scenes: [{nodes: [0]}],
  nodes: [{mesh: 0}],
  meshes: [{primitives: [{attributes: {POSITION: 0, NORMAL: 1}, indices: 2}]}],
  buffers: [{byteLength: binary.length}],
  bufferViews: [
    {buffer: 0, byteOffset: 0, byteLength: positions.byteLength, target: 34962},
    {buffer: 0, byteOffset: positions.byteLength, byteLength: normals.byteLength, target: 34962},
    {buffer: 0, byteOffset: positions.byteLength + normals.byteLength, byteLength: indices.byteLength, target: 34963}
  ],
  accessors: [
    {bufferView: 0, componentType: 5126, count: 4, type: 'VEC3', min: [-0.866, -0.5, -1], max: [0.866, 1, 0.5]},
    {bufferView: 1, componentType: 5126, count: 4, type: 'VEC3'},
    {bufferView: 2, componentType: 5123, count: 12, type: 'SCALAR'}
  ]
}
let json = Buffer.from(JSON.stringify(gltf))
json = Buffer.concat([json, Buffer.alloc((4 - (json.length % 4)) % 4, 0x20)])
const binPadding = Buffer.alloc((4 - (binary.length % 4)) % 4)
const bin = Buffer.concat([binary, binPadding])
const totalLength = 12 + 8 + json.length + 8 + bin.length
const glb = Buffer.alloc(totalLength)
glb.writeUInt32LE(0x46546c67, 0)
glb.writeUInt32LE(2, 4)
glb.writeUInt32LE(totalLength, 8)
glb.writeUInt32LE(json.length, 12)
glb.writeUInt32LE(0x4e4f534a, 16)
json.copy(glb, 20)
const binHeader = 20 + json.length
glb.writeUInt32LE(bin.length, binHeader)
glb.writeUInt32LE(0x004e4942, binHeader + 4)
bin.copy(glb, binHeader + 8)
writeFileSync(resolve(output, 'reference.glb'), glb)

process.stdout.write('[scene-fixtures] generated reference.glb and reference-poster.png\n')
