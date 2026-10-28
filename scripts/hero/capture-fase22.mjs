// Capturas da Fase 22 (.tmp/capturas/fase22/): sequências de quadros do jogo para cada skin
// (andar, sacar, golpear, segurar, guardar, minerar, dano), as 4 direções do golpe, a prancha de armas
// e a prancha geral. O jogo fica pausado e o HeroAnimator é avançado à mão, quadro a quadro.
// Uso (com o Vite em 127.0.0.1:5173): node scripts/hero/capture-fase22.mjs [skins] [tag]
import fs from 'node:fs';
import path from 'node:path';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { capturesDir, runInChrome } from '../runtime-harness.mjs';

const OUT = path.join(capturesDir, 'fase22');
fs.mkdirSync(OUT, { recursive: true });
const skins = (process.argv[2] ?? 'male,female,swordsman,warrior,warrior-blue,warrior-green,warrior-black').split(',');
const tag = process.argv[3] ?? '';
const LABEL = { male: 'Cavaleiro', female: 'Heroína', swordsman: 'Espadachim', warrior: 'Guerreira Vinho', 'warrior-blue': 'Guerreira Azul', 'warrior-green': 'Guerreira Verde', 'warrior-black': 'Guerreira Negra' };
const WEAPONS = [null, 'grokkAxe', 'frostSpear', 'pharaohStaff', 'captainSabre', 'giantClub', 'dragonClaw', 'hydraFang', 'abyssBlade'];
const CELL = 168;

const strips = {};
await runInChrome({ name: 'fase22cap', port: 9432, width: 900, height: 700 }, async ({ inScene, send, freshStart, delay }) => {
  await freshStart();
  await inScene((scene) => {
    scene.ui?.hide?.();
    scene.scene.pause();
    const p = scene.player;
    window.__f22 = {
      // Avança o animador `ms` (em passos de 10 ms) com a direção e o andar dados.
      step(ms, dir, moving = false) {
        p.direction = dir;
        for (let t = 0; t < ms; t += 10) p.animator.update(10, dir, moving);
        p.animator.update(0, dir, moving);
      },
      walkTo(col, dir) {
        p.direction = dir;
        p.animator.update(0, dir, true);
        const anim = p.sprite.anims;
        anim.setCurrentFrame(anim.currentAnim.frames[col]);
        p.animator.update(0, dir, true);
      },
      reset(dir) {
        const s = p.animator.stance;
        s.mode = 'sheathed'; s.t = 0; s.attackT = null; s.queued = 0; s.tool = null; s.hurtT = null; s.afterTool = null;
        p.animator.flashMs = 0; p.animator.turnMs = 0; p.animator.dir = dir;
        p.sprite.clearTint(); p.sprite.setAlpha(1);
        this.step(0, dir);
      }
    };
  });
  const box = await inScene((scene) => {
    const c = scene.game.canvas.getBoundingClientRect();
    const cam = scene.cameras.main;
    return { x: c.left + (scene.player.x - cam.worldView.x) * cam.zoom, y: c.top + (scene.player.y - cam.worldView.y) * cam.zoom, zoom: cam.zoom };
  });
  const span = 84 * box.zoom;
  const shot = async () => {
    await delay(40);
    const s = await send('Page.captureScreenshot', { format: 'png', clip: { x: box.x - span / 2, y: box.y - span * 0.78, width: span, height: span, scale: CELL / span } });
    return Buffer.from(s.data, 'base64');
  };
  const run = (code) => inScene(new Function('scene', `const f = window.__f22; const p = scene.player; ${code}`));

  for (const skin of skins) {
    await inScene((scene, skin) => { scene.player.setGender(skin); scene.player.refreshGear(); }, skin);
    const frames = [];
    const add = async (label, code) => { await run(code); frames.push({ label, png: await shot() }); };
    // Andar (arma nas costas).
    await run(`f.reset('right')`);
    for (let c = 0; c < 4; c += 1) await add(`andar ${c + 1}`, `f.walkTo(${c}, 'right')`);
    // Sacar e golpear.
    await run(`f.reset('right'); p.animator.attack();`);
    await add('sacar 1', `f.step(10, 'right')`);
    await add('sacar 2', `f.step(90, 'right')`);
    await add('preparar', `f.step(80, 'right')`);
    await add('golpe', `f.step(90, 'right')`);
    await add('golpe fim', `f.step(60, 'right')`);
    await add('retorno', `f.step(60, 'right')`);
    // Segurar 5 s (parado e andando).
    await add('segura 2s', `f.step(2000, 'right')`);
    await add('segura andando', `f.walkTo(2, 'right')`);
    await add('segura 4,9s', `f.step(2800, 'right')`);
    // Guardar (reverso).
    await add('guardar 1', `f.step(200, 'right')`);
    await add('guardar 2', `f.step(90, 'right')`);
    await add('guardada', `f.step(120, 'right')`);
    // Minerar.
    await run(`f.reset('right'); p.animator.startTool('pickaxe', 'iron'); f.step(100, 'right');`);
    await add('minerar ergue', `f.step(150, 'right')`);
    await add('minerar golpe', `f.step(180, 'right')`);
    await add('minerar volta', `f.step(90, 'right')`);
    // Dano.
    await run(`f.reset('right'); p.animator.stopTool(); f.step(200, 'right'); p.animator.hurt();`);
    await add('dano clarão', `f.step(20, 'right')`);
    await add('dano recuo', `f.step(100, 'right')`);
    // Golpe nas outras direções.
    for (const dir of ['down', 'left', 'up']) {
      await run(`f.reset('${dir}'); p.animator.attack(); f.step(170, '${dir}')`);
      await add(`${dir} preparar`, `f.step(10, '${dir}')`);
      await add(`${dir} golpe`, `f.step(160, '${dir}')`);
      await add(`${dir} segura`, `f.step(300, '${dir}')`);
      await run(`f.reset('${dir}')`);
      await add(`${dir} costas`, `f.step(10, '${dir}')`);
    }
    strips[skin] = frames;
  }
  // Prancha de armas: a Guerreira com 9 armas (costas de frente, costas de lado e golpe).
  await inScene((scene) => scene.player.setGender('warrior'));
  const weaponFrames = [];
  for (const id of WEAPONS) {
    await run(`
      const item = ${JSON.stringify(id)};
      const gearItem = item ? window.__LENDAS__.scene.getScene('GameScene').gear.add(item, 'rare') : null;
      if (gearItem) scene.gear.equip(gearItem.uid, 150); else if (scene.gear.equipped.weapon) scene.gear.unequip('weapon');
      p.refreshGear();`);
    const name = id ?? 'espada da Forja';
    const row = [];
    for (const [label, code] of [
      ['costas', `f.reset('down')`],
      ['lado', `f.reset('right')`],
      ['de costas', `f.reset('up')`],
      ['preparar', `f.reset('right'); p.animator.attack(); f.step(180, 'right')`],
      ['golpe', `f.step(110, 'right')`],
      ['segura', `f.step(300, 'down')`]
    ]) {
      await run(code);
      row.push({ label: `${name} • ${label}`, png: await shot() });
    }
    weaponFrames.push(row);
  }
  strips.__weapons = weaponFrames;
});

// ---------------------------------------------------------------- pranchas
async function board(rows, file, title) {
  const cols = Math.max(...rows.map((r) => r.frames.length));
  const W = 150 + cols * (CELL + 4);
  const H = 40 + rows.length * (CELL + 22);
  const c = createCanvas(W, H);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#16121c'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#ffe9b0'; ctx.font = 'bold 18px sans-serif'; ctx.fillText(title, 10, 26);
  for (let r = 0; r < rows.length; r += 1) {
    const y = 40 + r * (CELL + 22);
    ctx.fillStyle = '#ffe9b0'; ctx.font = 'bold 13px sans-serif'; ctx.fillText(rows[r].name, 8, y + CELL / 2);
    for (let i = 0; i < rows[r].frames.length; i += 1) {
      const x = 150 + i * (CELL + 4);
      const img = await loadImage(rows[r].frames[i].png);
      ctx.drawImage(img, x, y, CELL, CELL);
      ctx.fillStyle = '#c8bca8'; ctx.font = '10px sans-serif';
      ctx.fillText(rows[r].frames[i].label.slice(0, 22), x + 2, y + CELL + 13);
    }
  }
  fs.writeFileSync(path.join(OUT, file), c.toBuffer('image/png'));
  console.log('prancha', file);
}

for (const skin of skins) {
  await board([{ name: LABEL[skin], frames: strips[skin].slice(0, 21) }, { name: 'direções', frames: strips[skin].slice(21) }], `seq-${skin}${tag}.png`, `${LABEL[skin]}: andar, sacar, golpear, segurar 5 s, guardar, minerar, dano`);
}
await board(skins.map((skin) => ({ name: LABEL[skin], frames: [0, 1, 4, 5, 6, 7, 9, 12, 14, 15, 16, 18, 20].map((i) => strips[skin][i]) })), `prancha-geral${tag}.png`, 'Fase 22: todas as skins (andar, sacar, golpe, segurar, guardar, minerar, dano)');
await board(strips.__weapons.map((row, i) => ({ name: WEAPONS[i] ?? 'forja', frames: row })), `prancha-armas${tag}.png`, 'Arma real equipada: costas e golpe (Guerreira)');
