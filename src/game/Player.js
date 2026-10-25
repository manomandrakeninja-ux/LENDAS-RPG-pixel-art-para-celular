import Phaser from 'phaser';
import { COMBAT_CONFIG } from '../data/combat.js';
import { PERK_EFFECTS } from '../data/progression.js';

export class Player extends Phaser.GameObjects.Container {
  constructor(scene, x, y, saved = {}, progression = null) {
    super(scene, x, y);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.setSize(16, 18);
    this.body.setOffset(-8, -7);
    this.body.setCollideWorldBounds(true);
    this.setDepth(y + 30);

    this.sprite = scene.add.sprite(0, -2, 'player', 1).setOrigin(0.5, 0.68);
    this.add(this.sprite);

    this.progression = progression;
    this.maxHealth = progression?.maxHealth ?? saved.maxHealth ?? 100;
    this.health = Math.min(saved.health ?? this.maxHealth, this.maxHealth);
    this.stamina = 100;
    this.baseAttack = Number.isFinite(Number(saved.baseAttack))
      ? Number(saved.baseAttack)
      : (Number(saved.attack) || 12) - (scene.camp?.legacyForgeBonus?.attack ?? 0);
    this.baseDefense = Number.isFinite(Number(saved.baseDefense))
      ? Number(saved.baseDefense)
      : (Number(saved.defense) || 0) - (scene.camp?.legacyForgeBonus?.defense ?? 0);
    this.attack = this.baseAttack;
    this.defense = this.baseDefense;
    this.facing = new Phaser.Math.Vector2(1, 0);
    this.attackCooldown = 0;
    this.dodgeCooldown = 0;
    this.dodgeTimer = 0;
    this.dodgeX = 0;
    this.dodgeY = 0;
    this.specialCooldown = 0;
    this.invulnerable = 0;
    this.torchTimer = 0;
    this.direction = 'down';
    this.stepTimer = 0;
    this.knockbackTimer = 0;
    this.knockbackX = 0;
    this.knockbackY = 0;
    this.sprite.play('player-idle-down');
  }

  // analog: vetor do joystick de toque (-1 a 1); usado quando nenhuma tecla de movimento está pressionada.
  update(delta, keys, cursors, pointerWorld, analog = null) {
    const seconds = delta / 1000;
    this.attackCooldown = Math.max(0, this.attackCooldown - delta);
    this.dodgeCooldown = Math.max(0, this.dodgeCooldown - delta);
    this.dodgeTimer = Math.max(0, this.dodgeTimer - delta);
    this.specialCooldown = Math.max(0, this.specialCooldown - delta);
    this.invulnerable = Math.max(0, this.invulnerable - delta);
    this.torchTimer = Math.max(0, this.torchTimer - delta);
    this.knockbackTimer = Math.max(0, this.knockbackTimer - delta);
    this.stamina = Math.min(100, this.stamina + 13 * seconds);

    let x = Number(keys.left.isDown || keys.a.isDown || cursors.left.isDown) * -1 +
      Number(keys.right.isDown || keys.d.isDown || cursors.right.isDown);
    let y = Number(keys.up.isDown || keys.w.isDown || cursors.up.isDown) * -1 +
      Number(keys.down.isDown || keys.s.isDown || cursors.down.isDown);
    const movement = new Phaser.Math.Vector2(x, y);
    this.stepTimer = Math.max(0, this.stepTimer - delta);
    if (movement.lengthSq() > 0) {
      movement.normalize();
    } else if (analog && (analog.x !== 0 || analog.y !== 0)) {
      movement.set(analog.x, analog.y);
      if (movement.lengthSq() > 1) movement.normalize();
    }
    if (movement.lengthSq() > 0) {
      const strength = movement.length();
      this.facing.copy(movement).scale(1 / strength);
      this.direction = Math.abs(movement.x) > Math.abs(movement.y)
        ? movement.x < 0 ? 'left' : 'right'
        : movement.y < 0 ? 'up' : 'down';
      const walk = `player-walk-${this.direction}`;
      if (this.sprite.anims.currentAnim?.key !== walk) this.sprite.play(walk);
      if (this.stepTimer === 0) {
        this.stepTimer = 240;
        this.scene.effects?.spawnDust(this.x - this.facing.x * 6, this.y + 9, 2, 0x9a9a72);
      }
    } else if (pointerWorld) {
      const aim = new Phaser.Math.Vector2(pointerWorld.x - this.x, pointerWorld.y - this.y);
      if (aim.lengthSq() > 0) this.facing.copy(aim.normalize());
      const idle = `player-idle-${this.direction}`;
      if (this.sprite.anims.currentAnim?.key !== idle) this.sprite.play(idle);
    } else {
      const idle = `player-idle-${this.direction}`;
      if (this.sprite.anims.currentAnim?.key !== idle) this.sprite.play(idle);
    }
    if (this.knockbackTimer > 0) {
      this.body.setVelocity(this.knockbackX, this.knockbackY);
    } else if (this.dodgeTimer > 0) {
      this.body.setVelocity(this.dodgeX, this.dodgeY);
    } else {
      this.body.setVelocity(movement.x * 130, movement.y * 130);
    }
    this.setDepth(this.y + 30);
  }

  // forced: esquiva pedida pelo botão de toque, além da tecla Espaço.
  dodge(keys, forced = false) {
    const fleetfoot = this.progression?.hasPerk?.('fleetfoot') ?? false;
    const staminaCost = Math.round(COMBAT_CONFIG.dodgeStaminaCost *
      (fleetfoot ? PERK_EFFECTS.fleetfootStaminaMultiplier : 1));
    const pressed = Phaser.Input.Keyboard.JustDown(keys.dodge) || forced;
    if (!pressed || this.dodgeCooldown > 0 ||
        this.stamina < staminaCost) return false;
    this.stamina -= staminaCost;
    this.dodgeCooldown = Math.round(COMBAT_CONFIG.dodgeCooldownMs *
      (fleetfoot ? PERK_EFFECTS.fleetfootCooldownMultiplier : 1));
    this.invulnerable = COMBAT_CONFIG.dodgeInvulnerabilityMs;
    // A velocidade é mantida por dodgeDurationMs em update(); antes ela durava um único frame.
    this.dodgeTimer = COMBAT_CONFIG.dodgeDurationMs;
    this.dodgeX = this.facing.x * COMBAT_CONFIG.dodgeSpeed;
    this.dodgeY = this.facing.y * COMBAT_CONFIG.dodgeSpeed;
    this.knockbackTimer = 0;
    this.body.setVelocity(this.dodgeX, this.dodgeY);
    this.scene.effects?.spawnDust(this.x, this.y + 8, 6, 0xb0ad82);
    return true;
  }

  damage(amount, source = null) {
    if (this.invulnerable > 0) return false;
    const dealt = Math.max(1, amount - this.defense);
    this.health = Math.max(0, this.health - dealt);
    this.invulnerable = 450;
    this.sprite.setTint(0xffc2a8);
    this.scene.effects?.spawnHit(this.x, this.y - 9, 0xff9b78, 6);
    this.scene.effects?.spawnDamage(this.x, this.y - 20, dealt, '#ffb59a');
    this.scene.audio?.playHit();
    if (source) {
      const angle = Phaser.Math.Angle.Between(source.x, source.y, this.x, this.y);
      this.knockbackTimer = COMBAT_CONFIG.knockback.durationMs;
      this.knockbackX = Math.cos(angle) * COMBAT_CONFIG.knockback.normal;
      this.knockbackY = Math.sin(angle) * COMBAT_CONFIG.knockback.normal;
    }
    if (this.scene.damageFlash) {
      this.scene.damageFlash.setAlpha(0.2);
      this.scene.tweens.add({ targets: this.scene.damageFlash, alpha: 0, duration: 140 });
    }
    this.scene.cameras.main.shake(
      COMBAT_CONFIG.screenShake.playerHit.duration,
      COMBAT_CONFIG.screenShake.playerHit.intensity,
      true
    );
    this.scene.time.delayedCall(110, () => {
      if (this.sprite?.active) this.sprite.clearTint();
    });
    return true;
  }

  showAttack() {
    this.sprite.setTint(0xffe4a5);
    this.scene.time.delayedCall(90, () => this.sprite.clearTint());
  }

  heal(amount) {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  recalculateEquipment(equipment) {
    const bonuses = equipment?.getBonuses?.() ?? { attack: 0, defense: 0 };
    this.attack = this.baseAttack + (this.progression?.attackBonus ?? 0) + bonuses.attack;
    this.defense = this.baseDefense + (this.progression?.defenseBonus ?? 0) + bonuses.defense;
  }
}
