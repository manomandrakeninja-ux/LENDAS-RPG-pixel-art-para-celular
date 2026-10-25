import Phaser from 'phaser';

const randomBetween = (min, max) => Math.random() * (max - min) + min;

export class PixelEffects {
  constructor(scene) {
    this.scene = scene;
    this.leafTimer = 0;
    this.fireflyTimer = 0;
    this.damageTexts = [];

    this.sparkEmitter = scene.add.particles(0, 0, 'vfx', {
      frame: 'spark-0',
      lifespan: { min: 150, max: 300 },
      speed: { min: 45, max: 130 },
      angle: { min: 0, max: 360 },
      scale: 1,
      alpha: { start: 1, end: 0 },
      rotate: { min: 0, max: 360 },
      gravityY: 150,
      blendMode: Phaser.BlendModes.ADD,
      frequency: -1
    });

    this.dustEmitter = scene.add.particles(0, 0, 'vfx', {
      frame: 'dust-0',
      lifespan: { min: 260, max: 460 },
      speed: { min: 12, max: 48 },
      angle: { min: 190, max: 350 },
      scale: 1,
      alpha: { start: 0.8, end: 0 },
      gravityY: -18,
      frequency: -1
    });

    this.leafEmitter = scene.add.particles(0, 0, 'vfx', {
      frame: 'leaf-0',
      lifespan: { min: 5200, max: 7600 },
      speedX: { min: -22, max: -8 },
      speedY: { min: 7, max: 16 },
      scale: 1,
      alpha: { start: 0.8, end: 0 },
      frequency: -1
    });

    this.fireflyEmitter = scene.add.particles(0, 0, 'vfx', {
      frame: 'firefly-0',
      lifespan: { min: 1800, max: 3200 },
      speed: { min: 2, max: 10 },
      angle: { min: 0, max: 360 },
      scale: 1,
      alpha: { start: 0.95, end: 0 },
      blendMode: Phaser.BlendModes.ADD,
      frequency: -1
    });
  }

  updateAmbient(delta, { isNight, camera, player }) {
    this.leafTimer -= delta;
    this.fireflyTimer -= delta;

    if (this.leafTimer <= 0) {
      this.leafTimer = randomBetween(420, 900);
      const viewWidth = camera.width / camera.zoom;
      const x = camera.scrollX + randomBetween(-20, viewWidth + 20);
      const y = camera.scrollY - randomBetween(8, 26);
      this.leafEmitter.setParticleTint(Phaser.Math.RND.pick([0x78964e, 0x9c8a4e, 0xb08043]));
      this.leafEmitter.emitParticleAt(x, y, 1);
    }

    if (isNight && this.fireflyTimer <= 0) {
      this.fireflyTimer = randomBetween(260, 620);
      const x = player.x + randomBetween(-150, 150);
      const y = player.y + randomBetween(-110, 110);
      this.fireflyEmitter.emitParticleAt(x, y, 1);
    }
  }

  spawnSlash(x, y, angle, size = 1) {
    const slash = this.scene.add.sprite(x, y, 'vfx', 'slash-0')
      .setOrigin(0.5)
      .setDepth(4200)
      .setRotation(angle)
      .setScale(size)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.scene.hudCamera?.ignore(slash);
    slash.play('slash-swing');
    this.scene.time.delayedCall(170, () => slash.destroy());
  }

  spawnSpecial(x, y) {
    const ring = this.scene.add.sprite(x, y, 'vfx', 'ring-0')
      .setOrigin(0.5)
      .setDepth(4190)
      .setScale(1)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.scene.hudCamera?.ignore(ring);
    ring.play('special-ring');
    this.scene.time.delayedCall(150, () => ring.setScale(2));
    this.scene.time.delayedCall(320, () => ring.destroy());

    this.sparkEmitter.setParticleTint(0xffe8a0);
    this.sparkEmitter.emitParticleAt(x, y, 18);
  }

  spawnHit(x, y, tint = 0xffe0a0, count = 8) {
    this.sparkEmitter.setParticleTint(tint);
    this.sparkEmitter.emitParticleAt(x, y, count);

    const flash = this.scene.add.image(x, y, 'vfx', 'spark-0')
      .setDepth(4210)
      .setScale(1)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.scene.hudCamera?.ignore(flash);
    this.scene.time.delayedCall(80, () => flash.destroy());
  }

  spawnDamage(x, y, amount, tint = '#fff0b8') {
    let label = this.damageTexts.find((entry) => !entry.active);
    if (!label) {
      const text = this.scene.add.text(0, 0, '0', {
        fontFamily: 'Press Start 2P',
        fontSize: '8px',
        color: tint,
        stroke: '#2a1d1a',
        strokeThickness: 3
      })
        .setOrigin(0.5)
        .setDepth(4300)
        .setResolution(1)
        .setVisible(false);
      this.scene.hudCamera?.ignore(text);
      label = { text, active: false };
      this.damageTexts.push(label);
    }
    label.active = true;
    label.text
      .setText(String(amount))
      .setPosition(x, y - 18)
      .setAlpha(1)
      .setVisible(true)
      .setColor(tint);
    this.scene.tweens.add({
      targets: label.text,
      y: y - 42,
      alpha: 0,
      duration: 620,
      ease: 'Quad.easeOut',
      onComplete: () => {
        label.active = false;
        label.text.setVisible(false);
      }
    });
  }

  spawnDust(x, y, count = 4, tint = 0xd0c49d) {
    this.dustEmitter.setParticleTint(tint);
    this.dustEmitter.emitParticleAt(x, y, count);
  }

  spawnHarvest(x, y, tint = 0xd7d77c) {
    this.dustEmitter.setParticleTint(tint);
    this.dustEmitter.emitParticleAt(x, y, 10);
    this.spawnHit(x, y, tint, 4);
  }

  spawnDeath(x, y, tint = 0xb4d27c) {
    this.dustEmitter.setParticleTint(tint);
    this.dustEmitter.emitParticleAt(x, y, 10);
    this.spawnHit(x, y, 0xffe2a0, 10);
  }

  spawnHeal(x, y) {
    this.dustEmitter.setParticleTint(0x9ed47a);
    this.dustEmitter.emitParticleAt(x, y, 8);
    this.spawnHit(x, y, 0xa9e28a, 5);
  }
}
