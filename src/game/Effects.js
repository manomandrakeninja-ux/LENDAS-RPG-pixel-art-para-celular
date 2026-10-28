import Phaser from 'phaser';
import { ARC_FRAMES, ARC_SIZE, ARC_TONES, hexRgb, swingArcTone } from '../art/light.js';

const randomBetween = (min, max) => Math.random() * (max - min) + min;

function ensureSwingArc(scene, variant) {
  const key = `swing-arc-${variant}`;
  if (scene.textures.exists(key)) return key;
  const texture = scene.textures.createCanvas(key, ARC_SIZE * ARC_FRAMES, ARC_SIZE);
  const context = texture.getContext();
  const image = context.createImageData(ARC_SIZE * ARC_FRAMES, ARC_SIZE);
  const tones = ARC_TONES[variant].map(hexRgb);
  for (let frame = 0; frame < ARC_FRAMES; frame += 1) {
    for (let y = 0; y < ARC_SIZE; y += 1) {
      for (let x = 0; x < ARC_SIZE; x += 1) {
        const tone = swingArcTone(x, y, frame);
        if (tone < 0) continue;
        image.data.set([...tones[tone], 255], (y * ARC_SIZE * ARC_FRAMES + frame * ARC_SIZE + x) * 4);
      }
    }
    texture.add(frame, 0, frame * ARC_SIZE, 0, ARC_SIZE, ARC_SIZE);
  }
  context.putImageData(image, 0, 0);
  texture.refresh();
  scene.anims.create({ key, frames: [0, 1, 2, 3].map((frame) => ({ key, frame })), frameRate: 22, repeat: 0 });
  return key;
}

/** Partículas de 3 tons claros: o tint do emissor vira uma rampa de 3 degraus. */
function ensureParticle(scene, key, width, height, cells) {
  if (scene.textures.exists(key)) return key;
  const texture = scene.textures.createCanvas(key, width, height);
  const context = texture.getContext();
  const tones = ['#ffffff', '#c7cfdd', '#92a1b9'].map(hexRgb);
  const image = context.createImageData(width, height);
  cells.forEach((row, y) => [...row].forEach((cell, x) => {
    if (cell !== '.') image.data.set([...tones[Number(cell)], 255], (y * width + x) * 4);
  }));
  context.putImageData(image, 0, 0);
  texture.refresh();
  return key;
}

export class PixelEffects {
  constructor(scene) {
    this.scene = scene;
    this.leafTimer = 0;
    this.fireflyTimer = 0;
    this.damageTexts = [];

    const spark = ensureParticle(scene, 'fx-spark3', 7, 7, [
      '...2...',
      '...1...',
      '..101..',
      '2100012',
      '..101..',
      '...1...',
      '...2...'
    ]);
    const dust = ensureParticle(scene, 'fx-dust3', 8, 6, [
      '..11....',
      '.1001...',
      '1000122.',
      '11012221',
      '.122222.',
      '........'
    ]);
    this.sparkEmitter = scene.add.particles(0, 0, spark, {
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

    this.dustEmitter = scene.add.particles(0, 0, dust, {
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

  /** Rastro do golpe: meia-lua de 180° em volta da mão, acompanhando a espada (dourada no golpe final). */
  spawnSwingTrail(x, y, angle, finisher = false) {
    const key = ensureSwingArc(this.scene, finisher ? 'finisher' : 'normal');
    // Mesmo pivô da espada em Player.poseGear (a espada gira de angle-1,5 a angle+1,5 rad).
    const trail = this.scene.add.sprite(x + Math.cos(angle) * 8, y - 11 + Math.sin(angle) * 5, key, 0)
      .setOrigin(0.5)
      .setDepth(4205)
      .setRotation(angle)
      .setScale(finisher ? 1.3 : 1);
    this.scene.hudCamera?.ignore(trail);
    trail.play(key);
    this.scene.tweens.add({ targets: trail, alpha: 0, duration: 120, delay: 120, onComplete: () => trail.destroy() });
    // Poeira de 3 tons levantada pelo pé de apoio.
    this.dustEmitter.setParticleTint(0xcba36f);
    this.dustEmitter.emitParticleAt(x - Math.cos(angle) * 4, y + 4, finisher ? 4 : 2);
  }

  /** Impacto: anel de choque, faíscas e lascas. */
  spawnImpact(x, y, { tint = 0xffe0a0, strong = false } = {}) {
    const ring = this.scene.add.image(x, y, 'vfx', 'ring-1')
      .setDepth(4210)
      .setScale(0.3)
      .setTint(tint)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.scene.hudCamera?.ignore(ring);
    this.scene.tweens.add({
      targets: ring,
      scale: strong ? 1.3 : 0.8,
      alpha: 0,
      duration: strong ? 280 : 200,
      ease: 'Quad.easeOut',
      onComplete: () => ring.destroy()
    });
    this.spawnHit(x, y, tint, strong ? 14 : 8);
    this.dustEmitter.setParticleTint(0xb8a982);
    this.dustEmitter.emitParticleAt(x, y + 6, strong ? 5 : 3);
  }

  /** Golpe de picareta: faíscas laranja e lascas de pedra. */
  spawnMiningHit(x, y) {
    this.sparkEmitter.setParticleTint(0xffb04a);
    this.sparkEmitter.emitParticleAt(x, y, 7);
    this.dustEmitter.setParticleTint(0x8d9496);
    this.dustEmitter.emitParticleAt(x, y + 4, 5);
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
    const crit = tint === '#ffe28a';
    // Câmera afastada: o texto cresce para continuar legível (zoom 2 ou mais = tamanho normal).
    const boost = Math.max(1, 1.5 / (this.scene.cameras.main.zoom || 1));
    label.text
      .setText(crit ? `${amount}!` : String(amount))
      .setPosition(x + randomBetween(-4, 4), y - 18)
      .setAlpha(1)
      .setScale((crit ? 1.9 : 1.4) * boost)
      .setVisible(true)
      .setColor(tint);
    // Salta ao aparecer e depois sobe sumindo.
    this.scene.tweens.add({ targets: label.text, scale: (crit ? 1.3 : 1) * boost, duration: 120, ease: 'Back.out' });
    this.scene.tweens.add({
      targets: label.text,
      y: y - 44,
      alpha: 0,
      delay: 120,
      duration: 560,
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
    this.dustEmitter.emitParticleAt(x, y, 14);
    this.spawnImpact(x, y, { tint: 0xffe2a0, strong: true });
    // Brilhos subindo (a "alma" da criatura).
    this.fireflyEmitter.emitParticleAt(x, y - 6, 6);
  }

  /** Redemoinho azul (só visual) no lugar onde um monstro vai nascer. */
  spawnSwirl(x, y, duration = 600) {
    const scene = this.scene;
    const graphics = scene.add.graphics().setPosition(x, y).setDepth(y + 20);
    scene.hudCamera?.ignore(graphics);
    const state = { t: 0 };
    scene.tweens.add({
      targets: state,
      t: 1,
      duration,
      onUpdate: () => {
        const t = state.t;
        graphics.clear();
        graphics.fillStyle(0x6fd0ff, 0.22 * (1 - t));
        graphics.fillEllipse(0, 2, 34 * (0.6 + t * 0.4), 16 * (0.6 + t * 0.4));
        for (let arm = 0; arm < 3; arm += 1) {
          const angle = t * Math.PI * 5 + arm * 2.09;
          graphics.lineStyle(2, 0x9fe4ff, 1 - t * 0.7);
          graphics.beginPath();
          graphics.arc(0, 0, (18 - arm * 4) * (1 - t * 0.3), angle, angle + 2.1);
          graphics.strokePath();
        }
      },
      onComplete: () => graphics.destroy()
    });
    return graphics;
  }

  spawnHeal(x, y) {
    this.dustEmitter.setParticleTint(0x9ed47a);
    this.dustEmitter.emitParticleAt(x, y, 8);
    this.spawnHit(x, y, 0xa9e28a, 5);
  }
}
