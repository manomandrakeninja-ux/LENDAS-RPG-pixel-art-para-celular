import assert from 'node:assert/strict';
import test from 'node:test';
import { NPC_SHEETS } from '../src/art/npcSheets.js';
import { NPCS } from '../src/data/campaign.js';
import { SPEAKERS } from '../src/data/story.js';
import { VILLAGERS } from '../src/data/villagers.js';
import { PETS } from '../src/data/companions.js';
import { readPng } from '../scripts/png.js';

// G-npcs: todo NPC, animal e mascote tem folha pintada no tamanho certo.
test('todo personagem, animal e mascote tem folha pintada', () => {
  const ids = [...Object.keys(NPCS), ...Object.keys(SPEAKERS), ...VILLAGERS.map((v) => v.id), 'chicken', 'sheep', 'pig', 'cow', ...Object.keys(PETS)];
  for (const id of ids) assert.ok(NPC_SHEETS[id], `sem folha: ${id}`);
  for (const v of VILLAGERS) assert.equal(NPC_SHEETS[v.id].kind, 'walker', `${v.id} anda`);
});

test('folhas no quadro das skins (56 x 64) e com quadros diferentes', () => {
  for (const [id, info] of Object.entries(NPC_SHEETS)) {
    const img = readPng(`public/assets/npcs/${id}.png`);
    const cols = info.kind === 'walker' || info.kind === 'still' ? 4 : info.frames;
    const rows = info.kind === 'walker' ? 5 : 1;
    assert.equal(img.width, info.w * cols, id);
    assert.equal(img.height, info.h * rows, id);
    if (info.kind === 'walker' || info.kind === 'still') assert.deepEqual([info.w, info.h, info.feet], [56, 64, 62], id);
    // Quadro 0 e 1 (andar ou respirar) não podem ser iguais.
    let diff = 0;
    for (let y = 0; y < info.h; y += 1) for (let x = 0; x < info.w; x += 1) {
      const a = (y * img.width + x) * 4; const b = a + info.w * 4;
      if (img.data[a + 3] !== img.data[b + 3] || img.data[a] !== img.data[b]) diff += 1;
    }
    assert.ok(diff > 10, `${id}: quadros iguais`);
  }
});
