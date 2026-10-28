import Phaser from 'phaser';
import { BUILDING_DEFS, buildingStat } from '../data/buildings.js';
import { PixelCanvas, ramp } from '../art/pixel.js';
import { buildingVisual } from '../data/buildingVisuals.js';
import { quantizePixels } from '../art/palette.js';
import { bakedBuilding } from '../art/bakedBuildings.js';
import { OVERLAY_DEPTH } from './depths.js';

const WALL = BUILDING_DEFS.wall;
const TOWER = BUILDING_DEFS.tower;

const MATERIAL_COLORS = {
  wood: { body: '#8a5a32', light: '#b98352', dark: '#4e321d' },
  stone: { body: '#8c918c', light: '#c3c6bd', dark: '#555a57' },
  iron: { body: '#6c7880', light: '#b5c2c8', dark: '#3a4247' },
  steel: { body: '#9aa8b4', light: '#e3ecf2', dark: '#55626c' },
  mythic: { body: '#7d58c9', light: '#d9c4ff', dark: '#3f2a6e' }
};

function drawTexture(scene, key, width, height, draw) {
  if (scene.textures.exists(key)) return;
  const texture = scene.textures.createCanvas(key, width, height);
  // Arte pintada em alta resolução (Fase 20 G-predios), quando existir; senão, o desenho abaixo.
  const baked = bakedBuilding(key);
  const pixels = baked && baked.width === width && baked.height === height ? baked : new PixelCanvas(width, height);
  if (!baked) {
    draw(pixels);
    pixels.outline();
  }
  texture.getContext().putImageData(new ImageData(quantizePixels(pixels).data, width, height), 0, 0);
  texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
  texture.refresh();
}

/** Bloco com luz à esquerda/topo e sombra à direita/base. */
function block(canvas, x, y, width, height, colors) {
  canvas.rect(x, y, width, height, colors.body);
  canvas.rect(x, y, Math.max(1, Math.floor(width / 3)), height, colors.light);
  canvas.rect(x + width - 1, y, 1, height, colors.dark);
  canvas.rect(x, y + height - 1, width, 1, colors.dark);
}

function ensureTextures(scene) {
  for (const [material, colors] of Object.entries(MATERIAL_COLORS)) {
    drawTexture(scene, `wall-post-${material}`, 10, 22, (canvas) => {
      canvas.shadow(5, 21, 4, 1.2, 100);
      if (material === 'wood') {
        // Estaca de tronco com ponta afiada e amarração.
        block(canvas, 2, 4, 6, 17, colors);
        canvas.polygon([[2, 4], [5, 0], [8, 4]], colors.light);
        canvas.pixel(5, 0, colors.dark);
        for (const y of [8, 14]) canvas.rect(2, y, 6, 1, colors.dark);
        canvas.rect(2, 11, 6, 1, '#c9b27a');
      } else {
        // Pilar de blocos com ameia.
        block(canvas, 2, 3, 6, 18, colors);
        for (const y of [7, 12, 17]) canvas.rect(2, y, 6, 1, colors.dark);
        canvas.pixel(4, 9, colors.light);
        canvas.rect(1, 1, 8, 3, colors.light);
        canvas.rect(1, 3, 8, 1, colors.dark);
        if (material === 'mythic') canvas.pixel(5, 13, '#fff1ff');
      }
    });
  }
  drawTexture(scene, 'wall-door', 18, 24, (canvas) => {
    canvas.rect(0, 0, 18, 24, '#3b2615');
    const wood = ['#5f3b1f', '#8f5d31', '#b47a44'];
    for (let x = 1; x < 17; x += 1) {
      const seam = (x - 1) % 4 === 3;
      canvas.rect(x, 1, 1, 22, seam ? wood[0] : (x - 1) % 4 === 0 ? wood[2] : wood[1]);
    }
    for (const y of [5, 16]) {
      canvas.rect(1, y, 16, 2, '#7d858c');
      canvas.rect(1, y, 16, 1, '#b8c0c4');
      canvas.pixel(3, y + 1, '#3c3f45');
      canvas.pixel(14, y + 1, '#3c3f45');
    }
    canvas.rect(12, 11, 2, 2, '#e8c15a');
  });
  drawTexture(scene, 'build-site', 22, 26, (canvas) => {
    canvas.shadow(11, 25, 6, 1.4, 100);
    // Placa de obra com estaca, tábuas e martelo desenhado.
    canvas.rect(10, 10, 3, 15, '#6e4628');
    canvas.rect(10, 10, 1, 15, '#94633a');
    canvas.rect(1, 2, 20, 11, '#d9b46a');
    canvas.rect(1, 2, 20, 1, '#f0d394');
    canvas.rect(1, 7, 20, 1, '#b8904c');
    canvas.rect(1, 12, 20, 1, '#9c7638');
    canvas.rect(1, 2, 1, 11, '#f0d394');
    canvas.line(6, 10, 12, 4, '#5a3b26');
    canvas.rect(11, 3, 5, 3, '#5a5f66');
    canvas.pixel(11, 3, '#9aa3ab');
    for (const x of [3, 18]) canvas.pixel(x, 4, '#4a3017');
  });
  for (const [key, colors] of [['tower-wood', MATERIAL_COLORS.wood], ['tower-stone', MATERIAL_COLORS.stone]]) {
    drawTexture(scene, key, 30, 58, (canvas) => {
      canvas.shadow(15, 56, 12, 2, 110);
      // Corpo da torre.
      block(canvas, 7, 17, 16, 39, colors);
      if (key === 'tower-wood') {
        for (let x = 7; x < 23; x += 4) canvas.rect(x, 17, 1, 39, colors.dark);
        canvas.line(8, 22, 21, 50, colors.dark);
        canvas.line(21, 22, 8, 50, colors.dark);
      } else {
        for (let y = 20; y < 56; y += 4) {
          canvas.rect(7, y, 16, 1, colors.dark);
          canvas.rect(7 + ((y / 4) % 2 ? 4 : 8), y - 3, 1, 3, colors.dark);
          canvas.rect(15 + ((y / 4) % 2 ? 4 : 0), y - 3, 1, 3, colors.dark);
        }
      }
      // Janela de seteira e porta.
      canvas.rect(13, 28, 4, 7, '#20150c');
      canvas.rect(14, 29, 2, 5, '#3a2a1a');
      canvas.rect(12, 47, 6, 9, '#3b2615');
      canvas.rect(13, 48, 4, 8, '#7a4d2a');
      // Plataforma e ameias.
      block(canvas, 1, 9, 28, 8, colors);
      canvas.rect(1, 16, 28, 1, colors.dark);
      for (let x = 1; x < 29; x += 6) block(canvas, x, 3, 4, 6, colors);
      // Bandeira.
      canvas.rect(26, 0, 1, 9, '#5a3b26');
      canvas.polygon([[27, 0], [30, 2], [27, 4]], '#d8463b');
    });
  }
  drawTexture(scene, 'gate-torch', 10, 24, (canvas) => {
    canvas.shadow(5, 23, 3, 1, 90);
    canvas.rect(4, 9, 2, 14, '#6e4628');
    canvas.rect(4, 9, 1, 14, '#94633a');
    canvas.rect(2, 7, 6, 3, '#3c3f45');
    canvas.polygon([[5, 0], [2, 6], [5, 8], [8, 6]], '#e0602a');
    canvas.polygon([[5, 2], [4, 6], [6, 6]], '#ffd76b');
  });
  // Torre estágio 1: plataforma de madeira sobre estacas.
  drawTexture(scene, 'tower-1', 30, 50, (canvas) => {
    canvas.shadow(15, 48, 11, 2, 110);
    for (const x of [6, 22]) {
      canvas.rect(x, 18, 3, 30, '#6e4628');
      canvas.rect(x, 18, 1, 30, '#94633a');
    }
    canvas.line(8, 22, 23, 44, '#4a2f1e');
    canvas.line(23, 22, 8, 44, '#4a2f1e');
    canvas.rect(2, 14, 26, 4, '#94633a');
    canvas.rect(2, 14, 26, 1, '#b98450');
    for (let x = 3; x < 28; x += 4) canvas.rect(x, 8, 2, 6, '#6e4628');
    canvas.rect(2, 8, 26, 1, '#94633a');
    for (let y = 20; y < 46; y += 4) canvas.rect(13, y, 5, 1, '#94633a');
  });
  // Torre estágio 8: pedra com telhado cônico, janelas com luz e bandeira.
  drawTexture(scene, 'tower-8', 36, 70, (canvas) => {
    const stone = ['#3f454a', '#5d6569', '#7f878a', '#a7aeab', '#cfd0c4'];
    canvas.shadow(18, 68, 14, 2.4, 120);
    for (let y = 26; y < 68; y += 1) {
      for (let x = 7; x < 29; x += 1) {
        const seam = (y - 26) % 5 === 4 || (x - 7 + (Math.floor((y - 26) / 5) % 2) * 4) % 8 === 7;
        canvas.pixel(x, y, seam ? stone[1] : x < 12 ? stone[3] : x > 24 ? stone[1] : stone[2]);
      }
    }
    canvas.rect(4, 22, 28, 5, stone[3]);
    canvas.rect(4, 26, 28, 1, stone[1]);
    canvas.polygon([[3, 23], [18, 2], [33, 23]], '#8e2f2c');
    canvas.polygon([[18, 2], [33, 23], [22, 23]], '#6a2422');
    canvas.line(3, 23, 18, 2, '#c0483b');
    canvas.rect(17, 0, 1, 4, '#5a3b26');
    canvas.polygon([[18, 0], [25, 2], [18, 4]], '#e8c13a');
    for (const y of [34, 48]) {
      canvas.rect(16, y, 4, 6, '#2a1c12');
      canvas.rect(17, y + 1, 2, 4, '#f2c45c');
    }
    canvas.rect(14, 58, 8, 10, '#3b2615');
    canvas.rect(15, 59, 6, 9, '#7a4d2a');
    canvas.rect(7, 30, 22, 1, '#8e2f2c');
  });
  // Portão da muralha por estágio.
  drawTexture(scene, 'gate-1', 56, 30, (canvas) => {
    canvas.shadow(28, 29, 24, 1.6, 90);
    for (const x of [4, 48]) {
      canvas.rect(x, 4, 5, 25, '#6e4628');
      canvas.rect(x, 4, 2, 25, '#94633a');
      canvas.polygon([[x, 4], [x + 2, 0], [x + 5, 4]], '#94633a');
    }
    canvas.rect(4, 6, 49, 3, '#7a5236');
    canvas.rect(4, 6, 49, 1, '#b98450');
  });
  drawTexture(scene, 'gate-4', 64, 46, (canvas) => {
    canvas.shadow(32, 45, 28, 2, 100);
    for (const x of [2, 48]) {
      for (const px of [x, x + 11]) canvas.rect(px, 18, 3, 27, '#6e4628');
      canvas.rect(x, 12, 14, 7, '#94633a');
      canvas.rect(x, 12, 14, 1, '#b98450');
      for (let px = x; px < x + 14; px += 4) canvas.rect(px, 6, 2, 6, '#6e4628');
      canvas.line(x + 1, 22, x + 12, 40, '#4a2f1e');
    }
    canvas.rect(16, 18, 32, 4, '#7a5236');
    canvas.rect(16, 18, 32, 1, '#b98450');
  });
  drawTexture(scene, 'gate-8', 72, 56, (canvas) => {
    const stone = ['#3f454a', '#5d6569', '#7f878a', '#a7aeab', '#cfd0c4'];
    canvas.shadow(36, 55, 32, 2.2, 110);
    for (const x of [2, 54]) {
      for (let y = 14; y < 55; y += 1) {
        for (let px = x; px < x + 16; px += 1) {
          const seam = (y - 14) % 5 === 4 || (px - x + (Math.floor((y - 14) / 5) % 2) * 4) % 8 === 7;
          canvas.pixel(px, y, seam ? stone[1] : px < x + 4 ? stone[3] : stone[2]);
        }
      }
      for (let px = x; px < x + 16; px += 5) canvas.rect(px, 9, 3, 5, stone[3]);
      canvas.rect(x + 6, 24, 4, 7, '#2a1c12');
      canvas.rect(x + 7, 25, 2, 5, '#f2c45c');
      canvas.rect(x + 7, 0, 1, 10, '#5a3b26');
      canvas.polygon([[x + 8, 0], [x + 15, 2], [x + 8, 5]], '#c0483b');
    }
    for (let px = 18; px < 54; px += 1) {
      for (let y = 14; y < 22; y += 1) canvas.pixel(px, y, (px + y) % 7 === 0 ? stone[1] : stone[2]);
    }
    canvas.rect(18, 14, 36, 1, stone[4]);
    canvas.polygon([[30, 22], [42, 22], [41, 34], [36, 37], [31, 34]], '#2f6ea8');
    canvas.shadedEllipse(36, 28, 3, 3, ramp('#e8c13a'));
  });
  drawTexture(scene, 'bastion-4', 26, 40, (canvas) => {
    canvas.shadow(13, 39, 11, 1.6, 100);
    for (const x of [4, 19]) canvas.rect(x, 14, 3, 25, '#6e4628');
    canvas.line(5, 18, 20, 36, '#4a2f1e');
    canvas.rect(1, 9, 24, 6, '#94633a');
    canvas.rect(1, 9, 24, 1, '#b98450');
    for (let x = 1; x < 25; x += 4) canvas.rect(x, 4, 2, 5, '#6e4628');
  });
  drawTexture(scene, 'bastion-8', 30, 50, (canvas) => {
    const stone = ['#3f454a', '#5d6569', '#7f878a', '#a7aeab', '#cfd0c4'];
    canvas.shadow(15, 49, 12, 2, 110);
    for (let y = 16; y < 49; y += 1) {
      for (let x = 4; x < 26; x += 1) {
        const seam = (y - 16) % 5 === 4 || (x - 4 + (Math.floor((y - 16) / 5) % 2) * 4) % 8 === 7;
        canvas.pixel(x, y, seam ? stone[1] : x < 8 ? stone[3] : x > 22 ? stone[1] : stone[2]);
      }
    }
    for (let x = 3; x < 27; x += 6) canvas.rect(x, 11, 4, 5, stone[3]);
    canvas.rect(14, 0, 1, 12, '#5a3b26');
    canvas.polygon([[15, 0], [22, 2], [15, 5]], '#c0483b');
    canvas.rect(13, 26, 4, 6, '#2a1c12');
  });
  // ----- Muralha octogonal: blocos que se encaixam sem vãos e torres de canto -----
  const STONE_WALL = ['#3a3d42', '#55595f', '#6f747a', '#8d9298', '#b4b8bb'];
  const stoneFace = (canvas, x, y, width, height, colors = STONE_WALL) => {
    for (let py = y; py < y + height; py += 1) {
      const row = Math.floor((py - y) / 4);
      for (let px = x; px < x + width; px += 1) {
        const seam = (py - y) % 4 === 3 || (px - x + (row % 2) * 4) % 8 === 7;
        const tone = ((px * 7 + row * 13) % 11) > 7 ? 3 : 2;
        canvas.pixel(px, py, seam ? colors[1] : colors[tone]);
      }
    }
  };
  // Estágio 1: paliçada de toras pontiagudas (3 toras por bloco).
  drawTexture(scene, 'wallseg-1', 16, 30, (canvas) => {
    for (const x of [0, 5, 10]) {
      canvas.rect(x, 6, 6, 24, '#7a4d2a');
      canvas.rect(x, 6, 2, 24, '#a0703f');
      canvas.rect(x + 5, 6, 1, 24, '#4a2f1e');
      canvas.polygon([[x, 6], [x + 3, 0], [x + 6, 6]], '#a0703f');
    }
    canvas.rect(0, 13, 16, 2, '#c9b27a');
    canvas.rect(0, 22, 16, 2, '#c9b27a');
  });
  drawTexture(scene, 'wallcorner-1', 22, 40, (canvas) => {
    canvas.shadow(11, 39, 9, 1.6, 100);
    canvas.rect(4, 8, 14, 32, '#6e4628');
    canvas.rect(4, 8, 4, 32, '#94633a');
    canvas.rect(16, 8, 2, 32, '#4a2f1e');
    canvas.polygon([[4, 8], [11, 0], [18, 8]], '#94633a');
    for (const y of [14, 24, 32]) canvas.rect(4, y, 14, 2, '#c9b27a');
  });
  // Estágio 4: muro de pedra com ameias.
  drawTexture(scene, 'wallseg-4', 16, 30, (canvas) => {
    stoneFace(canvas, 0, 6, 16, 24);
    canvas.rect(0, 2, 8, 5, STONE_WALL[3]);
    canvas.rect(0, 2, 8, 1, STONE_WALL[4]);
    canvas.rect(0, 6, 16, 1, STONE_WALL[4]);
    canvas.rect(0, 29, 16, 1, STONE_WALL[0]);
  });
  drawTexture(scene, 'wallcorner-4', 30, 54, (canvas) => {
    canvas.shadow(15, 53, 13, 2, 110);
    stoneFace(canvas, 3, 10, 24, 44);
    canvas.rect(3, 10, 4, 44, STONE_WALL[3]);
    canvas.rect(23, 10, 4, 44, STONE_WALL[1]);
    canvas.rect(1, 8, 28, 4, STONE_WALL[3]);
    for (let x = 1; x < 29; x += 7) canvas.rect(x, 2, 4, 6, STONE_WALL[3]);
    canvas.rect(13, 24, 4, 8, '#1a1416');
    canvas.rect(13, 38, 4, 6, '#1a1416');
  });
  // Estágio 8: paredão alto com pilastras e ameias (referência do castelo).
  drawTexture(scene, 'wallseg-8', 16, 36, (canvas) => {
    stoneFace(canvas, 0, 8, 16, 28);
    canvas.rect(0, 2, 8, 7, STONE_WALL[3]);
    canvas.rect(0, 2, 8, 1, STONE_WALL[4]);
    canvas.rect(0, 8, 16, 2, STONE_WALL[4]);
    canvas.rect(5, 12, 6, 22, STONE_WALL[2]);
    canvas.rect(5, 12, 1, 22, STONE_WALL[4]);
    canvas.rect(10, 12, 1, 22, STONE_WALL[1]);
    canvas.rect(0, 34, 16, 2, STONE_WALL[0]);
  });
  drawTexture(scene, 'wallcorner-8', 36, 76, (canvas) => {
    canvas.shadow(18, 75, 16, 2.4, 120);
    stoneFace(canvas, 4, 30, 28, 46);
    canvas.rect(4, 30, 5, 46, STONE_WALL[3]);
    canvas.rect(27, 30, 5, 46, STONE_WALL[1]);
    canvas.rect(2, 26, 32, 5, STONE_WALL[3]);
    for (let x = 2; x < 34; x += 7) canvas.rect(x, 21, 4, 5, STONE_WALL[3]);
    // Telhado cônico azul e bandeira.
    canvas.polygon([[3, 24], [18, 3], [33, 24]], '#2f4f8a');
    canvas.polygon([[18, 3], [33, 24], [22, 24]], '#233c6a');
    for (let y = 8; y < 24; y += 3) canvas.line(18 - (y - 3) * 0.7, y, 18 + (y - 3) * 0.7, y, '#3f66a8');
    canvas.rect(17, 0, 1, 5, '#5a3b26');
    canvas.polygon([[18, 0], [26, 2], [18, 4]], '#2f6ea8');
    // Estandarte azul com emblema dourado e seteira.
    canvas.rect(13, 36, 10, 20, '#2f4f8a');
    canvas.polygon([[13, 56], [18, 61], [23, 56]], '#2f4f8a');
    canvas.rect(13, 36, 10, 1, '#e8c13a');
    canvas.rect(17, 42, 2, 8, '#e8c13a');
    canvas.rect(15, 44, 6, 2, '#e8c13a');
    canvas.rect(16, 64, 4, 7, '#1a1416');
  });
  drawTexture(scene, 'tower-archer', 6, 8, (canvas) => {
    canvas.rect(1, 3, 4, 5, '#2f5f38');
    canvas.rect(1, 3, 1, 5, '#4a8a52');
    canvas.rect(1, 0, 4, 3, '#e2b98d');
    canvas.rect(1, 0, 4, 1, '#5c3624');
    canvas.rect(5, 0, 1, 7, '#94633a');
  });
  drawTexture(scene, 'tower-cannon', 14, 8, (canvas) => {
    canvas.rect(0, 2, 12, 5, '#26282b');
    canvas.rect(1, 3, 10, 2, '#5a5e63');
    canvas.rect(1, 3, 10, 1, '#8a9099');
    canvas.rect(11, 1, 3, 7, '#c9a646');
    canvas.rect(11, 1, 1, 7, '#f0d070');
  });
}

const ARROW_COLORS = {
  normal: 0xe8d6a8,
  fire: 0xff8a3d,
  ice: 0x9ee7ff,
  explosive: 0xffd36b,
  lightning: 0xd5b8ff
};

export class CampDefense {
  constructor(scene, camp, { wallHp } = {}) {
    this.scene = scene;
    this.camp = camp;
    this.radius = WALL.radius;
    ensureTextures(scene);
    this.wallObjects = [];
    this.towerObjects = [];
    this.towers = [];
    this.arrowQueue = [];
    this.wallHp = Number.isFinite(wallHp) ? Math.max(0, Math.min(this.wallMaxHp, wallHp)) : this.wallMaxHp;
    this.raidActive = false;
    this.wallBuilding = { sprite: null, label: null, sprites: [] };
    this.towerBuilding = { sprite: null, label: null, sprites: [] };
    this.buildWall();
    this.buildTowers();
  }

  get wallLevel() {
    return this.camp.levels.wall;
  }

  get towerLevel() {
    return this.camp.levels.tower;
  }

  wallStat(stat) {
    return buildingStat('wall', stat, this.wallLevel);
  }

  towerStat(stat) {
    return buildingStat('tower', stat, this.towerLevel);
  }

  get wallMaxHp() {
    return this.wallStat('hp') ?? 0;
  }

  get wallStanding() {
    return this.wallLevel >= 1 && this.wallHp > 0;
  }

  track(object, list) {
    this.scene.hudCamera?.ignore(object);
    list.push(object);
    return object;
  }

  clear(list) {
    for (const object of list) object.destroy();
    list.length = 0;
  }

  // ---------- Luzes (portão e torres) ----------

  lightSources() {
    const wallUp = this.wallLevel > 0 && this.wallStanding;
    return [
      ...(wallUp ? this.gateLights ?? [] : []).map((glow) => ({ object: glow, x: glow.x, y: glow.y, radius: 80, kind: 'torch' })),
      ...(this.towerLights ?? []).map((glow) => ({ object: glow, x: glow.x, y: glow.y, radius: 110, kind: 'torch' }))
    ];
  }

  setLightLevel(alpha) {
    for (const glow of [...(this.gateLights ?? []), ...(this.towerLights ?? [])]) {
      if (glow.active) glow.setAlpha(alpha);
    }
  }

  // ---------- Muralha ----------

  buildWall() {
    this.clear(this.wallObjects);
    const cx = this.camp.x;
    const cy = this.camp.y;
    const gateX = cx;
    const gateY = cy + this.radius;
    const sign = this.track(this.scene.add.image(gateX + 40, gateY - 6, 'build-site')
      .setOrigin(0.5, 1)
      .setDepth(gateY + 4)
      .setInteractive({ useHandCursor: true }), this.wallObjects);
    sign.on('pointerdown', (pointer, localX, localY, event) => {
      event?.stopPropagation?.();
      this.scene.openBuilding?.('wall');
    });
    sign.setVisible(this.wallLevel === 0);
    const label = this.track(this.camp.makeLabel('wall', gateX, gateY - 44), this.wallObjects);
    this.posts = [];
    this.doors = [];
    if (this.wallLevel === 0) {
      this.wallBuilding.sprite = sign;
      this.wallBuilding.sprites = [sign];
      this.wallBuilding.label = label;
      label.setPosition(gateX + 40, gateY - 40);
      return;
    }

    // Aparência pelo estágio: paliçada (1–3), pedra com ameias (4–7), castelo com torres azuis (8+).
    const visual = buildingVisual('wall', this.wallLevel);
    const celebrate = this.wallStage !== undefined && this.wallStage !== visual.stage;
    this.wallStage = visual.stage;
    this.wallVisuals = [];
    const vertices = this.octagonVertices(this.radius);
    if (this.wallStat('moatDamageRatio') > 0) {
      const moat = this.track(this.scene.add.graphics().setDepth(cy - this.radius - 40), this.wallObjects);
      const outer = this.octagonVertices(this.radius + 30);
      moat.lineStyle(10, 0x2e6f8f, 0.75);
      moat.strokePoints(outer, true);
      moat.lineStyle(2, 0x8fd3ee, 0.55);
      moat.strokePoints(this.octagonVertices(this.radius + 26), true);
      // Ponte de tábuas sobre o fosso, na frente do portão.
      const bridgeY = cy + this.radius + 30;
      moat.fillStyle(0x7a5236, 1).fillRect(gateX - 26, bridgeY - 9, 52, 18);
      moat.fillStyle(0x94633a, 1);
      for (let x = gateX - 26; x < gateX + 26; x += 6) moat.fillRect(x, bridgeY - 9, 5, 18);
      moat.fillStyle(0x4a2f1e, 1).fillRect(gateX - 27, bridgeY - 10, 54, 2).fillRect(gateX - 27, bridgeY + 8, 54, 2);
    }
    // Lados: blocos posicionados de forma que se sobreponham (nenhum vão).
    for (let index = 0; index < vertices.length; index += 1) {
      const from = vertices[index];
      const to = vertices[(index + 1) % vertices.length];
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const length = Math.hypot(dx, dy);
      const ux = dx / length;
      const uy = dy / length;
      // Diagonal (Fase 22c): blocos a cada 3 px de altura, bem sobrepostos, para a muralha subir em rampa
      // contínua em vez dos degraus de 7 px de antes.
      const diagonal = Math.abs(ux) > 0.3 && Math.abs(uy) > 0.3;
      const step = diagonal ? 3 / Math.abs(uy) : Math.min(Math.abs(ux) > 0.01 ? 13 / Math.abs(ux) : Infinity, Math.abs(uy) > 0.01 ? 7 / Math.abs(uy) : Infinity);
      for (let along = 0; along <= length; along += step) {
        const x = from.x + ux * along;
        const y = from.y + uy * along;
        // Vão do portão no lado sul.
        if (Math.abs(y - gateY) < 2 && Math.abs(x - gateX) < 34) continue;
        this.addWallPiece(x, y, visual.segment, 16, 12);
      }
    }
    for (const vertex of vertices) this.addWallPiece(vertex.x, vertex.y + 2, visual.corner, 26, 16, 4);
    // Torres que ladeiam o portão.
    for (const side of [-1, 1]) this.addWallPiece(gateX + side * 44, gateY + 2, visual.corner, 26, 16, 4);
    const gatehouse = this.track(this.scene.add.image(gateX, gateY + 4, visual.gate).setOrigin(0.5, 1).setDepth(gateY + 1), this.wallObjects);
    if (celebrate) this.camp.celebrateEvolution('wall', gatehouse, visual.stage);
    this.gateLights = [];
    for (const side of [-1, 1]) {
      const torchX = gateX + side * 30;
      this.track(this.scene.add.image(torchX, gateY + 2, 'gate-torch').setOrigin(0.5, 1).setDepth(gateY + 4), this.wallObjects);
      const glow = this.track(this.scene.add.image(torchX, gateY - 20, 'buildings', 'warm-glow')
        .setScale(1.4).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.05).setDepth(OVERLAY_DEPTH + 4502), this.wallObjects);
      this.gateLights.push(glow);
    }
    if (this.wallStat('gates')) {
      for (const side of [-1, 1]) {
        const door = this.track(this.scene.add.image(gateX + side * 9, gateY, 'wall-door')
          .setOrigin(0.5, 1)
          .setDepth(gateY + 3), this.wallObjects);
        door.closedX = door.x;
        door.side = side;
        this.doors.push(door);
      }
    }
    // Ponto clicável da muralha: o portão sul.
    const gate = this.track(this.scene.add.zone(gateX, gateY - 12, 64, 40).setInteractive({ useHandCursor: true }), this.wallObjects);
    gate.on('pointerdown', (pointer, localX, localY, event) => {
      event?.stopPropagation?.();
      this.scene.openBuilding?.('wall');
    });
    gate.setVisible(true);
    this.electric = this.wallStat('electricDamage') > 0;
    this.wallBuilding.sprite = gate;
    this.wallBuilding.sprites = [gate];
    this.wallBuilding.label = label;
    // Blocos novos: religa a colisão com o jogador e com os inimigos.
    if (this.enemyList) this.setupEnemyCollision(this.enemyList);
    else this.setupPlayerCollision();
    this.refreshWallDamage();
  }

  /** Vértices do octógono com lados retos ao norte/sul/leste/oeste; "apothem" = distância do centro aos lados. */
  octagonVertices(apothem) {
    const radius = apothem / Math.cos(Math.PI / 8);
    return Array.from({ length: 8 }, (_, index) => {
      const angle = Math.PI / 8 + index * (Math.PI / 4);
      return new Phaser.Math.Vector2(this.camp.x + Math.cos(angle) * radius, this.camp.y + Math.sin(angle) * radius);
    });
  }

  addWallPiece(x, y, texture, bodyWidth, bodyHeight, depthOffset = 2) {
    const image = this.track(this.scene.add.image(x, y, texture).setOrigin(0.5, 1).setDepth(y + depthOffset), this.wallObjects);
    this.wallVisuals.push(image);
    const body = this.track(this.scene.add.zone(x, y - bodyHeight / 2 + 2, bodyWidth, bodyHeight), this.wallObjects);
    this.scene.physics.add.existing(body, true);
    this.posts.push(body);
    return image;
  }

  /** Colisão da muralha com o jogador (o portão continua aberto). */
  setupPlayerCollision(player = this.scene.player) {
    if (this.playerCollider) this.playerCollider.destroy();
    this.playerCollider = player && this.posts?.length ? this.scene.physics.add.collider(player, this.posts) : null;
    this.refreshWallDamage();
  }

  refreshWallDamage() {
    if (!this.posts) return;
    const ratio = this.wallMaxHp > 0 ? this.wallHp / this.wallMaxHp : 0;
    const broken = this.wallLevel >= 1 && this.wallHp <= 0;
    for (const piece of this.wallVisuals ?? []) {
      piece.setAlpha(broken ? 0.35 : 1);
      if (broken) piece.setTint(0x5a4a44);
      else if (ratio < 0.5) piece.setTint(0xffb1a0);
      else piece.clearTint();
    }
    for (const door of this.doors) door.setAlpha(broken ? 0.3 : 1);
    // Muralha caída deixa de bloquear.
    if (this.wallCollider) this.wallCollider.active = !broken;
    if (this.playerCollider) this.playerCollider.active = !broken;
  }

  damageWall(amount, source = null) {
    if (!this.wallStanding) return { blocked: false, retaliation: 0 };
    const indestructible = this.wallStat('indestructible') && !source?.isDragon;
    if (!indestructible) this.wallHp = Math.max(0, this.wallHp - Math.max(0, amount));
    this.refreshWallDamage();
    const retaliation = (this.wallStat('spikeDamage') ?? 0) + (this.wallStat('electricDamage') ?? 0);
    if (this.electric && this.posts.length > 0) this.flashElectric(source);
    return { blocked: true, broken: this.wallHp <= 0, retaliation };
  }

  flashElectric(source) {
    if (!source) return;
    this.scene.effects?.spawnHit(source.x, source.y - 8, 0x9ee7ff, 6);
  }

  wallRepairCost() {
    if (this.wallLevel < 1 || this.wallHp >= this.wallMaxHp) return null;
    const missingTenths = Math.ceil(((this.wallMaxHp - this.wallHp) / this.wallMaxHp) * 10);
    return { wood: 5 * missingTenths };
  }

  repairWall() {
    const cost = this.wallRepairCost();
    if (!cost) return { ok: false, message: 'A muralha está intacta.' };
    if (!this.camp.pay(cost)) return { ok: false, message: `Reparo da muralha custa ${cost.wood} madeiras.` };
    this.wallHp = this.wallMaxHp;
    this.refreshWallDamage();
    return { ok: true, message: 'Muralha reparada.' };
  }

  /** Configura colisão física: inimigos batem na muralha e não atravessam. */
  setupEnemyCollision(enemies) {
    this.enemyList = enemies;
    if (this.wallCollider) this.wallCollider.destroy();
    this.setupPlayerCollision();
    this.wallCollider = this.scene.physics.add.collider(this.posts, enemies, (post, enemy) => {
      // Marca o encosto: o invasor parado no poste já está "na muralha".
      enemy.lastWallTouch = this.scene.time.now;
      this.handleContact(enemy);
    });
  }

  removeWallCollision() {
    if (this.wallCollider) {
      this.wallCollider.destroy();
      this.wallCollider = null;
    }
  }

  /** Efeitos do primeiro contato de um inimigo com a muralha: atraso de 2s e fosso. */
  handleContact(enemy) {
    if (!this.wallStanding || enemy.wallContactHandled) return;
    enemy.wallContactHandled = true;
    enemy.stun?.(this.wallStat('contactDelayMs') ?? 0);
    const moat = this.wallStat('moatDamageRatio') ?? 0;
    if (moat > 0) {
      this.scene.damageEnemy?.(enemy, Math.round(enemy.maxHealth * moat), { color: '#8fd3ee', label: 'FOSSO' });
    }
  }

  canClimb(enemy) {
    return !(this.wallStat('smallBlocked') && WALL.smallEnemies.includes(enemy.kind));
  }

  /** Inimigo está na faixa externa (muralha dupla) e anda mais devagar. */
  outerSlowFor(distanceToCamp) {
    const slow = this.wallStanding ? this.wallStat('outerSlow') ?? 0 : 0;
    if (slow <= 0) return 1;
    return distanceToCamp > this.radius && distanceToCamp < this.radius + 48 ? 1 - slow : 1;
  }

  // ---------- Torres ----------

  buildTowers() {
    this.clear(this.towerObjects);
    this.towerLights = [];
    this.scene.obstacles?.remove(this.towerObstacles);
    this.towerObstacles = [];
    this.towers = [];
    const positions = [
      TOWER.position,
      TOWER.secondPosition,
      TOWER.thirdPosition,
      TOWER.fourthPosition
    ];
    const first = { x: this.camp.x + positions[0].x, y: this.camp.y + positions[0].y };
    const label = this.track(this.camp.makeLabel('tower', first.x, first.y - 70), this.towerObjects);
    if (this.towerLevel === 0) {
      const sign = this.track(this.scene.add.image(first.x, first.y, 'build-site')
        .setOrigin(0.5, 1)
        .setDepth(first.y + 4)
        .setInteractive({ useHandCursor: true }), this.towerObjects);
      sign.on('pointerdown', (pointer, localX, localY, event) => {
        event?.stopPropagation?.();
        this.scene.openBuilding?.('tower');
      });
      label.setPosition(first.x, first.y - 38);
      Object.assign(this.towerBuilding, { sprite: sign, sprites: [sign], label });
      return;
    }
    const count = this.towerStat('towers');
    const visual = buildingVisual('tower', this.towerLevel);
    const texture = visual.texture;
    const top = visual.top;
    const celebrate = this.towerStage !== undefined && this.towerStage !== visual.stage;
    this.towerStage = visual.stage;
    const sprites = [];
    for (let index = 0; index < count; index += 1) {
      const x = this.camp.x + positions[index].x;
      const y = this.camp.y + positions[index].y;
      const sprite = this.track(this.scene.add.image(x, y, texture)
        .setOrigin(0.5, 1)
        .setDepth(y + 10)
        .setInteractive({ useHandCursor: true }), this.towerObjects);
      sprite.on('pointerdown', (pointer, localX, localY, event) => {
        event?.stopPropagation?.();
        this.scene.openBuilding?.('tower');
      });
      const archers = this.towerStat('archers');
      for (let archer = 0; archer < archers; archer += 1) {
        this.track(this.scene.add.image(x - 9 + archer * 6, y - top, 'tower-archer')
          .setOrigin(0.5, 1)
          .setDepth(y + 11), this.towerObjects);
      }
      if (this.towerLevel >= TOWER.cannon.level) {
        this.track(this.scene.add.image(x + 12, y - top + 8, 'tower-cannon').setDepth(y + 12), this.towerObjects);
      }
      sprites.push(sprite);
      const lantern = this.track(this.scene.add.image(x, y - top + 6, 'buildings', 'warm-glow')
        .setScale(1.6).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.05).setDepth(OVERLAY_DEPTH + 4502), this.towerObjects);
      this.towerLights.push(lantern);
      if (this.scene.obstacles) this.towerObstacles.push(this.scene.obstacles.add(x, y - 6, 18, 10));
      this.towers.push({ x, y: y - 50, cooldown: 600 * index, cannonCooldown: TOWER.cannon.intervalMs });
    }
    label.setPosition(first.x, first.y - top - 24);
    Object.assign(this.towerBuilding, { sprite: sprites[0], sprites, label });
    if (celebrate) for (const sprite of sprites) this.camp.celebrateEvolution('tower', sprite, visual.stage);
  }

  onLevelChanged(key) {
    if (key === 'wall') {
      this.wallHp = this.wallMaxHp;
      this.buildWall();
    } else {
      this.buildTowers();
    }
    this.camp.refreshVisuals();
  }

  get radarActive() {
    return Boolean(this.towerStat('radar')) && this.camp.efficiency('tower') > 0;
  }

  get dragonRadar() {
    return this.towerLevel >= TOWER.cannon.level && this.camp.efficiency('tower') > 0;
  }

  enemiesInRange(x, y, range, enemies) {
    return enemies
      .filter((enemy) => enemy.active && !enemy.dead && Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y) <= range)
      .sort((left, right) =>
        Phaser.Math.Distance.Between(x, y, left.x, left.y) - Phaser.Math.Distance.Between(x, y, right.x, right.y));
  }

  update(delta, enemies = []) {
    this.updateGates();
    if (this.raidActive && this.wallLevel >= 1) {
      const repair = this.wallStat('autoRepairPerSecond') ?? 0;
      if (repair > 0 && this.wallHp < this.wallMaxHp) {
        const wasBroken = this.wallHp <= 0;
        this.wallHp = Math.min(this.wallMaxHp, this.wallHp + (repair * delta) / 1000);
        if (wasBroken !== (this.wallHp <= 0)) this.refreshWallDamage();
      }
    }
    const efficiency = this.camp.efficiency('tower');
    if (efficiency <= 0 || this.towers.length === 0) return;
    const range = this.towerStat('range');
    for (const tower of this.towers) {
      tower.cooldown -= delta * efficiency;
      if (tower.cooldown <= 0) {
        const targets = this.enemiesInRange(tower.x, tower.y, range, enemies);
        if (targets.length > 0) {
          tower.cooldown = this.towerStat('intervalMs');
          const archers = this.towerStat('archers');
          for (let index = 0; index < archers; index += 1) {
            this.fireArrow(tower, targets[index % targets.length], index);
          }
        } else {
          tower.cooldown = 250;
        }
      }
      if (this.towerLevel >= TOWER.cannon.level) {
        tower.cannonCooldown -= delta * efficiency;
        if (tower.cannonCooldown <= 0) {
          const targets = this.enemiesInRange(tower.x, tower.y, range, enemies);
          tower.cannonCooldown = targets.length > 0 ? TOWER.cannon.intervalMs : 300;
          if (targets.length > 0) this.fireCannon(tower, targets[0]);
        }
      }
    }
  }

  updateGates() {
    if (this.doors.length === 0) return;
    const player = this.scene.player;
    if (!player) return;
    const gateY = this.camp.y + this.radius;
    const near = Phaser.Math.Distance.Between(player.x, player.y, this.camp.x, gateY) < 70;
    for (const door of this.doors) {
      const target = door.closedX + (near ? door.side * 16 : 0);
      door.x += (target - door.x) * 0.2;
    }
  }

  fireArrow(tower, target, index) {
    const kind = this.towerStat('arrow');
    const damage = this.towerStat('damage');
    const startX = tower.x + (index - 1.5) * 4;
    const startY = tower.y;
    const arrow = this.scene.add.rectangle(startX, startY, 7, 2, ARROW_COLORS[kind]).setDepth(OVERLAY_DEPTH + 9000);
    this.scene.hudCamera?.ignore(arrow);
    arrow.rotation = Phaser.Math.Angle.Between(startX, startY, target.x, target.y - 8);
    const distance = Phaser.Math.Distance.Between(startX, startY, target.x, target.y);
    this.scene.tweens.add({
      targets: arrow,
      x: target.x,
      y: target.y - 8,
      duration: Math.max(90, (distance / 460) * 1000),
      delay: index * 90,
      onComplete: () => {
        arrow.destroy();
        if (!target.active || target.dead) return;
        this.applyArrow(kind, target, damage);
      }
    });
  }

  applyArrow(kind, target, damage) {
    const scene = this.scene;
    const arrows = TOWER.arrows;
    if (kind === 'fire') {
      scene.damageEnemy?.(target, damage, { color: '#ffb066', burn: { dps: arrows.fire.burnDamagePerSecond, ms: arrows.fire.burnMs } });
    } else if (kind === 'ice') {
      scene.damageEnemy?.(target, damage, { color: '#bdf1ff', slow: { ratio: arrows.ice.slowRatio, ms: arrows.ice.slowMs } });
    } else if (kind === 'explosive') {
      scene.effects?.spawnHit(target.x, target.y - 8, 0xffd36b, 14);
      for (const enemy of this.enemiesInRange(target.x, target.y, arrows.explosive.splashRadius, scene.enemies ?? [])) {
        scene.damageEnemy?.(enemy, damage, { color: '#ffe08a' });
      }
    } else if (kind === 'lightning') {
      const chain = [target, ...this.enemiesInRange(target.x, target.y, arrows.lightning.chainRadius, scene.enemies ?? [])
        .filter((enemy) => enemy !== target)
        .slice(0, arrows.lightning.chainTargets)];
      this.drawLightning(chain);
      for (const enemy of chain) scene.damageEnemy?.(enemy, damage, { color: '#e2d0ff' });
    } else {
      scene.damageEnemy?.(target, damage);
    }
  }

  drawLightning(chain) {
    if (chain.length < 2) return;
    const bolt = this.scene.add.graphics().setDepth(OVERLAY_DEPTH + 9001);
    this.scene.hudCamera?.ignore(bolt);
    bolt.lineStyle(2, 0xd5b8ff, 1);
    for (let index = 1; index < chain.length; index += 1) {
      bolt.lineBetween(chain[index - 1].x, chain[index - 1].y - 8, chain[index].x, chain[index].y - 8);
    }
    this.scene.tweens.add({ targets: bolt, alpha: 0, duration: 220, onComplete: () => bolt.destroy() });
  }

  fireCannon(tower, target) {
    const ball = this.scene.add.circle(tower.x + 12, tower.y + 6, 3, 0x26282b).setDepth(OVERLAY_DEPTH + 9000);
    this.scene.hudCamera?.ignore(ball);
    const impactX = target.x;
    const impactY = target.y;
    this.scene.tweens.add({
      targets: ball,
      x: impactX,
      y: impactY - 6,
      duration: 380,
      onComplete: () => {
        ball.destroy();
        this.scene.effects?.spawnHit(impactX, impactY - 6, 0xffa64d, 18);
        this.scene.cameras.main.shake(90, 0.003, true);
        for (const enemy of this.enemiesInRange(impactX, impactY, TOWER.cannon.splashRadius, this.scene.enemies ?? [])) {
          this.scene.damageEnemy?.(enemy, TOWER.cannon.damage, { color: '#ffb35c' });
        }
      }
    });
  }
}
