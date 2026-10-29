import Phaser from 'phaser';
import { isPortraitPhone } from './cameraZoom.js';

// Textos do mundo (balões, rótulos de prédios/NPCs, placas, dicas "E", título do jogador...) ficam com
// tamanho constante na tela: a escala deles é dividida pelo zoom da câmera. A escala original de cada
// texto foi pensada para zoom 2, então o tamanho na tela é `escala original x 2` (x1,25 no celular em pé).
const REFERENCE_ZOOM = 2;
const PHONE_BOOST = 1.25;
const MARGIN = 8;
const MAX_BUBBLE_WIDTH = 260;

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

  update() {
    const scene = this.scene;
    const camera = scene.cameras.main;
    const zoom = camera.zoom || 1;
    const boost = screenBoost(scene);
    for (const text of this.texts) {
      if (!text.active || text.skipWorldScale || !this.isWorld(text)) continue;
      text.baseScale ??= text.scaleX || 1;
      const screen = text.baseScale * REFERENCE_ZOOM * boost;
      const scale = screen / zoom;
      if (Math.abs(text.scaleX - scale) > 0.001) text.setScale(scale);
      // Resolução proporcional ao tamanho final na tela (e ao DPR): sem borrar.
      const resolution = Math.min(6, Math.max(2, Math.ceil(screen * this.dpr)));
      if (text.resolution !== resolution) text.setResolution(resolution);
      if (text.keepOnScreen) this.keepOnScreen(text, screen, zoom, camera);
    }
  }

  /** Balão de fala: quebra de linha pela largura da tela e posição presa dentro da tela. */
  keepOnScreen(text, screen, zoom, camera) {
    if (!text.visible) return;
    const width = this.scene.scale.width;
    const height = this.scene.scale.height;
    const wrap = Math.floor(Math.min(MAX_BUBBLE_WIDTH, (width - MARGIN * 2) / screen - 12));
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
  }
}
