import Phaser from 'phaser';
import { CAMP_INCIDENTS_BY_ID, CampIncidentState, rollIncident, incidentReward } from '../data/campIncidents.js';

// Incidente diário no acampamento (fogo num prédio, lobo no curral, morador ferido):
// marcador "!" pulsante; o herói resolve com E perto do marcador.

const RESOLVE_RANGE = 100;

export class CampIncidentSystem {
  constructor(scene, saved) {
    this.scene = scene;
    this.state = new CampIncidentState(saved);
    this.marker = null;
    this.tickMs = 0;
    this.refreshMarker();
  }

  /** Chamado no handleDayAdvance: sorteia o incidente do dia. */
  maybeSpawn(dayCount) {
    if (this.state.active) return;
    const scene = this.scene;
    const built = Object.keys(scene.camp?.buildings ?? {}).filter((key) => scene.camp.isBuilt(key) && key !== 'wall');
    const rolled = rollIncident(dayCount, Math.random, built);
    if (!rolled) return;
    this.state.start(rolled.def.id, rolled.target, dayCount);
    const def = CAMP_INCIDENTS_BY_ID[rolled.def.id];
    scene.ui?.showMessage(`🚨 ${def.name}! ${def.desc}`);
    scene.audio?.playRoar?.();
    this.refreshMarker();
    scene.save?.();
  }

  markerPos() {
    const scene = this.scene;
    const active = this.state.active;
    if (!active) return null;
    if (active.target && scene.camp?.buildings?.[active.target]?.sprite) {
      const s = scene.camp.buildings[active.target].sprite;
      return { x: s.x, y: s.y - 50 };
    }
    return { x: scene.camp.x + 80, y: scene.camp.y - 60 };
  }

  refreshMarker() {
    const scene = this.scene;
    this.marker?.destroy();
    this.marker = null;
    const pos = this.markerPos();
    if (!pos) return;
    this.marker = scene.add.text(pos.x, pos.y, '!', {
      fontFamily: 'Press Start 2P', fontSize: '22px', color: '#ff5a4a',
      stroke: '#140f14', strokeThickness: 4
    }).setOrigin(0.5).setDepth(5000);
  }

  update(delta) {
    const scene = this.scene;
    const active = this.state.active;
    if (this.marker) this.marker.setAlpha(0.5 + Math.abs(Math.sin(scene.time.now / 180)) * 0.5);
    if (!active) return;
    const def = CAMP_INCIDENTS_BY_ID[active.id];
    if (def?.id === 'fire' && active.target) {
      // O fogo consome a durabilidade do prédio 1x por segundo.
      this.tickMs += delta;
      if (this.tickMs >= 1000) {
        this.tickMs -= 1000;
        const destroyed = scene.camp.damageBuilding(active.target, def.durabilityPerSecond);
        if (destroyed) {
          scene.ui?.showMessage(`🔥 O prédio de ${active.target} foi consumido pelo fogo!`);
          this.state.clear();
          this.refreshMarker();
          scene.save?.();
        }
      }
    }
  }

  /** E perto do marcador: resolve o incidente. Devolve true se havia incidente por perto. */
  interact(player) {
    const active = this.state.active;
    if (!active) return false;
    const pos = this.markerPos();
    if (!pos || Math.hypot(pos.x - player.x, (pos.y + 50) - player.y) > RESOLVE_RANGE) return false;
    const scene = this.scene;
    const def = CAMP_INCIDENTS_BY_ID[active.id];
    if (def.needsFood && (scene.inventory?.items?.food ?? 0) <= 0) {
      scene.ui?.showMessage('🤕 O morador precisa de 1 comida — você não tem.');
      return true;
    }
    if (def.needsFood) scene.inventory.add('food', -1);
    const reward = incidentReward(def.id);
    scene.economy?.addCoins(reward.coins);
    scene.grantExperience?.(reward.xp, true);
    scene.effects?.spawnHeal(pos.x, pos.y, );
    scene.ui?.showMessage(`✅ ${def.name} resolvido! +${reward.coins} moedas, +${reward.xp} XP.`);
    scene.audio?.playCoin?.();
    this.state.clear();
    this.refreshMarker();
    scene.save?.();
    return true;
  }

  serialize() { return this.state.serialize(); }
}
