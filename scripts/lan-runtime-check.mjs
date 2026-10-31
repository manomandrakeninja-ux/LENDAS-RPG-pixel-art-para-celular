// Multijogador LAN: sobe o servidor local numa porta de teste e abre DUAS páginas do jogo
// (dois Chrome headless independentes) conectadas nele; cada uma deve ver a outra com o nome,
// e a posição transmitida deve acompanhar o movimento real do outro jogador.
// Obs.: runInChrome loga o resultado do body mas não o retorna — por isso gravamos em `out`.
import { spawn } from 'node:child_process';
import { check, runInChrome } from './runtime-harness.mjs';

// Porta dinâmica para não colidir com um servidor zumbi de execução anterior.
const WS_PORT = 8790 + (process.pid % 100);
const server = spawn(process.execPath, ['server/lan-server.mjs'], {
  env: { ...process.env, PORT: String(WS_PORT) },
  stdio: 'ignore'
});
process.on('exit', () => { try { server.kill(); } catch { /* */ } });

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// espera o servidor responder HTTP antes de abrir os clientes
let up = false;
for (let i = 0; i < 40 && !up; i += 1) {
  try {
    const res = await fetch(`http://127.0.0.1:${WS_PORT}/`);
    up = res.ok;
  } catch { /* ainda subindo */ }
  if (!up) await delay(250);
}
check(up, 'Servidor LAN não subiu na porta de teste.');

const pageUrl = (name) => `?lan=ws://127.0.0.1:${WS_PORT}&lanName=${encodeURIComponent(name)}`;

const readLan = (scene) => ({
  connected: Boolean(scene.lan?.connected),
  status: scene.lan?.status ?? '',
  me: scene.lan?.name ?? '',
  id: scene.lan?.id ?? null,
  seen: scene.lan ? [...scene.lan.seenNames] : [],
  log: (scene.lan?.log ?? []).slice(-4).map((m) => m.t + (m.p ? ':' + m.p.name : m.id !== undefined ? ':' + m.id : '')),
  remotes: scene.lan ? [...scene.lan.remotes.values()].map((r) => ({
    name: r.name,
    x: Math.round(r.x),
    tx: Math.round(r.tx),
    y: Math.round(r.y),
    label: r.label?.text ?? '',
    labelVisible: Boolean(r.label?.visible)
  })) : []
});

const waitForRemote = async (inScene, name, attempts = 70) => {
  let last = null;
  for (let i = 0; i < attempts; i += 1) {
    await delay(500);
    last = await inScene(readLan);
    if (last.remotes.some((r) => r.name === name)) return last;
  }
  return last;
};

const out = { alice: null, bella: null };
await Promise.all([
  runInChrome({ name: 'lan-a', port: 9371, query: pageUrl('Alice') }, async ({ inScene, delay: d }) => {
    // Alice se move assim que a cena abre (não espera a Bella) e manda o estado várias vezes:
    // se a cena estiver pausada, o update() não roda e só o sendNow entrega a posição nova.
    await inScene((scene) => {
      scene.player.body.reset(scene.camp.x + 320, scene.camp.y + 40);
      scene.player.setPosition(scene.camp.x + 320, scene.camp.y + 40);
    });
    for (let i = 0; i < 15; i += 1) {
      await d(200);
      await inScene((scene) => scene.lan?.sendNow?.());
    }
    const seen = await waitForRemote(inScene, 'Bella');
    out.alice = { seen };
  }),
  runInChrome({ name: 'lan-b', port: 9372, query: pageUrl('Bella') }, async ({ inScene, delay: d }) => {
    const seen = await waitForRemote(inScene, 'Alice');
    // A Alice (na outra página) teleporta para camp.x + 320; a Bella deve ver esse destino no tx
    // (valor cru recebido pelo servidor — x é interpolado no update, que pode estar pausado).
    const expected = await inScene((scene) => scene.camp.x + 320);
    let last = seen.remotes.find((r) => r.name === 'Alice');
    for (let i = 0; i < 60; i += 1) {
      await d(500);
      const current = await inScene(readLan);
      last = current.remotes.find((r) => r.name === 'Alice') ?? last;
      if (last && Math.abs(last.tx - expected) < 80) break;
    }
    out.bella = { seen, last, expected };
  })
]);

check(out.alice?.seen.connected, `Alice não conectou: ${JSON.stringify(out.alice?.seen)}`);
check(out.bella?.seen.connected, `Bella não conectou: ${JSON.stringify(out.bella?.seen)}`);
// "cada um aparece para o outro": nomes já vistos (robusto a reconexões/leave no meio)
check(out.alice?.seen.seen.includes('Bella'), `Alice deveria ter visto Bella: alice=${JSON.stringify(out.alice?.seen)} bella=${JSON.stringify(out.bella?.seen)}`);
check(out.bella?.seen.seen.includes('Alice'), `Bella deveria ter visto Alice: alice=${JSON.stringify(out.alice?.seen)} bella=${JSON.stringify(out.bella?.seen)}`);
// nome embaixo do avatar (label) e posição transmitida seguindo o movimento real
const aliceOnBella = out.bella?.last;
check(aliceOnBella && aliceOnBella.label === 'Alice' && aliceOnBella.labelVisible,
  `Avatar da Alice sem nome embaixo na visão da Bella: ${JSON.stringify(out.bella?.seen.remotes)}`);
check(aliceOnBella && Math.abs(aliceOnBella.tx - out.bella.expected) < 80,
  `Bella deveria ver a Alice na posição nova (esperado tx≈${out.bella?.expected}, recibido tx=${aliceOnBella?.tx}).`);

server.kill();
console.log(JSON.stringify({
  aliceSeenNames: out.alice.seen.seen,
  bellaSeenNames: out.bella.seen.seen,
  bellaSeesAliceAt: aliceOnBella ? `tx=${aliceOnBella.tx},${aliceOnBella.y} nome=${aliceOnBella.label} (esperado ≈${out.bella.expected})` : null,
  consoleErrors: 0
}, null, 2));
