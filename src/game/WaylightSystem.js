import Phaser from 'phaser';
import { WAYLIGHTS, WAYLIGHTS_BY_REGION, WaylightTracker, WAYLIGHT_BONUS_XP } from '../data/waylights.js';
import { RESOURCE_TYPES } from './config.js';

// Farol (Waylight) de cada região: acender com recursos dá +10% XP na região,
// afasta encontros de estrada e ilumina a noite. Interação com E perto do farol apagado.

export class WaylightSystem {
  constructor(scene, saved) {
    this.scene = scene;
    this.tracker = new WaylightTracker(saved);
    this.items = new Map(); // region -> { pillar, flame, hint }
    for (const w of WAYLIGHTS) {
      const pillar = scene.add.rectangle(w.x, w.y - 14, 12, 30, 0x6b6f73).setOrigin(0.5, 1).setDepth(w.y + 10);
      const flame = scene.add.text(w.x, w.y - 40, '🔥', { fontSize: '18px' })
        .setOrigin(0.5).setDepth(w.y + 12).setVisible(false);
      const hint = scene.add.text(w.x, w.y - 64, '', {
        fontFamily: 'Press Start 2P', fontSize: '8px', color: '#ffe9a8',
        backgroundColor: '#14161ee0', padding: { x: 6, y: 4 }, align: 'center'
      }).setOrigin(0.5).setDepth(w.y + 40).setVisible(false);
      this.items.set(w.region, { w, pillar, flame, hint });
    }
    this.sync();
  }

  sync() {
    for (const [region, item] of this.items) {
      const lit = this.tracker.isLit(region);
      item.flame.setVisible(lit);
      item.pillar.setFillStyle(lit ? 0xd8b25a : 0x6b6f73);
    }
  }

  nearestUnlit(x, y, range = 100) {
    for (const [region, item] of this.items) {
      if (this.tracker.isLit(region)) continue;
      if (Math.hypot(item.w.x - x, item.w.y - y) <= range) return item;
    }
    return null;
  }

  /** E perto de um farol apagado: tenta acender pagando o custo. Devolve true se interagiu. */
  interact(player) {
    const item = this.nearestUnlit(player.x, player.y);
    if (!item) return false;
    const scene = this.scene;
    const { w } = item;
    if (scene.camp?.canPay?.(w.cost) === false && !scene.payCost?.(w.cost)) {
      scene.ui?.showMessage(`Farol apagado: faltam recursos (${formatCost(w.cost)}).`);
      return true;
    }
    if (!scene.payCost(w.cost)) {
      scene.ui?.showMessage(`Farol apagado: faltam recursos (${formatCost(w.cost)}).`);
      return true;
    }
    this.tracker.light(w.region);
    this.sync();
    scene.showEpic?.('🔥 FAROL ACESO', `${w.name}: +${Math.round(WAYLIGHT_BONUS_XP * 100)}% XP nesta região e menos encontros na estrada!`, 4200);
    scene.effects?.spawnHarvest(w.x, w.y - 30, 0xffd76b);
    scene.audio?.playLevelUp?.();
    scene.ui?.showMessage(`Faróis acesos: ${this.tracker.count}/${this.tracker.total}`);
    scene.save?.();
    return true;
  }

  update(delta) {
    const scene = this.scene;
    const player = scene.player;
    if (!player) return;
    const t = scene.time.now;
    for (const [region, item] of this.items) {
      const near = Math.hypot(item.w.x - player.x, item.w.y - player.y) < 240;
      const lit = this.tracker.isLit(region);
      if (lit) item.flame.setScale(1 + Math.sin(t / 160 + item.w.x) * 0.12);
      const showHint = near && !lit;
      item.hint.setVisible(showHint);
      if (showHint) item.hint.setText(`ACENDER FAROL\n${formatCost(item.w.cost)}`);
    }
  }

  /** Fontes de luz à noite para o sistema de iluminação. */
  lightSources() {
    const out = [];
    for (const [region, item] of this.items) {
      if (this.tracker.isLit(region)) out.push({ x: item.w.x, y: item.w.y - 20, radius: 170, kind: 'waylight' });
    }
    return out;
  }

  mapMarkers() {
    return WAYLIGHTS.map((w) => ({ x: w.x, y: w.y, type: 'waylight', lit: this.tracker.isLit(w.region) }));
  }

  serialize() { return this.tracker.serialize(); }
}

function formatCost(cost) {
  return Object.entries(cost).map(([type, amount]) => `${amount} ${RESOURCE_TYPES[type]?.label.toLowerCase() ?? type}`).join(', ');
}
