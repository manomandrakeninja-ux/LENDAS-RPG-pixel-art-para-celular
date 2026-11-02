// Validador de profundidade da camada de acabamento (vale-finish) sobre os caminhos (vale-paths).
// Arquivo independente: só lê PNG/JSON e não altera nada.
//
// USO (na pasta raiz do projeto):
//   node art-pro/validador-profundidade/validar-profundidade.mjs \
//     --finish art-pro/incoming/vale-finish/vale-finish__v03.png \
//     --finish-json art-pro/incoming/vale-finish/vale-finish__v03.json \
//     --paths public/assets/paths/vale-paths.png \
//     --paths-json public/assets/paths/vale-paths.json \
//     [--max 6] [--verbose]
//
// Requisitos: Node 18+ e o pacote pngjs já instalado no projeto (npm install já traz).
//
// REGRAS
// 1) TERRA x GRAMA: um pixel opaco é TERRA quando r > g + 12 e r > b + 25 (mesma regra do atlas vale-paths).
//    Qualquer outro pixel opaco é GRAMA. Pixel transparente (alpha 0) não conta.
// 2) PAREAMENTO: o quadro de franja (64 x 64) de máscara m e variante v fica no slot k = m*2 + v
//    (posição em grade de 8 colunas, cada slot 64 x 64). Se o JSON tem frame.x/frame.y, eles são usados;
//    senão a posição sai da fórmula do slot.
// 3) ÁREA DA TERRA DA FRANJA: o tile de 48 px fica dentro do quadro de 64 px com margem de 8 px.
//    Pixel (8 + u, 8 + v) do quadro de franja corresponde ao pixel (u, v) do tile de caminho (0..47).
// 4) CAMINHO: para cada máscara m existem 3 variantes no vale-paths. A franja de variante v é testada
//    contra as 3 variantes do caminho (pior caso). Quadro de caminho = frame do JSON de vale-paths com mask = m.
// 5) PROFUNDIDADE: um pixel de GRAMA da franja que cai sobre um pixel de TERRA do caminho (mesmo (u, v))
//    é medido: anda até 6 px em direção à grama mais próxima do caminho (nas 4 direções) e mede o passo
//    em que encontra GRAMA no caminho. Se não achar grama em até `max` passos (ou sair do tile de 48 px),
//    a profundidade é contada como "acima do limite".
//    Passa quando nenhum pixel mede profundidade acima do limite (padrão 6 px).
// 6) MÁSCARAS 0 e 15: os quadros devem ser totalmente transparentes.
// 7) PALETA: se houver PALETA-VALE.json ao lado da pasta de entrega, cores fora dele são reportadas.

import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

const args = process.argv.slice(2);
const opt = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback; };
const flag = (name) => args.includes(name);
const finishPng = opt('--finish', 'art-pro/incoming/vale-finish/vale-finish__v03.png');
const finishJson = opt('--finish-json', 'art-pro/incoming/vale-finish/vale-finish__v03.json');
const pathsPng = opt('--paths', 'public/assets/paths/vale-paths.png');
const pathsJson = opt('--paths-json', 'public/assets/paths/vale-paths.json');
const paletteFile = opt('--palette', 'art-pro/incoming/vale-finish/PALETA-VALE.json');
const MAX = Number(opt('--max', '6'));
const VERBOSE = flag('--verbose');

const load = (p) => PNG.sync.read(fs.readFileSync(path.resolve(p)));
const finish = load(finishPng);
const paths = load(pathsPng);
const finishMeta = JSON.parse(fs.readFileSync(path.resolve(finishJson), 'utf8'));
const pathsMeta = JSON.parse(fs.readFileSync(path.resolve(pathsJson), 'utf8'));

const FRAME = 64; const TILE = 48; const MARGIN = 8; const COLS = 8;
const isDirt = (r, g, b) => r > g + 12 && r > b + 25;
const px = (img, x, y) => { const i = (y * img.width + x) * 4; return [img.data[i], img.data[i + 1], img.data[i + 2], img.data[i + 3]]; };
const hex = (p) => '#' + p.slice(0, 3).map((v) => v.toString(16).padStart(2, '0')).join('');

// Posição de um slot: usa o JSON quando o frame existe pelo nome/índice; senão a fórmula do slot.
const slotPos = (k) => ({ x: (k % COLS) * FRAME, y: Math.floor(k / COLS) * FRAME });
const finishFrameFor = (m, v) => {
  const k = m * 2 + v;
  const byName = finishMeta.frames[`finish-m${String(m).padStart(2, '0')}-v${v}`];
  if (byName?.frame) return byName.frame;
  return { ...slotPos(k), w: FRAME, h: FRAME };
};
// Variantes do caminho para a máscara m: frames do JSON de vale-paths com mask === m.
const pathVariantsFor = (m) => Object.values(pathsMeta.frames).filter((f) => f.mask === m).map((f) => f.frame);

const report = { passou: true, erros: [], profundidadeAcima: {}, mascaras0e15: [], paleta: null, quadros: 0 };

// 6) Máscaras 0 e 15 transparentes.
for (const m of [0, 15]) for (let v = 0; v < 2; v += 1) {
  const fr = finishFrameFor(m, v); let opaque = 0;
  for (let y = 0; y < FRAME; y += 1) for (let x = 0; x < FRAME; x += 1) if (px(finish, fr.x + x, fr.y + y)[3] !== 0) opaque += 1;
  if (opaque) { report.passou = false; report.mascaras0e15.push(`m${m}-v${v}: ${opaque} px opacos`); }
}

// 5) Profundidade de grama sobre terra, por máscara e variante, contra as 3 variantes do caminho.
const depthAt = (pathFrame, u, v) => {
  // Mede, a partir de (u, v) do caminho (terra), quantos passos até achar grama, nas 4 direções.
  let best = Infinity;
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
    let steps = 0; let found = false;
    for (let s = 1; s <= MAX; s += 1) {
      const x = u + dx * s; const y = v + dy * s;
      if (x < 0 || y < 0 || x >= TILE || y >= TILE) { steps = s; found = true; break; } // sai do tile: conta como limite
      const p = px(paths, pathFrame.x + x, pathFrame.y + y);
      if (!(p[3] === 255 && isDirt(p[0], p[1], p[2]))) { steps = s; found = true; break; }
    }
    if (!found) steps = MAX + 1;
    best = Math.min(best, steps);
  }
  return best;
};

for (let m = 1; m <= 14; m += 1) {
  const variantsPath = pathVariantsFor(m);
  if (variantsPath.length !== 3) { report.passou = false; report.erros.push(`máscara ${m}: ${variantsPath.length} variantes no caminho (esperado 3)`); continue; }
  for (let v = 0; v < 2; v += 1) {
    const ff = finishFrameFor(m, v);
    report.quadros += 1;
    let over = 0;
    for (let pv = 0; pv < 3; pv += 1) {
      const pf = variantsPath[pv];
      for (let u = 0; u < TILE; u += 1) for (let w = 0; w < TILE; w += 1) {
        const f = px(finish, ff.x + MARGIN + u, ff.y + MARGIN + w);
        if (f[3] !== 255 || isDirt(f[0], f[1], f[2])) continue; // só grama opaca da franja
        const t = px(paths, pf.x + u, pf.y + w);
        if (!(t[3] === 255 && isDirt(t[0], t[1], t[2]))) continue; // o caminho só é terra neste pixel
        if (depthAt(pf, u, w) > MAX) over += 1;
      }
    }
    const key = `m${String(m).padStart(2, '0')}-v${v}`;
    report.profundidadeAcima[key] = over;
    if (over) report.passou = false;
  }
}

// 7) Paleta (opcional).
if (fs.existsSync(path.resolve(paletteFile))) {
  const pal = JSON.parse(fs.readFileSync(path.resolve(paletteFile), 'utf8'));
  const allowed = new Set([...pal.grama_v05.cores.map((c) => c.cor), ...pal.terra_caminhos_v02.cores.map((c) => c.cor),
    ...pal.pedras_e_detalhes.STONE, ...pal.pedras_e_detalhes.WARM_STONE, ...pal.pedras_e_detalhes.SNOW_STONE]);
  let off = 0; const bad = new Set();
  for (let y = 0; y < finish.height; y += 1) for (let x = 0; x < finish.width; x += 1) {
    const p = px(finish, x, y); if (p[3] === 0) continue;
    if (!allowed.has(hex(p))) { off += 1; bad.add(hex(p)); }
  }
  report.paleta = { pixelsForaDaPaleta: off, coresForaDaPaleta: [...bad].slice(0, 20) };
  if (off) report.passou = false;
}

if (VERBOSE) console.log(JSON.stringify(report, null, 2));
console.log(`Quadros de franja testados: ${report.quadros}`);
for (const [k, v] of Object.entries(report.profundidadeAcima)) if (v || VERBOSE) console.log(`  ${k}: ${v} px acima de ${MAX} px`);
for (const e of report.erros) console.log(`ERRO  ${e}`);
for (const e of report.mascaras0e15) console.log(`ERRO  máscara 0/15 não transparente: ${e}`);
if (report.paleta) console.log(`Paleta: ${report.paleta.pixelsForaDaPaleta} px fora da paleta`);
console.log(report.passou ? 'APROVADO' : 'REPROVADO');
process.exit(report.passou ? 0 : 1);
