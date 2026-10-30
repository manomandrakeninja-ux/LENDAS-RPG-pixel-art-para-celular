import Phaser from 'phaser';
import { isPortraitPhone } from './cameraZoom.js';

// Textos do mundo (balões, rótulos de prédios/NPCs, placas, dicas "E", título do jogador...) ficam com
// tamanho constante na tela: a escala deles é dividida pelo zoom da câmera. A escala original de cada
// texto foi pensada para zoom 2, então o tamanho na tela é `escala original x 2` (x1,25 no celular em pé).
const REFERENCE_ZOOM = 2;
const PHONE_BOOST = 1.25;
const MARGIN = 8;
const MAX_BUBBLE_WIDTH = 260;

/**
 * Dica de tecla "E" sobre recursos e baús (rodada 3): era um quadrado de ~32 px na tela, cobrindo árvores
 * e o cavalo. Agora metade da escala (letra de 8 px na tela, caixa <= 16 px) e as cores da moldura da
 * interface (madeira escura e letra dourada da ui-skin).
 */
export const KEY_HINT_STYLE = Object.freeze({
  fontFamily: 'Press Start 2P', fontSize: '8px', color: '#f4d88f',
  backgroundColor: '#2b1d14e6', padding: { x: 3, y: 2 }, stroke: '#140f14', strokeThickness: 0
});
export const KEY_HINT_SCALE = 0.5;

/** Multiplicador de escala para o zoom atual (use no lugar do zoom 2 fixo). */
export function worldTextFactor(scene, boost = 1) {
  const camera = scene.cameras.main;
  return REFERENCE_ZOOM * boost / (camera.zoom || 1);
}

function screenBoost(scene) {
  return isPortraitPhone(scene.scale.width, scene.scale.height) ? PHONE_BOOST : 1;
}

export class WorldTexts {
  constructor(scene) {
    this.scene = scene;
    this.texts = new Set();
    this.dpr = Math.min(3, window.devicePixelRatio || 1);
    const add = (object) => {
      if (object instanceof Phaser.GameObjects.Text) this.add(object);
      else if (object instanceof Phaser.GameObjects.Container) object.list.forEach(add);
    };
    scene.children.list.forEach(add);
    scene.events.on('addedtoscene', add);
  }

  add(text) {
    if (this.texts.has(text)) return;
    this.texts.add(text);
    text.once('destroy', () => this.texts.delete(text));
  }

  /** É texto do mundo se a câmera do HUD o ignora. */
  isWorld(text) {
    const hud = this.scene.hudCamera;
    if (!hud) return false;
    // Texto dentro de um container (balão de morador): vale o filtro do próprio texto ou o do container.
    return ((text.cameraFilter | (text.parentContainer?.cameraFilter ?? 0)) & hud.id) !== 0;
  }

  /**
   * Rodada 4: o que um balão não pode cobrir (herói e faixas de aviso) e os personagens que um rótulo não
   * pode cruzar. Calculado uma vez por quadro, em coordenadas de tela do canvas.
   */
  blockers(camera, zoom) {
    const scene = this.scene;
    const view = camera.worldView;
    const toScreen = (x0, y0, x1, y1) => ({ l: (x0 - view.x) * zoom, t: (y0 - view.y) * zoom, r: (x1 - view.x) * zoom, b: (y1 - view.y) * zoom });
    const player = scene.player;
    const hero = player ? toScreen(player.x - 16, player.y - 54, player.x + 16, player.y + 6) : null;
    const bands = [];
    const message = scene.ui?.message;
    if (message?.visible && message.alpha > 0.05 && message.text) {
      const w = message.displayWidth; const h = message.displayHeight;
      bands.push({ l: message.x - w * message.originX - 6, t: message.y - h * message.originY - 6, r: message.x + w * (1 - message.originX) + 6, b: message.y + h * (1 - message.originY) + 6 });
    }
    // Faixas em HTML (avisos da campanha): convertidas para o espaço do canvas.
    const canvasRect = scene.game.canvas?.getBoundingClientRect?.();
    if (canvasRect?.width) {
      const k = scene.scale.width / canvasRect.width;
      for (const el of document.querySelectorAll('.quest-toast, #epic-banner')) {
        if (el.hidden || el.classList?.contains('is-leaving')) continue;
        const r = el.getBoundingClientRect();
        if (!r.width) continue;
        bands.push({ l: (r.left - canvasRect.left) * k - 6, t: (r.top - canvasRect.top) * k - 6, r: (r.right - canvasRect.left) * k + 6, b: (r.bottom - canvasRect.top) * k + 6 });
      }
    }
    return { hero, bands };
  }

  /** Personagens (mundo): herói, moradores e NPCs da campanha, como retângulos dos pés à cabeça. */
  characterRects() {
    const scene = this.scene;
    const list = [];
    const player = scene.player;
    if (player) list.push({ owner: player, l: player.x - 14, r: player.x + 14, t: player.y - 52, b: player.y + 4 });
    for (const v of scene.villagers?.villagers?.values?.() ?? []) {
      const c = v.container; if (!c?.active) continue;
      list.push({ owner: c, l: c.x - 13, r: c.x + 13, t: c.y - 50, b: c.y + 4 });
    }
    for (const npc of scene.campaign?.npcs?.values?.() ?? []) {
      const sp = npc.sprite; if (!sp?.active) continue;
      const b = sp.getBounds();
      list.push({ owner: npc.label, l: b.x + 4, r: b.right - 4, t: b.y + 2, b: b.bottom });
    }
    return list;
  }

  /** Rótulo sobe até não cruzar nenhum personagem (fora o próprio dono); "!" fica ao lado do nome. */
  avoidCharacters(text, rects) {
    // Alguém reposicionou o rótulo (nível novo, portão...): essa passa a ser a altura de origem.
    if (text.homeY === undefined || (text.avoidY !== undefined && Math.abs(text.y - text.avoidY) > 0.5)) text.homeY = text.y;
    const halfW = text.displayWidth / 2; const h = text.displayHeight;
    let y = text.homeY;
    for (let guard = 0; guard < 4; guard += 1) {
      const top = y - h * text.originY; const bottom = top + h;
      const hit = rects.find((r) => r.owner !== text && r.r > text.x - halfW && r.l < text.x + halfW && r.b > top && r.t < bottom);
      if (!hit) break;
      y = hit.t - 2 - h * (1 - text.originY);
    }
    if (Math.abs(text.y - y) > 0.5) text.setY(y);
    text.avoidY = text.y;
    const marker = text.sideMarker;
    if (marker?.active) marker.setPosition(text.x + halfW + marker.displayWidth / 2 + 2, text.y);
  }

  update() {
    const scene = this.scene;
    const camera = scene.cameras.main;
    const zoom = camera.zoom || 1;
    const boost = screenBoost(scene);
    this.blocked = this.blockers(camera, zoom);
    this.avoidTimer = (this.avoidTimer ?? 0) - 1;
    const rects = this.avoidTimer <= 0 ? this.characterRects() : null;
    if (rects) this.avoidTimer = 6;
    for (const text of this.texts) {
      if (!text.active || text.skipWorldScale || !this.isWorld(text)) continue;
      text.baseScale ??= text.scaleX || 1;
      const screen = text.baseScale * REFERENCE_ZOOM * boost;
      const scale = screen / zoom;
      if (Math.abs(text.scaleX - scale) > 0.001) text.setScale(scale);
      // Resolução proporcional ao tamanho final na tela (e ao DPR): sem borrar.
      const resolution = Math.min(6, Math.max(2, Math.ceil(screen * this.dpr)));
      if (text.style.resolution !== resolution) text.setResolution(resolution);
      if (text.keepOnScreen) this.keepOnScreen(text, screen, zoom, camera);
    }
    // Rótulos: os de baixo primeiro; cada um, já no lugar, vira obstáculo para os seguintes
    // (VIGIA e CONSTRUTOR não se sobrepõem mais).
    if (rects) {
      const labels = [...this.texts].filter((t) => t.active && t.avoidSprites && t.visible && t.text && this.isWorld(t));
      labels.sort((a, b) => (b.homeY ?? b.y) - (a.homeY ?? a.y));
      for (const label of labels) {
        this.avoidCharacters(label, rects);
        const w = label.displayWidth; const h = label.displayHeight;
        const l = label.x - w * label.originX; const t = label.y - h * label.originY;
        rects.push({ owner: label, l: l - 2, r: l + w + 2, t: t - 1, b: t + h + 1 });
        const m = label.sideMarker;
        if (m?.active && m.text) rects.push({ owner: label, l: m.x - m.displayWidth / 2, r: m.x + m.displayWidth / 2, t: m.y - m.displayHeight / 2, b: m.y + m.displayHeight / 2 });
      }
    }
  }

  /** Balão de fala: quebra de linha pela largura da tela e posição presa dentro da tela. */
  keepOnScreen(text, screen, zoom, camera) {
    if (!text.visible) return;
    const width = this.scene.scale.width;
    const height = this.scene.scale.height;
    // No celular em pé o balão ocupa no máximo 60 % da largura da tela.
    const usable = isPortraitPhone(width, height) ? width * 0.6 : width - MARGIN * 2;
    const wrap = Math.floor(Math.min(MAX_BUBBLE_WIDTH, usable / screen - 12));
    if (text.style.wordWrapWidth !== wrap) text.setWordWrapWidth(wrap, true);
    const parent = text.parentContainer;
    const originX = parent ? parent.x : 0;
    const originY = parent ? parent.y : 0;
    const view = camera.worldView;
    // Posição de tela do ponto de ancoragem (centro/base do balão).
    text.homeX ??= text.x;
    text.homeY ??= text.y;
    const halfW = text.displayWidth * zoom / 2;
    const tall = text.displayHeight * zoom;
    let sx = (originX + text.homeX - view.x) * zoom;
    let sy = (originY + text.homeY - view.y) * zoom;
    sx = Math.min(Math.max(sx, MARGIN + halfW), width - MARGIN - halfW);
    sy = Math.min(Math.max(sy, MARGIN + tall), height - MARGIN);
    text.setPosition(sx / zoom + view.x - originX, sy / zoom + view.y - originY);
    // Nunca sobre o herói nem atrás de uma faixa de aviso (texto fantasma): some enquanto cruzar.
    const box = { l: sx - halfW, r: sx + halfW, t: sy - tall, b: sy };
    const cross = (r) => r && r.r > box.l && r.l < box.r && r.b > box.t && r.t < box.b;
    const blocked = cross(this.blocked?.hero) || (this.blocked?.bands ?? []).some(cross);
    const alpha = blocked ? 0 : 1;
    if (text.alpha !== alpha) text.setAlpha(alpha);
  }
}
