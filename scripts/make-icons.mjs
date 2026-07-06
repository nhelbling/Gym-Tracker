// Generates the PWA icons (public/pwa-512.png, pwa-192.png, apple-touch-icon.png)
// without any image dependencies: pixels are drawn into a buffer and encoded as
// PNG by hand (zlib is built into node), then resized with macOS `sips`.
import { execSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'

const SIZE = 512
const BG = [0x4f, 0x46, 0xe5] // indigo-600, matches the app accent
const FG = [0xff, 0xff, 0xff]

// Dumbbell: bar, two inner plates, two outer plates. [x1, y1, x2, y2]
const RECTS = [
  [176, 236, 336, 276],
  [136, 166, 176, 346],
  [336, 166, 376, 346],
  [96, 196, 136, 316],
  [376, 196, 416, 316],
]

const pixels = Buffer.alloc(SIZE * SIZE * 4)
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    const inShape = RECTS.some(([x1, y1, x2, y2]) => x >= x1 && x < x2 && y >= y1 && y < y2)
    const [r, g, b] = inShape ? FG : BG
    const i = (y * SIZE + x) * 4
    pixels[i] = r
    pixels[i + 1] = g
    pixels[i + 2] = b
    pixels[i + 3] = 255
  }
}

const CRC_TABLE = new Int32Array(256)
for (let n = 0; n < 256; n++) {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  CRC_TABLE[n] = c
}

function crc32(buf) {
  let c = -1
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ -1) >>> 0
}

function chunk(type, data) {
  const head = Buffer.alloc(4)
  head.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([head, body, crc])
}

const ihdr = Buffer.alloc(13)
ihdr.writeUInt32BE(SIZE, 0)
ihdr.writeUInt32BE(SIZE, 4)
ihdr[8] = 8 // bit depth
ihdr[9] = 6 // color type RGBA

const raw = Buffer.alloc(SIZE * (SIZE * 4 + 1))
for (let y = 0; y < SIZE; y++) {
  raw[y * (SIZE * 4 + 1)] = 0 // filter: none
  pixels.copy(raw, y * (SIZE * 4 + 1) + 1, y * SIZE * 4, (y + 1) * SIZE * 4)
}

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
])

writeFileSync('public/pwa-512.png', png)
execSync('sips -z 192 192 public/pwa-512.png --out public/pwa-192.png', { stdio: 'ignore' })
execSync('sips -z 180 180 public/pwa-512.png --out public/apple-touch-icon.png', {
  stdio: 'ignore',
})
console.log('Wrote public/pwa-512.png, pwa-192.png, apple-touch-icon.png')
