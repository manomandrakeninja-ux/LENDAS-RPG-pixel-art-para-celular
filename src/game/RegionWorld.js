import Phaser from 'phaser';
import {
  BLOCKING, BOAT_FARE, CAVES, CAVES_BY_ID, CAVE_NODES, DOCKS, FULL_WORLD, NODE_REGROW_DAYS, OASES, OVERWORLD,
  REGION_INFO, REGION_NODES, ROOM_COLS, T, TERRAIN_NODES, TILE, buildTerrainGrid, caveLevelRange, fractal, dockPosition, regionAt, roomAt
} from '../data/worldRegions.js';
import { layoutTiles, transitionCells, underName } from '../data/terrainLayout.js';
import { hash } from '../art/pixel.js';
import { ENEMY_TYPES } from '../data/enemies.js';
import { levelInRange } from '../data/enemyScaling.js';
import { WORLD } from './config.js';
import { drawNpc } from '../art/person.js';
import { SPEAKERS } from '../data/story.js';

// Mundo grande: chão em tilemap (o Phaser só desenha o que a câmera vê), água e lava
// animadas numa camada de baixo, e objetos/recursos montados por blocos perto do jogador.

const CHUNK = 16;
const GRASS_GID = 1;
const TERRAIN_GID = 100;
const UNDER_GID = 1000;
// Camada de baixo: mar (bloqueia), mar sob a borda, lava (bloqueia), lava sob a borda, lodo e gelo.
const UNDER_SLOTS = [[T.SEA, true], [T.SEA, false], [T.LAVA, true], [T.LAVA, false], [T.MURK, false], [T.ICE, false]];
const ACTIVE_MARGIN = 420;
const INTERACT_RANGE = 70;

// Objetos por terreno: [frame, peso, sólido?]. Sólido = base que bloqueia (largura, altura).
const PROPS = {
  [T.FOREST]: { density: 0.2, list: [['ancient-oak-0', 1, [18, 10]], ['ancient-oak-1', 1, [18, 10]], ['mossy-pine-0', 2, [10, 7]], ['mossy-pine-1', 2, [10, 7]], ['giant-mushroom', 0.6, [10, 6]], ['fern', 3], ['fallen-log', 0.6, [40, 10]], ['mossy-rock', 1, [24, 10]]] },
  [T.SWAMP]: { density: 0.13, list: [['willow', 1.4, [14, 9]], ['dead-tree', 1.4, [10, 7]], ['reeds', 3], ['swamp-shroom', 1.2], ['bog-log', 0.5, [40, 10]], ['mossy-rock', 0.5, [24, 10]]] },
  [T.SNOW]: { density: 0.12, list: [['snow-pine-0', 2, [10, 7]], ['snow-pine-1', 2, [10, 7]], ['ice-crystal', 1, [16, 8]], ['snow-rock', 1.4, [28, 10]], ['frozen-bush', 1.4]] },
  [T.SAND]: { density: 0.05, list: [['cactus', 2, [12, 7]], ['cactus-small', 2, [10, 6]], ['desert-rock', 1, [40, 12]], ['skull', 0.7], ['dry-bush', 2], ['ruin-pillar', 0.3, [18, 8]], ['ruin-pillar-broken', 0.4, [18, 8]]] },
  [T.DUNE]: { density: 0.018, list: [['dry-bush', 1], ['skull', 0.4], ['cactus-small', 0.5, [10, 6]]] },
  [T.BEACH]: { density: 0.04, list: [['palm-0', 1.5, [8, 6]], ['palm-1', 1.5, [8, 6]], ['sea-rock', 1, [28, 10]], ['big-flower', 0.3]] },
  [T.JUNGLE]: { density: 0.13, list: [['palm-0', 1.5, [8, 6]], ['palm-1', 1.5, [8, 6]], ['tropical-bush', 3], ['big-flower', 2], ['sea-rock', 0.4, [28, 10]]] },
  [T.ASH]: { density: 0.09, list: [['charred-tree', 2, [10, 7]], ['obsidian', 2, [28, 12]], ['lava-vent', 1], ['fire-crystal', 0.8, [14, 8]], ['ash-bush', 2]] }
};
const NODE_DENSITY = 0.011;
// Objetos que brilham no escuro (iluminam a noite e as cavernas).
const GLOWING_PROPS = new Set(['cave-crystal', 'lava-vent', 'fire-crystal', 'ice-crystal', 'swamp-shroom']);

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
    this.underTexture = scene.textures.createCanvas('under-tiles', UNDER_SLOTS.length * TILE, TILE);
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
          this.underLayer.putTileAt(UNDER_GID + Math.max(0, slot), col, row, false);
        }
      }
    }
    // Variação suave de luz entre ladrilhos (quebra a repetição do padrão).
    this.groundLayer.forEachTile((tile) => {
      if (tile.index < TERRAIN_GID) return;
      const n = fractal(tile.x / 6, tile.y / 6, 77, 2);
      const v = Math.round(255 * (0.86 + n * 0.14));
      tile.tint = (v << 16) | (v << 8) | Math.min(255, v + 4);
    });
    this.groundLayer.setCollision([...wallIndices]);
    this.underLayer.setCollision([UNDER_GID + 0, UNDER_GID + 2]);
    // Paredes das cavernas ganham a cor do tema de cada caverna.
    for (const room of this.grid.rooms) {
      const tint = { ice: 0xb8d8ff, fire: 0xffb8a0, tomb: 0xffe0b0, swamp: 0xc8e0b0, sea: 0xc0d0e0 }[CAVES_BY_ID[room.cave].theme];
      if (!tint) continue;
      this.groundLayer.forEachTile((tile) => { tile.tint = tint; }, null, room.col0, room.row0, ROOM_COLS, room.plan.grid.length / ROOM_COLS);
    }
    scene.hudCamera?.ignore([this.underLayer, this.groundLayer]);
  }

  drawUnderFrame(frame) {
    const source = this.scene.textures.get('terrain-tiles').getSourceImage();
    const context = this.underTexture.getContext();
    const columns = this.scene.cache.json.get('terrain-index')?.columns ?? 16;
    UNDER_SLOTS.forEach(([kind], slot) => {
      const position = this.tileIndex?.[underName(kind, kind === T.ICE ? 0 : frame)] ?? this.scene.cache.json.get('terrain-index')?.index?.[underName(kind, frame)];
      if (position === undefined) return;
      context.drawImage(source, (position % columns) * TILE, Math.floor(position / columns) * TILE, TILE, TILE, slot * TILE, 0, TILE, TILE);
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
    if (!scene.textures.exists('npc-barqueiro-0')) {
      const pixels = drawNpc(SPEAKERS.barqueiro.palette, 0);
      const texture = scene.textures.createCanvas('npc-barqueiro-0', pixels.width, pixels.height);
      texture.getContext().putImageData(new ImageData(pixels.data, pixels.width, pixels.height), 0, 0);
      texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      texture.refresh();
    }
    for (const cave of CAVES) {
      const { x, y } = cave.entrance;
      const sprite = scene.add.image(x, y, 'biome', `cave-${cave.theme}`).setOrigin(0.5, 0.92).setDepth(y);
      this.features.push({ type: 'cave', cave, x, y: y + 4, sprite, label: `ENTRAR • ${cave.name}` });
      this.addHint(sprite, x, y - 82, cave.name);
    }
    for (const dock of DOCKS) {
      const position = dockPosition(dock);
      const pier = scene.add.image(position.x, position.y + 30, 'biome', 'pier').setDepth(position.y - 20);
      const boat = scene.add.image(position.x + 6, position.boatY, 'biome', 'boat').setDepth(position.boatY + 30);
      scene.tweens.add({ targets: boat, y: position.boatY + 3, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      const captain = scene.add.image(position.x - 30, position.y - 4, 'npc-barqueiro-0').setOrigin(0.5, 0.68).setDepth(position.y + 26);
      scene.tweens.add({ targets: captain, y: position.y - 5, duration: 900, yoyo: true, repeat: -1 });
      this.features.push({ type: 'dock', dock, x: position.x - 12, y: position.y, sprite: captain, label: `BARCO • ${dock.name}` });
      this.addHint(captain, position.x - 30, position.y - 40, dock.name);
      scene.hudCamera?.ignore([pier, boat, captain]);
    }
    // Escadas e baús das salas das cavernas.
    for (const room of this.grid.rooms) {
      const cave = CAVES_BY_ID[room.cave];
      const last = room.floor === cave.floors - 1;
      const entry = this.roomPoint(room, room.plan.entry);
      const exit = this.roomPoint(room, room.plan.exit);
      const up = scene.add.image(entry.x, entry.y, 'biome', 'stairs-up').setDepth(entry.y - 30);
      this.features.push({ type: 'up', room, cave, x: entry.x, y: entry.y, sprite: up, label: room.floor === 0 ? 'SAIR DA CAVERNA' : 'SUBIR' });
      scene.hudCamera?.ignore(up);
      if (!last) {
        const down = scene.add.image(exit.x, exit.y, 'biome', 'stairs-down').setDepth(exit.y - 30);
        this.features.push({ type: 'down', room, cave, x: exit.x, y: exit.y, sprite: down, label: 'DESCER' });
        scene.hudCamera?.ignore(down);
      }
    }
  }

  addHint(target, x, y, text) {
    const label = this.scene.add.text(x, y, text, {
      fontFamily: 'Press Start 2P', fontSize: '7px', color: '#fff3cf',
      backgroundColor: '#1d1712cc', padding: { x: 4, y: 3 }
    }).setOrigin(0.5).setDepth(9000).setVisible(false);
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
      if (feature.type === 'chest' && feature.opened) continue;
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
    else if (feature.type === 'chest') this.openBossChest(feature);
    return true;
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
    this.teleport(point.x + offset, point.y, () => {
      this.populateRoom(room, cave);
      this.scene.ui.showMessage(`${cave.name} • andar ${floor + 1} de ${cave.floors}`);
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
    if (last) {
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
  }

  spawnCaveEnemy(kind, x, y, { elite = false, isNight = false, boss = false } = {}) {
    const scene = this.scene;
    const EnemyClass = scene.enemyDirector?.EnemyClass;
    if (!EnemyClass) return null;
    const level = levelInRange(ENEMY_TYPES[kind], caveLevelRange(CAVES_BY_ID[this.underground?.cave]));
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
    if (this.features.some((feature) => feature.type === 'chest' && feature.cave.id === cave.id)) return;
    const exit = this.roomPoint(room, room.plan.exit);
    const x = exit.x + TILE;
    const y = exit.y;
    const sprite = this.scene.add.image(x, y, 'biome', 'boss-chest').setOrigin(0.5, 0.85).setDepth(y);
    this.scene.hudCamera?.ignore(sprite);
    this.features.push({ type: 'chest', cave, x, y, sprite, label: 'ABRIR TESOURO' });
  }

  openBossChest(feature) {
    const scene = this.scene;
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
          if (hash(col, row, 231) < 0.22) props.push({ frame: `lily-${hash(col, row, 232) < 0.5 ? 0 : 1}`, x: col * TILE + TILE / 2 + (hash(col, row, 233) - 0.5) * 26, y: row * TILE + TILE / 2 + (hash(col, row, 234) - 0.5) * 26, flat: true });
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
    // Manchas de transição entre regiões (neve no mato, areia na grama...).
    const blobs = [];
    for (const cell of this.transitions(cx, cy)) {
      const shape = Math.floor(hash(cell.col, cell.row, 221) * 3);
      const bx = (cell.col + 0.5 + cell.dx * 0.5) * TILE + (hash(cell.col, cell.row, 222) - 0.5) * 30;
      const by = (cell.row + 0.5 + cell.dy * 0.5) * TILE + (hash(cell.col, cell.row, 223) - 0.5) * 24;
      const first = hash(cell.col, cell.row, 224) < 0.5;
      blobs.push({ frame: `blob-${first ? cell.kind : cell.other}-${shape}`, x: bx, y: by });
    }
    return { props, nodes, blobs };
  }

  transitions(cx, cy) {
    if (!this.transitionIndex) {
      this.transitionIndex = new Map();
      for (const cell of transitionCells(this.grid)) {
        // Uma mancha a cada 2 quadrados da fronteira já basta.
        if ((cell.col + cell.row) % 2) continue;
        const key = this.chunkKey(Math.floor(cell.col / CHUNK), Math.floor(cell.row / CHUNK));
        if (!this.transitionIndex.has(key)) this.transitionIndex.set(key, []);
        this.transitionIndex.get(key).push(cell);
      }
    }
    return this.transitionIndex.get(this.chunkKey(cx, cy)) ?? [];
  }

  activateChunk(cx, cy) {
    const key = this.chunkKey(cx, cy);
    const chunk = this.chunks.get(key) ?? { plan: this.planChunk(cx, cy), objects: [], bodies: [], resources: [] };
    this.chunks.set(key, chunk);
    if (chunk.active) return;
    chunk.active = true;
    const scene = this.scene;
    const created = [];
    for (const blob of chunk.plan.blobs) {
      created.push(scene.add.image(blob.x, blob.y, 'biome', blob.frame).setDepth(-999));
    }
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
          this.scene.save?.();
        } else this.scene.ui.showMessage(`— ${info.name} —`);
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
    for (const feature of this.features) {
      if (feature.type !== 'cave' && feature.type !== 'dock' && visible(feature.x, feature.y)) lights.push({ x: feature.x, y: feature.y, radius: 70 });
    }
    for (const chunk of this.chunks.values()) {
      if (!chunk.active) continue;
      for (const prop of chunk.plan.props) {
        if (!GLOWING_PROPS.has(prop.frame) && !prop.frame.startsWith('stalagmite')) continue;
        if (!visible(prop.x, prop.y)) continue;
        lights.push({ x: prop.x, y: prop.y - 10, radius: prop.frame.startsWith('stalagmite') ? 34 : 58 });
      }
    }
    return lights.slice(0, 18);
  }

  /** Lodo deixa mais lento; gelo e o resto, velocidade normal. */
  speedFactorAt(x, y) {
    const terrain = this.terrainAtPoint(x, y);
    return terrain === T.MURK ? 0.62 : 1;
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
    this.updateBossFight(delta);
  }

  serialize() {
    return {
      harvested: this.harvested,
      discovered: [...this.discovered],
      bosses: this.bosses,
      chests: [...this.chests]
    };
  }
}

export { FULL_WORLD };
