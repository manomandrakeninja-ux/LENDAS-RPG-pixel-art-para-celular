// Missões diárias e conquistas. Lógica pura (roda no Node): a cena só avisa os eventos e paga as recompensas.

const T = (stat, goals, namer, titles) => goals.map((goal, i) => ({ stat, goal, name: namer(goal), title: titles[i] }));

const defs = [
  ...T('kills', [1, 50, 250, 1000, 5000], (n) => `Matar ${n} monstros`, ['Caçador Novato', 'Caçador', 'Matador', 'Ceifador', 'Flagelo dos Monstros']),
  ...T('bosses', [1, 5, 15, 30], (n) => `Derrotar ${n} chefe${n > 1 ? 's' : ''}`, ['Quebra-Chefe', 'Algoz de Chefes', 'Terror dos Titãs', 'Matador de Lendas']),
  ...T('level', [5, 10, 20, 30, 50, 75, 100, 150], (n) => `Chegar ao nível ${n}`, ['Aprendiz', 'Aventureiro', 'Veterano', 'Herói', 'Campeão', 'Mestre de Armas', 'Lenda Viva', 'Ascendido']),
  ...T('coins', [100, 1000, 10000, 100000], (n) => `Juntar ${n} moedas`, ['Poupador', 'Comerciante', 'Magnata', 'Dragão do Ouro']),
  ...T('gathered', [50, 500, 3000], (n) => `Coletar ${n} recursos`, ['Coletor', 'Extrativista', 'Mestre Artesão']),
  ...T('enhances', [1, 10, 30], (n) => `Aprimorar ${n} vez${n > 1 ? 'es' : ''} com sucesso`, ['Aprendiz de Ferreiro', 'Ferreiro', 'Mestre Ferreiro']),
  ...T('maxEnhance', [5, 10], (n) => `Peça no +${n}`, ['Reforçador', 'Forja Perfeita']),
  ...T('sets', [1, 3, 6, 12, 18], (n) => `Reunir ${n} conjunto${n > 1 ? 's' : ''} completo${n > 1 ? 's' : ''}`, ['Bem Equipado', 'Colecionador', 'Armeiro', 'Mestre dos Conjuntos', 'Arsenal Completo']),
  ...T('bestiary', [5, 15, 30, 'all'], (n) => (n === 'all' ? 'Completar o Bestiário' : `Registrar ${n} espécies`), ['Curioso', 'Naturalista', 'Estudioso', 'Sábio do Bestiário']),
  ...T('dailies', [1, 7, 30], (n) => `Concluir ${n} missão${n > 1 ? 'ões' : ''} diária${n > 1 ? 's' : ''}`, ['Dedicado', 'Constante', 'Incansável'])
].map((a, i) => Object.freeze({ ...a, id: `ach${i + 1}` }));

export const ACHIEVEMENTS = Object.freeze(defs);
export const ACHIEVEMENT_BY_ID = Object.freeze(Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a])));
export const STAT_IDS = Object.freeze(['kills', 'bosses', 'coins', 'gathered', 'enhances', 'maxEnhance', 'dailies']);

/** Meta numérica de uma conquista ('all' vira o total do bestiário). */
export function goalOf(achievement, ctx = {}) {
  return achievement.goal === 'all' ? Math.max(1, ctx.bestiaryTotal ?? 1) : achievement.goal;
}

/** Missões diárias: matar, coletar e aprimorar. A dificuldade segue o nível do herói. */
export function makeDailyQuests(day, level = 1) {
  const lv = Math.max(1, Math.floor(level) || 1);
  const reward = (mult) => ({ coins: Math.round((40 + lv * 6) * mult), xp: Math.round((30 + lv * 12) * mult) });
  return [
    { id: 'kill', type: 'kills', label: 'Matar monstros', target: 6 + Math.floor(lv / 3), progress: 0, done: false, reward: reward(1) },
    { id: 'gather', type: 'gathered', label: 'Coletar recursos', target: 10 + Math.floor(lv / 2), progress: 0, done: false, reward: reward(1) },
    { id: 'enhance', type: 'enhanceTries', label: 'Aprimorar uma peça', target: 1, progress: 0, done: false, reward: reward(1.5) }
  ];
}

export class Achievements {
  constructor(saved = {}) {
    const n = (v) => Math.max(0, Math.floor(Number(v) || 0));
    this.stats = {};
    for (const id of STAT_IDS) this.stats[id] = n(saved?.stats?.[id]);
    this.unlocked = {};
    for (const id of Object.keys(saved?.unlocked ?? {})) if (ACHIEVEMENT_BY_ID[id]) this.unlocked[id] = true;
    this.title = ACHIEVEMENT_BY_ID[saved?.title] && this.unlocked[saved.title] ? saved.title : null;
    this.daily = { day: n(saved?.daily?.day), quests: [] };
    if (Array.isArray(saved?.daily?.quests)) {
      this.daily.quests = saved.daily.quests.slice(0, 3).map((q) => ({
        id: String(q.id), type: String(q.type), label: String(q.label ?? q.id), target: Math.max(1, n(q.target)),
        progress: n(q.progress), done: Boolean(q.done), reward: { coins: n(q.reward?.coins), xp: n(q.reward?.xp) }
      }));
    }
  }

  /** Novo dia de jogo: sorteia três missões novas. Devolve true se trocou. */
  refreshDaily(day, level) {
    if (this.daily.day === day && this.daily.quests.length === 3) return false;
    this.daily = { day, quests: makeDailyQuests(day, level) };
    return true;
  }

  /** Conta um evento (kills, gathered, enhanceTries...). Devolve as diárias que acabaram de ser concluídas. */
  note(type, amount = 1) {
    const add = Math.max(0, Math.floor(Number(amount) || 0));
    if (add <= 0) return [];
    if (type in this.stats) this.stats[type] += add;
    const finished = [];
    for (const q of this.daily.quests) {
      if (q.type !== type || q.done) continue;
      q.progress = Math.min(q.target, q.progress + add);
      if (q.progress >= q.target) {
        q.done = true;
        this.stats.dailies += 1;
        finished.push(q);
      }
    }
    return finished;
  }

  noteEnhance(upgrade, success) {
    const done = this.note('enhanceTries');
    if (success) {
      this.note('enhances');
      this.stats.maxEnhance = Math.max(this.stats.maxEnhance, upgrade);
    }
    return done;
  }

  /** Valor atual de um contador, juntando o que é calculado na hora (nível, conjuntos, bestiário). */
  value(stat, ctx = {}) {
    if (stat === 'level') return ctx.level ?? 1;
    if (stat === 'sets') return ctx.sets ?? 0;
    if (stat === 'bestiary') return ctx.bestiary ?? 0;
    return this.stats[stat] ?? 0;
  }

  /** Confere tudo e devolve as conquistas recém-liberadas. */
  check(ctx = {}) {
    const fresh = [];
    for (const a of ACHIEVEMENTS) {
      if (this.unlocked[a.id]) continue;
      if (this.value(a.stat, ctx) >= goalOf(a, ctx)) {
        this.unlocked[a.id] = true;
        fresh.push(a);
      }
    }
    return fresh;
  }

  get count() { return Object.keys(this.unlocked).length; }

  setTitle(id) {
    if (id === null || id === '') { this.title = null; return { ok: true }; }
    if (!this.unlocked[id]) return { ok: false, message: 'Conquista ainda não liberada.' };
    this.title = id;
    return { ok: true };
  }

  get titleName() { return this.title ? ACHIEVEMENT_BY_ID[this.title].title : ''; }

  serialize() {
    return { stats: { ...this.stats }, unlocked: { ...this.unlocked }, title: this.title, daily: JSON.parse(JSON.stringify(this.daily)) };
  }
}

/** Conjuntos com as 4 peças de armadura (elmo, peitoral, calças, botas) guardadas ou equipadas. */
export function completedSets(itemIds, gearItems) {
  const have = new Set(itemIds);
  const slots = ['helmet', 'chest', 'legs', 'boots'];
  const sets = {};
  for (const id of have) {
    const def = gearItems[id];
    if (def?.set && slots.includes(def.slot)) (sets[def.set] ??= new Set()).add(def.slot);
  }
  return Object.values(sets).filter((s) => s.size === slots.length).length;
}
