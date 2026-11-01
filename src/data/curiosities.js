// Curiosidades escondidas pelo mapa (inspirado nos "secrets" do Rowanmark:
// descobertos andando perto, com rumores de NPCs dando direção + distância e
// marcos de recompensa em 5/10/20 descobertas). Lógica pura (roda no Node).

import { OVERWORLD, TILE, REGION_CENTERS, REGION_INFO, terrainAt, BLOCKING, compass8 } from './worldRegions.js';

/** RNG determinístico (mulberry32) para os pontos não mudarem entre sessões. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const NAMES = Object.freeze([
  { name: 'Pedra Rúnica Antiga', sub: 'Alguém gravou runas há eras...' },
  { name: 'Ninho Dourado', sub: 'Um ninho abandonado, ainda quente...' },
  { name: 'Carta na Garrafa', sub: 'Uma mensagem esperando ser lida...' },
  { name: 'Fóssil de Dragão', sub: 'Um osso maior que você...' },
  { name: 'Círculo de Cogumelos', sub: 'Eles brilham um pouco à noite...' },
  { name: 'Estátua Esquecida', sub: 'Um rei que ninguém lembra...' },
  { name: 'Fonte Seca', sub: 'Há eco de água caindo lá dentro...' },
  { name: 'Baú de Viajante', sub: 'Alguém deixou para trás...' },
  { name: 'Altar de Pedra', sub: 'Vento passa assobiando por aqui...' },
  { name: 'Pegadas Gigantes', sub: 'Pisadas fundas na lama endurecida...' }
]);

// 7 regiões de superfície (6 centros + vale, onde fica o acampamento).
const REGIONS = ['vale', ...Object.keys(REGION_CENTERS)];

function landSpot(rng, cx, cy) {
  for (let i = 0; i < 60; i += 1) {
    const x = Math.round(cx + (rng() - 0.5) * OVERWORLD.width * 0.10);
    const y = Math.round(cy + (rng() - 0.5) * OVERWORLD.height * 0.08);
    if (!BLOCKING.has(terrainAt(x, y))) return { x, y };
  }
  return { x: Math.round(cx), y: Math.round(cy) };
}

function buildCuriosities() {
  const rng = mulberry32(20261031);
  const list = [];
  let n = 0;
  for (const region of REGIONS) {
    const center = region === 'vale'
      ? { x: OVERWORLD.width * 0.16, y: OVERWORLD.height * 0.14 }
      : REGION_CENTERS[region];
    const minLevel = REGION_INFO[region]?.levelRange?.[0] ?? 1;
    for (let i = 0; i < 3; i += 1) {
      const spot = landSpot(rng, center.x, center.y);
      const name = NAMES[n % NAMES.length];
      list.push(Object.freeze({
        id: `curio-${region}-${i}`,
        region,
        name: name.name,
        sub: name.sub,
        x: spot.x,
        y: spot.y,
        reward: Object.freeze({
          coins: 12 + minLevel * 4 + Math.floor(rng() * 10),
          xp: 18 + minLevel * 6,
          item: rng() < 0.35 ? (rng() < 0.5 ? 'potion' : 'food') : null
        })
      }));
      n += 1;
    }
  }
  return Object.freeze(list);
}

export const CURIOSITIES = buildCuriosities();
export const CURIOSITIES_BY_ID = Object.freeze(Object.fromEntries(CURIOSITIES.map((c) => [c.id, c])));

export const CURIOSITY_DISCOVER_RADIUS = 70;

/** Curiosidade dentro do raio de descoberta? */
export function curiosityAt(x, y, radius = CURIOSITY_DISCOVER_RADIUS, excludeIds = null) {
  const exclude = excludeIds ? new Set(excludeIds) : null;
  for (const c of CURIOSITIES) {
    if (exclude?.has(c.id)) continue;
    if (Math.hypot(c.x - x, c.y - y) <= radius) return c;
  }
  return null;
}

/** Metros (estilo do jogo: 1 ladrilho ≈ 10 m) e direção cardeal até a curiosidade. */
export function rumourText(fromX, fromY, curiosity) {
  const dx = curiosity.x - fromX;
  const dy = curiosity.y - fromY;
  const meters = Math.max(10, Math.round((Math.hypot(dx, dy) / TILE) * 10));
  return `${curiosity.name} fica a ${meters} m para o ${compass8(dx, dy)}`;
}

/** Recompensa de marco ao descobrir N curiosidades (5/10/20). */
export function milestoneReward(count) {
  if (count >= 20) return Object.freeze({ coins: 200, xp: 150, label: '20 curiosidades!' });
  if (count >= 10) return Object.freeze({ coins: 100, xp: 80, label: '10 curiosidades!' });
  if (count >= 5) return Object.freeze({ coins: 50, xp: 40, label: '5 curiosidades!' });
  return null;
}

/** Estado das descobertas e rumores (persiste no save). */
export class DiscoveryTracker {
  constructor(saved = {}) {
    this.discovered = new Set(Array.isArray(saved?.discovered) ? saved.discovered.filter((id) => CURIOSITIES_BY_ID[id]) : []);
    this.rumoured = new Set(Array.isArray(saved?.rumoured) ? saved.rumoured.filter((id) => CURIOSITIES_BY_ID[id]) : []);
  }

  /** Descobre uma curiosidade: devolve { first, milestone } (first=false se já era descoberta). */
  discover(id) {
    const c = CURIOSITIES_BY_ID[id];
    if (!c) return { first: false, milestone: null };
    const first = !this.discovered.has(id);
    this.discovered.add(id);
    this.rumoured.delete(id);
    return { first, milestone: milestoneReward(this.discovered.size) };
  }

  rumour(id) {
    if (CURIOSITIES_BY_ID[id] && !this.discovered.has(id)) this.rumoured.add(id);
  }

  get count() { return this.discovered.size; }

  nearestUnfound(x, y) {
    let best = null;
    let bestD = Infinity;
    for (const c of CURIOSITIES) {
      if (this.discovered.has(c.id)) continue;
      const d = Math.hypot(c.x - x, c.y - y);
      if (d < bestD) { bestD = d; best = c; }
    }
    return best;
  }

  serialize() {
    return { discovered: [...this.discovered], rumoured: [...this.rumoured] };
  }
}
