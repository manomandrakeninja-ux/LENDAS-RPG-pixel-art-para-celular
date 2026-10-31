import Phaser from 'phaser';
import { CONSUMABLES } from '../data/consumables.js';
import { GLOW_LEVELS, HALO_RGB, KIND, lightBand } from '../art/light.js';
import { OVERLAY_DEPTH } from './depths.js';
import { T, TILE } from '../data/worldRegions.js';

const LAVA_KIND = T.LAVA;

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
    this.interval = 90;
    this.simple = false;
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
    this.image = scene.add.image(0, 0, this.key).setOrigin(0).setScrollFactor(0).setDepth(OVERLAY_DEPTH + 3999);
    // O halo vai por cima da escuridão: soma luz quente ao chão e aos sprites.
    this.glowImage = scene.add.image(0, 0, this.glowKey).setOrigin(0).setScrollFactor(0).setDepth(OVERLAY_DEPTH + 4000)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.resize();
  }

  /** Modo gráfico: intervalo entre redesenhos e luz simples (gradientes fixos, sem máscara por pixel). */
  setProfile(profile) {
    this.interval = profile.lightInterval ?? 90;
    const simple = Boolean(profile.lightSimple);
    if (simple === this.simple) return;
    this.simple = simple;
    const filter = simple ? Phaser.Textures.FilterMode.LINEAR : Phaser.Textures.FilterMode.NEAREST;
    this.texture.setFilter(filter);
    this.glowTexture.setFilter(filter);
    this.updateTimer = 0;
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
      this.maskData = null;
      this.haloData = null;
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
    this.updateTimer = this.interval;
    if (this.simple) this.drawSimple(state.lightLevel, player);
    else this.draw(state.lightLevel, player);
  }

  /** Fontes do quadro: herói, acampamento e mundo, com tipo (cor do halo) e tremulação. */
  sources(player) {
    const underground = this.scene.regionWorld?.underground;
    const torch = player.torchTimer > 0;
    // Centro no meio do corpo (Fase 22c): a folha 56x64 vai de ~6 px abaixo até ~50 px acima de player.y.
    // Com o centro em y - 8 a cabeça caía nos anéis de penumbra e a skin escurecia em faixas; agora o núcleo
    // claro cobre o herói inteiro e só o chão em volta escurece.
    const list = [{
      x: player.x,
      y: player.y - 22,
      radius: 50 + (torch ? CONSUMABLES.torch.lightRadiusBonus : 0) + (underground ? 90 : 0),
      falloff: 62,
      kind: torch ? 'torch' : null
    }];
    for (const light of [...(this.camp.getLightSources?.() ?? []), ...(this.scene.regionWorld?.getLightSources?.() ?? [])]) {
      list.push({ x: light.x, y: light.y, radius: light.radius * 0.42, falloff: Math.max(48, light.radius * 0.55), kind: light.kind === undefined ? 'lamp' : light.kind, seed: light.x * 0.37 + light.y * 0.11 });
    }
    return list;
  }

  /**
   * Acampamento aceso por inteiro: tudo dentro da muralha (ou do raio da fogueira, sem muralha) sai da
   * escuridão e ganha um tom quente leve; a noite só começa depois da borda, com uma transição suave.
   */
  lightCampArea(light, glow, camera, glowScale, t) {
    const area = this.camp.getLightArea?.();
    if (!area) return;
    const width = this.width;
    const height = this.height;
    const scale = camera.zoom / CELL;
    const cx = (area.x - camera.worldView.x) * scale;
    const cy = (area.y - camera.worldView.y) * scale;
    const radius = area.radius * scale;
    const fade = Math.max(70, area.radius * 0.3) * scale;
    const reach = radius + fade;
    const x0 = Math.max(0, Math.floor(cx - reach));
    const x1 = Math.min(width - 1, Math.ceil(cx + reach));
    const y0 = Math.max(0, Math.floor(cy - reach));
    const y1 = Math.min(height - 1, Math.ceil(cy + reach));
    const ramp = HALO_RGB.lamp;
    const flicker = 1 + 0.03 * (Math.sin(t * 7.3) * 0.6 + Math.sin(t * 19.1) * 0.4);
    for (let y = y0; y <= y1; y += 1) {
      for (let x = x0; x <= x1; x += 1) {
        const distance = Math.sqrt((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2);
        if (distance >= reach) continue;
        // 1 dentro do raio; depois cai em degraus suaves até a escuridão.
        const edge = distance <= radius ? 0 : (distance - radius) / fade;
        const band = edge <= 0 ? 1 : Math.ceil((1 - edge * edge * (3 - 2 * edge)) * 12) / 12;
        const index = y * width + x;
        if (band > light[index]) light[index] = band;
        // Tom quente: âmbar suave, mais forte perto do centro.
        const warmth = band * (0.5 + 0.5 * Math.max(0, 1 - distance / radius)) * glowScale * 0.16 * flicker;
        const color = ramp[2];
        glow[index * 3] += color[0] * warmth;
        glow[index * 3 + 1] += color[1] * warmth;
        glow[index * 3 + 2] += color[2] * warmth;
      }
    }
  }

  /**
   * Lava emite luz própria. A máscara segue a lava PINTADA (o mesmo campo dos cantos que o terreno usa:
   * cada vértice da grade vale a fração dos 4 ladrilhos em volta que são lava, interpolado em bilinear),
   * então a luz acompanha a margem curva e não os quadrados dos ladrilhos. Depois um borrão largo
   * (2 passes de caixa de 7 células) deixa o brilho vazar 1-2 ladrilhos sobre a cinza em volta.
   */
  lightLava(light, glow, camera, glowScale, t) {
    const world = this.scene.regionWorld;
    const grid = world?.grid;
    if (!grid?.terrain) return;
    const width = this.width;
    const height = this.height;
    const toWorld = CELL / camera.zoom;
    const view = camera.worldView;
    const TILE_W = TILE;
    const pad = 3;
    const c0 = Math.floor(view.x / TILE_W) - pad; const r0 = Math.floor(view.y / TILE_W) - pad;
    const c1 = Math.ceil(view.right / TILE_W) + pad; const r1 = Math.ceil(view.bottom / TILE_W) + pad;
    const vw = c1 - c0 + 1; const vh = r1 - r0 + 1;
    const isLava = (col, row) => (col >= 0 && row >= 0 && col < grid.cols && row < grid.rows && grid.terrain[row * grid.cols + col] === LAVA_KIND ? 1 : 0);
    // Valor de cada vértice (canto entre 4 ladrilhos).
    const vertex = new Float32Array(vw * vh);
    let any = false;
    for (let j = 0; j < vh; j += 1) {
      for (let i = 0; i < vw; i += 1) {
        const col = c0 + i; const row = r0 + j;
        const v = (isLava(col - 1, row - 1) + isLava(col, row - 1) + isLava(col - 1, row) + isLava(col, row)) / 4;
        vertex[j * vw + i] = v;
        if (v) any = true;
      }
    }
    if (!any) return;
    const n = width * height;
    if (!this.lavaField || this.lavaField.length !== n) {
      this.lavaField = new Float32Array(n);
      this.lavaBlur = new Float32Array(n);
      this.lavaTemp = new Float32Array(n);
    }
    const field = this.lavaField;
    for (let y = 0; y < height; y += 1) {
      const wy = view.y + (y + 0.5) * toWorld;
      const fy = wy / TILE_W - r0; const jy = Math.min(vh - 2, Math.max(0, Math.floor(fy))); const ty = fy - jy;
      for (let x = 0; x < width; x += 1) {
        const wx = view.x + (x + 0.5) * toWorld;
        const fx = wx / TILE_W - c0; const ix = Math.min(vw - 2, Math.max(0, Math.floor(fx))); const tx = fx - ix;
        const k = jy * vw + ix;
        const top = vertex[k] + (vertex[k + 1] - vertex[k]) * tx;
        const bottom = vertex[k + vw] + (vertex[k + vw + 1] - vertex[k + vw]) * tx;
        let v = top + (bottom - top) * ty;
        if (v > 0 && v < 1) {
          // Mesma ondulação leve da margem pintada, em coordenadas do mundo (sem emenda entre ladrilhos).
          v += 0.07 * (Math.sin(wx * 0.23 + wy * 0.05) + Math.sin(wy * 0.19 - wx * 0.07)) + 0.03 * Math.sin((wx + wy) * 0.61);
        }
        // Rampa curta (~6 px do mundo) em volta da margem de 0,5.
        const m = Math.min(1, Math.max(0, (v - 0.44) * 8));
        field[y * width + x] = m;
      }
    }
    // Borrão separável: 2 passes de caixa (raio 7 células) = degradê triangular de ~14 células.
    const blur = this.lavaBlur; const temp = this.lavaTemp;
    const R = 7; const norm = 1 / (2 * R + 1);
    const boxH = (src, dst) => {
      for (let y = 0; y < height; y += 1) {
        const row = y * width; let sum = 0;
        for (let x = -R; x <= R; x += 1) sum += src[row + Math.min(width - 1, Math.max(0, x))];
        for (let x = 0; x < width; x += 1) {
          dst[row + x] = sum * norm;
          sum += src[row + Math.min(width - 1, x + R + 1)] - src[row + Math.max(0, x - R)];
        }
      }
    };
    const boxV = (src, dst) => {
      for (let x = 0; x < width; x += 1) {
        let sum = 0;
        for (let y = -R; y <= R; y += 1) sum += src[Math.min(height - 1, Math.max(0, y)) * width + x];
        for (let y = 0; y < height; y += 1) {
          dst[y * width + x] = sum * norm;
          sum += src[Math.min(height - 1, y + R + 1) * width + x] - src[Math.max(0, y - R) * width + x];
        }
      }
    };
    boxH(field, temp); boxV(temp, blur); boxH(blur, temp); boxV(temp, blur);
    const ramp = HALO_RGB.lava;
    const pulse = 1 + 0.08 * Math.sin(t * 2.1);
    const warmth = (0.1 + 0.22 * glowScale) * pulse;
    const inner = ramp[1]; const outer = ramp[Math.min(ramp.length - 1, 2)];
    for (let index = 0; index < n; index += 1) {
      const m = field[index];
      // Vazamento em degraus de 1/8 (estilo pixel, mas sem seguir a grade dos ladrilhos).
      const spill = Math.ceil(Math.min(1, blur[index] * 1.6) * 8) / 8;
      if (!m && !spill) continue;
      const open = Math.max(0.85 * m, 0.62 * spill);
      if (light[index] < open) light[index] = open;
      const a = warmth * m; const b = warmth * 0.85 * spill * (1 - m);
      glow[index * 3] += inner[0] * a + outer[0] * b;
      glow[index * 3 + 1] += inner[1] * a + outer[1] * b;
      glow[index * 3 + 2] += inner[2] * a + outer[2] * b;
    }
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
          const distance = Math.sqrt((x + 0.5 - cx) ** 2 + ((y + 0.5 - cy) * 1.15) ** 2);
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

    this.lightCampArea(light, glow, camera, glowScale, t);
    this.lightLava(light, glow, camera, glowScale, t);

    // Os buffers de pixels são reaproveitados (nada de alocar duas imagens a cada redesenho).
    this.maskData ??= this.context.createImageData(width, height);
    this.haloData ??= this.glowContext.createImageData(width, height);
    const mask = this.maskData;
    const halo = this.haloData;
    const pixels = mask.data;
    const haloPixels = halo.data;
    haloPixels.fill(0);
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
  /**
   * Luz simples (modo Leve): a escuridão da noite é um retângulo com gradientes radiais "furados" em volta das
   * fontes de luz, e o halo quente é uma soma de gradientes. Sem passar por cada pixel em JavaScript.
   */
  drawSimple(lightLevel, player) {
    this.place();
    const width = this.width;
    const height = this.height;
    const camera = this.scene.cameras.main;
    const level = Math.min(1, Math.max(0, lightLevel));
    const night = NIGHT_ALPHA * level ** 1.4 / 255;
    const warm = (1 - level) * 0.85;
    const deep = DARK_DEEP.map((value, index) => Math.round(value + (DARK_DUSK[index] - value) * warm));
    const glowScale = 0.1 + 0.9 * level;
    const context = this.context;
    const glowContext = this.glowContext;
    context.globalCompositeOperation = 'source-over';
    context.clearRect(0, 0, width, height);
    glowContext.clearRect(0, 0, width, height);
    if (night > 0.01) {
      context.fillStyle = `rgba(${deep[0]},${deep[1]},${deep[2]},${night.toFixed(3)})`;
      context.fillRect(0, 0, width, height);
      context.globalCompositeOperation = 'destination-out';
    }
    const scale = camera.zoom / CELL;
    const t = this.clock / 1000;
    const hole = (cx, cy, inner, outer, strength = 1) => {
      if (cx + outer < 0 || cy + outer < 0 || cx - outer > width || cy - outer > height) return;
      const gradient = context.createRadialGradient(cx, cy, inner, cx, cy, outer);
      gradient.addColorStop(0, `rgba(0,0,0,${strength})`);
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      context.fillStyle = gradient;
      context.fillRect(cx - outer, cy - outer, outer * 2, outer * 2);
    };
    const halo = (cx, cy, radius, rgb, alpha) => {
      if (alpha <= 0.005 || cx + radius < 0 || cy + radius < 0 || cx - radius > width || cy - radius > height) return;
      const gradient = glowContext.createRadialGradient(cx, cy, 0, cx, cy, radius);
      gradient.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha.toFixed(3)})`);
      gradient.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`);
      glowContext.fillStyle = gradient;
      glowContext.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
    };
    glowContext.globalCompositeOperation = 'lighter';
    for (const source of this.sources(player)) {
      const kind = source.kind ? KIND[source.kind] ?? KIND.lamp : null;
      const flicker = kind ? 1 + kind.flicker * Math.sin(t * 9.1 + (source.seed ?? 0)) : 1;
      const cx = (source.x - camera.worldView.x) * scale;
      const cy = (source.y - camera.worldView.y) * scale;
      const radius = source.radius * flicker / CELL * camera.zoom;
      const falloff = source.falloff / CELL * camera.zoom;
      if (night > 0.01) hole(cx, cy, radius * 0.6, radius + falloff);
      if (kind) {
        const ramp = HALO_RGB[source.kind] ?? HALO_RGB.lamp;
        halo(cx, cy, (radius + falloff * 0.5) * 0.9, ramp[Math.min(2, ramp.length - 1)], Math.min(1, kind.glow * glowScale * flicker * 0.5));
      }
    }
    const area = this.camp.getLightArea?.();
    if (area) {
      const cx = (area.x - camera.worldView.x) * scale;
      const cy = (area.y - camera.worldView.y) * scale;
      const radius = area.radius * scale;
      const fade = Math.max(70, area.radius * 0.3) * scale;
      if (night > 0.01) hole(cx, cy, radius, radius + fade);
      halo(cx, cy, radius + fade, HALO_RGB.lamp[2], 0.1 * glowScale);
    }
    // Vinheta fixa nos cantos.
    context.globalCompositeOperation = 'source-over';
    const vignette = (18 + 30 * level) / 255;
    const corner = context.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.45, width / 2, height / 2, Math.hypot(width, height) / 2);
    corner.addColorStop(0, 'rgba(14,7,27,0)');
    corner.addColorStop(1, `rgba(14,7,27,${vignette.toFixed(3)})`);
    context.fillStyle = corner;
    context.fillRect(0, 0, width, height);
    glowContext.globalCompositeOperation = 'source-over';
    this.texture.refresh();
    this.glowTexture.refresh();
  }
}
