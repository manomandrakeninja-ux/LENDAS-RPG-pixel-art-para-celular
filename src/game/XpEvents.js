// XP em dobro: evento a cada 7 dias de jogo (dura 1 dia) e bônus de novato nos primeiros 7 dias
// (1 vez por dia, resgatado na Fogueira, vale por 10 minutos). Lógica pura (roda no Node).

export const XP_EVENT_CONFIG = Object.freeze({
  everyDays: 7,
  multiplier: 2,
  newbieDays: 7,
  bonusMs: 10 * 60 * 1000
});

/** Dia de evento: 7, 14, 21... (o "fim de semana" do calendário do jogo). */
export function isDoubleXpDay(day) {
  const value = Math.floor(Number(day) || 0);
  return value > 0 && value % XP_EVENT_CONFIG.everyDays === 0;
}

/** Dias até o próximo evento (0 = hoje). */
export function daysUntilDoubleXp(day) {
  const value = Math.max(1, Math.floor(Number(day) || 1));
  const every = XP_EVENT_CONFIG.everyDays;
  return (every - (value % every)) % every;
}

export class XpBoost {
  constructor(saved = {}) {
    this.claimedDay = Math.max(0, Math.floor(Number(saved?.claimedDay) || 0));
    this.remainingMs = Math.max(0, Math.min(XP_EVENT_CONFIG.bonusMs, Number(saved?.remainingMs) || 0));
    this.announcedDay = Math.max(0, Math.floor(Number(saved?.announcedDay) || 0));
  }

  /** Bônus de novato: só nos 7 primeiros dias, 1 vez por dia. */
  canClaim(day) {
    const value = Math.floor(Number(day) || 1);
    return value <= XP_EVENT_CONFIG.newbieDays && this.claimedDay !== value;
  }

  claim(day) {
    const value = Math.floor(Number(day) || 1);
    if (value > XP_EVENT_CONFIG.newbieDays) return { ok: false, message: 'O bônus de novato vale só nos 7 primeiros dias.' };
    if (this.claimedDay === value) return { ok: false, message: 'Você já resgatou o bônus de hoje. Volte amanhã.' };
    this.claimedDay = value;
    this.remainingMs = XP_EVENT_CONFIG.bonusMs;
    return { ok: true, message: 'XP em dobro por 10 minutos!' };
  }

  update(delta) {
    if (this.remainingMs > 0) this.remainingMs = Math.max(0, this.remainingMs - delta);
  }

  get bonusActive() {
    return this.remainingMs > 0;
  }

  /** 2 se o evento ou o bônus de novato estiver valendo (não acumulam), senão 1. */
  multiplier(day) {
    return isDoubleXpDay(day) || this.bonusActive ? XP_EVENT_CONFIG.multiplier : 1;
  }

  /** Primeira vez que o evento aparece neste dia? (para avisar na tela uma vez só) */
  shouldAnnounce(day) {
    const value = Math.floor(Number(day) || 0);
    if (!isDoubleXpDay(value) || this.announcedDay === value) return false;
    this.announcedDay = value;
    return true;
  }

  serialize() {
    return { claimedDay: this.claimedDay, remainingMs: Math.round(this.remainingMs), announcedDay: this.announcedDay };
  }
}
