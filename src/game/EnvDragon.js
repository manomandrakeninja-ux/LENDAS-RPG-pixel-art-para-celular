import { OVERLAY_DEPTH } from './depths.js';

// Dragao ambiental: spritesheet pixel art 4x1 carregada em assets.js.
const TEXTURE_KEY = 'env-dragon';
const ANIMATION_KEY = 'env-dragon-fly';

function ensureDragonAnimation(scene) {
  if (!scene.anims.exists(ANIMATION_KEY)) {
    scene.anims.create({
      key: ANIMATION_KEY,
      frames: scene.anims.generateFrameNumbers(TEXTURE_KEY, { start: 0, end: 3 }),
      frameRate: 8,
      repeat: -1
    });
  }
}

export class EnvDragon {
  constructor(scene) {
    this.scene = scene;
    this.timer = 90_000 + Math.random() * 120_000;
    this.active = null;
  }

  update(delta) {
    const scene = this.scene;
    if (this.active) {
      const { sprite, shadow, fromLeft, speed } = this.active;
      sprite.x += (fromLeft ? 1 : -1) * speed * (delta / 1000);
      shadow?.setPosition(sprite.x, sprite.y + 280);
      const cam = scene.cameras.main;
      const out = fromLeft ? sprite.x > cam.scrollX + cam.width + 180 : sprite.x < cam.scrollX - 180;
      if (out) {
        sprite.destroy();
        shadow?.destroy();
        this.active = null;
        this.timer = 180_000 + Math.random() * 240_000;
      }
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
    const x = fromLeft ? cam.scrollX - 150 : cam.scrollX + cam.width + 150;
    if (!scene.textures.exists(TEXTURE_KEY)) return;
    ensureDragonAnimation(scene);
    const sprite = scene.add.sprite(x, y, TEXTURE_KEY, 0)
      .setDepth(OVERLAY_DEPTH + 4300)
      .setScale(0.19)
      .setFlipX(!fromLeft);
    sprite.play(ANIMATION_KEY);
    scene.hudCamera?.ignore(sprite);
    const shadow = scene.add.graphics().setDepth(5);
    scene.hudCamera?.ignore(shadow);
    shadow.fillStyle(0x000000, 0.2);
    shadow.fillEllipse(0, 0, 110, 24);
    shadow.setPosition(x, y + 280);
    this.active = { sprite, shadow, fromLeft, speed: 150 + Math.random() * 70 };
    scene.audio?.playRoar?.();
    scene.ui?.showMessage?.('Um dragao cruza o ceu ao longe...');
  }
}
