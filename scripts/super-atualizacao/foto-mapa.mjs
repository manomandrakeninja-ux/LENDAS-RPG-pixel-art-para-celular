// Gera uma "foto" PNG do mundo inteiro do LENDAS na pasta SUPER ATUALIZAÇÃO/.
// Uso: node scripts/super-atualizacao/foto-mapa.mjs [nome-do-arquivo]
// Renderiza o terreno de buildTerrainGrid() numa escala que cabe (~1600 px de largura),
// com marcadores de acampamento, cavernas, torres e portos.
import fs from 'node:fs';
import path from 'node:path';
import { createCanvas } from '@napi-rs/canvas';
import {
  CAVES, DOCKS, DUNGEONS, OVERWORLD, REGION_CENTERS, REGION_INFO, ROADS, ROAD_SIGNS, T, TILE, TOWERS, TREASURE_SPOTS, VILLAGES,
  buildTerrainGrid, dockPosition
} from '../../src/data/worldRegions.js';
import { WORLD } from '../../src/game/config.js';

const outName = process.argv[2] ?? '01-mapa-400x300.png';
const outDir = path.resolve('SUPER ATUALIZAÇÃO');
fs.mkdirSync(outDir, { recursive: true });

const grid = buildTerrainGrid();
const SCALE = Math.max(1, Math.round(OVERWORLD.width / 1600));
const width = Math.ceil(OVERWORLD.width / SCALE);
const height = Math.ceil(OVERWORLD.height / SCALE);
const W2 = (f) => Math.round(OVERWORLD.width * f / SCALE);
const H2 = (f) => Math.round(OVERWORLD.height * f / SCALE);

const TERRAIN_COLORS = {
  [T.VALLEY]: '#4a7b48', [T.FOREST]: '#24452c', [T.SWAMP]: '#3d4a33', [T.MURK]: '#2c3a2e',
  [T.SNOW]: '#d8e6f0', [T.ICE]: '#eaf4fc', [T.SAND]: '#d8b56a', [T.DUNE]: '#c9a45c',
  [T.BEACH]: '#e8d8a0', [T.JUNGLE]: '#3f7a3a', [T.ASH]: '#5a2a22', [T.SEA]: '#2a5a8a',
  [T.LAVA]: '#c84a1a', [T.CAVE]: '#2a2630', [T.WALL]: '#1a1620', [T.VOID]: '#0d0b12',
  [T.ROAD]: '#a8875a'
};

const canvas = createCanvas(width, height);
const ctx = canvas.getContext('2d');

// Fundo (mar) e terreno do overworld.
ctx.fillStyle = TERRAIN_COLORS[T.VOID];
ctx.fillRect(0, 0, width, height);
for (let row = 0; row < OVERWORLD.height / TILE; row += 1) {
  for (let col = 0; col < grid.cols; col += 1) {
    const kind = grid.terrain[row * grid.cols + col];
    if (kind === T.VOID) continue;
    ctx.fillStyle = TERRAIN_COLORS[kind] ?? '#888';
    ctx.fillRect(Math.floor(col * TILE / SCALE), Math.floor(row * TILE / SCALE), Math.ceil(TILE / SCALE), Math.ceil(TILE / SCALE));
  }
}

const px = (x) => Math.round(x / SCALE);
const py = (y) => Math.round(y / SCALE);

// Rótulos de região nos centros (mapa de referência mostra todos).
ctx.font = `${Math.max(8, Math.round(11 / (SCALE / 12)))}px sans-serif`;
ctx.textAlign = 'center';
for (const [key, point] of Object.entries(REGION_CENTERS)) {
  const info = REGION_INFO[key];
  if (!info?.name) continue;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillText(info.name.toUpperCase(), px(point.x) + 1, py(point.y) + 1);
  ctx.fillStyle = '#f4e6c6';
  ctx.fillText(info.name.toUpperCase(), px(point.x), py(point.y));
}

// Acampamento (estrela dourada).
ctx.fillStyle = '#ffd76b';
ctx.beginPath();
const cx = px(WORLD.camp.x), cy = py(WORLD.camp.y);
ctx.arc(cx, cy, Math.max(3, 5 / (SCALE / 12)), 0, Math.PI * 2);
ctx.fill();
ctx.fillStyle = '#1a120d';
ctx.font = `bold ${Math.max(7, Math.round(9 / (SCALE / 12)))}px sans-serif`;
ctx.fillText('ACAMPAMENTO', cx, cy - 8);

// Cavernas (círculo escuro), torres (quadrado claro), portos ( âncora azul).
const TRAVEL = process.argv[3] === 'fasttravel';
for (const d of DUNGEONS) {
  const x = px(d.entrance.x), y = py(d.entrance.y);
  if (d.tower) {
    ctx.fillStyle = '#d8c8a0';
    ctx.fillRect(x - 2, y - 3, 4, 6);
  } else {
    ctx.fillStyle = '#14100f';
    ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffb04a';
    ctx.fillRect(x - 1, y - 1, 2, 2);
  }
  if (TRAVEL) {
    ctx.strokeStyle = 'rgba(255, 215, 107, 0.95)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.stroke();
  }
}
for (const dock of DOCKS) {
  const p = dockPosition(dock);
  ctx.fillStyle = '#7ec8ff';
  ctx.fillRect(px(p.x) - 2, py(p.y) - 2, 4, 4);
  if (TRAVEL) {
    ctx.strokeStyle = 'rgba(255, 215, 107, 0.95)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(px(p.x), py(p.y), 6, 0, Math.PI * 2); ctx.stroke();
  }
}
if (TRAVEL) {
  ctx.strokeStyle = 'rgba(255, 215, 107, 0.95)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(cx, cy, 8, 0, Math.PI * 2); ctx.stroke();
}

// Borda e título.
ctx.strokeStyle = '#7a5434';
ctx.lineWidth = 2;
ctx.strokeRect(1, 1, width - 2, height - 2);
ctx.fillStyle = 'rgba(20,14,10,0.75)';
ctx.fillRect(8, 8, 330, 22);
ctx.fillStyle = '#ffe08a';
ctx.font = 'bold 12px sans-serif';
ctx.textAlign = 'left';
ctx.fillText(`LENDAS — mundo ${OVERWORLD.width}×${OVERWORLD.height} px (400×300 tiles)`, 14, 24);

// Modo 'rota': linha tracejada do acampamento até a caverna mais próxima (como a bússola faz).
if (process.argv[3] === 'rota') {
  let nearest = null;
  let best = Infinity;
  for (const cave of CAVES) {
    const d = Math.hypot(cave.entrance.x - WORLD.camp.x, cave.entrance.y - WORLD.camp.y);
    if (d < best) { best = d; nearest = cave; }
  }
  if (nearest) {
    ctx.strokeStyle = '#ffd76b';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(px(nearest.entrance.x), py(nearest.entrance.y));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#ffd76b';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`→ ${nearest.name} (${Math.round(best / TILE * 10)} m)`, px(nearest.entrance.x) + 8, py(nearest.entrance.y) - 8);
  }
}

// Modo 'estradas': destaca as rotas de terra batida (linhas grossas douradas) por cima do mapa.
if (process.argv[3] === 'estradas') {
  for (const road of ROADS) {
    ctx.strokeStyle = 'rgba(90, 60, 30, 0.9)';
    ctx.lineWidth = Math.max(2, SCALE * 0.9);
    ctx.lineJoin = 'round';
    ctx.beginPath();
    road.points.forEach(([x, y], i) => {
      if (i === 0) ctx.moveTo(px(x), py(y));
      else ctx.lineTo(px(x), py(y));
    });
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255, 222, 140, 0.95)';
    ctx.lineWidth = Math.max(1, SCALE * 0.45);
    ctx.stroke();
  }
}

// Modo 'dragao': silhueta de dragão cruzando o céu (topo) com sombra no chão.
if (process.argv[3] === 'dragao') {
  const dx = width * 0.62, dy = 90;
  ctx.fillStyle = '#241426';
  // sombra no chão
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath(); ctx.ellipse(dx + 30, dy + 330, 80, 18, 0, 0, Math.PI * 2); ctx.fill();
  // corpo
  ctx.fillStyle = '#241426';
  ctx.beginPath(); ctx.ellipse(dx, dy, 34, 13, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(dx + 26, dy - 7, 14, 9, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(dx + 37, dy - 10, 8, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ff5040';
  ctx.fillRect(dx + 40, dy - 12, 3, 3); // olho
  // asas erguidas
  ctx.fillStyle = '#2e1a33';
  ctx.beginPath(); ctx.moveTo(dx - 6, dy - 4); ctx.lineTo(dx - 28, dy - 46); ctx.lineTo(dx + 16, dy - 16); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(dx + 16, dy - 16); ctx.lineTo(dx + 32, dy - 50); ctx.lineTo(dx + 6, dy - 4); ctx.closePath(); ctx.fill();
  // rabo
  ctx.strokeStyle = '#160b18'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(dx - 32, dy); ctx.lineTo(dx - 52, dy - 4); ctx.stroke();
  ctx.fillStyle = '#f6ca9f';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('🐉 DRAGÃO AMBIENTAL — cruza o céu de vez em quando (sombra + rugido distante)', width / 2, 26);
}

// Modo 'placas': marca as placas de sinalização (🪧) ao longo das estradas.
if (process.argv[3] === 'placas') {
  for (const sign of ROAD_SIGNS) {
    ctx.fillStyle = '#6b4a2a';
    ctx.fillRect(px(sign.x) - 1, py(sign.y) - 4, 3, 5);
    ctx.fillStyle = '#c9a76b';
    ctx.fillRect(px(sign.x) - 3, py(sign.y) - 8, 7, 5);
    ctx.fillStyle = '#2a1d12';
    ctx.fillRect(px(sign.x) - 2, py(sign.y) - 7, 5, 1);
  }
  ctx.fillStyle = '#ffd76b';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`🪧 ${ROAD_SIGNS.length} placas de estrada (E perto da placa lê o destino + metros)`, 40, height - 16);
}

// Modo 'vilarejos': desenha as casinhas e o nome de cada vilarejo.
if (process.argv[3] === 'vilarejos') {
  for (const village of VILLAGES) {
    for (const [dx, dy] of village.houses) {
      const hx = px(village.x + dx);
      const hy = py(village.y + dy);
      ctx.fillStyle = '#a8895f';
      ctx.fillRect(hx - 3, hy - 3, 7, 5);
      ctx.fillStyle = '#6a4028';
      ctx.beginPath(); ctx.moveTo(hx - 4, hy - 3); ctx.lineTo(hx, hy - 7); ctx.lineTo(hx + 4, hy - 3); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`🏘️ ${village.name}`, px(village.x), py(village.y) + 14);
    ctx.fillStyle = '#ffd76b';
    ctx.fillRect(px(village.x) - 1, py(village.y) - 1, 2, 2); // morador
  }
}

// Modo 'baus': marca os baús de tesouro escondidos (💰) no mapa.
if (process.argv[3] === 'baus') {
  for (const spot of TREASURE_SPOTS) {
    const bx = px(spot.x), by = py(spot.y);
    ctx.fillStyle = '#6a3a1e';
    ctx.fillRect(bx - 3, by - 2, 6, 4);
    ctx.fillStyle = '#e0b040';
    ctx.fillRect(bx - 3, by - 3, 6, 2);
    ctx.fillStyle = '#ffd84a';
    ctx.fillRect(bx - 1, by - 2, 2, 2);
  }
  ctx.fillStyle = '#ffd76b';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`💰 ${TREASURE_SPOTS.length} baús de tesouro escondidos (E abre: moedas do nível da região + às vezes equipamento)`, 40, height - 16);
}

// Modo 'waypoint': X verde pulsante num ponto do mapa (waypoint personalizado com Shift+clique no mapa M).
if (process.argv[3] === 'waypoint') {
  const wx = px(W2(0.62)), wy = py(H2(0.5));
  ctx.strokeStyle = '#5aff8a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(wx - 9, wy - 9); ctx.lineTo(wx + 9, wy + 9);
  ctx.moveTo(wx + 9, wy - 9); ctx.lineTo(wx - 9, wy + 9);
  ctx.stroke();
  ctx.fillStyle = '#5aff8a';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('WAYPOINT (Shift+clique no mapa)', wx, wy - 16);
  // seta verde no canto do minimapa
  ctx.fillStyle = 'rgba(11,15,13,0.9)';
  ctx.fillRect(width - 190, height - 190, 176, 176);
  ctx.strokeStyle = '#2a1d14'; ctx.lineWidth = 2; ctx.strokeRect(width - 189, height - 189, 174, 174);
  ctx.fillStyle = '#5aff8a';
  ctx.beginPath();
  const ax = width - 190 + 100, ay = height - 190 + 40;
  ctx.moveTo(ax + 6, ay); ctx.lineTo(ax - 5, ay - 6); ctx.lineTo(ax - 5, ay + 6); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ffe08a'; ctx.font = '8px monospace'; ctx.textAlign = 'center';
  ctx.fillText('waypoint no minimapa', width - 190 + 88, height - 190 + 168);
}

// Modo 'tudo': mapa completo com estradas + placas + vilarejos + baús + waypoint + POIs.
if (process.argv[3] === 'tudo') {
  ctx.lineWidth = 2;
  for (const road of ROADS) {
    ctx.strokeStyle = 'rgba(60,40,25,0.85)';
    ctx.beginPath();
    road.points.forEach(([x, y], i) => (i ? ctx.lineTo(px(x), py(y)) : ctx.moveTo(px(x), py(y))));
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,215,107,0.5)';
    ctx.setLineDash([6, 6]);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  for (const sign of ROAD_SIGNS) {
    ctx.fillStyle = '#c9a76b';
    ctx.fillRect(px(sign.x) - 2, py(sign.y) - 6, 5, 4);
  }
  for (const village of VILLAGES) {
    for (const [dx, dy] of village.houses) {
      const hx = px(village.x + dx), hy = py(village.y + dy);
      ctx.fillStyle = '#a8895f'; ctx.fillRect(hx - 3, hy - 3, 7, 5);
      ctx.fillStyle = '#6a4028';
      ctx.beginPath(); ctx.moveTo(hx - 4, hy - 3); ctx.lineTo(hx, hy - 7); ctx.lineTo(hx + 4, hy - 3); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = '#fff'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(`🏘️ ${village.name}`, px(village.x), py(village.y) + 14);
  }
  for (const spot of TREASURE_SPOTS) {
    const bx = px(spot.x), by = py(spot.y);
    ctx.fillStyle = '#6a3a1e'; ctx.fillRect(bx - 3, by - 2, 6, 4);
    ctx.fillStyle = '#ffd84a'; ctx.fillRect(bx - 1, by - 2, 2, 2);
  }
  const wx = px(W2(0.62)), wy = py(H2(0.5));
  ctx.strokeStyle = '#5aff8a'; ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(wx - 9, wy - 9); ctx.lineTo(wx + 9, wy + 9);
  ctx.moveTo(wx + 9, wy - 9); ctx.lineTo(wx - 9, wy + 9);
  ctx.stroke();
  ctx.fillStyle = '#5aff8a'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('WAYPOINT', wx, wy - 14);
  ctx.fillStyle = '#ffd76b'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'left';
  ctx.fillText('🗺️ MAPA COMPLETO: estradas + placas 🪧 + vilarejos 🏘️ + baús 💰 + waypoint ✕ + cavernas/torres/portos', 40, height - 16);
}

// Modo 'clima': mostra o clima de cada região (neve no gelo, chuva na floresta, poeira no deserto, cinzas em brasa).
if (process.argv[3] === 'clima') {
  const zones = [
    { cx: W2(0.45), cy: H2(0.12), color: 'rgba(255,255,255,0.85)', label: '❄️ NEVE — Picos Gelados', n: 60, spread: 130 },
    { cx: W2(0.4), cy: H2(0.4), color: 'rgba(140,190,255,0.7)', label: '🌧️ CHUVA — Floresta Antiga', n: 60, spread: 130 },
    { cx: W2(0.85), cy: H2(0.3), color: 'rgba(232,207,138,0.6)', label: '🌪️ POEIRA — Grande Deserto', n: 50, spread: 130 },
    { cx: W2(0.764), cy: H2(0.87), color: 'rgba(138,138,138,0.7)', label: '🌋 CINZAS — Ilha de Brasa', n: 55, spread: 110 }
  ];
  let seed = 7;
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (const zone of zones) {
    ctx.fillStyle = zone.color;
    for (let i = 0; i < zone.n; i += 1) {
      const x = zone.cx + (rand() - 0.5) * zone.spread * 2;
      const y = zone.cy + (rand() - 0.5) * zone.spread * 1.2;
      ctx.fillRect(x, y, 2, zone.label.includes('CHUVA') ? 5 : 2);
    }
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(zone.label, zone.cx, zone.cy - zone.spread * 0.75);
  }
}

// Modo 'shout': anel roxo de FÚRIA no acampamento (onda do grito Z) + barra 100% no topo.
if (process.argv[3] === 'shout') {
  for (let i = 1; i <= 3; i += 1) {
    ctx.strokeStyle = `rgba(200, 107, 255, ${0.9 - i * 0.25})`;
    ctx.lineWidth = 5 - i;
    ctx.beginPath();
    ctx.arc(cx, cy, 14 + i * 22, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(20,14,10,0.8)';
  ctx.fillRect(width / 2 - 90, 40, 180, 22);
  ctx.fillStyle = '#ffd76b';
  ctx.fillRect(width / 2 - 86, 46, 172, 10);
  ctx.strokeStyle = '#ffd76b';
  ctx.strokeRect(width / 2 - 86, 46, 172, 10);
  ctx.fillStyle = '#14100d';
  ctx.font = 'bold 9px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Z • GRITO PRONTO! (FÚRIA 100%)', width / 2, 54);
  ctx.fillStyle = '#e0a0ff';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('FUS RO DAH!', cx, cy - 40);
}

// Modo 'detalhe': zoom 1:4 perto do acampamento (estrada, placa 🪧, vilarejo próximo, baú).
let outCanvas = canvas;
let outW = width;
let outH = height;
if (process.argv[3] === 'detalhe' || process.argv[3] === 'vila') {
  const S2 = 4;
  const cw = 1200;
  const ch = 800;
  const vila = process.argv[3] === 'vila' ? VILLAGES[0] : null;
  const cx0 = vila ? vila.x : WORLD.camp.x + 500;
  const cy0 = vila ? vila.y : WORLD.camp.y + 700;
  const dc = createCanvas(cw, ch);
  const d = dc.getContext('2d');
  d.fillStyle = TERRAIN_COLORS[T.VOID];
  d.fillRect(0, 0, cw, ch);
  const col0 = Math.max(0, Math.floor((cx0 - cw / 2 * S2) / TILE));
  const col1 = Math.min(grid.cols, Math.ceil((cx0 + cw / 2 * S2) / TILE));
  const row0 = Math.max(0, Math.floor((cy0 - ch / 2 * S2) / TILE));
  const row1 = Math.min(grid.rows, Math.ceil((cy0 + ch / 2 * S2) / TILE));
  for (let row = row0; row < row1; row += 1) {
    for (let col = col0; col < col1; col += 1) {
      const kind = grid.terrain[row * grid.cols + col];
      if (kind === T.VOID) continue;
      d.fillStyle = TERRAIN_COLORS[kind] ?? '#888';
      d.fillRect(Math.floor((col * TILE - (cx0 - cw / 2 * S2)) / S2), Math.floor((row * TILE - (cy0 - ch / 2 * S2)) / S2), Math.ceil(TILE / S2), Math.ceil(TILE / S2));
    }
  }
  const dx = (x) => Math.round((x - (cx0 - cw / 2 * S2)) / S2);
  const dy = (y) => Math.round((y - (cy0 - ch / 2 * S2)) / S2);
  // Estrada.
  d.lineWidth = 5;
  for (const road of ROADS) {
    d.strokeStyle = 'rgba(50,32,20,0.9)';
    d.beginPath();
    road.points.forEach(([x, y], i) => (i ? d.lineTo(dx(x), dy(y)) : d.moveTo(dx(x), dy(y))));
    d.stroke();
    d.strokeStyle = 'rgba(255,215,107,0.55)';
    d.setLineDash([10, 8]);
    d.stroke();
    d.setLineDash([]);
  }
  // Placas.
  for (const sign of ROAD_SIGNS) {
    if (sign.x < cx0 - cw / 2 * S2 - 40 || sign.x > cx0 + cw / 2 * S2 + 40 || sign.y < cy0 - ch / 2 * S2 - 40 || sign.y > cy0 + ch / 2 * S2 + 40) continue;
    d.fillStyle = '#6b4a2a'; d.fillRect(dx(sign.x) - 2, dy(sign.y) - 2, 3, 8);
    d.fillStyle = '#c9a76b'; d.fillRect(dx(sign.x) - 6, dy(sign.y) - 10, 12, 9);
    d.fillStyle = '#2a1d12'; d.fillRect(dx(sign.x) - 4, dy(sign.y) - 8, 8, 2);
    d.fillStyle = '#fff'; d.font = 'bold 10px sans-serif'; d.textAlign = 'left';
    d.fillText(`🪧 ${sign.label}`, dx(sign.x) + 8, dy(sign.y) - 4);
  }
  // Baús próximos.
  for (const spot of TREASURE_SPOTS) {
    if (spot.x < cx0 - cw / 2 * S2 - 40 || spot.x > cx0 + cw / 2 * S2 + 40 || spot.y < cy0 - ch / 2 * S2 - 40 || spot.y > cy0 + ch / 2 * S2 + 40) continue;
    d.fillStyle = '#6a3a1e'; d.fillRect(dx(spot.x) - 6, dy(spot.y) - 4, 12, 9);
    d.fillStyle = '#ffd84a'; d.fillRect(dx(spot.x) - 6, dy(spot.y) - 6, 12, 4);
  }
  // Vilarejo: casas + morador (E conversa / lojinha do viajante nas estradas).
  if (vila) {
    for (const [hx, hy] of vila.houses) {
      const X = dx(vila.x + hx), Y = dy(vila.y + hy);
      d.fillStyle = '#a8895f'; d.fillRect(X - 12, Y - 8, 24, 16);
      d.fillStyle = '#6a4028';
      d.beginPath(); d.moveTo(X - 14, Y - 8); d.lineTo(X, Y - 20); d.lineTo(X + 14, Y - 8); d.closePath(); d.fill();
      d.fillStyle = '#5a3a22'; d.fillRect(X - 4, Y + 2, 8, 6);
    }
    d.fillStyle = '#ffd76b';
    d.beginPath(); d.arc(dx(vila.x), dy(vila.y), 5, 0, Math.PI * 2); d.fill();
    d.fillStyle = '#1a120d'; d.font = 'bold 13px sans-serif'; d.textAlign = 'center';
    d.fillText(`🏘️ ${vila.name} (E no morador: conversa + dica)`, dx(vila.x), dy(vila.y) - 26);
  }
  // Acampamento.
  d.fillStyle = '#ffd76b';
  d.beginPath(); d.arc(dx(WORLD.camp.x), dy(WORLD.camp.y), 10, 0, Math.PI * 2); d.fill();
  d.fillStyle = '#1a120d'; d.font = 'bold 12px sans-serif'; d.textAlign = 'center';
  d.fillText('ACAMPAMENTO', dx(WORLD.camp.x), dy(WORLD.camp.y) - 16);
  d.fillStyle = '#fff'; d.font = 'bold 14px sans-serif'; d.textAlign = 'left';
  d.fillText(vila ? `ZOOM 1:4 — ${vila.name}: 3 casas + morador (E conversa)` : 'ZOOM 1:4 perto do acampamento — estrada dourada, placa 🪧 com destino, baú 💰', 20, ch - 16);
  outCanvas = dc;
  outW = cw;
  outH = ch;
}

const file = path.join(outDir, outName);
fs.writeFileSync(file, outCanvas.toBuffer('image/png'));
console.log(`Foto salva: ${file} (${outW}×${outH}, escala 1:${SCALE}, ${CAVES.length} cavernas, ${TOWERS.length} torres, ${DOCKS.length} portos)`);
