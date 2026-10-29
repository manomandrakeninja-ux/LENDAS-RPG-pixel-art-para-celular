import { WORLD } from './config.js';
import { MAP_SCALE } from './MapRenderer.js';
import { DUNGEON_CONFIG } from '../data/buildings.js';
import { regionCardAt } from './RegionCard.js';
import { paintBurntEdge } from './mapParchment.js';

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

// Fase 20H: ícones pintados dos locais (scripts/bake-ui.mjs), desenhados em 2x sobre o pergaminho.
const MAP_ICON_URLS = {
  camp: new URL('../ui-skin/icon-tent.png', import.meta.url).href,
  mine: new URL('../ui-skin/icon-pick.png', import.meta.url).href,
  dungeon: new URL('../ui-skin/icon-skull.png', import.meta.url).href,
  chest: new URL('../ui-skin/icon-chest.png', import.meta.url).href,
  cave: new URL('../ui-skin/icon-cave.png', import.meta.url).href,
  tower: new URL('../ui-skin/icon-tower.png', import.meta.url).href,
  dock: new URL('../ui-skin/icon-anchor.png', import.meta.url).href,
  flag: new URL('../ui-skin/icon-flag.png', import.meta.url).href
};

function loadMapIcons() {
  if (typeof Image === 'undefined') return {};
  return Object.fromEntries(Object.entries(MAP_ICON_URLS).map(([key, url]) => {
    const image = new Image();
    image.src = url;
    return [key, image];
  }));
}

/** Ícone pintado com sombra de tinta embaixo; devolve false se a imagem ainda não carregou. */
function drawIcon(context, image, x, y, scale = 2) {
  if (!image?.complete || !image.naturalWidth) return false;
  const w = image.naturalWidth * scale;
  const h = image.naturalHeight * scale;
  context.fillStyle = 'rgba(40, 24, 12, 0.35)';
  context.beginPath();
  context.ellipse(Math.round(x), Math.round(y + h / 2 - 2), w * 0.4, 4, 0, 0, Math.PI * 2);
  context.fill();
  context.drawImage(image, Math.round(x - w / 2), Math.round(y - h / 2), w, h);
  return true;
}

function drawMarker(context, marker, toX, toY, icons = {}) {
  const x = toX(marker.x);
  const y = toY(marker.y);
  const iconKey = { camp: 'camp', mine: 'mine', dungeon: 'dungeon', chest: 'chest' }[marker.type];
  context.save();
  if (iconKey && drawIcon(context, icons[iconKey], x, y - 8, 2)) {
    context.restore();
    return;
  }
  context.translate(Math.round(x), Math.round(y));
  context.lineWidth = 2;
  context.strokeStyle = '#2a1a10';
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
    // Inimigo forte: losango vermelho a tinta, com brilho.
    context.rotate(Math.PI / 4);
    context.fillStyle = '#a8343c';
    context.fillRect(-6, -6, 12, 12);
    context.strokeRect(-6, -6, 12, 12);
    context.fillStyle = '#f68187';
    context.fillRect(-4, -4, 4, 4);
  } else if (marker.type === WORLD_MAP_MARKER_TYPES.mine || marker.type === WORLD_MAP_MARKER_TYPES.dungeon || marker.type === WORLD_MAP_MARKER_TYPES.chest) {
    context.fillStyle = marker.type === WORLD_MAP_MARKER_TYPES.dungeon ? '#a8343c' : '#8a5a2a';
    context.fillRect(-7, -7, 14, 14);
    context.strokeRect(-7, -7, 14, 14);
  } else {
    // Estrutura descoberta: selo verde a tinta.
    context.beginPath();
    context.arc(0, 0, 5, 0, Math.PI * 2);
    context.fillStyle = marker.structureType === 'mineMarker' ? '#5e9a96' : '#5a8a46';
    context.fill();
    context.stroke();
    context.fillStyle = '#d3fc7e';
    context.fillRect(-2, -2, 2, 2);
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
    this.icons = loadMapIcons();
    // Recarrega o mapa quando os ícones pintados chegarem (só na primeira abertura).
    for (const image of Object.values(this.icons)) image.addEventListener?.('load', () => this.render(), { once: true });
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
    // Cartão da região: tocar ou clicar no mapa mostra nome, nível, monstros, cavernas e portos.
    this.card = document.createElement('div');
    this.card.id = 'region-card';
    this.card.className = 'region-card';
    this.card.hidden = true;
    this.root.append(this.card);
    this.handleCanvasClick = (event) => {
      const rect = this.canvas.getBoundingClientRect();
      if (!rect.width) return;
      const view = this.view();
      const x = view.left + ((event.clientX - rect.left) / rect.width) * view.width;
      const y = view.top + ((event.clientY - rect.top) / rect.height) * view.height;
      this.showRegionAt(x, y);
    };
    this.canvas.addEventListener('click', this.handleCanvasClick);
    this.card.addEventListener('click', (event) => {
      if (event.target.closest('[data-card-close]')) this.card.hidden = true;
    });
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

  /** Mostra o cartão da região do ponto (x, y) do mundo; sem região (mar), esconde. */
  showRegionAt(x, y) {
    const card = regionCardAt(x, y);
    if (card) card.invasion = this.scene.invasion?.active?.region === card.region;
    this.regionCard = card;
    if (!card) {
      this.card.hidden = true;
      return null;
    }
    const list = (items) => items.length ? items.join(', ') : '—';
    this.card.innerHTML = `
      <button type="button" class="region-card__close" data-card-close aria-label="Fechar cartão">✕</button>
      <h3>${card.name}</h3>
      <p>Nível ${card.levels}</p>
      ${card.banner ? `<p>${card.banner}</p>` : ''}
      <p><strong>Monstros:</strong> ${list(card.monsters)}</p>
      <p><strong>Cavernas:</strong> ${list(card.caves)}</p>
      <p><strong>Torre:</strong> ${list(card.towers ?? [])}</p>
      ${card.invasion ? '<p class="region-card__invasion"><strong>INVASÃO!</strong> Invasores de aura laranja nesta região.</p>' : ''}
      <p><strong>Portos:</strong> ${list(card.docks)}</p>`;
    this.card.hidden = false;
    return card;
  }

  open() {
    this.isOpen = true;
    this.root.hidden = false;
    this.render();
  }

  close() {
    this.isOpen = false;
    this.root.hidden = true;
    this.card.hidden = true;
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

  /** Posição do jogador no mapa (dentro de uma caverna, a entrada dela). */
  surfacePlayer() {
    const player = this.scene.player;
    const underground = this.scene.regionWorld?.underground;
    if (!player || !underground) return player;
    const cave = this.scene.regionWorld.features.find((feature) => feature.type === 'cave' && feature.cave.id === underground.cave);
    return cave ? { x: cave.x, y: cave.y } : player;
  }

  /** Área do mundo visível: o mundo todo, ou um recorte centrado no jogador quando há zoom. */
  view() {
    const zoom = ZOOM_LEVELS[this.zoomIndex];
    const width = WORLD.width / zoom;
    const height = WORLD.height / zoom;
    const player = this.surfacePlayer() ?? WORLD.camp;
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
    context.fillStyle = '#e2cfa0';
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

    // Locais do mundo grande já explorados: cavernas, torres e portos com ícones pintados.
    for (const feature of this.scene.regionWorld?.features ?? []) {
      if (renderer && !renderer.isExplored(feature.x, feature.y)) continue;
      const key = feature.type === 'dock' ? 'dock' : feature.type === 'cave' ? (feature.cave?.tower ? 'tower' : 'cave') : null;
      if (key) drawIcon(context, this.icons[key], toX(feature.x), toY(feature.y) - 10, 2);
    }

    // Grade com coordenadas (A–L, 1–9) a tinta sépia, para orientar o jogador.
    context.strokeStyle = 'rgba(74, 52, 36, 0.16)';
    context.lineWidth = 1;
    context.font = '8px "Press Start 2P", monospace';
    context.fillStyle = 'rgba(74, 52, 36, 0.8)';
    const cellX = WORLD.width / 12;
    const cellY = WORLD.height / 9;
    for (let column = 0; column <= 12; column += 1) {
      const x = Math.round(toX(column * cellX)) + 0.5;
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, height);
      context.stroke();
      if (column < 12) context.fillText(String.fromCharCode(65 + column), toX((column + 0.5) * cellX) - 4, 26);
    }
    for (let row = 0; row <= 9; row += 1) {
      const y = Math.round(toY(row * cellY)) + 0.5;
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(width, y);
      context.stroke();
      if (row < 9) context.fillText(String(row + 1), 20, toY((row + 0.5) * cellY) + 4);
    }

    // Nomes das regiões já exploradas.
    context.textAlign = 'center';
    for (const region of renderer?.regionLabels() ?? []) {
      // Nome a tinta com halo de papel (como o letreiro de um mapa antigo).
      context.font = '11px "Press Start 2P", monospace';
      context.lineWidth = 5;
      context.lineJoin = 'round';
      context.strokeStyle = 'rgba(240, 226, 190, 0.92)';
      context.strokeText(region.name.toUpperCase(), toX(region.x), toY(region.y));
      context.fillStyle = '#3b2717';
      context.fillText(region.name.toUpperCase(), toX(region.x), toY(region.y));
    }
    context.textAlign = 'left';

    const markers = collectWorldMapMarkers({
      structures: this.scene.harvestStructures?.state?.structures ?? [],
      enemies: this.scene.enemies ?? [],
      boss: this.scene.boss ?? null,
      player: this.surfacePlayer(),
      dungeonRevealed: Boolean(this.scene.camp?.dungeonRevealed || this.scene.camp?.defense?.dragonRadar)
    });
    drawMarker(context, markers.camp, toX, toY, this.icons);
    if (markers.mine) drawMarker(context, markers.mine, toX, toY, this.icons);
    if (markers.dungeon) drawMarker(context, markers.dungeon, toX, toY, this.icons);
    markers.structures.forEach((marker) => drawMarker(context, marker, toX, toY, this.icons));
    markers.chests.forEach((marker) => drawMarker(context, marker, toX, toY, this.icons));
    markers.strongEnemies.forEach((marker) => drawMarker(context, marker, toX, toY, this.icons));
    const invasion = this.scene.invasion;
    let invasionMarkers = 0;
    if (invasion?.active) {
      for (const enemy of invasion.invaders) {
        context.fillStyle = enemy.isInvasionLeader ? '#ffd56b' : '#ff8a2a';
        context.strokeStyle = '#101713';
        context.lineWidth = 2;
        context.beginPath();
        context.arc(Math.round(toX(enemy.x)), Math.round(toY(enemy.y)), enemy.isInvasionLeader ? 6 : 4, 0, Math.PI * 2);
        context.fill();
        context.stroke();
        invasionMarkers += 1;
      }
      const center = invasion.center;
      if (center) {
        const px = Math.round(toX(center.x));
        const py = Math.round(toY(center.y));
        context.fillStyle = 'rgba(255, 138, 42, 0.25)';
        context.beginPath();
        context.arc(px, py, 26, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = '#ff8a2a';
        context.strokeStyle = '#101713';
        context.lineWidth = 3;
        context.beginPath();
        context.moveTo(px, py - 12);
        context.lineTo(px + 11, py + 8);
        context.lineTo(px - 11, py + 8);
        context.closePath();
        context.fill();
        context.stroke();
        context.fillStyle = '#101713';
        context.font = '9px "Press Start 2P", monospace';
        context.textAlign = 'center';
        context.fillText('!', px, py + 6);
        context.textAlign = 'left';
        invasionMarkers += 1;
      }
    }
    renderer?.drawQuestSites(context, toX, toY, { labels: true, size: 7 });
    if (markers.player && renderer) renderer.drawPlayer(context, toX(markers.player.x), toY(markers.player.y), 9);
    else if (markers.player) drawMarker(context, markers.player, toX, toY);

    this.drawTarget(context, toX, toY);
    // Borda queimada por cima de tudo (pintada uma vez no tamanho do canvas).
    if (!this.burnt || this.burnt.width !== width || this.burnt.height !== height) this.burnt = paintBurntEdge(width, height);
    context.drawImage(this.burnt, 0, 0);
    this.drawCompass(context, width - 70, 74);
    this.drawScaleBar(context, 40, height - 40, scale);
    context.restore();

    this.lastMarkerCounts = {
      camp: 1,
      structures: markers.structures.length,
      chests: markers.chests.length,
      strongEnemies: markers.strongEnemies.length,
      invasion: invasionMarkers,
      player: markers.player ? 1 : 0
    };
  }

  /** Rosa dos ventos de 8 pontas a tinta e ouro velho. */
  drawCompass(context, x, y) {
    context.save();
    context.translate(x, y);
    context.fillStyle = 'rgba(40, 24, 12, 0.25)';
    context.beginPath(); context.arc(2, 3, 34, 0, Math.PI * 2); context.fill();
    context.strokeStyle = '#4a3424';
    context.lineWidth = 1.5;
    context.fillStyle = 'rgba(244, 230, 198, 0.75)';
    context.beginPath(); context.arc(0, 0, 32, 0, Math.PI * 2); context.fill(); context.stroke();
    context.beginPath(); context.arc(0, 0, 27, 0, Math.PI * 2); context.stroke();
    for (let tick = 0; tick < 32; tick += 1) {
      const angle = (tick / 32) * Math.PI * 2;
      const inner = tick % 4 === 0 ? 22 : 25;
      context.beginPath();
      context.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
      context.lineTo(Math.cos(angle) * 27, Math.sin(angle) * 27);
      context.stroke();
    }
    // Pontas: as 4 diagonais curtas atrás, as 4 cardeais longas na frente (metade clara, metade sombra).
    const point = (angle, length, width, light, dark) => {
      context.save();
      context.rotate(angle);
      context.fillStyle = light;
      context.beginPath(); context.moveTo(0, -length); context.lineTo(width, 0); context.lineTo(0, 0); context.closePath(); context.fill();
      context.fillStyle = dark;
      context.beginPath(); context.moveTo(0, -length); context.lineTo(-width, 0); context.lineTo(0, 0); context.closePath(); context.fill();
      context.strokeStyle = '#2a1a10';
      context.lineWidth = 1;
      context.beginPath(); context.moveTo(0, -length); context.lineTo(width, 0); context.lineTo(0, 0); context.lineTo(-width, 0); context.closePath(); context.stroke();
      context.restore();
    };
    for (let k = 0; k < 4; k += 1) point(Math.PI / 4 + k * Math.PI / 2, 18, 4, '#cba36f', '#8a5a2a');
    for (let k = 0; k < 4; k += 1) point(k * Math.PI / 2, 29, 6, k === 0 ? '#e0453f' : '#f4e6c6', k === 0 ? '#891e2b' : '#ad7954');
    context.fillStyle = '#cba36f';
    context.strokeStyle = '#2a1a10';
    context.beginPath(); context.arc(0, 0, 3.5, 0, Math.PI * 2); context.fill(); context.stroke();
    context.font = '10px "Press Start 2P", monospace';
    context.textAlign = 'center';
    context.lineWidth = 4;
    context.strokeStyle = 'rgba(240, 226, 190, 0.95)';
    context.strokeText('N', 0, -36);
    context.fillStyle = '#891e2b';
    context.fillText('N', 0, -36);
    context.restore();
  }

  /** Escala gráfica a tinta (barra quadriculada). */
  drawScaleBar(context, x, y, scale) {
    const steps = 50;
    const length = steps * 10 * scale;
    context.save();
    context.fillStyle = 'rgba(240, 226, 190, 0.85)';
    context.fillRect(x - 8, y - 18, length + 120, 28);
    context.strokeStyle = '#4a3424';
    context.lineWidth = 1;
    context.strokeRect(x - 7.5, y - 17.5, length + 119, 27);
    context.fillStyle = '#2a1a10';
    context.fillRect(x, y - 3, length, 6);
    context.fillStyle = '#f4e6c6';
    for (let k = 1; k < 4; k += 2) context.fillRect(x + (length / 4) * k, y - 2, length / 4, 4);
    context.fillStyle = '#3b2717';
    context.font = '8px "Press Start 2P", monospace';
    context.textAlign = 'left';
    context.fillText(`${steps} passos`, x + length + 10, y + 4);
    context.restore();
  }

  destroy() {
    this.closeButton.removeEventListener('click', this.handleClose);
    this.zoomBar?.removeEventListener('click', this.handleZoomClick);
    this.canvas.removeEventListener('wheel', this.handleWheel);
    this.canvas.removeEventListener('click', this.handleCanvasClick);
    this.card?.remove();
  }
}
