import { ANIMAL_PRODUCTS, AUTO_ANIMAL_PRODUCTS, FARM_CROPS } from '../data/buildingSystems.js';
import { BUILDING_DEFS, buildingStat, clampLevel, hasUnlock } from '../data/buildings.js';

const FARM = BUILDING_DEFS.farm;

function rollAmount([minimum, maximum], random) {
  return minimum + Math.floor(random() * (maximum - minimum + 1));
}

/**
 * Fazenda de 10 níveis. Os tempos usam relógio real (Date.now) para que as plantações
 * continuem crescendo com o jogo fechado; chuva e dano ajustam o readyAt a cada quadro.
 */
export class FarmSystem {
  constructor({ saved = {}, level = 1, now = Date.now(), random = Math.random } = {}) {
    this.level = clampLevel('farm', level);
    this.now = now;
    this.random = random;
    this.plots = [];
    this.animals = {};
    this.barn = Math.max(0, Math.floor(Number(saved?.barn) || 0));
    this.passiveRemainderMs = Math.max(0, Number(saved?.passiveRemainderMs) || 0);
    this.restore(saved, now);
    this.ensureCapacity(now);
  }

  restore(saved, now) {
    const plots = Array.isArray(saved?.plots) ? saved.plots : [];
    const uniquePlots = new Map();
    for (const plot of plots) {
      if (!plot || !Number.isFinite(Number(plot.id))) continue;
      const id = Number(plot.id);
      if (uniquePlots.has(id)) continue;
      const crop = FARM_CROPS[plot.crop] ? plot.crop : null;
      uniquePlots.set(id, {
        id,
        crop,
        plantedAt: crop && Number.isFinite(Number(plot.plantedAt)) ? Number(plot.plantedAt) : null,
        readyAt: crop && Number.isFinite(Number(plot.readyAt)) ? Number(plot.readyAt) : null
      });
    }
    this.plots = [...uniquePlots.values()];
    this.animals = {};
    for (const [type, definition] of Object.entries(ANIMAL_PRODUCTS)) {
      const savedAnimal = saved?.animals?.[type];
      const readyAt = Number.isFinite(Number(savedAnimal?.readyAt))
        ? Number(savedAnimal.readyAt)
        : now + definition.seconds * 1000;
      this.animals[type] = { readyAt };
    }
  }

  ensureCapacity() {
    const count = this.plotCount;
    for (let id = 0; id < count; id += 1) {
      if (!this.plots.some((plot) => plot.id === id)) {
        this.plots.push({ id, crop: null, plantedAt: null, readyAt: null });
      }
    }
    this.plots = this.plots
      .filter((plot) => plot.id < count)
      .sort((left, right) => left.id - right.id);
  }

  setLevel(level, now = Date.now()) {
    const previous = this.level;
    this.level = clampLevel('farm', level);
    // Um animal recém-chegado começa a produzir a partir do upgrade.
    for (const [type, unlockLevel] of Object.entries(FARM.animals)) {
      if (previous < unlockLevel && this.level >= unlockLevel) {
        this.animals[type].readyAt = now + ANIMAL_PRODUCTS[type].seconds * 1000;
      }
    }
    this.ensureCapacity();
  }

  get plotCount() {
    return buildingStat('farm', 'plots', this.level) ?? 2;
  }

  get growthMultiplier() {
    return buildingStat('farm', 'growthMultiplier', this.level) ?? 1;
  }

  get productionMultiplier() {
    return buildingStat('farm', 'productionMultiplier', this.level) ?? 1;
  }

  get barnCapacity() {
    return buildingStat('farm', 'barnCapacity', this.level) ?? 0;
  }

  get rainGrowthBonus() {
    return buildingStat('farm', 'rainGrowthBonus', this.level) ?? 0;
  }

  get passiveFoodPerMinute() {
    return buildingStat('farm', 'passiveFoodPerMinute', this.level) ?? 0;
  }

  hasAnimal(type) {
    return this.level >= (FARM.animals[type] ?? Infinity);
  }

  get unlockedAnimals() {
    return Object.keys(ANIMAL_PRODUCTS).filter((type) => this.hasAnimal(type));
  }

  canPlantCrop(crop) {
    const definition = FARM_CROPS[crop];
    if (!definition) return false;
    return !definition.rare || hasUnlock('farm', 'rareSeeds', this.level);
  }

  get availableCrops() {
    return Object.keys(FARM_CROPS).filter((crop) => this.canPlantCrop(crop));
  }

  cropSeconds(crop) {
    return Math.round(FARM_CROPS[crop].seconds * this.growthMultiplier);
  }

  plant(plotId, crop, now = Date.now()) {
    const plot = this.plots.find((entry) => entry.id === Number(plotId));
    if (!this.canPlantCrop(crop) || !plot || plot.crop) return { ok: false, reason: 'invalid' };
    plot.crop = crop;
    plot.plantedAt = now;
    plot.readyAt = now + this.cropSeconds(crop) * 1000;
    return { ok: true, crop, readyAt: plot.readyAt };
  }

  rollCropYield(crop) {
    const result = {};
    for (const [type, range] of Object.entries(FARM_CROPS[crop].yield)) {
      result[type] = rollAmount(range, this.random) * this.productionMultiplier;
    }
    return result;
  }

  /** Colhe um canteiro pronto; `canAccept(bundle)` decide se há espaço para o resultado. */
  harvestPlot(plotId, now = Date.now(), canAccept = () => true) {
    const plot = this.plots.find((entry) => entry.id === Number(plotId));
    if (!plot?.crop || plot.readyAt === null || now < plot.readyAt) {
      return { ok: false, reason: 'not-ready' };
    }
    const bundle = this.rollCropYield(plot.crop);
    if (!canAccept(bundle)) return { ok: false, reason: 'inventory' };
    const crop = plot.crop;
    plot.crop = null;
    plot.plantedAt = null;
    plot.readyAt = null;
    return { ok: true, crop, bundle };
  }

  animalBundle(type) {
    const definition = ANIMAL_PRODUCTS[type];
    return { [definition.type]: definition.amount * this.productionMultiplier };
  }

  collectAnimal(type, now = Date.now(), canAccept = () => true) {
    const definition = ANIMAL_PRODUCTS[type];
    const animal = this.animals[type];
    if (!definition || !animal || !this.hasAnimal(type) || now < animal.readyAt) {
      return { ok: false, reason: 'not-ready' };
    }
    const bundle = this.animalBundle(type);
    if (!canAccept(bundle)) return { ok: false, reason: 'inventory' };
    animal.readyAt = now + definition.seconds * 1000;
    return { ok: true, type, bundle };
  }

  /** Coloca comida no celeiro e devolve o que não coube. */
  depositBarn(amount) {
    const room = Math.max(0, this.barnCapacity - this.barn);
    const accepted = Math.min(room, Math.max(0, Math.floor(amount)));
    this.barn += accepted;
    return amount - accepted;
  }

  withdrawBarn(amount) {
    const taken = Math.min(this.barn, Math.max(0, Math.floor(amount)));
    this.barn -= taken;
    return taken;
  }

  /**
   * Avança a fazenda um quadro.
   * ctx.efficiency: 1 normal, 0.5 danificada, 0 destruída.
   * ctx.raining: chuva ativa (irrigação no nível 6+).
   * ctx.store(bundle): guarda no armazém e devolve { stored, remaining }.
   * Retorna o que foi produzido sozinho ({ barn, storage }) ou null.
   */
  update(now = Date.now(), deltaMs = 0, ctx = {}) {
    const efficiency = ctx.efficiency ?? 1;
    const rate = efficiency * (ctx.raining ? 1 + this.rainGrowthBonus : 1);
    const shift = deltaMs * (rate - 1);
    if (shift !== 0) {
      for (const plot of this.plots) {
        if (plot.crop && plot.readyAt !== null && now < plot.readyAt) plot.readyAt -= shift;
      }
      for (const type of this.unlockedAnimals) {
        if (now < this.animals[type].readyAt) this.animals[type].readyAt -= shift;
      }
    }
    if (efficiency <= 0) return null;

    const produced = { barn: 0, storage: {} };
    const store = ctx.store ?? (() => ({ stored: {}, remaining: {} }));
    const addStored = (bundle) => {
      for (const [type, amount] of Object.entries(bundle)) {
        produced.storage[type] = (produced.storage[type] ?? 0) + amount;
      }
    };
    // Comida vai primeiro para o celeiro; o resto, para o armazém.
    const deliver = (bundle) => {
      const routed = { ...bundle };
      if (routed.food && this.barnCapacity > 0) {
        const before = routed.food;
        routed.food = this.depositBarn(routed.food);
        produced.barn += before - routed.food;
        if (routed.food === 0) delete routed.food;
      }
      if (Object.keys(routed).length === 0) return true;
      const result = store(routed);
      addStored(result.stored);
      return Object.keys(result.remaining).length === 0;
    };
    const fits = (bundle) => {
      const foodRoom = this.barnCapacity - this.barn;
      const rest = { ...bundle };
      if (rest.food && foodRoom > 0) {
        rest.food = Math.max(0, rest.food - foodRoom);
        if (rest.food === 0) delete rest.food;
      }
      return Object.keys(rest).length === 0 || (ctx.canStore?.(rest) ?? false);
    };

    const autoAll = hasUnlock('farm', 'autoHarvestAll', this.level);
    const barnActive = this.barnCapacity > 0;
    for (const plot of this.plots) {
      if (!plot.crop || plot.readyAt === null || now < plot.readyAt) continue;
      const onlyFood = Object.keys(FARM_CROPS[plot.crop].yield).every((type) => type === 'food');
      if (!autoAll && !(barnActive && onlyFood)) continue;
      const result = this.harvestPlot(plot.id, now, fits);
      if (result.ok) deliver(result.bundle);
    }

    const autoAnimals = autoAll
      ? this.unlockedAnimals
      : hasUnlock('farm', 'autoAnimals', this.level)
        ? AUTO_ANIMAL_PRODUCTS.filter((type) => this.hasAnimal(type))
        : [];
    for (const type of autoAnimals) {
      const result = this.collectAnimal(type, now, fits);
      if (result.ok) deliver(result.bundle);
    }

    if (this.passiveFoodPerMinute > 0) {
      this.passiveRemainderMs += deltaMs * efficiency;
      const msPerFood = 60000 / this.passiveFoodPerMinute;
      const food = Math.floor(this.passiveRemainderMs / msPerFood);
      if (food > 0) {
        this.passiveRemainderMs -= food * msPerFood;
        deliver({ food });
      }
    }

    const storedSomething = Object.keys(produced.storage).length > 0;
    return produced.barn > 0 || storedSomething ? produced : null;
  }

  serialize() {
    return {
      plots: this.plots.map((plot) => ({ ...plot })),
      animals: Object.fromEntries(Object.entries(this.animals).map(([type, animal]) => [type, { ...animal }])),
      barn: this.barn,
      passiveRemainderMs: Math.round(this.passiveRemainderMs)
    };
  }
}
