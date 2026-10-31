import { WORLD } from './config.js';
import { MAP_SCALE } from './MapRenderer.js';
import { FAST_TRAVEL_COST, TREASURE_SPOTS, VILLAGES } from '../data/worldRegions.js';
import { DUNGEON_CONFIG } from '../data/buildings.js';
import { regionCardAt } from './RegionCard.js';
import { paintBurntEdge } from './mapParchment.js';
// Lógica pura dos marcadores vive em worldMapMarkers.js (sem Phaser) para rodar no Node.
export { WORLD_MAP_MARKER_TYPES, collectWorldMapMarkers } from './worldMapMarkers.js';
import { WORLD_MAP_MARKER_TYPES, collectWorldMapMarkers } from './worldMapMarkers.js';

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
    // Zoom e centro do mapa ficam salvos entre aberturas (localStorage).
    const savedView = this.loadView();
    this.zoomIndex = savedView?.zoom ?? 0;
    this.savedCenter = savedView?.center ?? null;
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
      // Shift+clique: marca um waypoint personalizado (X no mapa + seta verde no minimapa).
      if (event.shiftKey) {
        const current = this.scene.waypoint;
        if (current && Math.hypot(current.x - x, current.y - y) < 300) this.scene.setWaypoint(null);
        else this.scene.setWaypoint({ x, y });
        this.render();
        return;
      }
      // Clique perto de um local já descoberto (caverna/torre/porto/acampamento) abre a viagem rápida.
      const travel = this.findTravelTarget(x, y, view, rect);
      if (travel) {
        this.showTravelCard(travel);
        return;
      }
      this.showRegionAt(x, y);
    };
    this.canvas.addEventListener('click', this.handleCanvasClick);
    this.card.addEventListener('click', (event) => {
      if (event.target.closest('[data-card-close]')) this.card.hidden = true;
      const go = event.target.closest('[data-travel-go]');
      if (go && this.travelTarget) {
        const target = this.travelTarget;
        this.card.hidden = true;
        this.travelTarget = null;
        this.close();
        this.scene.regionWorld?.fastTravelTo(target);
      }
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
    this.saveView();
    this.render();
  }

  /** Persiste zoom + centro do mapa (localStorage 'lendas-map-view'). */
  saveView() {
    try {
      const view = this.view();
      localStorage.setItem('lendas-map-view', JSON.stringify({
        zoom: this.zoomIndex,
        center: { x: view.left + view.width / 2, y: view.top + view.height / 2 }
      }));
    } catch { /* modo privado: ignora */ }
  }

  loadView() {
    try {
      const raw = localStorage.getItem('lendas-map-view');
      if (!raw) return null;
      const view = JSON.parse(raw);
      if (!Number.isFinite(view?.zoom) || !view?.center) return null;
      return view;
    } catch { return null; }
  }

  /** O ponto (x,y) do mundo está explorado? (usa a neblina do World; sem renderer, permite). */
  isExplored(x, y) {
    return this.scene.ui?.mapRenderer?.isExplored?.(x, y) ?? this.scene.world?.revealedCells?.has?.(`${Math.floor(x / (WORLD.tileSize * 2))},${Math.floor(y / (WORLD.tileSize * 2))}`) ?? true;
  }

  /** Procura um local viajável (acampamento, caverna, torre ou porto descoberto) perto do clique. */
  findTravelTarget(x, y, view, rect) {
    // Raio de tolerance: ~22 px na tela, convertido para coordenadas do mundo.
    const radius = 22 * (view.width / Math.max(1, rect.width));
    const camp = { x: WORLD.camp.x, y: WORLD.camp.y + 85 };
    if (this.isExplored(camp.x, camp.y) && Math.hypot(x - camp.x, y - camp.y) < Math.max(radius, 240)) {
      return { type: 'camp', name: 'Acampamento', cost: 0 };
    }
    let best = null;
    let bestDistance = radius;
    for (const feature of this.scene.regionWorld?.features ?? []) {
      if (feature.type !== 'cave' && feature.type !== 'dock') continue;
      if (!this.isExplored(feature.x, feature.y)) continue;
      const distance = Math.hypot(x - feature.x, y - feature.y);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = {
          type: 'feature',
          feature,
          name: feature.cave?.name ?? feature.dock?.name ?? 'Local',
          cost: FAST_TRAVEL_COST
        };
      }
    }
    return best;
  }

  /** Card de viagem rápida: mostra o destino e o custo, com botão VIAJAR. */
  showTravelCard(target) {
    this.travelTarget = target;
    const coins = this.scene.economy?.coins ?? 0;
    const canAfford = target.cost === 0 || coins >= target.cost;
    this.regionCard = null;
    this.card.innerHTML = `
      <button type="button" class="region-card__close" data-card-close aria-label="Fechar cartão">✕</button>
      <h3>✦ Viagem rápida</h3>
      <p><strong>Destino:</strong> ${target.name}</p>
      <p><strong>Custo:</strong> ${target.cost === 0 ? 'grátis' : `${target.cost} moedas (você tem ${coins})`}</p>
      <div class="region-card__actions">
        <button type="button" data-travel-go ${canAfford ? '' : 'disabled'}>VIAJAR</button>
        <button type="button" data-card-close>FICAR</button>
      </div>`;
    this.card.hidden = false;
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
    // Reabre no zoom/centro da última vez (salvo em localStorage); se o jogador andou muito
    // desde então, volta a centrar nele.
    const player = this.surfacePlayer();
    this.centerOverride = this.savedCenter && player && Math.hypot(this.savedCenter.x - player.x, this.savedCenter.y - player.y) < 2600
      ? this.savedCenter
      : null;
    this.render();
  }

  close() {
    this.isOpen = false;
    this.root.hidden = true;
    this.card.hidden = true;
    this.target = null;
    this.travelTarget = null;
    this.saveView();
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

  /** Área do mundo visível: o mundo todo, ou um recorte centrado no jogador (ou no último centro salvo). */
  view() {
    const zoom = ZOOM_LEVELS[this.zoomIndex];
    const width = WORLD.width / zoom;
    const height = WORLD.height / zoom;
    const anchor = this.centerOverride ?? this.surfacePlayer() ?? WORLD.camp;
    const left = Math.max(0, Math.min(WORLD.width - width, anchor.x - width / 2));
    const top = Math.max(0, Math.min(WORLD.height - height, anchor.y - height / 2));
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
    // Anel dourado = dá para viajar até ali clicando (viagem rápida).
    for (const feature of this.scene.regionWorld?.features ?? []) {
      if (renderer && !renderer.isExplored(feature.x, feature.y)) continue;
      const key = feature.type === 'dock' ? 'dock' : feature.type === 'cave' ? (feature.cave?.tower ? 'tower' : 'cave') : null;
      if (key) drawIcon(context, this.icons[key], toX(feature.x), toY(feature.y) - 10, 2);
      if (feature.type === 'cave' || feature.type === 'dock') {
        context.strokeStyle = 'rgba(255, 215, 107, 0.9)';
        context.lineWidth = Math.max(1, 2 * scale);
        context.beginPath();
        context.arc(toX(feature.x), toY(feature.y) - 8, 11 * scale + 3, 0, Math.PI * 2);
        context.stroke();
      }
    }

    // Grade com coordenadas (A–T, 1–15) a tinta sépia, para orientar o jogador.
    context.strokeStyle = 'rgba(74, 52, 36, 0.16)';
    context.lineWidth = 1;
    context.font = '8px "Press Start 2P", monospace';
    context.fillStyle = 'rgba(74, 52, 36, 0.8)';
    const GRID_COLS = 20;
    const GRID_ROWS = 15;
    const cellX = WORLD.width / GRID_COLS;
    const cellY = WORLD.height / GRID_ROWS;
    for (let column = 0; column <= GRID_COLS; column += 1) {
      const x = Math.round(toX(column * cellX)) + 0.5;
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, height);
      context.stroke();
      if (column < GRID_COLS) context.fillText(String.fromCharCode(65 + column), toX((column + 0.5) * cellX) - 4, 26);
    }
    for (let row = 0; row <= GRID_ROWS; row += 1) {
      const y = Math.round(toY(row * cellY)) + 0.5;
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(width, y);
      context.stroke();
      if (row < GRID_ROWS) context.fillText(String(row + 1), 20, toY((row + 0.5) * cellY) + 4);
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
    // Baús de tesouro: só aparecem no mapa depois que a área foi explorada.
    if (renderer) {
      context.fillStyle = '#c8a030';
      for (const spot of TREASURE_SPOTS) {
        if (!renderer.isExplored(spot.x, spot.y)) continue;
        const bx = toX(spot.x);
        const by = toY(spot.y);
        context.fillRect(bx - 2, by - 2, 4, 3);
        context.fillStyle = '#6a3a1e';
        context.fillRect(bx - 2, by + 1, 4, 1);
        context.fillStyle = '#c8a030';
      }
    }
    // Vilarejos nomeados: só aparecem no mapa depois de explorados (neblina).
    if (renderer) {
      context.font = '8px "Press Start 2P", monospace';
      for (const village of VILLAGES) {
        if (!renderer.isExplored(village.x, village.y)) continue;
        const vx = toX(village.x);
        const vy = toY(village.y);
        context.fillStyle = '#6b4a2a';
        context.fillRect(vx - 3, vy - 3, 6, 5);
        context.lineWidth = 3;
        context.strokeStyle = 'rgba(240, 226, 190, 0.9)';
        context.strokeText(village.name.toUpperCase(), vx + 7, vy + 3);
        context.fillStyle = '#4a2c14';
        context.fillText(village.name.toUpperCase(), vx + 7, vy + 3);
      }
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
    // Waypoint personalizado (Shift+clique): X verde pulsante.
    const waypoint = this.scene.waypoint;
    if (waypoint) {
      const wx = Math.round(toX(waypoint.x));
      const wy = Math.round(toY(waypoint.y));
      const pulse = 1 + Math.sin(this.scene.time.now / 240) * 0.15;
      context.save();
      context.strokeStyle = '#5aff8a';
      context.lineWidth = 3;
      context.translate(wx, wy);
      context.scale(pulse, pulse);
      context.beginPath();
      context.moveTo(-7, -7); context.lineTo(7, 7);
      context.moveTo(7, -7); context.lineTo(-7, 7);
      context.stroke();
      context.restore();
    }
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
