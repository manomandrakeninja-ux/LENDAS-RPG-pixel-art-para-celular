import test from 'node:test';
import assert from 'node:assert/strict';
import { GEAR_ITEMS } from '../src/data/gear.js';
import { GEAR_ICON_SPRITES, WEAPON_HAND_SPRITES, WEAPON_HAND_SIZE } from '../src/art/gearSprites.js';
import { bakedGearIcon, bakedWeaponHand } from '../src/art/bakedGear.js';
import { FRAME_RAMPS, drawGearIcon, frameTier } from '../src/art/gearIcons.js';
import { WEAPON_GRIPS, WEAPON_SPRITE_SIZE, drawWeaponSprite, toolLookFor, weaponLookFor, BOW_LOOK } from '../src/art/weaponSprites.js';

const opaque = (c) => { let n = 0; for (let i = 3; i < c.data.length; i += 4) if (c.data[i] > 0) n += 1; return n; };

test('G-armas: toda peça tem ícone pintado, e os desenhos não se repetem', () => {
  const seen = new Set();
  for (const id of Object.keys(GEAR_ITEMS)) {
    assert.ok(GEAR_ICON_SPRITES[id], `ícone de ${id}`);
    const art = bakedGearIcon(id);
    assert.equal(art.width, 32);
    assert.ok(opaque(art) > 90, `${id} preenche o ícone`);
    const key = Buffer.from(art.data).toString('base64');
    assert.ok(!seen.has(key), `${id} tem desenho próprio`);
    seen.add(key);
  }
  assert.equal(Object.values(GEAR_ITEMS).filter((i) => i.slot === 'weapon').length, 46);
});

test('G-armas: moldura de raridade cinza, verde, azul, roxa e dourada (relíquia de chefe)', () => {
  assert.deepEqual(Object.keys(FRAME_RAMPS), ['common', 'uncommon', 'rare', 'legendary', 'relic']);
  assert.equal(frameTier('ferro-helmet', 'rare'), 'rare');
  assert.equal(frameTier('dragonClaw', 'legendary'), 'relic');
  assert.equal(frameTier('ferro-helmet', 'xyz'), 'common');
  const at = (c, x, y) => Array.from(c.data.slice((y * 32 + x) * 4, (y * 32 + x) * 4 + 4)).join();
  const borders = ['common', 'uncommon', 'rare', 'legendary'].map((r) => at(drawGearIcon('ferro-helmet', r), 10, 1));
  assert.equal(new Set(borders).size, 4);
  assert.equal(at(drawGearIcon('ferro-helmet'), 0, 0), '0,0,0,0', 'canto arredondado');
});

test('G-armas: a arma na mão/costas é a arte pintada da arma real, na escala do herói', () => {
  assert.equal(WEAPON_HAND_SIZE, WEAPON_SPRITE_SIZE);
  for (const [id, item] of Object.entries(GEAR_ITEMS)) {
    if (item.slot !== 'weapon') continue;
    const look = weaponLookFor({ lootId: id });
    assert.equal(look.id, id);
    const sprite = drawWeaponSprite(look.look, look.main, look.accent, look.id);
    assert.deepEqual(sprite.data, bakedWeaponHand(id).data);
    assert.equal(sprite.width, WEAPON_SPRITE_SIZE);
    // A mão (empunhadura) cai em cima da arma.
    const [gx, gy] = WEAPON_GRIPS[item.look];
    let near = 0;
    for (let dy = -1; dy <= 1; dy += 1) for (let dx = -1; dx <= 1; dx += 1) if (sprite.data[((gy + dy) * sprite.width + gx + dx) * 4 + 3] > 0) near += 1;
    assert.ok(near >= 3, `${id}: empunhadura no cabo`);
  }
  for (const look of [weaponLookFor({}), weaponLookFor({ forgeWeapon: 'titanBlade' }), toolLookFor('hatchet'), toolLookFor('pickaxe', 'iron'), BOW_LOOK]) {
    assert.ok(WEAPON_HAND_SPRITES[look.id], `sprite de ${look.id}`);
  }
});
