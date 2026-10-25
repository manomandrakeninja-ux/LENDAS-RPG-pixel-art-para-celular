import { ANIMAL_PRODUCTS, FARM_CROPS, FARM_PLOT_COUNTS } from '../data/buildingSystems.js';

export class FarmSystem {
  constructor({ saved = {}, level = 1, now = Date.now(), random = Math.random } = {}) {
    this.level = Math.min(3, Math.max(1, Number(level) || 1));
    this.now = now;
    this.random = random;
    this.plots = [];
    this.animals = {};
    this.restore(saved);
    this.ensureCapacity();
  }

  restore(saved) {
    const plots = Array.isArray(saved?.plots) ? saved.plots : [];
    const uniquePlots = new Map();
    for (const plot of plots) {
      if (!plot || !Number.isFinite(Number(plot.id))) continue;
      const id = Number(plot.id);
      if (uniquePlots.has(id)) continue;
      uniquePlots.set(id, {
        id,
        crop: FARM_CROPS[plot.crop] ? plot.crop : null,
        plantedAt: Number.isFinite(Number(plot.plantedAt)) ? Number(plot.plantedAt) : null,
        readyAt: Number.isFinite(Number(plot.readyAt)) ? Number(plot.readyAt) : null
      });
    }
    this.plots = [...uniquePlots.values()];
    this.animals = {};
    for (const [type, definition] of Object.entries(ANIMAL_PRODUCTS)) {
      const savedAnimal = saved?.animals?.[type];
      const readyAt = Number.isFinite(Number(savedAnimal?.readyAt))
        ? Number(savedAnimal.readyAt)
        : this.now + definition.seconds * 1000;
      this.animals[type] = { readyAt, collected: false };
    }
  }

  ensureCapacity() {
    const count = FARM_PLOT_COUNTS[this.level] ?? 4;
    for (let id = 0; id < count; id += 1) {
      if (!this.plots.some((plot) => plot.id === id)) {
        this.plots.push({ id, crop: null, plantedAt: null, readyAt: null });
      }
    }
    this.plots = this.plots
      .filter((plot) => plot.id < count)
      .sort((left, right) => left.id - right.id);
  }

  setLevel(level) {
    this.level = Math.min(3, Math.max(1, Number(level) || 1));
    this.ensureCapacity();
  }

  get plotCount() {
    return FARM_PLOT_COUNTS[this.level] ?? 4;
  }

  plant(plotId, crop, now = Date.now()) {
    const definition = FARM_CROPS[crop];
    const plot = this.plots.find((entry) => entry.id === Number(plotId));
    if (!definition || !plot || plot.crop) return { ok: false, reason: 'invalid' };
    plot.crop = crop;
    plot.plantedAt = now;
    plot.readyAt = now + definition.seconds * 1000;
    return { ok: true, crop, readyAt: plot.readyAt };
  }

  harvestPlot(plotId, now = Date.now(), canAccept = () => true) {
    const plot = this.plots.find((entry) => entry.id === Number(plotId));
    if (!plot?.crop || plot.readyAt === null || now < plot.readyAt) {
      return { ok: false, reason: 'not-ready' };
    }
    const definition = FARM_CROPS[plot.crop];
    const amount = Math.floor(this.random() * (definition.yieldAmount[1] - definition.yieldAmount[0] + 1)) +
      definition.yieldAmount[0];
    const result = { ok: true, crop: plot.crop, type: definition.yieldType, amount };
    if (!canAccept({ [result.type]: result.amount })) return { ok: false, reason: 'inventory' };
    plot.crop = null;
    plot.plantedAt = null;
    plot.readyAt = null;
    return result;
  }

  collectAnimal(type, now = Date.now(), canAccept = () => true) {
    const definition = ANIMAL_PRODUCTS[type];
    const animal = this.animals[type];
    if (!definition || !animal || now < animal.readyAt) return { ok: false, reason: 'not-ready' };
    if (!canAccept({ [type]: definition.amount })) return { ok: false, reason: 'inventory' };
    animal.readyAt = now + definition.seconds * 1000;
    animal.collected = false;
    return { ok: true, type, amount: definition.amount };
  }

  update(now = Date.now(), canAccept = () => true) {
    if (this.level < 3) return null;
    const harvested = {};
    for (const plot of this.plots) {
      if (!plot.crop || plot.readyAt === null || now < plot.readyAt) continue;
      const result = this.harvestPlot(plot.id, now, canAccept);
      if (!result.ok) continue;
      harvested[result.type] = (harvested[result.type] ?? 0) + result.amount;
    }
    return Object.keys(harvested).length > 0 ? harvested : null;
  }

  serialize() {
    return {
      plots: this.plots.map((plot) => ({ ...plot })),
      animals: Object.fromEntries(Object.entries(this.animals).map(([type, animal]) => [type, { ...animal }]))
    };
  }
}
