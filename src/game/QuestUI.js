import { BUILDING_DEFS } from '../data/buildings.js';
import { FARM_CROPS, ANIMAL_PRODUCTS, FORGE_RECIPES } from '../data/buildingSystems.js';
import { CAMPAIGN_TITLE, CHAPTERS, LORE, MISSIONS, MISSIONS_BY_ID, NPCS, REGIONS, SEALS, SITES } from '../data/campaign.js';
import { ENEMY_TYPES } from '../data/enemies.js';
import { RESOURCE_TYPES } from './config.js';
import { resourceIconHtml, textureUrl } from './iconUrls.js';

const escapeHtml = (value) => String(value)
  .replaceAll('&', '&#38;').replaceAll('<', '&#60;').replaceAll('>', '&#62;').replaceAll('"', '&#34;');

// Nome legível de inimigos de missão (etiqueta) e de espécies.
const TAG_NAMES = Object.fromEntries(Object.values(SITES).flatMap((site) => [
  ...(site.enemies ? [[site.enemies.tag, site.enemies.name]] : []),
  ...(site.boss ? [[site.boss.tag, site.boss.name]] : [])
]));

const STATE_LABEL = { locked: 'BLOQUEADA', available: 'DISPONÍVEL', active: 'ATIVA', done: 'CONCLUÍDA' };

/** Interface da campanha: Diário, rastreador, diálogos, avisos e recompensas (HTML sobre o jogo). */
export class QuestUI {
  constructor(scene, campaign) {
    this.scene = scene;
    this.campaign = campaign;
    this.tab = 'campaign';
    this.chapter = null;
    this.selected = null;
    this.root = document.getElementById('game');
    this.build();
  }

  get state() {
    return this.campaign.state;
  }

  build() {
    const make = (tag, className, html = '') => {
      const element = document.createElement(tag);
      element.className = className;
      element.innerHTML = html;
      this.root.appendChild(element);
      return element;
    };
    this.tracker = make('aside', 'quest-tracker');
    this.tracker.addEventListener('click', () => this.toggleJournal());
    this.toasts = make('div', 'quest-toasts');
    this.journal = make('section', 'quest-journal', '');
    this.journal.hidden = true;
    this.journal.setAttribute('role', 'dialog');
    this.journal.addEventListener('click', (event) => this.handleJournalClick(event));
    this.dialog = make('section', 'quest-dialog');
    this.dialog.hidden = true;
    this.reward = make('section', 'quest-reward');
    this.reward.hidden = true;
    this.reward.addEventListener('click', (event) => {
      if (event.target.closest('button')) this.reward.hidden = true;
    });
    this.refreshTracker();
  }

  destroy() {
    for (const element of [this.tracker, this.toasts, this.journal, this.dialog, this.reward]) element?.remove();
  }

  get isOpen() {
    return !this.journal.hidden;
  }

  /** Diário, conversa ou tela de missão concluída abertos: o jogo pausa. */
  get isBlocking() {
    return !this.journal.hidden || !this.dialog.hidden || !this.reward.hidden;
  }

  closeReward() {
    this.reward.hidden = true;
  }

  // ---------- Textos ----------

  enemyName(target) {
    if (target === 'any') return 'criaturas';
    if (target === 'elite') return 'inimigos elite';
    return TAG_NAMES[target] ?? ENEMY_TYPES[target]?.name ?? target;
  }

  siteName(target) {
    return SITES[target]?.name ?? NPCS[target]?.name ?? target;
  }

  objectiveLabel(objective) {
    const item = (type) => RESOURCE_TYPES[type]?.label ?? type;
    const region = objective.region === 'noite' ? ' à noite' : objective.region ? ` (${REGIONS[objective.region]?.name})` : '';
    switch (objective.type) {
      case 'gather': return `Obter ${item(objective.target)}`;
      case 'structure': return objective.target === 'chest' ? 'Abrir baús' : objective.target === 'mushroom' ? 'Colher cogumelos' : `Coletar ${objective.target}`;
      case 'kill': return `Derrotar ${this.enemyName(objective.target)}${region}`;
      case 'boss': return `Derrotar ${this.enemyName(objective.target)}`;
      case 'bossPhase': return `Levar ${this.enemyName(objective.target)} a ${Math.round(objective.ratio * 100)}% da vida`;
      case 'owns': return `Forjar ${FORGE_RECIPES[objective.target[0]]?.name ?? 'equipamento'}${objective.target.length > 1 ? ' (ou melhor)' : ''}`;
      case 'craft': return objective.target === 'torch' ? 'Fabricar tocha na Fogueira' : `Fabricar ${objective.target}`;
      case 'building': return `${BUILDING_DEFS[objective.target]?.name ?? objective.target} nível ${objective.level}`;
      case 'animal': return `Liberar: ${ANIMAL_PRODUCTS[objective.target]?.animal ?? objective.target} na Fazenda`;
      case 'plant': return `Plantar ${objective.target === 'any' ? 'sementes' : FARM_CROPS[objective.target]?.name ?? objective.target}`;
      case 'harvest': return `Colher ${objective.target === 'any' ? 'plantações' : FARM_CROPS[objective.target]?.name ?? objective.target}`;
      case 'buy': return 'Comprar no Mercado';
      case 'sell': return 'Vender no Mercado';
      case 'deliver': return `Entregar ${item(objective.target)}`;
      case 'reach': return `Chegar a: ${this.siteName(objective.target)}`;
      case 'interact': return `Investigar: ${this.siteName(objective.target)}`;
      case 'rescue': return `Resgatar: ${SITES[objective.target]?.name ?? objective.target}`;
      case 'talk': return `Conversar: ${this.siteName(objective.target)}`;
      case 'puzzle': return 'Ativar os pilares na ordem certa';
      case 'defend': return `Resistir no ${this.siteName(objective.target)} (segundos)`;
      case 'flag': return 'Preparação concluída';
      case 'seals': return 'Selos elementais';
      case 'choice': return 'Tomar a decisão final';
      case 'residents': return 'Moradores no acampamento';
      default: return objective.type;
    }
  }

  rewardHtml(rewards = {}) {
    const chips = [];
    if (rewards.xp) chips.push(`<span class="quest-chip quest-chip--xp">+${rewards.xp} XP</span>`);
    if (rewards.coins) chips.push(`<span class="quest-chip">${resourceIconHtml(this.scene, 'coins', 16)}+${rewards.coins}</span>`);
    for (const [type, amount] of Object.entries(rewards.items ?? {})) {
      chips.push(`<span class="quest-chip">${resourceIconHtml(this.scene, type, 16)}${amount} ${escapeHtml(RESOURCE_TYPES[type]?.label ?? type)}</span>`);
    }
    return chips.join('');
  }

  // ---------- Rastreador ----------

  refreshTracker() {
    const state = this.state;
    const ctx = this.campaign.ctx;
    const tracked = state.tracked ? MISSIONS_BY_ID[state.tracked] : null;
    const available = state.availableMissions()[0];
    if (!tracked) {
      this.tracker.innerHTML = available
        ? `<p class="quest-tracker__kicker">Capítulo ${available.chapter} • nova missão</p><h3>${escapeHtml(available.title)}</h3><p class="quest-tracker__hint">L ou toque aqui para aceitar</p>`
        : `<p class="quest-tracker__kicker">${escapeHtml(CAMPAIGN_TITLE)}</p><h3>Campanha concluída</h3><p class="quest-tracker__hint">L • Diário e diárias</p>`;
      return;
    }
    const lines = tracked.objectives.map((objective, index) => {
      const value = state.objectiveValue(tracked, index, ctx);
      const count = objective.count ?? 1;
      const done = value >= count;
      return `<li class="${done ? 'is-done' : ''}">${done ? '✔' : '•'} ${escapeHtml(this.objectiveLabel(objective))} <b>${Math.floor(value)}/${count}</b></li>`;
    }).join('');
    const ready = state.isComplete(tracked, ctx);
    const target = this.campaign.trackedTarget();
    const route = target
      ? `<p class="quest-tracker__route">${target.steps <= 5 ? 'Você chegou' : `Rumo ${target.direction} • ${target.steps} passos`}: ${escapeHtml(target.name)}</p>`
      : '';
    this.tracker.innerHTML = `
      <p class="quest-tracker__kicker">Capítulo ${tracked.chapter} • missão ${tracked.number}/100</p>
      <h3>${escapeHtml(tracked.title)}</h3>
      <ul>${lines}</ul>
      ${route}
      ${ready ? `<p class="quest-tracker__ready">Pronta! Entregue a ${escapeHtml(NPCS[tracked.npc]?.name ?? 'pelo Diário')}</p>` : ''}`;
  }

  // ---------- Diário ----------

  toggleJournal(force) {
    const open = force ?? this.journal.hidden;
    this.journal.hidden = !open;
    if (open) {
      const focus = this.state.tracked ?? this.state.currentMission?.id ?? MISSIONS[MISSIONS.length - 1].id;
      this.selected ??= focus;
      this.chapter ??= MISSIONS_BY_ID[this.selected]?.chapter ?? 1;
      this.renderJournal();
    }
  }

  refresh() {
    this.refreshTracker();
    if (this.isOpen) this.renderJournal();
  }

  renderJournal() {
    const state = this.state;
    const current = state.currentChapter;
    const tabs = [['campaign', 'Campanha'], ['daily', 'Diárias'], ['records', 'Registros']]
      .map(([id, label]) => `<button type="button" data-q-tab="${id}" aria-selected="${this.tab === id}">${label}</button>`).join('');
    let body = '';
    if (this.tab === 'campaign') body = this.renderCampaign(current);
    else if (this.tab === 'daily') body = this.renderDaily();
    else body = this.renderRecords();
    this.journal.innerHTML = `
      <div class="quest-journal__window">
        <header class="quest-journal__header">
          <img class="pixel-icon" src="${textureUrl(this.scene, 'hud-journal')}" width="48" height="48" alt="">
          <div>
            <p class="quest-journal__kicker">LENDAS RPG • ${escapeHtml(CAMPAIGN_TITLE)}</p>
            <h2>Diário de Missões</h2>
            <p class="quest-journal__progress">Capítulo ${current}: ${escapeHtml(CHAPTERS[current - 1].title)} • ${state.completedCount}/100 concluídas</p>
          </div>
          <button type="button" class="panel-close" data-q-close>FECHAR</button>
        </header>
        <nav class="quest-journal__tabs">${tabs}</nav>
        <div class="quest-journal__body">${body}</div>
      </div>`;
  }

  renderCampaign(current) {
    const state = this.state;
    const chapters = CHAPTERS.map((chapter) => `
      <button type="button" data-q-chapter="${chapter.number}" aria-selected="${this.chapter === chapter.number}" ${chapter.number > current ? 'disabled' : ''}>
        ${chapter.number}
      </button>`).join('');
    const list = MISSIONS.filter((mission) => mission.chapter === this.chapter).map((mission) => {
      const status = state.stateOf(mission.id);
      return `
        <button type="button" class="quest-item quest-item--${status}" data-q-mission="${mission.id}" aria-selected="${this.selected === mission.id}" ${status === 'locked' ? 'disabled' : ''}>
          <span class="quest-item__number">${mission.number}</span>
          <span class="quest-item__title">${status === 'locked' ? '???' : escapeHtml(mission.title)}</span>
          <span class="quest-item__state">${STATE_LABEL[status]}</span>
        </button>`;
    }).join('');
    return `
      <div class="quest-campaign">
        <div class="quest-campaign__list">
          <div class="quest-chapters" aria-label="Capítulos">${chapters}</div>
          <p class="quest-chapter-title">${escapeHtml(CHAPTERS[this.chapter - 1].title)}</p>
          ${list}
        </div>
        <div class="quest-campaign__detail">${this.renderDetail()}</div>
      </div>`;
  }

  renderDetail() {
    const mission = MISSIONS_BY_ID[this.selected];
    if (!mission) return '<p>Escolha uma missão.</p>';
    const state = this.state;
    const status = state.stateOf(mission.id);
    if (status === 'locked') return '<p>Conclua as missões anteriores para liberar esta.</p>';
    const ctx = this.campaign.ctx;
    const npc = NPCS[mission.npc];
    const objectives = mission.objectives.map((objective, index) => {
      const value = status === 'done' ? objective.count ?? 1 : state.objectiveValue(mission, index, ctx);
      const count = objective.count ?? 1;
      const ratio = Math.min(1, value / count);
      return `
        <li class="${ratio >= 1 ? 'is-done' : ''}">
          <span>${escapeHtml(this.objectiveLabel(objective))}</span>
          <b>${Math.floor(value)}/${count}</b>
          <i style="--progress:${Math.round(ratio * 100)}%"></i>
        </li>`;
    }).join('');
    const canTurnIn = state.canTurnIn(mission.id, ctx);
    const buttons = [
      status === 'available' ? `<button type="button" class="button--primary" data-q-accept="${mission.id}">ACEITAR MISSÃO</button>` : '',
      canTurnIn ? `<button type="button" class="button--primary" data-q-turnin="${mission.id}">ENTREGAR E RECEBER</button>` : '',
      status === 'active' && state.tracked !== mission.id ? `<button type="button" data-q-track="${mission.id}">RASTREAR</button>` : ''
    ].join('');
    return `
      <article class="quest-detail">
        <div class="quest-detail__head">
          ${npc ? `<img class="pixel-icon quest-portrait" src="${textureUrl(this.scene, `npc-${mission.npc}-0`)}" alt="">` : ''}
          <div>
            <p class="quest-detail__kicker">Missão ${mission.number} • ${escapeHtml(REGIONS[mission.region]?.name ?? '')} • ${STATE_LABEL[status]}</p>
            <h3>${escapeHtml(mission.title)}</h3>
            ${npc ? `<p class="quest-detail__npc">${escapeHtml(npc.name)}</p>` : ''}
          </div>
        </div>
        <p class="quest-detail__text">${escapeHtml(mission.description)}</p>
        <h4>Objetivos</h4>
        <ul class="quest-objectives">${objectives}</ul>
        <h4>Recompensas</h4>
        <div class="quest-rewards">${this.rewardHtml(mission.rewards)}</div>
        <div class="quest-actions">${buttons}</div>
      </article>`;
  }

  renderDaily() {
    const state = this.state;
    if (!state.dailiesUnlocked) return '<p class="quest-empty">As missões diárias são liberadas depois da missão 10 (O Uivo do Primeiro Monstro).</p>';
    const ctx = this.campaign.ctx;
    const rows = state.daily.list.map((daily, index) => {
      const template = state.dailyTemplate(daily);
      const value = state.dailyValue(daily, ctx);
      const count = template.objective.count;
      return `
        <article class="quest-detail quest-daily ${daily.rewarded ? 'is-claimed' : ''}">
          <h3>${escapeHtml(template.title)}</h3>
          <ul class="quest-objectives"><li class="${value >= count ? 'is-done' : ''}"><span>${escapeHtml(this.objectiveLabel(template.objective))}</span><b>${Math.min(value, count)}/${count}</b><i style="--progress:${Math.round(Math.min(1, value / count) * 100)}%"></i></li></ul>
          <div class="quest-rewards">${this.rewardHtml(template.rewards)}</div>
          <div class="quest-actions">${daily.rewarded ? '<span class="quest-chip">RECEBIDA</span>' : `<button type="button" class="button--primary" data-q-daily="${index}" ${state.canClaimDaily(index, ctx) ? '' : 'disabled'}>RECEBER</button>`}</div>
        </article>`;
    }).join('');
    return `<p class="quest-chapter-title">Dia ${state.daily.day} • renovam a cada amanhecer</p><div class="quest-daily-grid">${rows}</div>`;
  }

  renderRecords() {
    const state = this.state;
    const seals = Object.entries(SEALS).map(([id, seal]) => `
      <div class="quest-seal ${state.seals.includes(id) ? 'is-found' : ''}">
        <img class="pixel-icon" src="${textureUrl(this.scene, `resource-code-${seal.icon}`) || ''}" width="40" height="40" alt="">
        <span>${escapeHtml(seal.name)}</span>
      </div>`).join('');
    const npcs = Object.keys(NPCS).filter((id) => this.campaign.npcInCamp(id)).map((id) => `
      <div class="quest-npc"><img class="pixel-icon" src="${textureUrl(this.scene, `npc-${id}-0`)}" alt=""><span>${escapeHtml(NPCS[id].name)}</span></div>`).join('');
    const lore = state.lore.map((key) => LORE[key]).filter(Boolean).map((entry) => `
      <article class="quest-lore"><h4>${escapeHtml(entry.title)}</h4><p>${escapeHtml(entry.text)}</p></article>`).join('') || '<p class="quest-empty">Nenhum registro ainda.</p>';
    return `
      <h4 class="quest-section">Selos elementais (${state.seals.length}/5)</h4>
      <div class="quest-seals">${seals}</div>
      <h4 class="quest-section">Moradores • ${state.residents + 1} no acampamento${state.choice ? ` • Decisão: ${state.choice === 'restore' ? 'restaurar o guardião' : 'destruir o Golem'}` : ''}</h4>
      <div class="quest-npcs">${npcs}</div>
      <h4 class="quest-section">Registros da história</h4>
      ${lore}`;
  }

  handleJournalClick(event) {
    const button = event.target.closest('button');
    if (!button || button.disabled) return;
    const data = button.dataset;
    if ('qClose' in data) { this.toggleJournal(false); return; }
    if (data.qTab) this.tab = data.qTab;
    if (data.qChapter) {
      this.chapter = Number(data.qChapter);
      this.selected = MISSIONS.find((mission) => mission.chapter === this.chapter && this.state.stateOf(mission.id) !== 'locked')?.id ?? this.selected;
    }
    if (data.qMission) this.selected = data.qMission;
    if (data.qAccept) this.campaign.accept(data.qAccept);
    if (data.qTurnin) this.campaign.turnIn(data.qTurnin);
    if (data.qTrack) this.state.tracked = data.qTrack;
    if (data.qDaily) this.campaign.claimDaily(Number(data.qDaily));
    this.refresh();
  }

  // ---------- Diálogo ----------

  /** Caixa de diálogo com retrato. options: [{label, action, primary?, disabled?}] */
  dialogue(npcId, text, options = [], { title = null, keepOpen = false } = {}) {
    const npc = npcId ? NPCS[npcId] : null;
    const portrait = npc ? textureUrl(this.scene, `npc-${npcId}-0`) : '';
    this.dialogOptions = options;
    this.dialog.innerHTML = `
      <div class="quest-dialog__box">
        ${portrait ? `<img class="pixel-icon quest-portrait quest-portrait--big" src="${portrait}" alt="">` : ''}
        <div class="quest-dialog__text">
          <h3>${escapeHtml(npc?.name ?? title ?? 'Eldoria')}</h3>
          <p>${escapeHtml(text)}</p>
          <div class="quest-actions">
            ${options.map((option, index) => `<button type="button" class="${option.primary ? 'button--primary' : ''}" data-dialog="${index}" ${option.disabled ? 'disabled' : ''}>${escapeHtml(option.label)}</button>`).join('')}
          </div>
        </div>
      </div>`;
    this.dialog.hidden = false;
    this.dialog.onclick = (event) => {
      const button = event.target.closest('button[data-dialog]');
      if (!button || button.disabled) return;
      const option = this.dialogOptions[Number(button.dataset.dialog)];
      if (!keepOpen || option?.label === 'SAIR') this.dialog.hidden = true;
      option?.action?.();
      if (keepOpen && option?.label === 'SAIR') this.dialog.hidden = true;
    };
  }

  closeDialogue() {
    this.dialog.hidden = true;
  }

  // ---------- Avisos e recompensa ----------

  toast(text, tone = '') {
    const item = document.createElement('div');
    item.className = `quest-toast ${tone ? `quest-toast--${tone}` : ''}`;
    item.textContent = text;
    this.toasts.appendChild(item);
    while (this.toasts.children.length > 4) this.toasts.firstChild.remove();
    window.setTimeout(() => item.classList.add('is-leaving'), 2600);
    window.setTimeout(() => item.remove(), 3200);
  }

  showReward(mission, rewards, lore) {
    this.reward.innerHTML = `
      <div class="quest-reward__card">
        <p class="quest-reward__kicker">MISSÃO CONCLUÍDA • ${mission.number}/100</p>
        <h2>${escapeHtml(mission.title)}</h2>
        ${mission.outro ? `<p class="quest-reward__text">${escapeHtml(mission.outro)}</p>` : ''}
        ${lore ? `<p class="quest-reward__lore"><b>${escapeHtml(lore.title)}:</b> ${escapeHtml(lore.text)}</p>` : ''}
        <div class="quest-rewards">${this.rewardHtml(rewards)}</div>
        <button type="button" class="button--primary">CONTINUAR</button>
      </div>`;
    this.reward.hidden = false;
    this.reward.querySelector('button')?.focus({ preventScroll: true });
  }
}
