import Phaser from 'phaser';
import {
  CURIOSITIES, DiscoveryTracker, curiosityAt, rumourText
} from '../data/curiosities.js';
import { RESOURCE_TYPES } from './config.js';

// Curiosidades escondidas: descobertas andando perto (raio curto); rumores dão direção+distância.
// Ao descobrir: card épico, recompensa (moedas/XP/item) e marcos em 5/10/20.

export class CuriositySystem {
  constructor(scene, saved) {
    this.scene = scene;
    this.tracker = new DiscoveryTracker(saved);
    this.markers = new Map(); // id -> { star, q }
    this.rumourTimer = Phaser.Math.Between(30000, 60000);
    this.lastCounts = '';
    for (const c of CURIOSITIES) {
      const star = scene.add.text(c.x, c.y - 14, '✦', {
        fontFamily: 'Press Start 2P', fontSize: '14px', color: '#ffd76b',
        stroke: '#140f14', strokeThickness: 3
      }).setOrigin(0.5).setDepth(c.y + 30).setVisible(false);
      const q = scene.add.text(c.x, c.y - 14, '?', {
        fontFamily: 'Press Start 2P', fontSize: '12px', color: '#9fb4c8',
        stroke: '#140f14', strokeThickness: 3
      }).setOrigin(0.5).setDepth(c.y + 30).setVisible(false);
      this.markers.set(c.id, { star, q, c });
    }
    this.syncMarkers();
  }

  syncMarkers() {
    for (const [id, m] of this.markers) {
      const found = this.tracker.discovered.has(id);
      const rumoured = this.tracker.rumoured.has(id);
      m.star.setVisible(found);
      m.q.setVisible(!found && rumoured);
    }
    this.lastCounts = `${this.tracker.count}/${this.tracker.rumoured.size}`;
  }

  update(delta) {
    const scene = this.scene;
    const player = scene.player;
    if (!player) return;
    // Pulsa o brilho das descobertas.
    const t = scene.time.now;
    for (const [id, m] of this.markers) {
      if (this.tracker.discovered.has(id)) m.star.setAlpha(0.6 + Math.abs(Math.sin(t / 400 + m.c.x)) * 0.4);
    }
    if (!scene.regionWorld?.underground) {
      const found = curiosityAt(player.x, player.y, undefined, this.tracker.discovered);
      if (found) this.discover(found);
      // Rumor periódico: um NPC Comments a direção da curiosidade mais próxima.
      this.rumourTimer -= delta;
      if (this.rumourTimer <= 0) {
        this.rumourTimer = Phaser.Math.Between(45000, 90000);
        const next = this.tracker.nearestUnfound(player.x, player.y);
        if (next && Math.hypot(next.x - player.x, next.y - player.y) > 400 && !this.tracker.rumoured.has(next.id)) {
          this.tracker.rumour(next.id);
          scene.ui?.showMessage(`🗣️ Rumor: ${rumourText(player.x, player.y, next)}.`);
          this.syncMarkers();
        }
      }
    }
    const counts = `${this.tracker.count}/${this.tracker.rumoured.size}`;
    if (counts !== this.lastCounts) this.syncMarkers();
  }

  discover(c) {
    const scene = this.scene;
    const result = this.tracker.discover(c.id);
    if (!result.first) return;
    const reward = c.reward;
    scene.showEpic?.(c.name.toUpperCase(), `${c.sub} (+${reward.coins} moedas, +${reward.xp} XP)`, 3800);
    scene.economy?.addCoins(reward.coins);
    scene.grantExperience?.(reward.xp, true);
    if (reward.item && !scene.inventory?.add(reward.item, 1)) {
      scene.deathBackpacks?.create(c.x, c.y, { [reward.item]: 1 });
    } else if (reward.item) {
      scene.audio?.playCollect?.();
    }
    scene.achievements?.note('curiosities', 1);
    scene.achievements?.checkAchievements?.();
    if (result.milestone) {
      scene.showEpic?.('🏅 MARCO DE EXPLORAÇÃO', `${result.milestone.label} Bônus: +${result.milestone.coins} moedas, +${result.milestone.xp} XP`, 4200);
      scene.economy?.addCoins(result.milestone.coins);
      scene.grantExperience?.(result.milestone.xp, true);
    }
    this.syncMarkers();
    scene.save?.();
  }

  /** Marcadores para o mapa-múndi (estrela dourada = achada, ? = rumor). */
  mapMarkers() {
    return CURIOSITIES.map((c) => ({
      x: c.x, y: c.y, type: 'curiosity',
      found: this.tracker.discovered.has(c.id),
      rumoured: this.tracker.rumoured.has(c.id)
    }));
  }

  serialize() { return this.tracker.serialize(); }
}

export { RESOURCE_TYPES };
