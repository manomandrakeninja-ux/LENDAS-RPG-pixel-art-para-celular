import { WORLD } from './config.js';
import { FULL_WORLD, REGION_CENTERS as WORLD_REGION_LABELS, REGION_INFO, T, TILE } from '../data/worldRegions.js';
import { DUNGEON_CONFIG } from '../data/buildings.js';
import { REGIONS } from '../data/campaign.js';
import { hash } from '../art/pixel.js';

// Desenha o terreno do mundo (uma vez) e a névoa de exploração, numa escala de
// 1 pixel do mapa = MAP_SCALE pixels do mundo. Minimapa e mapa grande recortam daqui.
export const MAP_SCALE = 6;
// Inclui a faixa das cavernas (abaixo do mar) para o minimapa funcionar lá dentro.
const MAP_WIDTH = Math.ceil(FULL_WORLD.width / MAP_SCALE);
const MAP_HEIGHT = Math.ceil(FULL_WORLD.height / MAP_SCALE);
// Cor de cada terreno no mapa: [base, variação clara, variação escura].
const TERRAIN_COLORS = {
  [T.FOREST]: [[34, 64, 40], [44, 80, 48], [24, 50, 32]],
  [T.SWAMP]: [[62, 72, 46], [74, 86, 54], [50, 58, 38]],
  [T.SNOW]: [[214, 226, 238], [236, 244, 250], [190, 206, 222]],
  [T.SAND]: [[214, 178, 104], [228, 196, 124], [196, 158, 88]],
  [T.DUNE]: [[200, 160, 90], [214, 176, 104], [184, 144, 78]],
  [T.BEACH]: [[232, 214, 166], [244, 230, 190], [218, 198, 150]],
  [T.JUNGLE]: [[72, 150, 60], [90, 170, 72], [58, 128, 50]],
  [T.ASH]: [[58, 44, 44], [72, 56, 54], [44, 34, 34]],
  [T.SEA]: [[38, 92, 140], [46, 104, 154], [32, 82, 128]],
  [T.LAVA]: [[240, 96, 30], [255, 150, 60], [200, 60, 20]],
  [T.MURK]: [[42, 58, 40], [50, 68, 46], [36, 50, 34]],
  [T.ICE]: [[160, 204, 232], [184, 220, 242], [140, 186, 218]],
  [T.CAVE]: [[96, 84, 78], [110, 98, 90], [84, 72, 68]],
  [T.WALL]: [[30, 26, 32], [36, 32, 38], [24, 20, 26]],
  [T.VOID]: [[0, 0, 0], [0, 0, 0], [0, 0, 0]]
};

const hex = (value) => `#${value.toString(16).padStart(6, '0')}`;


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
    const context = this.terrain.getContext('2d');
    const image = context.createImageData(MAP_WIDTH, MAP_HEIGHT);
    const data = image.data;
    // Grama com manchas suaves (ruído em blocos de 6 px do mapa).
    for (let y = 0; y < MAP_HEIGHT; y += 1) {
      for (let x = 0; x < MAP_WIDTH; x += 1) {
        const patch = hash(Math.floor(x / 6), Math.floor(y / 6), 17);
        const speck = hash(x, y, 4);
        let [r, g, b] = patch > 0.7 ? [86, 138, 79] : patch < 0.25 ? [63, 109, 66] : [74, 123, 72];
        if (speck > 0.94) [r, g, b] = [108, 157, 89];
        else if (speck < 0.04) [r, g, b] = [51, 92, 59];
        // Fora do Vale: cor do terreno das regiões novas, mares e cavernas.
        const kind = this.terrainKind(x * MAP_SCALE, y * MAP_SCALE);
        if (kind !== null && kind !== T.VALLEY) {
          const palette = TERRAIN_COLORS[kind] ?? TERRAIN_COLORS[T.VOID];
          [r, g, b] = patch > 0.72 ? palette[1] : patch < 0.24 ? palette[2] : palette[0];
          if (kind === T.SEA && speck > 0.97) [r, g, b] = [120, 170, 210];
        }
        const index = (y * MAP_WIDTH + x) * 4;
        data[index] = r;
        data[index + 1] = g;
        data[index + 2] = b;
        data[index + 3] = 255;
      }
    }
    context.putImageData(image, 0, 0);

    // Regiões da campanha (neve, deserto, cinzas...).
    for (const region of Object.values(REGIONS)) {
      if (!region.radius) continue;
      for (let step = 5; step >= 1; step -= 1) {
        const ratio = step / 5;
        context.fillStyle = hex(region.tint);
        context.globalAlpha = region.alpha * 0.32 + 0.06;
        context.beginPath();
        context.ellipse(region.x / MAP_SCALE, region.y / MAP_SCALE, (region.radius / MAP_SCALE) * ratio, (region.radius * 0.8 / MAP_SCALE) * ratio, 0, 0, Math.PI * 2);
        context.fill();
      }
    }
    context.globalAlpha = 1;

    // Caminho de terra até o acampamento e a clareira da fogueira.
    const camp = WORLD.camp;
    context.fillStyle = '#9a7652';
    context.fillRect((camp.x - 48) / MAP_SCALE, (camp.y - 36) / MAP_SCALE, 96 / MAP_SCALE, 456 / MAP_SCALE);
    context.fillStyle = '#7f5f42';
    context.fillRect((camp.x - 48) / MAP_SCALE, (camp.y - 36) / MAP_SCALE, 2, 456 / MAP_SCALE);
    context.fillRect((camp.x + 48) / MAP_SCALE - 2, (camp.y - 36) / MAP_SCALE, 2, 456 / MAP_SCALE);

    // Arbustos, rochas, recursos e árvores (sombra + copa com luz).
    const world = this.scene.world;
    for (const bush of world?.bushes ?? []) {
      context.fillStyle = '#3d7745';
      context.fillRect(Math.round(bush.x / MAP_SCALE) - 1, Math.round(bush.y / MAP_SCALE) - 1, 3, 2);
    }
    for (const resource of world?.resources ?? []) {
      context.fillStyle = resource.type === 'stone' ? '#8d9496' : resource.type === 'wood' ? '#7a5236' : '#7fb35e';
      context.fillRect(Math.round(resource.x / MAP_SCALE) - 1, Math.round(resource.y / MAP_SCALE) - 1, 2, 2);
    }
    for (const structure of this.scene.harvestStructures?.state?.structures ?? []) {
      if (structure.type !== 'tree' && structure.type !== 'rock') continue;
      context.fillStyle = structure.type === 'rock' ? '#a7aeab' : '#2f5f38';
      context.fillRect(Math.round(structure.x / MAP_SCALE) - 1, Math.round(structure.y / MAP_SCALE) - 1, 3, 3);
    }
    const trees = [...(world?.trees ?? [])].sort((a, b) => a.y - b.y);
    for (const tree of trees) {
      const x = Math.round(tree.x / MAP_SCALE);
      const y = Math.round(tree.y / MAP_SCALE);
      const crown = tree.kind === 'autumn-tree' ? ['#8e3f2c', '#c56a3f', '#e8a060'] : tree.kind === 'pine' ? ['#1f4130', '#2b5a3a', '#4f8a50'] : ['#25502f', '#3d7745', '#6fa858'];
      context.fillStyle = 'rgba(16, 32, 20, 0.45)';
      context.fillRect(x - 2, y, 6, 2);
      context.fillStyle = crown[0];
      context.fillRect(x - 3, y - 5, 6, 5);
      context.fillStyle = crown[1];
      context.fillRect(x - 2, y - 6, 4, 5);
      context.fillStyle = crown[2];
      context.fillRect(x - 2, y - 6, 2, 2);
    }

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
      if (feature.type === 'cave') {
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

  /** Névoa: escura onde ainda não foi explorado, com bordas suaves. */
  updateFog() {
    const cells = this.scene.world?.getRevealedCells?.() ?? [];
    if (cells.length === this.lastRevealed) return false;
    this.lastRevealed = cells.length;
    const context = this.fog.getContext('2d');
    context.globalCompositeOperation = 'source-over';
    context.clearRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
    context.fillStyle = 'rgba(9, 13, 11, 0.94)';
    context.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
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
    context.rotate(angle);
    context.fillStyle = '#ffe06a';
    context.strokeStyle = '#1a120d';
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(size + 2, 0);
    context.lineTo(-size, -size * 0.8);
    context.lineTo(-size * 0.45, 0);
    context.lineTo(-size, size * 0.8);
    context.closePath();
    context.fill();
    context.stroke();
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
