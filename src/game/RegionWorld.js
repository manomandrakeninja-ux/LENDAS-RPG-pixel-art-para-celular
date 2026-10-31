import Phaser from 'phaser';
import {
  BLOCKING, BOAT_FARE, DUNGEONS, CAVES_BY_ID, CAVE_NODES, DOCKS, FAST_TRAVEL_COST, FULL_WORLD, NODE_REGROW_DAYS, OASES, OVERWORLD,
  REGION_INFO, REGION_NODES, ROADS, ROAD_SIGNS, ROOM_COLS, T, TERRAIN_NODES, TILE, TREASURE_SPOTS, VILLAGES, buildTerrainGrid, compass8, dungeonLevelRange, dockPosition, pointOnRoad, regionAt, roadAt, roomAt
} from '../data/worldRegions.js';
import { VILLAGERS } from '../data/villagers.js';
import { drawVillager } from '../art/person.js';
import { UNDER_SUBTILES, layoutTiles, underName } from '../data/terrainLayout.js';
import { hash } from '../art/pixel.js';
import { ENEMY_TYPES } from '../data/enemies.js';
import { levelInRange } from '../data/enemyScaling.js';
import { rollGearDrop, GEAR_ITEMS, RARITIES } from '../data/gear.js';
import { WORLD } from './config.js';
import { drawNpc } from '../art/person.js';
import { ensureNpcAnims, ensureNpcPortrait, hasNpcSheet, npcOriginY, npcSheetKey } from './npcArt.js';
import { SPEAKERS } from '../data/story.js';
import { quantizePixels } from '../art/palette.js';
import { OVERLAY_DEPTH } from './depths.js';
import { bakedBuilding } from '../art/bakedBuildings.js';

// Mundo grande: chão em tilemap (o Phaser só desenha o que a câmera vê), água e lava
// animadas numa camada de baixo, e objetos/recursos montados por blocos perto do jogador.

const CHUNK = 16;
const GRASS_GID = 1;
const TERRAIN_GID = 100;
const UNDER_GID = 3000;
const SUBS = UNDER_SUBTILES * UNDER_SUBTILES;
// Camada de baixo: mar (bloqueia), mar sob a borda, lava (bloqueia), lava sob a borda, lodo e gelo.
const UNDER_SLOTS = [[T.SEA, true], [T.SEA, false], [T.LAVA, true], [T.LAVA, false], [T.MURK, false], [T.ICE, false]];
const ACTIVE_MARGIN = 420;
const INTERACT_RANGE = 70;

// Objetos por terreno: [frame, peso, sólido?]. Sólido = base que bloqueia (largura, altura).
const PROPS = {
  [T.FOREST]: { density: 0.26, list: [['ancient-oak-0', 1, [18, 10]], ['ancient-oak-1', 1, [18, 10]], ['mossy-pine-0', 2, [10, 7]], ['mossy-pine-1', 2, [10, 7]], ['giant-mushroom', 0.6, [10, 6]], ['fern', 3], ['fallen-log', 0.6, [40, 10]], ['mossy-rock', 1, [24, 10]], ['grass-tuft-0', 4], ['grass-tuft-1', 4], ['flower-tuft-0', 1.2], ['flower-tuft-1', 1.2], ['forest-flower-0', 0.8], ['forest-flower-1', 0.8], ['pebbles-0', 0.7], ['pebbles-1', 0.7], ['mushroom-cluster-0', 0.5], ['mushroom-cluster-1', 0.5], ['berry-bush-0', 0.6], ['berry-bush-1', 0.6], ['yellow-flower-0', 0.7], ['yellow-flower-1', 0.7], ['bark-scrap-0', 0.5], ['bark-scrap-1', 0.5], ['pink-flower-0', 0.6], ['pink-flower-1', 0.6], ['rotten-log', 0.4, [30, 9]], ['red-cap-0', 0.4], ['red-cap-1', 0.4], ['forest-boulder', 0.3, [14, 8]]] },
  [T.SWAMP]: { density: 0.17, list: [['willow', 1.4, [14, 9]], ['dead-tree', 1.4, [10, 7]], ['reeds', 3], ['swamp-shroom', 1.2], ['bog-log', 0.5, [40, 10]], ['mossy-rock', 0.5, [24, 10]], ['grass-tuft-0', 3], ['flower-tuft-1', 0.6], ['swamp-flower-0', 0.6], ['swamp-flower-1', 0.6], ['mud-puddle-0', 0.5], ['mud-puddle-1', 0.5], ['twisted-root-0', 0.5], ['twisted-root-1', 0.5], ['river-stone-0', 0.5, [10, 6]], ['river-stone-1', 0.5, [10, 6]], ['blue-mushroom-0', 0.5], ['blue-mushroom-1', 0.5], ['moss-pebble-0', 0.6], ['moss-pebble-1', 0.6], ['reed-0', 0.7], ['reed-1', 0.7], ['green-stone-0', 0.5, [10, 6]], ['green-stone-1', 0.5, [10, 6]], ['lilac-flower-0', 0.5], ['lilac-flower-1', 0.5], ['swamp-root', 0.5]] },
  [T.SNOW]: { density: 0.15, list: [['snow-pine-0', 2, [10, 7]], ['snow-pine-1', 2, [10, 7]], ['ice-crystal', 1, [16, 8]], ['snow-rock', 1.4, [28, 10]], ['frozen-bush', 1.4], ['grass-tuft-1', 1.5], ['snow-flower-0', 0.8], ['snow-flower-1', 0.8], ['pebbles-0', 0.5], ['pebbles-1', 0.5], ['frozen-log', 0.5, [40, 10]], ['snow-mound-0', 0.6], ['snow-mound-1', 0.6], ['ice-shard-0', 0.6, [6, 10]], ['ice-shard-1', 0.6, [6, 10]], ['ice-spike-0', 0.6, [4, 8]], ['ice-spike-1', 0.6, [4, 8]], ['white-flower-0', 0.6], ['white-flower-1', 0.6], ['blue-ice-0', 0.5], ['blue-ice-1', 0.5], ['snow-track-0', 0.6], ['snow-track-1', 0.6], ['snow-branch', 0.4, [24, 10]], ['carved-ice', 0.4, [10, 10]], ['snow-hollow-0', 0.5], ['snow-hollow-1', 0.5], ['snow-pile-0', 0.5], ['snow-pile-1', 0.5]] },
  [T.SAND]: { density: 0.07, list: [['cactus', 2, [12, 7]], ['cactus-small', 2, [10, 6]], ['desert-rock', 1, [40, 12]], ['skull', 0.7], ['dry-bush', 2], ['ruin-pillar', 0.3, [18, 8]], ['ruin-pillar-broken', 0.4, [18, 8]], ['grass-tuft-0', 1.5], ['dune-flower-0', 0.7], ['dune-flower-1', 0.7], ['pebbles-0', 0.6], ['pebbles-1', 0.6], ['blooming-cactus', 0.4, [12, 7]], ['tall-cactus', 0.35, [10, 12]], ['footprint-0', 0.4], ['footprint-1', 0.4], ['desert-bloom-0', 0.5], ['desert-bloom-1', 0.5], ['carved-pebble-0', 0.5], ['carved-pebble-1', 0.5], ['dry-log', 0.4, [28, 8]], ['white-desert-flower-0', 0.5], ['white-desert-flower-1', 0.5]] },
  [T.DUNE]: { density: 0.03, list: [['dry-bush', 1], ['skull', 0.4], ['cactus-small', 0.5, [10, 6]], ['grass-tuft-1', 1], ['dune-flower-0', 0.5], ['dune-flower-1', 0.5], ['footprint-0', 0.5], ['footprint-1', 0.5], ['small-rock-0', 0.5], ['small-rock-1', 0.5], ['dune-wave-0', 0.6], ['dune-wave-1', 0.6], ['tall-grass-0', 0.6], ['tall-grass-1', 0.6], ['dry-bush-2', 0.7], ['dune-root', 0.5]] },
  [T.BEACH]: { density: 0.06, list: [['palm-0', 1.5, [8, 6]], ['palm-1', 1.5, [8, 6]], ['sea-rock', 1, [28, 10]], ['big-flower', 0.3], ['flower-tuft-0', 1.5], ['grass-tuft-0', 2], ['beach-flower-0', 0.7], ['beach-flower-1', 0.7], ['shell-0', 0.6], ['shell-1', 0.6], ['sand-ripple-0', 0.8], ['sand-ripple-1', 0.8], ['starfish-0', 0.4], ['starfish-1', 0.4], ['tide-puddle-0', 0.4], ['tide-puddle-1', 0.4], ['broken-anchor', 0.25, [12, 10]], ['spiral-shell', 0.4], ['beach-boulder-0', 0.3, [14, 8]], ['beach-boulder-1', 0.3, [14, 8]], ['sea-foam-0', 0.5], ['sea-foam-1', 0.5], ['pale-stone-0', 0.5], ['pale-stone-1', 0.5], ['tide-rock-0', 0.5, [10, 6]], ['tide-rock-1', 0.5, [10, 6]], ['pink-shell', 0.4], ['driftwood', 0.4], ['beach-gravel', 0.6]] },
  [T.JUNGLE]: { density: 0.17, list: [['palm-0', 1.5, [8, 6]], ['palm-1', 1.5, [8, 6]], ['tropical-bush', 3], ['big-flower', 2], ['sea-rock', 0.4, [28, 10]], ['grass-tuft-0', 3], ['grass-tuft-1', 3], ['flower-tuft-1', 2], ['jungle-flower-0', 0.8], ['jungle-flower-1', 0.8], ['vine-0', 0.7], ['vine-1', 0.7], ['jungle-root-0', 0.5], ['jungle-root-1', 0.5], ['purple-flower-0', 0.6], ['purple-flower-1', 0.6], ['jungle-log', 0.4, [32, 9]], ['purple-shroom-0', 0.4], ['purple-shroom-1', 0.4]] },
  [T.ASH]: { density: 0.11, list: [['charred-tree', 2, [10, 7]], ['obsidian', 2, [28, 12]], ['lava-vent', 1], ['fire-crystal', 0.8, [14, 8]], ['ash-bush', 2], ['grass-tuft-1', 0.8], ['ash-flower-0', 0.5], ['ash-flower-1', 0.5], ['pebbles-0', 0.5], ['pebbles-1', 0.5], ['ember-0', 0.8], ['ember-1', 0.8], ['obsidian-shard-0', 0.5, [5, 8]], ['obsidian-shard-1', 0.5, [5, 8]], ['ember-flower-0', 0.5], ['ember-flower-1', 0.5], ['lava-rock-0', 0.5, [12, 6]], ['lava-rock-1', 0.5, [12, 6]], ['granite-0', 0.5, [12, 6]], ['granite-1', 0.5, [12, 6]], ['orange-flower-0', 0.5], ['orange-flower-1', 0.5], ['ash-spike-0', 0.5, [5, 10]], ['ash-spike-1', 0.5, [5, 10]]] },
};
const NODE_DENSITY = 0.011;
// Objetos que brilham no escuro (iluminam a noite e as cavernas).
const GLOWING_PROPS = new Set(['cave-crystal', 'lava-vent', 'fire-crystal', 'ice-crystal', 'swamp-shroom']);
// Cor do halo de cada objeto que brilha (LightingSystem.HALO).
const PROP_LIGHT_KIND = { 'cave-crystal': 'crystal', 'lava-vent': 'lava', 'fire-crystal': 'forge', 'ice-crystal': 'ice', 'swamp-shroom': 'shroom' };

function pick(table, roll) {
  const total = table.reduce((sum, entry) => sum + entry[1], 0);
  let value = roll * total;
  for (const entry of table) {
    value -= entry[1];
    if (value <= 0) return entry;
  }
  return table[table.length - 1];
}

function pickWeighted(weights, roll) {
  return pick(Object.entries(weights), roll)[0];
}

export class RegionWorld {
  constructor(scene, saved = {}) {
    this.scene = scene;
    this.harvested = { ...(saved?.harvested ?? {}) };
    this.discovered = new Set(Array.isArray(saved?.discovered) ? saved.discovered : ['vale']);
    this.bosses = { ...(saved?.bosses ?? {}) };
    this.chests = new Set(Array.isArray(saved?.chests) ? saved.chests : []);
    // Dia em que cada baú do mundo foi saqueado (baú reabastece 3 dias depois).
    this.chestDays = { ...(saved?.chestDays ?? {}) };
    this.travelerGifts = new Set(Array.isArray(saved?.travelerGifts) ? saved.travelerGifts : []);
    this.travelers = [];
    this.grid = buildTerrainGrid();
    this.layout = layoutTiles(this.grid, WORLD.camp);
    this.rooms = new Map(this.grid.rooms.map((room) => [`${room.cave}:${room.floor}`, room]));
    this.chunks = new Map();
    this.region = 'vale';
    this.underground = null;
    this.hazardTimer = 0;
    this.hazardMessageAt = 0;
    this.regionTimer = 0;
    this.streamTimer = 0;
    this.animTimer = 0;
    this.animFrame = 0;
    this.caveEnemies = [];
    this.features = [];
    this.bossFight = null;
    this.buildTilemap();
    this.createFeatures();
    this.ensureBossBar();
  }

  ensureBossBar() {
    let bar = document.getElementById('region-boss');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'region-boss';
      bar.className = 'region-boss';
      bar.innerHTML = '<p class="region-boss__name" data-boss-name></p><div class="region-boss__track"><div class="region-boss__fill" data-boss-fill></div></div>';
      (document.getElementById('game') ?? document.body).appendChild(bar);
    }
    bar.hidden = true;
  }

  // ---------- Chão ----------

  buildTilemap() {
    const scene = this.scene;
    const { cols, rows } = this.grid;
    const index = scene.cache.json.get('terrain-index')?.index ?? {};
    this.tileIndex = index;
    const map = scene.make.tilemap({ tileWidth: TILE, tileHeight: TILE, width: cols, height: rows });
    this.map = map;
    const grass = map.addTilesetImage('grass', 'grass', TILE, TILE, 0, 0, GRASS_GID);
    const terrain = map.addTilesetImage('terrain', 'terrain-tiles', TILE, TILE, 0, 0, TERRAIN_GID);
    // Textura da camada animada: um quadro de cada tipo lado a lado, redesenhada a cada passo.
    if (scene.textures.exists('under-tiles')) scene.textures.remove('under-tiles');
    this.underTexture = scene.textures.createCanvas('under-tiles', UNDER_SLOTS.length * SUBS * TILE, TILE);
    this.underTexture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.drawUnderFrame(0);
    const under = map.addTilesetImage('under', 'under-tiles', TILE, TILE, 0, 0, UNDER_GID);
    this.underLayer = map.createBlankLayer('under', under).setDepth(-1001);
    this.groundLayer = map.createBlankLayer('ground', [grass, terrain]).setDepth(-1000);

    const { ground, under: underCells } = this.layout;
    const wallIndices = new Set();
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const cell = row * cols + col;
        const name = ground[cell];
        if (typeof name === 'number') this.groundLayer.putTileAt(GRASS_GID + name, col, row, false);
        else if (name && index[name] !== undefined) {
          const tile = TERRAIN_GID + index[name];
          this.groundLayer.putTileAt(tile, col, row, false);
          if (name.startsWith('wall')) wallIndices.add(tile);
        }
        const underKind = underCells[cell];
        if (underKind >= 0) {
          const pure = this.grid.terrain[cell] === underKind;
          const slot = UNDER_SLOTS.findIndex(([kind, block]) => kind === underKind && (block === (pure && BLOCKING.has(kind)) || !BLOCKING.has(kind)));
          // Mar/lava/lodo/gelo em blocos de 3x3 ladrilhos diferentes (repetem só a cada 144 px).
          const sub = (col % UNDER_SUBTILES) + (row % UNDER_SUBTILES) * UNDER_SUBTILES;
          this.underLayer.putTileAt(UNDER_GID + Math.max(0, slot) * SUBS + sub, col, row, false);
        }
      }
    }
    // Camada de cima do chão: franjas entre terrenos e decoração solta (tufos, flores, seixos).
    // Duas camadas: a franja do 2º invasor fica por baixo da do 1º (quadrado tocado por dois terrenos).
    this.overlayLayer2 = map.createBlankLayer('overlay2', terrain).setDepth(-999.5);
    this.overlayLayer = map.createBlankLayer('overlay', terrain).setDepth(-999);
    const { overlay, overlay2 = [] } = this.layout;
    for (const [names, layer] of [[overlay, this.overlayLayer], [overlay2, this.overlayLayer2]]) {
      for (let cell = 0; cell < names.length; cell += 1) {
        const name = names[cell];
        if (name && index[name] !== undefined) layer.putTileAt(TERRAIN_GID + index[name], cell % cols, Math.floor(cell / cols), false);
      }
    }
    this.groundLayer.setCollision([...wallIndices]);
    this.underLayer.setCollision([0, 2].flatMap((slot) => Array.from({ length: SUBS }, (_, sub) => UNDER_GID + slot * SUBS + sub)));
    // Paredes das cavernas ganham a cor do tema de cada caverna.
    for (const room of this.grid.rooms) {
      const tint = { ice: 0xb8d8ff, fire: 0xffb8a0, tomb: 0xffe0b0, swamp: 0xc8e0b0, sea: 0xc0d0e0 }[CAVES_BY_ID[room.cave].theme];
      if (!tint) continue;
      for (const layer of [this.groundLayer, this.overlayLayer2, this.overlayLayer]) {
        layer.forEachTile((tile) => { tile.tint = tint; }, null, room.col0, room.row0, ROOM_COLS, room.plan.grid.length / ROOM_COLS);
      }
    }
    scene.hudCamera?.ignore([this.underLayer, this.groundLayer, this.overlayLayer2, this.overlayLayer]);
  }

  drawUnderFrame(frame) {
    const source = this.scene.textures.get('terrain-tiles').getSourceImage();
    const context = this.underTexture.getContext();
    const columns = this.scene.cache.json.get('terrain-index')?.columns ?? 16;
    const index = this.tileIndex ?? this.scene.cache.json.get('terrain-index')?.index ?? {};
    UNDER_SLOTS.forEach(([kind], slot) => {
      for (let sub = 0; sub < SUBS; sub += 1) {
        const position = index[underName(kind, kind === T.ICE ? 0 : frame, sub)];
        if (position === undefined) continue;
        context.drawImage(source, (position % columns) * TILE, Math.floor(position / columns) * TILE, TILE, TILE, (slot * SUBS + sub) * TILE, 0, TILE, TILE);
      }
    });
    this.underTexture.refresh();
  }

  /** Mar, lava e paredes bloqueiam quem tem corpo físico. */
  collide(object) {
    return this.scene.physics.add.collider(object, [this.groundLayer, this.underLayer]);
  }

  terrainAtPoint(x, y) {
    const col = Math.floor(x / TILE);
    const row = Math.floor(y / TILE);
    if (col < 0 || row < 0 || col >= this.grid.cols || row >= this.grid.rows) return T.VOID;
    return this.grid.terrain[row * this.grid.cols + col];
  }

  /** O ponto é chão firme (sem água funda, lava ou parede)? */
  walkable(x, y) {
    return !BLOCKING.has(this.terrainAtPoint(x, y));
  }

  // ---------- Locais fixos: cavernas e portos ----------

  createFeatures() {
    const scene = this.scene;
    // Barqueiro dos portos (o retrato do diálogo usa a mesma textura).
    if (!ensureNpcPortrait(scene, 'barqueiro') && !scene.textures.exists('npc-barqueiro-0')) {
      const pixels = drawNpc(SPEAKERS.barqueiro.palette, 0);
      const texture = scene.textures.createCanvas('npc-barqueiro-0', pixels.width, pixels.height);
      texture.getContext().putImageData(new ImageData(quantizePixels(pixels).data, pixels.width, pixels.height), 0, 0);
      texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      texture.refresh();
    }
    for (const cave of DUNGEONS) {
      const { x, y } = cave.entrance;
      const key = this.ensureEntranceTexture(cave);
      const sprite = key
        ? scene.add.image(x, y, key).setOrigin(0.5, 0.92).setDepth(y)
        : scene.add.image(x, y, 'biome', `cave-${cave.theme}`).setOrigin(0.5, 0.92).setDepth(y);
      if (!key && cave.tower) sprite.setScale(0.9, 1.3);
      this.features.push({ type: 'cave', cave, x, y: y + 4, sprite, label: `ENTRAR • ${cave.name}` });
      this.addHint(sprite, x, y - Math.round(sprite.displayHeight * 0.92) - 10, cave.name);
    }
    for (const dock of DOCKS) {
      const position = dockPosition(dock);
      const pier = scene.add.image(position.x, position.y + 30, 'biome', 'pier').setDepth(position.y - 20);
      const boat = scene.add.image(position.x + 6, position.boatY, 'biome', 'boat').setDepth(position.boatY + 30);
      scene.tweens.add({ targets: boat, y: position.boatY + 3, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      // Pintado (G-npcs): pés 7 px abaixo do ponto antigo, respirando; reserva: desenho antigo balançando.
      const painted = hasNpcSheet(scene, 'barqueiro') && ensureNpcAnims(scene, 'barqueiro');
      const captain = painted
        ? scene.add.sprite(position.x - 30, position.y + 3, npcSheetKey('barqueiro')).setOrigin(0.5, npcOriginY('barqueiro')).setDepth(position.y + 26).play('npcsheet-barqueiro-idle')
        : scene.add.image(position.x - 30, position.y - 4, 'npc-barqueiro-0').setOrigin(0.5, 0.68).setDepth(position.y + 26);
      if (!painted) scene.tweens.add({ targets: captain, y: position.y - 5, duration: 900, yoyo: true, repeat: -1 });
      this.features.push({ type: 'dock', dock, x: position.x - 12, y: position.y, sprite: captain, label: `BARCO • ${dock.name}` });
      this.addHint(captain, position.x - 30, position.y - (painted ? 64 : 40), dock.name);
      scene.hudCamera?.ignore([pier, boat, captain]);
    }
    // Placas de sinalização ao longo das estradas (indicam o destino e a distância).
    for (const sign of ROAD_SIGNS) {
      if (!scene.textures.exists('biome')) continue;
      const sprite = scene.add.image(sign.x, sign.y, 'biome', 'signpost').setOrigin(0.5, 0.9).setDepth(sign.y);
      scene.hudCamera?.ignore(sprite);
      this.features.push({ type: 'sign', sign, x: sign.x, y: sign.y + 4, sprite, label: `LER PLACA • ${sign.label}` });
      this.addHint(sprite, sign.x, sign.y - Math.round(sprite.displayHeight * 0.9) - 10, sign.label);
    }
    // Moradores dos vilarejos nomeados: ficam parados perto das casas e conversam com E.
    VILLAGES.forEach((village, index) => {
      const def = VILLAGERS[index % VILLAGERS.length];
      for (const frame of [0, 1]) {
        const key = `villager-${village.id}-${frame}`;
        if (!scene.textures.exists(key)) {
          const pixels = drawVillager(def.palette, def.prop, frame);
          const texture = scene.textures.createCanvas(key, pixels.width, pixels.height);
          texture.getContext().putImageData(new ImageData(pixels.data, pixels.width, pixels.height), 0, 0);
          texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
          texture.refresh();
        }
      }
      const animKey = `villager-${village.id}-idle`;
      if (!scene.anims.exists(animKey)) {
        scene.anims.create({ key: animKey, frames: [{ key: `villager-${village.id}-0` }, { key: `villager-${village.id}-1` }], frameRate: 2, repeat: -1 });
      }
      const npc = scene.add.sprite(village.x, village.y + 30, `villager-${village.id}-0`).setOrigin(0.5, 0.86).setDepth(village.y + 30);
      npc.play(animKey);
      const npcShadow = scene.add.ellipse(village.x, village.y + 34, 22, 7, 0x000000, 0.26).setDepth(village.y - 1);
      scene.hudCamera?.ignore([npc, npcShadow]);
      this.features.push({ type: 'villager', village, x: village.x, y: village.y + 30, sprite: npc, label: `CONVERSAR • ${village.name}` });
      this.addHint(npc, village.x, village.y - 40, village.name);
      // Cama na primeira casa do vilarejo: permite dormir até amanhecer fora do acampamento.
      const [bedDx, bedDy] = village.houses[0];
      const bedX = village.x + bedDx;
      const bedY = village.y + bedDy + 18;
      this.features.push({ type: 'bed', village, x: bedX, y: bedY, label: `DORMIR ATÉ AMANHECER • ${village.name}` });
      // Pedra rúnica na praça do vilarejo: abençoa com +50% XP até o fim do dia (1x por dia).
      const runeX = village.x + 56;
      const runeY = village.y + 52;
      const runeSprite = scene.add.image(runeX, runeY, 'biome', 'ruin-pillar').setOrigin(0.5, 0.9).setDepth(runeY);
      scene.hudCamera?.ignore([runeSprite]);
      this.addHint(runeSprite, runeX, runeY - Math.round(runeSprite.displayHeight * 0.9) - 10, 'Pedra Rúnica');
      this.features.push({ type: 'rune', village, x: runeX, y: runeY, sprite: runeSprite, label: `💠 TOCAR A PEDRA RÚNICA • ${village.name}` });
    });
    // Viajantes que caminham pelas estradas (ida e volta) e conversam/trocam com E.
    const travelerRoads = [ROADS[0], ROADS[2], ROADS[3], ROADS[4]].filter(Boolean);
    const travelerLines = [
      'Andei a estrada inteira esta semana. Se vir fumaça, é acampamento bom.',
      'Dizem que tem baú escondido longe das estradas... procure nos cantos do mapa.',
      'Cuidado à noite: as criaturas do brejo e do deserto ficam ousadas.',
      'Compro peles e minério! Pago em moedas na hora.'
    ];
    this.travelers = travelerRoads.map((road, index) => {
      const id = `viajante-${index}`;
      const def = VILLAGERS[(index + 2) % VILLAGERS.length];
      for (const frame of [0, 1]) {
        const key = `villager-${id}-${frame}`;
        if (!scene.textures.exists(key)) {
          const pixels = drawVillager(def.palette, def.prop, frame);
          const texture = scene.textures.createCanvas(key, pixels.width, pixels.height);
          texture.getContext().putImageData(new ImageData(pixels.data, pixels.width, pixels.height), 0, 0);
          texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
          texture.refresh();
        }
      }
      const animKey = `villager-${id}-walk`;
      if (!scene.anims.exists(animKey)) {
        scene.anims.create({ key: animKey, frames: [{ key: `villager-${id}-0` }, { key: `villager-${id}-1` }], frameRate: 5, repeat: -1 });
      }
      const start = pointOnRoad(road, 0.2 + index * 0.3);
      const sprite = scene.add.sprite(start.x, start.y, `villager-${id}-0`).setOrigin(0.5, 0.86).setDepth(start.y).play(animKey);
      const shadow = scene.add.ellipse(start.x, start.y + 4, 22, 7, 0x000000, 0.26).setDepth(start.y - 1);
      scene.hudCamera?.ignore([sprite, shadow]);
      const traveler = { id, road, t: 0.2 + index * 0.3, dir: index % 2 === 0 ? 1 : -1, speed: 24 + index * 4, sprite, shadow, lines: travelerLines };
      this.features.push({ type: 'traveler', traveler, get x() { return traveler.sprite.x; }, get y() { return traveler.sprite.y; }, sprite, label: 'CONVERSAR • VIAJANTE' });
      this.addHint(sprite, start.x, start.y - 40, 'Viajante');
      return traveler;
    });
    // Baús de tesouro escondidos no overworld (longe do acampamento e dos POIs).
    for (const spot of TREASURE_SPOTS) {
      const sprite = scene.add.image(spot.x, spot.y, 'biome', 'boss-chest').setOrigin(0.5, 0.85).setScale(1.1).setDepth(spot.y);
      scene.hudCamera?.ignore(sprite);
      const feature = { type: 'chest', spot, x: spot.x, y: spot.y, sprite, label: 'ABRIR BAÚ' };
      if (this.chests.has(spot.id)) {
        feature.opened = true;
        sprite.setTint(0x777777);
      }
      this.features.push(feature);
      this.addHint(sprite, spot.x, spot.y - 34, 'Baú');
    }
    // Escadas e baús das salas das cavernas.
    for (const room of this.grid.rooms) {
      const cave = CAVES_BY_ID[room.cave];
      const last = room.floor === cave.floors - 1;
      const entry = this.roomPoint(room, room.plan.entry);
      const exit = this.roomPoint(room, room.plan.exit);
      const up = scene.add.image(entry.x, entry.y, 'biome', 'stairs-up').setDepth(entry.y - 30);
      this.features.push({ type: 'up', room, cave, x: entry.x, y: entry.y, sprite: up, label: room.floor === 0 ? (cave.tower ? 'SAIR DA TORRE' : 'SAIR DA CAVERNA') : (cave.tower ? 'DESCER' : 'SUBIR') });
      scene.hudCamera?.ignore(up);
      if (!last) {
        const down = scene.add.image(exit.x, exit.y, 'biome', 'stairs-down').setDepth(exit.y - 30);
        this.features.push({ type: 'down', room, cave, x: exit.x, y: exit.y, sprite: down, label: cave.tower ? 'SUBIR' : 'DESCER' });
        scene.hudCamera?.ignore(down);
      }
    }
  }

  /** Textura pintada (scripts/building-paint/region.mjs) da entrada da masmorra ou da torre da região. */
  ensureEntranceTexture(cave) {
    const key = `region-${cave.tower ? 'tower' : 'cave'}-${cave.theme}`;
    const textures = this.scene.textures;
    if (textures.exists(key)) return key;
    const baked = bakedBuilding(key);
    if (!baked) return null;
    const texture = textures.createCanvas(key, baked.width, baked.height);
    texture.getContext().putImageData(new ImageData(quantizePixels(baked).data, baked.width, baked.height), 0, 0);
    texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    texture.refresh();
    return key;
  }

  addHint(target, x, y, text) {
    const label = this.scene.add.text(x, y, text, {
      fontFamily: 'Press Start 2P', fontSize: '7px', color: '#fff3cf',
      backgroundColor: '#1d1712cc', padding: { x: 4, y: 3 }
    }).setOrigin(0.5).setDepth(OVERLAY_DEPTH + 9000).setVisible(false);
    this.scene.hudCamera?.ignore([target, label]);
    target.hintLabel = label;
  }

  roomPoint(room, point) {
    return { x: room.x + point.col * TILE + TILE / 2, y: room.y + point.row * TILE + TILE / 2 };
  }

  nearestFeature(x, y, range = INTERACT_RANGE) {
    let best = null;
    let bestDistance = range;
    for (const feature of this.features) {
      // Baú de mundo (com spot) continua interagível depois de aberto (reabastece em 3 dias);
      // baú de chefe/torre abre só uma vez.
      if (feature.type === 'chest' && feature.opened && !feature.spot) continue;
      const distance = Phaser.Math.Distance.Between(x, y, feature.x, feature.y);
      if (distance < bestDistance) {
        best = feature;
        bestDistance = distance;
      }
    }
    return best;
  }

  /** E / toque: entra em caverna, sobe/desce escada, pega barco ou abre o baú do chefe. */
  interact() {
    const player = this.scene.player;
    const feature = this.nearestFeature(player.x, player.y);
    if (!feature) return false;
    if (feature.type === 'cave') this.enterCave(feature.cave.id, 0);
    else if (feature.type === 'down') this.enterCave(feature.cave.id, feature.room.floor + 1);
    else if (feature.type === 'up') {
      if (feature.room.floor === 0) this.leaveCave();
      else this.enterCave(feature.cave.id, feature.room.floor - 1, { fromBelow: true });
    } else if (feature.type === 'dock') this.openBoat(feature.dock);
    else if (feature.type === 'chest') feature.spot ? this.openWorldChest(feature) : this.openBossChest(feature);
    else if (feature.type === 'sign') this.readSign(feature.sign);
    else if (feature.type === 'villager') this.talkToVillager(feature.village);
    else if (feature.type === 'traveler') this.talkToTraveler(feature.traveler);
    else if (feature.type === 'bed') this.scene.sleepAtBed(feature.village);
    else if (feature.type === 'rune') this.scene.touchRuneStone(feature.village);
    return true;
  }

  /** Viajante na estrada: 1 presente grátis por dia; depois abre a lojinha itinerante. */
  talkToTraveler(traveler) {
    const scene = this.scene;
    const line = traveler.lines[Math.floor(Math.random() * traveler.lines.length)];
    const day = scene.timeState?.dayCount ?? 1;
    const giftKey = `${traveler.id}:${day}`;
    if (!this.travelerGifts.has(giftKey)) {
      this.travelerGifts.add(giftKey);
      if (Math.random() < 0.5) {
        const coins = Phaser.Math.Between(5, 12);
        scene.economy?.addCoins?.(coins);
        scene.ui.showMessage(`🧳 Viajante: "${line}" Toma ${coins} moedas pela conversa!`);
        scene.audio?.playCoin?.();
      } else {
        const type = ['wood', 'stone', 'herb', 'fiber'][Math.floor(Math.random() * 4)];
        const amount = Phaser.Math.Between(2, 4);
        if (scene.inventory?.add(type, amount)) {
          scene.ui.showMessage(`🧳 Viajante: "${line}" Toma ${amount} ${type}!`);
          scene.audio?.playCollect?.();
        } else scene.ui.showMessage(`🧳 Viajante: "${line}"`);
      }
      scene.save?.();
      return;
    }
    // Lojinha itinerante (compartilhada com os vilarejos).
    this.openShop('viajante', `🧳 Viajante: "${line}" — O que vai ser, forasteiro?`);
  }

  /** Loja simples por moedas: poção, comida e tocha (viajantes e vilarejos). */
  openShop(speaker, title) {
    const scene = this.scene;
    const ui = scene.campaign?.ui;
    if (!ui?.dialogue) {
      scene.ui.showMessage(title);
      scene.audio?.playPick?.();
      return;
    }
    const coins = scene.economy?.coins ?? 0;
    const titleWithCoins = `${title} (🪙 ${coins})`;
    const offers = [
      { label: 'POÇÃO DE VIDA • 15 moedas', price: 15, type: 'potion' },
      { label: 'COMIDA • 8 moedas', price: 8, type: 'food' },
      { label: 'TOCHA • 5 moedas', price: 5, type: 'torch' }
    ].map((offer) => ({
      label: offer.label,
      primary: true,
      disabled: coins < offer.price,
      action: () => {
        if (scene.economy?.spendCoins?.(offer.price) && scene.inventory?.add(offer.type, 1)) {
          scene.ui.showMessage(`🛒 Comprou ${offer.type} na loja do ${speaker}!`);
          scene.audio?.playCoin?.();
          scene.save?.();
        } else {
          scene.ui.showMessage('Mochila cheia ou sem moedas!');
        }
      }
    }));
    offers.push({ label: 'SÓ CONVERSAR', action: () => scene.ui.showMessage(title) });
    ui.dialogue(speaker, titleWithCoins, offers);
  }

  /** Baú escondido no overworld: saque único com equipamento; reabastece com moedas 3 dias depois. */
  openWorldChest(feature) {
    const scene = this.scene;
    const region = feature.spot.region;
    const info = REGION_INFO[region];
    const level = info?.levelRange?.[1] ?? 10;
    const day = scene.timeState?.dayCount ?? 1;
    const openedDay = this.chestDays[feature.spot.id];
    if (this.chests.has(feature.spot.id)) {
      // Já saqueado: só volta a dar loot 3 dias depois (só moedas, sem equipamento).
      if (openedDay === undefined || day - openedDay < 3) {
        scene.ui.showMessage('Esse baú já foi saqueado. Os saqueadores voltam em alguns dias...');
        scene.audio?.playDeny?.();
        return;
      }
      const coins = 10 + Math.round(level * 0.8) + Math.floor(Math.random() * 8);
      scene.economy?.addCoins?.(coins);
      this.chestDays[feature.spot.id] = day;
      feature.sprite.clearTint();
      scene.effects?.spawnHarvest?.(feature.x, feature.y - 10, 0xffd76b);
      scene.audio?.playChest?.();
      scene.ui.showMessage(`Baú reabastecido em ${info?.name ?? region}! +${coins} moedas`);
      scene.save?.();
      return;
    }
    const coins = 25 + Math.round(level * 2.5) + Math.floor(Math.random() * 20);
    scene.economy?.addCoins?.(coins);
    let extra = '';
    if (Math.random() < 0.35) {
      const drops = rollGearDrop({ region, level, boss: `world:${feature.spot.id}` });
      for (const drop of drops.slice(0, 1)) {
        const item = scene.gear?.add(drop.id, drop.rarity);
        if (item) {
          extra = ` • ${RARITIES[drop.rarity].name}: ${GEAR_ITEMS[drop.id].name}`;
          window.dispatchEvent(new CustomEvent('lendas:gear'));
        }
      }
    }
    feature.opened = true;
    this.chests.add(feature.spot.id);
    this.chestDays[feature.spot.id] = day;
    feature.sprite.setTint(0x777777);
    scene.effects?.spawnHarvest?.(feature.x, feature.y - 10, 0xffd76b);
    scene.audio?.playChest?.();
    const xp = 10 + level * 2;
    scene.ui.showMessage(`Baú escondido em ${info?.name ?? region}! +${coins} moedas${extra} • +${xp} XP`);
    scene.grantExperience?.(xp, true);
    scene.save?.();
  }

  /** Fala com o morador de um vilarejo: linha + descoberta + lojinha da vila. */
  talkToVillager(village) {
    const scene = this.scene;
    const line = village.lines[Math.floor(Math.random() * village.lines.length)];
    if (!this.discovered.has(`vila:${village.id}`)) {
      this.discovered.add(`vila:${village.id}`);
      scene.campaign?.ui?.toast?.(`Descoberto: ${village.name}`, 'gold');
      scene.grantExperience?.(15, true);
      scene.save?.();
    }
    // Vilarejos têm commerce local: mesma lojinha do viajante, com fala do morador.
    this.openShop('morador', `🧑 ${village.name}: "${line}" — A lojinha da vila tá aberta!`);
  }

  /** Placa de estrada: diz para onde fica o destino e a quantos metros. */
  readSign(sign) {
    const scene = this.scene;
    const player = scene.player;
    const poi = sign.poi ?? { x: sign.x, y: sign.y, name: sign.label };
    const dx = poi.x - player.x;
    const dy = poi.y - player.y;
    const meters = Math.max(0, Math.round((Math.hypot(dx, dy) / TILE) * 10));
    const compass = compass8(dx, dy);
    scene.ui.showMessage(`🪧 Placa: ${poi.name} fica a ${meters} m para ${compass}.`);
    scene.audio?.playPick?.();
  }

  // ---------- Barco ----------

  openBoat(dock) {
    const scene = this.scene;
    const ui = scene.campaign?.ui;
    const destinations = DOCKS.filter((other) => other.id !== dock.id);
    const coins = scene.economy?.coins ?? 0;
    const options = destinations.map((other) => ({
      label: `${other.name.toUpperCase()} (${BOAT_FARE} moedas)`,
      primary: true,
      disabled: coins < BOAT_FARE,
      action: () => this.sail(other)
    }));
    options.push({ label: 'SAIR', action: () => {} });
    const text = coins < BOAT_FARE
      ? `A passagem custa ${BOAT_FARE} moedas e você tem ${coins}. Volte quando tiver mais.`
      : 'Para onde vamos? O mar está calmo hoje, mas as ilhas não são para os fracos.';
    if (ui) ui.dialogue('barqueiro', text, options);
  }

  sail(dock) {
    const scene = this.scene;
    if (!scene.economy?.spendCoins?.(BOAT_FARE)) {
      scene.ui.showMessage('Moedas insuficientes para a passagem.');
      return;
    }
    const position = dockPosition(dock);
    this.teleport(position.x, position.y - 20, () => {
      scene.ui.showMessage(`Você desembarcou no ${dock.name}.`);
      scene.audio?.playCollect?.();
    });
  }

  /**
   * Viagem rápida pelo mapa (M): teleporta até um local já descoberto.
   * target: { type: 'camp' } ou { type: 'feature', feature } (caverna/torre/porto).
   * O acampamento é grátis; os demais custam FAST_TRAVEL_COST moedas.
   */
  fastTravelTo(target) {
    const scene = this.scene;
    const player = scene.player;
    let dest;
    let name;
    if (target.type === 'camp') {
      dest = { x: WORLD.camp.x, y: WORLD.camp.y + 85 };
      name = 'Acampamento';
    } else {
      const feature = target.feature;
      if (feature.type === 'dock') {
        const position = dockPosition(feature.dock);
        dest = { x: position.x, y: position.y - 20 };
        name = feature.dock.name;
      } else {
        dest = { x: feature.cave.entrance.x, y: feature.cave.entrance.y + 46 };
        name = feature.cave.name;
      }
    }
    if (player && Math.hypot(player.x - dest.x, player.y - dest.y) < 160) {
      scene.ui.showMessage('Você já está perto desse lugar.');
      return false;
    }
    const cost = target.type === 'camp' ? 0 : FAST_TRAVEL_COST;
    if (cost > 0 && !scene.economy?.spendCoins?.(cost)) {
      scene.ui.showMessage(`Viagem rápida para ${name} custa ${cost} moedas e você não tem.`);
      return false;
    }
    this.teleport(dest.x, dest.y, () => {
      scene.ui.showMessage(cost > 0 ? `Viajou até ${name} (−${cost} moedas).` : `Voltou ao ${name}.`);
      scene.audio?.playCollect?.();
      scene.save?.();
    });
    return true;
  }

  teleport(x, y, onArrive = null, bounds = null) {
    const scene = this.scene;
    const camera = scene.cameras.main;
    this.teleporting = true;
    camera.fadeOut(220, 0, 0, 0);
    camera.once('camerafadeoutcomplete', () => {
      scene.player.body.reset(x, y);
      if (bounds) camera.setBounds(bounds.x, bounds.y, bounds.width, bounds.height);
      else camera.setBounds(0, 0, OVERWORLD.width, OVERWORLD.height);
      camera.centerOn(x, y);
      this.updateStreaming(true);
      onArrive?.();
      camera.fadeIn(260, 0, 0, 0);
      this.teleporting = false;
    });
  }

  // ---------- Cavernas ----------

  enterCave(caveId, floor, { fromBelow = false } = {}) {
    const cave = CAVES_BY_ID[caveId];
    const room = this.rooms.get(`${caveId}:${floor}`);
    if (!cave || !room) return;
    const point = this.roomPoint(room, fromBelow ? room.plan.exit : room.plan.entry);
    const offset = fromBelow ? -TILE * 1.2 : TILE * 1.2;
    this.clearCaveEnemies();
    this.scene.enemyDirector?.clearRegular?.();
    this.underground = { cave: caveId, floor, room };
    this.scene.campaign?.emit?.({ type: 'delve', target: caveId, floor });
    this.teleport(point.x + offset, point.y, () => {
      this.populateRoom(room, cave);
      this.scene.ui.showMessage(`${cave.name} • andar ${floor + 1} de ${cave.floors}${cave.tower ? ' • mais forte a cada andar' : ''}`);
    }, { x: room.x, y: room.y, width: room.width, height: room.height });
  }

  leaveCave(silent = false) {
    const state = this.underground;
    if (!state) return;
    this.underground = null;
    this.clearCaveEnemies();
    this.endBossFight();
    if (silent) {
      this.scene.cameras.main.setBounds(0, 0, OVERWORLD.width, OVERWORLD.height);
      return;
    }
    const cave = CAVES_BY_ID[state.cave];
    this.teleport(cave.entrance.x, cave.entrance.y + 46, () => this.scene.ui.showMessage(`De volta à superfície: ${REGION_INFO[cave.region].name}.`));
  }

  /** Morreu na caverna: volta ao acampamento sem a câmera presa na sala. */
  onRespawn() {
    if (this.underground) this.leaveCave(true);
  }

  populateRoom(room, cave) {
    const scene = this.scene;
    const last = room.floor === cave.floors - 1;
    const isNight = Boolean(scene.timeState?.isNight);
    room.plan.chambers.forEach((chamber, index) => {
      const count = 2 + Math.floor(hash(index, room.floor, 7 + Math.floor(scene.time.now / 1000)) * 2) + room.floor;
      for (let n = 0; n < count; n += 1) {
        // Andares mais fundos têm os monstros mais fortes da lista.
        const pool = cave.monsters.slice(0, Math.min(cave.monsters.length, 2 + room.floor));
        const kind = pool[Math.floor(Math.random() * pool.length)];
        const angle = Math.random() * Math.PI * 2;
        const x = room.x + chamber.col * TILE + TILE / 2 + Math.cos(angle) * 40;
        const y = room.y + chamber.row * TILE + TILE / 2 + Math.sin(angle) * 40;
        if (!this.walkable(x, y)) continue;
        const elite = Math.random() < 0.12 + room.floor * 0.08;
        this.spawnCaveEnemy(kind, x, y, { elite, isNight });
      }
    });
    if (last && !cave.tower) {
      const exit = this.roomPoint(room, room.plan.exit);
      const defeatedDay = this.bosses[cave.id];
      const day = scene.timeState?.dayCount ?? 1;
      // O chefe volta 3 dias depois de derrotado (o baú só abre uma vez).
      if (defeatedDay === undefined || day - defeatedDay >= 3) {
        const boss = this.spawnCaveEnemy(cave.boss, exit.x, exit.y, { boss: true });
        if (boss) this.startBossFight(boss, cave);
      }
      if (!this.chests.has(cave.id) && defeatedDay !== undefined) this.placeBossChest(cave, room);
    }
    // Torre: o baú do topo já está lá (sem chefe); abre uma vez.
    if (cave.tower && last && !this.chests.has(cave.id)) this.placeBossChest(cave, room);
  }

  spawnCaveEnemy(kind, x, y, { elite = false, isNight = false, boss = false } = {}) {
    const scene = this.scene;
    const EnemyClass = scene.enemyDirector?.EnemyClass;
    if (!EnemyClass) return null;
    const level = levelInRange(ENEMY_TYPES[kind], dungeonLevelRange(CAVES_BY_ID[this.underground?.cave], this.underground?.floor ?? 0));
    const enemy = new EnemyClass(scene, x, y, kind, { elite: boss ? false : elite, isNight, level });
    enemy.isCaveEnemy = true;
    enemy.ignoresSafeZone = true;
    if (boss) {
      enemy.isRegionBoss = true;
      enemy.noFlee = true;
      enemy.perception = 620;
    }
    scene.enemies.push(enemy);
    scene.hudCamera?.ignore(enemy);
    if (!enemy.definition.ignoresObstacles) this.collide(enemy);
    this.caveEnemies.push(enemy);
    return enemy;
  }

  clearCaveEnemies() {
    for (const enemy of this.caveEnemies) {
      if (enemy.active && !enemy.dead) this.scene.enemyDirector?.remove(enemy);
    }
    this.caveEnemies = [];
  }

  // ---------- Chefes ----------

  startBossFight(boss, cave) {
    this.bossFight = { boss, cave, timer: 2600, telegraphs: [] };
    const bar = document.getElementById('region-boss');
    if (bar) {
      bar.hidden = false;
      bar.querySelector('[data-boss-name]').textContent = boss.name;
    }
    this.scene.showEpic?.(boss.name.toUpperCase(), `Chefe de ${cave.name}`, 2600);
  }

  endBossFight() {
    if (this.bossFight) for (const mark of this.bossFight.telegraphs) mark.ring.destroy();
    this.bossFight = null;
    const bar = document.getElementById('region-boss');
    if (bar) bar.hidden = true;
  }

  updateBossFight(delta) {
    const fight = this.bossFight;
    if (!fight) return;
    const { boss } = fight;
    const bar = document.getElementById('region-boss');
    if (!boss.active || boss.dead) {
      this.endBossFight();
      return;
    }
    if (bar) bar.querySelector('[data-boss-fill]').style.width = `${Math.max(0, (boss.health / boss.maxHealth) * 100)}%`;
    const player = this.scene.player;
    const distance = Phaser.Math.Distance.Between(player.x, player.y, boss.x, boss.y);
    fight.timer -= delta;
    // Golpe especial: marca círculos no chão; quem estiver dentro quando explodirem leva dano.
    if (fight.timer <= 0 && distance < 520) {
      const enraged = boss.health < boss.maxHealth * 0.5;
      fight.timer = enraged ? 2600 : 3800;
      const count = boss.kind === 'dragon' || boss.kind === 'hydra' || boss.kind === 'abyssLord' ? 3 : enraged ? 2 : 1;
      for (let index = 0; index < count; index += 1) {
        const spread = index === 0 ? 0 : 70;
        const angle = Math.random() * Math.PI * 2;
        this.addTelegraph(player.x + Math.cos(angle) * spread, player.y + Math.sin(angle) * spread, boss);
      }
    }
    for (const mark of [...fight.telegraphs]) {
      mark.ms -= delta;
      mark.ring.setScale(1 + (1 - mark.ms / mark.total) * 0.15).setAlpha(0.35 + (1 - mark.ms / mark.total) * 0.5);
      if (mark.ms > 0) continue;
      fight.telegraphs.splice(fight.telegraphs.indexOf(mark), 1);
      this.scene.effects?.spawnDeath?.(mark.x, mark.y, mark.color);
      this.scene.cameras.main.shake(140, 0.006, true);
      if (Phaser.Math.Distance.Between(player.x, player.y, mark.x, mark.y) < mark.radius) {
        player.damage(Math.round(boss.damage * 1.2), boss);
      }
      mark.ring.destroy();
    }
  }

  addTelegraph(x, y, boss) {
    const colors = { dragon: 0xff6a1a, abyssLord: 0xc82a4a, frostGiant: 0x8ad8ff, hydra: 0x7ad84a, pharaoh: 0xe8c040, ghostCaptain: 0x8affe0, orcChief: 0xd8483a };
    const color = colors[boss.kind] ?? 0xff4a3a;
    const radius = 66;
    const ring = this.scene.add.circle(x, y, radius, color, 0.18).setStrokeStyle(2, color, 0.9).setDepth(y - 40);
    this.scene.hudCamera?.ignore(ring);
    this.bossFight.telegraphs.push({ x, y, radius, ring, color, ms: 950, total: 950 });
  }

  /** Chamado pela cena quando um inimigo morre. */
  onEnemyDefeated(enemy) {
    this.caveEnemies = this.caveEnemies.filter((entry) => entry !== enemy);
    if (!enemy.isRegionBoss || !this.underground) return;
    const cave = CAVES_BY_ID[this.underground.cave];
    const firstTime = this.bosses[cave.id] === undefined;
    this.bosses[cave.id] = this.scene.timeState?.dayCount ?? 1;
    this.endBossFight();
    if (!this.chests.has(cave.id)) this.placeBossChest(cave, this.underground.room);
    this.scene.dropMonsterChest?.(enemy, 'boss');
    this.scene.coinPickups?.spawn(enemy.x, enemy.y + 10, firstTime ? 120 : 40);
    this.scene.showEpic?.(`${enemy.name.toUpperCase()} DERROTADO`, firstTime ? 'O baú do tesouro se abriu na sala.' : 'Ele voltará em alguns dias.', 4200);
  }

  placeBossChest(cave, room) {
    if (this.features.some((feature) => feature.type === 'chest' && feature.cave?.id === cave.id)) return;
    const exit = this.roomPoint(room, room.plan.exit);
    const x = exit.x + TILE;
    const y = exit.y;
    // Fase 22c: o baú de tesouro do chefe usa o baú pintado (mesmo das coletas e dos monstros), maior.
    const painted = this.scene.textures.exists('harvest-structure-chest');
    const sprite = painted
      ? this.scene.add.image(x, y, 'harvest-structure-chest').setOrigin(0.5, 0.88).setScale(1.6).setDepth(y)
      : this.scene.add.image(x, y, 'biome', 'boss-chest').setOrigin(0.5, 0.85).setDepth(y);
    this.scene.hudCamera?.ignore(sprite);
    this.features.push({ type: 'chest', cave, x, y, sprite, label: 'ABRIR TESOURO' });
  }

  openBossChest(feature) {
    const scene = this.scene;
    if (feature.cave.tower) {
      this.openTowerChest(feature);
      return;
    }
    const rewards = {
      orcChief: { iron: 6, gold: 3, leather: 4, potion: 2 },
      hydra: { moonherb: 6, potion: 3, elixir: 1, ectoplasm: 4 },
      ghostCaptain: { gold: 8, mapPiece: 1, elixir: 1, fish: 4 },
      frostGiant: { crystal: 6, iron: 5, wool: 5, staminaPotion: 2 },
      pharaoh: { gold: 10, book: 1, elixir: 2, fabric: 4 },
      dragon: { magmaCore: 4, gold: 12, titanCore: 1, elixir: 2 },
      abyssLord: { magmaCore: 8, gold: 20, titanCore: 3, elixir: 3 }
    }[feature.cave.boss] ?? { gold: 4 };
    const result = scene.inventory.addBundle(rewards);
    if (Object.keys(result.remaining).length > 0) scene.deathBackpacks.create(feature.x, feature.y, result.remaining);
    scene.economy?.addCoins?.(150);
    scene.campaign?.onGathered?.(result.accepted);
    feature.opened = true;
    this.chests.add(feature.cave.id);
    feature.sprite.setTint(0x777777);
    scene.effects?.spawnHarvest?.(feature.x, feature.y - 10, 0xffd76b);
    scene.audio?.playCollect?.();
    scene.ui.showMessage(`Tesouro de ${feature.cave.name}! +150 moedas e itens raros.`);
    scene.save?.();
  }

  /** Baú do topo da torre: equipamento do nível da região (2 peças), moedas e recursos. */
  openTowerChest(feature) {
    const scene = this.scene;
    const tower = feature.cave;
    const level = REGION_INFO[tower.region].levelRange[1];
    const drops = rollGearDrop({ region: tower.region, level, boss: `tower:${tower.id}` });
    const names = [];
    for (const drop of drops) {
      const item = scene.gear?.add(drop.id, drop.rarity);
      if (!item) {
        scene.ui.showMessage('Sacola de equipamentos cheia! Venda peças (tecla V).');
        continue;
      }
      names.push(`${RARITIES[drop.rarity].name}: ${GEAR_ITEMS[drop.id].name}`);
    }
    const coins = 60 + level * 5;
    scene.economy?.addCoins?.(coins);
    feature.opened = true;
    this.chests.add(tower.id);
    feature.sprite.setTint(0x777777);
    scene.effects?.spawnHarvest?.(feature.x, feature.y - 10, 0xffd76b);
    scene.audio?.playCollect?.();
    if (drops.length) window.dispatchEvent(new CustomEvent('lendas:gear'));
    scene.ui.showMessage(`Baú de ${tower.name}! +${coins} moedas${names.length ? ` • ${names.join(', ')}` : ''}`);
    scene.save?.();
  }

  // ---------- Objetos por bloco ----------

  chunkKey(cx, cy) {
    return `${cx},${cy}`;
  }

  /** Lista do que nasce num bloco (sempre igual: depende só da posição). */
  planChunk(cx, cy) {
    const { cols, rows, terrain } = this.grid;
    const { under } = this.layout;
    const props = [];
    const nodes = [];
    const avoid = this.features.map((feature) => ({ x: feature.x, y: feature.y }));
    const nearAvoid = (x, y, range) => avoid.some((point) => Math.abs(point.x - x) < range && Math.abs(point.y - y) < range);
    for (let row = cy * CHUNK; row < Math.min(rows, (cy + 1) * CHUNK); row += 1) {
      for (let col = cx * CHUNK; col < Math.min(cols, (cx + 1) * CHUNK); col += 1) {
        const cell = row * cols + col;
        const kind = terrain[cell];
        if (kind === T.VALLEY || kind === T.VOID || kind === T.WALL) continue;
        if (kind === T.MURK) {
          // Nenúfares soltos na água parada.
          if (hash(col, row, 231) < 0.22) {
            const big = hash(col, row, 235) < 0.18;
            props.push({ frame: big ? `big-water-lily-${hash(col, row, 236) < 0.5 ? 0 : 1}` : `lily-${hash(col, row, 232) < 0.5 ? 0 : 1}`, x: col * TILE + TILE / 2 + (hash(col, row, 233) - 0.5) * 26, y: row * TILE + TILE / 2 + (hash(col, row, 234) - 0.5) * 26, flat: true });
          } else if (hash(col, row, 237) < 0.08) {
            props.push({ frame: `floating-branch-${hash(col, row, 238) < 0.5 ? 0 : 1}`, x: col * TILE + TILE / 2 + (hash(col, row, 239) - 0.5) * 26, y: row * TILE + TILE / 2 + (hash(col, row, 240) - 0.5) * 26, flat: true });
          }
          continue;
        }
        const x = col * TILE + TILE / 2 + (hash(col, row, 203) - 0.5) * 22;
        const y = row * TILE + TILE / 2 + (hash(col, row, 204) - 0.5) * 22;
        if (nearAvoid(x, y, TILE * 2.4)) continue;
        if (kind === T.CAVE) {
          const room = roomAt(x, y);
          const theme = room ? CAVES_BY_ID[room.cave].theme : 'earth';
          let enclosed = true;
          for (let dy = -1; dy <= 1 && enclosed; dy += 1) for (let dx = -1; dx <= 1; dx += 1) if (terrain[(row + dy) * cols + col + dx] !== T.CAVE) enclosed = false;
          if (enclosed && hash(col, row, 211) < 0.06) {
            const roll = hash(col, row, 212);
            if (roll < 0.6) props.push({ frame: `stalagmite-${theme}`, x, y, solid: [14, 8] });
            else if (roll < 0.82) props.push({ frame: 'bones', x, y });
            else props.push({ frame: 'cave-crystal', x, y, solid: [12, 8] });
          } else if (enclosed && hash(col, row, 213) < 0.02) {
            nodes.push({ id: `n${col}_${row}`, type: pickWeighted(CAVE_NODES[theme], hash(col, row, 214)), x, y });
          }
          continue;
        }
        if (under[cell] >= 0 && kind !== T.BEACH) continue;
        if (under[cell] >= 0 && hash(col, row, 215) > 0.3) continue;
        const table = PROPS[kind];
        if (table && hash(col, row, 201) < table.density) {
          let entry = pick(table.list, hash(col, row, 202));
          // Coqueiros em volta dos oásis.
          if (kind === T.SAND && OASES.some((oasis) => Math.hypot(x - oasis.x, y - oasis.y) < oasis.r + 120)) entry = ['palm-0', 1, [8, 6]];
          props.push({ frame: entry[0], x, y, solid: entry[2] ?? null });
          continue;
        }
        const nodeTable = TERRAIN_NODES[kind];
        if (nodeTable && hash(col, row, 216) < NODE_DENSITY) {
          nodes.push({ id: `n${col}_${row}`, type: pickWeighted(nodeTable, hash(col, row, 217)), x, y });
        }
      }
    }
    // Casas dos vilarejos nomeados (sólidas): entram no bloco onde ficam.
    const chunkLeft = cx * CHUNK * TILE;
    const chunkTop = cy * CHUNK * TILE;
    const chunkRight = chunkLeft + CHUNK * TILE;
    const chunkBottom = chunkTop + CHUNK * TILE;
    for (const village of VILLAGES) {
      for (const [dx, dy] of village.houses) {
        const x = village.x + dx;
        const y = village.y + dy;
        if (x < chunkLeft - 60 || x > chunkRight + 60 || y < chunkTop - 60 || y > chunkBottom + 60) continue;
        props.push({ frame: 'village-house', x, y, solid: [36, 14] });
      }
    }
    // As transições entre regiões são franjas na camada de cima do chão (buildTilemap).
    return { props, nodes };
  }

  activateChunk(cx, cy) {
    const key = this.chunkKey(cx, cy);
    const chunk = this.chunks.get(key) ?? { plan: this.planChunk(cx, cy), objects: [], bodies: [], resources: [] };
    this.chunks.set(key, chunk);
    if (chunk.active) return;
    chunk.active = true;
    const scene = this.scene;
    const created = [];
    for (const prop of chunk.plan.props) {
      const image = scene.add.image(prop.x, prop.y, 'biome', prop.frame).setOrigin(0.5, 0.92).setDepth(prop.flat ? -997 : prop.y);
      image.castsShadow = Boolean(prop.solid);
      created.push(image);
      if (prop.solid) chunk.bodies.push(scene.obstacles.add(prop.x, prop.y - prop.solid[1] / 2, prop.solid[0], prop.solid[1]));
    }
    const day = scene.timeState?.dayCount ?? 1;
    for (const node of chunk.plan.nodes) {
      const harvestedDay = this.harvested[node.id];
      if (harvestedDay !== undefined && day - harvestedDay < NODE_REGROW_DAYS) continue;
      const resource = this.makeNode(node);
      chunk.resources.push(resource);
      scene.world.resources.push(resource);
    }
    scene.hudCamera?.ignore(created);
    scene.shadows?.register(created.filter((image) => image.castsShadow));
    chunk.objects = created;
  }

  makeNode(node) {
    const scene = this.scene;
    const definition = REGION_NODES[node.type];
    const resource = scene.world.makeResource(node.type, node.x, node.y, false, {
      atlas: definition.atlas, frame: definition.frame, definition
    });
    resource.regionId = node.id;
    scene.hudCamera?.ignore([resource.node, resource.glow, resource.hint]);
    return resource;
  }

  deactivateChunk(key) {
    const chunk = this.chunks.get(key);
    if (!chunk?.active) return;
    chunk.active = false;
    this.scene.shadows?.unregister(chunk.objects);
    for (const object of chunk.objects) object.destroy();
    this.scene.obstacles.remove(chunk.bodies);
    for (const resource of chunk.resources) {
      if (!resource.node?.active) continue;
      resource.bob?.stop();
      resource.node.destroy();
      resource.glow.destroy();
      resource.hint.destroy();
    }
    const gone = new Set(chunk.resources);
    this.scene.world.resources = this.scene.world.resources.filter((resource) => !gone.has(resource));
    chunk.objects = [];
    chunk.bodies = [];
    chunk.resources = [];
  }

  /** Coleta de um recurso das regiões: lembra o dia para ele renascer depois. */
  onHarvest(resource) {
    if (!resource?.regionId) return;
    this.harvested[resource.regionId] = this.scene.timeState?.dayCount ?? 1;
    for (const chunk of this.chunks.values()) chunk.resources = chunk.resources.filter((entry) => entry !== resource);
  }

  updateStreaming(force = false) {
    const view = this.scene.cameras.main.worldView;
    const left = Math.floor((view.x - ACTIVE_MARGIN) / (CHUNK * TILE));
    const right = Math.floor((view.right + ACTIVE_MARGIN) / (CHUNK * TILE));
    const top = Math.floor((view.y - ACTIVE_MARGIN) / (CHUNK * TILE));
    const bottom = Math.floor((view.bottom + ACTIVE_MARGIN) / (CHUNK * TILE));
    const signature = `${left},${right},${top},${bottom}`;
    if (!force && signature === this.lastSignature) return;
    this.lastSignature = signature;
    const wanted = new Set();
    for (let cy = Math.max(0, top); cy <= bottom; cy += 1) {
      for (let cx = Math.max(0, left); cx <= right; cx += 1) {
        if (cx * CHUNK >= this.grid.cols || cy * CHUNK >= this.grid.rows) continue;
        wanted.add(this.chunkKey(cx, cy));
        this.activateChunk(cx, cy);
      }
    }
    for (const [key, chunk] of this.chunks) if (chunk.active && !wanted.has(key)) this.deactivateChunk(key);
  }

  // ---------- Regiões: nome, descoberta e perigos ----------

  /** Região de um ponto (dentro da caverna, a região dela). */
  regionOf(x, y) {
    if (y >= OVERWORLD.height) {
      const room = roomAt(x, y);
      return room ? CAVES_BY_ID[room.cave].region : 'caverna';
    }
    return regionAt(x, y);
  }

  currentRegion() {
    if (this.underground) return 'caverna';
    const player = this.scene.player;
    return regionAt(player.x, player.y);
  }

  updateRegion(delta) {
    this.regionTimer -= delta;
    if (this.regionTimer > 0) return;
    this.regionTimer = 400;
    const key = this.currentRegion();
    if (key !== this.region) {
      this.region = key;
      const info = REGION_INFO[key];
      if (key !== 'caverna' && key !== 'mar') {
        if (!this.discovered.has(key)) {
          this.discovered.add(key);
          this.scene.showEpic?.(info.name.toUpperCase(), `${info.banner} Nível sugerido: ${info.levels}.`, 4200);
          this.scene.achievements?.checkAchievements(); // conquistas de região descoberta
          // Descoberta vale XP e entra na aba "Descobertas" do diário (L).
          this.scene.grantExperience?.(30, true);
          this.scene.campaign?.ui?.refresh?.();
          this.scene.save?.();
        } else this.scene.ui.showMessage(`— ${info.name} —`);
        // Aviso de região perigosa: nível sugerido muito acima do nível do jogador.
        const playerLevel = this.scene.progression?.level ?? 1;
        const minLevel = info.levelRange?.[0] ?? 0;
        if (minLevel >= playerLevel + 6) {
          this.scene.showEpic?.('⚠️ REGIÃO PERIGOSA', `${info.name}: nível sugerido ${info.levels}, você é nível ${playerLevel}. Cuidado!`, 4200);
          this.scene.audio?.playRoar?.();
        }
      }
    }
    const hazard = REGION_INFO[key]?.hazard;
    if (!hazard || this.scene.campaign?.state?.flags?.[hazard.flag]) {
      this.hazardTimer = 0;
      return;
    }
    this.hazardTimer += 400;
    if (this.hazardTimer < 2000) return;
    this.hazardTimer = 0;
    // O perigo enfraquece, mas não mata sozinho: o jogador sempre consegue voltar.
    const player = this.scene.player;
    const floor = Math.ceil(player.maxHealth * 0.15);
    if (player.health > floor) {
      player.health = Math.max(floor, player.health - hazard.damage);
      this.scene.onPlayerDamaged?.();
    }
    if (this.scene.time.now - this.hazardMessageAt > 6000) {
      this.hazardMessageAt = this.scene.time.now;
      this.scene.ui.showMessage(hazard.message);
    }
  }

  updateHints() {
    const player = this.scene.player;
    const near = this.nearestFeature(player.x, player.y);
    for (const feature of this.features) {
      const label = feature.sprite?.hintLabel;
      if (!label) continue;
      label.setVisible(Phaser.Math.Distance.Between(player.x, player.y, feature.x, feature.y) < 220);
    }
    this.nearLabel = near?.label ?? null;
  }

  /** Luzes das cavernas (escadas, cristais, baú) e da lava, para a escuridão da noite/caverna. */
  getLightSources() {
    const view = this.scene.cameras.main.worldView;
    const lights = [];
    const visible = (x, y) => x > view.x - 120 && x < view.right + 120 && y > view.y - 120 && y < view.bottom + 120;
    // O jogador carrega uma tocha: halo quente própria (entra primeiro para não ser cortado pelo limite).
    const player = this.scene.player;
    if (player) lights.push({ x: player.x, y: player.y - 6, radius: 120, kind: 'torch' });
    for (const feature of this.features) {
      if (feature.type === 'dock' || !visible(feature.x, feature.y)) continue;
      // Entrada de caverna: braseiro na boca (halo quente que guia o jogador à noite).
      if (feature.type === 'cave') lights.push({ x: feature.x, y: feature.y - 6, radius: 84, kind: 'torch' });
      else lights.push({ x: feature.x, y: feature.y, radius: 70, kind: feature.type === 'chest' ? 'lamp' : null });
    }
    for (const chunk of this.chunks.values()) {
      if (!chunk.active) continue;
      for (const prop of chunk.plan.props) {
        if (!GLOWING_PROPS.has(prop.frame) && !prop.frame.startsWith('stalagmite')) continue;
        if (!visible(prop.x, prop.y)) continue;
        lights.push({ x: prop.x, y: prop.y - 10, radius: prop.frame.startsWith('stalagmite') ? 34 : prop.frame === 'ice-crystal' || prop.frame === 'cave-crystal' ? 74 : 58, kind: PROP_LIGHT_KIND[prop.frame] ?? null });
      }
    }
    return lights.slice(0, 24);
  }

  /** Lodo deixa mais lento; estrada de terra batida deixa 30% mais rápido. */
  speedFactorAt(x, y) {
    const terrain = this.terrainAtPoint(x, y);
    const mud = terrain === T.MURK ? 0.62 : 1;
    return mud * (roadAt(x, y) ? 1.3 : 1);
  }

  update(delta) {
    this.animTimer -= delta;
    if (this.animTimer <= 0) {
      this.animTimer = 230;
      this.animFrame = (this.animFrame + 1) % 4;
      this.drawUnderFrame(this.animFrame);
    }
    this.streamTimer -= delta;
    if (this.streamTimer <= 0) {
      this.streamTimer = 250;
      this.updateStreaming();
      this.updateHints();
    }
    this.updateRegion(delta);
    this.updateTravelers(delta);
    this.updateBossFight(delta);
  }

  /** Viajantes andam pelas estradas de ida e volta, mudando de direção nas pontas. */
  updateTravelers(delta) {
    if (!this.travelers?.length) return;
    const seconds = delta / 1000;
    for (const traveler of this.travelers) {
      if (!traveler.sprite?.active) continue;
      traveler.t += traveler.dir * (traveler.speed * seconds) / 2400;
      if (traveler.t >= 1) { traveler.t = 1; traveler.dir = -1; }
      if (traveler.t <= 0) { traveler.t = 0; traveler.dir = 1; }
      const point = pointOnRoad(traveler.road, traveler.t);
      traveler.sprite.setPosition(point.x, point.y).setDepth(point.y);
      // Sombra de contato acompanha o viajante.
      traveler.shadow?.setPosition(point.x, point.y + 4).setDepth(point.y - 1);
    }
  }

  serialize() {
    return {
      harvested: this.harvested,
      discovered: [...this.discovered],
      bosses: this.bosses,
      chests: [...this.chests],
      chestDays: this.chestDays,
      travelerGifts: [...this.travelerGifts]
    };
  }
}

export { FULL_WORLD };
