import Phaser from 'phaser';
import { PixelCanvas } from '../art/pixel.js';
import { OVERLAY_DEPTH } from './depths.js';

const W = 104;
const H = 64;

function fillTri(canvas, x0, y0, x1, y1, x2, y2, color) {
  const minX = Math.floor(Math.min(x0, x1, x2));
  const maxX = Math.ceil(Math.max(x0, x1, x2));
  const minY = Math.floor(Math.min(y0, y1, y2));
  const maxY = Math.ceil(Math.max(y0, y1, y2));
  const d = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0);
  if (d === 0) return;
  for (let y = minY; y <= maxY; y += 1) for (let x = minX; x <= maxX; x += 1) {
    const a = ((x1 - x) * (y2 - y) - (x2 - x) * (y1 - y)) / d;
    const b = ((x2 - x) * (y0 - y) - (x0 - x) * (y2 - y)) / d;
    if (a >= -0.02 && b >= -0.02 && 1 - a - b >= -0.02) canvas.pixel(x, y, color);
  }
}

function drawDragonFrame(phase = 0) {
  const canvas = new PixelCanvas(W, H);
  const outline = '#160b18';
  const shadow = '#3b1443';
  const body = '#8e251d';
  const light = '#c64524';
  const gold = '#edab50';
  const membrane = '#622461';
  const membraneLight = '#8e3b70';
  const lift = [-4, -1, 3, 0][phase % 4];
  fillTri(canvas, 42, 27, 22, 5 + lift, 60, 13 + lift, outline);
  fillTri(canvas, 42, 27, 24, 8 + lift, 58, 16 + lift, membrane);
  canvas.line(43, 26, 24, 8 + lift, membraneLight);
  canvas.line(47, 26, 58, 16 + lift, membraneLight);
  canvas.line(37, 34, 20, 37, outline);
  canvas.line(21, 37, 5, 31, shadow);
  canvas.line(8, 32, 2, 27, light);
  for (let x = 18; x >= 6; x -= 5) canvas.pixel(x, 34 - Math.floor((18 - x) / 5), gold);
  canvas.shadedEllipse(49, 31, 23, 10, [shadow, body, light, gold], { light: [-0.5, -0.8] });
  canvas.shadedEllipse(67, 26, 10, 8, [shadow, body, light, gold], { light: [-0.55, -0.8] });
  canvas.ellipse(77, 24, 8, 6, outline);
  canvas.shadedEllipse(77, 23, 7, 5, [shadow, body, light, gold]);
  canvas.line(82, 23, 96, 27, outline);
  canvas.line(82, 25, 95, 29, body);
  canvas.line(73, 18, 70, 10, gold);
  canvas.line(79, 18, 82, 9, gold);
  canvas.pixel(84, 22, '#ffeb57');
  canvas.pixel(85, 22, '#ff5000');
  canvas.line(87, 28, 91, 31, shadow);
  const wingTip = 18 + lift;
  fillTri(canvas, 54, 28, 57, wingTip, 79, 8 + lift, outline);
  fillTri(canvas, 56, 27, 59, wingTip + 3, 77, 11 + lift, membrane);
  canvas.line(57, 28, 59, wingTip + 3, membraneLight);
  canvas.line(60, 28, 77, 11 + lift, membraneLight);
  canvas.line(67, 29, 77, 11 + lift, membraneLight);
  canvas.line(42, 38, 39, 48, outline); canvas.line(39, 48, 35, 50, gold);
  canvas.line(57, 39, 59, 49, outline); canvas.line(59, 49, 64, 50, gold);
  for (let x = 35; x <= 66; x += 6) {
    const y = 22 - Math.floor(Math.abs(50 - x) / 14);
    canvas.pixel(x, y, gold); canvas.pixel(x + 1, y - 2, light);
  }
  return canvas.quantize();
}

function ensureDragonTexture(scene) {
  const key = 'env-dragon';
  if (scene.textures.exists(`${key}-0`)) return `${key}-0`;
  const frames = Array.from({ length: 4 }, (_, index) => drawDragonFrame(index));
  const textureKeys = [];
  frames.forEach((frame, index) => {
    const frameKey = `${key}-${index}`;
    const texture = scene.textures.createCanvas(frameKey, W, H);
    const context = texture.getContext();
    const image = context.createImageData(W, H);
    image.data.set(frame.data);
    context.putImageData(image, 0, 0);
    texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    texture.refresh();
    textureKeys.push(frameKey);
  });
  scene.anims.create({ key: `${key}-fly`, frames: textureKeys.map((frameKey) => ({ key: frameKey, frame: 0 })), frameRate: 8, repeat: -1 });
  return textureKeys[0];
}

export class EnvDragon {
  constructor(scene) { this.scene = scene; this.timer = 90_000 + Math.random() * 120_000; this.active = null; }
  update(delta) {
    const scene = this.scene;
    if (this.active) {
      const { sprite, shadow, fromLeft, speed } = this.active;
      sprite.x += (fromLeft ? 1 : -1) * speed * (delta / 1000);
      shadow?.setPosition(sprite.x, sprite.y + 280);
      const cam = scene.cameras.main;
      const out = fromLeft ? sprite.x > cam.scrollX + cam.width + 140 : sprite.x < cam.scrollX - 140;
      if (out) { sprite.destroy(); shadow?.destroy(); this.active = null; this.timer = 180_000 + Math.random() * 240_000; }
      return;
    }
    this.timer -= delta;
    if (this.timer > 0) return;
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
    const sprite = scene.add.sprite(x, y, key, 0).setDepth(OVERLAY_DEPTH + 4300).setScale(1.75).setFlipX(!fromLeft);
    sprite.play('env-dragon-fly');
    scene.hudCamera?.ignore(sprite);
    const shadow = scene.add.graphics().setDepth(5);
    scene.hudCamera?.ignore(shadow);
    shadow.fillStyle(0x000000, 0.22); shadow.fillEllipse(0, 0, 110, 24); shadow.setPosition(x, y + 280);
    this.active = { sprite, shadow, fromLeft, speed: 150 + Math.random() * 70 };
    scene.audio?.playRoar?.();
    scene.ui?.showMessage?.('Um dragao cruza o ceu ao longe...');
  }
}
