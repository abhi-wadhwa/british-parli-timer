// Generates a full set of macOS app-icon PNGs (16…1024) for packing
// into an .icns.  Pure-Node — no external image libs.
//
// Design: Big-Sur-style rounded-square icon.
//   - Deep navy gradient background (matches the popup card color)
//   - Centered white bell glyph with a subtle drop shadow
//   - Small clock-hand accent at 7:00 (debate speech length) in gold
//
// Run:  node assets/makeAppIcon.js
// Output: assets/icon.iconset/icon_{size}.png ready for `iconutil`.

const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

// ---------- PNG encoder (copied from makeIcon.js) ----------
function crc32(buf) {
  let c; const t = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = (t[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)) >>> 0;
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}
function encodePNG(w, h, rgba) {
  const sig = Buffer.from([137,80,78,71,13,10,26,10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

// ---------- 2D helpers ----------
function lerp(a, b, t) { return a + (b - a) * t; }
function lerpColor(a, b, t) {
  return [Math.round(lerp(a[0], b[0], t)), Math.round(lerp(a[1], b[1], t)), Math.round(lerp(a[2], b[2], t))];
}
function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

// Anti-aliased pixel set (alpha = 0..1, color = [r,g,b]).
function blend(rgba, size, x, y, color, alpha) {
  if (x < 0 || y < 0 || x >= size || y >= size || alpha <= 0) return;
  const i = (y * size + x) * 4;
  const dr = rgba[i], dg = rgba[i+1], db = rgba[i+2], da = rgba[i+3] / 255;
  const sa = Math.min(1, alpha);
  const outA = sa + da * (1 - sa);
  if (outA <= 0) return;
  rgba[i]   = Math.round((color[0] * sa + dr * da * (1 - sa)) / outA);
  rgba[i+1] = Math.round((color[1] * sa + dg * da * (1 - sa)) / outA);
  rgba[i+2] = Math.round((color[2] * sa + db * da * (1 - sa)) / outA);
  rgba[i+3] = Math.round(outA * 255);
}

// Fill a rounded-rectangle with vertical gradient (top color → bottom color).
function drawRoundedGradient(rgba, size, x0, y0, x1, y1, radius, top, bot) {
  for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) {
    for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) {
      // distance from rounded rect (signed): 0 inside, >0 outside, <0 deep inside
      const cx = clamp(x, x0 + radius, x1 - radius);
      const cy = clamp(y, y0 + radius, y1 - radius);
      const dx = x - cx, dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy) - radius;
      if (dist < 1) {
        const t = clamp((y - y0) / (y1 - y0), 0, 1);
        const c = lerpColor(top, bot, t);
        const alpha = dist <= 0 ? 1 : (1 - dist); // 1px AA edge
        blend(rgba, size, x, y, c, alpha);
      }
    }
  }
}

// Fill a filled circle with optional AA.
function drawCircle(rgba, size, cx, cy, r, color, alphaMul = 1) {
  const x0 = Math.floor(cx - r - 1), x1 = Math.ceil(cx + r + 1);
  const y0 = Math.floor(cy - r - 1), y1 = Math.ceil(cy + r + 1);
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      const a = clamp(r - d + 0.5, 0, 1) * alphaMul;
      if (a > 0) blend(rgba, size, x, y, color, a);
    }
  }
}

// Stroked line segment with thickness.
function drawLine(rgba, size, x0, y0, x1, y1, thickness, color) {
  const dx = x1 - x0, dy = y1 - y0;
  const len = Math.sqrt(dx * dx + dy * dy);
  const steps = Math.ceil(len * 2);
  const r = thickness / 2;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = x0 + dx * t;
    const y = y0 + dy * t;
    drawCircle(rgba, size, x, y, r, color);
  }
}

// Bell glyph into a given square region (cx, cy, radius).  `color` + alpha.
function drawBellGlyph(rgba, size, cx, cy, scale, color, alphaMul = 1) {
  // Dome
  const yTop = cy - scale * 0.55;
  const yBot = cy + scale * 0.22;
  const maxHalfW = scale * 0.60;

  for (let y = Math.floor(yTop - 1); y <= Math.ceil(yBot + 1); y++) {
    if (y < yTop - 1 || y > yBot + 1) continue;
    const ty = (y - yTop) / (yBot - yTop);
    if (ty < 0 || ty > 1) continue;
    const hw = maxHalfW * Math.sqrt(Math.max(0, 1 - Math.pow(1 - ty, 2.2)));
    for (let x = cx - hw - 1; x <= cx + hw + 1; x++) {
      const edge = Math.min(
        hw - Math.abs(x - cx) + 0.5,
        1
      );
      const a = clamp(edge, 0, 1) * alphaMul;
      if (a > 0) blend(rgba, size, Math.round(x), y, color, a);
    }
  }

  // Rim
  const rimY0 = yBot;
  const rimH = Math.max(2, scale * 0.11);
  const rimHW = maxHalfW + scale * 0.07;
  for (let y = rimY0; y <= rimY0 + rimH; y++) {
    for (let x = cx - rimHW; x <= cx + rimHW; x++) {
      const a = alphaMul;
      blend(rgba, size, Math.round(x), Math.round(y), color, a);
    }
  }

  // Clapper
  drawCircle(rgba, size, cx, rimY0 + rimH + scale * 0.11, scale * 0.10, color, alphaMul);

  // Handle stub
  const hY0 = yTop - scale * 0.18;
  const hY1 = yTop + 1;
  const hHW = scale * 0.10;
  for (let y = hY0; y < hY1; y++) {
    for (let x = cx - hHW; x <= cx + hHW; x++) {
      blend(rgba, size, Math.round(x), Math.round(y), color, alphaMul);
    }
  }
}

// ---------- Main draw ----------
function drawAppIcon(size) {
  const rgba = Buffer.alloc(size * size * 4);

  // Safe-area margin (macOS icon design guideline ~10% padding)
  const pad = size * 0.10;
  const radius = size * 0.225; // Big-Sur squircle radius
  const x0 = pad, y0 = pad, x1 = size - pad, y1 = size - pad;

  // Background: deep navy gradient
  const top = [0x1e, 0x2b, 0x4a]; // slate-900 / indigo-tint
  const bot = [0x0b, 0x12, 0x24]; // near-black navy
  drawRoundedGradient(rgba, size, x0, y0, x1, y1, radius, top, bot);

  // Inner subtle highlight line (top edge)
  // A very faint bright rim gives the icon depth without a big stroke.
  {
    const hi = [0x3b, 0x4f, 0x7a];
    for (let x = x0 + radius; x <= x1 - radius; x++) {
      blend(rgba, size, Math.round(x), Math.round(y0 + 1), hi, 0.28);
      blend(rgba, size, Math.round(x), Math.round(y0 + 2), hi, 0.15);
    }
  }

  // Bell drop shadow
  const cx = size / 2, cy = size * 0.47;
  const bellScale = size * 0.32;
  const shadow = [0, 0, 0];
  for (let i = 0; i < 6; i++) {
    const off = i * (size * 0.004);
    drawBellGlyph(rgba, size, cx, cy + off + size * 0.012, bellScale, shadow, 0.05);
  }

  // Bell body (warm white)
  drawBellGlyph(rgba, size, cx, cy, bellScale, [0xfa, 0xfa, 0xf5], 1.0);

  // "7:00" gold text beneath the bell — a subtle nod to BP speech length.
  // Render as a small pill-shaped badge with the digits drawn via strokes.
  const gold = [0xea, 0xb3, 0x08];
  const badgeCy = cy + bellScale * 0.95;
  const badgeW = size * 0.22;
  const badgeH = size * 0.085;
  const badgeX0 = cx - badgeW / 2;
  const badgeX1 = cx + badgeW / 2;
  const badgeY0 = badgeCy - badgeH / 2;
  const badgeY1 = badgeCy + badgeH / 2;
  const badgeR = badgeH / 2;
  // Filled gold pill
  for (let y = Math.floor(badgeY0); y <= Math.ceil(badgeY1); y++) {
    for (let x = Math.floor(badgeX0); x <= Math.ceil(badgeX1); x++) {
      const ccx = clamp(x, badgeX0 + badgeR, badgeX1 - badgeR);
      const ccy = clamp(y, badgeY0 + badgeR, badgeY1 - badgeR);
      const d = Math.sqrt((x - ccx) ** 2 + (y - ccy) ** 2) - badgeR;
      if (d < 1) blend(rgba, size, x, y, gold, d <= 0 ? 1 : 1 - d);
    }
  }
  // "7:00" glyphs drawn as simple segments on the pill
  // Layout: 7  :  0  0   — four glyph slots
  const digitH = badgeH * 0.55;
  const digitW = digitH * 0.55;
  const gap = digitW * 0.28;
  // Total width = 4 glyphs (7, :, 0, 0) with gaps
  const totalW = digitW * 4 + gap * 3;
  let gx = cx - totalW / 2;
  const gyTop = badgeCy - digitH / 2;
  const gyBot = badgeCy + digitH / 2;
  const stroke = Math.max(1.2, size * 0.010);
  const ink = [0x0b, 0x12, 0x24];
  // 7: horizontal top + diagonal
  drawLine(rgba, size, gx, gyTop, gx + digitW, gyTop, stroke, ink);
  drawLine(rgba, size, gx + digitW, gyTop, gx + digitW * 0.25, gyBot, stroke, ink);
  gx += digitW + gap;
  // : two dots
  drawCircle(rgba, size, gx + digitW / 2, gyTop + digitH * 0.3, stroke * 0.7, ink);
  drawCircle(rgba, size, gx + digitW / 2, gyTop + digitH * 0.7, stroke * 0.7, ink);
  gx += digitW + gap;
  // 0: oval outline
  const draw0 = (ox) => {
    const cx0 = ox + digitW / 2;
    const cy0 = badgeCy;
    const rx = digitW / 2, ry = digitH / 2;
    const steps = 60;
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const x = cx0 + Math.cos(a) * rx;
      const y = cy0 + Math.sin(a) * ry;
      drawCircle(rgba, size, x, y, stroke / 2, ink);
    }
  };
  draw0(gx); gx += digitW + gap;
  draw0(gx);

  return rgba;
}

// ---------- Write all iconset sizes ----------
const sizes = [
  { px: 16,   name: 'icon_16x16.png' },
  { px: 32,   name: 'icon_16x16@2x.png' },
  { px: 32,   name: 'icon_32x32.png' },
  { px: 64,   name: 'icon_32x32@2x.png' },
  { px: 128,  name: 'icon_128x128.png' },
  { px: 256,  name: 'icon_128x128@2x.png' },
  { px: 256,  name: 'icon_256x256.png' },
  { px: 512,  name: 'icon_256x256@2x.png' },
  { px: 512,  name: 'icon_512x512.png' },
  { px: 1024, name: 'icon_512x512@2x.png' },
];

const outDir = path.join(__dirname, 'icon.iconset');
fs.mkdirSync(outDir, { recursive: true });

for (const s of sizes) {
  const rgba = drawAppIcon(s.px);
  const png = encodePNG(s.px, s.px, rgba);
  fs.writeFileSync(path.join(outDir, s.name), png);
  console.log('  wrote', s.name, `(${s.px}x${s.px}, ${png.length} B)`);
}
console.log('Done. Next: run `iconutil -c icns assets/icon.iconset -o assets/icon.icns`');
