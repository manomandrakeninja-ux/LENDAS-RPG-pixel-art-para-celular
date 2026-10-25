import Phaser from 'phaser';
import { CONSUMABLES } from '../data/consumables.js';

const MASK_WIDTH = 240;
const MASK_HEIGHT = 160;
const BAYER_4X4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5]
];

export class LightingSystem {
  constructor(scene, camp) {
    this.scene = scene;
    this.camp = camp;
    this.updateTimer = 0;
    this.key = 'phase1-light-mask';

    if (!scene.textures.exists(this.key)) {
      this.texture = scene.textures.createCanvas(this.key, MASK_WIDTH, MASK_HEIGHT);
      this.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    } else {
      this.texture = scene.textures.get(this.key);
    }
    this.context = this.texture.getContext();
    this.image = scene.add.image(0, 0, this.key)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(3999);
    this.resize();
  }

  resize() {
    this.image.setDisplaySize(this.scene.scale.width, this.scene.scale.height);
  }

  update(delta, state, player) {
    this.updateTimer -= delta;
    if (this.updateTimer > 0) return;
    this.updateTimer = 100;
    this.draw(state.lightLevel, player);
  }

  draw(lightLevel, player) {
    const context = this.context;
    const imageData = context.createImageData(MASK_WIDTH, MASK_HEIGHT);
    const pixels = imageData.data;
    const camera = this.scene.cameras.main;
    const scaleX = MASK_WIDTH / camera.width;
    const scaleY = MASK_HEIGHT / camera.height;
    const lights = [
      {
        x: player.x,
        y: player.y,
        radius: (76 + (player.torchTimer > 0 ? CONSUMABLES.torch.lightRadiusBonus : 0)) * scaleX,
        falloff: 26 * scaleX
      },
      ...(this.camp.getLightSources?.() ?? []).map((light) => ({
        x: light.x,
        y: light.y,
        radius: light.radius * scaleX,
        falloff: 34 * scaleX
      }))
    ];

    // `scrollX/scrollY` não representam o canto superior visível quando a câmera
    // usa zoom. `worldView` já incorpora zoom, deadzone e follow da Phaser.
    // Usá-lo evita deslocar os pontos de luz para posições do mapa sem objeto.
    for (const light of lights) {
      light.screenX = (light.x - camera.worldView.x) * camera.zoom * scaleX;
      light.screenY = (light.y - camera.worldView.y) * camera.zoom * scaleY;
    }

    for (let y = 0; y < MASK_HEIGHT; y += 1) {
      for (let x = 0; x < MASK_WIDTH; x += 1) {
        const threshold = BAYER_4X4[y % 4][x % 4] / 16;
        let alpha = lightLevel > threshold ? 226 : 0;

        for (const light of lights) {
          const dx = x - light.screenX;
          const dy = y - light.screenY;
          const distance = Math.hypot(dx, dy);
          if (distance <= light.radius) {
            alpha = 0;
          } else if (distance <= light.radius + light.falloff) {
            alpha = Math.min(alpha, 112);
          }
        }

        const index = (y * MASK_WIDTH + x) * 4;
        pixels[index] = 8;
        pixels[index + 1] = 14;
        pixels[index + 2] = 31;
        pixels[index + 3] = alpha;
      }
    }

    context.putImageData(imageData, 0, 0);
    this.texture.refresh();
  }
}
