import test from 'node:test';
import assert from 'node:assert/strict';
import { ATTACK_MS, DRAW_MS, HOLD_MS, HeroStance, SHEATHE_MS } from '../src/game/heroStance.js';
import { HERO_COLS, HERO_DIRS, rigFor, weaponAngle } from '../src/art/heroRig.js';
import { WEAPON_GRIPS, WEAPON_STYLE, drawWeaponSprite, weaponLookFor, weaponPose } from '../src/art/weaponSprites.js';
import { GEAR_ITEMS } from '../src/data/gear.js';

const run = (s, ms, step = 16) => { for (let t = 0; t < ms; t += step) s.update(step); };

test('arma: sacar (mão ao ombro), golpear, segurar 5 s e guardar (reverso)', () => {
  const s = new HeroStance();
  assert.equal(s.mode, 'sheathed');
  assert.deepEqual([s.pose().col, s.pose().where], [null, 'back']);
  s.attack();
  assert.equal(s.mode, 'drawing');
  assert.deepEqual([s.pose().col, s.pose().where], [5, 'back']); // mão a caminho
  run(s, DRAW_MS / 2 + 8);
  assert.deepEqual([s.pose().col, s.pose().where], [6, 'back']); // mão no cabo, nas costas
  run(s, DRAW_MS / 2);
  assert.equal(s.mode, 'armed');
  assert.equal(s.pose().where, 'hand');
  assert.equal(s.pose().col, 7); // preparar
  run(s, 80);
  assert.equal(s.pose().col, 8); // golpe
  run(s, 120);
  assert.equal(s.pose().col, 9); // retorno
  run(s, ATTACK_MS);
  assert.deepEqual([s.pose().col, s.pose().where], [null, 'hand']); // segurando
  run(s, HOLD_MS - 300);
  assert.equal(s.mode, 'armed', 'ainda segura antes dos 5 s');
  s.attack(); // novo golpe reinicia os 5 s
  run(s, ATTACK_MS + HOLD_MS - 300);
  assert.equal(s.mode, 'armed');
  let waited = 0;
  while (s.mode === 'armed' && waited < 1000) { s.update(10); waited += 10; }
  assert.ok(waited > 250 && waited <= 330, `guarda 5 s depois do último golpe (${waited})`);
  assert.equal(s.mode, 'sheathing');
  assert.deepEqual([s.pose().col, s.pose().where], [6, 'back']); // guarda: ombro, depois peito
  run(s, SHEATHE_MS / 2 + 8);
  assert.equal(s.pose().col, 5);
  run(s, SHEATHE_MS);
  assert.equal(s.mode, 'sheathed');
});

test('ferramenta: a arma volta às costas e nunca fica na mão junto da ferramenta', () => {
  const s = new HeroStance();
  s.attack();
  run(s, DRAW_MS + 50);
  assert.equal(s.pose().where, 'hand');
  s.startTool('pickaxe');
  assert.equal(s.mode, 'sheathing');
  run(s, SHEATHE_MS + DRAW_MS);
  for (let i = 0; i < 40; i += 1) {
    s.update(24);
    const p = s.pose();
    assert.equal(p.item, 'tool', 'na mão só a ferramenta');
    assert.ok([7, 8, 9].includes(p.col), `golpe da ferramenta (${p.col})`);
  }
  s.stopTool();
  run(s, DRAW_MS);
  assert.equal(s.mode, 'sheathed');
  assert.equal(s.pose().item, 'weapon');
});

test('arma: textura da arma real, por aparência, e troca imediata', () => {
  const looks = new Set();
  for (const [id, item] of Object.entries(GEAR_ITEMS)) {
    if (item.slot !== 'weapon') continue;
    const look = weaponLookFor({ lootId: id });
    assert.equal(look.key, `hero-weapon-${id}`);
    assert.equal(look.look, item.look);
    assert.ok(WEAPON_GRIPS[look.look], `empunhadura de ${look.look}`);
    looks.add(look.look);
  }
  assert.ok(looks.size >= 8, 'machado, lança, cajado... têm desenho próprio');
  assert.equal(weaponLookFor({ forgeWeapon: 'steelSword' }).key, 'hero-weapon-forge-steel');
  assert.equal(weaponLookFor({}).key, 'hero-weapon-forge-rusty');
  const a = drawWeaponSprite('axe', '#3a2a1a', '#e0e4e8').data.join();
  const b = drawWeaponSprite('spear', '#3a2a1a', '#e0e4e8').data.join();
  assert.notEqual(a, b);
  assert.equal(WEAPON_STYLE.spear, 'thrust');
  assert.equal(WEAPON_STYLE.staff, 'cast');
});

test('rig: 12 colunas por direção, mãos dentro do quadro e diagonais nítidas', () => {
  for (const key of ['player', 'player-female', 'player-swordsman', 'player-warrior', 'player-warrior-black']) {
    const rig = rigFor(key);
    for (const dir of HERO_DIRS) {
      assert.equal(rig[dir].hands.length, HERO_COLS);
      for (const [x, y] of rig[dir].hands) assert.ok(x >= 0 && x < 56 && y >= 0 && y < 64, `${key} ${dir}`);
    }
  }
  // Costas: sem rotação (só espelho), para a arma ficar nítida.
  for (const dir of HERO_DIRS) assert.equal(weaponPose('sword', rigFor('player')[dir].back.angle).rotation, 0);
  assert.equal(weaponAngle('slash', 'left', 8), 180 - weaponAngle('slash', 'right', 8));
});
