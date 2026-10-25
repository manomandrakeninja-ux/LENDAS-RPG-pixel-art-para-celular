import Phaser from 'phaser';

const COIN_TEXTURE = 'coin-pickup';

export class CoinPickups {
  constructor(scene) {
    this.scene = scene;
    this.pickups = [];
    this.ensureTexture();
  }

  ensureTexture() {
    if (this.scene.textures.exists(COIN_TEXTURE)) return;
    const texture = this.scene.textures.createCanvas(COIN_TEXTURE, 12, 12);
    const context = texture.getContext();
    context.imageSmoothingEnabled = false;
    context.clearRect(0, 0, 12, 12);
    context.fillStyle = '#8b641b';
    context.fillRect(2, 2, 8, 8);
    context.fillStyle = '#f0c743';
    context.fillRect(3, 2, 6, 8);
    context.fillRect(2, 3, 8, 6);
    context.fillStyle = '#fff09a';
    context.fillRect(4, 3, 3, 2);
    texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    texture.refresh();
  }

  spawn(x, y, amount) {
    const coins = Math.max(0, Math.floor(Number(amount) || 0));
    if (coins <= 0) return null;
    const image = this.scene.add.image(x, y - 5, COIN_TEXTURE).setDepth(y + 12);
    const label = this.scene.add.text(x, y - 18, `${coins}`, {
      fontFamily: 'Press Start 2P',
      fontSize: '7px',
      color: '#ffe987',
      backgroundColor: '#39270edd',
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
    const pickup = { image, label, amount: coins, age: 0 };
    this.pickups.push(pickup);
    return pickup;
  }

  update(delta, player, onCollect) {
    const seconds = delta / 1000;
    for (const pickup of [...this.pickups]) {
      pickup.age += delta;
      const distance = Phaser.Math.Distance.Between(pickup.image.x, pickup.image.y, player.x, player.y);
      if (distance < 88 && distance > 0) {
        const angle = Phaser.Math.Angle.Between(pickup.image.x, pickup.image.y, player.x, player.y);
        pickup.image.x += Math.cos(angle) * 135 * seconds;
        pickup.image.y += Math.sin(angle) * 135 * seconds;
        pickup.label.setPosition(pickup.image.x, pickup.image.y - 13);
      }
      if (distance <= 23) {
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
