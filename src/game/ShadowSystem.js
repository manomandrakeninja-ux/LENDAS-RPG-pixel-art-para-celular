import { sunShadow } from '../data/sunlight.js';

// Sombras que acompanham o sol: de manhã apontam para oeste e ficam compridas,
// ao meio-dia encolhem, à tarde viram para leste; à noite quase somem.
// Também dá um leve tom de cor à manhã (dourado) e ao fim da tarde (laranja).

const SHADOW_COLOR = 0x0b0a18;

export class ShadowSystem {
  constructor(scene) {
    this.scene = scene;
    this.entries = new Map();
    this.timer = 0;
    this.current = sunShadow(8);
    this.grade = scene.add.rectangle(0, 0, scene.scale.width, scene.scale.height, 0xffc890, 0)
      .setOrigin(0).setScrollFactor(0).setDepth(3996);
    scene.scale.on('resize', () => this.grade.setSize(scene.scale.width, scene.scale.height));
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
    }
  }

  unregister(images = []) {
    for (const image of images) {
      this.entries.get(image)?.destroy();
      this.entries.delete(image);
    }
  }

  apply(shadow) {
    const { angle, length, alpha } = this.current;
    const hidden = this.scene.regionWorld?.underground;
    shadow.setScale(1, -length).setRotation(angle).setAlpha(hidden ? 0 : alpha);
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
        continue;
      }
      if (shadow.frame.name !== image.frame.name) shadow.setFrame(image.frame.name);
      shadow.setPosition(image.x, image.y).setVisible(image.visible);
      this.apply(shadow);
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
