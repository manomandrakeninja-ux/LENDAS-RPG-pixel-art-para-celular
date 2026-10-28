import Phaser from 'phaser';
import { CONSUMABLES } from '../data/consumables.js';
import { GLOW_LEVELS, HALO_RGB, KIND, lightBand } from '../art/light.js';

// Luz local (Fase 20E). Duas camadas em tela, na resolução de 1 célula = 4 px de tela:
// - `mask`: a escuridão da noite (roxo-azulada, da paleta), aberta por cada fonte em
//   anéis quantizados (LEVELS degraus, sem degradê liso) e com vinheta leve nas bordas;
// - `glow`: halo quente aditivo (fogueira, tochas, lampiões, forja, lava, cristais) com a
//   rampa da própria fonte (núcleo amarelo → âmbar → laranja → brasa) e tremulação.
const CELL = 4;
const NIGHT_ALPHA = 200;
// '#0e071b' (fundo) e '#1a1932' (borda da luz): noite puxando para roxo, como as sombras.
const DARK_DEEP = [14, 7, 27];
const DARK_EDGE = [26, 25, 50];
// Entardecer/amanhecer: a escuridão começa vinho-escura ('#391f21') e esfria até a noite.
const DARK_DUSK = [57, 31, 33];

export class LightingSystem {
  constructor(scene, camp) {
    this.scene = scene;
    this.camp = camp;
    this.updateTimer = 0;
    this.clock = 0;
    this.key = 'phase1-light-mask';
    this.glowKey = 'phase20-light-glow';
    this.width = 0;
    this.height = 0;
    this.texture = scene.textures.exists(this.key) ? scene.textures.get(this.key) : scene.textures.createCanvas(this.key, 8, 8);
    this.glowTexture = scene.textures.exists(this.glowKey) ? scene.textures.get(this.glowKey) : scene.textures.createCanvas(this.glowKey, 8, 8);
    this.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.glowTexture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.context = this.texture.getContext();
    this.glowContext = this.glowTexture.getContext();
    this.image = scene.add.image(0, 0, this.key).setOrigin(0).setScrollFactor(0).setDepth(3999);
    // O halo vai por cima da escuridão: soma luz quente ao chão e aos sprites.
    this.glowImage = scene.add.image(0, 0, this.glowKey).setOrigin(0).setScrollFactor(0).setDepth(4000)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.resize();
  }

  resize() {
    const width = Math.max(8, Math.ceil(this.scene.scale.width / CELL));
    const height = Math.max(8, Math.ceil(this.scene.scale.height / CELL));
    if (width !== this.width || height !== this.height) {
      this.width = width;
      this.height = height;
      this.texture.setSize(width, height);
      this.glowTexture.setSize(width, height);
      this.context = this.texture.getContext();
      this.glowContext = this.glowTexture.getContext();
      this.light = new Float32Array(width * height);
      this.glow = new Float32Array(width * height * 3);
    }
    this.place();
  }

  /**
   * Objetos com scrollFactor 0 ainda recebem o zoom da câmera (em volta do centro da tela).
   * Sem compensar, a máscara saía ampliada e as luzes apareciam longe das fontes
   * (com zoom 2, um lampião a 170 px do centro acendia o chão a 340 px).
   */
  place() {
    const camera = this.scene.cameras.main;
    const zoom = camera.zoom || 1;
    if (zoom === this.placedZoom && camera.width === this.placedWidth && camera.height === this.placedHeight) return;
    this.placedZoom = zoom;
    this.placedWidth = camera.width;
    this.placedHeight = camera.height;
    const x = camera.width / 2 * (1 - 1 / zoom);
    const y = camera.height / 2 * (1 - 1 / zoom);
    const width = this.width * CELL / zoom;
    const height = this.height * CELL / zoom;
    for (const image of [this.image, this.glowImage]) image.setPosition(x, y).setDisplaySize(width, height);
  }

  update(delta, state, player) {
    this.clock += delta;
    this.updateTimer -= delta;
    if (this.updateTimer > 0) return;
    this.updateTimer = 90;
    this.draw(state.lightLevel, player);
  }

  /** Fontes do quadro: herói, acampamento e mundo, com tipo (cor do halo) e tremulação. */
  sources(player) {
    const underground = this.scene.regionWorld?.underground;
    const torch = player.torchTimer > 0;
    const list = [{
      x: player.x,
      y: player.y - 8,
      radius: 46 + (torch ? CONSUMABLES.torch.lightRadiusBonus : 0) + (underground ? 90 : 0),
      falloff: 62,
      kind: torch ? 'torch' : null
    }];
    for (const light of [...(this.camp.getLightSources?.() ?? []), ...(this.scene.regionWorld?.getLightSources?.() ?? [])]) {
      list.push({ x: light.x, y: light.y, radius: light.radius * 0.42, falloff: Math.max(48, light.radius * 0.55), kind: light.kind === undefined ? 'lamp' : light.kind, seed: light.x * 0.37 + light.y * 0.11 });
    }
    return list;
  }

  draw(lightLevel, player) {
    this.place();
    const width = this.width;
    const height = this.height;
    const camera = this.scene.cameras.main;
    // 1 célula da máscara = CELL px de tela.
    const scaleX = 1 / CELL;
    const scaleY = 1 / CELL;
    const level = Math.min(1, Math.max(0, lightLevel));
    const night = NIGHT_ALPHA * level ** 1.4;
    const warm = (1 - level) * 0.85;
    const deep = DARK_DEEP.map((value, index) => value + (DARK_DUSK[index] - value) * warm);
    const edge = DARK_EDGE.map((value, index) => value + (DARK_DUSK[index] - value) * warm);
    // De dia o halo quase some; ao entardecer ele cresce junto com a escuridão.
    const glowScale = 0.1 + 0.9 * level;
    const light = this.light;
    const glow = this.glow;
    light.fill(0);
    glow.fill(0);

    const t = this.clock / 1000;
    for (const source of this.sources(player)) {
      const kind = source.kind ? KIND[source.kind] ?? KIND.lamp : null;
      const seed = source.seed ?? 0;
      const flicker = kind ? 1 + kind.flicker * (Math.sin(t * 9.1 + seed) * 0.6 + Math.sin(t * 23.7 + seed * 2.3) * 0.4) : 1;
      // `worldView` já incorpora zoom, deadzone e follow da Phaser (não usar scrollX/scrollY).
      const cx = (source.x - camera.worldView.x) * camera.zoom * scaleX;
      const cy = (source.y - camera.worldView.y) * camera.zoom * scaleY;
      const radius = source.radius * scaleX * flicker;
      const falloff = source.falloff * scaleX;
      const reach = radius + falloff;
      const x0 = Math.max(0, Math.floor(cx - reach));
      const x1 = Math.min(width - 1, Math.ceil(cx + reach));
      const y0 = Math.max(0, Math.floor(cy - reach));
      const y1 = Math.min(height - 1, Math.ceil(cy + reach));
      const ramp = kind ? HALO_RGB[source.kind] ?? HALO_RGB.lamp : null;
      const strength = kind ? kind.glow * glowScale * flicker : 0;
      // O halo é mais curto que a área aberta: núcleo quente perto da chama.
      const glowReach = (radius + falloff * 0.5) * 0.9;
      for (let y = y0; y <= y1; y += 1) {
        for (let x = x0; x <= x1; x += 1) {
          const distance = Math.hypot(x + 0.5 - cx, (y + 0.5 - cy) * 1.15);
          if (distance >= reach) continue;
          const index = y * width + x;
          const band = lightBand(distance, radius, falloff);
          if (band > light[index]) light[index] = band;
          if (!ramp || distance >= glowReach) continue;
          const g = Math.ceil((1 - distance / glowReach) * GLOW_LEVELS) / GLOW_LEVELS;
          const step = Math.min(ramp.length - 1, Math.floor((1 - g) * ramp.length));
          const amount = g * g * strength;
          const color = ramp[step];
          glow[index * 3] += color[0] * amount;
          glow[index * 3 + 1] += color[1] * amount;
          glow[index * 3 + 2] += color[2] * amount;
        }
      }
    }

    const mask = this.context.createImageData(width, height);
    const halo = this.glowContext.createImageData(width, height);
    const pixels = mask.data;
    const haloPixels = halo.data;
    // Vinheta leve: escurece os cantos (mais à noite), em degraus como a luz.
    const vignetteMax = 18 + 30 * level;
    for (let y = 0; y < height; y += 1) {
      const ny = (y + 0.5) / height * 2 - 1;
      for (let x = 0; x < width; x += 1) {
        const nx = (x + 0.5) / width * 2 - 1;
        const index = y * width + x;
        const lit = light[index];
        const rim = Math.max(0, Math.hypot(nx * 0.9, ny) - 0.72) / 0.6;
        const vignette = Math.ceil(Math.min(1, rim) * 6) / 6 * vignetteMax;
        const alpha = (night + vignette) * (1 - lit);
        const mix = Math.min(1, lit * 1.6);
        const offset = index * 4;
        pixels[offset] = deep[0] + (edge[0] - deep[0]) * mix;
        pixels[offset + 1] = deep[1] + (edge[1] - deep[1]) * mix;
        pixels[offset + 2] = deep[2] + (edge[2] - deep[2]) * mix;
        pixels[offset + 3] = Math.min(255, Math.round(alpha));
        const r = Math.min(255, glow[index * 3]);
        const g = Math.min(255, glow[index * 3 + 1]);
        const b = Math.min(255, glow[index * 3 + 2]);
        const peak = Math.max(r, g, b);
        if (peak > 0) {
          // Cor cheia e alfa = intensidade (a mistura aditiva soma cor x alfa).
          haloPixels[offset] = Math.round(r / peak * 255);
          haloPixels[offset + 1] = Math.round(g / peak * 255);
          haloPixels[offset + 2] = Math.round(b / peak * 255);
          haloPixels[offset + 3] = Math.round(peak);
        }
      }
    }

    this.context.putImageData(mask, 0, 0);
    this.texture.refresh();
    this.glowContext.putImageData(halo, 0, 0);
    this.glowTexture.refresh();
  }
}
