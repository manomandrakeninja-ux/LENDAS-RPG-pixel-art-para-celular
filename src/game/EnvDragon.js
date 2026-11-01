import Phaser from 'phaser';
import { PixelCanvas } from '../art/pixel.js';
import { OVERLAY_DEPTH } from './depths.js';

// ---------- Dragão ambiental: silhueta que cruza o céu de vez em quando ----------
// Só evento visual (com sombra no chão e rugido distante); não causa dano.

const W = 72;
const H = 44;

function fillTri(canvas, x0, y0, x1, y1, x2, y2, color) {
  const minX = Math.floor(Math.min(x0, x1, x2));
  const maxX = Math.ceil(Math.max(x0, x1, x2));
  const minY = Math.floor(Math.min(y0, y1, y2));
  const maxY = Math.ceil(Math.max(y0, y1, y2));
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      // Teste de ponto no triângulo (coordenadas baricêntricas por área com sinal).
      const d = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0);
      if (d === 0) continue;
      const a = ((x1 - x) * (y2 - y) - (x2 - x) * (y1 - y)) / d;
      const b = ((x2 - x) * (y0 - y) - (x0 - x) * (y2 - y)) / d;
      const c = 1 - a - b;
      if (a >= -0.02 && b >= -0.02 && c >= -0.02) canvas.pixel(x, y, color);
    }
  }
}

function drawDragonFrame(wingUp) {
  const canvas = new PixelCanvas(W, H);
  const body = '#241426';
  const dark = '#160b18';
  const wing = '#2e1a33';
  // Corpo e pescoço.
  canvas.ellipse(34, 24, 16, 6, body);
  canvas.ellipse(48, 20, 7, 4.5, body);
  canvas.ellipse(55, 18, 4, 3, body); // cabeça
  canvas.pixel(57, 17, '#ff5040'); // olho vermelho
  // Rabo fino com ponta.
  canvas.line(20, 24, 6, 22, body);
  canvas.line(6, 22, 2, 26, body);
  fillTri(canvas, 2, 26, 6, 22, 4, 30, dark);
  // Pernas pequenas.
  canvas.line(30, 29, 28, 34, dark);
  canvas.line(40, 29, 42, 34, dark);
  // Asa grande (2 frames: erguida / abaixada).
  if (wingUp) {
    fillTri(canvas, 32, 22, 20, 2, 44, 12, wing);
    fillTri(canvas, 44, 12, 52, 4, 40, 20, wing);
  } else {
    fillTri(canvas, 32, 24, 22, 40, 42, 34, wing);
    fillTri(canvas, 42, 34, 50, 42, 38, 26, wing);
  }
  // Costas com espinhos claros.
  for (let x = 24; x <= 46; x += 4) canvas.pixel(x, 18 - Math.floor((x - 24) / 8), '#6b4a7a');
  return canvas;
}

function ensureDragonTexture(scene) {
  const key = 'env-dragon';
  if (scene.textures.exists(key)) return key;
  const up = drawDragonFrame(true);
  const down = drawDragonFrame(false);
  const texture = scene.textures.createCanvas(key, W, H);
  const context = texture.getContext();
  const imgUp = context.createImageData(W, H);
  imgUp.data.set(up.data);
  const imgDown = context.createImageData(W, H);
  imgDown.data.set(down.data);
  texture.add(0, 0, 0, 0, W, H);
  context.putImageData(imgUp, 0, 0);
  texture.add(1, 0, W, 0, W, H);
  context.putImageData(imgDown, W, 0);
  texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
  texture.refresh();
  scene.anims.create({ key: `${key}-fly`, frames: [{ key, frame: 0 }, { key, frame: 1 }], frameRate: 6, repeat: -1 });
  return key;
}

/**
 * Dragão que cruza o céu acima da visão de vez em quando (evento ambiental do mapa grande).
 * Aparece só no overworld, passa com sombra no chão e um rugido distante.
 */
export class EnvDragon {
  constructor(scene) {
    this.scene = scene;
    // Primeiro voo entre 1,5 e 3,5 min; depois a cada 3–7 min.
    this.timer = 90_000 + Math.random() * 120_000;
    this.active = null;
  }

  update(delta) {
    const scene = this.scene;
    if (this.active) {
      const { sprite, shadow, fromLeft, speed } = this.active;
      const dir = fromLeft ? 1 : -1;
      sprite.x += dir * speed * (delta / 1000);
      // Sombra no chão: ellipse escura 280 px abaixo do dragão.
      if (shadow) shadow.setPosition(sprite.x, sprite.y + 280);
      const cam = scene.cameras.main;
      const out = fromLeft ? sprite.x > cam.scrollX + cam.width + 140 : sprite.x < cam.scrollX - 140;
      if (out) {
        sprite.destroy();
        shadow?.destroy();
        this.active = null;
        this.timer = 180_000 + Math.random() * 240_000;
      }
      return;
    }
    this.timer -= delta;
    if (this.timer > 0) return;
    // Não cruza o céu dentro de caverna nem com a UI bloqueando.
    if (scene.regionWorld?.currentRegion?.() === 'caverna' || scene.campaign?.ui?.isBlocking || scene.isUiPaused?.()) return;
    this.spawn();
  }

  spawn() {
    const scene = this.scene;
    const cam = scene.cameras.main;
    const fromLeft = Math.random() < 0.5;
    const y = cam.scrollY + 50 + Math.random() * 170;
    const x = fromLeft ? cam.scrollX - 90 : cam.scrollX + cam.width + 90;
    const key = ensureDragonTexture(scene);
    const sprite = scene.add.sprite(x, y, key, 0)
      .setDepth(OVERLAY_DEPTH + 4300)
      .setScale(2.2)
      .setFlipX(!fromLeft);
    sprite.play(`${key}-fly`);
    scene.hudCamera?.ignore(sprite);
    const shadow = scene.add.graphics().setDepth(5);
    scene.hudCamera?.ignore(shadow);
    shadow.fillStyle(0x000000, 0.22);
    shadow.fillEllipse(0, 0, 90, 22);
    shadow.setPosition(x, y + 280);
    this.active = { sprite, shadow, fromLeft, speed: 150 + Math.random() * 70 };
    scene.audio?.playRoar?.();
    scene.ui?.showMessage?.('🐉 Um dragão cruza o céu ao longe...');
  }
}
