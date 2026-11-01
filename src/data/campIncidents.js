// Incidentes no acampamento (inspirado nos incidentes da cidade do Sunnyside Junction:
// fogo num prédio, lobo no curral, morador ferido — marcador "!" até o herói resolver com E).
// Lógica pura (roda no Node).

export const INCIDENT_CHANCE_PER_DAY = 0.35;

export const CAMP_INCIDENT_DEFS = Object.freeze([
  Object.freeze({
    id: 'fire', name: 'Incêndio', weight: 3, minDay: 2, building: true,
    desc: 'Um prédio do acampamento está em chamas! Apague com E antes que a durabilidade acabe.',
    durabilityPerSecond: 4
  }),
  Object.freeze({
    id: 'wolf', name: 'Lobo no curral', weight: 2, minDay: 3, building: false,
    desc: 'Um lobo invadiu o curral da Fazenda! Afaste-o com E (ou derrote-o).'
  }),
  Object.freeze({
    id: 'injured', name: 'Morador ferido', weight: 2, minDay: 2, building: false,
    desc: 'Um morador se feriu! Leve 1 comida para ele (E perto do marcador).', needsFood: true
  })
]);

export const CAMP_INCIDENTS_BY_ID = Object.freeze(
  Object.fromEntries(CAMP_INCIDENT_DEFS.map((d) => [d.id, d]))
);

/** Sorteia o incidente do dia (ou null). buildings: chaves de prédios contruídos. */
export function rollIncident(dayCount, rng = Math.random, buildings = []) {
  const day = Math.max(1, Math.floor(Number(dayCount) || 1));
  if (rng() >= INCIDENT_CHANCE_PER_DAY) return null;
  const pool = CAMP_INCIDENT_DEFS.filter((d) => day >= d.minDay);
  if (!pool.length) return null;
  const def = pool[Math.floor(rng() * pool.length)];
  let target = null;
  if (def.building) {
    const built = buildings.filter(Boolean);
    if (!built.length) return null;
    target = built[Math.floor(rng() * built.length)];
  }
  return { def, target };
}

/** Recompensa por resolver o incidente. */
export function incidentReward(id, rng = Math.random) {
  if (id === 'fire') return { coins: 15 + Math.floor(rng() * 15), xp: 20 };
  if (id === 'wolf') return { coins: 10 + Math.floor(rng() * 10), xp: 15 };
  return { coins: 8 + Math.floor(rng() * 8), xp: 25 };
}

/** Estado do incidente ativo (persiste no save). */
export class CampIncidentState {
  constructor(saved = {}) {
    const def = CAMP_INCIDENTS_BY_ID[saved?.active?.id];
    this.active = def
      ? { id: def.id, target: typeof saved.active.target === 'string' ? saved.active.target : null, day: Math.floor(Number(saved.active.day) || 1) }
      : null;
  }

  start(id, target, day) {
    const def = CAMP_INCIDENTS_BY_ID[id];
    if (!def) return false;
    this.active = { id: def.id, target: target ?? null, day: Math.floor(Number(day) || 1) };
    return true;
  }

  clear() { this.active = null; }

  serialize() { return { active: this.active ? { ...this.active } : null }; }
}
