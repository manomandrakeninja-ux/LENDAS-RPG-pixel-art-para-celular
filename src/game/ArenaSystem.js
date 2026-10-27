import { Enemy } from './Enemies.js';
import { Arena } from '../data/rebirth.js';

// Arena de chefes perto da Fogueira: ondas de chefes cada vez mais fortes, com recorde salvo.

const WAVE_DELAY_MS = 3000;

export class ArenaSystem {
  constructor(scene, saved) {
    this.scene = scene;
    this.state = new Arena(saved);
    this.bosses = [];
    this.timer = 0;
  }

  get active() { return this.state.active; }
  get wave() { return this.state.wave; }
  get record() { return this.state.record; }

  start() {
    if (this.state.active) return false;
    this.state.start();
    this.state.wave = 0;
    this.scene.ui?.showMessage('Arena de chefes: aguente o máximo de ondas!');
    this.spawnWave();
    return true;
  }

  spawnWave() {
    const scene = this.scene;
    const specs = this.state.nextWave(scene.progression?.level ?? 1);
    const camp = scene.camp;
    specs.forEach((spec, i) => {
      const angle = (Math.PI * 2 * (i + 0.5)) / specs.length - Math.PI / 2;
      const enemy = new Enemy(scene, camp.x + Math.cos(angle) * 190, camp.y + 60 + Math.sin(angle) * 130, spec.kind, { elite: true, level: spec.level, name: `Chefe da Arena (${spec.kind})` });
      enemy.isArenaBoss = true;
      enemy.ignoresSafeZone = true;
      enemy.noFlee = true;
      enemy.perception = 900;
      enemy.maxHealth = Math.round(enemy.maxHealth * spec.health);
      enemy.health = enemy.maxHealth;
      enemy.damage = Math.round(enemy.damage * spec.damage);
      scene.enemies.push(enemy);
      scene.hudCamera?.ignore(enemy);
      this.bosses.push(enemy);
    });
    scene.ui?.showMessage(`Arena: onda ${this.state.wave} (${specs.length} ${specs.length > 1 ? 'chefes' : 'chefe'})`);
  }

  update(delta) {
    if (!this.state.active) return;
    if (this.timer > 0) {
      this.timer -= delta;
      if (this.timer <= 0) this.spawnWave();
      return;
    }
    if (this.bosses.length && this.bosses.every((b) => b.dead || !b.active)) this.waveCleared();
  }

  waveCleared() {
    const scene = this.scene;
    this.bosses = [];
    const reward = this.state.clear();
    scene.ui?.showMessage(`Onda ${this.state.wave} vencida! Recorde: ${this.state.record}`);
    if (reward) {
      scene.economy?.addCoins(reward.coins);
      scene.grantExperience?.(reward.xp, false);
      scene.ui?.showMessage(`Arena: recompensa da onda ${this.state.wave}! +${reward.coins} moedas, +${reward.xp} XP`);
    }
    scene.save?.();
    this.timer = WAVE_DELAY_MS;
  }

  /** Sai da arena (derrota ou desistência): remove os chefes que sobraram. */
  end(message) {
    if (!this.state.active) return;
    for (const boss of this.bosses) if (!boss.dead && boss.active) this.scene.enemyDirector?.remove(boss);
    this.bosses = [];
    this.timer = 0;
    this.state.end();
    if (message) this.scene.ui?.showMessage(message);
    this.scene.save?.();
  }

  serialize() { return this.state.serialize(); }
}
