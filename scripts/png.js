import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import * as iq from 'image-q';
import { PALETTE } from '../src/art/palette.js';

// Grava um PixelCanvas como PNG (usado pelo gerador de assets e pelas prévias).

const crcTable = Uint32Array.from({ length: 256 }, (_, number) => {
  let value = number;
  for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const name = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([length, name, data, checksum]);
}

const iqPalette = new iq.utils.Palette();
for (const hex of PALETTE) {
  const value = Number.parseInt(hex.slice(1), 16);
  iqPalette.add(iq.utils.Point.createByRGBA(value >> 16, (value >> 8) & 255, value & 255, 255));
}

/** Quantiza um buffer RGBA para a paleta-mestre com image-q (CIEDE2000, sem dithering). O alfa fica igual. */
export function quantizeToPalette(canvas) {
  const source = canvas.data;
  const opaque = new Uint8Array(source.length);
  opaque.set(source);
  for (let at = 3; at < opaque.length; at += 4) opaque[at] = 255;
  const points = iq.utils.PointContainer.fromUint8Array(opaque, canvas.width, canvas.height);
  const mapped = iq.applyPaletteSync(points, iqPalette, { colorDistanceFormula: 'ciede2000', imageQuantization: 'nearest' }).toUint8Array();
  for (let at = 0; at < source.length; at += 4) {
    if (source[at + 3] === 0) continue;
    source[at] = mapped[at];
    source[at + 1] = mapped[at + 1];
    source[at + 2] = mapped[at + 2];
  }
  return canvas;
}

export function writePng(file, canvas, { quantize = true } = {}) {
  if (quantize) quantizeToPalette(canvas);
  const pixels = Buffer.from(canvas.data.buffer, canvas.data.byteOffset, canvas.data.byteLength);
  const scanlines = Buffer.alloc((canvas.width * 4 + 1) * canvas.height);
  for (let y = 0; y < canvas.height; y += 1) {
    const row = y * (canvas.width * 4 + 1);
    scanlines[row] = 0;
    pixels.copy(scanlines, row + 1, y * canvas.width * 4, (y + 1) * canvas.width * 4);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(canvas.width, 0);
  header.writeUInt32BE(canvas.height, 4);
  header[8] = 8;
  header[9] = 6;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', zlib.deflateSync(scanlines, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]));
}

/** Lê um PNG RGBA de 8 bits (os gerados por writePng) e devolve { width, height, data }. */
export function readPng(file) {
  const buffer = fs.readFileSync(file);
  let offset = 8;
  let width = 0;
  let height = 0;
  const idat = [];
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      if (data[8] !== 8 || data[9] !== 6) throw new Error(`${file}: só PNG RGBA 8 bits`);
    } else if (type === 'IDAT') idat.push(data);
    offset += 12 + length;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * 4;
  const out = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    const filter = raw[y * (stride + 1)];
    for (let x = 0; x < stride; x += 1) {
      const value = raw[y * (stride + 1) + 1 + x];
      const left = x >= 4 ? out[y * stride + x - 4] : 0;
      const up = y > 0 ? out[(y - 1) * stride + x] : 0;
      const upLeft = y > 0 && x >= 4 ? out[(y - 1) * stride + x - 4] : 0;
      let predictor = 0;
      if (filter === 1) predictor = left;
      else if (filter === 2) predictor = up;
      else if (filter === 3) predictor = Math.floor((left + up) / 2);
      else if (filter === 4) {
        const p = left + up - upLeft;
        const pa = Math.abs(p - left);
        const pb = Math.abs(p - up);
        const pc = Math.abs(p - upLeft);
        predictor = pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft;
      }
      out[y * stride + x] = (value + predictor) & 255;
    }
  }
  return { width, height, data: out };
}

/** Recorta os quadros de um atlas (PNG + JSON da Phaser) em { nome: { width, height, data } }. */
export function readAtlas(pngFile, jsonFile) {
  const image = readPng(pngFile);
  const atlas = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
  const frames = {};
  for (const [name, entry] of Object.entries(atlas.frames)) {
    const { x, y, w, h } = entry.frame;
    const data = new Uint8ClampedArray(w * h * 4);
    for (let row = 0; row < h; row += 1) {
      data.set(image.data.subarray(((y + row) * image.width + x) * 4, ((y + row) * image.width + x + w) * 4), row * w * 4);
    }
    frames[name] = { width: w, height: h, data };
  }
  return frames;
}
