import test from 'node:test';
import assert from 'node:assert/strict';
import { BAKED_MONSTERS } from '../src/art/monsterSprites.js';
import { drawMonsterFrame, monsterAttackFrame, monsterFrameCount } from '../src/art/monsters.js';

// Fase 20G: monstros pintados em alta resolução e reduzidos (scripts/bake-monsters.mjs).
const BOSSES = new Set(['titan', 'abyssLord', 'orcChief', 'hydra', 'frostGiant', 'pharaoh', 'dragon', 'ghostCaptain', 'wolfBoss', 'banditBoss', 'emberKnightBoss', 'waterSpirit', 'griffin']);
const opaque = (canvas) => {
  const set = new Set();
  for (let i = 0; i < canvas.data.length; i += 4) if (canvas.data[i + 3] >= 200) set.add(i);
  return set;
};

test('monstros pintados: tamanhos na escala das skins (comuns 40-56, chefes 80-112)', () => {
  for (const [kind, { size, elite }] of Object.entries(BAKED_MONSTERS)) {
    if (BOSSES.has(kind)) assert.ok(size >= 80 && size <= 112, kind);
    else assert.ok(size >= 40 && size <= 56 && elite > size, kind);
  }
});

test('monstros pintados: 4 quadros de andar com movimento real e 1 de ataque', () => {
  for (const [kind, { size }] of Object.entries(BAKED_MONSTERS)) {
    assert.equal(monsterFrameCount(kind), 5, kind);
    assert.equal(monsterAttackFrame(kind), 4, kind);
    const frames = [0, 1, 2, 3, 4].map((frame) => drawMonsterFrame(kind, size, frame));
    for (let f = 0; f < 4; f += 1) {
      const a = frames[f].data;
      const b = frames[(f + 1) % 4].data;
      let changed = 0;
      let total = 0;
      for (let i = 0; i < a.length; i += 4) {
        if (a[i + 3] < 200 && b[i + 3] < 200) continue;
        total += 1;
        if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2] || a[i + 3] !== b[i + 3]) changed += 1;
      }
      assert.ok(changed / total >= 0.06, `${kind} quadro ${f}: ${(changed / total * 100).toFixed(1)}%`);
    }
    assert.ok(opaque(frames[4]).size > opaque(frames[0]).size * 0.6, `${kind} ataque`);
  }
});

test('monstros pintados: tamanhos extras (cenas da história) e elite saem do próprio desenho', () => {
  assert.equal(drawMonsterFrame('skeleton', 40, 0).width, 40);
  assert.equal(drawMonsterFrame('titan', 64, 0).width, 64);
  const elite = BAKED_MONSTERS.wolf.elite;
  assert.ok(opaque(drawMonsterFrame('wolf', elite, 0, { elite: true })).size > opaque(drawMonsterFrame('wolf', BAKED_MONSTERS.wolf.size, 0)).size);
});

test('lote 5: todo inimigo e chefe de missão da campanha usa sprite pintado (nada de arte antiga)', async () => {
  const { SITES } = await import('../src/data/campaign.js');
  for (const [id, site] of Object.entries(SITES)) {
    for (const spec of [site.enemies, site.boss].filter(Boolean)) {
      const kind = spec.visual ?? spec.kind;
      assert.ok(BAKED_MONSTERS[kind], `${id}: ${kind} sem sprite pintado`);
      if (site.boss) assert.ok((spec.scale ?? 1) * BAKED_MONSTERS[kind].elite <= 112 * 1.6, `${id}: chefe grande demais`);
    }
  }
});
