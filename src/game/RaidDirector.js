import Phaser from 'phaser';
import { ENEMY_TYPES, enemyXp } from '../data/enemies.js';
import {
  RAID_CONFIG,
  isRaidDay,
  raidComposition,
  raidEliteChance,
  raidReward,
  raidTier,
  splitIntoWaves
} from '../data/raids.js';
import { Enemy } from './Enemies.js';
import { restorePreRaidSnapshot, savePreRaidSnapshot } from './save.js';

/**
 * Ataques ao acampamento (dias 10, 20, 30...).
 * Os invasores ficam em scene.enemies (o jogador e as torres os atacam normalmente),
 * mas a IA deles é esta aqui: muralha primeiro, depois os prédios, e o jogador quando chega perto.
 */
export class RaidDirector {
  constructor(scene, saved = {}) {
    this.scene = scene;
    this.lastRaidDay = Math.max(0, Math.floor(Number(saved?.lastRaidDay) || 0));
    this.warning = null;
    this.active = false;
    this.day = null;
    this.waves = [];
    this.waveTimer = 0;
    this.raidXp = 0;
    this.lastBuildingAlertAt = -Infinity;
  }

  get raiders() {
    return this.scene.enemies.filter((enemy) => enemy.isRaider && enemy.active && !enemy.dead);
  }

  get statusText() {
    if (this.warning) return `ATAQUE EM ${Math.ceil(this.warning.remainingMs / 1000)}s`;
    if (this.active) {
      const pending = this.waves.reduce((sum, wave) => sum + wave.length, 0);
      return `ATAQUE: ${this.raiders.length + pending} INIMIGOS`;
    }
    return '';
  }

  /** Chamado ao carregar e a cada virada de dia. */
  checkDay(day) {
    if (this.warning || this.active) return false;
    if (!isRaidDay(day) || this.lastRaidDay >= day) return false;
    this.startWarning(day);
    return true;
  }

  startWarning(day) {
    this.day = day;
    this.warning = { remainingMs: RAID_CONFIG.warningSeconds * 1000 };
    this.scene.audio?.playNightWarning?.({ frequency: 520, secondFrequency: 390, duration: 0.22, volume: 0.1 });
    this.updateWarningBanner();
  }

  updateWarningBanner() {
    const seconds = Math.ceil(this.warning.remainingMs / 1000);
    this.scene.showEpic?.(RAID_CONFIG.warningText, `Dia ${this.day}: o ataque começa em ${seconds}s. Volte ao acampamento!`, 1200);
  }

  update(delta) {
    if (this.warning) {
      const before = Math.ceil(this.warning.remainingMs / 1000);
      this.warning.remainingMs -= delta;
      if (Math.ceil(this.warning.remainingMs / 1000) !== before) this.updateWarningBanner();
      if (this.warning.remainingMs <= 0) this.start();
      return;
    }
    if (!this.active) return;
    if (this.waves.length > 0) {
      this.waveTimer -= delta;
      if (this.waveTimer <= 0) {
        this.spawnWave(this.waves.shift());
        this.waveTimer = RAID_CONFIG.waveIntervalMs;
      }
    }
    if (this.scene.camp.allBuildingsDestroyed) {
      this.fail();
      return;
    }
    if (this.waves.length === 0 && this.raiders.length === 0) this.win();
  }

  start() {
    this.warning = null;
    // "Último save" para o recomeço em caso de derrota: o estado logo antes das ondas.
    this.scene.save();
    savePreRaidSnapshot();
    this.active = true;
    this.raidXp = 0;
    this.scene.camp.defense.raidActive = true;
    this.waves = splitIntoWaves(raidComposition(this.day));
    this.waveTimer = 0;
    this.scene.showEpic?.('O ATAQUE COMEÇOU!', 'Defenda os prédios. A muralha segura a primeira investida.', 3500);
    this.scene.cameras.main.shake(300, 0.006, true);
  }

  spawnWave(kinds) {
    const scene = this.scene;
    const camp = scene.camp;
    const eliteChance = raidEliteChance(this.day);
    const [minRadius, maxRadius] = RAID_CONFIG.spawnRadius;
    const baseAngle = Math.random() * Math.PI * 2;
    kinds.forEach((kind, index) => {
      // Cada onda chega de um lado, espalhada num arco.
      const angle = baseAngle + (index / kinds.length - 0.5) * 1.6;
      const radius = Phaser.Math.Between(minRadius, maxRadius);
      const x = Phaser.Math.Clamp(camp.x + Math.cos(angle) * radius, 24, scene.worldBounds.width - 24);
      const y = Phaser.Math.Clamp(camp.y + Math.sin(angle) * radius, 24, scene.worldBounds.height - 24);
      const enemy = new Enemy(scene, x, y, kind, {
        elite: Math.random() < eliteChance,
        isNight: ENEMY_TYPES[kind].period === 'night'
      });
      enemy.isRaider = true;
      scene.enemies.push(enemy);
      scene.hudCamera?.ignore(enemy);
    });
  }

  /** IA de um invasor (chamada por Enemy.update quando enemy.isRaider). */
  updateRaider(enemy, delta, player) {
    const scene = this.scene;
    const camp = scene.camp;
    const defense = camp.defense;
    const toCamp = Phaser.Math.Distance.Between(enemy.x, enemy.y, camp.x, camp.y);
    const playerDistance = Phaser.Math.Distance.Between(enemy.x, enemy.y, player.x, player.y);
    const playerToCamp = Phaser.Math.Distance.Between(player.x, player.y, camp.x, camp.y);
    const wallRadius = defense.radius;
    const inside = toCamp < wallRadius - 6;
    const playerInside = playerToCamp < wallRadius - 6;
    const flies = Boolean(enemy.definition.ignoresObstacles);
    const blockedByWall = defense.wallStanding && !flies && !inside;
    enemy.speedFactor = flies ? 1 : defense.outerSlowFor(toCamp);

    const canReachPlayer = !blockedByWall || !playerInside;
    if (canReachPlayer && playerDistance < RAID_CONFIG.playerAggroRange && player.health > 0) {
      this.moveTowards(enemy, player.x, player.y);
      if (playerDistance <= enemy.definition.attackRange && enemy.cooldown === 0 && player.damage(enemy.damage, enemy)) {
        enemy.cooldown = enemy.definition.attackCooldown;
      }
      return;
    }

    if (blockedByWall) {
      if (toCamp > wallRadius + 8) {
        this.moveTowards(enemy, camp.x, camp.y);
        return;
      }
      enemy.body.setVelocity(0, 0);
      defense.handleContact(enemy);
      if (!defense.canClimb(enemy) || enemy.stunMs > 0 || enemy.cooldown > 0) return;
      const result = defense.damageWall(enemy.damage, enemy);
      enemy.cooldown = enemy.definition.attackCooldown;
      if (result.retaliation > 0) scene.damageEnemy?.(enemy, result.retaliation, { color: '#9ee7ff' });
      if (result.broken) {
        scene.ui.showMessage('A muralha caiu! Os inimigos estão entrando.');
        scene.cameras.main.shake(250, 0.008, true);
      }
      return;
    }

    const target = this.nearestBuilding(enemy);
    if (!target) {
      this.moveTowards(enemy, player.x, player.y);
      return;
    }
    const distance = Phaser.Math.Distance.Between(enemy.x, enemy.y, target.x, target.y);
    if (distance > RAID_CONFIG.buildingAttackRange) {
      this.moveTowards(enemy, target.x, target.y);
      return;
    }
    enemy.body.setVelocity(0, 0);
    if (enemy.cooldown > 0) return;
    enemy.cooldown = enemy.definition.attackCooldown;
    const destroyed = camp.damageBuilding(target.key);
    scene.effects?.spawnHit(target.x, target.y - 12, 0xff8a6b, 6);
    const now = scene.time.now;
    if (destroyed) {
      scene.ui.showMessage(`${scene.buildingName(target.key)} foi destruído!`);
    } else if (now - this.lastBuildingAlertAt > 4000) {
      this.lastBuildingAlertAt = now;
      scene.ui.showMessage(`${scene.buildingName(target.key)} está sendo atacado!`);
    }
  }

  nearestBuilding(enemy) {
    let best = null;
    let bestDistance = Infinity;
    for (const target of this.scene.camp.attackableBuildings()) {
      const distance = Phaser.Math.Distance.Between(enemy.x, enemy.y, target.x, target.y);
      if (distance < bestDistance) {
        best = target;
        bestDistance = distance;
      }
    }
    return best;
  }

  moveTowards(enemy, x, y) {
    const angle = Math.atan2(y - enemy.y, x - enemy.x);
    enemy.body.setVelocity(Math.cos(angle) * enemy.speed, Math.sin(angle) * enemy.speed);
    enemy.sprite.setFlipX(Math.cos(angle) < 0);
  }

  /** XP dos invasores vai para a recompensa final (dobrada), não para cristais no chão. */
  onRaiderDefeated(enemy) {
    this.raidXp += enemyXp(enemy.kind, enemy.isElite);
  }

  win() {
    this.active = false;
    this.lastRaidDay = this.day;
    this.scene.camp.defense.raidActive = false;
    const reward = raidReward(this.day, this.raidXp);
    this.scene.economy.addCoins(reward.coins);
    this.scene.grantExperience?.(reward.xp, false);
    this.scene.showEpic?.('ATAQUE REPELIDO!', `Recompensa: +${reward.coins} moedas e +${reward.xp} XP (dobrado).`, 6000);
    this.scene.audio?.playDawn?.();
    this.scene.save();
  }

  fail() {
    this.active = false;
    this.scene.camp.defense.raidActive = false;
    for (const enemy of this.raiders) this.scene.enemyDirector.remove(enemy);
    this.scene.triggerGameOver?.(`Todos os prédios foram destruídos no ataque do dia ${this.day}.`);
  }

  restoreSnapshot() {
    return restorePreRaidSnapshot();
  }

  serialize() {
    return { lastRaidDay: this.lastRaidDay, tier: this.day ? raidTier(this.day) : null };
  }
}
