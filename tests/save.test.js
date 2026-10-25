import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LEGACY_SAVE_KEY_V2,
  loadSaveDetailed,
  migrateSave,
  migrateV1ToV2,
  SAVE_KEY_V2,
  SAVE_VERSION
} from '../src/game/save.js';

function withFakeStorage(initial, run) {
  const store = new Map(Object.entries(initial));
  const previous = globalThis.localStorage;
  globalThis.localStorage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key)
  };
  try {
    return run(store);
  } finally {
    if (previous === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = previous;
  }
}

test('save from the old Brumavale name is loaded and copied to the LENDAS key', () => {
  const old = JSON.stringify({ version: 2, time: { cycleTime: 50, dayCount: 9 }, inventory: { items: { wood: 3 } } });
  withFakeStorage({ [LEGACY_SAVE_KEY_V2]: old }, (store) => {
    const result = loadSaveDetailed();
    assert.equal(result.data.time.dayCount, 9);
    assert.equal(result.data.inventory.items.wood, 3);
    assert.equal(store.get(SAVE_KEY_V2), old);
    assert.equal(store.get(LEGACY_SAVE_KEY_V2), old, 'o save antigo fica guardado como cópia de segurança');
  });
});

test('the LENDAS save wins over the old Brumavale save', () => {
  withFakeStorage({
    [LEGACY_SAVE_KEY_V2]: JSON.stringify({ version: 2, time: { dayCount: 2 } }),
    [SAVE_KEY_V2]: JSON.stringify({ version: 2, time: { dayCount: 15 } })
  }, () => {
    assert.equal(loadSaveDetailed().data.time.dayCount, 15);
  });
});

test('save v1 migrates without losing inventory, player or camp progress', () => {
  const legacy = {
    inventory: { maxSlots: 8, items: { wood: 4, stone: 2 } },
    player: { health: 73, maxHealth: 100, attack: 16, defense: 2 },
    camp: { levels: { forge: 1, farm: 0, store: 2 }, questKills: 4, questClaimed: false },
    dayTime: 8 / 24
  };

  const migrated = migrateV1ToV2(legacy);
  assert.equal(migrated.version, SAVE_VERSION);
  assert.deepEqual(migrated.inventory, legacy.inventory);
  assert.deepEqual(migrated.player, legacy.player);
  assert.deepEqual(migrated.camp, legacy.camp);
  assert.equal(migrated.time.dayCount, 1);
  assert.ok(Math.abs(migrated.time.cycleTime - 40) < 0.001);
  assert.deepEqual(migrated.harvestStructures, []);
});

test('save v2 remains canonical and adds missing optional collections', () => {
  const migrated = migrateSave({
    version: 2,
    time: { cycleTime: 123.5, dayCount: 7 },
    inventory: { maxSlots: 6, items: {} },
    player: { health: 100 },
    camp: { levels: {} }
  });

  assert.equal(migrated.time.cycleTime, 123.5);
  assert.equal(migrated.time.dayCount, 7);
  assert.equal(migrated.inventory.maxSlots, 12);
  assert.equal(migrated.inventory.capacityVersion, 3);
  assert.deepEqual(migrated.deathBackpacks, []);
  assert.deepEqual(migrated.harvestStructures, []);
  assert.deepEqual(migrated.farm, { plots: [], animals: {} });
  assert.deepEqual(migrated.market, { day: 1, offers: [] });
});

test('save v2 preserves harvested structure state', () => {
  const migrated = migrateSave({
    version: 2,
    time: { cycleTime: 20, dayCount: 3 },
    harvestStructures: [{ id: 'tree-0', type: 'tree', available: false, readyDay: 5 }]
  });

  assert.equal(migrated.harvestStructures.length, 1);
  assert.equal(migrated.harvestStructures[0].readyDay, 5);
});

test('save v2 preserves farm, market, crafting and storage state', () => {
  const migrated = migrateSave({
    version: 2,
    time: { cycleTime: 20, dayCount: 3 },
    camp: {
      buildingLevelsVersion: 2,
      levels: { forge: 2, farm: 3, house: 2, market: 1 },
      crafted: { stonePickaxe: true, ironSword: true },
      storage: { iron: 4, seeds: 2 }
    },
    farm: { plots: [{ id: 0, crop: 'wheat', readyAt: 123 }], animals: { egg: { readyAt: 456 } } },
    market: { day: 3, offers: [{ id: 'seeds', quantity: 2 }] }
  });

  assert.equal(migrated.camp.levels.farm, 3);
  assert.equal(migrated.camp.crafted.ironSword, true);
  assert.equal(migrated.camp.storage.iron, 4);
  assert.equal(migrated.farm.plots[0].crop, 'wheat');
  assert.equal(migrated.market.offers[0].quantity, 2);
});

test('future save versions are rejected instead of being silently downgraded', () => {
  assert.throws(
    () => migrateSave({ version: SAVE_VERSION + 1 }),
    /mais recente/
  );
});
