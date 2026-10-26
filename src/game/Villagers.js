import Phaser from 'phaser';
import { drawVillager } from '../art/person.js';
import { COMBAT_CONFIG } from '../data/combat.js';
import { VILLAGERS, VILLAGER_STATS } from '../data/villagers.js';

const SIZE_SCALE = { dwarf: { x: 1.1, y: 0.82 }, child: { x: 0.72, y: 0.72 } };
const DOWN_MS = 60000;

/**
 * Moradores dos prédios: chegam quando o prédio muda de visual (níveis 4 e 8), andam
 * só dentro do acampamento, falam em balões e ajudam a derrotar monstros.
 * Não ficam na lista de inimigos, então o jogador não consegue atacá-los.
 */
export class VillagerManager {
  constructor(scene) {
    this.scene = scene;
    this.villagers = new Map();
    this.syncTimer = 0;
    this.sync(true);
  }

  get center() {
    return { x: this.scene.camp.x, y: this.scene.camp.y };
  }

  /** Área por onde andam: dentro da muralha. */
  get wanderRadius() {
    return Math.max(140, (this.scene.camp.defense?.radius ?? 320) * 0.68);
  }

  ensureTextures(def) {
    const scene = this.scene;
    for (const frame of [0, 1]) {
      const key = `villager-${def.id}-${frame}`;
      if (scene.textures.exists(key)) continue;
      const pixels = drawVillager(def.palette, def.prop, frame);
      const texture = scene.textures.createCanvas(key, pixels.width, pixels.height);
      texture.getContext().putImageData(new ImageData(pixels.data, pixels.width, pixels.height), 0, 0);
      texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      texture.refresh();
    }
    const animation = `villager-${def.id}-idle`;
    if (!scene.anims.exists(animation)) {
      scene.anims.create({ key: animation, frames: [{ key: `villager-${def.id}-0` }, { key: `villager-${def.id}-1` }], frameRate: 2, repeat: -1 });
    }
  }

  /** Cria ou remove moradores conforme o nível atual dos prédios. */
  sync(silent = false) {
    const levels = this.scene.camp?.levels ?? {};
    for (const def of VILLAGERS) {
      const unlocked = (levels[def.building] ?? 0) >= def.level;
      if (unlocked && !this.villagers.has(def.id)) {
        this.spawn(def);
        if (!silent) {
          this.scene.campaign?.ui?.toast?.(`Novo morador: ${def.name}`, 'gold');
          this.say(this.villagers.get(def.id), 'Cheguei! Vou morar aqui no acampamento.');
        }
      } else if (!unlocked && this.villagers.has(def.id)) {
        this.remove(def.id);
      }
    }
  }

  randomPoint(radius = this.wanderRadius) {
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.sqrt(Math.random()) * radius;
    return { x: this.center.x + Math.cos(angle) * distance, y: this.center.y + Math.sin(angle) * distance * 0.85 };
  }

  spawn(def) {
    const scene = this.scene;
    this.ensureTextures(def);
    const start = this.randomPoint(this.wanderRadius * 0.6);
    const container = scene.add.container(start.x, start.y);
    const scale = SIZE_SCALE[def.size] ?? { x: 1, y: 1 };
    const sprite = scene.add.sprite(0, -2, `villager-${def.id}-0`).setOrigin(0.5, 0.86).setScale(scale.x, scale.y);
    sprite.play({ key: `villager-${def.id}-idle`, startFrame: Math.random() < 0.5 ? 0 : 1 });
    const hpBack = scene.add.rectangle(0, -32 * scale.y - 2, 22, 4, 0x2d2624).setVisible(false);
    const hpFill = scene.add.rectangle(-10, -32 * scale.y - 2, 20, 2, 0x7ad06a).setOrigin(0, 0.5).setVisible(false);
    const bubble = scene.add.text(0, -32 * scale.y - 6, '', {
      fontFamily: 'Press Start 2P', fontSize: '8px', color: '#3b2717', align: 'center',
      backgroundColor: '#f4e6c6', padding: { x: 6, y: 5 }, wordWrap: { width: 260 }
    }).setOrigin(0.5, 1).setScale(0.5).setVisible(false);
    container.add([sprite, hpBack, hpFill, bubble]);
    scene.physics.add.existing(container);
    container.body.setSize(10, 8);
    container.body.setOffset(-5, -4);
    scene.obstacles?.collide(container);
    scene.hudCamera?.ignore(container);
    const villager = {
      def,
      container,
      sprite,
      bubble,
      hpBack,
      hpFill,
      health: VILLAGER_STATS.health,
      target: null,
      idleMs: 500 + Math.random() * 2000,
      attackMs: 0,
      hurtMs: 0,
      talkMs: 4000 + Math.random() * 14000,
      bubbleMs: 0,
      stuckMs: 0,
      downedUntil: 0,
      baseScale: scale
    };
    this.villagers.set(def.id, villager);
    return villager;
  }

  remove(id) {
    const villager = this.villagers.get(id);
    if (!villager) return;
    villager.container.destroy();
    this.villagers.delete(id);
  }

  say(villager, text, ms = 4500) {
    if (!villager) return;
    villager.bubble.setText(text).setVisible(true);
    villager.bubbleMs = ms;
  }

  /** Inimigo mais próximo que está ameaçando o acampamento. */
  nearestThreat(villager) {
    const center = this.center;
    const limit = this.wanderRadius + 140;
    let best = null;
    let bestDistance = VILLAGER_STATS.sight;
    for (const enemy of this.scene.enemies ?? []) {
      if (!enemy?.active || enemy.dead) continue;
      if (Phaser.Math.Distance.Between(enemy.x, enemy.y, center.x, center.y) > limit) continue;
      const distance = Phaser.Math.Distance.Between(enemy.x, enemy.y, villager.container.x, villager.container.y);
      if (distance < bestDistance) {
        best = enemy;
        bestDistance = distance;
      }
    }
    return best ? { enemy: best, distance: bestDistance } : null;
  }

  moveTowards(villager, x, y, speed) {
    const body = villager.container.body;
    const angle = Phaser.Math.Angle.Between(villager.container.x, villager.container.y, x, y);
    body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    villager.sprite.setFlipX(Math.cos(angle) < 0);
  }

  update(delta) {
    this.syncTimer -= delta;
    if (this.syncTimer <= 0) {
      this.syncTimer = 1000;
      this.sync();
    }
    const now = this.scene.time.now;
    const player = this.scene.player;
    for (const villager of this.villagers.values()) {
      const { container } = villager;
      const body = container.body;
      container.setDepth(container.y + 30);
      if (villager.bubbleMs > 0) {
        villager.bubbleMs -= delta;
        if (villager.bubbleMs <= 0) villager.bubble.setVisible(false);
      }
      // Ferido: fica caído e se recupera sozinho depois de um tempo.
      if (villager.downedUntil) {
        body.setVelocity(0, 0);
        if (now >= villager.downedUntil) this.recover(villager);
        continue;
      }
      const threat = this.nearestThreat(villager);
      if (threat) {
        this.fight(villager, threat, delta);
      } else {
        this.wander(villager, delta);
        villager.talkMs -= delta;
        const near = player && Phaser.Math.Distance.Between(player.x, player.y, container.x, container.y) < 300;
        if (villager.talkMs <= 0) {
          villager.talkMs = 12000 + Math.random() * 16000;
          if (near) this.say(villager, Phaser.Utils.Array.GetRandom(villager.def.lines));
        }
      }
    }
  }

  wander(villager, delta) {
    const { container } = villager;
    const body = container.body;
    if (!villager.target) {
      body.setVelocity(0, 0);
      villager.idleMs -= delta;
      if (villager.idleMs <= 0) {
        villager.target = this.randomPoint();
        villager.stuckMs = 0;
      }
      return;
    }
    const distance = Phaser.Math.Distance.Between(container.x, container.y, villager.target.x, villager.target.y);
    villager.stuckMs += delta;
    // Chegou, ou ficou preso num prédio: para um pouco e escolhe outro lugar.
    if (distance < 6 || villager.stuckMs > 6000) {
      villager.target = null;
      villager.idleMs = 1200 + Math.random() * 3500;
      body.setVelocity(0, 0);
      return;
    }
    this.moveTowards(villager, villager.target.x, villager.target.y, VILLAGER_STATS.speed);
  }

  fight(villager, { enemy, distance }, delta) {
    const { container } = villager;
    const body = container.body;
    villager.target = null;
    if (distance > VILLAGER_STATS.range) {
      this.moveTowards(villager, enemy.x, enemy.y, VILLAGER_STATS.speed * 1.6);
    } else {
      body.setVelocity(0, 0);
      villager.sprite.setFlipX(enemy.x < container.x);
      villager.attackMs -= delta;
      if (villager.attackMs <= 0) {
        villager.attackMs = VILLAGER_STATS.attackCooldownMs;
        this.scene.tweens.add({ targets: villager.sprite, angle: villager.sprite.flipX ? -18 : 18, duration: 90, yoyo: true });
        this.scene.effects?.spawnSlash(enemy.x, enemy.y - 10, Phaser.Math.Angle.Between(container.x, container.y, enemy.x, enemy.y), 0.7);
        this.scene.damageEnemy(enemy, VILLAGER_STATS.attack, { color: '#a8f0a0' });
      }
    }
    // O monstro revida quando está colado no morador.
    villager.hurtMs -= delta;
    if (distance <= VILLAGER_STATS.range + 6 && villager.hurtMs <= 0 && !enemy.stunned) {
      villager.hurtMs = 1200;
      const damage = Math.max(1, Math.round((enemy.damage ?? 5) * (COMBAT_CONFIG.enemyDamageToPlayer ?? 1)));
      this.hurt(villager, damage);
    }
  }

  hurt(villager, damage) {
    villager.health = Math.max(0, villager.health - damage);
    villager.sprite.setTint(0xffa0a0);
    this.scene.time.delayedCall(120, () => villager.sprite.active && villager.sprite.clearTint());
    this.scene.effects?.spawnDamage(villager.container.x, villager.container.y - 30, damage, '#ffb59a');
    const ratio = villager.health / VILLAGER_STATS.health;
    villager.hpBack.setVisible(true);
    villager.hpFill.setVisible(true).setDisplaySize(Math.max(1, Math.round(20 * ratio)), 2);
    if (villager.health <= 0) {
      villager.downedUntil = this.scene.time.now + DOWN_MS;
      villager.container.body.setVelocity(0, 0);
      villager.sprite.setAngle(90).setAlpha(0.7);
      this.say(villager, 'Estou ferido! Preciso descansar...', 5000);
    }
  }

  recover(villager) {
    villager.downedUntil = 0;
    villager.health = VILLAGER_STATS.health;
    villager.sprite.setAngle(0).setAlpha(1);
    villager.hpBack.setVisible(false);
    villager.hpFill.setVisible(false);
    this.say(villager, 'Pronto, de pé de novo!');
  }

  /** Para os testes e o depurador: resumo do estado. */
  snapshot() {
    return [...this.villagers.values()].map((villager) => ({
      id: villager.def.id,
      x: Math.round(villager.container.x),
      y: Math.round(villager.container.y),
      health: villager.health,
      downed: Boolean(villager.downedUntil),
      talking: villager.bubble.visible
    }));
  }
}
