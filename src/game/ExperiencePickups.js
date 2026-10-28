import Phaser from 'phaser';
import { PixelCanvas } from '../art/pixel.js';
import { quantizePixels } from '../art/palette.js';

const PICKUP_TEXTURE = 'xp-pickup-orb';

export class ExperiencePickups {
  constructor(scene) {
    this.scene = scene;
    this.pickups = [];
    this.ensureTexture();
  }

  ensureTexture() {
    if (this.scene.textures.exists(PICKUP_TEXTURE)) return;
    const texture = this.scene.textures.createCanvas(PICKUP_TEXTURE, 12, 12);
    // Cristal lapidado roxo.
    const crystal = new PixelCanvas(12, 12);
    crystal.polygon([[6, 0], [11, 5], [6, 12], [1, 5]], '#8a5fc8');
    crystal.polygon([[6, 0], [6, 12], [1, 5]], '#b78de8');
    crystal.polygon([[6, 1], [8, 5], [6, 6], [3, 5]], '#e3ccff');
    crystal.polygon([[6, 7], [10, 6], [6, 11]], '#5e3a96');
    crystal.pixel(5, 2, '#ffffff');
    crystal.outline({ strength: 0.6 });
    texture.getContext().putImageData(new ImageData(quantizePixels(crystal).data, 12, 12), 0, 0);
    texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    texture.refresh();
  }

  spawn(x, y, amount) {
    const xp = Math.max(0, Math.floor(Number(amount) || 0));
    if (xp <= 0) return null;
    const image = this.scene.add.image(x, y - 5, PICKUP_TEXTURE)
      .setDepth(y + 12)
      .setScale(1.25);
    const label = this.scene.add.text(x, y - 18, `${xp} XP`, {
      fontFamily: 'Press Start 2P',
      fontSize: '8px',
      color: '#e7cfff',
      backgroundColor: '#241737cc',
      padding: { x: 3, y: 2 }
    }).setOrigin(0.5).setDepth(y + 13);
    this.scene.tweens.add({
      targets: image,
      y: image.y - 4,
      duration: 620,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    const pickup = { image, label, amount: xp, age: 0 };
    this.pickups.push(pickup);
    return pickup;
  }

  update(delta, player, onCollect) {
    const seconds = delta / 1000;
    for (const pickup of [...this.pickups]) {
      pickup.age += delta;
      const distance = Phaser.Math.Distance.Between(
        pickup.image.x,
        pickup.image.y,
        player.x,
        player.y
      );
      if (distance < 92 && distance > 0) {
        const angle = Phaser.Math.Angle.Between(pickup.image.x, pickup.image.y, player.x, player.y);
        pickup.image.x += Math.cos(angle) * 145 * seconds;
        pickup.image.y += Math.sin(angle) * 145 * seconds;
        pickup.label.setPosition(pickup.image.x, pickup.image.y - 13);
      }
      if (distance <= 24) {
        this.remove(pickup);
        onCollect?.(pickup.amount, pickup.image.x, pickup.image.y);
      } else if (pickup.age >= 90000) {
        this.remove(pickup);
      }
    }
  }

  remove(pickup) {
    const index = this.pickups.indexOf(pickup);
    if (index >= 0) this.pickups.splice(index, 1);
    pickup.image?.destroy();
    pickup.label?.destroy();
  }

  clear() {
    for (const pickup of [...this.pickups]) this.remove(pickup);
  }
}
