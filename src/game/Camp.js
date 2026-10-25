import Phaser from 'phaser';
import { BUILDING_STORAGE_CAPACITY } from '../data/buildingSystems.js';
import { INVENTORY_CONFIG, RESOURCE_TYPES, WORLD } from './config.js';
import { EquipmentSystem } from './EquipmentSystem.js';

export const BUILDINGS = {
  forge: {
    name: 'Ferraria', icon: 'F', x: -76, y: -30, frame: 'forge',
    costs: [
      { wood: 6, stone: 5, iron: 2 },
      { wood: 10, stone: 7, iron: 4, coal: 2, gold: 1 }
    ]
  },
  farm: {
    name: 'Fazenda', icon: 'A', x: 65, y: 50, frame: 'farm',
    costs: [
      { wood: 10, stone: 4, seeds: 4 },
      { wood: 16, stone: 8, seeds: 8, herbs: 6 }
    ]
  },
  house: {
    name: 'Casa / Armazém', icon: 'B', x: -28, y: -118, frame: 'house',
    costs: [
      { wood: 12, stone: 8 },
      { wood: 18, stone: 12, herbs: 4 }
    ]
  },
  market: {
    name: 'Mercado', icon: 'M', x: 76, y: -48, frame: 'store',
    costs: [
      { wood: 10, stone: 6 },
      { wood: 16, stone: 10, iron: 2 }
    ]
  }
};

function migrateLevel(value) {
  const legacy = Math.max(0, Math.min(2, Number(value) || 0));
  return Math.min(3, legacy + 1);
}

export class Camp {
  constructor(scene, saved = {}) {
    this.scene = scene;
    const savedLevels = saved.levels ?? {};
    const modernLevels = Number(saved.buildingLevelsVersion) >= 2;
    this.legacyForgeLevel = modernLevels ? 0 : Math.max(0, Math.min(2, Number(savedLevels.forge) || 0));
    this.legacyForgeBonus = { attack: this.legacyForgeLevel * 4, defense: this.legacyForgeLevel };
    const levelOrLegacy = (value) => modernLevels
      ? Math.min(3, Math.max(1, Number(value) || 1))
      : migrateLevel(value);
    this.levels = {
      forge: levelOrLegacy(savedLevels.forge),
      farm: levelOrLegacy(savedLevels.farm),
      house: levelOrLegacy(savedLevels.house ?? savedLevels.store),
      market: modernLevels
        ? Math.min(3, Math.max(1, Number(savedLevels.market) || 1))
        : 1
    };
    this.x = WORLD.camp.x;
    this.y = WORLD.camp.y;
    this.interactionRadius = 165;
    this.questKills = saved.questKills ?? 0;
    this.questClaimed = saved.questClaimed ?? false;
    this.equipment = new EquipmentSystem({
      saved: saved.crafted ?? {},
      unlockedRecipes: saved.unlockedRecipes ?? [],
      forgeLevel: this.levels.forge
    });
    this.storage = Object.fromEntries(Object.keys(RESOURCE_TYPES).map((type) => [type, 0]));
    for (const [type, amount] of Object.entries(saved.storage ?? {})) {
      if (type in this.storage && Number.isFinite(Number(amount))) {
        this.storage[type] = Math.max(0, Math.floor(Number(amount)));
      }
    }
    this.buildings = {};
    this.lightGlows = [];
    this.lampVisuals = [];
    this.create();
  }

  create() {
    const scene = this.scene;
    this.fireGlow = scene.add.image(this.x, this.y + 18, 'buildings', 'warm-glow')
      .setScale(4)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.12)
      .setDepth(4500);
    this.lightGlows.push(this.fireGlow);
    this.fire = scene.add.sprite(this.x, this.y + 16, 'buildings', 'campfire-0')
      .setOrigin(0.5, 0.84)
      .setDepth(this.y + 18)
      .play('campfire-loop');
    this.embers = scene.add.particles(this.x, this.y + 10, 'vfx', {
      frame: 'ember-0',
      lifespan: { min: 700, max: 1300 },
      speedX: { min: -8, max: 8 },
      speedY: { min: -34, max: -18 },
      scale: 1,
      alpha: { start: 1, end: 0 },
      blendMode: Phaser.BlendModes.ADD,
      frequency: 220,
      quantity: 1
    }).setDepth(this.y + 24);

    for (const [key, definition] of Object.entries(BUILDINGS)) {
      this.buildings[key] = this.drawBuilding(key, definition);
    }

    const forge = this.buildings.forge.sprite;
    this.smoke = scene.add.sprite(forge.x + 17, forge.y - 43, 'buildings', 'smoke-0')
      .setOrigin(0.5, 1)
      .setDepth(forge.y - 36)
      .setAlpha(0.82)
      .play('forge-smoke');

    for (const [x, y] of [[this.x - 138, this.y + 5], [this.x + 145, this.y + 36]]) {
      const glow = scene.add.image(x, y - 10, 'buildings', 'warm-glow')
        .setScale(1)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0.08)
        .setDepth(4501 + y / 1000);
      this.lightGlows.push(glow);
      const lamp = scene.add.image(x, y, 'buildings', 'lamp').setOrigin(0.5, 0.95).setDepth(y + 12);
      this.lampVisuals.push(lamp);
    }

    this.createAnimalPen();
    this.flickerIndex = 0;
    scene.time.addEvent({
      delay: 170,
      loop: true,
      callback: () => {
        if ((this.lightLevel ?? 0) < 0.3) return;
        this.flickerIndex = (this.flickerIndex + 1) % 3;
        const offsets = [0.04, 0, -0.02];
        this.fireGlow.setAlpha(0.42 + offsets[this.flickerIndex]);
      }
    });
    scene.add.text(this.x, this.y + 151, 'ACAMPAMENTO  •  M', {
      fontFamily: 'Press Start 2P', fontSize: '7px', color: '#f8e7ba',
      backgroundColor: '#26392ddd', padding: { x: 8, y: 5 }
    }).setOrigin(0.5).setDepth(1000);
  }

  drawBuilding(key, definition) {
    const x = this.x + definition.x;
    const y = this.y + definition.y;
    const sprite = this.scene.add.image(x, y, 'buildings', definition.frame ?? key)
      .setOrigin(0.5, 0.84)
      .setDepth(y + 10)
      .setInteractive({ useHandCursor: true });
    sprite.on('pointerdown', (pointer, localX, localY, event) => {
      event?.stopPropagation?.();
      this.scene.openBuilding?.(key);
    });
    const glow = this.scene.add.image(x, y - 4, 'buildings', 'warm-glow')
      .setScale(1)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.05)
      .setDepth(4501 + y / 1000);
    this.lightGlows.push(glow);
    const label = this.scene.add.text(x, y - 55, `${definition.icon} ${this.levels[key]}`, {
      fontFamily: 'Press Start 2P', fontSize: '7px', color: '#f8edcc',
      backgroundColor: '#29382ddd', padding: { x: 4, y: 3 }
    }).setOrigin(0.5).setDepth(y + 20);
    return { sprite, glow, label };
  }

  createAnimalPen() {
    const cx = this.x + 130;
    const cy = this.y + 102;
    const halfWidth = 84;
    const halfHeight = 42;
    for (let x = cx - halfWidth; x < cx + halfWidth; x += 28) {
      this.scene.add.image(x, cy - halfHeight, 'buildings', 'fence').setDepth(cy - halfHeight);
      this.scene.add.image(x, cy + halfHeight, 'buildings', 'fence').setDepth(cy + halfHeight + 5);
    }
    for (let y = cy - halfHeight + 14; y < cy + halfHeight; y += 24) {
      this.scene.add.image(cx - halfWidth, y, 'buildings', 'fence')
        .setAngle(90).setDepth(y + 2);
      this.scene.add.image(cx + halfWidth, y, 'buildings', 'fence')
        .setAngle(90).setDepth(y + 2);
    }

    this.createCowTexture();
    this.animals = [];
    const animalTypes = ['sheep', 'pig', 'pig', 'chicken', 'sheep', 'cow'];
    for (const [index, type] of animalTypes.entries()) {
      let sprite;
      if (type === 'cow') {
        sprite = this.scene.add.sprite(cx, cy, 'camp-cow')
          .setOrigin(0.5, 0.84)
          .setDepth(cy + 20 + index);
      } else {
        const frame = type === 'sheep' ? 1 : type === 'pig' ? 5 : 9;
        sprite = this.scene.add.sprite(cx, cy, 'livestock', frame)
          .setOrigin(0.5, 0.84)
          .setDepth(cy + 20 + index)
          .play(`${type}-walk`);
      }
      const animal = { sprite, type, cx, cy, halfWidth, halfHeight };
      this.animals.push(animal);
      this.wanderAnimal(animal);
    }
  }

  createCowTexture() {
    if (this.scene.textures.exists('camp-cow')) return;
    const texture = this.scene.textures.createCanvas('camp-cow', 32, 32);
    const context = texture.getContext();
    context.imageSmoothingEnabled = false;
    context.fillStyle = '#e5dfcf';
    context.fillRect(8, 10, 16, 12);
    context.fillRect(5, 12, 6, 8);
    context.fillRect(21, 5, 7, 9);
    context.fillStyle = '#3b3632';
    context.fillRect(25, 8, 2, 2);
    context.fillRect(8, 22, 3, 5);
    context.fillRect(19, 22, 3, 5);
    context.fillRect(10, 12, 5, 4);
    texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    texture.refresh();
  }

  wanderAnimal(animal) {
    const { sprite, cx, cy, halfWidth, halfHeight } = animal;
    const x = cx + Phaser.Math.Between(-halfWidth + 16, halfWidth - 16);
    const y = cy + Phaser.Math.Between(-halfHeight + 10, halfHeight - 10);
    sprite.setFlipX(x < sprite.x);
    this.scene.tweens.add({
      targets: sprite,
      x,
      y,
      duration: Phaser.Math.Between(1800, 3600),
      ease: 'Linear',
      onUpdate: () => sprite.setDepth(sprite.y + 20),
      onComplete: () => this.scene.time.delayedCall(
        Phaser.Math.Between(250, 900),
        () => this.wanderAnimal(animal)
      )
    });
  }

  getLightSources() {
    return [
      { object: this.fire, x: this.fire.x, y: this.fire.y, radius: 170 },
      ...this.lampVisuals.map((lamp) => ({ object: lamp, x: lamp.x, y: lamp.y, radius: 105 }))
    ];
  }

  setLightLevel(level) {
    this.lightLevel = level;
    const glowAlpha = level >= 0.4 ? 0.42 : level >= 0.3 ? 0.34 : level >= 0.15 ? 0.2 : 0.07;
    this.lightGlows.forEach((glow, index) => glow.setAlpha(index === 0 ? glowAlpha + 0.04 : glowAlpha));
  }

  setNight(isNight) {
    this.setLightLevel(isNight ? 0.36 : 0);
  }

  isNear(x, y) {
    return Phaser.Math.Distance.Between(x, y, this.x, this.y) < this.interactionRadius;
  }

  get storageCapacity() {
    return BUILDING_STORAGE_CAPACITY[this.levels.house] ?? BUILDING_STORAGE_CAPACITY[1];
  }

  get storageUsed() {
    return Object.values(this.storage).reduce((sum, amount) => sum + amount, 0);
  }

  hasTool(tool) {
    return this.equipment.hasTool(tool);
  }

  get pickaxeTier() {
    return this.equipment.pickaxeTier;
  }

  craft(recipeId, inventory) {
    const result = this.equipment.craft(recipeId, inventory);
    if (!result.ok) return result;
    this.scene.player?.recalculateEquipment?.(this.equipment);
    this.scene.effects?.spawnHit(this.buildings.forge.sprite.x, this.buildings.forge.sprite.y - 14, 0xffd77a, 12);
    return result;
  }

  upgrade(key, inventory) {
    const definition = BUILDINGS[key];
    if (!definition) return { ok: false, message: 'Construção desconhecida.' };
    const nextLevel = this.levels[key] + 1;
    if (nextLevel > 3) return { ok: false, message: 'Nível máximo atingido.' };
    const cost = definition.costs[nextLevel - 2];
    if (!inventory.has(cost)) return { ok: false, message: 'Recursos insuficientes.' };
    inventory.remove(cost);
    this.levels[key] = nextLevel;
    if (key === 'forge') this.equipment.forgeLevel = nextLevel;
    this.buildings[key].label.setText(`${definition.icon} ${nextLevel}`);
    this.buildings[key].sprite.setTint(nextLevel > 1 ? 0xffe0a3 : 0xffffff);
    this.scene.effects?.spawnHit(
      this.buildings[key].sprite.x,
      this.buildings[key].sprite.y - 12,
      0xffd77a,
      10
    );
    return { ok: true, message: `${definition.name} melhorada para o nível ${nextLevel}!` };
  }

  storageCanAccept(bundle = {}) {
    const amount = Object.entries(bundle).reduce((sum, [type, quantity]) => {
      if (!(type in this.storage)) return sum;
      return sum + Math.max(0, Math.floor(Number(quantity) || 0));
    }, 0);
    return this.storageUsed + amount <= this.storageCapacity;
  }

  store(bundle = {}) {
    const stored = {};
    const remaining = {};
    let available = Math.max(0, this.storageCapacity - this.storageUsed);
    for (const [type, rawAmount] of Object.entries(bundle)) {
      if (!(type in this.storage)) continue;
      const quantity = Math.max(0, Math.floor(Number(rawAmount) || 0));
      const accepted = Math.min(quantity, available);
      if (accepted > 0) {
        this.storage[type] += accepted;
        stored[type] = accepted;
        available -= accepted;
      }
      if (accepted < quantity) remaining[type] = quantity - accepted;
    }
    return { stored, remaining };
  }

  storeAll(inventory) {
    const stored = {};
    const remaining = {};
    let available = Math.max(0, this.storageCapacity - this.storageUsed);
    let storedTotal = 0;
    for (const [type, rawAmount] of Object.entries(inventory.items)) {
      const quantity = Math.max(0, Math.floor(Number(rawAmount) || 0));
      if (quantity <= 0 || !(type in this.storage)) continue;
      const accepted = Math.min(quantity, available);
      if (accepted > 0) {
        inventory.remove({ [type]: accepted });
        this.storage[type] += accepted;
        stored[type] = accepted;
        storedTotal += accepted;
        available -= accepted;
      }
      if (accepted < quantity) remaining[type] = quantity - accepted;
    }
    return {
      stored,
      remaining,
      storedTotal,
      complete: Object.keys(remaining).length === 0
    };
  }

  deposit(type, amount, inventory) {
    const quantity = Math.max(1, Math.floor(Number(amount) || 1));
    if (!inventory.has({ [type]: quantity })) return { ok: false, message: 'Item ausente na mochila.' };
    if (this.storageUsed + quantity > this.storageCapacity) return { ok: false, message: 'Armazém sem espaço.' };
    inventory.remove({ [type]: quantity });
    this.storage[type] += quantity;
    return { ok: true, message: `Guardado: ${quantity} ${RESOURCE_TYPES[type]?.label.toLowerCase() ?? type}.` };
  }

  withdraw(type, amount, inventory) {
    const quantity = Math.max(1, Math.floor(Number(amount) || 1));
    if ((this.storage[type] ?? 0) < quantity) return { ok: false, message: 'Item ausente no armazém.' };
    if (!inventory.canAdd(type, quantity)) return { ok: false, message: INVENTORY_CONFIG.fullMessage };
    this.storage[type] -= quantity;
    if (!inventory.add(type, quantity)) {
      this.storage[type] += quantity;
      return { ok: false, message: INVENTORY_CONFIG.fullMessage };
    }
    return { ok: true, message: `Retirado: ${quantity} ${RESOURCE_TYPES[type]?.label.toLowerCase() ?? type}.` };
  }

  serialize() {
    return {
      buildingLevelsVersion: 2,
      levels: { ...this.levels },
      questKills: this.questKills,
      questClaimed: this.questClaimed,
      crafted: this.equipment.serialize(),
      unlockedRecipes: this.equipment.serializeUnlocks(),
      storage: { ...this.storage }
    };
  }
}
