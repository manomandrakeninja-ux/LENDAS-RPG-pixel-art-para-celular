import Phaser from 'phaser';
import { Enemy } from './Enemies.js';
import { ENEMY_TYPE_NAMES } from '../data/enemies.js';
import { REGION_SPAWNS, roadAt } from '../data/worldRegions.js';
import {
  ROAD_ENCOUNTER_FIRST_MS, ROAD_ENCOUNTER_NEXT_MS,
  shouldFire, pickDef, nearestRoad, spawnPointOnRoad, rewardsFor
} from '../data/roadEncounters.js';

// Encontros de estrada: a cada 2-4 min andando por estrada surge uma pequena aventura
// (emboscada, viajante ferido, baú guardado) — nunca perto de POIs ou do acampamento.

export class RoadEncounterSystem {
  constructor(scene) {
    this.scene = scene;
    this.elapsedMs = 0;
    this.nextInMs = Phaser.Math.Between(ROAD_ENCOUNTER_FIRST_MS[0], ROAD_ENCOUNTER_FIRST_MS[1]);
    this.marker = null; // texto "!" no local do encontro
    this.markerUntil = 0;
  }

  update(delta) {
    const scene = this.scene;
    const player = scene.player;
    if (!player || scene.regionWorld?.underground) return;
    this.elapsedMs += delta;

    const px = player.x;
    const py = player.y;
    const region = scene.regionWorld.currentRegion();
    const onRoad = roadAt(px, py);
    const nearFeature = Boolean(scene.regionWorld.nearestFeature(px, py, 300));
    const nearCamp = scene.camp.isNear(px, py);
    const raidActive = Boolean(scene.raid?.active || scene.raid?.warning);
    const regionLit = scene.waylights?.state?.isLit(region) ?? false;

    if (!shouldFire({
      onRoad, nearFeature, nearCamp, underground: scene.regionWorld.underground,
      raidActive, elapsedMs: this.elapsedMs, nextInMs: this.nextInMs, regionLit
    })) return;

    this.elapsedMs = 0;
    this.nextInMs = Phaser.Math.Between(ROAD_ENCOUNTER_NEXT_MS[0], ROAD_ENCOUNTER_NEXT_MS[1]);
    this.fire(pickDef(scene.progression?.level ?? 1), px, py, region);
  }

  fire(def, px, py, region) {
    const scene = this.scene;
    const near = nearestRoad(px, py);
    if (!near) return;
    const point = spawnPointOnRoad(near.road, near.t);
    const level = scene.progression?.level ?? 1;
    const reward = rewardsFor(def.id, level);

    this.showMarker(point.x, point.y);

    if (def.id === 'ambush') {
      const pool = [...(REGION_SPAWNS[region]?.day ?? []), ...(REGION_SPAWNS[region]?.night ?? ENEMY_TYPE_NAMES)];
      const kinds = pool.length ? pool : ENEMY_TYPE_NAMES;
      for (let i = 0; i < reward.enemies; i += 1) {
        const kind = kinds[Math.floor(Math.random() * kinds.length)];
        const angle = (Math.PI * 2 * i) / Math.max(1, reward.enemies);
        const enemy = new Enemy(scene, point.x + Math.cos(angle) * 40, point.y + Math.sin(angle) * 40, kind, { elite: level >= 12 && i === 0 });
        enemy.perception = 700;
        scene.enemies.push(enemy);
        scene.hudCamera?.ignore(enemy);
      }
      scene.ui?.showMessage(`⚠️ Emboscada na ${near.road.name}! ${reward.enemies} inimigos!`);
      scene.audio?.playRoar?.();
      scene.grantExperience(reward.xp, true);
    } else if (def.id === 'wounded') {
      const food = scene.inventory?.items?.food ?? 0;
      if (food > 0) {
        scene.inventory.add('food', -1);
        scene.economy?.addCoins(reward.coins);
        scene.grantExperience(reward.xp, true);
        scene.ui?.showMessage(`🤕 Viajante ferido: você deu 1 comida e recebeu ${reward.coins} moedas (+${reward.xp} XP).`);
        scene.audio?.playCoin?.();
      } else {
        scene.ui?.showMessage('🤕 Um viajante ferido pede comida... você não tem nenhuma.');
      }
      scene.effects?.spawnDamage(point.x, point.y - 30, '🤕', '#ffd0d0');
    } else if (def.id === 'guardedChest') {
      scene.deathBackpacks?.create(point.x, point.y, { coins: reward.coins });
      for (let i = 0; i < reward.guardians; i += 1) {
        const kind = ENEMY_TYPE_NAMES[Math.floor(Math.random() * ENEMY_TYPE_NAMES.length)];
        const enemy = new Enemy(scene, point.x + 30 - i * 60, point.y + 20, kind, {});
        enemy.perception = 500;
        scene.enemies.push(enemy);
        scene.hudCamera?.ignore(enemy);
      }
      scene.ui?.showMessage(`📦 Baú suspeito na estrada... e não está sozinho (${reward.coins} moedas lá dentro).`);
      scene.audio?.playPick?.();
    }
    scene.save?.();
  }

  showMarker(x, y) {
    const scene = this.scene;
    this.marker?.destroy();
    this.marker = scene.add.text(x, y - 40, '!', {
      fontFamily: 'Press Start 2P', fontSize: '20px', color: '#ff5a4a',
      stroke: '#140f14', strokeThickness: 4
    }).setOrigin(0.5).setDepth(y + 40);
    this.markerUntil = scene.time.now + 20000;
  }

  updateMarker() {
    if (this.marker) {
      if (this.scene.time.now > this.markerUntil) {
        this.marker.destroy();
        this.marker = null;
      } else {
        this.marker.setAlpha(0.5 + Math.abs(Math.sin(this.scene.time.now / 180)) * 0.5);
      }
    }
  }
}
