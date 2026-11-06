/**
 * Programmatic PWA PNG Icon Generator for Curation Kitchen
 * Uses Node built-ins (zlib, fs, path) to produce compliant PNG assets:
 * - pwa-192x192.png
 * - pwa-512x512.png
 * - pwa-maskable-512x512.png (with safe-zone 15% padding)
 * - apple-touch-icon.png (180x180)
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type);
  const crcBuf = Buffer.alloc(4);
  const crc = crc32(Buffer.concat([typeBuf, data]));
  crcBuf.writeUInt32BE(crc, 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function createPng(width, height, pixelFn) {
  const rowSize = width * 4 + 1;
  const rawData = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter: None
    for (let x = 0; x < width; x++) {
      const px = rowOffset + 1 + x * 4;
      const [r, g, b, a] = pixelFn(x, y, width, height);
      rawData[px] = r;
      rawData[px + 1] = g;
      rawData[px + 2] = b;
      rawData[px + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData);
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0))
  ]);
}

// Brand color palette
const Terracotta = [217, 83, 56];    // #D95338
const DeepOrange = [192, 57, 43];    // #C0392B
const ButterCream = [250, 246, 238]; // #FAF6EE
const WarmGold = [245, 158, 11];     // #F59E0B
const LightCream = [255, 255, 255];  // #FFFFFF

function drawIconPixel(x, y, w, h, isMaskable = false) {
  const nx = x / w;
  const ny = y / h;

  // Background terracotta gradient
  const grad = ny;
  let r = Math.round(Terracotta[0] * (1 - grad * 0.25) + DeepOrange[0] * (grad * 0.25));
  let g = Math.round(Terracotta[1] * (1 - grad * 0.3) + DeepOrange[1] * (grad * 0.3));
  let b = Math.round(Terracotta[2] * (1 - grad * 0.3) + DeepOrange[2] * (grad * 0.3));
  let a = 255;

  // For non-maskable icons, render rounded squircle border radius
  if (!isMaskable) {
    const radius = 0.22;
    const dx = Math.abs(nx - 0.5);
    const dy = Math.abs(ny - 0.5);
    const cornerDx = Math.max(0, dx - (0.5 - radius));
    const cornerDy = Math.max(0, dy - (0.5 - radius));
    if (cornerDx * cornerDx + cornerDy * cornerDy > radius * radius) {
      return [0, 0, 0, 0]; // Transparent outside squircle
    }
  }

  // Cloche / Dome geometry
  // Maskable mode has safe padding (scale by 0.75)
  const scale = isMaskable ? 0.72 : 0.85;
  const cx = 0.5;
  const cy = 0.5;
  const lx = (nx - cx) / scale + 0.5;
  const ly = (ny - cy) / scale + 0.5;

  // Handle Ball at top
  const handleDx = lx - 0.5;
  const handleDy = ly - 0.28;
  if (handleDx * handleDx + handleDy * handleDy <= 0.04 * 0.04) {
    return [WarmGold[0], WarmGold[1], WarmGold[2], 255];
  }

  // Dome of the cloche: semi-ellipse from y=0.32 to y=0.58, width 0.3
  if (ly >= 0.32 && ly <= 0.58) {
    const ey = (ly - 0.58) / 0.26;
    const ex = (lx - 0.5) / 0.30;
    if (ex * ex + ey * ey <= 1.0) {
      return [ButterCream[0], ButterCream[1], ButterCream[2], 255];
    }
  }

  // Cloche Rim Base
  if (ly > 0.58 && ly <= 0.63 && Math.abs(lx - 0.5) <= 0.34) {
    return [WarmGold[0], WarmGold[1], WarmGold[2], 255];
  }

  // Serving platter plate
  if (ly > 0.65 && ly <= 0.72) {
    const px = (lx - 0.5) / 0.40;
    const py = (ly - 0.68) / 0.04;
    if (px * px + py * py <= 1.0) {
      return [ButterCream[0], ButterCream[1], ButterCream[2], 240];
    }
  }

  // AI Sparkle Star top right
  const starDx = Math.abs(lx - 0.70);
  const starDy = Math.abs(ly - 0.28);
  if ((starDx + starDy < 0.04) || (starDx < 0.01 && starDy < 0.05) || (starDy < 0.01 && starDx < 0.05)) {
    return [WarmGold[0], WarmGold[1], WarmGold[2], 255];
  }

  return [r, g, b, a];
}

const publicDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

console.log('Generating PWA PNG icons for Curation Kitchen...');

// 1. pwa-192x192.png
const pwa192 = createPng(192, 192, (x, y, w, h) => drawIconPixel(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), pwa192);
console.log('✓ Created public/pwa-192x192.png');

// 2. pwa-512x512.png
const pwa512 = createPng(512, 512, (x, y, w, h) => drawIconPixel(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), pwa512);
console.log('✓ Created public/pwa-512x512.png');

// 3. pwa-maskable-512x512.png
const pwaMaskable = createPng(512, 512, (x, y, w, h) => drawIconPixel(x, y, w, h, true));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), pwaMaskable);
console.log('✓ Created public/pwa-maskable-512x512.png');

// 4. apple-touch-icon.png (180x180)
const appleTouch = createPng(180, 180, (x, y, w, h) => drawIconPixel(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), appleTouch);
console.log('✓ Created public/apple-touch-icon.png');

console.log('All PWA icons generated successfully.');
