// Capturas da Fase 22c (.tmp/capturas/fase22c/<tag>-*.png): barra de mineração, título sob os pés, herói
// à noite, baú/mochila/moedas no chão, curral (cerca norte-sul) e muralha diagonal.
// Uso: node scripts/hero/capture-fase22c.mjs <tag> [harness]   (harness = outro runtime-harness, ex.: a
// cópia na porta 5174 que serve o HEAD de uma worktree, para as capturas de "antes").
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const tag = process.argv[2] ?? 'depois';
const harnessFile = process.argv[3] ? pathToFileURL(path.resolve(process.argv[3])).href : '../runtime-harness.mjs';
const { capturesDir, runInChrome } = await import(harnessFile);
const OUT = path.join(capturesDir, 'fase22c');
fs.mkdirSync(OUT, { recursive: true });

await runInChrome({ name: `fase22c-${tag}`, port: tag === 'antes' ? 9441 : 9442, width: 960, height: 640 }, async ({ inScene, send, freshStart, delay }) => {
  await freshStart();
  await inScene((scene) => { scene.campaign?.ui?.closeChapter?.(); scene.campaign?.ui?.closeDialogue?.(); scene.enemyDirector.spawnTimer = 1e9; for (const e of [...scene.enemies]) scene.enemyDirector.remove(e); return true; });
  await delay(400);
  const shot = async (name, wx, wy, span = 150) => {
    const box = await inScene(new Function('scene', `
      const c = scene.game.canvas.getBoundingClientRect();
      const cam = scene.cameras.main;
      return { x: c.left + (${wx} - cam.worldView.x) * cam.zoom, y: c.top + (${wy} - cam.worldView.y) * cam.zoom, zoom: cam.zoom };`));
    const w = span * box.zoom;
    await delay(120);
    const s = await send('Page.captureScreenshot', { format: 'png', clip: { x: box.x - w / 2, y: box.y - w / 2, width: w, height: w, scale: 480 / w } });
    fs.writeFileSync(path.join(OUT, `${tag}-${name}.png`), Buffer.from(s.data, 'base64'));
  };
  const at = async (code) => inScene(new Function('scene', code));

  // 1 e 2: barra de mineração e título (de dia, no acampamento).
  const p = await at(`const pl = scene.player; pl.body.reset(scene.camp.x - 120, scene.camp.y + 40); return { x: pl.x, y: pl.y };`);
  await at(`
    const st = scene.achievements.state;
    return import('/src/data/achievements.js').then((m) => { const a = m.ACHIEVEMENTS.find((x) => x.title); st.unlocked[a.id] = true; st.setTitle(a.id); scene.achievements.syncTitle(); return true; });`);
  await delay(300);
  await at(`scene.beginMining({ x: scene.player.x + 18, y: scene.player.y, label: 'teste', onDone() {} }); scene.mining.elapsed = scene.mining.duration * 0.45; scene.drawMiningBar(); scene.achievements.update(); scene.scene.pause(); return true;`);
  await shot('01-02-mineracao-titulo', p.x, p.y - 20, 120);
  await at(`scene.scene.resume(); scene.cancelMining?.(); return true;`);

  // 3: herói à noite (máscara de luz forçada para noite fechada).
  await at(`scene.scene.pause(); scene.lighting.draw(1, scene.player); return true;`);
  await shot('03-noite', p.x, p.y - 20, 120);
  await at(`scene.lighting.draw(0, scene.player); scene.scene.resume(); return true;`);

  // 4 e 9: baú de monstro, mochila, moedas e XP no chão, ao lado do herói.
  await at(`
    const pl = scene.player;
    scene.dropMonsterChest({ x: pl.x + 34, y: pl.y + 4, name: 'Teste' }, 'elite');
    scene.deathBackpacks.create(pl.x - 34, pl.y + 6, [], null, {});
    scene.coinPickups.spawn(pl.x + 10, pl.y + 26, 5);
    scene.experiencePickups.spawn(pl.x - 12, pl.y + 26, 5);
    scene.scene.pause(); return true;`);
  await delay(200);
  await shot('04-09-chao', p.x, p.y, 130);
  await at(`scene.scene.resume(); return true;`);

  // 11: curral (cerca norte-sul) e muralha diagonal.
  const pen = await at(`const pen = scene.camp.pen; for (const f of pen.fences) f.setVisible(true); scene.player.body.reset(pen.cx + 120, pen.cy + 20); return { x: pen.cx, y: pen.cy };`);
  await delay(300);
  await shot('11-curral', pen.x, pen.y, 230);
  const wall = await at(`
    scene.camp.levels.wall = Math.max(1, scene.camp.levels.wall); scene.camp.defense.wallHp = scene.camp.defense.wallMaxHp; scene.camp.defense.buildWall();
    const v = scene.camp.defense.octagonVertices(scene.camp.defense.radius);
    const a = v[0]; const b = v[1];
    const mx = (a.x + b.x) / 2; const my = (a.y + b.y) / 2;
    scene.player.body.reset(mx - 40, my + 30);
    return { x: mx, y: my, v: v.map((q) => [Math.round(q.x), Math.round(q.y)]) };`);
  await delay(400);
  await shot('11-muralha-diagonal', wall.x, wall.y, 200);

  // 16: os monstros repintados ficam na prancha de bake-monsters (16-monstros-{antes,depois}.png).
  console.log('capturas', OUT, tag, JSON.stringify(wall.v));
});
