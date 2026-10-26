import fs from 'node:fs';
import path from 'node:path';
import { PixelCanvas, darken, dither, hash, lighten, ramp } from '../src/art/pixel.js';
import { writePng } from './png.js';
import { KNIGHT_FRAME, drawKnightFrame } from '../src/art/knight.js';
import { STORY_SCENE_KEYS, drawStoryScene } from '../src/art/storyScenes.js';

// Gera toda a pixel art do jogo (PNG + atlas da Phaser) em public/assets/.
// Rode com `npm run assets:generate`. Os tamanhos e nomes dos quadros são usados
// pelo código do jogo: mude o desenho à vontade, mas mantenha nomes e tamanhos.

const root = path.resolve('public/assets');

// ---------- Atlas ----------

function makeSheet(file, frameWidth, frameHeight, columns, rows, drawFrame, { outline = true } = {}) {
  const sheet = new PixelCanvas(frameWidth * columns, frameHeight * rows);
  for (let frame = 0; frame < columns * rows; frame += 1) {
    const canvas = new PixelCanvas(frameWidth, frameHeight);
    drawFrame(canvas, frame);
    if (outline) canvas.outline();
    sheet.blit(canvas, (frame % columns) * frameWidth, Math.floor(frame / columns) * frameHeight);
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
    if (entry.width + 4 > atlasWidth) throw new Error(`Atlas frame ${entry.name} exceeds the ${atlasWidth}px atlas width`);
    if (x + entry.width + 2 > atlasWidth) {
      x = 2;
      y += rowHeight + 2;
      rowHeight = 0;
    }
    positions.push({ ...entry, x, y });
    x += entry.width + 2;
    rowHeight = Math.max(rowHeight, entry.height);
  }
  const atlas = new PixelCanvas(atlasWidth, y + rowHeight + 2);
  const frames = {};
  for (const entry of positions) {
    const sprite = new PixelCanvas(entry.width, entry.height);
    entry.draw(sprite);
    if (entry.outline !== false) sprite.outline();
    atlas.blit(sprite, entry.x, entry.y);
    frames[entry.name] = {
      frame: { x: entry.x, y: entry.y, w: entry.width, h: entry.height },
      rotated: false,
      trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: entry.width, h: entry.height },
      sourceSize: { w: entry.width, h: entry.height }
    };
  }
  const image = path.basename(file, '.json') + '.png';
  writePng(path.join(root, path.dirname(file), image), atlas);
  fs.writeFileSync(path.join(root, file), JSON.stringify({
    frames,
    meta: {
      app: 'LENDAS asset generator',
      version: '2.0',
      image,
      format: 'RGBA8888',
      size: { w: atlasWidth, h: atlas.height },
      scale: '1'
    }
  }, null, 2));
}

// ---------- Paletas ----------

const GRASS = ['#335c3b', '#3f6d42', '#4a7b48', '#578a4f', '#6c9d59', '#86b265'];
const DIRT = ['#5e4130', '#74523a', '#8a6647', '#9f7a55', '#b79168'];
const BARK = ['#3f2a1f', '#5b3d29', '#7a5236', '#9a6c45'];
const WOOD = ['#5a3b26', '#7c5434', '#a0723f', '#c49556'];
const STONE = ['#4c5257', '#6c7377', '#8d9496', '#b6bcb8', '#dad9cc'];
const LEAF = ['#1f4130', '#2b5a3a', '#3d7745', '#5a9650', '#7fb35e'];

// ---------- Chão (48 x 48, 1 pixel da arte = 1 pixel do mundo) ----------

// Ruído suave e periódico em 48 px: o mesmo em todos os quadros, então as
// emendas entre ladrilhos diferentes não aparecem.
function smoothNoise(x, y, cell = 12, seed = 7) {
  const cells = 48 / cell;
  const gx = x / cell;
  const gy = y / cell;
  const x0 = Math.floor(gx);
  const y0 = Math.floor(gy);
  const fx = gx - x0;
  const fy = gy - y0;
  const corner = (cx, cy) => hash(((cx % cells) + cells) % cells, ((cy % cells) + cells) % cells, seed);
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const top = corner(x0, y0) + (corner(x0 + 1, y0) - corner(x0, y0)) * sx;
  const bottom = corner(x0, y0 + 1) + (corner(x0 + 1, y0 + 1) - corner(x0, y0 + 1)) * sx;
  return top + (bottom - top) * sy;
}

function grassBase(canvas, ox = 0, oy = 0, width = 48, height = 48) {
  for (let y = oy; y < oy + height; y += 1) {
    for (let x = ox; x < ox + width; x += 1) {
      const n = smoothNoise(x, y) * 0.7 + smoothNoise(x, y, 6, 3) * 0.3;
      const d = hash(x, y, 71);
      let tone = 2;
      if (n > 0.66 && d < (n - 0.62) * 3) tone = 3;
      else if (n < 0.34 && d < (0.38 - n) * 3) tone = 1;
      canvas.pixel(x, y, GRASS[tone]);
      const speck = hash(x, y, 11);
      if (speck > 0.985) canvas.pixel(x, y, GRASS[4]);
      else if (speck < 0.012) canvas.pixel(x, y, GRASS[1]);
    }
  }
}

function tuft(canvas, x, y, tall = 3) {
  canvas.pixel(x, y, GRASS[1]);
  canvas.pixel(x - 1, y, GRASS[1]);
  for (let step = 1; step <= tall; step += 1) canvas.pixel(x, y - step, step === tall ? GRASS[5] : GRASS[4]);
  canvas.pixel(x - 2, y - 1, GRASS[3]);
  canvas.pixel(x - 2, y - 2, GRASS[4]);
  canvas.pixel(x + 2, y - 1, GRASS[3]);
  canvas.pixel(x + 2, y - 2, GRASS[5]);
}

function scatter(seed, count, callback, margin = 4) {
  for (let index = 0; index < count; index += 1) {
    const x = margin + Math.floor(hash(index, 1, seed) * (48 - margin * 2));
    const y = margin + 2 + Math.floor(hash(index, 2, seed) * (48 - margin * 2 - 2));
    callback(x, y, index);
  }
}

function drawGroundTile(canvas, frame) {
  if (frame === 4 || frame === 5) {
    drawDirtTile(canvas, frame === 4 ? 'left' : 'right');
    return;
  }
  grassBase(canvas);
  scatter(frame * 31 + 5, frame === 3 ? 9 : 5, (x, y) => tuft(canvas, x, y, 2 + Math.floor(hash(x, y, 2) * 2)));
  if (frame === 1) {
    scatter(91, 3, (x, y, index) => {
      const petal = index % 2 ? '#f4efe0' : '#f2d36b';
      canvas.pixel(x, y - 1, petal); canvas.pixel(x - 1, y, petal); canvas.pixel(x + 1, y, petal); canvas.pixel(x, y + 1, petal);
      canvas.pixel(x, y, index % 2 ? '#e9b949' : '#c8643e');
    }, 6);
  } else if (frame === 2) {
    scatter(57, 2, (x, y, index) => {
      const size = 1 + (index % 2);
      canvas.ellipse(x, y + 1, size + 1, size, '#2c4a34', 120);
      canvas.ellipse(x, y, size + 0.5, size, STONE[1]);
      canvas.pixel(x - 1, y - 1, STONE[3]);
    }, 6);
  } else if (frame === 6) {
    scatter(77, 4, (x, y) => {
      for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0]]) canvas.ellipse(x + dx * 1.5, y + dy * 1.5, 1.2, 1.2, GRASS[1]);
      canvas.pixel(x - 1, y - 2, GRASS[3]);
    }, 6);
  } else if (frame === 7) {
    scatter(13, 3, (x, y, index) => canvas.pixel(x, y, index % 2 ? '#e7d47a' : '#d9e3f0'), 5);
  }
}

function drawDirtTile(canvas, side) {
  // Borda irregular de grama, periódica em 48 px para os ladrilhos se encaixarem na vertical.
  const edgeWidth = (y) => 5 + Math.round(2 * Math.sin((y / 48) * Math.PI * 2) + 1.4 * Math.sin((y / 48) * Math.PI * 6 + 1));
  for (let y = 0; y < 48; y += 1) {
    const edge = edgeWidth(y);
    for (let x = 0; x < 48; x += 1) {
      const fromEdge = side === 'left' ? x : 47 - x;
      if (fromEdge < edge) continue;
      const n = smoothNoise(x, y, 8, 21);
      const d = hash(x, y, 72);
      let tone = 2;
      if (n > 0.64 && d < (n - 0.6) * 3) tone = 3;
      else if (n < 0.36 && d < (0.4 - n) * 3) tone = 1;
      if (fromEdge === edge || fromEdge === edge + 1) tone = Math.max(0, tone - 1);
      canvas.pixel(x, y, DIRT[tone]);
      const speck = hash(x, y, 33);
      if (speck > 0.975) canvas.pixel(x, y, DIRT[4]);
      else if (speck < 0.02) canvas.pixel(x, y, DIRT[1]);
    }
  }
  // Grama da borda.
  for (let y = 0; y < 48; y += 1) {
    const edge = edgeWidth(y);
    for (let fromEdge = 0; fromEdge < edge; fromEdge += 1) {
      const x = side === 'left' ? fromEdge : 47 - fromEdge;
      const n = smoothNoise(x, y);
      canvas.pixel(x, y, fromEdge === edge - 1 ? GRASS[3] : n > 0.6 ? GRASS[3] : GRASS[2]);
    }
    if (y % 5 === 0) {
      const x = side === 'left' ? edge : 47 - edge;
      canvas.pixel(x, y, GRASS[4]);
      canvas.pixel(x, y + 1, GRASS[2]);
    }
  }
  // Pedrinhas e marcas de passos.
  scatter(side === 'left' ? 41 : 42, 5, (x, y, index) => {
    const px = side === 'left' ? Math.max(14, x) : Math.min(33, x);
    if (index % 2) {
      canvas.pixel(px, y, DIRT[4]);
      canvas.pixel(px + 1, y, DIRT[3]);
      canvas.pixel(px, y + 1, DIRT[0]);
    } else {
      canvas.pixel(px, y, DIRT[1]);
      canvas.pixel(px + 1, y + 1, DIRT[1]);
    }
  }, 6);
}

makeSheet('tiles/grass-sheet.png', 48, 48, 4, 2, drawGroundTile, { outline: false });

// Couro (usado nos ícones da interface).
const LEATHER = ['#3e2618', '#6a4228', '#8d5c36'];

// Jogador: cavaleiro de armadura (src/art/knight.js), 32 x 40, 4 direções x 4 quadros.
makeSheet('characters/player-sheet.png', KNIGHT_FRAME.width, KNIGHT_FRAME.height, 4, 4, (canvas, frameIndex) => {
  canvas.blit(drawKnightFrame(Math.floor(frameIndex / 4), frameIndex % 4), 0, 0);
}, { outline: false });

// ---------- Animais da fazenda (24 x 24, virados para a direita) ----------

function legs(canvas, positions, top, height, colors, frame) {
  const step = frame === 1 ? 1 : frame === 3 ? -1 : 0;
  positions.forEach((x, index) => {
    const lift = index % 2 ? step : -step;
    canvas.rect(x, top, 2, height - Math.max(0, lift), colors[1]);
    canvas.pixel(x, top + height - 1 - Math.max(0, lift), colors[0]);
  });
}

function drawSheep(canvas, frame) {
  canvas.shadow(12, 21, 9, 2, 100);
  legs(canvas, [6, 9, 13, 16], 16, 5, ['#1f1a1e', '#3b3236'], frame);
  const wool = ['#b3ab98', '#e3dccb', '#f4efe2', '#ffffff'];
  canvas.shadedEllipse(11, 13, 8, 5.5, wool);
  for (const [x, y, r] of [[6, 10, 3], [10, 8.5, 3.2], [14, 9, 3], [5, 14, 2.6], [17, 13, 2.4]]) canvas.shadedEllipse(x, y, r, r * 0.9, wool);
  // Cabeça escura com orelha.
  canvas.shadedEllipse(19, 11.5, 3.2, 3.8, ['#241e22', '#3b3236', '#574a4f', '#6e5f64']);
  canvas.rect(15, 9, 2, 2, '#3b3236');
  canvas.pixel(15, 10, '#241e22');
  canvas.pixel(20, 10, '#f4efe2');
  canvas.pixel(20, 11, '#141014');
  canvas.rect(17, 7, 4, 2, wool[2]);
  canvas.pixel(18, 7, wool[3]);
}

function drawPig(canvas, frame) {
  canvas.shadow(12, 21, 9, 2, 100);
  const skin = ['#b8605f', '#e2928c', '#f2b2a8', '#ffd4c8'];
  legs(canvas, [6, 9, 13, 16], 17, 4, ['#8e4848', '#c97470'], frame);
  canvas.shadedEllipse(11, 14, 8, 5.5, skin);
  canvas.shadedEllipse(18, 13, 4, 4.2, skin);
  // Focinho, narinas, orelha e rabo enrolado.
  canvas.rect(21, 13, 2, 3, '#d97d7a');
  canvas.pixel(22, 13, '#f2b2a8');
  canvas.pixel(22, 14, '#7a3b3c');
  canvas.pixel(22, 15, '#7a3b3c');
  canvas.polygon([[15, 10], [17, 7], [19, 10]], '#c97470');
  canvas.pixel(17, 8, '#e2928c');
  canvas.pixel(19, 12, '#1a1214');
  canvas.pixel(19, 11, '#ffffff');
  canvas.pixel(3, 12, '#c97470');
  canvas.pixel(3, 11, '#c97470');
  canvas.pixel(4, 10, '#c97470');
  canvas.pixel(2, 11, '#c97470');
  canvas.pixel(19, 15, '#c97470');
}

function drawChicken(canvas, frame) {
  canvas.shadow(12, 21, 6, 2, 100);
  const step = frame === 1 ? 1 : frame === 3 ? -1 : 0;
  canvas.line(10 + step, 18, 10 + step, 21, '#d9952f');
  canvas.line(13 - step, 18, 13 - step, 21, '#d9952f');
  canvas.pixel(9 + step, 21, '#d9952f');
  canvas.pixel(14 - step, 21, '#d9952f');
  const feather = ['#c7bba5', '#efe7d6', '#fbf7ec', '#ffffff'];
  // Cauda.
  canvas.polygon([[4, 9], [8, 13], [5, 16]], feather[1]);
  canvas.pixel(5, 10, feather[0]);
  canvas.shadedEllipse(11, 15, 6, 4.5, feather);
  canvas.shadedEllipse(15, 10, 3.2, 3.5, feather);
  // Asa.
  canvas.ellipse(10, 15, 3, 2, feather[0]);
  canvas.line(8, 15, 12, 15, darken(feather[0], 0.15));
  // Crista, bico, barbela e olho.
  canvas.rect(14, 5, 3, 2, '#d23b32');
  canvas.pixel(15, 4, '#e8564a');
  canvas.rect(18, 10, 2, 1, '#f0a531');
  canvas.pixel(18, 11, '#c9781f');
  canvas.pixel(17, 12, '#d23b32');
  canvas.pixel(16, 9, '#141014');
}

makeSheet('animals/livestock-sheet.png', 24, 24, 4, 3, (canvas, frame) => {
  const species = Math.floor(frame / 4);
  if (species === 0) drawSheep(canvas, frame % 4);
  else if (species === 1) drawPig(canvas, frame % 4);
  else drawChicken(canvas, frame % 4);
});

// ---------- Ícones de recursos (16 x 16) ----------

function drawIcon(canvas, frame) {
  if (frame === 0) {
    // Tora de madeira com anéis.
    canvas.polygon([[2, 7], [11, 3], [14, 8], [5, 13]], WOOD[1]);
    canvas.line(3, 8, 11, 4, WOOD[2]);
    canvas.line(5, 12, 13, 8, WOOD[0]);
    canvas.ellipse(12, 6, 2.6, 3, '#d9b07a');
    canvas.pixel(12, 6, '#a77a48');
    canvas.pixel(11, 5, '#f0cf9a');
  } else if (frame === 1) {
    canvas.polygon([[2, 12], [3, 7], [7, 3], [12, 4], [14, 9], [12, 13], [6, 14]], STONE[1]);
    canvas.polygon([[4, 7], [7, 4], [11, 5], [9, 8], [5, 9]], STONE[3]);
    canvas.pixel(6, 5, STONE[4]);
    canvas.line(9, 9, 12, 11, STONE[0]);
  } else if (frame === 2) {
    canvas.line(8, 14, 8, 5, '#5f8f3e');
    for (const [x, y, flip] of [[5, 8, -1], [11, 6, 1], [5, 11, -1], [11, 10, 1]]) {
      canvas.ellipse(x, y, 2.4, 1.4, '#7cb350');
      canvas.pixel(x - flip, y - 1, '#b5dc78');
    }
    canvas.pixel(8, 4, '#d9e88c');
  } else if (frame === 3) {
    // Maçã.
    canvas.shadedEllipse(8, 9, 5.5, 5, ['#8e2a2a', '#cc3f37', '#ec6a4e', '#ffc7a0']);
    canvas.line(8, 5, 9, 2, '#5a3b26');
    canvas.ellipse(11, 3, 2, 1, '#6aa548');
  } else if (frame === 4) {
    canvas.line(8, 14, 8, 5, '#5c74c4');
    for (const [x, y] of [[5, 8], [11, 6], [5, 11], [11, 10]]) canvas.ellipse(x, y, 2.4, 1.4, '#8aa0e8');
    canvas.pixel(8, 3, '#ffffff');
    canvas.pixel(4, 7, '#dfe7ff');
    canvas.pixel(12, 5, '#dfe7ff');
  } else if (frame === 5) {
    canvas.shadedEllipse(8, 9, 5, 5.5, ['#2b7d7a', '#45b2aa', '#82e3d4', '#e4fff7']);
    canvas.pixel(8, 3, '#82e3d4');
    canvas.pixel(7, 2, '#45b2aa');
  } else if (frame === 6) {
    canvas.line(4, 12, 11, 5, '#e6dfc6');
    canvas.line(5, 12, 12, 5, '#cfc6a6');
    for (const [x, y] of [[3, 12], [4, 13], [12, 4], [13, 5]]) canvas.ellipse(x, y, 1.6, 1.6, '#f4eedb');
  } else {
    // Carretel de seda.
    canvas.shadedEllipse(8, 8, 5, 5, ['#6f5a86', '#a28ab8', '#cdb9df', '#f3e9fb']);
    canvas.line(4, 6, 12, 10, '#e2d3ef');
    canvas.line(4, 9, 11, 5, '#e2d3ef');
    canvas.line(12, 11, 14, 14, '#cdb9df');
  }
}

makeSheet('ui/resource-icons.png', 16, 16, 8, 1, drawIcon);

// ---------- Efeitos ----------

const vfxEntries = [
  {
    name: 'slash-0', width: 32, height: 24, outline: false,
    draw: (canvas) => {
      canvas.line(4, 19, 27, 4, '#70483b', 150);
      canvas.line(5, 18, 26, 5, '#f5c86f');
      canvas.line(7, 16, 24, 7, '#fff3bf');
    }
  },
  {
    name: 'slash-1', width: 32, height: 24, outline: false,
    draw: (canvas) => {
      canvas.polygon([[2, 18], [8, 9], [22, 2], [29, 4], [22, 10], [7, 22]], '#70483b', 150);
      canvas.polygon([[3, 17], [9, 10], [22, 3], [27, 5], [21, 9], [8, 20]], '#f4bd5f');
      canvas.polygon([[6, 16], [11, 10], [22, 4], [25, 5], [20, 8], [9, 17]], '#ffe39a');
      canvas.line(7, 16, 23, 6, '#fff5cf');
    }
  },
  {
    name: 'slash-2', width: 32, height: 24, outline: false,
    draw: (canvas) => {
      canvas.line(5, 18, 26, 5, '#f4c66c', 185);
      canvas.line(8, 16, 23, 8, '#fff4c4', 105);
      canvas.pixel(6, 17, '#fff8d9', 220);
      canvas.pixel(24, 6, '#fff8d9', 220);
    }
  },
  {
    name: 'spark-0', width: 12, height: 12, outline: false,
    draw: (canvas) => {
      canvas.rect(5, 1, 2, 10, '#ffe08a');
      canvas.rect(1, 5, 10, 2, '#ffe08a');
      canvas.rect(4, 4, 4, 4, '#fff8d2');
      canvas.pixel(3, 3, '#fff8d2');
      canvas.pixel(8, 8, '#fff8d2');
    }
  },
  {
    name: 'spark-1', width: 12, height: 12, outline: false,
    draw: (canvas) => {
      canvas.rect(4, 3, 4, 6, '#ffb84f');
      canvas.rect(3, 4, 6, 4, '#ffb84f');
      canvas.rect(5, 5, 2, 2, '#fff1a8');
    }
  },
  {
    name: 'ember-0', width: 6, height: 6, outline: false,
    draw: (canvas) => {
      canvas.rect(2, 1, 2, 4, '#e96d3e');
      canvas.pixel(2, 2, '#ffd46b');
      canvas.pixel(3, 3, '#fff0a8');
    }
  },
  {
    name: 'ember-1', width: 6, height: 6, outline: false,
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
    name: 'dust-0', width: 8, height: 6, outline: false,
    draw: (canvas) => {
      canvas.ellipse(2.5, 4, 2, 1.5, '#b8a982', 200);
      canvas.ellipse(5.5, 3, 2, 1.5, '#d2c49c', 200);
    }
  },
  {
    name: 'dust-1', width: 8, height: 6, outline: false,
    draw: (canvas) => {
      canvas.ellipse(4, 3, 2.5, 1.5, '#cdbf98', 170);
      canvas.pixel(1, 3, '#9f906e', 170);
    }
  },
  {
    name: 'firefly-0', width: 4, height: 4, outline: false,
    draw: (canvas) => {
      canvas.rect(1, 1, 2, 2, '#fff39a');
      canvas.pixel(0, 2, '#d9e86c');
    }
  },
  {
    name: 'firefly-1', width: 4, height: 4, outline: false,
    draw: (canvas) => {
      canvas.pixel(1, 1, '#d9e86c');
      canvas.pixel(2, 2, '#fff39a');
    }
  },
  {
    name: 'ring-0', width: 40, height: 32, outline: false,
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
    name: 'ring-1', width: 40, height: 32, outline: false,
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
    name: 'fog-dither', width: 32, height: 32, outline: false,
    draw: (canvas) => {
      for (let y = 0; y < 32; y += 1) {
        for (let x = 0; x < 32; x += 1) {
          const threshold = dither(x, y);
          if (threshold < 0.5) canvas.pixel(x, y, '#dbe8e5', 235);
          else if (threshold < 0.75) canvas.pixel(x, y, '#dbe8e5', 115);
        }
      }
    }
  }
];
makeAtlas('vfx/vfx-atlas.json', vfxEntries);

// ---------- Natureza ----------

function drawPine(canvas, shift) {
  canvas.shadow(20, 52, 15, 3.5, 105);
  // Tronco.
  canvas.rect(17, 40, 6, 12, BARK[1]);
  canvas.rect(17, 40, 2, 12, BARK[2]);
  canvas.rect(21, 40, 2, 12, BARK[0]);
  canvas.pixel(16, 51, BARK[1]);
  canvas.pixel(23, 51, BARK[0]);
  // Camadas de galhos, de baixo para cima; as de cima balançam mais.
  const tiers = [
    { apex: 18, base: 45, half: 17, sway: 0 },
    { apex: 9, base: 34, half: 14, sway: shift * 0.5 },
    { apex: 1, base: 23, half: 10, sway: shift }
  ];
  for (const tier of tiers) {
    const cx = 20 + tier.sway;
    const points = [[cx, tier.apex]];
    // Base em zigue-zague.
    const teeth = 5;
    for (let index = 0; index <= teeth; index += 1) {
      const t = index / teeth;
      const x = cx + tier.half - t * tier.half * 2;
      points.push([x, tier.base - (index % 2 ? 3 : 0)]);
    }
    canvas.forPolygon(points, (x, y) => {
      const across = (x + 0.5 - cx) / tier.half;
      const down = (y - tier.apex) / (tier.base - tier.apex);
      const value = -across * 0.8 + (1 - down) * 0.35 + (dither(x, y) - 0.5) * 0.35;
      const tone = value > 0.55 ? 4 : value > 0.15 ? 3 : value > -0.35 ? 2 : 1;
      canvas.pixel(x, y, LEAF[tone]);
    });
    // Sombra irregular da camada de cima sobre a de baixo.
    for (let x = Math.round(cx - tier.half * 0.5); x <= Math.round(cx + tier.half * 0.7); x += 1) {
      const y = tier.base + 1 + (hash(x, tier.base, 8) > 0.5 ? 1 : 0);
      if (canvas.alphaAt(x, y) > 0 && hash(x, y, 9) > 0.35) canvas.pixel(x, y, LEAF[1]);
    }
  }
  canvas.pixel(14 + shift, 13, LEAF[4]);
  canvas.pixel(12, 27, LEAF[4]);
  canvas.pixel(26, 38, LEAF[1]);
}

function drawRoundTree(canvas, palette, fruit = null) {
  canvas.shadow(24, 51, 17, 4, 105);
  canvas.rect(21, 30, 7, 21, BARK[1]);
  canvas.rect(21, 30, 2, 21, BARK[2]);
  canvas.rect(26, 30, 2, 21, BARK[0]);
  canvas.line(23, 34, 15, 26, BARK[1]);
  canvas.line(26, 36, 34, 26, BARK[1]);
  canvas.rect(19, 49, 3, 2, BARK[1]);
  canvas.rect(27, 49, 3, 2, BARK[0]);
  const colors = ramp(palette);
  for (const [x, y, rx, ry] of [[24, 22, 16, 13], [13, 26, 9, 8], [35, 26, 9, 8], [18, 13, 9, 8], [31, 13, 9, 8], [24, 8, 8, 6]]) {
    canvas.shadedEllipse(x, y, rx, ry, colors);
  }
  // Folhas soltas na borda.
  for (let index = 0; index < 14; index += 1) {
    const angle = hash(index, 3, palette.length) * Math.PI * 2;
    const x = 24 + Math.cos(angle) * 17;
    const y = 20 + Math.sin(angle) * 14;
    if (canvas.alphaAt(Math.round(x), Math.round(y)) > 200) canvas.pixel(x, y, colors[index % 2 ? 2 : 0]);
  }
  if (fruit) {
    for (const [x, y] of [[16, 24], [30, 18], [26, 29], [20, 14], [35, 26]]) {
      canvas.rect(x, y, 2, 2, fruit);
      canvas.pixel(x, y, lighten(fruit, 0.4));
    }
  }
}

function drawRock(canvas, cx, cy, width, height, colors = STONE) {
  const points = [
    [cx - width, cy + height * 0.5], [cx - width * 0.8, cy - height * 0.4], [cx - width * 0.2, cy - height],
    [cx + width * 0.5, cy - height * 0.8], [cx + width, cy - height * 0.1], [cx + width * 0.8, cy + height * 0.6],
    [cx, cy + height * 0.8]
  ];
  canvas.forPolygon(points, (x, y) => {
    const nx = (x - cx) / width;
    const ny = (y - cy) / height;
    const value = -nx * 0.6 - ny * 0.9 + (dither(x, y) - 0.5) * 0.3;
    canvas.pixel(x, y, colors[value > 0.75 ? 4 : value > 0.3 ? 3 : value > -0.3 ? 2 : 1]);
  });
  // Faceta de cima e rachaduras.
  canvas.line(Math.round(cx - width * 0.2), Math.round(cy - height * 0.2), Math.round(cx + width * 0.4), Math.round(cy + height * 0.3), colors[1]);
  canvas.pixel(cx - width * 0.5, cy - height * 0.3, colors[4]);
}

const natureEntries = [
  ...[0, 1, 2].map((frame) => ({
    name: `pine-${frame}`, width: 40, height: 56,
    draw: (canvas) => drawPine(canvas, frame === 1 ? -1 : frame === 2 ? 1 : 0)
  })),
  { name: 'autumn-tree', width: 48, height: 56, draw: (canvas) => drawRoundTree(canvas, '#c56a3f') },
  { name: 'oak-tree', width: 48, height: 56, draw: (canvas) => drawRoundTree(canvas, '#4c8b49') },
  { name: 'fruit-tree', width: 48, height: 56, draw: (canvas) => drawRoundTree(canvas, '#5a9650', '#d8413a') },
  {
    name: 'bush', width: 32, height: 24,
    draw: (canvas) => {
      canvas.shadow(16, 21, 13, 3, 105);
      const colors = ramp('#4a8448');
      for (const [x, y, rx, ry] of [[10, 14, 7, 6], [21, 13, 8, 8], [16, 9, 6, 5], [25, 16, 5, 4.5]]) canvas.shadedEllipse(x, y, rx, ry, colors);
      for (const [x, y] of [[9, 12], [19, 10], [24, 15], [14, 16]]) {
        canvas.rect(x, y, 2, 2, '#c8453c');
        canvas.pixel(x, y, '#f28a6c');
      }
    }
  },
  {
    name: 'resource-wood', width: 28, height: 28,
    draw: (canvas) => {
      // Toco de árvore com anéis e raízes.
      canvas.shadow(14, 24, 12, 3, 110);
      canvas.rect(6, 12, 16, 10, BARK[1]);
      canvas.rect(6, 12, 4, 10, BARK[2]);
      canvas.rect(18, 12, 4, 10, BARK[0]);
      for (const x of [9, 13, 16]) canvas.line(x, 14, x, 21, BARK[0]);
      canvas.polygon([[3, 23], [7, 18], [9, 23]], BARK[1]);
      canvas.polygon([[19, 23], [21, 18], [25, 23]], BARK[0]);
      canvas.ellipse(14, 12, 8, 3.5, '#c99a62');
      canvas.ellipse(14, 12, 5.5, 2.3, '#dcb27b');
      canvas.ellipse(14, 12, 3, 1.3, '#c99a62');
      canvas.pixel(14, 12, '#a77a48');
      canvas.pixel(10, 11, '#f0cf9a');
      // Machadinha cravada.
      canvas.line(19, 4, 15, 11, '#7c5434');
      canvas.polygon([[17, 3], [22, 2], [22, 6], [19, 6]], STONE[3]);
      canvas.pixel(21, 3, STONE[4]);
    }
  },
  {
    name: 'resource-stone', width: 28, height: 28,
    draw: (canvas) => {
      canvas.shadow(14, 23, 12, 3, 110);
      drawRock(canvas, 13, 15, 10, 8);
      drawRock(canvas, 21, 19, 4, 3);
      canvas.pixel(6, 19, '#5f9650');
      canvas.pixel(7, 20, '#4a7b48');
    }
  },
  {
    name: 'resource-herbs', width: 28, height: 28,
    draw: (canvas) => {
      canvas.shadow(14, 24, 10, 3, 100);
      const leaf = ['#3d7a3a', '#5f9e45', '#8cc55c', '#c3e88a'];
      for (const [x, y, angle] of [[9, 15, -0.6], [19, 14, 0.6], [11, 10, -0.3], [17, 9, 0.3], [14, 17, 0]]) {
        canvas.line(14, 23, x, y, leaf[0]);
        canvas.shadedEllipse(x, y, 3, 2 + Math.abs(angle), leaf);
      }
      for (const [x, y] of [[10, 7], [18, 6], [14, 5]]) {
        canvas.pixel(x, y, '#f2efb0');
        canvas.pixel(x, y + 1, '#d9cf6a');
      }
    }
  },
  {
    name: 'resource-moonherb', width: 28, height: 28,
    draw: (canvas) => {
      canvas.shadow(14, 24, 10, 3, 100);
      canvas.ellipse(14, 13, 10, 9, '#9fb6ff', 45);
      const leaf = ['#3b4f98', '#5c74c4', '#8aa0e8', '#dfe7ff'];
      for (const [x, y] of [[9, 15], [19, 14], [11, 10], [17, 9], [14, 17]]) {
        canvas.line(14, 23, x, y, leaf[0]);
        canvas.shadedEllipse(x, y, 3, 2, leaf);
      }
      for (const [x, y] of [[14, 4], [9, 6], [19, 5]]) {
        canvas.pixel(x, y, '#ffffff');
        canvas.pixel(x - 1, y, '#c9d6ff', 160);
        canvas.pixel(x + 1, y, '#c9d6ff', 160);
      }
    }
  },
  {
    name: 'resource-ectoplasm', width: 28, height: 28,
    draw: (canvas) => {
      canvas.shadow(14, 24, 9, 3, 100);
      canvas.ellipse(14, 15, 10, 10, '#7ff0d8', 40);
      canvas.shadedEllipse(14, 16, 7, 7, ['#2b7d7a', '#45b2aa', '#82e3d4', '#e4fff7']);
      canvas.shadedEllipse(14, 9, 4, 4, ['#2b7d7a', '#45b2aa', '#82e3d4', '#e4fff7']);
      canvas.pixel(14, 4, '#82e3d4');
      canvas.pixel(12, 20, '#e4fff7');
    }
  },
  {
    name: 'death-backpack', width: 28, height: 28,
    draw: (canvas) => {
      canvas.shadow(14, 24, 11, 3, 110);
      canvas.rect(6, 8, 16, 15, LEATHER[1]);
      canvas.rect(6, 8, 3, 15, LEATHER[2]);
      canvas.rect(19, 8, 3, 15, LEATHER[0]);
      canvas.rect(8, 5, 12, 5, LEATHER[2]);
      canvas.rect(8, 9, 12, 1, LEATHER[0]);
      canvas.rect(12, 13, 4, 5, '#8d5c36');
      canvas.rect(13, 11, 2, 3, '#e8c15a');
      canvas.pixel(13, 11, '#fff0a6');
      canvas.rect(4, 12, 2, 8, LEATHER[0]);
      canvas.rect(22, 12, 2, 8, LEATHER[0]);
      canvas.rect(11, 2, 6, 3, '#c7b089');
    }
  },
  {
    name: 'detail-grass', width: 20, height: 16, outline: false,
    draw: (canvas) => {
      tuft(canvas, 5, 14, 4);
      tuft(canvas, 13, 14, 3);
      canvas.pixel(9, 10, GRASS[5]);
    }
  },
  {
    name: 'detail-flowers', width: 20, height: 16, outline: false,
    draw: (canvas) => {
      canvas.line(6, 14, 6, 8, GRASS[3]);
      canvas.line(14, 14, 14, 9, GRASS[3]);
      canvas.pixel(7, 11, GRASS[4]);
      for (const [x, y, petal, heart] of [[6, 7, '#f6f0dd', '#e9b949'], [14, 8, '#e98a5c', '#ffd58a']]) {
        canvas.pixel(x - 1, y, petal); canvas.pixel(x + 1, y, petal); canvas.pixel(x, y - 1, petal); canvas.pixel(x, y + 1, petal);
        canvas.pixel(x, y, heart);
      }
    }
  },
  {
    name: 'detail-pebbles', width: 20, height: 12,
    draw: (canvas) => {
      drawRock(canvas, 6, 7, 3, 2);
      drawRock(canvas, 13, 6, 2.5, 2);
    }
  },
  {
    name: 'detail-leaves', width: 20, height: 12, outline: false,
    draw: (canvas) => {
      canvas.polygon([[2, 7], [6, 4], [10, 6], [6, 9]], '#9a7a43');
      canvas.line(3, 7, 9, 6, '#7a5c33');
      canvas.polygon([[11, 5], [15, 2], [18, 5], [14, 8]], '#b8823f');
      canvas.line(12, 6, 17, 4, '#8e6130');
    }
  },
  {
    name: 'detail-mushroom', width: 16, height: 16,
    draw: (canvas) => {
      canvas.shadow(8, 14, 5, 1.5, 90);
      canvas.rect(6, 9, 4, 5, '#e8dcc0');
      canvas.rect(8, 9, 2, 5, '#c8b996');
      canvas.forEllipse(8, 8, 5.5, 3.6, (x, y) => { if (y <= 8) canvas.pixel(x, y, '#c43f35'); });
      canvas.forEllipse(7, 6, 3, 1.6, (x, y) => canvas.pixel(x, y, '#e2584a'));
      canvas.pixel(5, 6, '#fbeedd');
      canvas.pixel(9, 5, '#fbeedd');
      canvas.pixel(11, 7, '#fbeedd');
    }
  }
];
makeAtlas('nature/nature-atlas.json', natureEntries);

// ---------- Prédios (64 x 64) ----------

function planks(canvas, x, y, width, height, base, vertical = false) {
  const colors = ramp(base);
  for (let py = y; py < y + height; py += 1) {
    for (let px = x; px < x + width; px += 1) {
      const along = vertical ? px - x : py - y;
      const seam = along % 4 === 3;
      const grain = hash(vertical ? px : Math.floor(px / 7) + py * 3, vertical ? Math.floor(py / 7) : py, 5) > 0.82;
      canvas.pixel(px, py, seam ? colors[0] : grain ? darken(base, 0.12) : base);
    }
  }
  // Luz na esquerda e sombra na direita.
  canvas.rect(x, y, 1, height, colors[2]);
  canvas.rect(x + width - 1, y, 1, height, colors[0]);
}

function bricks(canvas, x, y, width, height, base) {
  const colors = ramp(base);
  for (let py = y; py < y + height; py += 1) {
    const row = Math.floor((py - y) / 4);
    for (let px = x; px < x + width; px += 1) {
      const mortarRow = (py - y) % 4 === 3;
      const mortarCol = (px - x + (row % 2) * 4) % 8 === 7;
      const tone = hash(Math.floor((px - x + (row % 2) * 4) / 8), row, 9);
      const brick = tone > 0.7 ? colors[2] : tone < 0.25 ? darken(base, 0.12) : base;
      canvas.pixel(px, py, mortarRow || mortarCol ? colors[0] : brick);
    }
  }
}

function roof(canvas, points, base, apexY, baseY) {
  const colors = ramp(base);
  canvas.forPolygon(points, (x, y) => {
    const row = Math.floor((y - apexY) / 3);
    const seam = (y - apexY) % 3 === 2;
    const notch = (x + (row % 2) * 3) % 6 === 0;
    const light = 1 - (y - apexY) / Math.max(1, baseY - apexY);
    let color = seam ? colors[0] : notch ? darken(base, 0.15) : base;
    if (!seam && !notch && light > 0.7 && dither(x, y) < 0.5) color = colors[2];
    canvas.pixel(x, y, color);
  });
}

function windowLight(canvas, x, y, width = 8, height = 8) {
  canvas.rect(x - 1, y - 1, width + 2, height + 2, WOOD[0]);
  canvas.rect(x, y, width, height, '#f2c45c');
  canvas.rect(x, y + height / 2, width, height / 2, '#e09a3f');
  canvas.rect(x + width / 2 - 1, y, 1, height, WOOD[1]);
  canvas.rect(x, y + height / 2 - 1, width, 1, WOOD[1]);
  canvas.pixel(x + 1, y + 1, '#fff3c4');
  canvas.pixel(x + 2, y + 1, '#fff3c4');
  canvas.rect(x - 1, y + height + 1, width + 2, 1, WOOD[2]);
}

function door(canvas, x, y, width, height) {
  canvas.rect(x - 1, y - 1, width + 2, height + 1, WOOD[0]);
  planks(canvas, x, y, width, height, '#6e4a2c', true);
  canvas.rect(x + width - 3, y + Math.floor(height / 2), 1, 1, '#e8c15a');
  canvas.rect(x, y + 3, width, 1, '#4a3020');
  canvas.rect(x, y + height - 4, width, 1, '#4a3020');
}

function foundation(canvas, x, y, width) {
  for (let px = x; px < x + width; px += 4) {
    const shade = hash(px, y, 4) > 0.5 ? STONE[2] : STONE[1];
    canvas.rect(px, y, 4, 3, shade);
    canvas.pixel(px, y, STONE[3]);
    canvas.pixel(px + 3, y + 2, STONE[0]);
  }
}

function drawHouseBody(canvas, { wall, roofColor, timber = true }) {
  canvas.shadow(32, 58, 28, 4, 120);
  planks(canvas, 11, 30, 42, 22, wall);
  if (timber) {
    for (const x of [11, 31, 52]) canvas.rect(x, 30, 2, 22, WOOD[0]);
    canvas.rect(11, 30, 42, 2, WOOD[0]);
  }
  foundation(canvas, 10, 52, 44);
  roof(canvas, [[4, 33], [32, 7], [60, 33], [54, 35], [32, 15], [10, 35]], roofColor, 7, 35);
  roof(canvas, [[10, 35], [32, 15], [54, 35]], darken(wall, 0.3), 15, 35);
  // Frontão com janelinha redonda.
  canvas.shadedEllipse(32, 25, 3, 3, ['#9a5f2a', '#f2c45c', '#ffe39a', '#fff6d0']);
  canvas.line(4, 33, 32, 7, lighten(roofColor, 0.35));
  canvas.line(32, 7, 60, 33, darken(roofColor, 0.25));
}

// ---------- Evolução visual dos prédios (estágios 1 e 8; o estágio 4 é a arte acima) ----------
// Estágio 1 = simples e pequeno (64 x 64); estágio 8 = grande e detalhado (80 x 80, base em y≈67).

function lantern(canvas, x, y) {
  canvas.rect(x, y, 3, 1, '#3c3f45');
  canvas.rect(x, y + 1, 3, 4, '#f4b94d');
  canvas.pixel(x + 1, y + 2, '#fff0a0');
  canvas.rect(x, y + 5, 3, 1, '#3c3f45');
}

function flag(canvas, x, y, color, height = 10) {
  canvas.rect(x, y, 1, height, WOOD[1]);
  canvas.polygon([[x + 1, y], [x + 7, y + 2], [x + 1, y + 5]], color);
  canvas.pixel(x + 2, y + 1, lighten(color, 0.3));
}

function cropRows(canvas, x, y, columns, rows, color) {
  for (let row = 0; row < rows; row += 1) {
    canvas.rect(x, y + row * 5, columns * 5, 3, DIRT[1]);
    for (let column = 0; column < columns; column += 1) {
      canvas.rect(x + column * 5 + 1, y + row * 5 - 2, 3, 3, color);
      canvas.pixel(x + column * 5 + 2, y + row * 5 - 3, lighten(color, 0.3));
    }
  }
}

function fenceLine(canvas, x, y, length, color = WOOD[2]) {
  canvas.rect(x, y + 2, length, 1, color);
  canvas.rect(x, y + 5, length, 1, darken(color, 0.15));
  for (let px = x; px <= x + length; px += 6) {
    canvas.rect(px, y, 2, 8, color);
    canvas.pixel(px, y, lighten(color, 0.2));
  }
}

const STAGE_ART = {
  'house-1': { size: 64, draw: (c) => {
    // Cabana de toras com telhado de palha.
    c.shadow(32, 57, 22, 3.5, 115);
    for (let y = 36; y < 54; y += 3) {
      c.rect(16, y, 32, 3, WOOD[2]);
      c.rect(16, y + 2, 32, 1, WOOD[0]);
      c.pixel(15, y + 1, WOOD[1]);
      c.pixel(48, y + 1, WOOD[1]);
    }
    roof(c, [[11, 38], [32, 18], [53, 38]], '#c9a24f', 18, 38);
    c.line(11, 38, 32, 18, '#e8c97a');
    c.rect(28, 42, 8, 12, '#3a2414');
    c.rect(29, 43, 6, 11, '#6e4628');
    c.rect(19, 41, 5, 4, '#2a1c12');
    c.pixel(20, 42, '#e09a3f');
    // Lenha empilhada.
    for (const [x, y] of [[50, 50], [53, 50], [51, 47]]) c.shadedEllipse(x, y, 1.8, 1.8, ['#5a3b26', '#94633a', '#c49556', '#e0c08a']);
  } },
  'house-8': { size: 80, draw: (c) => {
    // Casa de dois andares: térreo de pedra, andar de madeira, chaminé, varanda e jardim.
    c.shadow(40, 72, 34, 4.5, 125);
    bricks(c, 12, 48, 56, 20, '#9a948c');
    planks(c, 14, 28, 52, 20, '#b0814f');
    for (const x of [14, 32, 48, 64]) c.rect(x, 28, 2, 20, WOOD[0]);
    c.rect(14, 28, 52, 2, WOOD[0]);
    c.rect(12, 46, 56, 2, WOOD[0]);
    roof(c, [[6, 31], [40, 4], [74, 31], [67, 33], [40, 12], [13, 33]], '#3f5a8a', 4, 33);
    roof(c, [[13, 33], [40, 12], [67, 33]], '#6e4a2c', 12, 33);
    c.line(6, 31, 40, 4, '#7d9acb');
    // Água-furtada e chaminé.
    roof(c, [[30, 22], [40, 14], [50, 22]], '#3f5a8a', 14, 22);
    windowLight(c, 37, 18, 6, 5);
    bricks(c, 56, 6, 8, 18, '#7a746c');
    c.rect(55, 5, 10, 2, STONE[3]);
    // Janelas iluminadas e porta.
    for (const x of [18, 54]) windowLight(c, x, 32);
    for (const x of [18, 54]) windowLight(c, x, 52, 8, 7);
    door(c, 35, 52, 10, 16);
    // Varanda com grade.
    c.rect(28, 45, 24, 2, WOOD[3]);
    for (let x = 28; x < 52; x += 3) c.rect(x, 41, 1, 4, WOOD[1]);
    c.rect(28, 41, 24, 1, WOOD[2]);
    lantern(c, 31, 52);
    lantern(c, 47, 52);
    foundation(c, 11, 68, 58);
    // Canteiros de flores.
    for (const x of [14, 58]) {
      c.rect(x, 64, 8, 3, WOOD[1]);
      for (let i = 0; i < 4; i += 1) c.pixel(x + 1 + i * 2, 63, ['#e05a4f', '#f2d36b', '#c59cff', '#f4efe0'][i]);
    }
  } },
  'forge-1': { size: 64, draw: (c) => {
    // Abrigo simples: telhado inclinado em postes, forja de pedra pequena e bigorna num toco.
    c.shadow(32, 57, 24, 3.5, 115);
    for (const x of [12, 30, 48]) c.rect(x, 30, 3, 24, WOOD[1]);
    c.polygon([[8, 32], [52, 22], [56, 26], [12, 36]], '#6e4628');
    for (let x = 10; x < 54; x += 5) c.line(x, 34 - (x - 8) * 0.22, x + 2, 33 - (x - 8) * 0.22, WOOD[0]);
    // Forja de pedra com brasa.
    c.forEllipse(22, 48, 8, 6, (x, y) => c.pixel(x, y, hash(x, y, 2) > 0.5 ? STONE[2] : STONE[1]));
    c.ellipse(22, 46, 4, 2.5, '#e0602a');
    c.ellipse(22, 46, 2, 1.2, '#ffd76b');
    // Bigorna sobre um toco.
    c.rect(37, 49, 8, 5, BARK[1]);
    c.rect(35, 46, 12, 3, '#5a5f66');
    c.rect(35, 46, 12, 1, '#9aa3ab');
    c.line(48, 38, 51, 44, WOOD[2]);
    c.rect(46, 37, 4, 2, '#7d858c');
  } },
  'forge-8': { size: 80, draw: (c) => {
    // Grande oficina de mestre: paredes de pedra, duas chaminés, fornalha em arco e rack de armas.
    c.shadow(40, 72, 36, 4.5, 130);
    bricks(c, 10, 34, 60, 34, '#77736c');
    roof(c, [[4, 37], [36, 10], [68, 37], [61, 39], [36, 18], [11, 39]], '#3a3e44', 10, 39);
    c.line(4, 37, 36, 10, '#9aa3ab');
    c.line(36, 10, 68, 37, '#6c747c');
    for (const x of [14, 58]) bricks(c, x, 4, 10, 30, '#5f5b55');
    for (const x of [13, 57]) c.rect(x, 3, 12, 2, STONE[3]);
    // Fornalha em arco com fogo forte.
    c.rect(14, 44, 22, 24, '#241e20');
    c.forEllipse(25, 44, 11, 7, (x, y) => { if (y <= 44) c.pixel(x, y, '#241e20'); });
    c.rect(17, 48, 16, 20, '#c2452c');
    c.rect(19, 52, 12, 16, '#f08a3a');
    c.rect(21, 57, 8, 11, '#ffd36b');
    c.pixel(24, 55, '#fff3c4');
    // Faixas de metal e emblema dourado.
    c.rect(10, 34, 60, 2, '#5a5f66');
    c.rect(10, 34, 60, 1, '#9aa3ab');
    c.shadedEllipse(52, 42, 4, 4, ['#8a5a14', '#d99a2b', '#ffe08a', '#fff6c8']);
    c.rect(50, 41, 4, 2, '#5a3b26');
    // Bigorna grande, barril de têmpera e rack com espadas.
    c.rect(40, 62, 14, 4, '#3c3f45');
    c.rect(38, 60, 18, 3, '#5a5f66');
    c.rect(38, 60, 18, 1, '#9aa3ab');
    c.rect(43, 66, 8, 3, '#2f3237');
    c.shadedEllipse(64, 62, 4, 5, ramp('#6e4628'));
    c.ellipse(64, 58, 3.5, 1.5, '#3f84c4');
    for (const x of [44, 48, 52]) {
      c.line(x, 46, x, 56, '#cfd0c4');
      c.rect(x - 1, 55, 3, 1, '#8a5a14');
    }
    c.rect(42, 46, 13, 1, WOOD[1]);
    foundation(c, 9, 68, 62);
  } },
  'farm-1': { size: 64, draw: (c) => {
    // Pequena horta cercada, galpão de ferramentas e espantalho.
    c.shadow(32, 58, 26, 3.5, 100);
    c.rect(8, 36, 40, 18, DIRT[2]);
    cropRows(c, 10, 40, 7, 3, '#6fa84b');
    fenceLine(c, 6, 32, 44);
    fenceLine(c, 6, 52, 44);
    // Galpão.
    planks(c, 48, 34, 12, 18, '#8a5e38', true);
    c.polygon([[46, 35], [54, 27], [62, 35]], '#6e4628');
    c.rect(52, 42, 4, 10, '#3a2414');
    // Espantalho.
    c.rect(28, 20, 1, 14, WOOD[1]);
    c.rect(24, 24, 9, 1, WOOD[1]);
    c.shadedEllipse(28.5, 19, 2.5, 2.5, ramp('#d9b45c'));
    c.rect(25, 16, 7, 2, '#8a5a14');
    c.rect(26, 25, 5, 5, '#3f6b8a');
  } },
  'farm-8': { size: 80, draw: (c) => {
    // Fazenda completa: celeiro grande, silo, moinho e canal de irrigação entre as plantações.
    c.shadow(40, 73, 36, 4.5, 115);
    // Moinho (esquerda).
    c.polygon([[4, 66], [8, 30], [16, 30], [20, 66]], '#e3d8b0');
    c.polygon([[16, 30], [20, 66], [14, 66], [13, 30]], '#b8ad88');
    c.polygon([[6, 32], [12, 22], [18, 32]], '#8a3a2a');
    for (const [dx, dy] of [[-12, -10], [12, -10], [12, 10], [-12, 10]]) c.line(12, 30, 12 + dx, 30 + dy, '#d9c8a0');
    c.shadedEllipse(12, 30, 2, 2, ramp('#6e4628'));
    // Silo.
    c.rect(22, 30, 12, 36, '#c9bd94');
    for (let y = 32; y < 66; y += 4) c.rect(22, y, 12, 1, '#a69a74');
    c.rect(22, 30, 3, 36, '#e3d8b0');
    c.forEllipse(28, 30, 6.5, 6, (x, y) => { if (y <= 30) c.pixel(x, y, '#9a3e35'); });
    // Celeiro grande.
    planks(c, 36, 34, 40, 32, '#a83f33', true);
    c.rect(36, 34, 40, 2, '#efe6d2');
    roof(c, [[32, 37], [56, 12], [80, 37], [75, 39], [56, 20], [37, 39]], '#5b3a2e', 12, 39);
    c.line(32, 37, 56, 12, '#efe6d2');
    c.rect(48, 46, 16, 20, '#efe6d2');
    c.rect(49, 47, 14, 19, '#7d2c25');
    c.line(49, 47, 62, 65, '#efe6d2');
    c.line(62, 47, 49, 65, '#efe6d2');
    c.rect(53, 25, 6, 5, '#efe6d2');
    c.rect(54, 26, 4, 3, '#3a1e1a');
    foundation(c, 35, 66, 42);
    // Canal de irrigação e plantações na frente.
    c.rect(2, 70, 76, 3, '#3f84c4');
    c.rect(2, 70, 76, 1, '#a9d4ff');
    cropRows(c, 4, 76, 6, 1, '#d8b75d');
    cropRows(c, 44, 76, 6, 1, '#6fa84b');
  } },
  'store-1': { size: 64, draw: (c) => {
    // Banca simples: mesa, toldo em dois postes e poucos produtos.
    c.shadow(32, 57, 22, 3.5, 110);
    for (const x of [16, 46]) c.rect(x, 28, 2, 26, WOOD[1]);
    for (let x = 12; x < 52; x += 1) {
      const stripe = Math.floor((x - 12) / 5) % 2 === 0;
      c.rect(x, 26, 1, 6, stripe ? '#d8463b' : '#f3ead4');
      if (x % 5 < 2) c.pixel(x, 32, stripe ? '#a8342c' : '#d6cbb0');
    }
    planks(c, 18, 44, 28, 8, '#8a5e38');
    c.rect(18, 43, 28, 2, WOOD[3]);
    for (const [x, color] of [[23, '#d8413a'], [28, '#e9a13b'], [38, '#6fa84b']]) c.shadedEllipse(x, 41, 2, 1.8, ramp(color));
    planks(c, 47, 46, 8, 7, '#9a6c45');
    c.line(47, 46, 54, 52, WOOD[0]);
  } },
  'store-8': { size: 80, draw: (c) => {
    // Mercado completo: prédio com várias bancas, toldos coloridos, barris, bandeiras e lanternas.
    c.shadow(40, 72, 36, 4.5, 125);
    planks(c, 12, 26, 56, 26, '#b08451');
    roof(c, [[6, 29], [40, 6], [74, 29], [67, 31], [40, 14], [13, 31]], '#9a3e35', 6, 31);
    c.line(6, 29, 40, 6, '#d06a5a');
    windowLight(c, 20, 32);
    windowLight(c, 52, 32);
    c.rect(32, 30, 16, 9, WOOD[1]);
    c.rect(33, 31, 14, 7, WOOD[2]);
    c.shadedEllipse(40, 34.5, 3, 3, ['#a8761c', '#e8b83a', '#ffe07a', '#fff6c8']);
    // Três bancas com toldos de cores diferentes.
    for (const [x, colorA, colorB] of [[6, '#2f6ea8', '#f3ead4'], [29, '#d8463b', '#f3ead4'], [52, '#3f8a3a', '#f3ead4']]) {
      for (let px = x; px < x + 22; px += 1) {
        const stripe = Math.floor((px - x) / 4) % 2 === 0;
        c.rect(px, 46, 1, 6, stripe ? colorA : colorB);
        if (px % 4 < 2) c.pixel(px, 52, stripe ? darken(colorA, 0.25) : '#d6cbb0');
      }
      for (const post of [x + 1, x + 20]) c.rect(post, 52, 1, 12, WOOD[0]);
      planks(c, x + 1, 60, 20, 6, '#7c5434');
      c.rect(x + 1, 59, 20, 1, WOOD[3]);
    }
    for (const [x, color] of [[10, '#d8413a'], [15, '#f2d36b'], [33, '#e9a13b'], [38, '#c59cff'], [56, '#6fa84b'], [61, '#d8413a']]) {
      c.shadedEllipse(x, 57, 2, 1.8, ramp(color));
    }
    for (const x of [2, 74]) c.shadedEllipse(x + 2, 64, 3, 4, ramp('#8a5e38'));
    flag(c, 10, 10, '#e8c13a');
    flag(c, 66, 10, '#2f6ea8');
    lantern(c, 28, 40);
    lantern(c, 50, 40);
    foundation(c, 11, 66, 58);
  } }
};

for (const stage of [4, 8]) {
  for (let frame = 0; frame < 4; frame += 1) {
    const sway = [0, 1, -1, 1][frame];
    const tall = [6, 4, 7, 5][frame];
    STAGE_ART[`campfire${stage}-${frame}`] = stage === 4
      ? { size: 32, draw: (c) => {
        // Fogueira maior: anel de pedras largas e bancos de tora ao redor.
        c.shadow(16, 28, 14, 3, 110);
        for (const [x, y] of [[4, 26], [9, 28], [16, 29], [23, 28], [28, 26], [3, 22], [29, 22]]) c.shadedEllipse(x, y, 2.6, 2, STONE.slice(1));
        c.rect(0, 30, 7, 2, BARK[2]);
        c.rect(25, 30, 7, 2, BARK[2]);
        c.line(8, 26, 24, 20, BARK[1]);
        c.line(8, 20, 24, 26, BARK[0]);
        c.polygon([[16 + sway, tall], [9, 18], [11, 25], [21, 25], [23, 17], [19, tall + 5]], '#d9542e');
        c.polygon([[16 - sway, tall + 4], [11, 19], [13, 24], [19, 24], [20, 17]], '#f2913a');
        c.polygon([[16 + sway, tall + 8], [14, 20], [16, 24], [18, 20]], '#ffd76b');
        c.pixel(16, 23, '#fff4c8');
      } }
      : { size: 40, draw: (c) => {
        // Braseiro do grande fogo: pedestal de pedra, bacia de ferro e chamas altas.
        c.shadow(20, 37, 15, 3, 115);
        c.rect(12, 26, 16, 10, STONE[2]);
        c.rect(12, 26, 4, 10, STONE[3]);
        c.rect(24, 26, 4, 10, STONE[1]);
        c.rect(10, 34, 20, 3, STONE[1]);
        c.forEllipse(20, 24, 12, 5, (x, y) => c.pixel(x, y, y < 23 ? '#5a5f66' : '#3c3f45'));
        c.rect(8, 22, 24, 1, '#9aa3ab');
        c.polygon([[20 + sway, tall - 4], [11, 16], [13, 23], [27, 23], [29, 15], [24, tall + 2]], '#d9542e');
        c.polygon([[20 - sway, tall], [13, 17], [16, 22], [24, 22], [26, 16]], '#f2913a');
        c.polygon([[20 + sway, tall + 6], [17, 18], [20, 22], [23, 18]], '#ffd76b');
        c.pixel(20, 20, '#fff4c8');
        for (const x of [6, 34]) {
          c.rect(x - 1, 14, 2, 22, WOOD[1]);
          c.polygon([[x - 2, 10], [x, 6], [x + 2, 10], [x, 13]], '#ffb04a');
        }
      } };
  }
}

const buildingEntries = [
  {
    name: 'house', width: 64, height: 64,
    draw: (canvas) => {
      drawHouseBody(canvas, { wall: '#a8794a', roofColor: '#4f6286' });
      // Chaminé de pedra.
      bricks(canvas, 42, 10, 7, 14, '#8a8580');
      canvas.rect(41, 9, 9, 2, STONE[3]);
      door(canvas, 28, 39, 9, 13);
      windowLight(canvas, 16, 37);
      windowLight(canvas, 41, 37);
      // Floreiras.
      for (const x of [15, 40]) {
        canvas.rect(x, 47, 10, 2, WOOD[1]);
        for (let index = 0; index < 4; index += 1) canvas.pixel(x + 1 + index * 2, 46, index % 2 ? '#f2d36b' : '#e05a4f');
      }
    }
  },
  {
    name: 'forge', width: 64, height: 64,
    draw: (canvas) => {
      canvas.shadow(32, 58, 28, 4, 120);
      bricks(canvas, 11, 30, 42, 22, '#7f7b74');
      foundation(canvas, 10, 52, 44);
      roof(canvas, [[4, 33], [30, 9], [56, 33], [50, 35], [30, 17], [10, 35]], '#4a4648', 9, 35);
      roof(canvas, [[10, 35], [30, 17], [50, 35]], '#3a3436', 17, 35);
      // Chaminé alta (a fumaça sai daqui).
      bricks(canvas, 45, 4, 9, 30, '#6c6862');
      canvas.rect(44, 3, 11, 2, STONE[3]);
      canvas.rect(46, 5, 7, 1, '#2a2426');
      // Fornalha acesa.
      canvas.rect(15, 37, 14, 15, '#2a2426');
      canvas.polygon([[15, 39], [22, 34], [29, 39]], '#2a2426');
      canvas.rect(17, 41, 10, 11, '#c2452c');
      canvas.rect(18, 44, 8, 8, '#f08a3a');
      canvas.rect(19, 47, 6, 5, '#ffd36b');
      canvas.pixel(21, 43, '#ffe9a6');
      // Bigorna e martelo.
      canvas.rect(36, 46, 12, 3, '#3c3f45');
      canvas.rect(34, 45, 16, 2, '#5a5f66');
      canvas.pixel(35, 45, '#9aa3ab');
      canvas.rect(39, 49, 6, 4, '#2f3237');
      canvas.line(44, 40, 47, 44, WOOD[2]);
      canvas.rect(42, 39, 4, 2, '#7d858c');
      windowLight(canvas, 38, 33, 7, 6);
    }
  },
  {
    name: 'farm', width: 64, height: 64,
    draw: (canvas) => {
      canvas.shadow(32, 58, 28, 4, 120);
      // Silo.
      canvas.rect(2, 24, 14, 29, '#c9bd94');
      for (let y = 26; y < 52; y += 4) canvas.rect(2, y, 14, 1, '#a69a74');
      canvas.rect(2, 24, 3, 29, '#e3d8b0');
      canvas.rect(13, 24, 3, 29, '#9a8f6a');
      canvas.forEllipse(9, 24, 7.5, 7, (x, y) => { if (y <= 24) canvas.pixel(x, y, y < 20 ? '#a24a3c' : '#86382f'); });
      // Celeiro vermelho com friso branco.
      planks(canvas, 18, 30, 36, 22, '#a83f33', true);
      canvas.rect(18, 30, 36, 2, '#efe6d2');
      foundation(canvas, 17, 52, 38);
      roof(canvas, [[13, 33], [36, 10], [59, 33], [54, 35], [36, 18], [18, 35]], '#5b3a2e', 10, 35);
      canvas.line(13, 33, 36, 10, '#efe6d2');
      canvas.line(36, 10, 59, 33, '#d4c9b0');
      // Portão com X.
      canvas.rect(29, 38, 14, 14, '#efe6d2');
      canvas.rect(30, 39, 12, 12, '#7d2c25');
      canvas.line(30, 39, 41, 50, '#efe6d2');
      canvas.line(41, 39, 30, 50, '#efe6d2');
      canvas.rect(33, 22, 6, 5, '#efe6d2');
      canvas.rect(34, 23, 4, 3, '#3a1e1a');
      // Feno e abóboras na frente.
      canvas.rect(46, 47, 7, 5, '#e2bf5a');
      canvas.line(46, 49, 52, 49, '#b8913c');
      canvas.shadedEllipse(23, 53, 3, 2.5, ['#a3471e', '#e07a2c', '#f5a24a', '#ffd38a']);
      canvas.pixel(23, 50, '#4a7b48');
    }
  },
  {
    name: 'store', width: 64, height: 64,
    draw: (canvas) => {
      drawHouseBody(canvas, { wall: '#b08451', roofColor: '#9a3e35' });
      // Toldo listrado.
      for (let x = 12; x < 52; x += 1) {
        const stripe = Math.floor((x - 12) / 4) % 2 === 0;
        canvas.rect(x, 33, 1, 5, stripe ? '#d8463b' : '#f3ead4');
        // Borda recortada do toldo.
        if (x % 4 < 2) canvas.pixel(x, 38, stripe ? '#a8342c' : '#d6cbb0');
      }
      canvas.rect(12, 33, 40, 1, '#f9f3e6');
      // Balcão com mercadorias.
      planks(canvas, 13, 44, 38, 8, '#7c5434');
      canvas.rect(13, 43, 38, 2, WOOD[3]);
      for (const [x, color] of [[16, '#d8413a'], [20, '#e9a13b'], [24, '#6fa84b'], [41, '#d8413a'], [45, '#f2d36b']]) {
        canvas.shadedEllipse(x, 41, 2, 1.8, ramp(color));
      }
      canvas.rect(28, 39, 8, 5, '#8d6440');
      canvas.rect(28, 39, 8, 1, '#c49556');
      // Placa com moeda.
      canvas.rect(27, 22, 10, 7, WOOD[1]);
      canvas.rect(28, 23, 8, 5, WOOD[2]);
      canvas.shadedEllipse(32, 25.5, 2.5, 2.5, ['#a8761c', '#e8b83a', '#ffe07a', '#fff6c8']);
      // Caixotes.
      planks(canvas, 54, 45, 8, 7, '#9a6c45');
      canvas.line(54, 45, 61, 51, WOOD[0]);
      canvas.line(61, 45, 54, 51, WOOD[0]);
    }
  },
  ...[0, 1, 2, 3].map((frame) => ({
    name: `campfire-${frame}`, width: 24, height: 30,
    draw: (canvas) => {
      canvas.shadow(12, 26, 10, 2.5, 110);
      // Pedras em volta.
      for (const [x, y] of [[4, 24], [8, 26], [13, 26], [18, 25], [20, 22], [3, 21]]) {
        canvas.shadedEllipse(x, y, 2.2, 1.7, STONE.slice(1));
      }
      // Lenha cruzada.
      canvas.line(5, 24, 19, 19, BARK[1]);
      canvas.line(5, 23, 19, 18, BARK[2]);
      canvas.line(6, 18, 19, 24, BARK[1]);
      canvas.line(6, 19, 19, 25, BARK[0]);
      // Chamas em três camadas, mudando a cada quadro.
      const sway = [0, 1, -1, 1][frame];
      const tall = [6, 4, 7, 5][frame];
      canvas.polygon([[12 + sway, tall], [6, 16], [8, 22], [16, 22], [18, 15], [15, tall + 5]], '#d9542e');
      canvas.polygon([[12 - sway, tall + 4], [8, 17], [10, 21], [15, 21], [16, 15]], '#f2913a');
      canvas.polygon([[12 + sway, tall + 8], [10, 18], [12, 21], [14, 18]], '#ffd76b');
      canvas.pixel(12, 20, '#fff4c8');
      if (frame % 2) canvas.pixel(16 + sway, tall + 2, '#f2913a');
      else canvas.pixel(8 - sway, tall + 5, '#ffd76b');
    }
  })),
  ...[0, 1, 2, 3].map((frame) => ({
    name: `smoke-${frame}`, width: 16, height: 24, outline: false,
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
      canvas.shadow(16, 15, 15, 1.5, 90);
      planks(canvas, 1, 5, 30, 3, '#8a5e38');
      planks(canvas, 1, 10, 30, 3, '#7a5232');
      for (const x of [4, 15, 26]) {
        canvas.rect(x, 2, 3, 13, WOOD[2]);
        canvas.rect(x, 2, 1, 13, WOOD[3]);
        canvas.rect(x + 2, 2, 1, 13, WOOD[1]);
        canvas.pixel(x + 1, 1, WOOD[2]);
      }
    }
  },
  {
    name: 'lamp', width: 20, height: 36,
    draw: (canvas) => {
      canvas.shadow(10, 34, 6, 1.5, 100);
      canvas.rect(9, 12, 3, 21, WOOD[1]);
      canvas.rect(9, 12, 1, 21, WOOD[2]);
      canvas.rect(7, 31, 7, 2, WOOD[0]);
      canvas.rect(4, 7, 12, 2, '#3c3f45');
      canvas.rect(6, 9, 8, 12, '#2f3237');
      canvas.rect(7, 10, 6, 10, '#f4b94d');
      canvas.rect(7, 15, 6, 5, '#e08a3a');
      canvas.rect(9, 12, 2, 4, '#fff0a0');
      canvas.rect(6, 21, 8, 1, '#3c3f45');
      canvas.rect(8, 4, 4, 3, '#3c3f45');
      canvas.pixel(9, 3, '#5a5f66');
    }
  },
  {
    name: 'warm-glow', width: 48, height: 48, outline: false,
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
];
// Estágios de evolução: house-1/house-8, forge-1/forge-8, ..., campfire4-*, campfire8-*.
// O estágio 4 dos prédios é a arte "house", "forge", "farm" e "store" acima.
for (const [name, art] of Object.entries(STAGE_ART)) {
  buildingEntries.push({ name, width: art.size, height: art.size, draw: art.draw });
}
makeAtlas('buildings/camp-atlas.json', buildingEntries);

makeAtlas('ui/panel-atlas.json', [{
  name: 'panel', width: 24, height: 24, outline: false,
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

console.log('Pixel art gerada em public/assets/.');

// ---------- Ilustrações dos capítulos (abertura de cada capítulo e final) ----------
for (const key of STORY_SCENE_KEYS) {
  writePng(path.join(root, 'story', /^\d+$/.test(key) ? `capitulo-${key}.png` : `${key}.png`), drawStoryScene(key));
}
