import { sunShadow } from '../data/sunlight.js';
import { fitScreenRect } from './cameraZoom.js';

// Sombras que acompanham o sol: de manhã apontam para oeste e ficam compridas,
// ao meio-dia encolhem, à tarde viram para leste; à noite quase somem.
// Também dá um leve tom de cor à manhã (dourado) e ao fim da tarde (laranja).

// Roxo-azulado da paleta-mestre (#1a1932): a sombra longa não fica cinza neutro.
const SHADOW_COLOR = 0x1a1932;
// A sombra longa fica mais curta e mais clara; quem "assenta" o objeto é a sombra de contato.
const LONG_LENGTH = 0.8;
const LONG_ALPHA = 0.78;
// Sombra de contato: elipse de 2 tons (núcleo #1a1932 a ~56 %, borda #2a2f4e a ~34 %).
const CONTACT_CORE = [26, 25, 50, 0.56];
const CONTACT_EDGE = [42, 47, 78, 0.34];
// Herói: 3 tons e mais largo que a sombra já desenhada no sprite, para não sumir sob ela.
const CONTACT_STRONG_CORE = [14, 7, 27, 0.72];
const CONTACT_STRONG_MID = [26, 25, 50, 0.58];
// Texturas que já trazem a sombra de contato desenhada no sprite.
const BAKED_CONTACT = new Set(['buildings']);

/** Gera (uma vez) a textura da elipse de contato com w x h pixels. */
export function contactTexture(scene, width, height, strong = false) {
  const w = Math.max(4, Math.round(width));
  const h = Math.max(3, Math.round(height));
  const key = `contact-shadow-${w}x${h}${strong ? '-s' : ''}`;
  if (scene.textures.exists(key)) return key;
  const texture = scene.textures.createCanvas(key, w, h);
  const context = texture.getContext();
  const image = context.createImageData(w, h);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const nx = (x + 0.5 - w / 2) / (w / 2);
      const ny = (y + 0.5 - h / 2) / (h / 2);
      const d = nx * nx + ny * ny;
      if (d > 1) continue;
      const [r, g, b, a] = strong ? (d > 0.62 ? CONTACT_EDGE : d > 0.25 ? CONTACT_STRONG_MID : CONTACT_STRONG_CORE) : d > 0.5 ? CONTACT_EDGE : CONTACT_CORE;
      image.data.set([r, g, b, Math.round(a * 255)], (y * w + x) * 4);
    }
  }
  context.putImageData(image, 0, 0);
  texture.refresh();
  return key;
}

export class ShadowSystem {
  constructor(scene) {
    this.scene = scene;
    this.entries = new Map();
    this.contacts = new Map();
    this.footprints = new Map();
    this.timer = 0;
    this.current = sunShadow(8);
    this.grade = scene.add.rectangle(0, 0, scene.scale.width, scene.scale.height, 0xffc890, 0)
      .setOrigin(0).setScrollFactor(0).setDepth(3996);
    scene.scale.on('resize', () => fitScreenRect(this.grade, scene.cameras.main, scene.scale.width, scene.scale.height));
    fitScreenRect(this.grade, scene.cameras.main, scene.scale.width, scene.scale.height);
  }

  register(images = []) {
    for (const image of images) {
      if (!image?.active || this.entries.has(image)) continue;
      const shadow = this.scene.add.image(image.x, image.y, image.texture.key, image.frame.name)
        .setOrigin(image.originX, image.originY)
        .setTintFill(SHADOW_COLOR)
        .setDepth(-998);
      this.scene.hudCamera?.ignore(shadow);
      this.apply(shadow);
      this.entries.set(image, shadow);
      if (!BAKED_CONTACT.has(image.texture.key)) this.addContact(image);
    }
  }

  /** Base do objeto no quadro: linha mais baixa opaca e largura da faixa de baixo (em cache). */
  footprint(image) {
    const frame = image.frame;
    const key = `${image.texture.key}|${frame.name}`;
    if (this.footprints.has(key)) return this.footprints.get(key);
    let result = null;
    try {
      const w = frame.cutWidth;
      const h = frame.cutHeight;
      this.probe ??= document.createElement('canvas');
      this.probe.width = w;
      this.probe.height = h;
      const context = this.probe.getContext('2d', { willReadFrequently: true });
      context.clearRect(0, 0, w, h);
      context.drawImage(frame.source.image, frame.cutX, frame.cutY, w, h, 0, 0, w, h);
      const data = context.getImageData(0, 0, w, h).data;
      let top = h;
      let bottom = -1;
      for (let y = 0; y < h; y += 1) {
        for (let x = 0; x < w; x += 1) if (data[(y * w + x) * 4 + 3] >= 200) { top = Math.min(top, y); bottom = y; break; }
      }
      if (bottom >= 0) {
        const band = bottom - Math.max(3, (bottom - top) * 0.15);
        let left = w;
        let right = -1;
        for (let y = Math.ceil(band); y <= bottom; y += 1) {
          for (let x = 0; x < w; x += 1) if (data[(y * w + x) * 4 + 3] >= 200) { left = Math.min(left, x); right = Math.max(right, x); }
        }
        result = { cx: (left + right + 1) / 2, width: right - left + 1, bottom: bottom + 1, w, h };
      }
    } catch {
      result = null;
    }
    this.footprints.set(key, result);
    return result;
  }

  addContact(image) {
    const foot = this.footprint(image);
    if (!foot) return;
    const width = Math.min(foot.w, foot.width * 1.25 + 4) * Math.abs(image.scaleX);
    const height = Math.min(12, Math.max(4, width * 0.26));
    const contact = this.scene.add.image(0, 0, contactTexture(this.scene, width, height)).setDepth(-997.5);
    this.scene.hudCamera?.ignore(contact);
    this.contacts.set(image, contact);
    this.placeContact(image, contact, foot);
  }

  placeContact(image, contact, foot = this.footprint(image)) {
    if (!foot) return;
    const dx = (foot.cx - image.originX * foot.w) * image.scaleX * (image.flipX ? -1 : 1);
    const dy = (foot.bottom - image.originY * foot.h) * image.scaleY;
    contact.setPosition(image.x + dx, image.y + dy - contact.height * 0.3).setVisible(image.visible);
  }

  /** Sombra de contato presa a um personagem (contêiner): segue o dono sem custo por quadro. */
  attachContact(container, { width = 30, y = 6, strong = true } = {}) {
    if (!container?.addAt) return null;
    const contact = this.scene.add.image(0, y, contactTexture(this.scene, width, Math.max(4, Math.round(width * 0.32)), strong));
    container.addAt(contact, 0);
    return contact;
  }

  unregister(images = []) {
    for (const image of images) {
      this.entries.get(image)?.destroy();
      this.entries.delete(image);
      this.contacts.get(image)?.destroy();
      this.contacts.delete(image);
    }
  }

  apply(shadow) {
    const { angle, length, alpha } = this.current;
    const hidden = this.scene.regionWorld?.underground;
    shadow.setScale(1, -length * LONG_LENGTH).setRotation(angle).setAlpha(hidden ? 0 : alpha * LONG_ALPHA);
  }

  update(delta, timeState) {
    this.timer -= delta;
    if (this.timer > 0 || !timeState) return;
    this.timer = 500;
    const hour = timeState.hour + (timeState.minute ?? 0) / 60;
    this.current = sunShadow(hour);
    // Prédios do acampamento também fazem sombra (e trocam de desenho ao subir de nível).
    const buildings = Object.values(this.scene.camp?.buildings ?? {}).flatMap((building) => building.sprites ?? [building.sprite]);
    this.register(buildings.filter((sprite) => sprite?.texture?.key === 'buildings'));
    for (const [image, shadow] of this.entries) {
      if (!image.active) {
        shadow.destroy();
        this.entries.delete(image);
        this.contacts.get(image)?.destroy();
        this.contacts.delete(image);
        continue;
      }
      if (shadow.frame.name !== image.frame.name) shadow.setFrame(image.frame.name);
      shadow.setPosition(image.x, image.y).setVisible(image.visible);
      this.apply(shadow);
      const contact = this.contacts.get(image);
      if (contact) this.placeContact(image, contact);
    }
    // Luz da manhã dourada e da tarde alaranjada (a noite fica com o LightingSystem).
    let tint = 0xffc890;
    let strength = 0;
    if (hour >= 6 && hour < 8.5) {
      tint = 0xffb8a0;
      strength = 0.1 * (1 - (hour - 6) / 2.5);
    } else if (hour >= 15.5 && hour < 18) {
      tint = 0xff9a50;
      strength = 0.1 * ((hour - 15.5) / 2.5);
    }
    if (this.scene.regionWorld?.underground) strength = 0;
    this.grade.setFillStyle(tint, strength);
  }
}
