import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const root = path.resolve('public/assets');
const color = (hex, alpha = 255) => [
  Number.parseInt(hex.slice(1, 3), 16),
  Number.parseInt(hex.slice(3, 5), 16),
  Number.parseInt(hex.slice(5, 7), 16),
  alpha
];

class PixelCanvas {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.data = Buffer.alloc(width * height * 4);
  }

  pixel(x, y, value, alpha = 255) {
    x = Math.floor(x);
    y = Math.floor(y);
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    const [red, green, blue, sourceAlpha] = color(value, alpha);
    const index = (y * this.width + x) * 4;
    const destinationAlpha = this.data[index + 3];
    if (sourceAlpha === 255 || destinationAlpha === 0) {
      this.data[index] = red;
      this.data[index + 1] = green;
      this.data[index + 2] = blue;
      this.data[index + 3] = sourceAlpha;
      return;
    }
    const outAlpha = sourceAlpha + destinationAlpha * (255 - sourceAlpha) / 255;
    const blend = (source, destination) =>
      Math.round((source * sourceAlpha + destination * destinationAlpha * (255 - sourceAlpha) / 255) / outAlpha);
    this.data[index] = blend(red, this.data[index]);
    this.data[index + 1] = blend(green, this.data[index + 1]);
    this.data[index + 2] = blend(blue, this.data[index + 2]);
    this.data[index + 3] = Math.round(outAlpha);
  }

  rect(x, y, width, height, fill) {
    for (let py = y; py < y + height; py += 1) {
      for (let px = x; px < x + width; px += 1) this.pixel(px, py, fill);
    }
  }

  line(x0, y0, x1, y1, fill, alpha = 255) {
    let dx = Math.abs(x1 - x0);
    let sx = x0 < x1 ? 1 : -1;
    let dy = -Math.abs(y1 - y0);
    let sy = y0 < y1 ? 1 : -1;
    let error = dx + dy;
    while (true) {
      this.pixel(x0, y0, fill, alpha);
      if (x0 === x1 && y0 === y1) break;
      const twice = 2 * error;
      if (twice >= dy) {
        error += dy;
        x0 += sx;
      }
      if (twice <= dx) {
        error += dx;
        y0 += sy;
      }
    }
  }

  ellipse(cx, cy, rx, ry, fill, alpha = 255) {
    for (let y = -ry; y <= ry; y += 1) {
      for (let x = -rx; x <= rx; x += 1) {
        if ((x * x) / (rx * rx) + (y * y) / (ry * ry) <= 1) {
          this.pixel(cx + x, cy + y, fill, alpha);
        }
      }
    }
  }

  polygon(points, fill, alpha = 255) {
    const minY = Math.min(...points.map((point) => point[1]));
    const maxY = Math.max(...points.map((point) => point[1]));
    for (let y = minY; y <= maxY; y += 1) {
      const intersections = [];
      for (let index = 0; index < points.length; index += 1) {
        const [x1, y1] = points[index];
        const [x2, y2] = points[(index + 1) % points.length];
        if ((y1 <= y && y2 > y) || (y2 <= y && y1 > y)) {
          intersections.push(x1 + ((y - y1) * (x2 - x1)) / (y2 - y1));
        }
      }
      intersections.sort((a, b) => a - b);
      for (let index = 0; index < intersections.length; index += 2) {
        for (let x = Math.ceil(intersections[index]); x <= intersections[index + 1]; x += 1) {
          this.pixel(x, y, fill, alpha);
        }
      }
    }
  }

  blit(source, x, y) {
    for (let py = 0; py < source.height; py += 1) {
      for (let px = 0; px < source.width; px += 1) {
        const from = (py * source.width + px) * 4;
        if (source.data[from + 3] > 0) {
          const to = ((y + py) * this.width + x + px) * 4;
          source.data.copy(this.data, to, from, from + 4);
        }
      }
    }
  }
}

const crcTable = Uint32Array.from({ length: 256 }, (_, number) => {
  let value = number;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
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

function writePng(file, canvas) {
  const scanlines = Buffer.alloc((canvas.width * 4 + 1) * canvas.height);
  for (let y = 0; y < canvas.height; y += 1) {
    const row = y * (canvas.width * 4 + 1);
    scanlines[row] = 0;
    canvas.data.copy(scanlines, row + 1, y * canvas.width * 4, (y + 1) * canvas.width * 4);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(canvas.width, 0);
  header.writeUInt32BE(canvas.height, 4);
  header[8] = 8;
  header[9] = 6;
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', zlib.deflateSync(scanlines)),
    chunk('IEND', Buffer.alloc(0))
  ]);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, png);
}

function makeSheet(file, frameWidth, frameHeight, columns, rows, drawFrame) {
  const sheet = new PixelCanvas(frameWidth * columns, frameHeight * rows);
  for (let frame = 0; frame < columns * rows; frame += 1) {
    const x = (frame % columns) * frameWidth;
    const y = Math.floor(frame / columns) * frameHeight;
    drawFrame(sheet, x, y, frame);
  }
  writePng(path.join(root, file), sheet);
}

function makeAtlas(file, entries) {
  const atlasWidth = 256;
  let x = 2;
  let y = 2;
  let rowHeight = 0;
  const positions = [];
  for (const entry of entries) {
    if (entry.width + 4 > atlasWidth) {
      throw new Error(`Atlas frame ${entry.name} exceeds the ${atlasWidth}px atlas width`);
    }
    if (x + entry.width + 2 > atlasWidth) {
      x = 2;
      y += rowHeight + 2;
      rowHeight = 0;
    }
    positions.push({ ...entry, x, y });
    x += entry.width + 2;
    rowHeight = Math.max(rowHeight, entry.height);
  }
  const atlasHeight = y + rowHeight + 2;
  const atlas = new PixelCanvas(atlasWidth, atlasHeight);
  const frames = {};
  for (const entry of positions) {
    const sprite = new PixelCanvas(entry.width, entry.height);
    entry.draw(sprite);
    atlas.blit(sprite, entry.x, entry.y);
    frames[entry.name] = {
      frame: { x: entry.x, y: entry.y, w: entry.width, h: entry.height },
      rotated: false,
      trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: entry.width, h: entry.height },
      sourceSize: { w: entry.width, h: entry.height }
    };
  }
  const directory = path.dirname(file);
  const image = path.basename(file, '.json') + '.png';
  writePng(path.join(root, directory, image), atlas);
  fs.writeFileSync(path.join(root, file), JSON.stringify({
    frames,
    meta: {
      app: 'LENDAS asset generator',
      version: '1.0',
      image,
      format: 'RGBA8888',
      size: { w: atlasWidth, h: atlasHeight },
      scale: '1'
    }
  }, null, 2));
}

const grass = ['#477447', '#4e7d49', '#416b43', '#57804a'];
function drawGrass(canvas, ox, oy, frame) {
  const base = grass[frame % grass.length];
  canvas.rect(ox, oy, 16, 16, base);
  for (let y = 0; y < 16; y += 1) {
    for (let x = 0; x < 16; x += 1) {
      const value = (x * 7 + y * 11 + frame * 5) % 17;
      if (value === 0 || value === 5) canvas.pixel(ox + x, oy + y, '#3f6940');
      else if (value === 9) canvas.pixel(ox + x, oy + y, '#5a8750');
    }
  }
  const flecks = [
    [1, 3, '#629052'], [5, 1, '#578449'], [11, 4, '#3b633d'],
    [14, 9, '#649052'], [6, 12, '#3d6840'], [2, 14, '#527e47']
  ];
  for (const [x, y, shade] of flecks) canvas.pixel(ox + x, oy + y, shade);
  if (frame === 1) {
    canvas.line(ox + 7, oy + 11, ox + 7, oy + 6, '#a7bf69');
    canvas.pixel(ox + 6, oy + 5, '#f5d88a');
    canvas.pixel(ox + 8, oy + 5, '#f5d88a');
    canvas.pixel(ox + 7, oy + 4, '#fff0bb');
    canvas.pixel(ox + 7, oy + 5, '#b85650');
  } else if (frame === 2) {
    canvas.ellipse(ox + 6, oy + 10, 3, 2, '#827c68');
    canvas.pixel(ox + 5, oy + 9, '#c7b99a');
    canvas.pixel(ox + 13, oy + 4, '#b7aa8a');
  } else if (frame === 3) {
    canvas.line(ox + 5, oy + 12, ox + 4, oy + 6, '#92ad58');
    canvas.line(ox + 6, oy + 12, ox + 7, oy + 4, '#b1bd63');
    canvas.line(ox + 8, oy + 12, ox + 10, oy + 7, '#7a9d4f');
    canvas.pixel(ox + 3, oy + 5, '#d9c98b');
  } else if (frame === 4 || frame === 5) {
    canvas.rect(ox, oy + 4, 16, 12, '#97704b');
    canvas.rect(ox, oy + 3, 16, 3, '#aa8154');
    canvas.pixel(ox + 4, oy + 8, '#806344');
    canvas.pixel(ox + 11, oy + 12, '#b58a5a');
    if (frame === 5) {
      canvas.rect(ox + 1, oy + 2, 14, 2, '#a27d52');
      canvas.pixel(ox + 8, oy + 7, '#69583d');
    }
  } else if (frame === 6) {
    canvas.rect(ox + 3, oy + 5, 2, 7, '#92ad58');
    canvas.rect(ox + 6, oy + 3, 2, 9, '#b1bd63');
    canvas.rect(ox + 9, oy + 6, 2, 6, '#7a9d4f');
    canvas.rect(ox + 12, oy + 8, 2, 4, '#b1bd63');
  } else {
    canvas.pixel(ox + 4, oy + 5, '#8d986f');
    canvas.pixel(ox + 5, oy + 5, '#a8a486');
    canvas.pixel(ox + 12, oy + 11, '#ada385');
    canvas.pixel(ox + 11, oy + 10, '#837e68');
  }
}

makeSheet('tiles/grass-sheet.png', 16, 16, 4, 2, drawGrass);

function drawPerson(canvas, ox, oy, direction, frame) {
  const stride = frame === 1 ? -1 : frame === 3 ? 1 : 0;
  canvas.ellipse(ox + 12, oy + 29, 8, 2, '#28392b', 130);
  canvas.rect(ox + 5, oy + 6, 14, 13, '#3b2d28');
  canvas.rect(ox + 5, oy + 17, 14, 10, '#283632');
  const bootY = oy + (stride ? 27 : 26);
  canvas.rect(ox + 6, bootY, 4, 3, '#57402f');
  canvas.rect(ox + 14, bootY - stride, 4, 3, '#57402f');
  canvas.pixel(ox + 6, bootY, '#8a6543');
  canvas.pixel(ox + 14, bootY - stride, '#8a6543');
  canvas.rect(ox + 7, oy + 20, 10, 7, '#5577a0');
  canvas.rect(ox + 8, oy + 23, 8, 2, '#638bb3');
  canvas.pixel(ox + 16, oy + 25, '#3e648a');
  canvas.rect(ox + 5 + stride, oy + 22, 3, 6, '#d7a365');
  canvas.rect(ox + 16 - stride, oy + 22, 3, 6, '#d7a365');
  canvas.rect(ox + 7, oy + 18, 10, 3, '#c58a50');
  canvas.pixel(ox + 11, oy + 19, '#f1c879');
  if (direction === 3) {
    canvas.rect(ox + 6, oy + 7, 12, 11, '#754c35');
    canvas.rect(ox + 8, oy + 9, 8, 8, '#d7a76c');
    canvas.rect(ox + 6, oy + 7, 12, 4, '#50382d');
    canvas.rect(ox + 7, oy + 5, 10, 3, '#5c4030');
    canvas.rect(ox + 7, oy + 2, 10, 4, '#47734e');
    canvas.pixel(ox + 8, oy + 2, '#9b7146');
  } else if (direction === 1 || direction === 2) {
    canvas.rect(ox + 6, oy + 7, 12, 11, '#754c35');
    canvas.rect(ox + 7, oy + 9, 10, 8, '#d7a76c');
    canvas.rect(ox + 6, oy + 7, 12, 4, '#50382d');
    canvas.rect(ox + (direction === 1 ? 7 : 8), oy + 12, 3, 2, '#312a26');
    canvas.rect(ox + 7, oy + 5, 10, 3, '#5c4030');
    canvas.rect(ox + 7, oy + 2, 10, 4, '#47734e');
    canvas.pixel(ox + 8, oy + 2, '#9b7146');
  } else {
    canvas.rect(ox + 6, oy + 7, 12, 11, '#754c35');
    canvas.rect(ox + 7, oy + 9, 10, 8, '#e1b87d');
    canvas.rect(ox + 6, oy + 7, 12, 3, '#50382d');
    canvas.rect(ox + 8, oy + 12, 2, 2, '#332923');
    canvas.rect(ox + 14, oy + 12, 2, 2, '#332923');
    canvas.rect(ox + 7, oy + 5, 10, 3, '#5c4030');
    canvas.rect(ox + 7, oy + 2, 10, 4, '#47734e');
    canvas.rect(ox + 6, oy + 2, 3, 2, '#d1a052');
  }
  canvas.pixel(ox + 8, oy + 6, '#8b6545');
  canvas.pixel(ox + 16, oy + 6, '#443129');
}

makeSheet('characters/player-sheet.png', 24, 32, 4, 4, (canvas, x, y, frame) => {
  drawPerson(canvas, x, y, Math.floor(frame / 4), frame % 4);
});

function drawLivestock(canvas, ox, oy, species, frame) {
  const step = frame === 1 ? -1 : frame === 3 ? 1 : 0;
  canvas.ellipse(ox + 12, oy + 21, 9, 2, '#26382a', 120);
  if (species === 0) {
    canvas.ellipse(ox + 12, oy + 12, 8, 6, '#e4dfca');
    canvas.ellipse(ox + 17, oy + 10, 4, 4, '#d9d1b9');
    canvas.rect(ox + 7 + step, oy + 16, 2, 5, '#574a3d');
    canvas.rect(ox + 15 - step, oy + 16, 2, 5, '#574a3d');
    canvas.pixel(ox + 18, oy + 10, '#292824');
  } else if (species === 1) {
    canvas.ellipse(ox + 12, oy + 13, 8, 6, '#d58c8a');
    canvas.ellipse(ox + 17, oy + 12, 4, 4, '#e0a09b');
    canvas.rect(ox + 8 + step, oy + 17, 2, 4, '#735345');
    canvas.rect(ox + 15 - step, oy + 17, 2, 4, '#735345');
    canvas.rect(ox + 19, oy + 12, 3, 2, '#ba6f6e');
    canvas.pixel(ox + 18, oy + 11, '#2b2622');
  } else {
    canvas.ellipse(ox + 12, oy + 14, 5, 5, '#f5ead0');
    canvas.ellipse(ox + 16, oy + 10, 3, 3, '#fff3dd');
    canvas.polygon([[ox + 15, oy + 7], [ox + 14, oy + 3], [ox + 18, oy + 7]], '#dba34e');
    canvas.rect(ox + 10 + step, oy + 17, 2, 3, '#a27d54');
    canvas.rect(ox + 15 - step, oy + 17, 2, 3, '#a27d54');
    canvas.pixel(ox + 18, oy + 10, '#302922');
  }
}

makeSheet('animals/livestock-sheet.png', 24, 24, 4, 3, (canvas, x, y, frame) => {
  drawLivestock(canvas, x, y, Math.floor(frame / 4), frame % 4);
});

function drawIcon(canvas, x, y, frame) {
  if (frame === 0) {
    canvas.rect(x + 2, y + 7, 12, 7, '#885737');
    canvas.rect(x + 4, y + 5, 8, 2, '#d1a26a');
    canvas.rect(x + 5, y + 8, 2, 4, '#d4a86d');
    canvas.pixel(x + 10, y + 10, '#4f3929');
  } else if (frame === 1) {
    canvas.polygon([[x + 2, y + 12], [x + 4, y + 5], [x + 9, y + 3], [x + 14, y + 7], [x + 13, y + 13], [x + 7, y + 15]], '#818c83');
    canvas.pixel(x + 5, y + 6, '#d2d0b6');
    canvas.pixel(x + 10, y + 9, '#d2d0b6');
  } else if (frame === 2) {
    canvas.line(x + 8, y + 14, x + 8, y + 5, '#a5be68');
    canvas.line(x + 8, y + 9, x + 4, y + 6, '#78a859');
    canvas.line(x + 8, y + 11, x + 12, y + 7, '#78a859');
    canvas.pixel(x + 8, y + 4, '#e8d682');
  } else if (frame === 3) {
    canvas.ellipse(x + 8, y + 9, 6, 5, '#c9774d');
    canvas.pixel(x + 5, y + 7, '#edc06d');
    canvas.pixel(x + 10, y + 10, '#f1d38b');
    canvas.line(x + 11, y + 5, x + 13, y + 3, '#728d4f');
  } else if (frame === 4) {
    canvas.line(x + 8, y + 14, x + 8, y + 5, '#7e9ed3');
    canvas.line(x + 8, y + 10, x + 4, y + 6, '#667fc0');
    canvas.line(x + 8, y + 8, x + 12, y + 4, '#a8bdf2');
    canvas.pixel(x + 7, y + 4, '#e4ebff');
    canvas.pixel(x + 12, y + 3, '#e4ebff');
  } else if (frame === 5) {
    canvas.ellipse(x + 8, y + 9, 6, 6, '#55b9b1');
    canvas.ellipse(x + 7, y + 7, 3, 3, '#a4eee0');
    canvas.pixel(x + 10, y + 11, '#d2fff3');
  } else if (frame === 6) {
    canvas.rect(x + 5, y + 3, 3, 9, '#e2dcc2');
    canvas.rect(x + 3, y + 5, 7, 3, '#e2dcc2');
    canvas.rect(x + 4, y + 11, 5, 3, '#e2dcc2');
    canvas.pixel(x + 4, y + 5, '#f8f2d9');
    canvas.pixel(x + 8, y + 11, '#aaa487');
  } else {
    canvas.ellipse(x + 8, y + 8, 6, 5, '#a38aba');
    canvas.line(x + 3, y + 7, x + 12, y + 11, '#d9c2e5');
    canvas.line(x + 4, y + 11, x + 12, y + 6, '#c5a9d4');
    canvas.pixel(x + 4, y + 7, '#f2e6f7');
  }
}

makeSheet('ui/resource-icons.png', 16, 16, 8, 1, drawIcon);

const vfxEntries = [
  {
    name: 'slash-0', width: 32, height: 24,
    draw: (canvas) => {
      canvas.line(4, 19, 27, 4, '#70483b', 150);
      canvas.line(5, 18, 26, 5, '#f5c86f');
      canvas.line(7, 16, 24, 7, '#fff3bf');
    }
  },
  {
    name: 'slash-1', width: 32, height: 24,
    draw: (canvas) => {
      canvas.polygon([[2, 18], [8, 9], [22, 2], [29, 4], [22, 10], [7, 22]], '#70483b', 150);
      canvas.polygon([[3, 17], [9, 10], [22, 3], [27, 5], [21, 9], [8, 20]], '#f4bd5f');
      canvas.line(7, 16, 23, 6, '#fff5cf');
    }
  },
  {
    name: 'slash-2', width: 32, height: 24,
    draw: (canvas) => {
      canvas.line(5, 18, 26, 5, '#f4c66c', 185);
      canvas.line(8, 16, 23, 8, '#fff4c4', 105);
      canvas.pixel(6, 17, '#fff8d9', 220);
      canvas.pixel(24, 6, '#fff8d9', 220);
    }
  },
  {
    name: 'spark-0', width: 12, height: 12,
    draw: (canvas) => {
      canvas.rect(5, 1, 2, 10, '#ffe08a');
      canvas.rect(1, 5, 10, 2, '#ffe08a');
      canvas.rect(4, 4, 4, 4, '#fff8d2');
      canvas.pixel(3, 3, '#fff8d2');
      canvas.pixel(8, 8, '#fff8d2');
    }
  },
  {
    name: 'spark-1', width: 12, height: 12,
    draw: (canvas) => {
      canvas.rect(4, 3, 4, 6, '#ffb84f');
      canvas.rect(3, 4, 6, 4, '#ffb84f');
      canvas.rect(5, 5, 2, 2, '#fff1a8');
    }
  },
  {
    name: 'ember-0', width: 6, height: 6,
    draw: (canvas) => {
      canvas.rect(2, 1, 2, 4, '#e96d3e');
      canvas.pixel(2, 2, '#ffd46b');
      canvas.pixel(3, 3, '#fff0a8');
    }
  },
  {
    name: 'ember-1', width: 6, height: 6,
    draw: (canvas) => {
      canvas.rect(2, 2, 2, 3, '#f08b42');
      canvas.pixel(2, 3, '#ffe488');
    }
  },
  {
    name: 'leaf-0', width: 8, height: 6,
    draw: (canvas) => {
      canvas.polygon([[1, 3], [4, 0], [7, 2], [4, 5]], '#78964e');
      canvas.line(3, 3, 5, 2, '#a9b96a');
    }
  },
  {
    name: 'leaf-1', width: 8, height: 6,
    draw: (canvas) => {
      canvas.polygon([[0, 2], [3, 0], [7, 3], [3, 5]], '#8b9e54');
      canvas.pixel(4, 2, '#c0bf72');
    }
  },
  {
    name: 'dust-0', width: 8, height: 6,
    draw: (canvas) => {
      canvas.rect(1, 3, 3, 2, '#b8a982');
      canvas.rect(4, 2, 3, 2, '#d2c49c');
    }
  },
  {
    name: 'dust-1', width: 8, height: 6,
    draw: (canvas) => {
      canvas.rect(2, 2, 4, 2, '#cdbf98');
      canvas.pixel(1, 3, '#9f906e');
    }
  },
  {
    name: 'firefly-0', width: 4, height: 4,
    draw: (canvas) => {
      canvas.rect(1, 1, 2, 2, '#fff39a');
      canvas.pixel(0, 2, '#d9e86c');
    }
  },
  {
    name: 'firefly-1', width: 4, height: 4,
    draw: (canvas) => {
      canvas.pixel(1, 1, '#d9e86c');
      canvas.pixel(2, 2, '#fff39a');
    }
  },
  {
    name: 'ring-0', width: 40, height: 32,
    draw: (canvas) => {
      for (let y = 0; y < 32; y += 1) {
        for (let x = 0; x < 40; x += 1) {
          const distance = Math.hypot((x - 19.5) / 19.5, (y - 15.5) / 15.5);
          if (distance > 0.7 && distance < 0.82) canvas.pixel(x, y, '#ffe89a', 255);
          else if (distance >= 0.82 && distance < 0.94) canvas.pixel(x, y, '#f4bd61', 135);
        }
      }
    }
  },
  {
    name: 'ring-1', width: 40, height: 32,
    draw: (canvas) => {
      for (let y = 0; y < 32; y += 1) {
        for (let x = 0; x < 40; x += 1) {
          const distance = Math.hypot((x - 19.5) / 19.5, (y - 15.5) / 15.5);
          if (distance > 0.8 && distance < 0.88) canvas.pixel(x, y, '#fff3b5', 185);
        }
      }
    }
  },
  {
    name: 'fog-dither', width: 32, height: 32,
    draw: (canvas) => {
      const bayer = [
        [0, 8, 2, 10],
        [12, 4, 14, 6],
        [3, 11, 1, 9],
        [15, 7, 13, 5]
      ];
      for (let y = 0; y < 32; y += 1) {
        for (let x = 0; x < 32; x += 1) {
          const threshold = bayer[y % 4][x % 4] / 16;
          if (threshold < 0.5) canvas.pixel(x, y, '#dbe8e5', 235);
          else if (threshold < 0.75) canvas.pixel(x, y, '#dbe8e5', 115);
        }
      }
    }
  }
];
makeAtlas('vfx/vfx-atlas.json', vfxEntries);

const natureEntries = [
  ...[0, 1, 2].map((frame) => ({
    name: `pine-${frame}`, width: 40, height: 56,
    draw: (canvas) => {
      const shift = frame === 1 ? -1 : frame === 2 ? 1 : 0;
      canvas.ellipse(20, 51, 16, 4, '#25382a', 150);
      canvas.rect(17, 32, 7, 18, '#735033');
      canvas.rect(18, 35, 2, 12, '#a17345');
      canvas.polygon([[20 + shift, 1], [5 + shift, 30], [13 + shift, 28], [3 + shift, 39], [18 + shift, 36], [13 + shift, 48], [28 + shift, 42], [37 + shift, 43], [28 + shift, 31], [35 + shift, 31]], '#2e533c');
      canvas.polygon([[20 + shift, 5], [9 + shift, 27], [17 + shift, 24], [8 + shift, 34], [20 + shift, 31], [16 + shift, 39], [27 + shift, 35], [32 + shift, 32]], '#42764b');
      canvas.line(20 + shift, 8, 19 + shift, 35, '#719258');
      canvas.pixel(16 + shift, 15, '#81a15f');
      canvas.pixel(28 + shift, 27, '#688b53');
    }
  })),
  {
    name: 'autumn-tree', width: 48, height: 56,
    draw: (canvas) => {
      canvas.ellipse(24, 51, 17, 4, '#25382a', 145);
      canvas.rect(21, 27, 7, 24, '#704b34');
      canvas.line(23, 31, 14, 22, '#704b34');
      canvas.line(25, 34, 34, 21, '#704b34');
      canvas.ellipse(24, 20, 16, 14, '#9d5546');
      canvas.ellipse(14, 24, 9, 9, '#b76a4b');
      canvas.ellipse(34, 24, 9, 9, '#c1844b');
      canvas.pixel(20, 8, '#d39b56');
      canvas.pixel(30, 13, '#dcaa5d');
      canvas.pixel(13, 19, '#d88a55');
      canvas.pixel(35, 25, '#d9a85c');
      canvas.pixel(25, 28, '#8f4a40');
    }
  },
  {
    name: 'bush', width: 32, height: 24,
    draw: (canvas) => {
      canvas.ellipse(16, 21, 13, 3, '#26382a', 145);
      canvas.ellipse(10, 13, 7, 7, '#376541');
      canvas.ellipse(19, 11, 8, 9, '#477a49');
      canvas.ellipse(25, 15, 5, 6, '#639052');
      canvas.pixel(10, 8, '#7eaa5b');
      canvas.pixel(20, 7, '#87ad61');
      canvas.pixel(15, 12, '#a5584c');
      canvas.pixel(23, 13, '#b8664b');
    }
  },
  {
    name: 'resource-wood', width: 28, height: 28,
    draw: (canvas) => {
      canvas.ellipse(14, 24, 12, 3, '#26382a', 135);
      canvas.rect(5, 9, 17, 12, '#754b31');
      canvas.rect(5, 7, 16, 4, '#ad7950');
      canvas.rect(8, 11, 3, 9, '#d0a16a');
      canvas.rect(15, 12, 2, 8, '#563a2a');
      canvas.pixel(19, 8, '#e0b175');
    }
  },
  {
    name: 'resource-stone', width: 28, height: 28,
    draw: (canvas) => {
      canvas.ellipse(14, 24, 12, 3, '#26382a', 135);
      canvas.polygon([[3, 20], [5, 10], [12, 5], [17, 8], [23, 14], [21, 22], [12, 24]], '#737e7b');
      canvas.polygon([[6, 12], [12, 7], [14, 13], [10, 16]], '#c0c1ae');
      canvas.pixel(18, 15, '#9fa698');
      canvas.pixel(14, 20, '#555f5e');
    }
  },
  {
    name: 'resource-herbs', width: 28, height: 28,
    draw: (canvas) => {
      canvas.ellipse(14, 24, 11, 3, '#26382a', 130);
      canvas.line(14, 22, 13, 9, '#85a956');
      canvas.line(13, 17, 7, 11, '#75a957');
      canvas.line(13, 14, 19, 8, '#95bb62');
      canvas.line(14, 20, 21, 15, '#67984a');
      canvas.pixel(12, 7, '#d7d77c');
      canvas.pixel(20, 6, '#d7d77c');
      canvas.pixel(6, 10, '#c3cf72');
    }
  },
  {
    name: 'resource-moonherb', width: 28, height: 28,
    draw: (canvas) => {
      canvas.ellipse(14, 24, 11, 3, '#26382a', 130);
      canvas.line(14, 22, 13, 8, '#758bd0');
      canvas.line(13, 17, 6, 11, '#5f74bd');
      canvas.line(13, 13, 20, 7, '#9aaeea');
      canvas.line(14, 20, 21, 14, '#687dc6');
      canvas.pixel(12, 6, '#dbe3ff');
      canvas.pixel(20, 5, '#f1f3ff');
      canvas.pixel(6, 9, '#c4d0fb');
    }
  },
  {
    name: 'resource-ectoplasm', width: 28, height: 28,
    draw: (canvas) => {
      canvas.ellipse(14, 24, 10, 3, '#26382a', 130);
      canvas.polygon([[14, 3], [22, 10], [20, 22], [14, 25], [8, 21], [7, 10]], '#3f9f9a');
      canvas.polygon([[14, 6], [19, 11], [17, 20], [13, 22], [10, 19], [10, 12]], '#7ed3c6');
      canvas.pixel(12, 10, '#d8fff1');
      canvas.pixel(16, 15, '#b7f4df');
    }
  },
  {
    name: 'death-backpack', width: 28, height: 28,
    draw: (canvas) => {
      canvas.ellipse(14, 24, 12, 3, '#26382a', 150);
      canvas.rect(5, 8, 18, 15, '#3b3028');
      canvas.rect(7, 10, 14, 11, '#765338');
      canvas.rect(9, 6, 10, 4, '#9a7048');
      canvas.rect(11, 3, 6, 4, '#b78955');
      canvas.rect(12, 13, 4, 6, '#d2ad6b');
      canvas.pixel(13, 15, '#f3d68b');
      canvas.rect(4, 10, 3, 9, '#4b392d');
      canvas.rect(21, 10, 3, 9, '#4b392d');
    }
  },
  {
    name: 'detail-grass', width: 20, height: 16,
    draw: (canvas) => {
      canvas.line(4, 14, 3, 8, '#5f914f');
      canvas.line(5, 14, 6, 7, '#79a556');
      canvas.line(13, 14, 15, 9, '#4f8248');
      canvas.pixel(10, 6, '#93b762');
    }
  },
  {
    name: 'detail-flowers', width: 20, height: 16,
    draw: (canvas) => {
      canvas.line(6, 14, 6, 8, '#6d9b4d');
      canvas.line(14, 14, 14, 9, '#7da557');
      canvas.rect(5, 6, 3, 2, '#f1e5a4');
      canvas.pixel(6, 5, '#fff4c3');
      canvas.rect(13, 7, 3, 2, '#e9a45d');
      canvas.pixel(14, 6, '#ffd58a');
    }
  },
  {
    name: 'detail-pebbles', width: 20, height: 12,
    draw: (canvas) => {
      canvas.ellipse(5, 8, 3, 2, '#7d8277');
      canvas.pixel(4, 7, '#b6b7a3');
      canvas.ellipse(13, 7, 4, 2, '#696f67');
      canvas.pixel(12, 6, '#9da193');
    }
  },
  {
    name: 'detail-leaves', width: 20, height: 12,
    draw: (canvas) => {
      canvas.polygon([[2, 7], [6, 3], [10, 6], [6, 9]], '#8b7846');
      canvas.polygon([[11, 5], [15, 2], [18, 5], [14, 8]], '#a07843');
      canvas.pixel(5, 5, '#c09b58');
    }
  },
  {
    name: 'detail-mushroom', width: 16, height: 16,
    draw: (canvas) => {
      canvas.ellipse(8, 14, 5, 2, '#26382a', 110);
      canvas.rect(6, 8, 4, 6, '#d8c9a4');
      canvas.rect(3, 5, 10, 4, '#b95045');
      canvas.pixel(5, 6, '#f0cf92');
      canvas.pixel(10, 6, '#f0cf92');
    }
  }
];
makeAtlas('nature/nature-atlas.json', natureEntries);

const buildingEntries = [];
for (const [name, roof, wall, accent] of [
  ['house', '#554856', '#936947', '#d8a855'],
  ['forge', '#515050', '#77736a', '#e49b4b'],
  ['farm', '#557649', '#a27b4e', '#d6b758'],
  ['store', '#8b4b43', '#9b734d', '#dbb46b']
]) {
  buildingEntries.push({
    name, width: 64, height: 64,
    draw: (canvas) => {
      canvas.ellipse(32, 59, 27, 4, '#24352a', 155);
      canvas.rect(11, 29, 42, 25, wall);
      canvas.rect(14, 31, 36, 3, accent);
      canvas.rect(10, 49, 44, 4, '#654830');
      canvas.polygon([[5, 31], [32, 7], [59, 31], [53, 35], [32, 17], [11, 35]], roof);
      canvas.line(11, 30, 32, 12, '#b08058');
      canvas.line(32, 12, 54, 30, '#b08058');
      canvas.rect(28, 38, 10, 16, '#49342b');
      canvas.rect(30, 41, 2, 9, '#865b3b');
      canvas.rect(15, 36, 8, 8, '#44382f');
      canvas.rect(16, 37, 6, 6, '#f4ce70');
      canvas.pixel(19, 37, '#fff0ac');
      canvas.rect(42, 36, 8, 8, '#44382f');
      canvas.rect(43, 37, 6, 6, '#f4ce70');
      canvas.pixel(46, 37, '#fff0ac');
      canvas.rect(9, 52, 46, 2, '#c99a62');
      canvas.rect(12, 55, 4, 3, '#654830');
      canvas.rect(49, 55, 4, 3, '#654830');
      if (name === 'forge') {
        canvas.rect(45, 6, 9, 20, '#52585a');
        canvas.rect(43, 4, 13, 4, '#717776');
        canvas.rect(47, 10, 3, 13, '#383b3b');
        canvas.pixel(46, 24, '#a44e36');
        canvas.rect(26, 47, 14, 6, '#806044');
        canvas.pixel(32, 48, '#f6aa4f');
      }
      if (name === 'farm') {
        canvas.rect(3, 24, 14, 29, '#b7ad82');
        canvas.rect(5, 27, 10, 23, '#d1c69a');
        canvas.polygon([[1, 25], [10, 15], [19, 25]], '#6b4936');
        canvas.rect(8, 38, 4, 15, '#7d6849');
        for (let row = 0; row < 3; row += 1) {
          canvas.rect(23 + row * 7, 49 - row * 3, 4, 5, '#6c984f');
          canvas.rect(39 + row * 5, 49 - row * 3, 4, 5, '#83aa55');
        }
      }
      if (name === 'store') {
        canvas.rect(25, 31, 17, 4, '#e2c06e');
        canvas.rect(27, 35, 4, 7, '#b65345');
        canvas.rect(34, 35, 4, 7, '#e2c06e');
        canvas.rect(43, 46, 14, 10, '#765238');
        canvas.rect(45, 48, 5, 6, '#b18455');
        canvas.rect(51, 48, 5, 6, '#b18455');
        canvas.line(45, 48, 50, 54, '#5f422f');
      }
    }
  });
}
buildingEntries.push(
  {
    name: 'campfire-0', width: 24, height: 30,
    draw: (canvas) => {
      canvas.ellipse(12, 27, 10, 2, '#26382a', 150);
      canvas.line(4, 23, 20, 19, '#754a30');
      canvas.line(5, 19, 19, 24, '#9b6638');
      canvas.polygon([[12, 6], [7, 17], [10, 22], [15, 21], [18, 15]], '#df7543');
      canvas.polygon([[12, 11], [9, 18], [13, 20], [15, 15]], '#f5c75f');
    }
  },
  {
    name: 'campfire-1', width: 24, height: 30,
    draw: (canvas) => {
      canvas.ellipse(12, 27, 10, 2, '#26382a', 150);
      canvas.line(4, 23, 20, 19, '#754a30');
      canvas.line(5, 19, 19, 24, '#9b6638');
      canvas.polygon([[12, 4], [8, 14], [9, 21], [15, 22], [18, 13]], '#e17b41');
      canvas.polygon([[12, 9], [10, 17], [13, 20], [16, 13]], '#ffdb70');
    }
  },
  {
    name: 'campfire-2', width: 24, height: 30,
    draw: (canvas) => {
      canvas.ellipse(12, 27, 10, 2, '#26382a', 150);
      canvas.line(4, 23, 20, 19, '#754a30');
      canvas.line(5, 19, 19, 24, '#9b6638');
      canvas.polygon([[12, 7], [6, 15], [10, 22], [16, 20], [19, 14]], '#dc6c3c');
      canvas.polygon([[13, 10], [10, 16], [12, 20], [16, 16]], '#f8cf63');
    }
  },
  {
    name: 'campfire-3', width: 24, height: 30,
    draw: (canvas) => {
      canvas.ellipse(12, 27, 10, 2, '#26382a', 150);
      canvas.line(4, 23, 20, 19, '#754a30');
      canvas.line(5, 19, 19, 24, '#9b6638');
      canvas.polygon([[13, 5], [8, 14], [10, 21], [15, 22], [18, 12]], '#ed8a47');
      canvas.polygon([[12, 11], [10, 17], [14, 20], [15, 14]], '#ffe184');
    }
  },
  ...[0, 1, 2, 3].map((frame) => ({
    name: `smoke-${frame}`, width: 16, height: 24,
    draw: (canvas) => {
      const puffX = frame % 2 ? 8 : 7;
      const alpha = 180 - frame * 34;
      canvas.ellipse(puffX, 18 - frame * 2, 3 + Math.floor(frame / 2), 4, '#c7c5ae', alpha);
      canvas.ellipse(puffX + 2, 12 - frame * 2, 3, 3, '#9f9e91', alpha - 20);
      canvas.pixel(puffX - 2, 19 - frame * 2, '#e0ddc6', alpha - 30);
    }
  })),
  {
    name: 'fence', width: 32, height: 16,
    draw: (canvas) => {
      canvas.ellipse(16, 15, 15, 2, '#26382a', 115);
      canvas.rect(2, 5, 28, 3, '#815837');
      canvas.rect(2, 11, 28, 3, '#68482f');
      canvas.rect(5, 2, 3, 13, '#a97748');
      canvas.rect(16, 2, 3, 13, '#a97748');
      canvas.rect(26, 2, 3, 13, '#a97748');
      canvas.pixel(6, 4, '#d09b60');
      canvas.pixel(17, 4, '#d09b60');
      canvas.pixel(27, 4, '#d09b60');
    }
  },
  {
    name: 'lamp', width: 20, height: 36,
    draw: (canvas) => {
      canvas.ellipse(10, 34, 8, 2, '#26382a', 135);
      canvas.rect(9, 12, 3, 21, '#68492e');
      canvas.rect(4, 7, 12, 3, '#755235');
      canvas.rect(6, 10, 8, 12, '#41382b');
      canvas.rect(7, 11, 6, 9, '#f4b94d');
      canvas.pixel(8, 12, '#fff0a0');
      canvas.pixel(11, 18, '#d9793f');
      canvas.rect(8, 4, 4, 3, '#987043');
    }
  },
  {
    name: 'warm-glow', width: 48, height: 48,
    draw: (canvas) => {
      for (let y = 0; y < 48; y += 1) {
        for (let x = 0; x < 48; x += 1) {
          const dist = Math.hypot(x - 23.5, y - 23.5) / 23.5;
          const alpha = dist < 0.2 ? 105 : dist < 0.4 ? 80 : dist < 0.62 ? 50 : dist < 0.82 ? 25 : 0;
          if (alpha) canvas.pixel(x, y, '#ffbf57', alpha);
        }
      }
    }
  }
);
makeAtlas('buildings/camp-atlas.json', buildingEntries);

makeAtlas('ui/panel-atlas.json', [{
  name: 'panel',
  width: 24,
  height: 24,
  draw: (canvas) => {
    canvas.rect(0, 0, 24, 24, '#1b2a22');
    canvas.rect(0, 0, 24, 2, '#e7cf8b');
    canvas.rect(0, 22, 24, 2, '#b69355');
    canvas.rect(0, 0, 2, 24, '#e7cf8b');
    canvas.rect(22, 0, 2, 24, '#b69355');
    canvas.rect(3, 3, 18, 1, '#697952');
    canvas.rect(3, 20, 18, 1, '#394b36');
    for (const x of [2, 21]) {
      for (const y of [2, 21]) {
        canvas.pixel(x, y, '#f2d99b');
        canvas.pixel(x + (x === 2 ? 1 : -1), y + (y === 2 ? 1 : -1), '#7f5b37');
      }
    }
    canvas.pixel(5, 5, '#ae8a51');
    canvas.pixel(18, 18, '#ae8a51');
  }
}]);

console.log('Generated pixel art PNG sheets and Phaser atlases in assets/.');
