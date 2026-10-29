import { WORLD } from './config.js';
import { FULL_WORLD, REGION_CENTERS as WORLD_REGION_LABELS, REGION_INFO, T, TILE } from '../data/worldRegions.js';
import { DUNGEON_CONFIG } from '../data/buildings.js';
import { REGIONS } from '../data/campaign.js';
import { paintParchment, paintClouds, drawTreeSymbol } from './mapParchment.js';

// Desenha o terreno do mundo (uma vez) e a névoa de exploração, numa escala de
// 1 pixel do mapa = MAP_SCALE pixels do mundo. Minimapa e mapa grande recortam daqui.
export const MAP_SCALE = 6;
// Inclui a faixa das cavernas (abaixo do mar) para o minimapa funcionar lá dentro.
const MAP_WIDTH = Math.ceil(FULL_WORLD.width / MAP_SCALE);
const MAP_HEIGHT = Math.ceil(FULL_WORLD.height / MAP_SCALE);

export class MapRenderer {
  constructor(scene) {
    this.scene = scene;
    this.terrain = document.createElement('canvas');
    this.terrain.width = MAP_WIDTH;
    this.terrain.height = MAP_HEIGHT;
    this.fog = document.createElement('canvas');
    this.fog.width = MAP_WIDTH;
    this.fog.height = MAP_HEIGHT;
    this.lastRevealed = -1;
    this.drawTerrain();
  }

  get width() {
    return MAP_WIDTH;
  }

  terrainKind(x, y) {
    const grid = this.scene.regionWorld?.grid;
    if (!grid) return null;
    const col = Math.floor(x / TILE);
    const row = Math.floor(y / TILE);
    if (col < 0 || row < 0 || col >= grid.cols || row >= grid.rows) return T.VOID;
    return grid.terrain[row * grid.cols + col];
  }

  get height() {
    return MAP_HEIGHT;
  }

  drawTerrain() {
    // Fase 20H: o mapa é um pergaminho (src/game/mapParchment.js): aguadas por terreno, relevo,
    // tinta nas costas, símbolos pintados. Feito uma vez; minimapa e mapa grande recortam daqui.
    const context = this.terrain.getContext('2d');
    paintParchment(context, MAP_WIDTH, MAP_HEIGHT, (x, y) => {
      const kind = this.terrainKind(x * MAP_SCALE + MAP_SCALE / 2, y * MAP_SCALE + MAP_SCALE / 2);
      return kind === null ? T.VALLEY : kind;
    });

    // Caminho de terra até o acampamento e a clareira da fogueira.
    const camp = WORLD.camp;
    // Trilha tracejada a tinta, como nos mapas antigos.
    context.fillStyle = '#7a5434';
    for (let step = 0; step < 516 / MAP_SCALE; step += 4) {
      context.fillRect(Math.round(camp.x / MAP_SCALE) - 1, Math.round((camp.y - 36) / MAP_SCALE + step), 2, 2);
    }

    // Árvores do Vale: um símbolo a cada poucas árvores (o resto do bosque já está na aguada).
    const trees = [...(this.scene.world?.trees ?? [])].sort((a, b) => a.y - b.y);
    trees.forEach((tree, index) => {
      if (index % 3) return;
      drawTreeSymbol(context, Math.round(tree.x / MAP_SCALE), Math.round(tree.y / MAP_SCALE), tree.kind === 'pine' ? 'pine' : tree.kind === 'autumn-tree' ? 'autumn' : 'oak');
    });

    // Entrada da mina e da masmorra (sempre no terreno; o marcador aparece conforme a regra de cada uma).
    const mine = this.scene.harvestStructures?.state?.byType?.('mineMarker')?.[0];
    if (mine) {
      context.fillStyle = '#6f6469';
      context.beginPath();
      context.ellipse(mine.x / MAP_SCALE, mine.y / MAP_SCALE, 7, 5, 0, 0, Math.PI * 2);
      context.fill();
    }
    context.fillStyle = 'rgba(58, 31, 28, 0.6)';
    context.beginPath();
    context.ellipse(DUNGEON_CONFIG.x / MAP_SCALE, DUNGEON_CONFIG.y / MAP_SCALE, 9, 7, 0, 0, Math.PI * 2);
    context.fill();

    // Entradas das cavernas e portos do mundo grande.
    for (const feature of this.scene.regionWorld?.features ?? []) {
      const x = feature.x / MAP_SCALE;
      const y = feature.y / MAP_SCALE;
      if (feature.type === 'cave' && feature.cave.tower) {
        context.fillStyle = '#d8c8a0';
        context.fillRect(x - 4, y - 12, 8, 12);
        context.fillStyle = '#6b5a3a';
        context.fillRect(x - 4, y - 14, 2, 3);
        context.fillRect(x - 1, y - 14, 2, 3);
        context.fillRect(x + 2, y - 14, 2, 3);
        context.fillStyle = '#1a1416';
        context.fillRect(x - 1, y - 4, 3, 4);
      } else if (feature.type === 'cave') {
        context.fillStyle = '#1a1416';
        context.beginPath();
        context.ellipse(x, y - 4, 8, 6, 0, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = '#000000';
        context.fillRect(x - 3, y - 6, 6, 5);
      } else if (feature.type === 'dock') {
        context.fillStyle = '#8a6440';
        context.fillRect(x - 3, y - 2, 6, 14);
        context.fillStyle = '#f4ecd8';
        context.fillRect(x + 2, y + 10, 5, 4);
      }
    }
  }

  /** Névoa: nuvens claras onde ainda não foi explorado, com bordas suaves. */
  updateFog() {
    const cells = this.scene.world?.getRevealedCells?.() ?? [];
    if (cells.length === this.lastRevealed) return false;
    this.lastRevealed = cells.length;
    const context = this.fog.getContext('2d');
    context.globalCompositeOperation = 'source-over';
    context.clearRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
    // Névoa como nuvens de pergaminho (camada pintada uma vez), não um véu preto.
    if (!this.clouds) this.clouds = paintClouds(MAP_WIDTH, MAP_HEIGHT);
    context.drawImage(this.clouds, 0, 0);
    context.globalCompositeOperation = 'destination-out';
    const cell = (WORLD.tileSize * 2) / MAP_SCALE;
    for (const { column, row } of cells) {
      const cx = (column + 0.5) * cell;
      const cy = (row + 0.5) * cell;
      const gradient = context.createRadialGradient(cx, cy, cell * 0.2, cx, cy, cell * 1.05);
      gradient.addColorStop(0, 'rgba(0,0,0,1)');
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      context.fillStyle = gradient;
      context.fillRect(cx - cell * 1.1, cy - cell * 1.1, cell * 2.2, cell * 2.2);
    }
    context.globalCompositeOperation = 'source-over';
    return true;
  }

  isExplored(x, y) {
    const size = WORLD.tileSize * 2;
    return this.scene.world?.revealedCells?.has?.(`${Math.floor(x / size)},${Math.floor(y / size)}`) ?? false;
  }

  /** Prédios do acampamento, muralha e torres como pequenas formas (desenhadas por cima do terreno). */
  drawCamp(context, toX, toY, scale) {
    const scene = this.scene;
    const camp = scene.camp;
    if (!camp) return;
    const defense = camp.defense;
    if (defense?.wallLevel > 0) {
      context.strokeStyle = defense.wallStanding ? '#c9b27a' : 'rgba(201, 178, 122, 0.4)';
      context.lineWidth = Math.max(1.5, 4 * scale);
      context.setLineDash(defense.wallStanding ? [] : [4, 4]);
      context.beginPath();
      defense.octagonVertices(defense.radius).forEach((vertex, index) => {
        if (index === 0) context.moveTo(toX(vertex.x), toY(vertex.y));
        else context.lineTo(toX(vertex.x), toY(vertex.y));
      });
      context.closePath();
      context.stroke();
      context.setLineDash([]);
    }
    const roofs = { farm: '#a83f33', forge: '#4a4648', house: '#4f6286', market: '#9a3e35' };
    for (const [key, color] of Object.entries(roofs)) {
      const sprite = camp.buildings?.[key]?.sprite;
      if (!sprite || !camp.isBuilt(key)) continue;
      const w = Math.max(4, 40 * scale);
      const h = Math.max(3, 26 * scale);
      const x = toX(sprite.x) - w / 2;
      const y = toY(sprite.y - 20) - h / 2;
      context.fillStyle = '#7a5236';
      context.fillRect(x, y + h * 0.45, w, h * 0.55);
      context.fillStyle = camp.durability[key] > 0 ? color : '#3a3337';
      context.beginPath();
      context.moveTo(x - 1, y + h * 0.5);
      context.lineTo(x + w / 2, y - h * 0.15);
      context.lineTo(x + w + 1, y + h * 0.5);
      context.closePath();
      context.fill();
    }
    for (const tower of defense?.towers ?? []) {
      context.fillStyle = '#8d9496';
      const size = Math.max(3, 12 * scale);
      context.fillRect(toX(tower.x) - size / 2, toY(tower.y + 40) - size, size, size);
    }
    // Fogueira.
    const fire = Math.max(2.5, 8 * scale);
    context.fillStyle = '#ffb04a';
    context.beginPath();
    context.arc(toX(camp.x), toY(camp.y + 10), fire, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#fff0b0';
    context.beginPath();
    context.arc(toX(camp.x), toY(camp.y + 10), fire * 0.45, 0, Math.PI * 2);
    context.fill();
  }

  /** Locais de missão ativos: losango (dourado = missão rastreada). */
  drawQuestSites(context, toX, toY, { labels = false, size = 5 } = {}) {
    const campaign = this.scene.campaign;
    if (!campaign) return [];
    const points = campaign.mapPoints();
    for (const point of points) {
      const x = toX(point.x);
      const y = toY(point.y);
      context.fillStyle = point.tracked ? '#ffd76b' : '#c59cff';
      context.strokeStyle = '#1a120d';
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(x, y - size);
      context.lineTo(x + size, y);
      context.lineTo(x, y + size);
      context.lineTo(x - size, y);
      context.closePath();
      context.fill();
      context.stroke();
      if (labels && point.name) {
        context.font = '8px "Press Start 2P", monospace';
        context.textAlign = 'center';
        context.lineWidth = 3;
        context.strokeStyle = 'rgba(20, 14, 10, 0.9)';
        context.strokeText(point.name, x, y - size - 6);
        context.fillStyle = point.tracked ? '#ffe08a' : '#e3d4ff';
        context.fillText(point.name, x, y - size - 6);
      }
    }
    return points;
  }

  /** Moradores no acampamento (pontinhos dourados). */
  drawNpcs(context, toX, toY, size = 2) {
    for (const npc of this.scene.campaign?.npcs?.values() ?? []) {
      context.fillStyle = '#ffe08a';
      context.fillRect(Math.round(toX(npc.x)) - size / 2, Math.round(toY(npc.y)) - size / 2, size, size);
    }
  }

  /** Seta do jogador apontando para onde ele anda. */
  drawPlayer(context, x, y, size = 6) {
    const facing = this.scene.player?.facing;
    const angle = facing ? Math.atan2(facing.y, facing.x) : -Math.PI / 2;
    context.save();
    context.translate(x, y);
    // Marcador do herói: medalhão de ouro velho com a seta vermelha apontando para onde ele anda.
    const ring = size * 1.45;
    context.fillStyle = 'rgba(26, 16, 10, 0.4)';
    context.beginPath(); context.arc(1, 2, ring + 2, 0, Math.PI * 2); context.fill();
    context.fillStyle = '#1a120d';
    context.beginPath(); context.arc(0, 0, ring + 2, 0, Math.PI * 2); context.fill();
    context.fillStyle = '#cba36f';
    context.beginPath(); context.arc(0, 0, ring + 1, 0, Math.PI * 2); context.fill();
    context.fillStyle = '#f4e6c6';
    context.beginPath(); context.arc(0, 0, ring - 1, 0, Math.PI * 2); context.fill();
    context.rotate(angle);
    context.fillStyle = '#c42430';
    context.strokeStyle = '#1a120d';
    context.lineWidth = 1.5;
    context.beginPath();
    context.moveTo(size + 2, 0);
    context.lineTo(-size, -size * 0.8);
    context.lineTo(-size * 0.45, 0);
    context.lineTo(-size, size * 0.8);
    context.closePath();
    context.fill();
    context.stroke();
    // Miolo dourado (o herói é o ponto mais claro do mapa).
    context.fillStyle = '#ffe08a';
    context.fillRect(-1.5, -1.5, 3, 3);
    context.restore();
  }

  /** Nome das regiões já exploradas (no mapa grande). */
  regionLabels() {
    const labels = Object.entries(REGIONS)
      .filter(([, region]) => region.radius && this.isExplored(region.x, region.y))
      .map(([key, region]) => ({ key, name: region.name, x: region.x, y: region.y }));
    // Regiões do mundo grande (aparecem depois de visitadas).
    const discovered = this.scene.regionWorld?.discovered ?? new Set();
    for (const [key, point] of Object.entries(WORLD_REGION_LABELS)) {
      if (discovered.has(key)) labels.push({ key, name: REGION_INFO[key].name, x: point.x, y: point.y });
    }
    return labels;
  }
}
