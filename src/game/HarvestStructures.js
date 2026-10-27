import Phaser from 'phaser';
import {
  HARVEST_STRUCTURE_INTERACTION_RANGE,
  HARVEST_STRUCTURE_TYPES,
  HarvestStructureState
} from '../data/harvestStructures.js';
import { WORLD } from './config.js';
import { PixelCanvas, dither, ramp } from '../art/pixel.js';

const TEXTURE_SIZE = 32;
const TEXTURE_KEY_PREFIX = 'harvest-structure-';

const STONE = ['#3f454a', '#5d6569', '#7f878a', '#a7aeab', '#cfd0c4'];
const WOOD = ['#4a2f1e', '#6e4628', '#94633a', '#b98450'];

/** Rocha facetada com luz do alto à esquerda (usada nas rochas e nos veios). */
function rock(canvas, points, colors = STONE, center = [16, 18], size = [12, 10]) {
  const [cx, cy] = center;
  const [width, height] = size;
  canvas.forPolygon(points, (x, y) => {
    const value = -((x - cx) / width) * 0.6 - ((y - cy) / height) * 0.9 + (dither(x, y) - 0.5) * 0.3;
    canvas.pixel(x, y, colors[value > 0.8 ? 4 : value > 0.3 ? 3 : value > -0.35 ? 2 : 1]);
  });
}

const ROCK_SHAPE = [[4, 25], [6, 14], [12, 7], [21, 7], [28, 15], [27, 25], [17, 28]];

function oreSpecks(canvas, colors, spots) {
  for (const [x, y, size] of spots) {
    canvas.rect(x, y, size, size, colors[1]);
    canvas.pixel(x, y, colors[2]);
    canvas.pixel(x + size - 1, y + size - 1, colors[0]);
  }
}

function drawTree(canvas) {
  canvas.shadow(16, 29, 10, 2.2, 110);
  canvas.rect(14, 18, 5, 11, WOOD[1]);
  canvas.rect(14, 18, 2, 11, WOOD[2]);
  canvas.rect(18, 18, 1, 11, WOOD[0]);
  const leaves = ramp('#4a8a48');
  for (const [x, y, rx, ry] of [[16, 13, 11, 9], [10, 15, 6, 5], [22, 15, 6, 5], [16, 7, 7, 5]]) canvas.shadedEllipse(x, y, rx, ry, leaves);
  for (const [x, y] of [[11, 12], [20, 9], [18, 16]]) {
    canvas.rect(x, y, 2, 2, '#d8413a');
    canvas.pixel(x, y, '#ff9a7a');
  }
}

function drawRock(canvas) {
  canvas.shadow(16, 28, 12, 2.4, 115);
  rock(canvas, ROCK_SHAPE);
  canvas.line(15, 12, 19, 20, STONE[1]);
  canvas.line(19, 20, 23, 22, STONE[1]);
  canvas.pixel(9, 23, '#5f9650');
  canvas.pixel(10, 24, '#4a7b48');
  canvas.pixel(11, 24, '#5f9650');
}

function drawStone(canvas) {
  canvas.shadow(16, 28, 12, 2.4, 115);
  canvas.forPolygon([[5, 24], [8, 15], [12, 9], [20, 9], [26, 17], [27, 25], [18, 28]], (x, y) => {
    const value = (dither(x, y) - 0.5) * 0.5;
    canvas.pixel(x, y, value > 0.2 ? STONE[4] : value > -0.2 ? STONE[2] : STONE[1]);
  });
}

function drawHerbBush(canvas) {
  canvas.shadow(16, 28, 11, 2.2, 105);
  const leaves = ['#2f5f36', '#4f8a47', '#76b157', '#a9d77c'];
  for (const [x, y, rx, ry] of [[16, 20, 12, 7], [11, 16, 6, 5], [21, 16, 6, 5], [16, 13, 6, 5]]) canvas.shadedEllipse(x, y, rx, ry, leaves);
  for (const [x, y] of [[11, 14], [20, 13], [15, 18], [23, 19], [8, 20]]) {
    canvas.pixel(x, y, '#f2efb0');
    canvas.pixel(x + 1, y, '#d9cf6a');
    canvas.pixel(x, y + 1, '#d9cf6a');
  }
}

function drawMushroom(canvas) {
  canvas.shadow(16, 28, 9, 2, 105);
  canvas.rect(13, 16, 7, 11, '#e9dcc0');
  canvas.rect(13, 16, 2, 11, '#fbf2dc');
  canvas.rect(18, 16, 2, 11, '#c8b996');
  canvas.rect(12, 26, 9, 1, '#c8b996');
  const cap = ['#7d2a26', '#b8433a', '#de6a52', '#f59a7c'];
  canvas.forEllipse(16, 15, 12, 9, (x, y, nx, ny) => {
    if (y > 17) return;
    const value = -nx * 0.5 - ny * 0.9 + (dither(x, y) - 0.5) * 0.25;
    canvas.pixel(x, y, cap[value > 0.9 ? 3 : value > 0.35 ? 2 : value > -0.3 ? 1 : 0]);
  });
  canvas.rect(5, 17, 22, 1, '#7d2a26');
  for (const [x, y, size] of [[9, 12, 3], [18, 9, 3], [14, 14, 2], [22, 14, 2], [12, 8, 2]]) {
    canvas.rect(x, y, size, size - 1, '#fbeedd');
    canvas.pixel(x, y, '#ffffff');
  }
}

function drawChest(canvas) {
  canvas.shadow(16, 28, 12, 2.2, 115);
  const wood = ramp('#9a6136');
  // Corpo.
  canvas.rect(5, 15, 22, 12, wood[1]);
  for (let y = 17; y < 27; y += 3) canvas.rect(5, y, 22, 1, wood[0]);
  canvas.rect(5, 15, 2, 12, wood[2]);
  // Tampa arredondada.
  canvas.forEllipse(16, 15, 11, 7, (x, y, nx, ny) => {
    if (y > 15) return;
    canvas.pixel(x, y, ny < -0.6 ? wood[2] : ny < -0.2 ? wood[1] : wood[0]);
  });
  canvas.rect(5, 15, 22, 2, wood[0]);
  // Ferragens douradas e fechadura.
  const gold = ['#8a5e1a', '#d3a03a', '#f2cf65', '#fff2b0'];
  for (const x of [8, 22]) {
    canvas.rect(x, 9, 2, 18, gold[1]);
    canvas.rect(x, 9, 1, 18, gold[2]);
  }
  canvas.rect(13, 14, 6, 7, gold[1]);
  canvas.rect(13, 14, 6, 1, gold[3]);
  canvas.rect(15, 17, 2, 3, '#3a2414');
  canvas.pixel(15, 16, gold[0]);
}

function drawOreVein(canvas) {
  canvas.shadow(16, 28, 12, 2.4, 115);
  rock(canvas, ROCK_SHAPE);
  oreSpecks(canvas, ['#7a3d1c', '#c46a2e', '#f0a45a'], [[10, 12, 3], [18, 15, 3], [13, 20, 2], [21, 22, 2], [8, 19, 2]]);
  canvas.pixel(19, 15, '#ffd29a');
}

function drawCoalVein(canvas) {
  canvas.shadow(16, 28, 12, 2.4, 115);
  rock(canvas, ROCK_SHAPE);
  const coal = ['#0d0f12', '#1d2126', '#4a5058'];
  canvas.forPolygon([[9, 21], [11, 13], [18, 10], [23, 17], [18, 23]], (x, y) => {
    canvas.pixel(x, y, dither(x, y) > 0.8 ? coal[2] : (x + y) % 5 === 0 ? coal[0] : coal[1]);
  });
  canvas.pixel(13, 14, '#8a9099');
  canvas.pixel(19, 18, '#8a9099');
}

function drawGoldVein(canvas) {
  canvas.shadow(16, 28, 12, 2.4, 115);
  rock(canvas, ROCK_SHAPE, ['#3a3226', '#57492f', '#6f5f3e', '#8c7a50', '#a8956a']);
  oreSpecks(canvas, ['#9a6a12', '#e8b83a', '#fff09a'], [[10, 12, 4], [18, 14, 4], [13, 21, 3], [22, 21, 2]]);
  // Brilho.
  canvas.pixel(24, 9, '#fff6c8');
  canvas.pixel(23, 10, '#fff6c8');
  canvas.pixel(25, 10, '#fff6c8');
  canvas.pixel(24, 11, '#fff6c8');
}

function drawMineMarker(canvas) {
  canvas.shadow(16, 29, 15, 2.4, 120);
  rock(canvas, [[1, 29], [4, 12], [11, 4], [21, 4], [29, 12], [31, 29]], STONE, [16, 16], [15, 13]);
  // Boca da mina com escoras de madeira.
  canvas.rect(8, 12, 16, 17, '#0f1312');
  canvas.rect(9, 14, 14, 15, '#070a09');
  canvas.rect(7, 11, 3, 18, WOOD[2]);
  canvas.rect(22, 11, 3, 18, WOOD[1]);
  canvas.rect(6, 9, 20, 3, WOOD[2]);
  canvas.rect(6, 9, 20, 1, WOOD[3]);
  // Trilhos saindo da mina.
  canvas.rect(11, 27, 1, 3, '#8d9496');
  canvas.rect(20, 27, 1, 3, '#8d9496');
  canvas.rect(10, 28, 12, 1, WOOD[1]);
  // Lanterna.
  canvas.rect(25, 13, 3, 4, '#f2c45c');
  canvas.pixel(25, 13, '#fff3c4');
}

const STRUCTURE_DRAWERS = {
  tree: drawTree,
  rock: drawRock,
  stone: drawStone,
  herbBush: drawHerbBush,
  mushroom: drawMushroom,
  chest: drawChest,
  oreVein: drawOreVein,
  coalVein: drawCoalVein,
  goldVein: drawGoldVein,
  mineMarker: drawMineMarker
};

export class HarvestStructures {
  constructor(scene, { saved = [], dayCount = 1 } = {}) {
    this.scene = scene;
    this.dayCount = Math.max(1, Math.floor(Number(dayCount) || 1));
    this.isNight = false;
    this.state = new HarvestStructureState({
      saved,
      dayCount: this.dayCount,
      // Estruturas de coleta continuam só no Vale.
      world: { ...WORLD, width: WORLD.valley.width, height: WORLD.valley.height }
    });
    this.ensureTextures();
    for (const structure of this.state.structures) {
      if (structure.available) this.createNode(structure);
    }
  }

  ensureTextures() {
    for (const type of Object.keys(HARVEST_STRUCTURE_TYPES)) {
      const key = `${TEXTURE_KEY_PREFIX}${type}`;
      if (this.scene.textures.exists(key)) continue;
      const texture = this.scene.textures.createCanvas(key, TEXTURE_SIZE, TEXTURE_SIZE);
      const pixels = new PixelCanvas(TEXTURE_SIZE, TEXTURE_SIZE);
      (STRUCTURE_DRAWERS[type] ?? drawTree)(pixels);
      pixels.outline();
      texture.getContext().putImageData(new ImageData(pixels.data, TEXTURE_SIZE, TEXTURE_SIZE), 0, 0);
      texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      texture.refresh();
    }
  }

  createNode(structure) {
    if (structure.node?.active) return structure.node;
    const definition = HARVEST_STRUCTURE_TYPES[structure.type];
    const node = this.scene.add.image(
      structure.x,
      structure.y,
      `${TEXTURE_KEY_PREFIX}${structure.type}`
    )
      .setOrigin(0.5, 0.9)
      .setDepth(structure.y + 8);
    if (definition.poi) node.setScale(1.45);
    const hintY = structure.y - (structure.type === 'tree' ? 42 : 31);
    const hint = definition.poi ? null : this.scene.add.text(structure.x, hintY, 'E', {
      fontFamily: 'Press Start 2P', fontSize: '8px', color: '#fff3cf',
      backgroundColor: '#26392dcc', padding: { x: 4, y: 3 }
    }).setOrigin(0.5).setDepth(structure.y + 35).setVisible(false);

    structure.node = node;
    structure.hint = hint;
    structure.markerLabel = definition.poi
      ? this.scene.add.text(structure.x, structure.y - 52, 'MINA', {
        fontFamily: 'Press Start 2P', fontSize: '8px', color: '#ffdb74',
        backgroundColor: '#2d241ddd', padding: { x: 5, y: 4 }
      }).setOrigin(0.5).setDepth(structure.y + 35)
      : null;
    structure.collecting = false;
    if (structure.type === 'tree' || structure.type === 'herbBush') {
      structure.swayTween = this.scene.tweens.add({
        targets: node,
        angle: structure.type === 'tree' ? 0.025 : 0.04,
        duration: structure.type === 'tree' ? 1100 : 820,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    } else if (structure.type === 'mushroom') {
      structure.swayTween = this.scene.tweens.add({
        targets: node,
        y: structure.y - 2,
        duration: 920,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }
    this.setNodeVisibility(structure, definition);
    return node;
  }

  setNodeVisibility(structure, definition = HARVEST_STRUCTURE_TYPES[structure.type]) {
    if (!structure.node) return;
    const visible = structure.available && !structure.collected && (!definition.nightOnly || this.isNight);
    structure.node.setVisible(visible);
    structure.markerLabel?.setVisible(visible);
    if (!visible) structure.hint?.setVisible(false);
  }

  setNight(isNight) {
    this.isNight = Boolean(isNight);
    for (const structure of this.state.structures) {
      this.setNodeVisibility(structure);
    }
  }

  discoverNear(x, y, radius = 260) {
    let changed = false;
    for (const structure of this.state.structures) {
      if (structure.discovered) continue;
      if (Math.hypot(x - structure.x, y - structure.y) > radius) continue;
      structure.discovered = true;
      changed = true;
    }
    return changed;
  }

  nearest(x, y, range = HARVEST_STRUCTURE_INTERACTION_RANGE) {
    let closest = null;
    let closestDistance = range;
    for (const structure of this.state.structures) {
      const definition = HARVEST_STRUCTURE_TYPES[structure.type];
      if (!structure.available || structure.collected || structure.collecting || definition.poi) continue;
      if (definition.nightOnly && !this.isNight) continue;
      if (!structure.node?.visible) continue;
      const distance = Math.hypot(x - structure.x, y - structure.y);
      if (distance < closestDistance) {
        closest = structure;
        closestDistance = distance;
      }
    }
    return closest;
  }

  updateHints(nearest) {
    for (const structure of this.state.structures) {
      if (!structure.hint) continue;
      structure.hint.setVisible(structure === nearest && structure.node?.visible === true);
    }
  }

  previewReward(structure) {
    return this.state.rollReward(structure);
  }

  reserveCollection(structure) {
    if (!structure?.available || structure.collecting) return false;
    if (HARVEST_STRUCTURE_TYPES[structure.type]?.poi) return false;
    structure.collecting = true;
    structure.hint?.setVisible(false);
    structure.swayTween?.stop();
    return true;
  }

  cancelCollection(structure) {
    if (!structure) return;
    structure.collecting = false;
    structure.node?.clearTint();
    structure.node?.setAlpha(1);
    structure.hint?.setVisible(true);
  }

  collect(structure, onComplete = () => {}) {
    if (!structure?.available) return false;
    const collected = this.state.collect(structure.id, this.dayCount);
    if (!collected) return false;
    structure.collecting = true;
    structure.hint?.setVisible(false);
    structure.swayTween?.stop();

    const node = structure.node;
    structure.node = null;
    if (!node) {
      onComplete();
      return true;
    }
    node.setTint(0xffffff);
    this.scene.tweens.add({
      targets: node,
      alpha: 0.12,
      duration: 70,
      yoyo: true,
      repeat: 3,
      onComplete: () => {
        this.scene.tweens.add({
          targets: node,
          scaleX: 0,
          scaleY: 0,
          duration: 150,
          ease: 'Back.easeIn',
          onComplete: () => {
            structure.hint?.destroy();
            structure.hint = null;
            node.destroy();
            onComplete();
          }
        });
      }
    });
    return true;
  }

  handleDayChange(dayCount) {
    this.dayCount = Math.max(1, Math.floor(Number(dayCount) || 1));
    const regenerated = this.state.handleDayChange(this.dayCount);
    for (const structure of this.state.structures) {
      if (structure.available && !structure.node) this.createNode(structure);
      this.setNodeVisibility(structure);
    }
    return regenerated;
  }

  get counts() {
    return Object.fromEntries(Object.keys(HARVEST_STRUCTURE_TYPES).map((type) => [
      type,
      this.state.byType(type).length
    ]));
  }

  serialize() {
    return this.state.serialize();
  }
}
