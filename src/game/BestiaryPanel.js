import { ENEMY_TYPES } from '../data/enemies.js';
import { RARITY_LABELS, dropRarity, scaleEnemy } from '../data/enemyScaling.js';
import { RESOURCE_TYPES } from './config.js';
import { drawEnemyFrame, enemyCanvasSize } from './EnemyVisual.js';
import { BESTIARY_ORDER, habitatsOf } from './Bestiary.js';

// Painel do Bestiário (tecla K ou botão no Diário).

const portraitCache = new Map();

/** Retrato do monstro (data URL) desenhado com a mesma arte do jogo. */
export function monsterPortrait(kind) {
  if (portraitCache.has(kind)) return portraitCache.get(kind);
  const size = enemyCanvasSize(kind, false);
  const pixels = drawEnemyFrame(kind, size, 0, false);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  canvas.getContext('2d').putImageData(new ImageData(pixels.data, size, size), 0, 0);
  const url = canvas.toDataURL();
  portraitCache.set(kind, url);
  return url;
}

const escapeHtml = (text) => String(text).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

export class BestiaryPanel {
  constructor(scene) {
    this.scene = scene;
    this.root = document.createElement('div');
    this.root.className = 'bestiary';
    this.root.hidden = true;
    this.selected = null;
    (document.getElementById('game') ?? document.body).appendChild(this.root);
    this.root.addEventListener('click', (event) => {
      const close = event.target.closest('[data-bestiary-close]');
      if (close || event.target === this.root) {
        this.close();
        return;
      }
      const card = event.target.closest('[data-kind]');
      if (card) {
        this.selected = card.dataset.kind;
        this.render();
      }
    });
  }

  get isOpen() {
    return !this.root.hidden;
  }

  open() {
    this.root.hidden = false;
    this.render();
  }

  close() {
    this.root.hidden = true;
  }

  toggle() {
    if (this.isOpen) this.close();
    else this.open();
  }

  render() {
    const bestiary = this.scene.bestiary;
    const { known, total } = bestiary.progress;
    const selected = this.selected && bestiary.known(this.selected) ? this.selected : BESTIARY_ORDER.find((kind) => bestiary.known(kind));
    const cards = BESTIARY_ORDER.map((kind) => {
      const definition = ENEMY_TYPES[kind];
      const isKnown = bestiary.known(kind);
      return `<button type="button" class="bestiary__card ${isKnown ? '' : 'is-unknown'} ${kind === selected ? 'is-selected' : ''} ${definition.boss ? 'is-boss' : ''}" data-kind="${kind}" ${isKnown ? '' : 'disabled'}>
        <img class="pixel-icon" src="${monsterPortrait(kind)}" alt="">
        <span>${isKnown ? escapeHtml(definition.name) : '???'}</span>
      </button>`;
    }).join('');
    this.root.innerHTML = `
      <div class="bestiary__panel" role="dialog" aria-label="Bestiário">
        <header class="bestiary__head">
          <h2>BESTIÁRIO</h2>
          <span>${known}/${total} espécies</span>
          <button type="button" class="bestiary__close" data-bestiary-close aria-label="Fechar">×</button>
        </header>
        <div class="bestiary__body">
          <div class="bestiary__grid">${cards}</div>
          <div class="bestiary__detail">${selected ? this.detailHtml(selected) : '<p class="bestiary__empty">Derrote monstros para registrá-los aqui.</p>'}</div>
        </div>
      </div>`;
  }

  detailHtml(kind) {
    const definition = ENEMY_TYPES[kind];
    const kills = this.scene.bestiary.kills[kind] ?? 0;
    const period = definition.boss ? 'Chefe' : definition.period === 'night' ? 'Noturno' : 'Diurno';
    const stats = scaleEnemy(definition, definition.level ?? 1);
    const drops = [...definition.drops]
      .sort((a, b) => b.chance - a.chance)
      .map((drop) => {
        const rarity = dropRarity(drop.chance);
        return `<li class="bestiary__drop bestiary__drop--${rarity}">${escapeHtml(RESOURCE_TYPES[drop.type]?.label ?? drop.type)} <small>${RARITY_LABELS[rarity]}</small></li>`;
      }).join('');
    const habitats = habitatsOf(kind).map((place) => `<li>${escapeHtml(place)}</li>`).join('');
    return `
      <img class="pixel-icon bestiary__portrait" src="${monsterPortrait(kind)}" alt="">
      <h3>${escapeHtml(definition.name)}</h3>
      <p class="bestiary__tag">${period} • Nível ${stats.level} • Perigo ${definition.tier}</p>
      <dl class="bestiary__stats">
        <div><dt>VIDA</dt><dd>${stats.health}</dd></div>
        <div><dt>DANO</dt><dd>${stats.damage}</dd></div>
        <div><dt>XP</dt><dd>${stats.xp}</dd></div>
        <div><dt>ABATES</dt><dd>${kills}</dd></div>
      </dl>
      <h4>DEIXA CAIR</h4><ul>${drops || '<li>Nada</li>'}</ul>
      <h4>ONDE VIVE</h4><ul>${habitats || '<li>Missões especiais</li>'}</ul>`;
  }

  destroy() {
    this.root.remove();
  }
}
