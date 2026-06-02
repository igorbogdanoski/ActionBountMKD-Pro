/**
 * gen-icons.mjs — Generates branded PWA PNG icons without external dependencies
 * Uses raw PNG binary encoding (IHDR + IDAT via zlib + IEND) + pure-JS rendering
 * Run: node scripts/gen-icons.mjs
 */

import { deflateSync, crc32 } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dir, '..', 'public');

// ── CRC32 helper ────────────────────────────────────────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32buf(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

// ── PNG chunk writer ────────────────────────────────────────────────────────
function pngChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(12 + len);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4, 'ascii');
  data.copy(buf, 8);
  const crc = crc32buf(buf.subarray(4, 8 + len));
  buf.writeUInt32BE(crc, 8 + len);
  return buf;
}

// ── Build PNG from RGBA pixel array ────────────────────────────────────────
function buildPNG(width, height, pixels /* Uint8Array RGBA flat */) {
  const PNG_SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8);  // bit depth
  ihdr.writeUInt8(6, 9);  // colour type 6 = RGBA
  ihdr.writeUInt8(0, 10); // compression
  ihdr.writeUInt8(0, 11); // filter
  ihdr.writeUInt8(0, 12); // interlace

  // Raw image data with filter byte 0 per scanline
  const raw = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 4)] = 0; // filter type None
    for (let x = 0; x < width; x++) {
      const src = (y * width + x) * 4;
      const dst = y * (1 + width * 4) + 1 + x * 4;
      raw[dst]     = pixels[src];
      raw[dst + 1] = pixels[src + 1];
      raw[dst + 2] = pixels[src + 2];
      raw[dst + 3] = pixels[src + 3];
    }
  }

  const compressed = deflateSync(raw, { level: 9 });

  return Buffer.concat([
    PNG_SIG,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── Simple 2D rasterizer ────────────────────────────────────────────────────
class Canvas {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.buf = new Uint8Array(w * h * 4); // RGBA
  }

  setPixel(x, y, r, g, b, a = 255) {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || x >= this.w || y < 0 || y >= this.h) return;
    const i = (y * this.w + x) * 4;
    // Alpha blend over existing
    const srcA = a / 255;
    const dstA = this.buf[i + 3] / 255;
    const outA = srcA + dstA * (1 - srcA);
    if (outA === 0) return;
    this.buf[i]     = Math.round((r * srcA + this.buf[i]     * dstA * (1 - srcA)) / outA);
    this.buf[i + 1] = Math.round((g * srcA + this.buf[i + 1] * dstA * (1 - srcA)) / outA);
    this.buf[i + 2] = Math.round((b * srcA + this.buf[i + 2] * dstA * (1 - srcA)) / outA);
    this.buf[i + 3] = Math.round(outA * 255);
  }

  fillRect(x0, y0, w, h, r, g, b, a = 255) {
    for (let y = y0; y < y0 + h; y++)
      for (let x = x0; x < x0 + w; x++)
        this.setPixel(x, y, r, g, b, a);
  }

  // Filled circle
  fillCircle(cx, cy, radius, r, g, b, a = 255) {
    const r2 = radius * radius;
    for (let y = Math.floor(cy - radius); y <= Math.ceil(cy + radius); y++) {
      for (let x = Math.floor(cx - radius); x <= Math.ceil(cx + radius); x++) {
        const dx = x - cx, dy = y - cy;
        if (dx * dx + dy * dy <= r2) this.setPixel(x, y, r, g, b, a);
      }
    }
  }

  // Anti-aliased circle border
  strokeCircle(cx, cy, radius, lineWidth, r, g, b) {
    const outer = (radius + lineWidth / 2) ** 2;
    const inner = (radius - lineWidth / 2) ** 2;
    for (let y = Math.floor(cy - radius - lineWidth); y <= Math.ceil(cy + radius + lineWidth); y++) {
      for (let x = Math.floor(cx - radius - lineWidth); x <= Math.ceil(cx + radius + lineWidth); x++) {
        const d2 = (x - cx) ** 2 + (y - cy) ** 2;
        if (d2 >= inner && d2 <= outer) this.setPixel(x, y, r, g, b);
      }
    }
  }

  // Rounded rect fill
  fillRoundRect(x0, y0, w, h, rx, r, g, b, a = 255) {
    for (let y = y0; y < y0 + h; y++) {
      for (let x = x0; x < x0 + w; x++) {
        let inside = true;
        // Check corner radii
        if (x < x0 + rx && y < y0 + rx) {
          const dx = x - (x0 + rx), dy = y - (y0 + rx);
          inside = dx * dx + dy * dy <= rx * rx;
        } else if (x >= x0 + w - rx && y < y0 + rx) {
          const dx = x - (x0 + w - rx - 1), dy = y - (y0 + rx);
          inside = dx * dx + dy * dy <= rx * rx;
        } else if (x < x0 + rx && y >= y0 + h - rx) {
          const dx = x - (x0 + rx), dy = y - (y0 + h - rx - 1);
          inside = dx * dx + dy * dy <= rx * rx;
        } else if (x >= x0 + w - rx && y >= y0 + h - rx) {
          const dx = x - (x0 + w - rx - 1), dy = y - (y0 + h - rx - 1);
          inside = dx * dx + dy * dy <= rx * rx;
        }
        if (inside) this.setPixel(x, y, r, g, b, a);
      }
    }
  }

  // Thick line (Bresenham + width)
  strokeLine(x0, y0, x1, y1, lw, r, g, b) {
    const dx = x1 - x0, dy = y1 - y0;
    const len = Math.hypot(dx, dy);
    if (len === 0) return;
    const nx = -dy / len, ny = dx / len;
    const hw = lw / 2;
    const steps = Math.ceil(len) * 2;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const px = x0 + dx * t, py = y0 + dy * t;
      for (let w = -hw; w <= hw; w++) {
        this.setPixel(Math.round(px + nx * w), Math.round(py + ny * w), r, g, b);
      }
    }
  }

  toPNG() { return buildPNG(this.w, this.h, this.buf); }
}

// ── Render the Авантура brand icon ──────────────────────────────────────────
// Design: coral rounded-rect background + white layered-flag icon (simplified)
function renderIcon(size, { maskable = false } = {}) {
  const c = new Canvas(size, size);
  const s = size / 192; // scale factor relative to 192px base

  // Brand colours
  const CORAL   = [230, 108,  79];
  const DARK    = [ 42,  37,  34];
  const WHITE   = [255, 255, 255];
  const CREAM   = [251, 248, 240];

  if (maskable) {
    // Maskable: fill entire canvas (safe zone = center 80%)
    c.fillRect(0, 0, size, size, ...CORAL);
  } else {
    // Regular: rounded rect with small shadow
    const pad = Math.round(8 * s);
    const rx  = Math.round(36 * s);
    // Shadow (dark, offset)
    c.fillRoundRect(pad + 4*s, pad + 4*s, size - pad*2, size - pad*2, rx, ...DARK, 60);
    // Background
    c.fillRoundRect(pad, pad, size - pad*2, size - pad*2, rx, ...CORAL);
  }

  // ── Draw the icon: simplified "layers / mountain peak" ──────────────────
  // Three horizontal lines (layered diamond shape) centered
  const cx = size / 2;
  const baseY = size * 0.62;
  const lw = Math.max(2, Math.round(7 * s));
  const halfW = size * 0.30;
  const gap   = size * 0.085;

  // Row 3 (bottom, widest)
  c.strokeLine(cx - halfW, baseY, cx + halfW, baseY, lw, ...WHITE);
  // Row 2 (middle)
  c.strokeLine(cx - halfW * 0.66, baseY - gap, cx + halfW * 0.66, baseY - gap, lw, ...WHITE);
  // Row 1 (top, narrowest — peak triangle)
  c.strokeLine(cx - halfW * 0.33, baseY - gap * 2, cx + halfW * 0.33, baseY - gap * 2, lw, ...WHITE);

  // Top peak dot
  c.fillCircle(cx, baseY - gap * 2 - lw * 1.8, lw * 1.2, ...WHITE);

  // Small "A" accent — coral pill below icon
  if (!maskable) {
    const pillW = Math.round(48 * s);
    const pillH = Math.round(18 * s);
    const pillY = baseY + gap * 1.4;
    c.fillRoundRect(cx - pillW/2, pillY, pillW, pillH, pillH/2, ...CREAM, 200);
  }

  return c.toPNG();
}

// ── Write files ─────────────────────────────────────────────────────────────
const icons = [
  { file: 'icon-192.png',          size: 192, maskable: false },
  { file: 'icon-512.png',          size: 512, maskable: false },
  { file: 'icon-512-maskable.png', size: 512, maskable: true  },
  { file: 'apple-touch-icon.png',  size: 180, maskable: false },
];

for (const { file, size, maskable } of icons) {
  const png = renderIcon(size, { maskable });
  const dest = join(OUT, file);
  writeFileSync(dest, png);
  console.log(`✅  ${file}  (${png.length} bytes)`);
}

console.log('\nDone! Update manifest.json and index.html to reference the new icons.');
