import Phaser from 'phaser';
import { PixelCanvas } from '../art/pixel.js';
import { BUILDING_FOOTPRINTS } from './Obstacles.js';
import { buildingVisual } from '../data/buildingVisuals.js';
import {
  BUILDING_DEFS,
  BUILDING_HIT_DURABILITY_LOSS,
  BUILDING_ORDER,
  BUILDING_REPAIR_COST,
  MAX_BUILDING_LEVEL,
  MAX_DURABILITY,
  buildingStat,
  canAfford,
  clampLevel,
  hasUnlock,
  isCampComplete,
  payCost,
  upgradeCost
} from '../data/buildings.js';
import { INVENTORY_CONFIG, RESOURCE_TYPES, WORLD } from './config.js';
import { EquipmentSystem } from './EquipmentSystem.js';
import { CampDefense } from './CampDefense.js';
import { freeUnitsFor, slotsUsed, storeBundle, canStoreBundle } from './storageSlots.js';
import { quantizePixels } from '../art/palette.js';

export const BUILDINGS = BUILDING_DEFS;

// Prédios com sprite do atlas; Fogueira, Muralha e Torre têm visual próprio.
const ATLAS_FRAMES = { forge: 'forge', farm: 'farm', house: 'house', market: 'store' };
const DAMAGED_TINT = 0xff9c8a;
const DESTROYED_TINT = 0x6b5751;

function migrateLegacyLevel(value) {
  const legacy = Math.max(0, Math.min(2, Number(value) || 0));
  return Math.min(3, legacy + 1);
}

export class Camp {
  constructor(scene, saved = {}) {
    this.scene = scene;
    const savedLevels = saved.levels ?? {};
    const version = Number(saved.buildingLevelsVersion) || 0;
    this.legacyForgeLevel = version >= 2 ? 0 : Math.max(0, Math.min(2, Number(savedLevels.forge) || 0));
    this.legacyForgeBonus = { attack: this.legacyForgeLevel * 4, defense: this.legacyForgeLevel };
    // v0/v1: níveis 0–2; v2: 1–3; v3: 7 prédios de 0/1–10.
    const legacy = (value) => (version >= 2 ? Number(value) || 1 : migrateLegacyLevel(value));
    this.levels = {};
    for (const key of BUILDING_ORDER) {
      let raw = savedLevels[key];
      if (version < 3 && ['forge', 'farm', 'house', 'market'].includes(key)) {
        raw = key === 'market' && version < 2 ? 1 : legacy(key === 'house' ? savedLevels.house ?? savedLevels.store : raw);
      }
      this.levels[key] = clampLevel(key, raw ?? BUILDING_DEFS[key].startLevel);
    }
    this.durability = {};
    for (const key of BUILDING_ORDER) {
      const value = Number(saved.durability?.[key]);
      this.durability[key] = Number.isFinite(value) ? Math.max(0, Math.min(MAX_DURABILITY, value)) : MAX_DURABILITY;
    }
    this.x = WORLD.camp.x;
    this.y = WORLD.camp.y;
    this.interactionRadius = 165;
    this.questKills = saved.questKills ?? 0;
    this.questClaimed = saved.questClaimed ?? false;
    this.dungeonRevealed = Boolean(saved.dungeonRevealed);
    this.lastAutoReviveDay = Number(saved.lastAutoReviveDay) || 0;
    this.lastLocalReviveNight = Number(saved.lastLocalReviveNight) || 0;
    this.dailyBuffDay = Number(saved.dailyBuffDay) || 0;
    this.equipment = new EquipmentSystem({
      saved: saved.crafted ?? {},
      unlockedRecipes: saved.unlockedRecipes ?? [],
      forgeLevel: this.levels.forge
    });
    this.storage = Object.fromEntries(Object.keys(RESOURCE_TYPES).map((type) => [type, 0]));
    this.secretChest = Object.fromEntries(Object.keys(RESOURCE_TYPES).map((type) => [type, 0]));
    for (const [target, source] of [[this.storage, saved.storage], [this.secretChest, saved.secretChest]]) {
      for (const [type, amount] of Object.entries(source ?? {})) {
        if (type in target && Number.isFinite(Number(amount))) target[type] = Math.max(0, Math.floor(Number(amount)));
      }
    }
    this.savedWallHp = Number(saved.wallHp);
    this.buildings = {};
    this.lightGlows = [];
    // Estágio visual atual de cada prédio (1, 4 ou 8), para trocar a arte só quando muda.
    this.visualStages = {};
    this.lampVisuals = [];
    if (scene) this.create();
  }

  // ---------- Visual ----------

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
      .setInteractive({ useHandCursor: true })
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
    this.buildings.campfire = { sprite: this.fire, label: this.makeLabel('campfire', this.fire.x, this.fire.y - 30), sprites: [this.fire] };
    this.fire.on('pointerdown', (pointer, localX, localY, event) => {
      event?.stopPropagation?.();
      this.scene.openBuilding?.('campfire');
    });

    for (const key of Object.keys(ATLAS_FRAMES)) this.buildings[key] = this.drawBuilding(key);

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
      scene.obstacles?.add(x, y - 2, 8, 6);
      this.lampVisuals.push(lamp);
    }

    this.createAnimalPen();
    this.defense = new CampDefense(scene, this, { wallHp: this.savedWallHp });
    this.buildings.wall = this.defense.wallBuilding;
    this.buildings.tower = this.defense.towerBuilding;

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
    scene.add.text(this.x, this.y + 151, 'ACAMPAMENTO  •  C', {
      fontFamily: 'Press Start 2P', fontSize: '8px', color: '#f8e7ba',
      backgroundColor: '#1d2b24d9', padding: { x: 8, y: 5 }
    }).setOrigin(0.5).setDepth(1000).setScale(0.5);
    this.refreshVisuals();
  }

  makeLabel(key, x, y) {
    return this.scene.add.text(x, y, '', {
      fontFamily: 'Press Start 2P', fontSize: '8px', color: '#f8edcc',
      backgroundColor: '#1d2b24d9', padding: { x: 5, y: 4 }
    }).setOrigin(0.5).setDepth(y + 80).setScale(0.5);
  }

  drawBuilding(key) {
    const definition = BUILDING_DEFS[key];
    const x = this.x + definition.position.x;
    const y = this.y + definition.position.y;
    const sprite = this.scene.add.image(x, y, 'buildings', buildingVisual(key, this.levels[key])?.frame ?? ATLAS_FRAMES[key])
      .setOrigin(0.5, 0.84)
      .setDepth(y + 10)
      .setInteractive({ useHandCursor: true });
    sprite.on('pointerdown', (pointer, localX, localY, event) => {
      event?.stopPropagation?.();
      this.scene.openBuilding?.(key);
    });
    const glow = this.scene.add.image(x, y - 14, 'buildings', 'warm-glow')
      .setScale(key === 'forge' ? 2.6 : 2.2)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.05)
      .setDepth(4501 + y / 1000);
    if (key === 'forge') glow.setTint(0xff9a4a);
    this.lightGlows.push(glow);
    const base = BUILDING_FOOTPRINTS[key];
    if (base) this.scene.obstacles?.add(x + base.x, y + base.y, base.width, base.height);
    return { sprite, glow, label: this.makeLabel(key, x, y - 55), sprites: [sprite] };
  }

  labelText(key) {
    const level = this.levels[key];
    const definition = BUILDING_DEFS[key];
    if (level === 0) return `${definition.name.toUpperCase()}  •  CONSTRUIR`;
    const state = this.durability[key] === 0 ? ' X' : this.durability[key] < MAX_DURABILITY ? ' !' : '';
    return `${definition.name.toUpperCase()}  •  NV ${level}${state}`;
  }

  refreshVisuals() {
    if (!this.scene) return;
    for (const key of BUILDING_ORDER) {
      const building = this.buildings[key];
      if (!building) continue;
      building.label?.setText(this.labelText(key));
      this.applyVisual(key);
      const durability = this.durability[key];
      building.glow?.setVisible(durability > 0 && this.isBuilt(key));
      // O nível agora aparece na própria arte (evolução visual); o tom só indica dano.
      const tint = durability === 0 ? DESTROYED_TINT : durability < MAX_DURABILITY ? DAMAGED_TINT : null;
      for (const sprite of building.sprites ?? [building.sprite]) {
        if (!sprite?.setTint) continue;
        if (tint === null) sprite.clearTint();
        else sprite.setTint(tint);
      }
    }
    this.refreshAnimalPen();
  }

  /**
   * Troca a arte do prédio conforme o nível (1–3, 4–7, 8+). Mantém posição,
   * clique, colisão e luz; na evolução durante o jogo, mostra um brilho rápido.
   */
  applyVisual(key) {
    if (key === 'wall' || key === 'tower') return;
    const building = this.buildings[key];
    const sprite = building?.sprite;
    const visual = buildingVisual(key, this.levels[key]);
    if (!sprite || !visual) return;
    const previous = this.visualStages[key];
    if (previous === visual.stage) return;
    this.visualStages[key] = visual.stage;
    if (visual.animation) sprite.play(visual.animation);
    else sprite.setFrame(visual.frame);
    const height = sprite.frame.height;
    if (sprite.input?.hitArea) sprite.input.hitArea.setTo(0, 0, sprite.frame.width, height);
    building.label?.setY(sprite.y - height * 0.84 - (key === 'campfire' ? 6 : 2));
    if (key === 'forge' && this.smoke) {
      this.smoke.setVisible(Boolean(visual.smoke));
      if (visual.smoke) this.smoke.setPosition(sprite.x + visual.smoke.x, sprite.y + visual.smoke.y).setDepth(sprite.y + visual.smoke.y + 7);
    }
    if (previous !== undefined) this.celebrateEvolution(key, sprite, visual.stage);
  }

  celebrateEvolution(key, sprite, stage) {
    const scene = this.scene;
    if (!scene?.add) return;
    const burst = scene.add.particles(sprite.x, sprite.y - sprite.frame.height * 0.45, 'vfx', {
      frame: ['spark-0', 'spark-1'],
      speed: { min: 30, max: 90 },
      lifespan: 650,
      scale: { start: 1, end: 0 },
      alpha: { start: 1, end: 0 },
      blendMode: Phaser.BlendModes.ADD,
      emitting: false
    }).setDepth(sprite.y + 60);
    scene.hudCamera?.ignore(burst);
    burst.explode(18);
    scene.time.delayedCall(900, () => burst.destroy());
    sprite.setScale(1, 0.9);
    scene.tweens.add({ targets: sprite, scaleY: 1, duration: 260, ease: 'Back.out' });
    const name = BUILDING_DEFS[key]?.name ?? key;
    scene.ui?.showMessage?.(`${name} evoluiu! Nova aparência (estágio ${stage === 8 ? 'avançado' : 'melhorado'}).`);
  }

  createAnimalPen() {
    const cx = this.x + 130;
    const cy = this.y + 102;
    const halfWidth = 84;
    const halfHeight = 42;
    this.pen = { cx, cy, halfWidth, halfHeight, fences: [] };
    for (let x = cx - halfWidth; x < cx + halfWidth; x += 28) {
      this.pen.fences.push(this.scene.add.image(x, cy - halfHeight, 'buildings', 'fence').setDepth(cy - halfHeight));
      this.pen.fences.push(this.scene.add.image(x, cy + halfHeight, 'buildings', 'fence').setDepth(cy + halfHeight + 5));
    }
    for (let y = cy - halfHeight + 14; y < cy + halfHeight; y += 24) {
      this.pen.fences.push(this.scene.add.image(cx - halfWidth, y, 'buildings', 'fence').setAngle(90).setDepth(y + 2));
      this.pen.fences.push(this.scene.add.image(cx + halfWidth, y, 'buildings', 'fence').setAngle(90).setDepth(y + 2));
    }
    this.createCowTexture();
    this.animals = [];
  }

  /** Cercado e animais acompanham o nível da Fazenda (nível 1: sem cercado). */
  refreshAnimalPen() {
    if (!this.pen) return;
    const level = this.levels.farm;
    const unlocked = BUILDING_DEFS.farm.animals;
    const wanted = [];
    if (level >= unlocked.egg) wanted.push('chicken', 'chicken');
    if (level >= unlocked.wool) wanted.push('sheep');
    if (level >= unlocked.milk) wanted.push('cow');
    if (level >= unlocked.pork) wanted.push('pig');
    for (const fence of this.pen.fences) fence.setVisible(level >= unlocked.egg);
    const current = this.animals.map((animal) => animal.type).join(',');
    if (current === wanted.join(',')) return;
    for (const animal of this.animals) {
      this.scene.tweens.killTweensOf(animal.sprite);
      animal.sprite.destroy();
    }
    this.animals = [];
    const { cx, cy, halfWidth, halfHeight } = this.pen;
    for (const [index, type] of wanted.entries()) {
      let sprite;
      if (type === 'cow') {
        sprite = this.scene.add.sprite(cx, cy, 'camp-cow').setOrigin(0.5, 0.84).setDepth(cy + 20 + index);
      } else {
        const frame = type === 'sheep' ? 1 : type === 'pig' ? 5 : 9;
        sprite = this.scene.add.sprite(cx, cy, 'livestock', frame)
          .setOrigin(0.5, 0.84)
          .setDepth(cy + 20 + index)
          .play(`${type}-walk`);
      }
      this.scene.hudCamera?.ignore(sprite);
      const animal = { sprite, type, cx, cy, halfWidth, halfHeight };
      this.animals.push(animal);
      this.wanderAnimal(animal);
    }
  }

  createCowTexture() {
    if (this.scene.textures.exists('camp-cow')) return;
    const texture = this.scene.textures.createCanvas('camp-cow', 32, 32);
    // Vaca malhada de perfil, virada para a direita.
    const cow = new PixelCanvas(32, 32);
    cow.shadow(15, 28, 12, 2.2, 105);
    for (const [x, back] of [[8, true], [11, false], [19, true], [22, false]]) {
      cow.rect(x, 21, 3, 6, back ? '#b9b1a0' : '#e5dfcf');
      cow.rect(x, 26, 3, 1, '#3b3632');
    }
    cow.shadedEllipse(15, 17, 11, 6.5, ['#b9b1a0', '#e5dfcf', '#f5f1e6', '#ffffff']);
    for (const [x, y, rx, ry] of [[10, 15, 3.5, 2.5], [19, 19, 3, 2], [16, 13, 2, 1.5]]) cow.ellipse(x, y, rx, ry, '#3b3632');
    cow.shadedEllipse(26, 12, 4.5, 4.5, ['#b9b1a0', '#e5dfcf', '#f5f1e6', '#ffffff']);
    cow.rect(27, 14, 4, 3, '#e9a7a0');
    cow.pixel(30, 15, '#7a3b3c');
    cow.pixel(27, 11, '#1a1414');
    cow.rect(22, 8, 2, 2, '#3b3632');
    cow.rect(24, 6, 1, 2, '#efe4c6');
    cow.rect(28, 6, 1, 2, '#efe4c6');
    cow.rect(18, 22, 3, 2, '#e9a7a0');
    cow.line(4, 15, 2, 21, '#b9b1a0');
    cow.pixel(2, 22, '#3b3632');
    cow.outline();
    texture.getContext().putImageData(new ImageData(quantizePixels(cow).data, 32, 32), 0, 0);
    texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    texture.refresh();
  }

  wanderAnimal(animal) {
    const { sprite, cx, cy, halfWidth, halfHeight } = animal;
    if (!sprite.active) return;
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

  /** Luzes que abrem a escuridão à noite: fogueira, postes, prédios, torres e portão. */
  getLightSources() {
    const buildings = Object.keys(ATLAS_FRAMES)
      .filter((key) => this.buildings[key]?.glow && this.isBuilt(key) && this.durability[key] > 0)
      .map((key) => {
        const glow = this.buildings[key].glow;
        return { object: glow, x: glow.x, y: glow.y, radius: key === 'forge' ? 125 : 100 };
      });
    return [
      { object: this.fire, x: this.fire.x, y: this.fire.y, radius: 170 },
      ...this.lampVisuals.map((lamp) => ({ object: lamp, x: lamp.x, y: lamp.y, radius: 105 })),
      ...buildings,
      ...(this.defense?.lightSources?.() ?? [])
    ];
  }

  setLightLevel(level) {
    this.lightLevel = level;
    const glowAlpha = level >= 0.4 ? 0.42 : level >= 0.3 ? 0.34 : level >= 0.15 ? 0.2 : 0.07;
    this.lightGlows.forEach((glow, index) => glow.setAlpha(index === 0 ? glowAlpha + 0.04 : glowAlpha));
    this.defense?.setLightLevel?.(glowAlpha);
  }

  setNight(isNight) {
    this.setLightLevel(isNight ? 0.36 : 0);
  }

  isNear(x, y) {
    return Phaser.Math.Distance.Between(x, y, this.x, this.y) < this.interactionRadius;
  }

  // ---------- Estado dos prédios ----------

  isBuilt(key) {
    return this.levels[key] >= 1;
  }

  /** 1 intacto, 0.5 danificado, 0 destruído ou não construído. */
  efficiency(key) {
    if (!this.isBuilt(key)) return 0;
    const durability = this.durability[key];
    if (durability <= 0) return 0;
    return durability < MAX_DURABILITY ? 0.5 : 1;
  }

  stat(key, stat) {
    return buildingStat(key, stat, this.levels[key]);
  }

  unlocked(key, unlock) {
    return hasUnlock(key, unlock, this.levels[key]) && this.efficiency(key) > 0;
  }

  get protectRadius() {
    return this.efficiency('campfire') > 0 ? this.stat('campfire', 'protectRadius') : 0;
  }

  get campfireRegen() {
    return (this.stat('campfire', 'regenPerSecond') ?? 0) * this.efficiency('campfire');
  }

  get fireResistance() {
    return this.efficiency('campfire') > 0 ? this.stat('campfire', 'fireResistance') ?? 0 : 0;
  }

  get dragonShield() {
    return this.efficiency('campfire') > 0 ? this.stat('campfire', 'dragonShield') ?? 0 : 0;
  }

  get isComplete() {
    return isCampComplete(this.levels);
  }

  paymentSources() {
    return { inventory: this.scene?.inventory, storage: this.storage, economy: this.scene?.economy };
  }

  canPay(cost) {
    return canAfford(cost, this.paymentSources());
  }

  pay(cost) {
    return payCost(cost, this.paymentSources());
  }

  upgradeCostFor(key) {
    return upgradeCost(key, this.levels[key] + 1);
  }

  upgrade(key) {
    const definition = BUILDING_DEFS[key];
    if (!definition) return { ok: false, message: 'Construção desconhecida.' };
    const nextLevel = this.levels[key] + 1;
    if (nextLevel > MAX_BUILDING_LEVEL) return { ok: false, message: 'Nível máximo atingido.' };
    if (this.isBuilt(key) && this.durability[key] < MAX_DURABILITY) {
      return { ok: false, message: `Repare ${definition.name.toLowerCase()} antes de melhorar.` };
    }
    const cost = upgradeCost(key, nextLevel);
    if (!cost || !this.pay(cost)) return { ok: false, message: 'Recursos insuficientes.' };
    const wasComplete = this.isComplete;
    this.levels[key] = nextLevel;
    this.durability[key] = MAX_DURABILITY;
    if (key === 'forge') this.equipment.forgeLevel = nextLevel;
    if (key === 'wall' || key === 'tower') this.defense?.onLevelChanged(key);
    if (key === 'wall') this.defense?.setupEnemyCollision(this.scene?.enemies);
    this.refreshVisuals();
    const sprite = this.buildings[key]?.sprite;
    if (sprite) this.scene?.effects?.spawnHit(sprite.x, sprite.y - 12, 0xffd77a, 10);
    const verb = nextLevel === 1 ? 'construída' : 'melhorada para o nível';
    const message = nextLevel === 1 ? `${definition.name} ${verb}!` : `${definition.name} ${verb} ${nextLevel}!`;
    return { ok: true, message, completed: !wasComplete && this.isComplete };
  }

  repairCostFor(key) {
    if (!this.isBuilt(key) || this.durability[key] >= MAX_DURABILITY) return null;
    return { ...BUILDING_REPAIR_COST };
  }

  repair(key) {
    const cost = this.repairCostFor(key);
    if (!cost) return { ok: false, message: 'Este prédio não precisa de reparo.' };
    if (!this.pay(cost)) return { ok: false, message: 'Reparo custa 5 madeiras.' };
    this.durability[key] = MAX_DURABILITY;
    this.refreshVisuals();
    return { ok: true, message: `${BUILDING_DEFS[key].name} reparado.` };
  }

  /** Golpe de um invasor: tira 10% da durabilidade. Devolve true se o prédio foi destruído agora. */
  damageBuilding(key, amount = BUILDING_HIT_DURABILITY_LOSS) {
    if (!this.isBuilt(key) || this.durability[key] <= 0) return false;
    this.durability[key] = Math.max(0, this.durability[key] - amount);
    this.refreshVisuals();
    return this.durability[key] === 0;
  }

  /** Alvos atacáveis por invasores (a Muralha tem HP próprio). */
  attackableBuildings() {
    const targets = [];
    for (const key of BUILDING_ORDER) {
      if (key === 'wall' || !this.isBuilt(key) || this.durability[key] <= 0) continue;
      for (const sprite of this.buildings[key]?.sprites ?? []) {
        if (sprite.visible) targets.push({ key, x: sprite.x, y: sprite.y });
      }
    }
    return targets;
  }

  get allBuildingsDestroyed() {
    return BUILDING_ORDER
      .filter((key) => key !== 'wall' && this.isBuilt(key))
      .every((key) => this.durability[key] <= 0);
  }

  // ---------- Ferreiro ----------

  hasTool(tool) {
    return this.equipment.hasTool(tool);
  }

  get pickaxeTier() {
    return this.equipment.pickaxeTier;
  }

  forgeAvailable() {
    return this.efficiency('forge') > 0;
  }

  craft(recipeId) {
    if (!this.forgeAvailable()) return { ok: false, message: 'O ferreiro está destruído. Repare-o primeiro.' };
    const result = this.equipment.craft(recipeId, (cost) => this.pay(cost));
    if (!result.ok) return result;
    this.scene?.player?.recalculateEquipment?.(this.equipment);
    const forge = this.buildings.forge?.sprite;
    if (forge) this.scene?.effects?.spawnHit(forge.x, forge.y - 14, 0xffd77a, 12);
    return result;
  }

  // ---------- Armazém da Casa (slots) ----------

  get storageStackSize() {
    return BUILDING_DEFS.house.storageStackSize;
  }

  get storageSlots() {
    return this.stat('house', 'storageSlots');
  }

  /** Total de unidades guardadas (mantido para a interface antiga). */
  get storageUsed() {
    return Object.values(this.storage).reduce((sum, amount) => sum + amount, 0);
  }

  get storageSlotsUsed() {
    return slotsUsed(this.storage, this.storageStackSize);
  }

  get storageCapacity() {
    const slots = this.storageSlots;
    return slots === null ? Infinity : slots * this.storageStackSize;
  }

  get storageLabel() {
    const slots = this.storageSlots;
    return slots === null ? `${this.storageSlotsUsed} slots (ilimitado)` : `${this.storageSlotsUsed}/${slots} slots`;
  }

  storageAccessible() {
    return this.efficiency('house') > 0;
  }

  storageCanAccept(bundle = {}) {
    return canStoreBundle(this.storage, bundle, this.storageSlots, this.storageStackSize);
  }

  store(bundle = {}) {
    return storeBundle(this.storage, bundle, this.storageSlots, this.storageStackSize);
  }

  storeAll(inventory) {
    const bundle = Object.fromEntries(Object.entries(inventory.items).filter(([, amount]) => amount > 0));
    const { stored, remaining } = this.store(bundle);
    inventory.remove(stored);
    const storedTotal = Object.values(stored).reduce((sum, amount) => sum + amount, 0);
    return { stored, remaining, storedTotal, complete: Object.keys(remaining).length === 0 };
  }

  deposit(type, amount, inventory) {
    const quantity = Math.max(1, Math.floor(Number(amount) || 1));
    if (!inventory.has({ [type]: quantity })) return { ok: false, message: 'Item ausente na mochila.' };
    if (freeUnitsFor(this.storage, type, this.storageSlots, this.storageStackSize) < quantity) {
      return { ok: false, message: 'Armazém sem espaço.' };
    }
    inventory.remove({ [type]: quantity });
    this.storage[type] += quantity;
    return { ok: true, message: `Guardado: ${quantity} ${RESOURCE_TYPES[type]?.label.toLowerCase() ?? type}.` };
  }

  withdraw(type, amount, inventory) {
    const quantity = Math.max(1, Math.floor(Number(amount) || 1));
    if ((this.storage[type] ?? 0) < quantity) return { ok: false, message: 'Item ausente no armazém.' };
    if (!inventory.canAdd(type, quantity)) return { ok: false, message: INVENTORY_CONFIG.fullMessage };
    this.storage[type] -= quantity;
    inventory.add(type, quantity);
    return { ok: true, message: `Retirado: ${quantity} ${RESOURCE_TYPES[type]?.label.toLowerCase() ?? type}.` };
  }

  // ---------- Baú secreto (Casa nível 4) ----------

  get secretChestSlots() {
    return this.efficiency('house') > 0 ? this.stat('house', 'secretChestSlots') ?? 0 : 0;
  }

  get secretChestSlotsUsed() {
    return slotsUsed(this.secretChest, this.storageStackSize);
  }

  depositSecret(type, amount, inventory) {
    const quantity = Math.max(1, Math.floor(Number(amount) || 1));
    if (this.secretChestSlots <= 0) return { ok: false, message: 'O baú secreto exige Casa nível 4.' };
    if (!inventory.has({ [type]: quantity })) return { ok: false, message: 'Item ausente na mochila.' };
    if (freeUnitsFor(this.secretChest, type, this.secretChestSlots, this.storageStackSize) < quantity) {
      return { ok: false, message: 'Baú secreto cheio (5 slots).' };
    }
    inventory.remove({ [type]: quantity });
    this.secretChest[type] += quantity;
    return { ok: true, message: `Guardado no baú secreto: ${quantity} ${RESOURCE_TYPES[type]?.label.toLowerCase() ?? type}.` };
  }

  withdrawSecret(type, amount, inventory) {
    const quantity = Math.max(1, Math.floor(Number(amount) || 1));
    if ((this.secretChest[type] ?? 0) < quantity) return { ok: false, message: 'Item ausente no baú secreto.' };
    if (!inventory.canAdd(type, quantity)) return { ok: false, message: INVENTORY_CONFIG.fullMessage };
    this.secretChest[type] -= quantity;
    inventory.add(type, quantity);
    return { ok: true, message: `Retirado do baú secreto: ${quantity} ${RESOURCE_TYPES[type]?.label.toLowerCase() ?? type}.` };
  }

  serialize() {
    return {
      buildingLevelsVersion: 3,
      levels: { ...this.levels },
      durability: { ...this.durability },
      wallHp: this.defense ? Math.round(this.defense.wallHp) : this.savedWallHp,
      questKills: this.questKills,
      questClaimed: this.questClaimed,
      dungeonRevealed: this.dungeonRevealed,
      lastAutoReviveDay: this.lastAutoReviveDay,
      lastLocalReviveNight: this.lastLocalReviveNight,
      dailyBuffDay: this.dailyBuffDay,
      crafted: this.equipment.serialize(),
      unlockedRecipes: this.equipment.serializeUnlocks(),
      storage: { ...this.storage },
      secretChest: { ...this.secretChest }
    };
  }
}
