import Phaser from 'phaser';
import { ENEMY_TYPES } from '../data/enemies.js';
import { REGION_INFO, regionAt } from '../data/worldRegions.js';
import { INVASION_CONFIG, RegionInvasionState, invasionCenter } from './RegionInvasion.js';

/**
 * Invasões nas regiões (a lógica pura está em RegionInvasion.js).
 * Aqui a cena cria os invasores (aura laranja; líder com aura dourada na última onda),
 * acompanha as ondas e entrega a recompensa. Os ataques ao acampamento continuam no RaidDirector.
 */
export class InvasionDirector {
  constructor(scene, saved = {}) {
    this.scene = scene;
    this.state = new RegionInvasionState(saved);
    this.waveTimer = 2500;
    this.announced = false;
  }

  get active() {
    return this.state.active;
  }

  get invaders() {
    return this.scene.enemies.filter((enemy) => enemy.isInvader && enemy.active && !enemy.dead);
  }

  get center() {
    return this.active ? invasionCenter(this.active.region) : null;
  }

  get regionName() {
    return this.active ? REGION_INFO[this.active.region].name : '';
  }

  get statusText() {
    if (!this.active) return '';
    const wave = Math.max(1, this.active.wave);
    return `Invasão em ${this.regionName}: onda ${Math.min(wave, INVASION_CONFIG.waves)}/${INVASION_CONFIG.waves}. Derrote os invasores de aura laranja e o líder dourado.`;
  }

  /** Chamado ao carregar e a cada virada de dia. */
  checkDay(day) {
    const started = this.state.checkDay(day, this.scene.progression?.level ?? 1);
    if (started) {
      this.announce(true);
      this.scene.save?.();
    } else if (this.active && !this.announced) {
      this.announce(false);
    }
    return started;
  }

  announce(isNew) {
    this.announced = true;
    if (!this.active) return;
    const scene = this.scene;
    if (isNew) scene.audio?.playNightWarning?.({ frequency: 480, secondFrequency: 360, duration: 0.2, volume: 0.08 });
    scene.showEpic?.('INVASÃO!', `${this.regionName} está sob ataque (nível ${this.active.level}). Veja o mapa (M).`, 3600);
  }

  playerInRegion() {
    const scene = this.scene;
    const player = scene.player;
    if (!player || !this.active || scene.regionWorld?.underground) return false;
    return regionAt(player.x, player.y) === this.active.region;
  }

  update(delta) {
    const state = this.state;
    if (!state.active) return;
    const scene = this.scene;
    if (scene.raid?.active || scene.raid?.warning) return;
    const living = this.invaders;
    if (!this.playerInRegion()) {
      // O herói foi embora (ou morreu): os invasores somem e a onda recomeça quando ele voltar.
      if (living.length > 0) {
        for (const enemy of living) scene.enemyDirector.remove(enemy);
        state.restartCurrentWave();
        this.waveTimer = 2500;
      }
      return;
    }
    if (living.length > 0) return;
    if (state.active.leaderDefeated) {
      this.finish();
      return;
    }
    this.waveTimer -= delta;
    if (this.waveTimer > 0) return;
    const wave = state.nextWave();
    if (!wave) {
      state.active.leaderDefeated = true;
      return;
    }
    this.waveTimer = INVASION_CONFIG.waveDelayMs;
    this.spawnWave(wave);
  }

  spawnWave(wave) {
    const scene = this.scene;
    const director = scene.enemyDirector;
    const player = scene.player;
    let created = 0;
    for (const member of wave.members) {
      const definition = ENEMY_TYPES[member.kind];
      if (!definition) continue;
      let position = director.findSpawnNearPlayer(this.active.region);
      if (!position) {
        // Último recurso: um ponto livre perto do herói.
        const angle = Math.random() * Math.PI * 2;
        position = { x: player.x + Math.cos(angle) * 360, y: player.y + Math.sin(angle) * 360 };
      }
      const enemy = director.addEnemy(member.kind, position.x, position.y, {
        elite: member.leader,
        level: wave.level,
        auraColor: member.leader ? INVASION_CONFIG.leaderAuraColor : INVASION_CONFIG.auraColor,
        name: `${member.leader ? 'Líder' : 'Invasor'} ${definition.name}`
      });
      enemy.isInvader = true;
      enemy.isInvasionLeader = member.leader;
      enemy.ignoresSafeZone = false;
      created += 1;
    }
    const last = wave.index === INVASION_CONFIG.waves - 1;
    scene.showEpic?.(`ONDA ${wave.index + 1}/${INVASION_CONFIG.waves}`, last ? 'O líder dourado chegou!' : `${created} invasores de aura laranja.`, 2200);
    scene.save?.();
  }

  /** Chamado quando um inimigo morre. */
  onDefeated(enemy) {
    if (!enemy?.isInvader || !this.active) return;
    if (enemy.isInvasionLeader) {
      this.active.leaderDefeated = true;
      this.scene.ui?.showMessage('O líder da invasão caiu! Derrote os que sobraram.');
    }
  }

  finish() {
    const scene = this.scene;
    const reward = this.state.finish();
    if (!reward) return;
    scene.economy.addCoins(reward.coins);
    scene.audio?.playCollect?.();
    scene.grantExperience?.(reward.xp, false);
    scene.showEpic?.('INVASÃO REPELIDA!', `${REGION_INFO[reward.region].name} está a salvo: +${reward.coins} moedas, +${reward.xp} XP.`, 4200);
    scene.save?.();
  }

  serialize() {
    return this.state.serialize();
  }

  /** Distância do ponto ao centro da região invadida (para a seta do minimapa). */
  distanceTo(x, y) {
    const center = this.center;
    return center ? Phaser.Math.Distance.Between(x, y, center.x, center.y) : Infinity;
  }
}
