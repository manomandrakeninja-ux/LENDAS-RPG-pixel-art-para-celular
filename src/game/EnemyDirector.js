import Phaser from 'phaser';
import { SPAWN_ZONES } from '../data/biomes.js';
import { ELITE_CONFIG, ENEMY_TYPES } from '../data/enemies.js';
import { SPAWNING_CONFIG } from '../data/spawning.js';
import { Enemy } from './Enemies.js';
import { REGION_INFO, REGION_SPAWNS, VALLEY_EXTRA_SPAWNS, regionAt } from '../data/worldRegions.js';
import { levelInRange } from '../data/enemyScaling.js';

// Os guardas da mina eram criados só ao carregar o jogo; agora são repostos periodicamente.
const MINE_REPOPULATE_MS = 30000;

export function weightedChoice(entries, random = Math.random) {
  const total = entries.reduce((sum, entry) => sum + entry.weight, 0);
  if (total <= 0) return null;
  let roll = random() * total;
  for (const entry of entries) {
    roll -= entry.weight;
    if (roll <= 0) return entry.value;
  }
  return entries[entries.length - 1].value;
}

const SPAWN_SWIRL_MS = 600;

export class EnemyDirector {
  constructor(scene, enemies = [], options = {}) {
    this.scene = scene;
    this.enemies = enemies;
    this.random = options.random ?? Math.random;
    this.spawnTimer = 700;
    this.mineTimer = MINE_REPOPULATE_MS;
    // As cavernas criam inimigos com a mesma classe.
    this.EnemyClass = Enemy;
  }

  /** Remove os inimigos comuns (ao entrar numa caverna). */
  clearRegular() {
    for (const enemy of [...this.enemies]) {
      if (!enemy.isRaider && !enemy.isQuestEnemy && !enemy.isCaveEnemy) this.remove(enemy);
    }
  }

  populate(timeState) {
    const period = timeState.isNight ? 'night' : 'day';
    const target = SPAWNING_CONFIG.initialCount[period];
    let created = 0;
    for (let attempt = 0; attempt < target * 8 && created < target; attempt += 1) {
      if (this.spawnOne(timeState)) created += 1;
    }
    this.populateMine(timeState);
  }

  populateMine(timeState) {
    const mine = this.scene.harvestStructures?.state?.byType('mineMarker')?.[0];
    if (!mine) return;
    const nearby = this.enemies.filter((enemy) =>
      Phaser.Math.Distance.Between(enemy.x, enemy.y, mine.x, mine.y) < 240
    );
    const missing = Math.max(0, 3 - nearby.filter((enemy) => enemy.isMineGuard).length);
    if (missing === 0) return;
    const type = timeState.isNight ? 'werewolf' : 'boar';
    for (let index = 0; index < missing; index += 1) {
      // Guardas-mina: sempre elite, parados na entrada (lado sul do marcador).
      const angle = Math.PI / 2 + (this.random() - 0.5) * 1.4;
      const distance = 60 + this.random() * 50;
      const x = mine.x + Math.cos(angle) * distance;
      const y = mine.y + Math.sin(angle) * distance;
      if (this.scene.player && Phaser.Math.Distance.Between(x, y, this.scene.player.x, this.scene.player.y) < 300) continue;
      const enemy = new Enemy(this.scene, x, y, type, { elite: true, mineGuard: true, isNight: timeState.isNight });
      this.enemies.push(enemy);
      this.scene.hudCamera?.ignore(enemy);
    }
  }

  update(delta, player, timeState) {
    this.spawnTimer -= delta;
    const period = timeState.isNight ? 'night' : 'day';
    const limit = SPAWNING_CONFIG.activeLimit[period];
    if (this.spawnTimer <= 0) {
      this.spawnTimer = SPAWNING_CONFIG.spawnIntervalMs[period];
      const regular = this.enemies.filter((enemy) => !enemy.isRaider && !enemy.isQuestEnemy && !enemy.isCaveEnemy).length;
      if (regular < limit && !this.scene.regionWorld?.underground) this.spawnOne(timeState);
    }
    this.mineTimer -= delta;
    if (this.mineTimer <= 0) {
      this.mineTimer = MINE_REPOPULATE_MS;
      this.populateMine(timeState);
    }

    const context = {
      camp: this.scene.camp,
      // O raio protegido pela Fogueira cresce com o nível dela.
      safeZoneRadius: this.scene.camp?.protectRadius ?? SPAWNING_CONFIG.safeZoneRadius,
      raid: this.scene.raid
    };
    for (const enemy of [...this.enemies]) enemy.update(delta, player, context);

    const despawnDistance = SPAWNING_CONFIG.despawnDistance[period];
    for (const enemy of [...this.enemies]) {
      // Invasores e inimigos de missão são controlados pelos seus próprios sistemas.
      if (enemy.isRaider || enemy.isQuestEnemy || enemy.isCaveEnemy) continue;
      const playerDistance = Phaser.Math.Distance.Between(enemy.x, enemy.y, player.x, player.y);
      const wrongPhase = enemy.definition.period === 'night' && period === 'day';
      const wrongPhaseFar = wrongPhase && playerDistance > 320;
      if (playerDistance > despawnDistance || wrongPhaseFar) this.remove(enemy);
    }
  }

  spawnOne(timeState) {
    const period = timeState.isNight ? 'night' : 'day';
    // Fora do Vale: monstros da região onde o jogador está, em volta dele.
    const player = this.scene.player;
    const region = player ? regionAt(player.x, player.y) : 'vale';
    if (REGION_SPAWNS[region]) return this.spawnInRegion(region, period, timeState);
    if (region === 'mar') return false;
    const candidates = [];
    for (const type of player ? VALLEY_EXTRA_SPAWNS[period] ?? [] : []) {
      const weight = ENEMY_TYPES[type]?.spawnWeight[period] ?? 0;
      if (weight > 0) candidates.push({ value: { type, zone: null }, weight: weight * 0.6 });
    }
    for (const zone of Object.values(SPAWN_ZONES)) {
      for (const type of zone.enemies[period] ?? []) {
        const weight = ENEMY_TYPES[type].spawnWeight[period] ?? 0;
        if (weight > 0) candidates.push({ value: { type, zone }, weight });
      }
    }
    const selected = weightedChoice(candidates, this.random);
    if (!selected) return false;

    const position = selected.zone
      ? this.findSpawnPosition(selected.zone, selected.type)
      : this.findSpawnNearPlayer('vale');
    if (!position) return false;
    const eliteChance = ELITE_CONFIG.chance[period];
    const elite = this.random() < eliteChance;
    this.addEnemyWithSwirl(selected.type, position.x, position.y, { elite, isNight: period === 'night' });
    return true;
  }

  spawnInRegion(region, period, timeState) {
    const list = REGION_SPAWNS[region][period] ?? [];
    if (list.length === 0) return false;
    const type = list[Math.floor(this.random() * list.length)];
    const definition = ENEMY_TYPES[type];
    const position = this.findSpawnNearPlayer(region);
    if (!definition || !position) return false;
    const elite = this.random() < ELITE_CONFIG.chance[period] * 1.5;
    // Bandos: goblins, lobos do gelo, múmias e piratas andam em grupo.
    const packSize = definition.packAttack?.enabled ? 1 + Math.floor(this.random() * 3) : 1;
    for (let index = 0; index < packSize; index += 1) {
      const x = position.x + (index ? (this.random() - 0.5) * 70 : 0);
      const y = position.y + (index ? (this.random() - 0.5) * 70 : 0);
      if (this.scene.regionWorld && !this.scene.regionWorld.walkable(x, y)) continue;
      this.addEnemyWithSwirl(type, x, y, { elite: elite && index === 0, isNight: period === 'night', level: levelInRange(definition, REGION_INFO[region]?.levelRange) });
    }
    return true;
  }

  /** Nascimento natural: redemoinho azul por ~0,6 s e só então o monstro aparece. */
  addEnemyWithSwirl(type, x, y, options) {
    const scene = this.scene;
    if (!scene.effects?.spawnSwirl || !scene.time) return this.addEnemy(type, x, y, options);
    scene.effects.spawnSwirl(x, y, SPAWN_SWIRL_MS);
    scene.time.delayedCall(SPAWN_SWIRL_MS, () => {
      if (!scene.sys?.isActive() || scene.gameOver) return;
      this.addEnemy(type, x, y, options);
    });
    return null;
  }

  addEnemy(type, x, y, options) {
    const enemy = new Enemy(this.scene, x, y, type, options);
    this.enemies.push(enemy);
    this.scene.hudCamera?.ignore(enemy);
    if (!enemy.definition.ignoresObstacles) this.scene.regionWorld?.collide(enemy);
    return enemy;
  }

  /** Ponto livre a 380-820 px do jogador, dentro da mesma região e em chão firme. */
  findSpawnNearPlayer(region) {
    const player = this.scene.player;
    if (!player) return null;
    const { camp } = this.scene.worldBounds;
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const angle = this.random() * Math.PI * 2;
      const distance = 380 + this.random() * 440;
      const x = Math.round(player.x + Math.cos(angle) * distance);
      const y = Math.round(player.y + Math.sin(angle) * distance);
      if (regionAt(x, y) !== region) continue;
      if (this.scene.regionWorld && !this.scene.regionWorld.walkable(x, y)) continue;
      if (Phaser.Math.Distance.Between(x, y, camp.x, camp.y) < SPAWNING_CONFIG.safeZoneRadius + 80) continue;
      if (this.enemies.some((enemy) => Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y) < 90)) continue;
      return { x, y };
    }
    return null;
  }

  findSpawnPosition(zone, type) {
    const { camp, width, height } = this.scene.worldBounds;
    const safeRadius = SPAWNING_CONFIG.safeZoneRadius;
    for (let attempt = 0; attempt < 80; attempt += 1) {
      const ring = weightedChoice(
        SPAWNING_CONFIG.distanceRings.map((entry) => ({ value: entry, weight: entry.weight })),
        this.random
      );
      const angle = this.random() * Math.PI * 2;
      const distance = ring.min + this.random() * (ring.max - ring.min);
      const x = camp.x + Math.cos(angle) * distance;
      const y = camp.y + Math.sin(angle) * distance;
      const insideZone = x >= zone.rect.x && x <= zone.rect.x + zone.rect.width &&
        y >= zone.rect.y && y <= zone.rect.y + zone.rect.height;
      if (!insideZone || x < 32 || y < 32 || x > width - 32 || y > height - 32) continue;
      if (Phaser.Math.Distance.Between(x, y, camp.x, camp.y) < safeRadius + 45) continue;
      const player = this.scene.player;
      if (player && Phaser.Math.Distance.Between(x, y, player.x, player.y) < 330) continue;
      const crowded = this.enemies.some((enemy) => Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y) < 90);
      if (crowded) continue;
      return { x: Math.round(x), y: Math.round(y) };
    }
    return null;
  }

  remove(enemy) {
    const index = this.enemies.indexOf(enemy);
    if (index === -1) return;
    this.enemies.splice(index, 1);
    enemy.remove();
  }

  removeByType(type) {
    for (const enemy of [...this.enemies]) {
      if (enemy.kind === type) this.remove(enemy);
    }
  }

  clearNightEnemies() {
    for (const enemy of [...this.enemies]) {
      if (enemy.definition.period === 'night' && !enemy.isQuestEnemy && !enemy.isCaveEnemy) this.remove(enemy);
    }
  }

  nearest(range, origin) {
    let closest = null;
    let distance = range;
    for (const enemy of this.enemies) {
      const current = Phaser.Math.Distance.Between(origin.x, origin.y, enemy.x, enemy.y);
      if (current < distance) {
        closest = enemy;
        distance = current;
      }
    }
    return closest;
  }
}
