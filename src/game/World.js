import Phaser from 'phaser';
import { RESOURCE_TYPES, WORLD } from './config.js';
import { NIGHT_RESOURCES } from '../data/nightResources.js';
import { RESOURCE_NODES } from '../data/resources.js';

const rand = (min, max) => Math.random() * (max - min) + min;

export class World {
  constructor(scene) {
    this.scene = scene;
    this.resources = [];
    this.nightResources = [];
    this.groundDetails = [];
    this.revealedCells = new Set();
    this.revealedPoints = [];
    this.fogTexture = null;
    this.fogOverlay = null;
    this.lastRevealKey = '';
  }

  create() {
    const { width, height, tileSize, camp } = WORLD;
    for (let y = 0; y < height; y += tileSize) {
      for (let x = 0; x < width; x += tileSize) {
        const centerX = x + tileSize / 2;
        const centerY = y + tileSize / 2;
        const pathToCamp = Math.abs(centerX - camp.x) < 42 &&
          centerY > camp.y - 36 && centerY < camp.y + 420;
        const aroundCampfire = Phaser.Math.Distance.Between(centerX, centerY, camp.x, camp.y) < 105;
        // 4 = metade esquerda do caminho (borda de grama à esquerda), 5 = metade direita.
        const frame = pathToCamp
          ? (centerX < camp.x ? 4 : 5)
          : aroundCampfire ? Phaser.Math.Between(0, 3) : this.groundVariant();
        this.scene.add.image(centerX, centerY, 'grass', frame)
          .setScale(tileSize / 48)
          .setDepth(-1000);
      }
    }

    this.drawGroundDetails();
    this.drawForest();
    this.createResources(camp);
    this.createNightResources(camp);
    this.scene.physics.world.setBounds(0, 0, width, height);
  }

  groundVariant() {
    const roll = Math.random();
    if (roll < 0.57) return 0;
    if (roll < 0.69) return 1;
    if (roll < 0.80) return 2;
    if (roll < 0.89) return 3;
    return Phaser.Math.Between(6, 7);
  }

  drawGroundDetails() {
    const { width, height, tileSize } = WORLD;
    // Sem cogumelos decorativos: eles se confundiam com os coletáveis da missão 2.
    const frames = ['detail-grass', 'detail-flowers', 'detail-pebbles', 'detail-leaves'];
    for (let y = tileSize; y < height - tileSize; y += tileSize) {
      for (let x = tileSize; x < width - tileSize; x += tileSize) {
        if (Phaser.Math.Between(1, 100) > 16) continue;
        const frame = Phaser.Math.RND.pick(frames);
        const detail = this.scene.add.image(
          x + Phaser.Math.Between(-8, 8),
          y + Phaser.Math.Between(-5, 5),
          'nature',
          frame
        )
          .setDepth(-995)
          .setAlpha(frame === 'detail-flowers' ? 1 : 0.9);
        this.groundDetails.push(detail);
      }
    }
  }

  drawForest() {
    const { width, height, camp } = WORLD;
    for (let i = 0; i < 155; i += 1) {
      const x = rand(40, width - 40);
      const y = rand(40, height - 40);
      if (Phaser.Math.Distance.Between(x, y, camp.x, camp.y) < 260) continue;
      const tree = this.scene.add.sprite(x, y, 'nature', 'pine-0')
        .setOrigin(0.5, 0.88)
        .setDepth(y + 10)
        .play('pine-sway');
      // Tronco sólido.
      this.scene.obstacles?.add(x, y - 2, 10, 7);
      if (i % 7 === 0) {
        tree.setTexture('nature', 'autumn-tree').stop();
      } else if (i % 4 === 0) {
        tree.setTexture('nature', 'oak-tree').stop();
      } else if (i % 11 === 0) {
        tree.setTexture('nature', 'fruit-tree').stop();
      } else if (i % 5 === 0) {
        tree.setTexture('nature', 'pine-1').stop();
      }
    }
    for (let i = 0; i < 48; i += 1) {
      const x = rand(32, width - 32);
      const y = rand(32, height - 32);
      if (Phaser.Math.Distance.Between(x, y, camp.x, camp.y) < 180) continue;
      this.scene.add.image(x, y, 'nature', 'bush')
        .setOrigin(0.5, 0.9)
        .setDepth(y + 2);
    }
  }

  createResources(camp) {
    for (const [type, definition] of Object.entries(RESOURCE_NODES)) {
      const { count } = definition;
      for (let i = 0; i < count; i += 1) {
        let x;
        let y;
        do {
          x = rand(90, WORLD.width - 90);
          y = rand(90, WORLD.height - 90);
        } while (Phaser.Math.Distance.Between(x, y, camp.x, camp.y) < 220);
        this.resources.push(this.makeResource(type, x, y));
      }
    }
  }

  createNightResources(camp) {
    for (const [type, definition] of Object.entries(NIGHT_RESOURCES)) {
      for (let index = 0; index < definition.count; index += 1) {
        let x = 0;
        let y = 0;
        let valid = false;
        for (let attempt = 0; attempt < 40 && !valid; attempt += 1) {
          x = rand(90, WORLD.width - 90);
          y = rand(90, WORLD.height - 90);
          valid = Phaser.Math.Distance.Between(x, y, camp.x, camp.y) > 390;
        }
        if (!valid) continue;
        this.nightResources.push(this.makeResource(type, x, y, true));
      }
    }
  }

  setNight(isNight) {
    for (const resource of this.nightResources) {
      resource.node.setVisible(isNight);
      resource.glow.setVisible(isNight);
      resource.hint.setVisible(false);
    }
  }

  makeResource(type, x, y, nightOnly = false) {
    const glow = this.scene.add.image(x, y - 9, 'vfx', 'spark-0')
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.16)
      .setDepth(y - 1)
      .setVisible(!nightOnly);
    const node = this.scene.add.image(x, y, 'nature', `resource-${type}`)
      .setOrigin(0.5, 0.85)
      .setDepth(y)
      .setVisible(!nightOnly);
    const bob = this.scene.tweens.add({
      targets: node,
      y: y - 2,
      duration: Phaser.Math.Between(900, 1350),
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    const hint = this.scene.add.text(x, y - 25, 'E', {
      fontFamily: 'Press Start 2P', fontSize: '8px', color: '#fff3cf',
      backgroundColor: '#26392dcc', padding: { x: 4, y: 3 }
    }).setOrigin(0.5).setDepth(y + 30).setVisible(false);
    const amountConfig = nightOnly ? NIGHT_RESOURCES[type] : RESOURCE_NODES[type];
    const amount = amountConfig
      ? Phaser.Math.Between(amountConfig.amount[0], amountConfig.amount[1])
      : 1;
    return { type, x, y, amount, definition: amountConfig, node, glow, bob, hint };
  }

  revealAround(x, y) {
    const size = WORLD.tileSize * 2;
    const centerX = Math.floor(x / size);
    const centerY = Math.floor(y / size);
    const revealKey = `${centerX},${centerY}`;
    if (revealKey === this.lastRevealKey) return;
    this.lastRevealKey = revealKey;
    this.revealedPoints.push({ x, y });
    for (let row = centerY - 3; row <= centerY + 3; row += 1) {
      for (let col = centerX - 3; col <= centerX + 3; col += 1) {
        this.revealedCells.add(`${col},${row}`);
      }
    }
  }

  getRevealedCells() {
    const cells = [];
    for (const key of this.revealedCells) {
      const [column, row] = key.split(',').map(Number);
      cells.push({ column, row });
    }
    return cells;
  }

  nearbyResource(x, y, range = 58) {
    let closest = null;
    let distance = range;
    for (const resource of [...this.resources, ...this.nightResources]) {
      if (!resource.node.visible) continue;
      const current = Phaser.Math.Distance.Between(x, y, resource.x, resource.y);
      if (current < distance) {
        closest = resource;
        distance = current;
      }
    }
    return closest;
  }

  harvest(resource) {
    resource.bob.stop();
    resource.node.destroy();
    resource.glow.destroy();
    resource.hint.destroy();
    this.resources = this.resources.filter((entry) => entry !== resource);
    this.nightResources = this.nightResources.filter((entry) => entry !== resource);
  }
}
