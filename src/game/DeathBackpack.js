import Phaser from 'phaser';

export class DeathBackpackManager {
  constructor(scene, savedBackpacks = []) {
    this.scene = scene;
    this.backpacks = [];
    this.nextId = 1;
    for (const saved of savedBackpacks) this.create(saved.x, saved.y, saved.items ?? {}, saved.id);
  }

  create(x, y, items, id = null) {
    const backpack = {
      id: id ?? `death-bag-${this.nextId++}`,
      x: Math.round(x),
      y: Math.round(y),
      items: { ...items }
    };
    if (id) {
      const numericId = Number(id.split?.('-').at(-1));
      if (Number.isFinite(numericId)) this.nextId = Math.max(this.nextId, numericId + 1);
    }

    backpack.glow = this.scene.add.image(backpack.x, backpack.y - 8, 'vfx', 'spark-0')
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.26)
      .setDepth(backpack.y - 2);
    backpack.sprite = this.scene.add.image(backpack.x, backpack.y, 'nature', 'death-backpack')
      .setOrigin(0.5, 0.84)
      .setDepth(backpack.y);
    backpack.hint = this.scene.add.text(backpack.x, backpack.y - 25, 'E', {
      fontFamily: 'Press Start 2P', fontSize: '8px', color: '#fff3cf',
      backgroundColor: '#26392dcc', padding: { x: 4, y: 3 }
    }).setOrigin(0.5).setDepth(backpack.y + 30).setVisible(false);
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
    if (Object.keys(backpack.items).length === 0) {
      this.remove(backpack);
      return { ...result, complete: true };
    }
    return { ...result, complete: false };
  }

  updateHints(selected) {
    for (const backpack of this.backpacks) backpack.hint.setVisible(backpack === selected);
  }

  remove(backpack) {
    const index = this.backpacks.indexOf(backpack);
    if (index === -1) return;
    this.backpacks.splice(index, 1);
    backpack.glow.destroy();
    backpack.sprite.destroy();
    backpack.hint.destroy();
  }

  serialize() {
    return this.backpacks.map((backpack) => ({
      id: backpack.id,
      x: backpack.x,
      y: backpack.y,
      items: { ...backpack.items }
    }));
  }
}
