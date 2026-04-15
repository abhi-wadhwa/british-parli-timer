// Generates a minimal bell-glyph PNG (pure alpha) for use as a macOS
// menu-bar template image. No external deps — hand-rolled PNG encoder
// with zlib (which ships with Node).
//
// Run:  node assets/makeIcon.js
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

function crc32(buf) {
  let c;
  const table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    table[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = (table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)) >>> 0;
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePNG(width, height, rgba) {
  const signature = Buffer.from([137,80,78,71,13,10,26,10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // color type: RGBA
  ihdr[10] = 0;  // compression
  ihdr[11] = 0;  // filter
  ihdr[12] = 0;  // interlace

  // Raw scanlines with filter byte 0 prepended
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const idat = zlib.deflateSync(raw);

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// Draw a bell into an alpha mask.  Template images on macOS should be
// pure black pixels with varying alpha — macOS handles tinting.
function drawBell(size) {
  const rgba = Buffer.alloc(size * size * 4); // zero = transparent
  const cx = size / 2;
  // Bell dome: rounded-top shape — approximate with a superellipse/filled
  // region defined by horizontal extent as a function of y.
  //
  // We define the dome from y_top to y_bot with half-width w(y), then
  // add a rim, a clapper, and a handle stub on top.
  const yTop = size * 0.18;
  const yBot = size * 0.72;
  const domeH = yBot - yTop;
  const maxHalfW = size * 0.34;

  function set(x, y, a) {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const i = (y * size + x) * 4;
    const cur = rgba[i + 3];
    const na = Math.min(255, cur + a);
    rgba[i] = 0; rgba[i+1] = 0; rgba[i+2] = 0;
    rgba[i+3] = na;
  }

  // Fill dome
  for (let y = 0; y < size; y++) {
    if (y < yTop || y > yBot) continue;
    const t = (y - yTop) / domeH; // 0 at top, 1 at bottom
    // Smooth curve: near-circular at top, widening to full width at bottom
    const hw = maxHalfW * Math.sqrt(Math.max(0, 1 - Math.pow(1 - t, 2.2)));
    for (let x = cx - hw; x <= cx + hw; x++) set(x, y, 255);
  }

  // Rim (slightly wider bar under dome)
  const rimY = yBot;
  const rimH = Math.max(1, Math.round(size * 0.055));
  const rimHW = maxHalfW + size * 0.04;
  for (let y = rimY; y < rimY + rimH; y++) {
    for (let x = cx - rimHW; x <= cx + rimHW; x++) set(x, y, 255);
  }

  // Clapper (little circle under the rim)
  const clY = rimY + rimH + size * 0.04;
  const clR = size * 0.07;
  for (let y = clY - clR; y <= clY + clR; y++) {
    for (let x = cx - clR; x <= cx + clR; x++) {
      if ((x - cx) ** 2 + (y - clY) ** 2 <= clR * clR) set(x, y, 255);
    }
  }

  // Handle stub on top
  const hY0 = yTop - size * 0.10;
  const hY1 = yTop + 1;
  const hHW = size * 0.06;
  for (let y = hY0; y < hY1; y++) {
    for (let x = cx - hHW; x <= cx + hHW; x++) set(x, y, 255);
  }

  return rgba;
}

function write(size, filename) {
  const rgba = drawBell(size);
  const png = encodePNG(size, size, rgba);
  const out = path.join(__dirname, filename);
  fs.writeFileSync(out, png);
  console.log('Wrote', out, png.length, 'bytes');
}

write(16, 'trayTemplate.png');
write(32, 'trayTemplate@2x.png');
