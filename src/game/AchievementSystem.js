import { ACHIEVEMENTS, Achievements, completedSets, goalOf } from '../data/achievements.js';
import { GEAR_ITEMS } from '../data/gear.js';
import { OVERLAY_DEPTH } from './depths.js';

// Parte da cena das conquistas e missões diárias: ouve os eventos, paga recompensas, mostra o título sob o herói e o painel (tecla T).

const escapeHtml = (text) => String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export class AchievementSystem {
  constructor(scene, saved) {
    this.scene = scene;
    this.state = new Achievements(saved);
    this.titleText = null;
    this.root = document.createElement('div');
    this.root.className = 'bestiary achievements';
    this.root.hidden = true;
    (document.getElementById('game') ?? document.body).appendChild(this.root);
    this.root.addEventListener('click', (event) => {
      if (event.target === this.root || event.target.closest('[data-ach-close]')) { this.close(); return; }
      const pick = event.target.closest('[data-ach-title]');
      if (pick) {
        this.state.setTitle(pick.dataset.achTitle === this.state.title ? null : pick.dataset.achTitle);
        this.syncTitle();
        this.scene.save?.();
        this.render();
      }
    });
  }

  get isOpen() { return !this.root.hidden; }
  open() { this.root.hidden = false; this.render(); }
  close() { this.root.hidden = true; }
  toggle() { if (this.isOpen) this.close(); else this.open(); }
  destroy() { this.root.remove(); this.titleText?.destroy(); }

  context() {
    const scene = this.scene;
    const ids = scene.gear ? scene.gear.bag.map((i) => i.id) : [];
    return {
      level: scene.progression?.level ?? 1,
      sets: completedSets(ids, GEAR_ITEMS),
      bestiary: scene.bestiary?.progress.known ?? 0,
      bestiaryTotal: scene.bestiary?.progress.total ?? 1
    };
  }

  /** Dia novo: sorteia as três missões. */
  refreshDaily() {
    return this.state.refreshDaily(this.scene.timeState?.dayCount ?? 1, this.scene.progression?.level ?? 1);
  }

  /** Evento do jogo: kills, bosses, coins, gathered. */
  note(type, amount = 1) {
    this.pay(this.state.note(type, amount));
    this.checkAchievements();
  }

  onGather(bundle = {}) {
    const total = Object.values(bundle).reduce((sum, n) => sum + (Number(n) > 0 ? Number(n) : 0), 0);
    if (total > 0) this.note('gathered', total);
  }

  onEnhance(result) {
    if (!result?.ok) return;
    this.pay(this.state.noteEnhance(result.upgrade, result.success));
    this.checkAchievements();
  }

  pay(finished) {
    const scene = this.scene;
    for (const q of finished) {
      scene.economy?.addCoins(q.reward.coins);
      scene.ui?.showMessage(`Missão diária concluída: ${q.label}! +${q.reward.coins} moedas`);
      scene.grantExperience?.(q.reward.xp, false);
    }
    if (finished.length) scene.save?.();
  }

  checkAchievements() {
    const fresh = this.state.check(this.context());
    for (const a of fresh) {
      this.scene.ui?.showMessage(`Conquista: ${a.name} (título "${a.title}")`);
      if (!this.state.title) { this.state.title = a.id; this.syncTitle(); }
    }
    if (fresh.length) { this.scene.save?.(); if (this.isOpen) this.render(); }
    return fresh;
  }

  syncTitle() {
    const name = this.state.titleName;
    if (!name) { this.titleText?.destroy(); this.titleText = null; return; }
    if (!this.titleText) {
      this.titleText = this.scene.add.text(0, 0, name, { fontFamily: 'monospace', fontSize: '8px', color: '#ffe9a8', stroke: '#1c1426', strokeThickness: 3 }).setOrigin(0.5, 0).setDepth(OVERLAY_DEPTH + 9000);
      this.scene.hudCamera?.ignore(this.titleText);
    } else this.titleText.setText(name);
  }

  update() {
    if (this.titleText && this.scene.player) this.titleText.setPosition(this.scene.player.x, Math.round((this.scene.player.feetY?.() ?? this.scene.player.y + 6) + 2));
  }

  serialize() { return this.state.serialize(); }

  render() {
    const ctx = this.context();
    const st = this.state;
    const daily = st.daily.quests.map((q) => `<li class="${q.done ? 'is-done' : ''}"><b>${escapeHtml(q.label)}</b> ${q.progress}/${q.target}<small> +${q.reward.coins} moedas, +${q.reward.xp} XP</small></li>`).join('');
    const list = ACHIEVEMENTS.map((a) => {
      const done = Boolean(st.unlocked[a.id]);
      const goal = goalOf(a, ctx);
      const cur = Math.min(goal, st.value(a.stat, ctx));
      const action = done ? `<button type="button" data-ach-title="${a.id}" class="${st.title === a.id ? 'is-active' : ''}">${st.title === a.id ? 'Em uso' : 'Usar'}</button>` : '<em>bloqueada</em>';
      return `<li class="${done ? 'is-done' : ''}"><span><b>${escapeHtml(a.name)}</b><small>${done ? '' : `${cur}/${goal} • `}Título: ${escapeHtml(a.title)}</small></span>${action}</li>`;
    }).join('');
    this.root.innerHTML = `
      <div class="bestiary__panel" role="dialog" aria-label="Conquistas">
        <header class="bestiary__head"><h2>CONQUISTAS</h2><span>${st.count}/${ACHIEVEMENTS.length}</span><button type="button" class="bestiary__close" data-ach-close aria-label="Fechar">×</button></header>
        <div class="achievements__body"><h3>Missões do dia</h3><ul class="achievements__daily">${daily}</ul><h3>Conquistas</h3><ul class="achievements__list">${list}</ul></div>
      </div>`;
  }
}
