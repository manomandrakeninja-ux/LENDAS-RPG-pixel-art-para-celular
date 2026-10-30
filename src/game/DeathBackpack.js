import Phaser from 'phaser';
import { KEY_HINT_SCALE, KEY_HINT_STYLE } from './worldText.js';

export class DeathBackpackManager {
  constructor(scene, savedBackpacks = []) {
    this.scene = scene;
    this.backpacks = [];
    this.nextId = 1;
    for (const saved of savedBackpacks) {
      this.create(saved.x, saved.y, saved.items ?? {}, saved.id, { kind: saved.kind, coins: saved.coins, name: saved.name });
    }
  }

  /** kind: 'backpack' (itens que não couberam) ou 'chest' (baú deixado por monstro especial). */
  create(x, y, items, id = null, { kind = 'backpack', coins = 0, name = '' } = {}) {
    const chest = kind === 'chest';
    const backpack = {
      id: id ?? `death-bag-${this.nextId++}`,
      x: Math.round(x),
      y: Math.round(y),
      items: { ...items },
      kind: chest ? 'chest' : 'backpack',
      coins: Math.max(0, Math.floor(Number(coins) || 0)),
      name: String(name || '')
    };
    if (id) {
      const numericId = Number(id.split?.('-').at(-1));
      if (Number.isFinite(numericId)) this.nextId = Math.max(this.nextId, numericId + 1);
    }

    backpack.glow = this.scene.add.image(backpack.x, backpack.y - 8, 'vfx', 'spark-0')
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(chest ? 0.5 : 0.26)
      .setDepth(backpack.y - 2);
    if (chest) {
      backpack.glow.setTint(0xffd76b).setScale(2);
      this.scene.tweens.add({ targets: backpack.glow, alpha: 0.2, duration: 700, yoyo: true, repeat: -1 });
    }
    backpack.sprite = chest && this.scene.textures.exists('harvest-structure-chest')
      ? this.scene.add.image(backpack.x, backpack.y, 'harvest-structure-chest').setOrigin(0.5, 0.88).setDepth(backpack.y).setScale(1.3)
      : this.scene.add.image(backpack.x, backpack.y, 'nature', 'death-backpack').setOrigin(0.5, 0.84).setDepth(backpack.y).setScale(1.3);
    backpack.hint = this.scene.add.text(backpack.x, backpack.y - 25, 'E', KEY_HINT_STYLE).setScale(KEY_HINT_SCALE).setOrigin(0.5).setDepth(backpack.y + 30).setVisible(false);
    this.backpacks.push(backpack);
    this.scene.hudCamera?.ignore([backpack.glow, backpack.sprite, backpack.hint]);
    return backpack;
  }

  nearest(x, y, range = 58) {
    let closest = null;
    let distance = range;
    for (const backpack of this.backpacks) {
      const current = Phaser.Math.Distance.Between(x, y, backpack.x, backpack.y);
      if (current < distance) {
        closest = backpack;
        distance = current;
      }
    }
    return closest;
  }

  collect(backpack, inventory) {
    const result = inventory.addBundle(backpack.items);
    backpack.items = result.remaining;
    // As moedas do baú saem na primeira vez que ele é aberto.
    const coins = backpack.coins;
    backpack.coins = 0;
    if (Object.keys(backpack.items).length === 0) {
      this.remove(backpack);
      return { ...result, coins, complete: true };
    }
    return { ...result, coins, complete: false };
  }

  updateHints(selected) {
    for (const backpack of this.backpacks) backpack.hint.setVisible(backpack === selected);
  }

  remove(backpack) {
    const index = this.backpacks.indexOf(backpack);
    if (index === -1) return;
    this.backpacks.splice(index, 1);
    this.scene.tweens.killTweensOf(backpack.glow);
    backpack.glow.destroy();
    backpack.sprite.destroy();
    backpack.hint.destroy();
  }

  serialize() {
    return this.backpacks.map((backpack) => ({
      id: backpack.id,
      x: backpack.x,
      y: backpack.y,
      items: { ...backpack.items },
      kind: backpack.kind,
      coins: backpack.coins,
      name: backpack.name
    }));
  }
}
