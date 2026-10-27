import Phaser from 'phaser';
import { CONSUMABLES } from '../data/consumables.js';

const MASK_WIDTH = 240;
const MASK_HEIGHT = 160;
const NIGHT_ALPHA = 226;

// Transição suave (0 no centro da luz, 1 no fim do degradê).
const smoothstep = (value) => {
  const t = Math.min(1, Math.max(0, value));
  return t * t * (3 - 2 * t);
};

export class LightingSystem {
  constructor(scene, camp) {
    this.scene = scene;
    this.camp = camp;
    this.updateTimer = 0;
    this.key = 'phase1-light-mask';

    if (!scene.textures.exists(this.key)) {
      this.texture = scene.textures.createCanvas(this.key, MASK_WIDTH, MASK_HEIGHT);
    } else {
      this.texture = scene.textures.get(this.key);
    }
    this.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
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
        radius: (76 + (player.torchTimer > 0 ? CONSUMABLES.torch.lightRadiusBonus : 0) + (this.scene.regionWorld?.underground ? 90 : 0)) * scaleX,
        falloff: 46 * scaleX
      },
      ...[...(this.camp.getLightSources?.() ?? []), ...(this.scene.regionWorld?.getLightSources?.() ?? [])].map((light) => ({
        x: light.x,
        y: light.y,
        radius: light.radius * scaleX,
        falloff: 56 * scaleX
      }))
    ];

    // `scrollX/scrollY` não representam o canto superior visível quando a câmera
    // usa zoom. `worldView` já incorpora zoom, deadzone e follow da Phaser.
    // Usá-lo evita deslocar os pontos de luz para posições do mapa sem objeto.
    for (const light of lights) {
      light.screenX = (light.x - camera.worldView.x) * camera.zoom * scaleX;
      light.screenY = (light.y - camera.worldView.y) * camera.zoom * scaleY;
    }

    const night = NIGHT_ALPHA * Math.min(1, Math.max(0, lightLevel));
    for (let y = 0; y < MASK_HEIGHT; y += 1) {
      for (let x = 0; x < MASK_WIDTH; x += 1) {
        // Escuridão gradual (sem o quadriculado de antes): a intensidade
        // acompanha o anoitecer e cada luz abre um degradê suave.
        let alpha = night;
        for (const light of lights) {
          const distance = Math.hypot(x - light.screenX, y - light.screenY);
          if (distance >= light.radius + light.falloff) continue;
          const shade = distance <= light.radius ? 0 : night * smoothstep((distance - light.radius) / light.falloff);
          alpha = Math.min(alpha, shade);
        }

        const index = (y * MASK_WIDTH + x) * 4;
        pixels[index] = 8;
        pixels[index + 1] = 14;
        pixels[index + 2] = 31;
        pixels[index + 3] = Math.round(alpha);
      }
    }

    context.putImageData(imageData, 0, 0);
    this.texture.refresh();
  }
}
