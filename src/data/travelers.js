import { BUILDING_DEFS, hasUnlock } from './buildings.js';
import { createSeededRandom } from './harvestStructures.js';

// Viajantes atraídos pela Fogueira (nível 4+): aparecem a cada 4 dias com uma missão e itens.
export const TRAVELER_QUESTS = Object.freeze([
  { id: 'wolves', kind: 'kill', enemy: 'wolf', count: 4, text: 'Derrote 4 lobos.', reward: { coins: 25, items: { potion: 1 } } },
  { id: 'slimes', kind: 'kill', enemy: 'slime', count: 6, text: 'Derrote 6 gosmas.', reward: { coins: 20, items: { seeds: 3 } } },
  { id: 'skeletons', kind: 'kill', enemy: 'skeleton', count: 4, text: 'Derrote 4 esqueletos à noite.', reward: { coins: 35, items: { iron: 2 } } },
  { id: 'hunter', kind: 'kill', enemy: null, count: 10, text: 'Derrote 10 inimigos quaisquer.', reward: { coins: 40, items: { staminaPotion: 1 } } },
  { id: 'wood', kind: 'deliver', items: { wood: 15 }, text: 'Entregue 15 madeiras.', reward: { coins: 30, items: { torch: 2 } } },
  { id: 'herbs', kind: 'deliver', items: { herbs: 10 }, text: 'Entregue 10 ervas.', reward: { coins: 25, items: { potion: 1 } } },
  { id: 'food', kind: 'deliver', items: { food: 12 }, text: 'Entregue 12 comidas.', reward: { coins: 25, items: { herbs: 4 } } },
  { id: 'iron', kind: 'deliver', items: { iron: 4 }, text: 'Entregue 4 ferros.', reward: { coins: 45, items: { gold: 1 } } }
]);

export const TRAVELER_GOODS = Object.freeze([
  { id: 'tPotion', name: 'Poção de Vida', price: 9, yield: { potion: 1 } },
  { id: 'tStamina', name: 'Poção de Vigor', price: 8, yield: { staminaPotion: 1 } },
  { id: 'tSeeds', name: 'Sementes (3)', price: 12, yield: { seeds: 3 } },
  { id: 'tTrap', name: 'Armadilha', price: 11, yield: { trap: 1 } },
  { id: 'tTorch', name: 'Tochas (2)', price: 5, yield: { torch: 2 } }
]);

const EVERY_DAYS = BUILDING_DEFS.campfire.travelerEveryDays;

export function questById(id) {
  return TRAVELER_QUESTS.find((quest) => quest.id === id) ?? null;
}

export class CampfireTravelers {
  constructor(saved = {}) {
    this.visitDay = Number.isFinite(Number(saved?.visitDay)) ? Number(saved.visitDay) : null;
    this.offeredQuest = questById(saved?.offeredQuest)?.id ?? null;
    this.goods = (Array.isArray(saved?.goods) ? saved.goods : [])
      .filter((good) => TRAVELER_GOODS.some((entry) => entry.id === good?.id))
      .map((good) => ({ id: good.id, quantity: Math.max(0, Math.floor(Number(good.quantity) || 0)) }));
    const active = saved?.activeQuest;
    this.activeQuest = active && questById(active.id)
      ? { id: active.id, progress: Math.max(0, Math.floor(Number(active.progress) || 0)) }
      : null;
  }

  isVisitDay(day, campfireLevel) {
    return hasUnlock('campfire', 'travelers', campfireLevel) && day % EVERY_DAYS === 0;
  }

  /** Chamado na virada de dia; prepara a visita quando for dia de viajante. */
  refresh(day, campfireLevel) {
    if (!this.isVisitDay(day, campfireLevel)) {
      if (this.visitDay !== null && this.visitDay !== day) {
        this.visitDay = null;
        this.offeredQuest = null;
        this.goods = [];
      }
      return false;
    }
    if (this.visitDay === day) return true;
    const random = createSeededRandom((day * 2654435761) >>> 0);
    this.visitDay = day;
    this.offeredQuest = TRAVELER_QUESTS[Math.floor(random() * TRAVELER_QUESTS.length)].id;
    const goods = [...TRAVELER_GOODS];
    for (let index = goods.length - 1; index > 0; index -= 1) {
      const target = Math.floor(random() * (index + 1));
      [goods[index], goods[target]] = [goods[target], goods[index]];
    }
    this.goods = goods.slice(0, 2).map((good) => ({ id: good.id, quantity: 2 }));
    return true;
  }

  get present() {
    return this.visitDay !== null;
  }

  acceptQuest() {
    if (!this.offeredQuest || this.activeQuest) return false;
    this.activeQuest = { id: this.offeredQuest, progress: 0 };
    this.offeredQuest = null;
    return true;
  }

  recordKill(enemyKind) {
    const quest = questById(this.activeQuest?.id);
    if (!quest || quest.kind !== 'kill') return false;
    if (quest.enemy && quest.enemy !== enemyKind) return false;
    this.activeQuest.progress = Math.min(quest.count, this.activeQuest.progress + 1);
    return true;
  }

  questReady(sources) {
    const quest = questById(this.activeQuest?.id);
    if (!quest) return false;
    if (quest.kind === 'kill') return this.activeQuest.progress >= quest.count;
    return Object.entries(quest.items).every(([type, amount]) =>
      (sources.inventory?.items?.[type] ?? 0) + (sources.storage?.[type] ?? 0) >= amount);
  }

  /** Entrega a missão. `pay(cost)` cobra itens de entrega; devolve a recompensa para a cena aplicar. */
  claim(sources, pay) {
    const quest = questById(this.activeQuest?.id);
    if (!quest || !this.questReady(sources)) return null;
    if (quest.kind === 'deliver' && !pay(quest.items)) return null;
    this.activeQuest = null;
    return { ...quest.reward, items: { ...quest.reward.items } };
  }

  buy(goodId, economy, giveBundle) {
    const offer = this.goods.find((good) => good.id === goodId);
    const definition = TRAVELER_GOODS.find((good) => good.id === goodId);
    if (!offer || !definition || offer.quantity <= 0) return { ok: false, reason: 'sold-out' };
    if (economy.coins < definition.price) return { ok: false, reason: 'coins' };
    if (!giveBundle(definition.yield)) return { ok: false, reason: 'inventory' };
    economy.spendCoins(definition.price);
    offer.quantity -= 1;
    return { ok: true, spent: definition.price };
  }

  serialize() {
    return {
      visitDay: this.visitDay,
      offeredQuest: this.offeredQuest,
      goods: this.goods.map((good) => ({ ...good })),
      activeQuest: this.activeQuest ? { ...this.activeQuest } : null
    };
  }
}
