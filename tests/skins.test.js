import test from 'node:test';
import assert from 'node:assert/strict';
import { SKINS, drawSkinFrame } from '../src/art/skins.js';
import { HERO_SKINS, heroTexture, normalizeGender } from '../src/game/HeroStyle.js';

test('skins: 5 novas, cada uma com 4 direcoes x 4 quadros diferentes e sem recorte', () => {
  assert.deepEqual(SKINS.map((s) => s.id), ['swordsman', 'warrior', 'warrior-blue', 'warrior-green', 'warrior-black']);
  for (const skin of SKINS) {
    const seen = new Set();
    for (let d = 0; d < 4; d += 1) {
      for (let f = 0; f < 4; f += 1) {
        const canvas = drawSkinFrame(skin.id, d, f);
        assert.equal(canvas.width, 32);
        assert.equal(canvas.height, 40);
        let solid = 0;
        for (let i = 3; i < canvas.data.length; i += 4) if (canvas.data[i] > 0) solid += 1;
        assert.ok(solid > 250, `${skin.id} d${d} f${f} quase vazio`);
        seen.add(Buffer.from(canvas.data).toString('base64'));
      }
    }
    assert.ok(seen.size >= 12, `${skin.id}: quadros repetidos demais`);
  }
});

test('skins: variacoes de capa diferem so na cor', () => {
  const a = drawSkinFrame('warrior', 0, 1);
  const b = drawSkinFrame('warrior-blue', 0, 1);
  let diff = 0;
  for (let i = 0; i < a.data.length; i += 4) if (a.data[i + 3] !== b.data[i + 3]) diff += 1;
  assert.equal(diff, 0);
  assert.notDeepEqual([...a.data], [...b.data]);
});

test('skins: textura e valor seguro', () => {
  assert.equal(HERO_SKINS.length, 7);
  assert.equal(heroTexture('swordsman'), 'player-swordsman');
  assert.equal(heroTexture('warrior-blue'), 'player-warrior-blue');
  assert.equal(normalizeGender('warrior-black'), 'warrior-black');
  assert.equal(normalizeGender('nada'), 'male');
});
