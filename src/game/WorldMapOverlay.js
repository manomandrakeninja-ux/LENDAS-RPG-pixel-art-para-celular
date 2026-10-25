import { WORLD } from './config.js';
import { MAP_SCALE } from './MapRenderer.js';
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

const ZOOM_LEVELS = [1, 1.6, 2.6];

export class WorldMapOverlay {
  constructor(scene) {
    this.scene = scene;
    this.root = document.getElementById('world-map');
    this.canvas = document.getElementById('world-map-canvas');
    this.closeButton = document.getElementById('world-map-close');
    this.context = this.canvas.getContext('2d');
    this.isOpen = false;
    this.zoomIndex = 0;
    this.lastMarkerCounts = { camp: 0, structures: 0, chests: 0, strongEnemies: 0, player: 0 };

    this.handleClose = () => this.close();
    this.closeButton.addEventListener('click', this.handleClose);
    // Zoom: botões + e − ao lado do FECHAR e roda do mouse no mapa.
    this.zoomBar = document.getElementById('world-map-zoom') ?? this.createZoomBar();
    this.handleZoomClick = (event) => {
      const button = event.target.closest('button[data-zoom]');
      if (!button) return;
      this.setZoom(this.zoomIndex + Number(button.dataset.zoom));
    };
    this.handleWheel = (event) => {
      if (!this.isOpen) return;
      event.preventDefault();
      this.setZoom(this.zoomIndex + (event.deltaY < 0 ? 1 : -1));
    };
    this.zoomBar.addEventListener('click', this.handleZoomClick);
    this.canvas.addEventListener('wheel', this.handleWheel, { passive: false });
  }

  createZoomBar() {
    const bar = document.createElement('div');
    bar.id = 'world-map-zoom';
    bar.className = 'world-map__zoom';
    bar.innerHTML = '<button type="button" data-zoom="-1" aria-label="Afastar">−</button><button type="button" data-zoom="1" aria-label="Aproximar">+</button>';
    this.closeButton.before(bar);
    return bar;
  }

  setZoom(index) {
    this.zoomIndex = Math.max(0, Math.min(ZOOM_LEVELS.length - 1, index));
    this.render();
  }

  open() {
    this.isOpen = true;
    this.root.hidden = false;
    this.render();
  }

  close() {
    this.isOpen = false;
    this.root.hidden = true;
    this.target = null;
  }

  /** Abre o mapa inteiro com um alfinete num ponto (fonte de um item, por exemplo). */
  showTarget({ x, y, label }) {
    this.target = { x, y, label };
    this.zoomIndex = 0;
    this.open();
  }

  drawTarget(context, toX, toY) {
    const target = this.target;
    if (!target) return;
    const x = Math.round(toX(target.x));
    const y = Math.round(toY(target.y));
    context.save();
    context.strokeStyle = '#ffd76b';
    context.lineWidth = 3;
    context.beginPath();
    context.arc(x, y, 14, 0, Math.PI * 2);
    context.stroke();
    context.fillStyle = '#e0452f';
    context.strokeStyle = '#1a120d';
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(x, y);
    context.arc(x, y - 18, 8, Math.PI * 0.75, Math.PI * 0.25);
    context.closePath();
    context.fill();
    context.stroke();
    context.fillStyle = '#fff1ce';
    context.fillRect(x - 2, y - 20, 4, 4);
    context.font = '9px "Press Start 2P", monospace';
    context.textAlign = 'center';
    context.lineWidth = 4;
    context.strokeStyle = 'rgba(20, 14, 10, 0.9)';
    context.strokeText(target.label.toUpperCase(), x, y - 32);
    context.fillStyle = '#ffd76b';
    context.fillText(target.label.toUpperCase(), x, y - 32);
    context.restore();
  }

  toggle() {
    if (this.isOpen) this.close();
    else this.open();
  }

  /** Área do mundo visível: o mundo todo, ou um recorte centrado no jogador quando há zoom. */
  view() {
    const zoom = ZOOM_LEVELS[this.zoomIndex];
    const width = WORLD.width / zoom;
    const height = WORLD.height / zoom;
    const player = this.scene.player ?? WORLD.camp;
    const left = Math.max(0, Math.min(WORLD.width - width, player.x - width / 2));
    const top = Math.max(0, Math.min(WORLD.height - height, player.y - height / 2));
    return { left, top, width, height, zoom };
  }

  render() {
    if (!this.isOpen) return;
    const context = this.context;
    const width = this.canvas.width;
    const height = this.canvas.height;
    const view = this.view();
    const scale = width / view.width;
    const toX = (x) => (x - view.left) * scale;
    const toY = (y) => (y - view.top) * scale;
    const renderer = this.scene.ui?.mapRenderer;

    context.save();
    context.clearRect(0, 0, width, height);
    context.fillStyle = '#0b0f0d';
    context.fillRect(0, 0, width, height);
    context.imageSmoothingEnabled = false;
    if (renderer) {
      renderer.updateFog();
      const crop = (source) => context.drawImage(
        source,
        view.left / MAP_SCALE, view.top / MAP_SCALE, view.width / MAP_SCALE, view.height / MAP_SCALE,
        0, 0, width, height
      );
      crop(renderer.terrain);
      renderer.drawCamp(context, toX, toY, scale);
      renderer.drawNpcs(context, toX, toY, Math.max(3, 4 * view.zoom));
      crop(renderer.fog);
    }

    // Grade com coordenadas (A–L, 1–9) para orientar o jogador.
    context.strokeStyle = 'rgba(244, 230, 198, 0.08)';
    context.lineWidth = 1;
    context.font = '8px "Press Start 2P", monospace';
    context.fillStyle = 'rgba(244, 230, 198, 0.55)';
    const cellX = WORLD.width / 12;
    const cellY = WORLD.height / 9;
    for (let column = 0; column <= 12; column += 1) {
      const x = Math.round(toX(column * cellX)) + 0.5;
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, height);
      context.stroke();
      if (column < 12) context.fillText(String.fromCharCode(65 + column), toX((column + 0.5) * cellX) - 4, 12);
    }
    for (let row = 0; row <= 9; row += 1) {
      const y = Math.round(toY(row * cellY)) + 0.5;
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(width, y);
      context.stroke();
      if (row < 9) context.fillText(String(row + 1), 4, toY((row + 0.5) * cellY) + 4);
    }

    // Nomes das regiões já exploradas.
    context.textAlign = 'center';
    for (const region of renderer?.regionLabels() ?? []) {
      context.font = '10px "Press Start 2P", monospace';
      context.lineWidth = 4;
      context.strokeStyle = 'rgba(20, 14, 10, 0.85)';
      context.strokeText(region.name.toUpperCase(), toX(region.x), toY(region.y));
      context.fillStyle = '#f4e6c6';
      context.fillText(region.name.toUpperCase(), toX(region.x), toY(region.y));
    }
    context.textAlign = 'left';

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
    renderer?.drawQuestSites(context, toX, toY, { labels: true, size: 7 });
    if (markers.player && renderer) renderer.drawPlayer(context, toX(markers.player.x), toY(markers.player.y), 9);
    else if (markers.player) drawMarker(context, markers.player, toX, toY);

    this.drawTarget(context, toX, toY);
    this.drawCompass(context, width - 46, 46);
    this.drawScaleBar(context, 18, height - 22, scale);
    context.restore();

    this.lastMarkerCounts = {
      camp: 1,
      structures: markers.structures.length,
      chests: markers.chests.length,
      strongEnemies: markers.strongEnemies.length,
      player: markers.player ? 1 : 0
    };
  }

  drawCompass(context, x, y) {
    context.save();
    context.translate(x, y);
    context.fillStyle = 'rgba(36, 25, 15, 0.85)';
    context.strokeStyle = '#c9a76b';
    context.lineWidth = 2;
    context.beginPath();
    context.arc(0, 0, 28, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    for (const [angle, color] of [[0, '#e2463f'], [Math.PI, '#f4e6c6'], [Math.PI / 2, '#c9a76b'], [-Math.PI / 2, '#c9a76b']]) {
      context.save();
      context.rotate(angle);
      context.fillStyle = color;
      context.beginPath();
      context.moveTo(0, -22);
      context.lineTo(5, 0);
      context.lineTo(-5, 0);
      context.closePath();
      context.fill();
      context.restore();
    }
    context.fillStyle = '#ffe08a';
    context.font = '8px "Press Start 2P", monospace';
    context.textAlign = 'center';
    context.fillText('N', 0, -30);
    context.restore();
  }

  drawScaleBar(context, x, y, scale) {
    const steps = 50;
    const length = steps * 10 * scale;
    context.fillStyle = 'rgba(36, 25, 15, 0.85)';
    context.fillRect(x - 6, y - 16, length + 120, 24);
    context.fillStyle = '#f4e6c6';
    context.fillRect(x, y - 2, length, 4);
    context.fillRect(x, y - 6, 2, 12);
    context.fillRect(x + length - 2, y - 6, 2, 12);
    context.font = '8px "Press Start 2P", monospace';
    context.fillText(`${steps} passos`, x + length + 10, y + 4);
  }

  destroy() {
    this.closeButton.removeEventListener('click', this.handleClose);
    this.zoomBar?.removeEventListener('click', this.handleZoomClick);
    this.canvas.removeEventListener('wheel', this.handleWheel);
  }
}
