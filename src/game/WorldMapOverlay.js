import { WORLD } from './config.js';
import { DUNGEON_CONFIG } from '../data/buildings.js';

export const WORLD_MAP_MARKER_TYPES = Object.freeze({
  camp: 'camp',
  resource: 'resource',
  chest: 'chest',
  enemy: 'enemy',
  player: 'player',
  mine: 'mine',
  dungeon: 'dungeon'
});

// A mina aparece sempre (ícone especial); a masmorra, depois que o acampamento fica completo.
export function collectWorldMapMarkers({ structures = [], enemies = [], boss = null, player, dungeonRevealed = false } = {}) {
  const discoveredStructures = structures.filter((structure) => structure?.discovered && structure.type !== 'mineMarker');
  const mine = structures.find((structure) => structure?.type === 'mineMarker');
  return {
    mine: mine ? { x: mine.x, y: mine.y, type: WORLD_MAP_MARKER_TYPES.mine } : null,
    dungeon: dungeonRevealed ? { x: DUNGEON_CONFIG.x, y: DUNGEON_CONFIG.y, type: WORLD_MAP_MARKER_TYPES.dungeon } : null,
    camp: { x: WORLD.camp.x, y: WORLD.camp.y, type: WORLD_MAP_MARKER_TYPES.camp },
    player: player
      ? { x: player.x, y: player.y, type: WORLD_MAP_MARKER_TYPES.player }
      : null,
    structures: discoveredStructures
      .filter((structure) => structure.type !== 'chest')
      .map((structure) => ({
        x: structure.x,
        y: structure.y,
        type: WORLD_MAP_MARKER_TYPES.resource,
        structureType: structure.type
      })),
    chests: discoveredStructures
      .filter((structure) => structure.type === 'chest' && !structure.collected)
      .map((structure) => ({
        x: structure.x,
        y: structure.y,
        type: WORLD_MAP_MARKER_TYPES.chest
      })),
    strongEnemies: [
      ...enemies
        .filter((enemy) => enemy?.isElite || enemy?.isBoss || enemy?.kind === 'boss')
        .map((enemy) => ({
          x: enemy.x,
          y: enemy.y,
          type: WORLD_MAP_MARKER_TYPES.enemy
        })),
      ...(boss && !boss.dead
        ? [{ x: boss.x, y: boss.y, type: WORLD_MAP_MARKER_TYPES.enemy }]
        : [])
    ]
  };
}

function drawMarker(context, marker, toX, toY) {
  const x = toX(marker.x);
  const y = toY(marker.y);
  context.save();
  context.translate(Math.round(x), Math.round(y));
  context.lineWidth = 2;
  context.strokeStyle = '#101713';
  context.fillStyle = '#ffffff';

  if (marker.type === WORLD_MAP_MARKER_TYPES.player) {
    context.beginPath();
    context.arc(0, 0, 7, 0, Math.PI * 2);
    context.fillStyle = '#ffe06a';
    context.fill();
    context.stroke();
  } else if (marker.type === WORLD_MAP_MARKER_TYPES.camp) {
    context.beginPath();
    context.moveTo(0, -9);
    context.lineTo(9, 8);
    context.lineTo(-9, 8);
    context.closePath();
    context.fillStyle = '#e1a65f';
    context.fill();
    context.stroke();
  } else if (marker.type === WORLD_MAP_MARKER_TYPES.enemy) {
    context.rotate(Math.PI / 4);
    context.fillStyle = '#e15950';
    context.fillRect(-7, -7, 14, 14);
    context.strokeRect(-7, -7, 14, 14);
  } else if (marker.type === WORLD_MAP_MARKER_TYPES.mine) {
    context.fillStyle = '#1b1b1f';
    context.fillRect(-9, -9, 18, 18);
    context.strokeStyle = '#c1cbd0';
    context.strokeRect(-9, -9, 18, 18);
    context.fillStyle = '#c1cbd0';
    context.fillRect(-5, -1, 10, 2);
    context.fillRect(-1, -5, 2, 10);
  } else if (marker.type === WORLD_MAP_MARKER_TYPES.dungeon) {
    context.beginPath();
    context.moveTo(0, -12);
    context.lineTo(11, 9);
    context.lineTo(-11, 9);
    context.closePath();
    context.fillStyle = '#e2463f';
    context.fill();
    context.stroke();
    context.fillStyle = '#120c0e';
    context.fillRect(-3, 1, 6, 8);
  } else if (marker.type === WORLD_MAP_MARKER_TYPES.chest) {
    context.fillStyle = '#d69b45';
    context.fillRect(-8, -6, 16, 12);
    context.strokeRect(-8, -6, 16, 12);
    context.fillStyle = '#f5d887';
    context.fillRect(-2, -2, 4, 4);
  } else {
    context.fillStyle = marker.structureType === 'mineMarker' ? '#6fc2bd' : '#6fbd62';
    context.fillRect(-6, -6, 12, 12);
    context.strokeRect(-6, -6, 12, 12);
  }
  context.restore();
}

export class WorldMapOverlay {
  constructor(scene) {
    this.scene = scene;
    this.root = document.getElementById('world-map');
    this.canvas = document.getElementById('world-map-canvas');
    this.closeButton = document.getElementById('world-map-close');
    this.context = this.canvas.getContext('2d');
    this.isOpen = false;
    this.lastMarkerCounts = { camp: 0, structures: 0, chests: 0, strongEnemies: 0, player: 0 };

    this.handleClose = () => this.close();
    this.closeButton.addEventListener('click', this.handleClose);
  }

  open() {
    this.isOpen = true;
    this.root.hidden = false;
    this.render();
  }

  close() {
    this.isOpen = false;
    this.root.hidden = true;
  }

  toggle() {
    if (this.isOpen) this.close();
    else this.open();
  }

  render() {
    if (!this.isOpen) return;
    const context = this.context;
    const width = this.canvas.width;
    const height = this.canvas.height;
    const toX = (x) => (x / WORLD.width) * width;
    const toY = (y) => (y / WORLD.height) * height;

    context.clearRect(0, 0, width, height);
    context.fillStyle = '#07100c';
    context.fillRect(0, 0, width, height);

    context.strokeStyle = 'rgba(89, 119, 77, 0.13)';
    context.lineWidth = 1;
    for (let x = 0; x <= width; x += 40) {
      context.beginPath();
      context.moveTo(x + 0.5, 0);
      context.lineTo(x + 0.5, height);
      context.stroke();
    }
    for (let y = 0; y <= height; y += 40) {
      context.beginPath();
      context.moveTo(0, y + 0.5);
      context.lineTo(width, y + 0.5);
      context.stroke();
    }

    const revealedCells = this.scene.world?.getRevealedCells?.() ?? [];
    const fogSize = WORLD.tileSize * 2;
    const columns = Math.ceil(WORLD.width / fogSize);
    const rows = Math.ceil(WORLD.height / fogSize);
    const cellWidth = width / columns;
    const cellHeight = height / rows;
    context.fillStyle = 'rgba(79, 119, 72, 0.72)';
    for (const cell of revealedCells) {
      const x = cell.column * cellWidth;
      const y = cell.row * cellHeight;
      if (x < 0 || y < 0 || x >= width || y >= height) continue;
      context.fillRect(
        Math.floor(x),
        Math.floor(y),
        Math.max(1, Math.ceil(cellWidth)),
        Math.max(1, Math.ceil(cellHeight))
      );
    }

    const markers = collectWorldMapMarkers({
      structures: this.scene.harvestStructures?.state?.structures ?? [],
      enemies: this.scene.enemies ?? [],
      boss: this.scene.boss ?? null,
      player: this.scene.player,
      dungeonRevealed: Boolean(this.scene.camp?.dungeonRevealed || this.scene.camp?.defense?.dragonRadar)
    });
    drawMarker(context, markers.camp, toX, toY);
    if (markers.mine) drawMarker(context, markers.mine, toX, toY);
    if (markers.dungeon) drawMarker(context, markers.dungeon, toX, toY);
    markers.structures.forEach((marker) => drawMarker(context, marker, toX, toY));
    markers.chests.forEach((marker) => drawMarker(context, marker, toX, toY));
    markers.strongEnemies.forEach((marker) => drawMarker(context, marker, toX, toY));
    if (markers.player) drawMarker(context, markers.player, toX, toY);

    this.lastMarkerCounts = {
      camp: 1,
      structures: markers.structures.length,
      chests: markers.chests.length,
      strongEnemies: markers.strongEnemies.length,
      player: markers.player ? 1 : 0
    };
  }

  destroy() {
    this.closeButton.removeEventListener('click', this.handleClose);
  }
}
