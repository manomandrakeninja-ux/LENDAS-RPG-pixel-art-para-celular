import Phaser from 'phaser';
import { PixelCanvas } from '../art/pixel.js';
import { drawMonsterFrame } from '../art/monsters.js';
import { BOSS_CONFIG } from '../data/boss.js';

const BOSS_TEXTURE = 'boss-biome-titan';

export class BiomeBoss extends Phaser.GameObjects.Container {
  constructor(scene, x, y, saved = {}) {
    super(scene, x, y);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.setSize(54, 50);
    this.body.setOffset(-27, -25);
    this.body.setCollideWorldBounds(true);
    this.setDepth(y + 30);

    this.kind = 'boss';
    this.isBoss = true;
    this.isElite = false;
    this.name = BOSS_CONFIG.name;
    this.maxHealth = BOSS_CONFIG.maxHealth;
    // Saves antigos guardavam a vida sobre 500: mantém a mesma proporção na vida nova.
    const savedMax = Number(saved.maxHealth) || 500;
    const savedHealth = Number(saved.health);
    this.health = Number.isFinite(savedHealth) && savedHealth > 0
      ? Math.min(this.maxHealth, Math.max(1, Math.round((savedHealth / savedMax) * this.maxHealth)))
      : this.maxHealth;
    // Travado (área restrita) até a missão anterior à do Golem ser concluída.
    this.locked = false;
    this.enraged = this.health <= this.maxHealth * 0.5;
    this.damage = BOSS_CONFIG.damage;
    this.speed = BOSS_CONFIG.speed;
    this.dead = Boolean(saved.defeated);
    this.patternIndex = 0;
    this.patternCooldown = BOSS_CONFIG.patternCooldownMs;
    this.patternHistory = [];
    this.effectsCreated = [];
    this.projectiles = [];
    this.telegraph = null;
    this.state = 'idle';
    this.pattern = null;
    this.stage = null;
    this.timer = 0;
    this.chargeAngle = 0;
    this.patternHit = false;

    this.ensureTexture();
    this.ensureProjectileTexture();
    this.sprite = scene.add.sprite(0, -3, BOSS_TEXTURE).setOrigin(0.5, 0.84);
    this.add(this.sprite);
    this.aura = scene.add.image(0, 0, 'vfx', 'ring-0')
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.28)
      .setTint(0xe36b55)
      .setScale(1.8);
    this.add(this.aura);
    scene.tweens.add({
      targets: this.aura,
      scale: 2.25,
      alpha: 0.12,
      duration: 900,
      yoyo: true,
      repeat: -1
    });
    if (this.dead) this.setVisible(false);
  }

  ensureTexture() {
    if (this.scene.textures.exists(BOSS_TEXTURE)) return;
    const texture = this.scene.textures.createCanvas(BOSS_TEXTURE, 64, 64);
    // Titã de lava: blocos de rocha escura com rachaduras incandescentes (src/art/monsters.js).
    const golem = drawMonsterFrame('titan', 64, 0);
    texture.getContext().putImageData(new ImageData(golem.data, 64, 64), 0, 0);
    texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    texture.refresh();
  }

  ensureProjectileTexture() {
    if (this.scene.textures.exists('boss-projectile')) return;
    const texture = this.scene.textures.createCanvas('boss-projectile', 10, 10);
    // Bola de magma.
    const ball = new PixelCanvas(10, 10);
    ball.shadedEllipse(5, 5, 4, 4, ['#8e2a14', '#e0602a', '#ffb04a', '#fff0b0']);
    ball.outline({ strength: 0.5 });
    texture.getContext().putImageData(new ImageData(ball.data, 10, 10), 0, 0);
    texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    texture.refresh();
  }

  update(delta, player) {
    if (this.dead) return;
    if (this.locked) {
      // Área restrita: o golem fica parado guardando o núcleo e não ataca.
      if (this.state !== 'idle') this.endPattern();
      this.body.setVelocity(0, 0);
      this.updateProjectiles(delta, player);
      this.setDepth(this.y + 30);
      return;
    }
    const distance = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    if (this.state === 'idle') {
      this.patternCooldown = Math.max(0, this.patternCooldown - delta);
      if (distance <= BOSS_CONFIG.detectionRange) {
        const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
        const velocity = distance < 90 ? 0 : this.speed;
        this.body.setVelocity(Math.cos(angle) * velocity, Math.sin(angle) * velocity);
      } else {
        this.body.setVelocity(0, 0);
      }
      if (this.patternCooldown <= 0 && distance <= BOSS_CONFIG.attackRange) {
        this.startPattern(BOSS_CONFIG.patterns[this.patternIndex % BOSS_CONFIG.patterns.length]);
        this.patternIndex += 1;
      }
    } else {
      this.updatePattern(delta, player);
    }
    this.updateProjectiles(delta, player);
    this.setDepth(this.y + 30);
  }

  startPattern(pattern) {
    if (this.dead || !BOSS_CONFIG.patterns.includes(pattern)) return false;
    this.clearTelegraph();
    this.pattern = pattern;
    this.state = pattern;
    this.stage = 'telegraph';
    this.patternHit = false;
    this.timer = pattern === 'charge' ? 700 : pattern === 'slam' ? 800 : 500;
    this.patternHistory.push(pattern);
    this.createTelegraph(pattern);
    return true;
  }

  createTelegraph(pattern) {
    const scene = this.scene;
    if (pattern === 'charge') {
      const line = scene.add.rectangle(this.x, this.y, 210, 18, 0xe45d4f, 0.28)
        .setStrokeStyle(2, 0xffb06f)
        .setDepth(this.y + 28);
      this.telegraph = line;
    } else if (pattern === 'slam') {
      const circle = scene.add.circle(this.x, this.y, 145, 0xe45d4f, 0.2)
        .setStrokeStyle(3, 0xffb06f)
        .setDepth(this.y + 27);
      this.telegraph = circle;
    } else {
      const lines = scene.add.container(this.x, this.y).setDepth(this.y + 28);
      for (let index = -1; index <= 1; index += 1) {
        const line = scene.add.rectangle(0, 0, 150, 7, 0xe45d4f, 0.3)
          .setStrokeStyle(1, 0xffb06f)
          .setRotation(index * 0.22);
        lines.add(line);
      }
      this.telegraph = lines;
    }
  }

  clearTelegraph() {
    this.telegraph?.destroy();
    this.telegraph = null;
  }

  updatePattern(delta, player) {
    this.timer -= delta;
    if (this.stage === 'telegraph') {
      if (this.pattern === 'charge') {
        this.chargeAngle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
        if (this.telegraph?.setRotation) {
          this.telegraph.setRotation(this.chargeAngle);
          this.telegraph.setPosition(
            this.x + Math.cos(this.chargeAngle) * 100,
            this.y + Math.sin(this.chargeAngle) * 100
          );
        }
      }
      if (this.timer <= 0) {
        this.stage = 'active';
        this.timer = this.pattern === 'charge' ? 450 : 220;
        this.executePattern(player);
      }
      return;
    }

    if (this.pattern === 'charge') {
      this.body.setVelocity(Math.cos(this.chargeAngle) * 470, Math.sin(this.chargeAngle) * 470);
      if (!this.patternHit && Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y) < 62) {
        this.patternHit = true;
        player.damage(this.damage, this, { fullDamage: true });
      }
    } else {
      this.body.setVelocity(0, 0);
    }
    if (this.timer <= 0) this.endPattern();
  }

  executePattern(player) {
    this.clearTelegraph();
    this.effectsCreated.push(this.pattern);
    if (this.pattern === 'slam') {
      const ring = this.scene.add.circle(this.x, this.y, 28, 0xffb060, 0.36)
        .setStrokeStyle(4, 0xffe1a0)
        .setDepth(this.y + 29);
      this.scene.tweens.add({
        targets: ring,
        radius: 155,
        alpha: 0,
        duration: 420,
        onComplete: () => ring.destroy()
      });
      if (Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y) < 155) {
        player.damage(this.damage, this, { fullDamage: true });
      }
      this.scene.cameras.main.shake(240, 0.008, true);
    } else if (this.pattern === 'volley') {
      const baseAngle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
      for (let index = -1; index <= 1; index += 1) {
        const angle = baseAngle + index * 0.22;
        const projectile = this.scene.add.image(this.x, this.y - 6, 'boss-projectile')
          .setDepth(this.y + 31)
          .setScale(1.5);
        this.projectiles.push({
          image: projectile,
          velocityX: Math.cos(angle) * 280,
          velocityY: Math.sin(angle) * 280,
          age: 0
        });
      }
    }
  }

  updateProjectiles(delta, player) {
    const seconds = delta / 1000;
    for (const projectile of [...this.projectiles]) {
      projectile.age += delta;
      projectile.image.x += projectile.velocityX * seconds;
      projectile.image.y += projectile.velocityY * seconds;
      if (Phaser.Math.Distance.Between(projectile.image.x, projectile.image.y, player.x, player.y) < 27) {
        player.damage(this.damage, this, { fullDamage: true });
        projectile.image.destroy();
        this.projectiles = this.projectiles.filter((entry) => entry !== projectile);
      } else if (projectile.age > 1400) {
        projectile.image.destroy();
        this.projectiles = this.projectiles.filter((entry) => entry !== projectile);
      }
    }
  }

  endPattern() {
    this.clearTelegraph();
    this.state = 'idle';
    this.pattern = null;
    this.stage = null;
    this.timer = 0;
    this.patternCooldown = BOSS_CONFIG.patternCooldownMs;
    this.body.setVelocity(0, 0);
  }

  hit(amount) {
    if (this.dead || this.locked) return false;
    this.health = Math.max(0, this.health - Math.max(0, Number(amount) || 0));
    this.scene.onBossDamaged?.(this);
    this.sprite.setTint(0xffc2a8);
    this.scene.time.delayedCall(100, () => {
      if (this.active) this.sprite.clearTint();
    });
    if (this.health <= 0) {
      this.dead = true;
      this.body.setVelocity(0, 0);
      this.body.enable = false;
      return true;
    }
    return false;
  }

  serialize() {
    return { defeated: this.dead, health: this.health, maxHealth: this.maxHealth };
  }

  /** Volta à vida (save antigo em que o golem já tinha sido derrotado antes da missão). */
  revive(ratio = 1) {
    this.dead = false;
    this.health = Math.max(1, Math.round(this.maxHealth * ratio));
    this.enraged = ratio <= 0.5;
    this.body.enable = true;
    this.setVisible(true);
    this.setActive(true);
  }

  destroy(fromScene) {
    this.clearTelegraph();
    for (const projectile of this.projectiles) projectile.image?.destroy();
    this.projectiles = [];
    super.destroy(fromScene);
  }
}
