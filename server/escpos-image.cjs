// Convert PNG image buffer to ESC/POS raster bytes (GS v 0)
// Requires: pngjs

const { PNG } = require('pngjs');

function rgbaToBit(image, threshold = 200) {
  const { width, height, data } = image; // RGBA
  const bytesPerRow = Math.ceil(width / 8);
  const out = Buffer.alloc(bytesPerRow * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx], g = data[idx + 1], b = data[idx + 2], a = data[idx + 3];
      const lum = a === 0 ? 255 : (0.299 * r + 0.587 * g + 0.114 * b);
      const bit = lum < threshold ? 1 : 0; // 1 = black dot
      const byteIndex = y * bytesPerRow + (x >> 3);
      const bitIndex = 7 - (x & 7);
      if (bit) out[byteIndex] |= (1 << bitIndex);
    }
  }
  return { width, height, bytesPerRow, data: out };
}

function buildEscPosRasterFromMono({ height, bytesPerRow, data }) {
  const chunks = [];
  // Initialize
  chunks.push(Buffer.from([0x1B, 0x40]));
  // Center align
  chunks.push(Buffer.from([0x1B, 0x61, 0x01]));
  // GS v 0 m xL xH yL yH
  const m = 0; // normal
  const xL = bytesPerRow & 0xff;
  const xH = (bytesPerRow >> 8) & 0xff;
  const yL = height & 0xff;
  const yH = (height >> 8) & 0xff;
  chunks.push(Buffer.from([0x1D, 0x76, 0x30, m, xL, xH, yL, yH]));
  chunks.push(data);
  chunks.push(Buffer.from([0x0A, 0x0A])); // feed
  chunks.push(Buffer.from([0x1D, 0x56, 0x42, 0x00])); // partial cut
  return Buffer.concat(chunks);
}

function buildEscPosFromPngBuffer(pngBuffer, { threshold = 200 } = {}) {
  const png = PNG.sync.read(pngBuffer);
  const mono = rgbaToBit(png, threshold);
  return buildEscPosRasterFromMono(mono);
}

module.exports = { buildEscPosFromPngBuffer };

