// Mascotes e montaria. Lógica pura (roda no Node): a cena só desenha e aplica os efeitos.

export const MOUNT_LEVEL = 20;
export const MOUNT_SPEED = 1.35;

/** role: attack (golpeia o mais próximo), heal (cura o herói) ou coins (junta moedas). */
export const PETS = Object.freeze({
  wolfpup: Object.freeze({ id: 'wolfpup', name: 'Filhote de Lobo', role: 'attack', price: 500, color: '#9aa3ad', accent: '#e8eef4', info: 'Morde o inimigo mais próximo (40% do seu ataque).' }),
  fairy: Object.freeze({ id: 'fairy', name: 'Fada', role: 'heal', price: 800, color: '#7fe3c4', accent: '#fff6a8', info: 'Cura 3% da sua vida a cada 6 s.' }),
  magpie: Object.freeze({ id: 'magpie', name: 'Pega-moedas', role: 'coins', price: 600, color: '#3d4a78', accent: '#f4f4f8', info: 'Recolhe moedas ao redor dela.' }),
  dragonling: Object.freeze({ id: 'dragonling', name: 'Dragãozinho', role: 'attack', price: 0, egg: true, color: '#d8553b', accent: '#ffd56b', info: 'Nasce de ovo raro. Morde com 70% do seu ataque.' }),
  phoenix: Object.freeze({ id: 'phoenix', name: 'Fênix', role: 'heal', price: 0, egg: true, color: '#ff9a3c', accent: '#fff0a0', info: 'Nasce de ovo raro. Cura 5% da sua vida a cada 5 s.' })
});

export const PET_IDS = Object.freeze(Object.keys(PETS));
export const EGG_PET_IDS = Object.freeze(PET_IDS.filter((id) => PETS[id].egg));
export const SHOP_PET_IDS = Object.freeze(PET_IDS.filter((id) => !PETS[id].egg));

/** Chance de um chefe (ou chefe de missão) deixar um ovo raro. */
export const EGG_CHANCE = 0.35;

/** Ritmo e força do mascote: { everyMs, power, range }. power = fração do ataque (attack) ou da vida (heal). */
export function petAbility(id) {
  const table = {
    wolfpup: { everyMs: 1800, power: 0.4, range: 150 },
    dragonling: { everyMs: 1500, power: 0.7, range: 170 },
    fairy: { everyMs: 6000, power: 0.03, range: 0 },
    phoenix: { everyMs: 5000, power: 0.05, range: 0 },
    magpie: { everyMs: 0, power: 0, range: 110 }
  };
  return table[id] ?? null;
}

export function mountUnlocked(level) {
  return Math.floor(Number(level) || 0) >= MOUNT_LEVEL;
}

export class Companions {
  constructor(saved = {}) {
    const owned = Array.isArray(saved?.owned) ? saved.owned.filter((id) => PETS[id]) : [];
    this.owned = [...new Set(owned)];
    this.active = this.owned.includes(saved?.active) ? saved.active : null;
    this.eggs = Math.max(0, Math.min(99, Math.floor(Number(saved?.eggs) || 0)));
    this.mounted = Boolean(saved?.mounted);
  }

  has(id) { return this.owned.includes(id); }

  /** Compra um mascote da loja. Devolve { ok, message, cost }. */
  buy(id, coins) {
    const pet = PETS[id];
    if (!pet || pet.egg) return { ok: false, message: 'Esse mascote não está à venda.' };
    if (this.has(id)) return { ok: false, message: 'Você já tem esse mascote.' };
    if ((Number(coins) || 0) < pet.price) return { ok: false, message: 'Faltam moedas.' };
    this.owned.push(id);
    this.active ??= id;
    return { ok: true, message: `${pet.name} agora acompanha você!`, cost: pet.price };
  }

  /** Um chefe caiu: talvez deixe um ovo (só enquanto ainda houver mascote de ovo a ganhar ou ovo guardado). */
  rollEgg(random = Math.random) {
    if (EGG_PET_IDS.every((id) => this.has(id))) return false;
    if (random() >= EGG_CHANCE) return false;
    this.eggs += 1;
    return true;
  }

  /** Choca um ovo: sorteia um mascote de ovo que ainda não existe. */
  hatch(random = Math.random) {
    if (this.eggs <= 0) return { ok: false, message: 'Você não tem ovos.' };
    const pool = EGG_PET_IDS.filter((id) => !this.has(id));
    if (!pool.length) return { ok: false, message: 'Você já tem todos os mascotes de ovo.' };
    const id = pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))];
    this.eggs -= 1;
    this.owned.push(id);
    this.active ??= id;
    return { ok: true, id, message: `O ovo chocou: ${PETS[id].name}!` };
  }

  /** Chama (ou guarda, se já ativo) um mascote. */
  summon(id) {
    if (!this.has(id)) return { ok: false, message: 'Você não tem esse mascote.' };
    if (this.active === id) { this.active = null; return { ok: true, message: `${PETS[id].name} descansa.` }; }
    this.active = id;
    return { ok: true, message: `${PETS[id].name} vem com você.` };
  }

  toggleMount(level) {
    if (!mountUnlocked(level)) return { ok: false, message: `A montaria é liberada no nível ${MOUNT_LEVEL}.` };
    this.mounted = !this.mounted;
    return { ok: true, message: this.mounted ? 'Você montou (+35% de velocidade).' : 'Você desmontou.' };
  }

  /** Dano desmonta. Devolve true se estava montado. */
  onDamaged() {
    if (!this.mounted) return false;
    this.mounted = false;
    return true;
  }

  speedMultiplier(level) {
    return this.mounted && mountUnlocked(level) ? MOUNT_SPEED : 1;
  }

  serialize() {
    return { owned: [...this.owned], active: this.active, eggs: this.eggs, mounted: this.mounted };
  }
}
