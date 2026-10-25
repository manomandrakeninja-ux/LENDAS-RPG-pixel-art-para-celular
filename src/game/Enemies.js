import Phaser from 'phaser';
import { COMBAT_CONFIG } from '../data/combat.js';
import { ELITE_CONFIG, ENEMY_TYPES } from '../data/enemies.js';
import { SPAWNING_CONFIG } from '../data/spawning.js';
import { resolveEnemyVisual } from './EnemyVisual.js';

const randomBetween = (min, max) => min + Math.floor(Math.random() * (max - min + 1));

export class Enemy extends Phaser.GameObjects.Container {
  constructor(scene, x, y, type = 'slime', options = {}) {
    super(scene, x, y);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.kind = type;
    this.definition = ENEMY_TYPES[type];
    this.isElite = options.elite ?? false;
    this.isNight = options.isNight ?? false;
    this.isMineGuard = Boolean(options.mineGuard);
    this.name = this.isMineGuard
      ? `Guarda-mina (${this.definition.name})`
      : `${this.definition.name}${this.isElite ? ` ${ELITE_CONFIG.label}` : ''}`;

    const night = this.isNight ? SPAWNING_CONFIG.nightScaling : null;
    this.maxHealth = Math.round(
      this.definition.health *
      (this.isElite ? ELITE_CONFIG.healthMultiplier : 1) *
      (night?.healthMultiplier ?? 1)
    );
    this.health = this.maxHealth;
    this.damage = Math.round(
      this.definition.damage *
      (this.isElite ? ELITE_CONFIG.damageMultiplier : 1) *
      (night?.damageMultiplier ?? 1)
    );
    this.baseSpeed = Math.round(
      this.definition.speed *
      (this.isElite ? ELITE_CONFIG.speedMultiplier : 1) *
      (night?.speedMultiplier ?? 1)
    );

    this.body.setSize(this.definition.hitbox.width, this.definition.hitbox.height);
    this.body.setOffset(-this.definition.hitbox.width / 2, -this.definition.hitbox.height / 2);
    this.body.setCollideWorldBounds(true);
    if (this.definition.ignoresObstacles) this.body.checkCollision.none = true;

    // A campanha cria inimigos com desenho e nome próprios sobre uma espécie base.
    if (options.name) this.name = options.name;
    const visual = resolveEnemyVisual(scene, options.visual ?? type, this.isElite);
    const texture = visual.texture;
    const frame = visual.frame;
    this.usingPlaceholder = visual.isPlaceholder;
    this.placeholderShape = visual.shape;

    this.eliteAura = null;
    if (this.isElite) {
      this.eliteAura = scene.add.image(0, -2, 'vfx', 'ring-0')
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0.42)
        .setTint(ELITE_CONFIG.auraColor);
      this.add(this.eliteAura);
    }

    this.sprite = scene.add.sprite(0, -2, texture, frame).setOrigin(0.5, 0.82);
    this.add(this.sprite);
    if (visual.animation && scene.anims.exists(visual.animation)) this.sprite.play(visual.animation);

    const barY = -Math.max(22, Math.round((visual.size ?? 32) * 0.72));
    this.healthBarBack = scene.add.rectangle(0, barY, 28, 4, 0x2d2624).setVisible(false);
    this.healthBar = scene.add.rectangle(0, barY, 24, 2, 0xd96858).setVisible(false);
    this.add(this.healthBarBack);
    this.add(this.healthBar);

    this.cooldown = 0;
    // Efeitos de status: queimadura (dano por segundo), lentidão e atordoamento (muralha, armadilha).
    this.burn = null;
    this.slow = null;
    this.stunMs = 0;
    this.phase = Phaser.Math.FloatBetween(0, Math.PI * 2);
    this.state = 'patrol';
    this.homeX = x;
    this.homeY = y;
    this.patrolX = x;
    this.patrolY = y;
    this.knockbackTimer = 0;
    this.knockbackX = 0;
    this.knockbackY = 0;
    this.setDepth(y + 20);
  }

  get speed() {
    const slowFactor = this.slow ? 1 - this.slow.ratio : 1;
    return this.baseSpeed * slowFactor * (this.speedFactor ?? 1);
  }

  applyBurn(dps, ms) {
    this.burn = { dps, remainingMs: ms, tickMs: 0 };
  }

  applySlow(ratio, ms) {
    if (!this.slow || ratio >= this.slow.ratio) this.slow = { ratio, remainingMs: ms };
    else this.slow.remainingMs = Math.max(this.slow.remainingMs, ms);
  }

  stun(ms) {
    this.stunMs = Math.max(this.stunMs, ms);
  }

  /** Avança os efeitos de status e devolve o dano de queimadura deste quadro (aplicado pela cena). */
  tickStatus(delta) {
    this.stunMs = Math.max(0, this.stunMs - delta);
    if (this.slow) {
      this.slow.remainingMs -= delta;
      if (this.slow.remainingMs <= 0) this.slow = null;
    }
    let damage = 0;
    if (this.burn) {
      this.burn.remainingMs -= delta;
      this.burn.tickMs += delta;
      while (this.burn.tickMs >= 1000) {
        this.burn.tickMs -= 1000;
        damage += this.burn.dps;
      }
      if (this.burn.remainingMs <= 0) this.burn = null;
    }
    const tint = this.burn ? 0xffa36b : this.slow ? 0xa9e8ff : null;
    if (tint !== this.statusTint) {
      this.statusTint = tint;
      if (tint) this.sprite.setTint(tint);
      else this.sprite.clearTint();
    }
    return damage;
  }

  update(delta, player, context = {}) {
    this.cooldown = Math.max(0, this.cooldown - delta);
    this.knockbackTimer = Math.max(0, this.knockbackTimer - delta);
    if (this.stunMs > 0) {
      this.body.setVelocity(0, 0);
      this.setDepth(this.y + 20);
      this.updateHealthBar();
      return;
    }
    if (this.isRaider && context.raid) {
      context.raid.updateRaider(this, delta, player);
      this.setDepth(this.y + 20);
      this.updateHealthBar();
      return;
    }

    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const distance = Math.hypot(dx, dy);
    // Invasores das missões de defesa atacam dentro do acampamento.
    const camp = this.ignoresSafeZone ? null : context.camp;
    const safeRadius = context.safeZoneRadius ?? SPAWNING_CONFIG.safeZoneRadius;
    const campDistance = camp ? Phaser.Math.Distance.Between(this.x, this.y, camp.x, camp.y) : Infinity;
    const playerInSafeZone = camp
      ? Phaser.Math.Distance.Between(player.x, player.y, camp.x, camp.y) < safeRadius
      : false;

    const enemyInSafeZone = campDistance < safeRadius;
    if (enemyInSafeZone) {
      // Recua para fora da zona segura em vez de ser teletransportado para a borda.
      this.state = 'return';
      const angle = campDistance > 0 ? Math.atan2(this.y - camp.y, this.x - camp.x) : this.phase;
      const retreatSpeed = Math.max(this.speed * 1.4, 90);
      this.body.setVelocity(Math.cos(angle) * retreatSpeed, Math.sin(angle) * retreatSpeed);
      this.sprite.setFlipX(Math.cos(angle) < 0);
    } else if (this.knockbackTimer > 0) {
      this.body.setVelocity(this.knockbackX, this.knockbackY);
    } else if (playerInSafeZone) {
      this.state = 'return';
      this.patrolAroundHome(delta);
    } else {
      const healthRatio = this.health / this.maxHealth;
      if (!this.noFlee && healthRatio <= this.definition.fleeHealthRatio && this.definition.fleeHealthRatio > 0) {
        this.state = 'flee';
        const fleeAngle = Math.atan2(this.y - player.y, this.x - player.x);
        this.body.setVelocity(Math.cos(fleeAngle) * this.speed, Math.sin(fleeAngle) * this.speed);
      } else if (distance <= (this.perception ?? this.definition.perception)) {
        this.state = 'chase';
        const targetX = distance > 0 ? dx / distance : 0;
        const targetY = distance > 0 ? dy / distance : 0;
        this.body.setVelocity(targetX * this.speed, targetY * this.speed);
        this.sprite.setFlipX(targetX < 0);
      } else if (this.definition.behavior === 'patrol' || this.definition.behavior === 'pack') {
        this.state = 'patrol';
        this.patrolAroundHome(delta);
      } else {
        this.state = 'idle';
        this.body.setVelocity(0, 0);
      }
    }

    if (!enemyInSafeZone && !playerInSafeZone &&
        distance <= this.definition.attackRange && this.cooldown === 0 && this.canAttackInPack(player)) {
      if (player.damage(this.damage, this)) {
        this.cooldown = this.definition.attackCooldown;
      }
    }

    this.setDepth(this.y + 20);
    this.updateHealthBar();
    if (this.eliteAura) {
      this.eliteAura.rotation += delta * 0.0015;
      this.eliteAura.setAlpha(0.36 + Math.sin(this.scene.time.now / 220 + this.phase) * 0.08);
    }
    this.sprite.y = Math.sin(this.scene.time.now / 260 + this.phase) > 0.72 ? -1 : -2;
  }

  patrolAroundHome(delta) {
    if (Phaser.Math.Distance.Between(this.x, this.y, this.patrolX, this.patrolY) < 18) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const radius = Phaser.Math.Between(45, 120);
      this.patrolX = Phaser.Math.Clamp(this.homeX + Math.cos(angle) * radius, 24, this.scene.worldBounds.width - 24);
      this.patrolY = Phaser.Math.Clamp(this.homeY + Math.sin(angle) * radius, 24, this.scene.worldBounds.height - 24);
    }
    const angle = Math.atan2(this.patrolY - this.y, this.patrolX - this.x);
    this.body.setVelocity(Math.cos(angle) * this.speed * 0.35, Math.sin(angle) * this.speed * 0.35);
    this.sprite.setFlipX(Math.cos(angle) < 0);
  }

  canAttackInPack(player) {
    if (!this.definition.packAttack.enabled) return true;
    const allies = (this.scene.enemies ?? []).filter((enemy) =>
      enemy !== this &&
      enemy.kind === this.kind &&
      enemy.state === 'chase' &&
      Phaser.Math.Distance.Between(enemy.x, enemy.y, player.x, player.y) <= this.definition.packAttack.radius
    );
    return allies.length < this.definition.packAttack.maxAttackers;
  }

  hit(amount, angle = null) {
    this.health = Math.max(0, this.health - amount);
    this.sprite.setTint(0xfff0cf);
    this.scene.time.delayedCall(90, () => {
      if (!this.sprite || !this.active) return;
      this.statusTint = undefined;
      if (this.isElite) {
        this.sprite.setTint(ELITE_CONFIG.auraColor);
      } else {
        this.sprite.clearTint();
      }
    });
    if (angle !== null) this.applyKnockback(angle);
    return this.health <= 0;
  }

  applyKnockback(angle, force = null) {
    force ??= this.isElite ? COMBAT_CONFIG.knockback.elite : COMBAT_CONFIG.knockback.normal;
    this.knockbackTimer = 150;
    this.knockbackX = Math.cos(angle) * force;
    this.knockbackY = Math.sin(angle) * force;
    this.body.setVelocity(this.knockbackX, this.knockbackY);
  }

  updateHealthBar() {
    const damaged = this.health < this.maxHealth;
    this.healthBarBack.setVisible(damaged);
    this.healthBar.setVisible(damaged);
    const barWidth = Math.max(4, Math.round((24 * (this.health / this.maxHealth)) / 2) * 2);
    this.healthBar.setDisplaySize(barWidth, 2);
  }

  rollDrops() {
    const drops = {};
    const multiplier = (this.isElite ? ELITE_CONFIG.dropMultiplier : 1) *
      (this.isNight ? SPAWNING_CONFIG.nightScaling.dropMultiplier : 1);
    for (const drop of this.definition.drops) {
      if (Math.random() > drop.chance) continue;
      const amount = Math.max(1, Math.round(randomBetween(drop.min, drop.max) * multiplier));
      drops[drop.type] = (drops[drop.type] ?? 0) + amount;
    }
    return drops;
  }

  remove() {
    this.destroy();
  }
}
