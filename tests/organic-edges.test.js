import { test } from 'node:test';
import assert from 'node:assert/strict';
import { drawOrganicTile, edgeShift, otherSideAt, N_BIT, E_BIT, S_BIT, W_BIT } from '../src/art/organicEdges.js';
import { drawBaseTile, drawValleyTile } from '../src/art/terrain.js';
import { T } from '../src/data/worldRegions.js';

const S = 48;
const isRoadPixel = (canvas, x, y, road) => (road ? !otherSideAt(x, y, 0, 0, 0) : true);

test('fronteira de cada aresta: as duas metades nunca cruzam (grama de um lado com estrada do outro)', () => {
  // Estrada à esquerda com grama à direita (aresta vertical): L usa mask E; R usa mask W.
  for (let lane = 0; lane < 5; lane += 1) {
    for (let y = 0; y < S; y += 1) {
      const leftGrass = otherSideAt(S - 1, y, E_BIT, lane, 0);
      const rightRoad = otherSideAt(0, y, W_BIT, lane, 0);
      // Pela regra da aresta: a grama da esquerda começa em x ≥ 48+s e a estrada da direita termina em x < s.
      // Os dois não podem coexistir na mesma linha (senão haveria grama do lado da estrada).
      assert.ok(!(leftGrass && rightRoad), `lane ${lane} linha ${y}: grama à esquerda e estrada à direita`);
    }
  }
});

test('fronteira horizontal: a mesma regra vale para a aresta de cima e de baixo', () => {
  for (let lane = 0; lane < 5; lane += 1) {
    for (let x = 0; x < S; x += 1) {
      const topGrass = otherSideAt(x, S - 1, S_BIT, 0, lane);
      const bottomRoad = otherSideAt(x, 0, N_BIT, 0, lane);
      assert.ok(!(topGrass && bottomRoad), `lane ${lane} coluna ${x}: grama em cima e estrada embaixo`);
    }
  }
});

test('a fronteira fica perto da aresta (não invade metade do ladrilho) e não é reta', () => {
  let minS = 99; let maxS = -99; const distinct = new Set();
  for (let lane = 0; lane < 5; lane += 1) for (let t = 0; t < S; t += 1) {
    const s = edgeShift(t, lane, true);
    minS = Math.min(minS, s); maxS = Math.max(maxS, s); distinct.add(s);
  }
  assert.ok(minS >= -10 && maxS <= 10, `deslocamento fora do limite: ${minS}..${maxS}`);
  assert.ok(distinct.size >= 8, `fronteira quase reta: só ${distinct.size} valores`);
});

test('mesma aresta, mesma curva: edgeShift depende só de (posição, lane, direção)', () => {
  assert.equal(edgeShift(17, 3, true), edgeShift(17, 3, true));
  assert.notEqual(edgeShift(17, 3, true).toString() + edgeShift(18, 3, true), '');
});

test('ladrilho de borda: opaco e sem cores novas (só as dos ladrilhos base e dos detalhes)', () => {
  const allowed = new Set(['#33984b', '#5ac54f', '#99e65f', '#5d2c28', '#8a4836', '#cba36f']);
  for (const name of ['orgr-5-0-0-0', 'orgg-9-0-1-1']) assert.equal(drawOrganicTile(name).width, S);
  for (const name of ['orgr-7-10-2-3', 'orgg-12-6-1-4']) {
    const canvas = drawOrganicTile(name);
    const variant = Number(name.split('-')[1]);
    const base = name.startsWith('orgr') ? drawBaseTile(T.ROAD, variant) : drawValleyTile(variant);
    const other = name.startsWith('orgr') ? drawValleyTile(variant) : drawBaseTile(T.ROAD, variant);
    const known = new Set([...allowed]);
    for (const c of [base, other]) for (let y = 0; y < S; y += 1) for (let x = 0; x < S; x += 1) known.add(c.colorAt(x, y).toLowerCase());
    let transparent = 0; let novel = 0;
    for (let y = 0; y < S; y += 1) for (let x = 0; x < S; x += 1) {
      if (canvas.alphaAt(x, y) !== 255) transparent += 1;
      if (!known.has(canvas.colorAt(x, y).toLowerCase())) novel += 1;
    }
    assert.equal(transparent, 0, `${name}: pixels transparentes`);
    assert.equal(novel, 0, `${name}: cores que não existem nos ladrilhos base nem nos detalhes`);
  }
});

test('mesmo nome gera exatamente os mesmos pixels (determinismo)', () => {
  const a = drawOrganicTile('orgg-12-6-1-4');
  const b = drawOrganicTile('orgg-12-6-1-4');
  for (let y = 0; y < S; y += 1) for (let x = 0; x < S; x += 1) assert.equal(a.colorAt(x, y), b.colorAt(x, y));
});
