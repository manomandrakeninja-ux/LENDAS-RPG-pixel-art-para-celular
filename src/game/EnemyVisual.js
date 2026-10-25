import Phaser from 'phaser';
import { ENEMY_TYPES } from '../data/enemies.js';

const LOGICAL_SIZE = 32;
const ELITE_BORDER_COLOR = '#e2b64d';

function fillPixel(context, x, y, color) {
  context.fillStyle = color;
  context.fillRect(Math.floor(x), Math.floor(y), 1, 1);
}

function fillRect(context, x, y, width, height, color) {
  context.fillStyle = color;
  context.fillRect(Math.floor(x), Math.floor(y), Math.floor(width), Math.floor(height));
}

function fillEllipse(context, centerX, centerY, radiusX, radiusY, color) {
  context.fillStyle = color;
  const minimumX = Math.floor(centerX - radiusX);
  const maximumX = Math.ceil(centerX + radiusX);
  const minimumY = Math.floor(centerY - radiusY);
  const maximumY = Math.ceil(centerY + radiusY);
  for (let y = minimumY; y <= maximumY; y += 1) {
    for (let x = minimumX; x <= maximumX; x += 1) {
      const normalizedX = (x + 0.5 - centerX) / radiusX;
      const normalizedY = (y + 0.5 - centerY) / radiusY;
      if (normalizedX * normalizedX + normalizedY * normalizedY <= 1) {
        context.fillRect(x, y, 1, 1);
      }
    }
  }
}

function pointInPolygon(x, y, points) {
  let inside = false;
  for (let current = 0, previous = points.length - 1; current < points.length; previous = current, current += 1) {
    const [currentX, currentY] = points[current];
    const [previousX, previousY] = points[previous];
    const intersects = ((currentY > y) !== (previousY > y)) &&
      (x < (previousX - currentX) * (y - currentY) / (previousY - currentY) + currentX);
    if (intersects) inside = !inside;
  }
  return inside;
}

function fillPolygon(context, points, color) {
  context.fillStyle = color;
  const minimumX = Math.floor(Math.min(...points.map(([x]) => x)));
  const maximumX = Math.ceil(Math.max(...points.map(([x]) => x)));
  const minimumY = Math.floor(Math.min(...points.map(([, y]) => y)));
  const maximumY = Math.ceil(Math.max(...points.map(([, y]) => y)));
  for (let y = minimumY; y <= maximumY; y += 1) {
    for (let x = minimumX; x <= maximumX; x += 1) {
      if (pointInPolygon(x + 0.5, y + 0.5, points)) context.fillRect(x, y, 1, 1);
    }
  }
}

function drawLine(context, startX, startY, endX, endY, color) {
  let x = Math.round(startX);
  let y = Math.round(startY);
  const targetX = Math.round(endX);
  const targetY = Math.round(endY);
  const deltaX = Math.abs(targetX - x);
  const stepX = x < targetX ? 1 : -1;
  const deltaY = -Math.abs(targetY - y);
  const stepY = y < targetY ? 1 : -1;
  let error = deltaX + deltaY;

  while (true) {
    fillPixel(context, x, y, color);
    if (x === targetX && y === targetY) break;
    const doubledError = error * 2;
    if (doubledError >= deltaY) {
      error += deltaY;
      x += stepX;
    }
    if (doubledError <= deltaX) {
      error += deltaX;
      y += stepY;
    }
  }
}

function drawSlime(context, palette) {
  fillEllipse(context, 16, 17, 10, 10, palette.color);
  fillPixel(context, 11, 24, palette.shade);
  fillPixel(context, 20, 24, palette.shade);
  fillRect(context, 12, 14, 2, 2, palette.eye);
  fillRect(context, 18, 14, 2, 2, palette.eye);
  fillPixel(context, 12, 14, '#ffffff');
  fillPixel(context, 18, 14, '#ffffff');
}

function drawWolf(context, palette) {
  fillPolygon(context, [[7, 14], [10, 3], [15, 12]], palette.shade);
  fillPolygon(context, [[17, 12], [22, 3], [25, 14]], palette.shade);
  fillEllipse(context, 16, 18, 9, 8, palette.color);
  fillRect(context, 12, 16, 2, 2, palette.eye);
  fillRect(context, 18, 16, 2, 2, palette.eye);
  fillRect(context, 14, 21, 4, 2, palette.snout);
  fillPixel(context, 13, 21, palette.eye);
  fillPixel(context, 18, 21, palette.eye);
}

function drawBoar(context, palette) {
  fillEllipse(context, 16, 16, 11, 9, palette.color);
  fillRect(context, 12, 13, 2, 2, palette.eye);
  fillRect(context, 18, 13, 2, 2, palette.eye);
  fillRect(context, 13, 20, 6, 3, palette.shade);
  fillPixel(context, 12, 24, '#ffffff');
  fillPixel(context, 19, 24, '#ffffff');
}

function drawSkeleton(context, palette) {
  fillRect(context, 14, 13, 4, 11, palette.color);
  fillRect(context, 10, 15, 5, 1, palette.color);
  fillRect(context, 17, 15, 5, 1, palette.color);
  fillRect(context, 14, 23, 1, 4, palette.color);
  fillRect(context, 17, 23, 1, 4, palette.color);
  fillEllipse(context, 16, 9, 6, 6, palette.color);
  fillPixel(context, 13, 9, palette.eye);
  fillPixel(context, 18, 9, palette.eye);
  fillPixel(context, 15, 12, palette.eye);
}

function drawGhost(context, palette) {
  fillEllipse(context, 16, 13, 9, 10, palette.color);
  fillRect(context, 8, 20, 4, 3, palette.color);
  fillRect(context, 12, 22, 4, 4, palette.color);
  fillRect(context, 16, 20, 4, 4, palette.color);
  fillRect(context, 20, 19, 4, 3, palette.color);
  fillRect(context, 12, 11, 2, 3, palette.eye);
  fillRect(context, 18, 11, 2, 3, palette.eye);
  fillPixel(context, 15, 17, palette.shade);
}

function drawSpider(context, palette) {
  const legColor = palette.leg;
  drawLine(context, 11, 13, 2, 8, legColor);
  drawLine(context, 10, 17, 1, 16, legColor);
  drawLine(context, 11, 20, 2, 25, legColor);
  drawLine(context, 13, 22, 6, 29, legColor);
  drawLine(context, 21, 13, 30, 8, legColor);
  drawLine(context, 22, 17, 31, 16, legColor);
  drawLine(context, 21, 20, 30, 25, legColor);
  drawLine(context, 19, 22, 26, 29, legColor);
  fillEllipse(context, 16, 17, 8, 7, palette.color);
  fillPixel(context, 13, 15, palette.eye);
  fillPixel(context, 18, 15, palette.eye);
}

function drawWerewolf(context, palette) {
  fillPolygon(context, [[8, 15], [11, 3], [15, 13]], palette.shade);
  fillPolygon(context, [[17, 13], [21, 3], [24, 15]], palette.shade);
  fillEllipse(context, 16, 18, 10, 9, palette.color);
  fillRect(context, 11, 16, 3, 2, palette.eye);
  fillRect(context, 18, 16, 3, 2, palette.eye);
  fillRect(context, 14, 21, 4, 2, palette.snout);
  fillPixel(context, 13, 16, '#ffffff');
  fillPixel(context, 19, 16, '#ffffff');
}

const SILHOUETTE_DRAWERS = {
  slime: drawSlime,
  wolf: drawWolf,
  boar: drawBoar,
  skeleton: drawSkeleton,
  ghost: drawGhost,
  spider: drawSpider,
  werewolf: drawWerewolf
};

function paletteFor(kind) {
  const placeholder = ENEMY_TYPES[kind]?.placeholder;
  return {
    color: placeholder?.color ?? '#83c96b',
    shade: placeholder?.shade ?? '#4f7d4b',
    eye: placeholder?.eye ?? '#20231f',
    snout: placeholder?.snout ?? '#d8d2b8',
    leg: placeholder?.leg ?? '#111217'
  };
}

function drawLogicalSilhouette(context, kind, frame) {
  const bob = frame === 1 ? 1 : 0;
  context.save();
  context.translate(0, bob);
  (SILHOUETTE_DRAWERS[kind] ?? drawSlime)(context, paletteFor(kind));
  context.restore();
}

function ensureCanvasTexture(scene, kind, elite) {
  const size = elite
    ? ENEMY_TYPES[kind]?.placeholder?.eliteSize ?? 40
    : ENEMY_TYPES[kind]?.placeholder?.size ?? 32;
  const textureKey = `enemy-canvas-${kind}-${elite ? 'elite' : 'normal'}`;
  const animationKey = `enemy-canvas-${kind}-${elite ? 'elite' : 'normal'}-walk`;

  if (!scene.textures.exists(textureKey)) {
    const texture = scene.textures.createCanvas(textureKey, size * 2, size);
    const context = texture.getContext();
    context.imageSmoothingEnabled = false;
    context.clearRect(0, 0, size * 2, size);

    for (let frame = 0; frame < 2; frame += 1) {
      const logicalCanvas = document.createElement('canvas');
      logicalCanvas.width = LOGICAL_SIZE;
      logicalCanvas.height = LOGICAL_SIZE;
      const logicalContext = logicalCanvas.getContext('2d');
      logicalContext.imageSmoothingEnabled = false;
      logicalContext.clearRect(0, 0, LOGICAL_SIZE, LOGICAL_SIZE);
      drawLogicalSilhouette(logicalContext, kind, frame);

      context.imageSmoothingEnabled = false;
      context.drawImage(logicalCanvas, frame * size, 0, size, size);
      if (elite) {
        fillRect(context, frame * size, 0, size, 1, ELITE_BORDER_COLOR);
        fillRect(context, frame * size, size - 1, size, 1, ELITE_BORDER_COLOR);
        fillRect(context, frame * size, 0, 1, size, ELITE_BORDER_COLOR);
        fillRect(context, frame * size + size - 1, 0, 1, size, ELITE_BORDER_COLOR);
      }
    }

    texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    texture.refresh();
    texture.add('frame-0', 0, 0, 0, size, size);
    texture.add('frame-1', 0, size, 0, size, size);
  }

  if (!scene.anims.exists(animationKey)) {
    scene.anims.create({
      key: animationKey,
      frames: [
        { key: textureKey, frame: 'frame-0' },
        { key: textureKey, frame: 'frame-1' }
      ],
      frameRate: 6,
      repeat: -1
    });
  }

  return { textureKey, animationKey, size };
}

export function createEnemyCanvasTexture(scene, kind, elite = false) {
  return ensureCanvasTexture(scene, kind, elite).textureKey;
}

export function resolveEnemyVisual(scene, kind, elite = false) {
  const visual = ensureCanvasTexture(scene, kind, elite);
  return {
    texture: visual.textureKey,
    frame: 'frame-0',
    animation: visual.animationKey,
    shape: ENEMY_TYPES[kind]?.placeholder?.shape ?? kind,
    isPlaceholder: true,
    isFallback: false
  };
}
