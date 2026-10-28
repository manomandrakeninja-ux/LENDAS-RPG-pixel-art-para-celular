import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PNG } from 'pngjs';
import { SKINS, SKIN_FRAME, heroFrameSize } from '../src/art/skins.js';
import { HERO_SKINS, heroTexture, normalizeGender } from '../src/game/HeroStyle.js';

const sheetOf = (id) => PNG.sync.read(fs.readFileSync(new URL(`../public/assets/characters/player-${id}-sheet.png`, import.meta.url)));
function frameOf(png, direction, frame) {
  const { width: fw, height: fh } = SKIN_FRAME;
  const out = Buffer.alloc(fw * fh * 4);
  for (let y = 0; y < fh; y += 1) {
    const from = ((direction * fh + y) * png.width + frame * fw) * 4;
    png.data.copy(out, y * fw * 4, from, from + fw * 4);
  }
  return out;
}

test('skins: 5 novas, folhas 4 x 4 de 56 x 64, quadros cheios e diferentes, pes na linha 62', () => {
  assert.deepEqual(SKINS.map((s) => s.id), ['swordsman', 'warrior', 'warrior-blue', 'warrior-green', 'warrior-black']);
  for (const skin of SKINS) {
    const png = sheetOf(skin.id);
    assert.equal(png.width, SKIN_FRAME.width * 4);
    assert.equal(png.height, SKIN_FRAME.height * 4);
    const seen = new Set();
    const colors = new Set();
    for (let d = 0; d < 4; d += 1) {
      for (let f = 0; f < 4; f += 1) {
        const data = frameOf(png, d, f);
        let solid = 0;
        let bottom = -1;
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] < 128) continue;
          solid += 1;
          bottom = Math.max(bottom, Math.floor(i / 4 / SKIN_FRAME.width));
          colors.add(data.readUInt32BE(i));
        }
        assert.ok(solid > 900, `${skin.id} d${d} f${f} quase vazio (${solid})`);
        if (f === 1) assert.ok(bottom >= SKIN_FRAME.feet - 1 && bottom <= SKIN_FRAME.feet, `${skin.id} d${d}: pes fora da linha (${bottom})`);
        seen.add(data.toString('base64'));
      }
    }
    assert.ok(seen.size >= 12, `${skin.id}: quadros repetidos demais`);
    // A frente é o sprite aprovado pixel a pixel (paleta própria de até 28 cores; as capas coloridas somam a sua rampa).
    assert.ok(colors.size <= 40, `${skin.id}: ${colors.size} cores`);
  }
});

test('skins: cada cor de capa tem a sua folha', () => {
  const sheets = ['warrior', 'warrior-blue', 'warrior-green', 'warrior-black'].map((id) => sheetOf(id).data.toString('base64'));
  assert.equal(new Set(sheets).size, 4);
});

test('skins: textura, quadro e valor seguro', () => {
  assert.equal(HERO_SKINS.length, 7);
  assert.equal(heroTexture('swordsman'), 'player-swordsman');
  assert.equal(heroTexture('warrior-blue'), 'player-warrior-blue');
  assert.equal(normalizeGender('warrior-black'), 'warrior-black');
  assert.equal(normalizeGender('nada'), 'male');
  assert.equal(heroFrameSize('player-warrior').height, 64);
  assert.equal(heroFrameSize('player').height, 40);
});
