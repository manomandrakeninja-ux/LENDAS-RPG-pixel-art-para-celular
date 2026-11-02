import test from 'node:test';
import assert from 'node:assert/strict';
import { nextLockTarget, lockDistance } from '../src/data/lockOn.js';
import { ACTIVE_SKILLS, ACTIVE_SKILLS_BY_ID, ActiveSkills, slotForDigit } from '../src/data/activeSkills.js';
import {
  ROAD_ENCOUNTER_DEFS, shouldFire, pickDef, nearestRoad, spawnPointOnRoad, rewardsFor
} from '../src/data/roadEncounters.js';
import {
  CURIOSITIES, CURIOSITIES_BY_ID, DiscoveryTracker, curiosityAt, rumourText, milestoneReward
} from '../src/data/curiosities.js';
import { WAYLIGHTS, WAYLIGHTS_BY_REGION, WaylightTracker, WAYLIGHT_BONUS_XP } from '../src/data/waylights.js';
import { CAMP_INCIDENTS_BY_ID, CampIncidentState, rollIncident, incidentReward } from '../src/data/campIncidents.js';
import { FISH_STATES, nextWaitMs, rollCatch, FISH_BITE_WINDOW_MS } from '../src/data/fishing.js';
import { collectWorldMapMarkers, WORLD_MAP_MARKER_TYPES } from '../src/game/worldMapMarkers.js';
import { BLOCKING, terrainAt } from '../src/data/worldRegions.js';
import { WORLD } from '../src/game/config.js';
import { BOSS_CONFIG } from '../src/data/boss.js';

const CAMP = WORLD.camp;

// ---------- lock-on ----------

test('lock-on escolhe o mais próximo, cicla e respeita alcance/vivos', () => {
  const a = { x: 100, y: 0, active: true, dead: false };
  const b = { x: 300, y: 0, active: true, dead: false };
  const c = { x: 50, y: 0, active: false, dead: false };
  const d = { x: 20, y: 0, active: true, dead: true };
  assert.equal(nextLockTarget([a, b, c, d], null, 0, 0, 520), a);
  assert.equal(nextLockTarget([a, b], a, 0, 0, 520), b); // cicla
  assert.equal(nextLockTarget([a, b], b, 0, 0, 520), a); // volta
  assert.equal(nextLockTarget([b], null, 0, 0, 200), null); // fora de alcance
  assert.equal(nextLockTarget([], null, 0, 0, 520), null);
  assert.equal(lockDistance(a, 0, 0), 100);
  assert.equal(lockDistance(null, 0, 0), Infinity);
});

// ---------- skills ativas ----------

test('skills 6-9: mapeamento de tecla, desbloqueio por nível, cooldown e vigor', () => {
  assert.equal(slotForDigit('6'), 0);
  assert.equal(slotForDigit('9'), 3);
  assert.equal(slotForDigit('5'), -1);
  assert.equal(ACTIVE_SKILLS.length, 4);
  const s = new ActiveSkills();
  assert.equal(s.unlocked('fireball', 2), false);
  assert.equal(s.unlocked('fireball', 3), true);
  assert.equal(s.canCast('fireball', { level: 3, stamina: 100, now: 0 }).ok, true);
  assert.equal(s.canCast('fireball', { level: 3, stamina: 5, now: 0 }).ok, false); // vigor
  assert.ok(s.cast('fireball', 1000));
  assert.equal(s.canCast('fireball', { level: 3, stamina: 100, now: 2000 }).ok, false); // cooldown
  assert.equal(s.canCast('fireball', { level: 3, stamina: 100, now: 1000 + ACTIVE_SKILLS_BY_ID.fireball.cooldownMs }).ok, true);
  assert.ok(s.remainingMs('fireball', 1500) > 0);
  assert.equal(s.remainingMs('ward', 1500), 0);
});

// ---------- encontros de estrada ----------

test('encontro de estrada só dispara na estrada, longe de POI/acampamento, após o cooldown', () => {
  const base = { onRoad: true, nearFeature: false, nearCamp: false, underground: false, raidActive: false, elapsedMs: 999999, nextInMs: 1000, regionLit: false };
  assert.equal(shouldFire(base), true);
  assert.equal(shouldFire({ ...base, onRoad: false }), false);
  assert.equal(shouldFire({ ...base, nearFeature: true }), false);
  assert.equal(shouldFire({ ...base, nearCamp: true }), false);
  assert.equal(shouldFire({ ...base, underground: true }), false);
  assert.equal(shouldFire({ ...base, raidActive: true }), false);
  assert.equal(shouldFire({ ...base, elapsedMs: 500 }), false);
  // Farol aceso: metade das vezes cancela (rng < 0.5 cancela) — usa rng injetado para determinismo.
  assert.equal(shouldFire({ ...base, regionLit: true, rng: () => 0.1 }), false);
  assert.equal(shouldFire({ ...base, regionLit: true, rng: () => 0.9 }), true);
});

test('pickDef respeita nível mínimo e nearestRoad acha a estrada do acampamento', () => {
  const def = pickDef(1, () => 0.99); // peso maior é ambush, mas nível 1 exclui guardedChest (min 3)
  assert.ok(ROAD_ENCOUNTER_DEFS.includes(def));
  assert.notEqual(def.id, 'guardedChest');
  const near = nearestRoad(CAMP.x + 10, CAMP.y + 10);
  assert.ok(near && near.road && typeof near.t === 'number');
  const point = spawnPointOnRoad(near.road, near.t);
  assert.ok(Number.isFinite(point.x) && Number.isFinite(point.y));
  const r = rewardsFor('wounded', 5, () => 0.5);
  assert.ok(r.coins > 0 && r.xp > 0 && r.needsFood);
  const g = rewardsFor('guardedChest', 5, () => 0.5);
  assert.equal(g.guardians, 2);
  const a = rewardsFor('ambush', 12);
  assert.ok(a.enemies >= 2);
});

// ---------- curiosidades ----------

test('curiosidades: 21 pontos em terreno andável, descoberta, rumores e marcos', () => {
  assert.equal(CURIOSITIES.length, 21);
  for (const c of CURIOSITIES) {
    assert.ok(!BLOCKING.has(terrainAt(c.x, c.y)), `${c.id} fora de terreno bloqueante`);
    assert.ok(CURIOSITIES_BY_ID[c.id] === c);
    assert.ok(c.reward.coins > 0 && c.reward.xp > 0);
  }
  const c = CURIOSITIES[0];
  assert.equal(curiosityAt(c.x + 5, c.y + 5), c);
  assert.equal(curiosityAt(c.x + 500, c.y), null);
  assert.equal(curiosityAt(c.x + 5, c.y + 5, 70, [c.id]), null);
  const rumor = rumourText(0, 0, c);
  assert.match(rumor, /\d+ m para o/);
  assert.equal(milestoneReward(4), null);
  assert.equal(milestoneReward(5).coins, 50);
  assert.equal(milestoneReward(20).label, '20 curiosidades!');
  const t = new DiscoveryTracker();
  const first = t.discover(c.id);
  assert.equal(first.first, true);
  assert.equal(t.discover(c.id).first, false);
  assert.equal(t.count, 1);
  t.rumour(CURIOSITIES[1].id);
  const restored = new DiscoveryTracker(t.serialize());
  assert.ok(restored.discovered.has(c.id) && restored.rumoured.has(CURIOSITIES[1].id));
  // id desconhecido é ignorado no save
  const weird = new DiscoveryTracker({ discovered: ['nao-existe'], rumoured: ['nao-existe'] });
  assert.equal(weird.count, 0);
});

// ---------- faróis (waylights) ----------

test('waylights: um por região de superfície, bônus de XP e save', () => {
  assert.equal(WAYLIGHTS.length, 7);
  for (const w of WAYLIGHTS) {
    assert.ok(WAYLIGHTS_BY_REGION[w.region] === w);
    assert.ok(!BLOCKING.has(terrainAt(w.x, w.y)), `${w.region} em terreno andável`);
    assert.ok(w.cost.wood > 0 && w.cost.stone > 0);
  }
  const t = new WaylightTracker();
  assert.equal(t.xpMultiplier('vale'), 1);
  assert.ok(t.light('vale'));
  assert.equal(t.isLit('vale'), true);
  assert.equal(t.light('vale'), false); // já aceso
  assert.ok(Math.abs(t.xpMultiplier('vale') - (1 + WAYLIGHT_BONUS_XP)) < 1e-9);
  assert.equal(t.encounterMultiplier('vale'), 0.5);
  assert.equal(t.count, 1);
  assert.equal(t.total, 7);
  const restored = new WaylightTracker(t.serialize());
  assert.equal(restored.isLit('vale'), true);
  assert.equal(new WaylightTracker({ lit: ['mar'] }).count, 0); // região inválida ignorada
});

// ---------- incidentes no acampamento ----------

test('incidentes: não no dia 1, sorteio por dia, estado e recompensa', () => {
  assert.equal(rollIncident(1, () => 0), null);
  assert.equal(rollIncident(5, () => 0.99), null); // rng acima da chance
  const r = rollIncident(5, () => 0, ['house', 'forge']);
  assert.ok(r && CAMP_INCIDENTS_BY_ID[r.def.id]);
  const fire = rollIncident(5, () => 0, ['house']); // rng 0 pega o 1º do pool elegível... filtra por minDay
  assert.ok(fire);
  const st = new CampIncidentState();
  assert.equal(st.active, null);
  assert.ok(st.start('wolf', null, 3));
  assert.equal(st.active.id, 'wolf');
  const restored = new CampIncidentState(st.serialize());
  assert.equal(restored.active.id, 'wolf');
  st.clear();
  assert.equal(st.serialize().active, null);
  assert.equal(new CampIncidentState({ active: { id: 'xxx' } }).active, null);
  const reward = incidentReward('fire', () => 0.5);
  assert.ok(reward.coins > 0 && reward.xp > 0);
});

// ---------- pesca ----------

test('pesca: espera dentro da faixa, janela de fisgada e saque', () => {
  for (let i = 0; i < 50; i += 1) {
    const w = nextWaitMs(Math.random);
    assert.ok(w >= 2000 && w <= 6000);
  }
  assert.equal(FISH_BITE_WINDOW_MS, 1200);
  const c1 = rollCatch(() => 0.5);
  assert.equal(c1.fish, 1);
  assert.equal(c1.coins, 0);
  const c2 = rollCatch(() => 0.1); // <0.2 → 2 peixes; <0.1 → bônus (0.1 não é < 0.1)
  assert.equal(c2.fish, 2);
  const c3 = rollCatch(() => 0.05);
  assert.equal(c3.coins, 5);
  assert.deepEqual(FISH_STATES, ['idle', 'waiting', 'bite']);
});

// ---------- marcadores de mapa (faróis/curiosidades) ----------

test('mapa-múndi inclui faróis e curiosidades rumoradas/descobertas', () => {
  const markers = collectWorldMapMarkers({
    structures: [],
    enemies: [],
    player: { x: 1, y: 2 },
    waylights: [{ x: 10, y: 20, lit: true }, { x: 30, y: 40, lit: false }],
    curiosities: [{ x: 50, y: 60, found: true, rumoured: false }, { x: 70, y: 80, found: false, rumoured: true }, { x: 90, y: 100, found: false, rumoured: false }]
  });
  assert.equal(markers.waylights.length, 2);
  assert.equal(markers.waylights[0].type, WORLD_MAP_MARKER_TYPES.waylight);
  assert.equal(markers.waylights[0].lit, true);
  // só entra no mapa quem foi descoberta ou tem rumor
  assert.equal(markers.curiosities.length, 2);
  assert.equal(markers.curiosities[0].found, true);
  assert.equal(markers.curiosities[1].found, false);
});

// ---------- ponto fraco do boss ----------

test('boss tem ponto fraco configurado (dano dobrado no círculo)', () => {
  const wp = BOSS_CONFIG.weakPoint;
  assert.ok(wp && wp.multiplier > 1 && wp.radius > 0);
  assert.ok(Number.isFinite(wp.dx) && Number.isFinite(wp.dy));
});
