import Phaser from 'phaser';
import {
  HARVEST_STRUCTURE_INTERACTION_RANGE,
  HARVEST_STRUCTURE_TYPES,
  HarvestStructureState
} from '../data/harvestStructures.js';
import { WORLD } from './config.js';

const TEXTURE_SIZE = 32;
const TEXTURE_KEY_PREFIX = 'harvest-structure-';

function fillRect(context, x, y, width, height, color) {
  context.fillStyle = color;
  context.fillRect(Math.floor(x), Math.floor(y), Math.floor(width), Math.floor(height));
}

function fillEllipse(context, centerX, centerY, radiusX, radiusY, color) {
  context.fillStyle = color;
  const minimumX = Math.floor(centerX - radiusX);
  const maximumX = Math.ceil(centerX + radiusX);
  const minimumY = Math.floor(centerY - radiusY);
  const maximumY = Math.ceil(centerY + radiusY);
  for (let y = minimumY; y <= maximumY; y += 1) {
    for (let x = minimumX; x <= maximumX; x += 1) {
      const normalizedX = (x + 0.5 - centerX) / radiusX;
      const normalizedY = (y + 0.5 - centerY) / radiusY;
      if (normalizedX * normalizedX + normalizedY * normalizedY <= 1) {
        context.fillRect(x, y, 1, 1);
      }
    }
  }
}

function fillPolygon(context, points, color) {
  context.fillStyle = color;
  const minimumX = Math.floor(Math.min(...points.map(([x]) => x)));
  const maximumX = Math.ceil(Math.max(...points.map(([x]) => x)));
  const minimumY = Math.floor(Math.min(...points.map(([, y]) => y)));
  const maximumY = Math.ceil(Math.max(...points.map(([, y]) => y)));
  const inside = (x, y) => {
    let result = false;
    for (let current = 0, previous = points.length - 1; current < points.length; previous = current, current += 1) {
      const [currentX, currentY] = points[current];
      const [previousX, previousY] = points[previous];
      if (((currentY > y) !== (previousY > y)) &&
          x < (previousX - currentX) * (y - currentY) / (previousY - currentY) + currentX) {
        result = !result;
      }
    }
    return result;
  };
  for (let y = minimumY; y <= maximumY; y += 1) {
    for (let x = minimumX; x <= maximumX; x += 1) {
      if (inside(x + 0.5, y + 0.5)) context.fillRect(x, y, 1, 1);
    }
  }
}

function drawTree(context) {
  fillEllipse(context, 16, 29, 9, 2, 'rgba(24, 35, 27, 0.42)');
  fillRect(context, 14, 17, 5, 12, '#69462f');
  fillRect(context, 15, 18, 2, 10, '#a36b3f');
  fillEllipse(context, 16, 13, 12, 11, '#294b34');
  fillEllipse(context, 16, 12, 10, 9, '#477b43');
  fillEllipse(context, 13, 9, 5, 4, '#68a653');
  fillRect(context, 10, 12, 2, 2, '#83bd61');
  fillRect(context, 19, 8, 2, 2, '#5f9749');
}

function drawRock(context) {
  fillEllipse(context, 16, 28, 11, 2, 'rgba(24, 35, 27, 0.42)');
  fillPolygon(context, [[5, 24], [7, 12], [13, 6], [23, 8], [28, 17], [25, 25], [16, 28]], '#4e5954');
  fillPolygon(context, [[8, 22], [10, 13], [15, 9], [21, 11], [22, 20], [16, 24]], '#7c8880');
  fillRect(context, 10, 13, 4, 2, '#a8b0a5');
  fillRect(context, 18, 18, 4, 3, '#606c66');
}

function drawHerbBush(context) {
  fillEllipse(context, 16, 28, 10, 2, 'rgba(24, 35, 27, 0.42)');
  fillEllipse(context, 16, 20, 12, 8, '#315d38');
  fillEllipse(context, 16, 18, 10, 7, '#4f8a47');
  fillEllipse(context, 12, 15, 5, 4, '#70a84f');
  fillRect(context, 12, 17, 2, 2, '#d6d66f');
  fillRect(context, 20, 20, 2, 2, '#d6d66f');
  fillRect(context, 17, 13, 2, 2, '#b6c95e');
}

function drawMushroom(context) {
  fillEllipse(context, 16, 28, 8, 2, 'rgba(24, 35, 27, 0.42)');
  fillRect(context, 13, 16, 7, 11, '#d8c5a0');
  fillRect(context, 14, 17, 2, 8, '#f0dfbc');
  fillEllipse(context, 16, 15, 11, 8, '#7d2f2d');
  fillEllipse(context, 16, 14, 10, 7, '#b84a3f');
  fillRect(context, 9, 12, 3, 2, '#f2d9b5');
  fillRect(context, 18, 10, 3, 2, '#f2d9b5');
  fillRect(context, 14, 15, 2, 2, '#f2d9b5');
}

function drawChest(context) {
  fillEllipse(context, 16, 28, 11, 2, 'rgba(24, 35, 27, 0.42)');
  fillRect(context, 5, 11, 22, 16, '#5b3825');
  fillRect(context, 6, 12, 20, 14, '#8b5832');
  fillRect(context, 7, 9, 18, 8, '#6b4029');
  fillRect(context, 8, 10, 16, 6, '#a56a39');
  fillRect(context, 9, 9, 3, 17, '#d3a84e');
  fillRect(context, 20, 9, 3, 17, '#d3a84e');
  fillRect(context, 14, 16, 5, 5, '#f0c85d');
  fillRect(context, 16, 18, 2, 3, '#55351f');
}

function drawOreVein(context) {
  fillEllipse(context, 16, 28, 11, 2, 'rgba(24, 35, 27, 0.42)');
  fillRect(context, 6, 8, 20, 19, '#5c351f');
  fillRect(context, 8, 10, 16, 15, '#9a5124');
  fillRect(context, 10, 12, 4, 3, '#d88735');
  fillRect(context, 18, 15, 4, 3, '#e6a044');
  fillRect(context, 13, 20, 5, 3, '#bd6827');
  fillRect(context, 6, 8, 20, 2, '#3a241c');
  fillRect(context, 6, 25, 20, 2, '#3a241c');
}

function drawCoalVein(context) {
  fillEllipse(context, 16, 28, 11, 2, 'rgba(24, 35, 27, 0.42)');
  fillPolygon(context, [[5, 23], [9, 10], [18, 6], [27, 14], [25, 25], [14, 28]], '#1d2023');
  fillPolygon(context, [[9, 20], [12, 12], [19, 10], [22, 18], [17, 23]], '#34383c');
  fillRect(context, 13, 15, 3, 2, '#62666a');
}

function drawGoldVein(context) {
  fillEllipse(context, 16, 28, 11, 2, 'rgba(24, 35, 27, 0.42)');
  fillPolygon(context, [[5, 23], [8, 11], [17, 6], [27, 15], [24, 25], [14, 28]], '#4f4328');
  fillRect(context, 10, 12, 5, 5, '#c99828');
  fillRect(context, 18, 14, 5, 5, '#f0c747');
  fillRect(context, 13, 21, 6, 3, '#d7a82e');
  fillRect(context, 18, 15, 2, 2, '#fff09a');
}

function drawMineMarker(context) {
  fillEllipse(context, 16, 29, 14, 2, 'rgba(24, 35, 27, 0.5)');
  fillPolygon(context, [[2, 27], [6, 8], [13, 2], [22, 6], [30, 27]], '#4b504b');
  fillRect(context, 6, 11, 20, 17, '#252a28');
  fillRect(context, 8, 14, 16, 14, '#111615');
  fillRect(context, 14, 4, 4, 19, '#9d633b');
  fillPolygon(context, [[13, 5], [27, 10], [24, 15], [12, 11]], '#b9b9a8');
  fillRect(context, 6, 26, 20, 3, '#73766d');
}

const STRUCTURE_DRAWERS = {
  tree: drawTree,
  rock: drawRock,
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
      world: WORLD
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
      const context = texture.getContext();
      context.imageSmoothingEnabled = false;
      context.clearRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);
      (STRUCTURE_DRAWERS[type] ?? drawTree)(context);
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
