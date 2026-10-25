import {
  CAMPAIGN_VERSION,
  DAILY_COUNT,
  DAILY_TEMPLATES,
  DAILY_UNLOCK_MISSION,
  LEGENDARY_DAILY_TEMPLATES,
  MISSIONS,
  MISSIONS_BY_ID
} from '../data/campaign.js';

// Estado da campanha sem Phaser: missões, objetivos, recompensas, diárias e save.
// O que depende do mundo (ter um item, nível de prédio...) chega pelo objeto `ctx`:
//   ctx.owns(recipes[]) ctx.buildingLevel(key) ctx.animalUnlocked(product)
//   ctx.available(item) ctx.residents() ctx.seals() ctx.flag(name) ctx.choice()

// Objetivos que dependem de um estado do jogo, não de eventos.
export const STATE_OBJECTIVES = new Set(['owns', 'building', 'animal', 'deliver', 'flag', 'seals', 'choice', 'residents']);

const clampInt = (value, min, max) => Math.max(min, Math.min(max, Math.floor(Number(value) || 0)));

/** O evento conta para o objetivo? Devolve quanto soma (0 = não conta). */
export function eventAmount(objective, event) {
  const type = objective.type;
  if (type === 'bossPhase' || type === 'defend') return 0;
  if (event.type !== type) return 0;
  switch (type) {
    case 'gather':
      return objective.target === event.target ? Math.max(0, Math.floor(event.amount ?? 1)) : 0;
    case 'kill': {
      const target = objective.target;
      const hits = target === 'any' ||
        (target === 'elite' && event.elite) ||
        (event.tag ? target === event.tag : target === event.kind);
      if (!hits) return 0;
      if (objective.region === 'noite') return event.night ? 1 : 0;
      if (objective.region && objective.region !== event.region) return 0;
      return 1;
    }
    case 'buy':
    case 'sell':
      return Math.max(1, Math.floor(event.amount ?? 1));
    case 'craft':
    case 'plant':
    case 'harvest':
      return objective.target === 'any' || objective.target === event.target ? 1 : 0;
    case 'rescue':
      return objective.target === event.target || objective.target === event.group ? 1 : 0;
    case 'talk':
      return (event.targets ?? [event.target]).includes(objective.target) ? 1 : 0;
    default:
      return objective.target === event.target ? 1 : 0;
  }
}

function createDaily(template) {
  return { template: template.id, progress: 0, rewarded: false };
}

function templateById(id) {
  return [...DAILY_TEMPLATES, ...LEGENDARY_DAILY_TEMPLATES].find((entry) => entry.id === id) ?? null;
}

/** Sorteio determinístico das diárias do dia (mesmo dia = mesmas missões). */
export function rollDailies(day, postGame = false) {
  const pool = [...DAILY_TEMPLATES, ...(postGame ? LEGENDARY_DAILY_TEMPLATES : [])];
  let seed = (Math.floor(day) * 2654435761) >>> 0;
  const next = () => {
    seed = (Math.imul(seed ^ (seed >>> 15), 2246822519) + 3266489917) >>> 0;
    return seed / 4294967296;
  };
  const picked = [];
  const count = DAILY_COUNT + (postGame ? 1 : 0);
  while (picked.length < count && picked.length < pool.length) {
    const candidate = pool[Math.floor(next() * pool.length)];
    if (!picked.includes(candidate)) picked.push(candidate);
  }
  return picked.map(createDaily);
}

export class CampaignState {
  constructor(saved = {}) {
    const data = saved && typeof saved === 'object' ? saved : {};
    this.version = CAMPAIGN_VERSION;
    this.missions = {};
    for (const mission of MISSIONS) {
      const entry = data.missions?.[mission.id] ?? {};
      const state = ['available', 'active', 'done'].includes(entry.state) ? entry.state : 'locked';
      this.missions[mission.id] = {
        state,
        progress: mission.objectives.map((objective, index) =>
          clampInt(entry.progress?.[index], 0, objective.count ?? 1)),
        rewarded: Boolean(entry.rewarded) && state === 'done'
      };
    }
    this.flags = { ...(data.flags ?? {}) };
    this.seals = Array.isArray(data.seals) ? [...new Set(data.seals)] : [];
    this.lore = Array.isArray(data.lore) ? [...new Set(data.lore)] : [];
    this.recruited = Array.isArray(data.recruited) ? [...new Set(data.recruited)] : [];
    this.residents = clampInt(data.residents, 0, 999);
    this.choice = data.choice === 'destroy' || data.choice === 'restore' ? data.choice : null;
    this.tracked = MISSIONS_BY_ID[data.tracked] ? data.tracked : null;
    this.sites = { ...(data.sites ?? {}) };
    this.introShown = Boolean(data.introShown);
    this.daily = {
      day: clampInt(data.daily?.day, 0, 1e9),
      list: Array.isArray(data.daily?.list)
        ? data.daily.list.filter((entry) => templateById(entry.template)).map((entry) => ({
          template: entry.template,
          progress: clampInt(entry.progress, 0, templateById(entry.template).objective.count),
          rewarded: Boolean(entry.rewarded)
        }))
        : []
    };
    this.stats = { missionsDone: 0, dailiesDone: clampInt(data.stats?.dailiesDone, 0, 1e9) };
    this.refreshAvailability();
  }

  // ---------- Consultas ----------

  entry(id) {
    return this.missions[id];
  }

  stateOf(id) {
    return this.missions[id]?.state ?? 'locked';
  }

  /** Libera a próxima missão: a campanha é uma corrente, cada missão exige a anterior. */
  refreshAvailability() {
    let previousDone = true;
    let done = 0;
    for (const mission of MISSIONS) {
      const entry = this.missions[mission.id];
      if (entry.state === 'done') {
        done += 1;
        previousDone = true;
        continue;
      }
      if (entry.state === 'locked' && previousDone) entry.state = 'available';
      // Sem pré-requisito cumprido, uma missão não pode estar liberada (save adulterado/antigo).
      if (!previousDone && entry.state !== 'locked') {
        entry.state = 'locked';
        entry.progress = entry.progress.map(() => 0);
      }
      previousDone = false;
    }
    this.stats.missionsDone = done;
    if (!this.tracked || this.stateOf(this.tracked) === 'done' || this.stateOf(this.tracked) === 'locked') {
      this.tracked = this.activeMissions()[0]?.id ?? null;
    }
  }

  activeMissions() {
    return MISSIONS.filter((mission) => this.stateOf(mission.id) === 'active');
  }

  availableMissions() {
    return MISSIONS.filter((mission) => this.stateOf(mission.id) === 'available');
  }

  /** Primeira missão ainda não concluída (define o capítulo atual). */
  get currentMission() {
    return MISSIONS.find((mission) => this.stateOf(mission.id) !== 'done') ?? null;
  }

  get currentChapter() {
    return this.currentMission?.chapter ?? 10;
  }

  get completedCount() {
    return MISSIONS.filter((mission) => this.stateOf(mission.id) === 'done').length;
  }

  objectiveValue(mission, index, ctx = {}) {
    const objective = mission.objectives[index];
    const count = objective.count ?? 1;
    const stored = this.missions[mission.id].progress[index] ?? 0;
    if (!STATE_OBJECTIVES.has(objective.type)) return Math.min(count, stored);
    let value = 0;
    switch (objective.type) {
      case 'owns': value = ctx.owns?.(objective.target) ? 1 : 0; break;
      case 'building': value = (ctx.buildingLevel?.(objective.target) ?? 0) >= objective.level ? 1 : 0; break;
      case 'animal': value = ctx.animalUnlocked?.(objective.target) ? 1 : 0; break;
      case 'deliver': value = ctx.available?.(objective.target) ?? 0; break;
      case 'flag': value = this.flags[objective.target] ? 1 : 0; break;
      case 'seals': value = this.seals.length; break;
      case 'choice': value = this.choice ? 1 : 0; break;
      case 'residents': value = this.residents; break;
      default: value = 0;
    }
    return Math.min(count, value);
  }

  isComplete(mission, ctx = {}) {
    return mission.objectives.every((objective, index) =>
      this.objectiveValue(mission, index, ctx) >= (objective.count ?? 1));
  }

  /** Itens que a missão consome na entrega. */
  deliveryCost(mission) {
    const cost = {};
    for (const objective of mission.objectives) {
      if (objective.type === 'deliver') cost[objective.target] = (cost[objective.target] ?? 0) + objective.count;
    }
    return cost;
  }

  // ---------- Ações ----------

  accept(id) {
    if (this.stateOf(id) !== 'available') return false;
    this.missions[id].state = 'active';
    if (!this.tracked) this.tracked = id;
    return true;
  }

  canTurnIn(id, ctx = {}) {
    const mission = MISSIONS_BY_ID[id];
    return Boolean(mission) && this.stateOf(id) === 'active' && this.isComplete(mission, ctx);
  }

  /**
   * Conclui a missão (uma única vez) e devolve as recompensas para a cena aplicar.
   * O consumo dos itens de entrega é feito pela cena antes, via `pay`.
   */
  turnIn(id, ctx = {}) {
    if (!this.canTurnIn(id, ctx)) return null;
    const mission = MISSIONS_BY_ID[id];
    const entry = this.missions[id];
    if (entry.rewarded) return null;
    entry.state = 'done';
    entry.rewarded = true;
    if (mission.lore && !this.lore.includes(mission.lore)) this.lore.push(mission.lore);
    if (mission.setsFlag) this.flags[mission.setsFlag] = true;
    if (this.tracked === id) this.tracked = null;
    this.refreshAvailability();
    return { mission, rewards: mission.rewards };
  }

  /**
   * Aplica um evento real do jogo às missões ativas e às diárias.
   * Devolve o que mudou, para a interface avisar o jogador.
   */
  emit(event) {
    const changes = [];
    for (const mission of this.activeMissions()) {
      const entry = this.missions[mission.id];
      mission.objectives.forEach((objective, index) => {
        if (STATE_OBJECTIVES.has(objective.type)) return;
        const count = objective.count ?? 1;
        if (entry.progress[index] >= count) return;
        let next = entry.progress[index];
        if (objective.type === 'bossPhase' && event.type === 'bossPhase' && event.target === objective.target &&
            event.ratio <= objective.ratio) {
          next = count;
        } else if (objective.type === 'defend' && event.type === 'defend' && event.target === objective.target) {
          next = Math.min(count, Math.max(next, Math.floor(event.seconds ?? 0)));
        } else {
          next = Math.min(count, next + eventAmount(objective, event));
        }
        if (next !== entry.progress[index]) {
          entry.progress[index] = next;
          changes.push({ mission, index, value: next, count });
        }
      });
    }
    for (const daily of this.daily.list) {
      if (daily.rewarded) continue;
      const template = templateById(daily.template);
      const objective = template.objective;
      if (STATE_OBJECTIVES.has(objective.type) || daily.progress >= objective.count) continue;
      const next = Math.min(objective.count, daily.progress + eventAmount(objective, event));
      if (next !== daily.progress) {
        daily.progress = next;
        changes.push({ daily, template, value: next, count: objective.count });
      }
    }
    return changes;
  }

  addSeal(seal) {
    if (!seal || this.seals.includes(seal)) return false;
    this.seals.push(seal);
    return true;
  }

  addLore(key) {
    if (!key || this.lore.includes(key)) return false;
    this.lore.push(key);
    return true;
  }

  recruit(npc) {
    if (!npc || this.recruited.includes(npc)) return false;
    this.recruited.push(npc);
    this.residents += 1;
    return true;
  }

  // ---------- Diárias ----------

  get dailiesUnlocked() {
    return this.stateOf(MISSIONS[DAILY_UNLOCK_MISSION - 1].id) === 'done';
  }

  /** Gera as diárias do dia; as anteriores (e seu progresso) são substituídas. */
  refreshDaily(day) {
    if (!this.dailiesUnlocked) {
      this.daily = { day: 0, list: [] };
      return false;
    }
    if (this.daily.day === day && this.daily.list.length > 0) return false;
    this.daily = { day, list: rollDailies(day, Boolean(this.flags.postGame)) };
    return true;
  }

  dailyValue(daily, ctx = {}) {
    const objective = templateById(daily.template).objective;
    if (objective.type === 'deliver') return Math.min(objective.count, ctx.available?.(objective.target) ?? 0);
    return daily.progress;
  }

  canClaimDaily(index, ctx = {}) {
    const daily = this.daily.list[index];
    if (!daily || daily.rewarded) return false;
    return this.dailyValue(daily, ctx) >= templateById(daily.template).objective.count;
  }

  claimDaily(index, ctx = {}) {
    if (!this.canClaimDaily(index, ctx)) return null;
    const daily = this.daily.list[index];
    daily.rewarded = true;
    this.stats.dailiesDone += 1;
    const template = templateById(daily.template);
    return { template, rewards: template.rewards };
  }

  dailyTemplate(daily) {
    return templateById(daily.template);
  }

  serialize() {
    return {
      version: this.version,
      missions: Object.fromEntries(Object.entries(this.missions).map(([id, entry]) => [id, {
        state: entry.state,
        progress: [...entry.progress],
        rewarded: entry.rewarded
      }])),
      flags: { ...this.flags },
      seals: [...this.seals],
      lore: [...this.lore],
      recruited: [...this.recruited],
      residents: this.residents,
      choice: this.choice,
      tracked: this.tracked,
      sites: JSON.parse(JSON.stringify(this.sites)),
      introShown: this.introShown,
      daily: { day: this.daily.day, list: this.daily.list.map((entry) => ({ ...entry })) },
      stats: { dailiesDone: this.stats.dailiesDone }
    };
  }
}
