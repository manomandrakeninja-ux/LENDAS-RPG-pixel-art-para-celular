import Phaser from 'phaser';
import { RESOURCE_TYPES, WORLD } from './config.js';
import { FULL_WORLD, VALLEY } from '../data/worldRegions.js';
import { NIGHT_RESOURCES } from '../data/nightResources.js';
import { RESOURCE_NODES } from '../data/resources.js';

const rand = (min, max) => Math.random() * (max - min) + min;

export class World {
  constructor(scene) {
    this.scene = scene;
    this.resources = [];
    this.nightResources = [];
    // Posições de árvores e arbustos, usadas para desenhar o terreno do mapa e do minimapa.
    this.trees = [];
    this.treeSprites = [];
    this.bushes = [];
    this.revealedCells = new Set();
    this.revealedPoints = [];
    this.fogTexture = null;
    this.fogOverlay = null;
    this.lastRevealKey = '';
  }

  create() {
    // O chão (Vale e regiões novas) é desenhado pelo tilemap do RegionWorld.
    // Tufos, flores e seixos do chão ficam na camada "overlay" do RegionWorld (determinística).
    this.drawForest();
    this.createResources(WORLD.camp);
    this.createNightResources(WORLD.camp);
    this.scene.physics.world.setBounds(0, 0, FULL_WORLD.width, FULL_WORLD.height);
  }

  groundVariant() {
    const roll = Math.random();
    if (roll < 0.57) return 0;
    if (roll < 0.69) return 1;
    if (roll < 0.80) return 2;
    if (roll < 0.89) return 3;
    return Phaser.Math.Between(6, 7);
  }

  drawForest() {
    const { width, height } = VALLEY;
    const { camp } = WORLD;
    for (let i = 0; i < 155; i += 1) {
      const x = rand(40, width - 40);
      const y = rand(40, height - 40);
      if (Phaser.Math.Distance.Between(x, y, camp.x, camp.y) < 470) continue;
      // Duas variantes de pinheiro (assimetrias diferentes), alternadas.
      const variantB = i % 2 === 1;
      const tree = this.scene.add.sprite(x, y, 'nature', variantB ? 'pine-b-0' : 'pine-0')
        .setOrigin(0.5, 0.88)
        .setDepth(y + 10)
        .play(variantB ? 'pine-sway-b' : 'pine-sway');
      // Tronco sólido.
      this.scene.obstacles?.add(x, y - 2, 10, 7);
      if (i % 7 === 0) {
        tree.setTexture('nature', 'autumn-tree').stop();
      } else if (i % 4 === 0) {
        tree.setTexture('nature', 'oak-tree').stop();
      } else if (i % 11 === 0) {
        tree.setTexture('nature', 'fruit-tree').stop();
      } else if (i % 5 === 0) {
        tree.setTexture('nature', variantB ? 'pine-b-1' : 'pine-1').stop();
      }
      this.trees.push({ x, y, kind: tree.frame.name.startsWith('pine') ? 'pine' : tree.frame.name });
      this.treeSprites.push(tree);
    }
    for (let i = 0; i < 48; i += 1) {
      const x = rand(32, width - 32);
      const y = rand(32, height - 32);
      if (Phaser.Math.Distance.Between(x, y, camp.x, camp.y) < 450) continue;
      this.bushes.push({ x, y });
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
          x = rand(90, VALLEY.width - 90);
          y = rand(90, VALLEY.height - 90);
        } while (Phaser.Math.Distance.Between(x, y, camp.x, camp.y) < 460);
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
          x = rand(90, VALLEY.width - 90);
          y = rand(90, VALLEY.height - 90);
          valid = Phaser.Math.Distance.Between(x, y, camp.x, camp.y) > 470;
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

  makeResource(type, x, y, nightOnly = false, options = {}) {
    const glow = this.scene.add.image(x, y - 9, 'vfx', 'spark-0')
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.16)
      .setDepth(y - 1)
      .setVisible(!nightOnly);
    const node = this.scene.add.image(x, y, options.atlas ?? 'nature', options.frame ?? `resource-${type}`)
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
    if (this.scene.gfx?.backgroundAnimations === false) bob.pause();
    const hint = this.scene.add.text(x, y - 25, 'E', {
      fontFamily: 'Press Start 2P', fontSize: '8px', color: '#fff3cf',
      backgroundColor: '#26392dcc', padding: { x: 4, y: 3 }
    }).setOrigin(0.5).setDepth(y + 30).setVisible(false);
    const amountConfig = options.definition ?? (nightOnly ? NIGHT_RESOURCES[type] : RESOURCE_NODES[type]);
    const amount = amountConfig
      ? Phaser.Math.Between(amountConfig.amount[0], amountConfig.amount[1])
      : 1;
    return { type, x, y, amount, definition: amountConfig, node, glow, bob, hint };
  }

  /** Modo Leve: o balanço dos recursos fica parado. */
  setBackgroundAnimations(on) {
    for (const resource of [...this.resources, ...this.nightResources]) {
      const bob = resource.bob;
      if (!bob || !resource.node?.active) continue;
      if (on) bob.resume?.();
      else bob.pause?.();
    }
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
    this.scene.regionWorld?.onHarvest(resource);
    resource.bob.stop();
    resource.node.destroy();
    resource.glow.destroy();
    resource.hint.destroy();
    this.resources = this.resources.filter((entry) => entry !== resource);
    this.nightResources = this.nightResources.filter((entry) => entry !== resource);
  }
}
