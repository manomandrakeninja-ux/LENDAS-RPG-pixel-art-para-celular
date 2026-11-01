// Skills ativas nos atalhos 6-9 (inspirado nas magias 1-4 do Skyrim e nas arts da lanterna do Rowanmark).
// Lógica pura (roda no Node): a cena só desenha o HUD e aplica os efeitos.

export const ACTIVE_SKILLS = Object.freeze([
  Object.freeze({
    id: 'fireball', slot: 0, key: '6', name: 'Bola de Fogo', icon: '🔥',
    unlockLevel: 3, cooldownMs: 4000, stamina: 20, damageMultiplier: 1.6, speed: 340, range: 420,
    desc: 'Lança uma bola de fogo no alvo travado (Tab) ou para a frente.'
  }),
  Object.freeze({
    id: 'ward', slot: 1, key: '7', name: 'Muralha Arcana', icon: '🛡️',
    unlockLevel: 5, cooldownMs: 15000, stamina: 25, defensePercent: 0.6, durationMs: 8000,
    desc: '+60% de defesa por 8 s.'
  }),
  Object.freeze({
    id: 'heal', slot: 2, key: '8', name: 'Toque Curativo', icon: '✨',
    unlockLevel: 7, cooldownMs: 20000, stamina: 30, healPercent: 0.35,
    desc: 'Cura 35% da vida máxima.'
  }),
  Object.freeze({
    id: 'burst', slot: 3, key: '9', name: 'Onda Devastadora', icon: '💥',
    unlockLevel: 10, cooldownMs: 12000, stamina: 35, damageMultiplier: 2.2, radius: 150,
    desc: 'Dano em área ao redor do herói.'
  })
]);

export const ACTIVE_SKILLS_BY_ID = Object.freeze(Object.fromEntries(ACTIVE_SKILLS.map((s) => [s.id, s])));

/** Índice do slot (0-3) para o dígito '6'..'9', ou -1. */
export function slotForDigit(digit) {
  const n = Number(digit);
  if (!Number.isInteger(n) || n < 6 || n > 9) return -1;
  return n - 6;
}

export class ActiveSkills {
  constructor() {
    // Cooldowns são transitórios: não persistem no save (sempre begin ready após carregar).
    this.cooldowns = {}; // id -> timestamp (ms do relógio do jogo) em que termina
  }

  skillAt(slot) {
    return ACTIVE_SKILLS[slot] ?? null;
  }

  unlocked(id, level) {
    const skill = ACTIVE_SKILLS_BY_ID[id];
    return Boolean(skill) && (Number(level) || 1) >= skill.unlockLevel;
  }

  remainingMs(id, now) {
    const skill = ACTIVE_SKILLS_BY_ID[id];
    if (!skill) return 0;
    const until = this.cooldowns[id] ?? 0;
    return Math.max(0, until - now);
  }

  /** Pode lançar? Devolve { ok, reason }. */
  canCast(id, { level = 1, stamina = 0, now = 0 } = {}) {
    const skill = ACTIVE_SKILLS_BY_ID[id];
    if (!skill) return { ok: false, reason: 'Skill desconhecida.' };
    if (!this.unlocked(id, level)) return { ok: false, reason: `Desbloqueia no nível ${skill.unlockLevel}.` };
    if (this.remainingMs(id, now) > 0) return { ok: false, reason: 'Recarregando...' };
    if (stamina < skill.stamina) return { ok: false, reason: 'Vigor insuficiente.' };
    return { ok: true };
  }

  /** Registra o lanzamiento: devolve true se aceito. */
  cast(id, now) {
    const skill = ACTIVE_SKILLS_BY_ID[id];
    if (!skill) return false;
    this.cooldowns[id] = now + skill.cooldownMs;
    return true;
  }

  serialize() { return {}; }
}
