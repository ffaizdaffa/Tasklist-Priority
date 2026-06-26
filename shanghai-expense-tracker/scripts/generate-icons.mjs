// Generate PWA PNG icons with no external deps, using Node's zlib.
// Draws a rounded brand-red tile with a white "¥" glyph. Outputs to /public.
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PUBLIC = join(__dirname, '..', 'public')
mkdirSync(PUBLIC, { recursive: true })

// CRC32
const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()
function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const body = Buffer.concat([typeBuf, data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body), 0)
  return Buffer.concat([len, body, crc])
}
function encodePNG(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  // rest 0
  // raw with filter byte per row
  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0 // filter none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride)
  }
  const idat = deflateSync(raw, { level: 9 })
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// Brand color #e11d48
const BG = [225, 29, 72]
const FG = [255, 255, 255]

function draw(size, { maskable = false } = {}) {
  const buf = Buffer.alloc(size * size * 4)
  const radius = maskable ? size : size * 0.22 // maskable = full bleed square
  const set = (x, y, [r, g, b], a = 255) => {
    const i = (y * size + x) * 4
    buf[i] = r
    buf[i + 1] = g
    buf[i + 2] = b
    buf[i + 3] = a
  }
  // background (rounded rect)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (maskable) {
        set(x, y, BG)
      } else {
        // rounded corners
        const rx = Math.min(x, size - 1 - x)
        const ry = Math.min(y, size - 1 - y)
        if (rx < radius && ry < radius) {
          const dx = radius - rx
          const dy = radius - ry
          if (dx * dx + dy * dy > radius * radius) {
            set(x, y, BG, 0)
            continue
          }
        }
        set(x, y, BG)
      }
    }
  }

  // Draw a "¥" glyph with rectangles, centered.
  const cx = size / 2
  const top = size * 0.28
  const bottom = size * 0.72
  const armW = Math.max(2, Math.round(size * 0.06))
  const spread = size * 0.16

  const rect = (x0, y0, x1, y1) => {
    for (let y = Math.round(y0); y < Math.round(y1); y++) {
      for (let x = Math.round(x0); x < Math.round(x1); x++) {
        if (x >= 0 && x < size && y >= 0 && y < size) set(x, y, FG)
      }
    }
  }
  // Diagonal strokes of the Y (top to middle)
  const mid = top + (bottom - top) * 0.42
  const drawDiag = (x0, x1) => {
    const steps = Math.round(mid - top)
    for (let s = 0; s <= steps; s++) {
      const t = s / steps
      const x = x0 + (x1 - x0) * t
      const y = top + s
      rect(x - armW / 2, y, x + armW / 2, y + 1.5)
    }
  }
  drawDiag(cx - spread, cx)
  drawDiag(cx + spread, cx)
  // vertical stem
  rect(cx - armW / 2, mid, cx + armW / 2, bottom)
  // two horizontal bars
  const barW = spread * 1.5
  const bar1 = mid + (bottom - mid) * 0.18
  const bar2 = mid + (bottom - mid) * 0.5
  rect(cx - barW / 2, bar1, cx + barW / 2, bar1 + armW * 0.8)
  rect(cx - barW / 2, bar2, cx + barW / 2, bar2 + armW * 0.8)

  return encodePNG(size, size, buf)
}

const outputs = [
  ['pwa-192x192.png', draw(192)],
  ['pwa-512x512.png', draw(512)],
  ['pwa-maskable-512x512.png', draw(512, { maskable: true })],
  ['apple-touch-icon.png', draw(180, { maskable: true })],
]
for (const [name, data] of outputs) {
  writeFileSync(join(PUBLIC, name), data)
  console.log('wrote', name, data.length, 'bytes')
}
