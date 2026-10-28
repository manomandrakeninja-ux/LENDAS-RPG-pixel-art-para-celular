// G-armas: as armas pintadas em 4x. Cada forma desenha "em pé" no referencial local:
// a empunhadura fica na origem, a ponta para cima (y negativo), o cabo para baixo (y positivo),
// e a luz vem da esquerda (-x), que depois do giro de 45 graus vira o alto à esquerda.
// O material (tier) vem de `weaponStyle(item)`: lâmina, guarda, cabo, madeira, gema, brilho e gravura.
import { R, path, ellipse, fill, lin, vol, line, clip, gem, rng } from './kit.mjs';

// ---------- Materiais por conjunto ----------
const T = {
  couro: { blade: R.iron, fit: R.bronze, grip: R.leather, wood: R.wood, rank: 0, engrave: 'rust' },
  bosque: { blade: R.iron, fit: R.paleWood, grip: R.leather, wood: R.wood, rank: 0, crude: true, tie: R.leaf },
  ferro: { blade: R.iron, fit: R.iron, grip: R.leather, wood: R.wood, rank: 1 },
  malha: { blade: R.steel, fit: R.steel, grip: R.blue, wood: R.wood, rank: 1, fuller: true },
  brejo: { blade: R.bog, fit: R.bronze, grip: R.green, wood: R.wood, rank: 2, gem: R.green, glow: '#99e65f', engrave: 'moss' },
  prata: { blade: R.silver, fit: R.silver, grip: R.blue, wood: R.wood, rank: 2, gem: R.mithril, fuller: true, engrave: 'moon' },
  corsario: { blade: R.steel, fit: R.gold, grip: R.red, wood: R.wood, rank: 2, gem: R.red },
  coral: { blade: R.shell, fit: R.teal, grip: R.teal, wood: R.teal, rank: 2, gem: R.shell, prong: R.coral, engrave: 'scallop' },
  glacial: { blade: R.ice, fit: R.white, grip: R.blue, wood: R.white, rank: 3, gem: R.ice, glow: '#94fdff', engrave: 'frost', crystal: true },
  runico: { blade: R.indigo, fit: R.silver, grip: R.indigo, wood: R.indigo, rank: 3, gem: R.rune, glow: '#00cdf9', engrave: 'runes' },
  mithril: { blade: R.mithril, fit: R.silver, grip: R.blue, wood: R.white, rank: 3, gem: R.blue, engrave: 'filigree', fuller: true },
  faraonico: { blade: R.gold, fit: R.gold, grip: R.lapis, wood: R.gold, rank: 3, gem: R.lapis, engrave: 'hiero' },
  adamante: { blade: R.gunmetal, fit: R.gunmetal, grip: R.violet, wood: R.gunmetal, rank: 4, gem: R.violet, edge: R.violet, glow: '#ca52c9', engrave: 'crystal' },
  vulcanico: { blade: R.obsidian, fit: R.obsidian, grip: R.red, wood: R.obsidian, rank: 4, gem: R.lava, edge: R.lava, glow: '#ffa214', engrave: 'lava' },
  demoniaco: { blade: R.demon, fit: R.obsidian, grip: R.demon, wood: R.obsidian, rank: 4, gem: R.lava, glow: '#ea323c', engrave: 'veins' },
  celestial: { blade: R.white, fit: R.gold, grip: R.white, wood: R.white, rank: 5, gem: R.gold, glow: '#ffeb57', engrave: 'filigree', wings: true },
  abissal: { blade: R.abyss, fit: R.void, grip: R.void, wood: R.void, rank: 5, gem: R.violet, edge: R.violet, glow: '#ca52c9', engrave: 'void' },
  titanico: { blade: R.bronze, fit: R.gold, grip: R.leather, wood: R.wood, rank: 5, gem: R.lava, glow: '#ffc825', engrave: 'filigree', heavy: true }
};

/** Armas únicas (chefes, arremesso, Forja e ferramentas): material + variação de forma. */
const UNIQUE = {
  grokkAxe: { blade: R.steel, fit: R.bone, grip: R.leather, wood: R.wood, rank: 3, variant: 'double', engrave: 'notches', gem: R.red },
  hydraFang: { blade: R.bone, fit: R.green, grip: R.green, wood: R.wood, rank: 3, variant: 'fang', gem: R.green, glow: '#99e65f', engrave: 'venom' },
  captainSabre: { blade: R.ice, fit: R.teal, grip: R.teal, wood: R.wood, rank: 4, gem: R.ice, glow: '#94fdff', ghost: true },
  giantClub: { blade: R.ice, fit: R.white, grip: R.leather, wood: R.wood, rank: 4, variant: 'giant', glow: '#94fdff' },
  pharaohStaff: { blade: R.gold, fit: R.gold, grip: R.lapis, wood: R.gold, rank: 5, variant: 'ankh', gem: R.lapis, glow: '#00cdf9', engrave: 'hiero' },
  dragonClaw: { blade: R.demon, fit: R.gold, grip: R.demon, wood: R.wood, rank: 5, gem: R.lava, glow: '#ffa214', variant: 'dragon' },
  abyssBlade: { blade: R.obsidian, fit: R.demon, grip: R.void, wood: R.wood, rank: 5, gem: R.red, edge: R.red, glow: '#ea323c', engrave: 'lava', variant: 'great' },
  throwSpear1: { blade: R.iron, fit: R.leather, grip: R.leather, wood: R.paleWood, rank: 0, variant: 'javelin' },
  throwSpear2: { blade: R.steel, fit: R.iron, grip: R.blue, wood: R.wood, rank: 1, variant: 'javelin' },
  throwSpear3: { blade: R.mithril, fit: R.silver, grip: R.blue, wood: R.white, rank: 3, variant: 'javelin', gem: R.blue },
  'forge-rusty': { ...{ blade: R.iron, fit: R.bronze, grip: R.leather, wood: R.wood, rank: 0, engrave: 'rust' } },
  'forge-iron': { blade: R.iron, fit: R.iron, grip: R.leather, wood: R.wood, rank: 1 },
  'forge-steel': { blade: R.steel, fit: R.steel, grip: R.blue, wood: R.wood, rank: 2, gem: R.blue, fuller: true },
  'forge-legendary': { blade: R.gold, fit: R.gold, grip: R.red, wood: R.wood, rank: 3, gem: R.red, engrave: 'filigree' },
  'forge-dragon': { blade: R.demon, fit: R.obsidian, grip: R.demon, wood: R.wood, rank: 4, gem: R.gold, edge: R.lava, glow: '#ffa214', engrave: 'lava' },
  'forge-titan': { blade: R.bronze, fit: R.gold, grip: R.leather, wood: R.wood, rank: 5, gem: R.lava, glow: '#ffc825', engrave: 'filigree', heavy: true },
  'tool-pickaxe-stone': { blade: R.iron, fit: R.iron, grip: R.leather, wood: R.wood, rank: 0 },
  'tool-pickaxe-iron': { blade: R.steel, fit: R.steel, grip: R.leather, wood: R.wood, rank: 1 },
  'tool-hatchet': { blade: R.steel, fit: R.iron, grip: R.leather, wood: R.wood, rank: 0 },
  longbow: { blade: R.steel, fit: R.gold, grip: R.leather, wood: R.wood, rank: 2 }
};

/** Variação de forma pelo nome (khopesh, martelo, maça, cimitarra, faca goblin...). */
function variantFor(item) {
  const n = item.name ?? '';
  if (/Khopesh/.test(n)) return 'khopesh';
  if (/Cimitarra/.test(n)) return 'scimitar';
  if (/Martelo/.test(n)) return 'hammer';
  if (/Maça/.test(n)) return 'mace';
  if (/Goblin/.test(n)) return 'crude';
  if (/Concha/.test(n)) return 'shell';
  if (/Machado de Guerra|Adamante|Obsidiana/.test(n) && item.look === 'axe') return 'double';
  if (/Orc/.test(n)) return 'crude';
  if (/Cetro/.test(n)) return 'scepter';
  if (/Pirata|Capitão/.test(n)) return 'cutlass';
  return null;
}

export function weaponStyle(item) {
  const base = UNIQUE[item.id] ?? T[item.tierKey] ?? T.ferro;
  return { ...base, variant: base.variant ?? variantFor(item), id: item.id };
}
export const UNIQUE_STYLES = UNIQUE;

// ---------- Peças comuns ----------
const top = (r) => r[r.length - 1];
const mid = (r) => r[Math.floor(r.length / 2)];

/** Cabo enrolado (couro/tecido) de y0 a y1 com largura w. */
function grip(ctx, m, y0, y1, w = 2.2) {
  const p = path(ctx, [[-w / 2, y0], [w / 2, y0], [w / 2, y1], [-w / 2, y1]]);
  fill(ctx, p, lin(ctx, -w / 2, 0, w / 2, 0, m.grip));
  clip(ctx, p, () => { for (let y = Math.min(y0, y1) + 0.6; y < Math.max(y0, y1); y += 1.5) line(ctx, [[-w / 2, y + 0.7], [w / 2, y - 0.3]], 0.55, m.grip[0]); });
}

/** Pomo redondo (com gema nos tiers altos). */
function pommel(ctx, m, y, r = 1.7) {
  vol(ctx, ellipse(ctx, 0, y, r, r), m.fit, [-r, y - r, 2 * r, 2 * r], { ao: 0.25 });
  if (m.rank >= 3 && m.gem) gem(ctx, 0, y, r * 0.6, m.gem);
}

/** Guarda reta ou curvada, com gema no centro a partir do rank 2. */
function crossguard(ctx, m, y, half = 4.6, h = 1.8) {
  const curl = m.rank >= 3 ? 1.6 : m.rank >= 1 ? 0.6 : 0;
  const p = path(ctx, [[-half, y - curl], [-half + 1.2, y - h / 2 - 0.3], [0, y - h / 2 - 0.6], [half - 1.2, y - h / 2 - 0.3], [half, y - curl],
    [half, y - curl + h * 0.9], [half - 1.4, y + h / 2], [1.4, y + h / 2 + 0.4], [-1.4, y + h / 2 + 0.4], [-half + 1.4, y + h / 2], [-half, y - curl + h * 0.9]]);
  fill(ctx, p, lin(ctx, 0, y - h, 0, y + h, m.fit));
  line(ctx, [[-half + 0.6, y - curl + 0.2], [-1, y - h / 2 + 0.1]], 0.6, top(m.fit));
  if (m.wings) for (const s of [-1, 1]) fill(ctx, path(ctx, [[s * 1.5, y - 0.5], [s * (half + 2.6), y - 4.2], [s * (half + 1.6), y - 1.6], [s * (half + 2.4), y - 1.2], [s * half, y + 0.6]]), lin(ctx, s * 2, y - 4, s * half, y + 1, R.white));
  if (m.rank >= 2 && m.gem) gem(ctx, 0, y, 1.35, m.gem);
}

/** Lâmina reta de espada: dois chanfros, fio claro à esquerda, sulco central e ponta. */
function straightBlade(ctx, m, y0, len, w0, w1 = w0 * 0.85, tipLen = 4) {
  const y1 = y0 - len;
  const outline = [[-w0 / 2, y0], [w0 / 2, y0], [w1 / 2, y1 + tipLen], [0, y1], [-w1 / 2, y1 + tipLen]];
  if (m.crude) { outline.splice(2, 0, [w0 / 2 + 0.6, y0 - len * 0.4], [w0 / 2 - 0.2, y0 - len * 0.55], [w0 / 2 + 0.5, y0 - len * 0.7]); }
  const p = path(ctx, outline);
  fill(ctx, p, mid(m.blade));
  clip(ctx, p, () => {
    // Chanfro iluminado (esquerda) e na sombra (direita).
    fill(ctx, path(ctx, [[-w0, y0 + 1], [0, y0 + 1], [0, y1], [-w0, y1]]), lin(ctx, -w0 / 2, y1, 0, y0, m.blade.slice(Math.floor(m.blade.length / 2))));
    fill(ctx, path(ctx, [[0, y0 + 1], [w0, y0 + 1], [w0, y1], [0, y1]]), lin(ctx, 0, y1, w0 / 2, y0, m.blade.slice(0, Math.ceil(m.blade.length / 2) + 1)));
    if (m.edge) { line(ctx, [[-w0 / 2, y0], [-w1 / 2, y1 + tipLen], [0, y1]], 1.2, top(m.edge)); line(ctx, [[w0 / 2, y0], [w1 / 2, y1 + tipLen], [0, y1]], 1.2, m.edge[1]); }
    else line(ctx, [[-w0 / 2 + 0.3, y0 - 0.5], [-w1 / 2 + 0.3, y1 + tipLen], [0, y1 + 0.3]], 0.8, top(m.blade));
    if (m.fuller || m.rank >= 3) line(ctx, [[0, y0 - 1], [0, y1 + tipLen + 1]], 0.9, m.blade[1]);
    engrave(ctx, m, y0 - 1.2, y1 + tipLen + 1.5, w0);
  });
}

/** Gravuras e efeitos sobre a lâmina (dentro do recorte). */
function engrave(ctx, m, yA, yB, w) {
  const r = rng(m.id?.length * 97 + 13 || 7);
  const span = yA - yB;
  switch (m.engrave) {
    case 'rust':
      for (let i = 0; i < 6; i += 1) fill(ctx, ellipse(ctx, (r() - 0.5) * w * 0.8, yA - r() * span, 0.7 + r() * 0.6, 0.6 + r() * 0.5), r() > 0.5 ? '#8a4836' : '#5d2c28');
      break;
    case 'moss':
      for (let i = 0; i < 4; i += 1) fill(ctx, ellipse(ctx, (r() - 0.2) * w * 0.6, yA - r() * span * 0.6, 0.9, 0.7), '#33984b');
      break;
    case 'runes':
      for (let y = yA - 1.5; y > yB + 1; y -= 3) { line(ctx, [[-0.6, y + 0.9], [0.5, y], [-0.4, y - 0.9]], 0.55, '#94fdff'); }
      break;
    case 'frost':
      line(ctx, [[-w * 0.2, yA], [w * 0.15, yA - span * 0.3], [-w * 0.1, yA - span * 0.55], [w * 0.2, yA - span * 0.8]], 0.6, '#ffffff');
      break;
    case 'lava':
      line(ctx, [[0, yA], [w * 0.2, yA - span * 0.2], [-w * 0.15, yA - span * 0.45], [w * 0.15, yA - span * 0.7], [0, yB]], 0.9, '#ff5000');
      line(ctx, [[0, yA], [w * 0.2, yA - span * 0.2], [-w * 0.15, yA - span * 0.45]], 0.45, '#ffeb57');
      break;
    case 'veins':
      line(ctx, [[-w * 0.15, yA], [w * 0.1, yA - span * 0.35], [-w * 0.1, yA - span * 0.7]], 0.6, '#ffa214');
      break;
    case 'filigree':
      line(ctx, [[0, yA], [-w * 0.18, yA - 1.5], [0, yA - 3], [w * 0.18, yA - 4.5], [0, yA - 6]], 0.55, m.fit === R.gold ? '#ffc825' : '#edab50');
      break;
    case 'hiero':
      for (let y = yA - 1.5; y > yB + 2; y -= 3.2) fill(ctx, path(ctx, [[-0.6, y], [0.6, y], [0, y - 1.3]]), '#0069aa');
      break;
    case 'crystal':
      for (let y = yA - 2; y > yB + 2; y -= 4) fill(ctx, path(ctx, [[0, y], [0.7, y - 1.2], [0, y - 2.4], [-0.7, y - 1.2]]), '#ca52c9');
      break;
    case 'void':
      for (let y = yA - 2; y > yB + 2; y -= 3.5) fill(ctx, ellipse(ctx, 0, y, 0.6, 0.8), '#fdd2ed');
      break;
    case 'moon':
      fill(ctx, ellipse(ctx, 0, yA - 2.2, 0.9, 0.9), '#ffffff');
      break;
    default:
  }
}

/** Haste de madeira (ou metal) com veio claro à esquerda. */
function shaft(ctx, m, y0, y1, w = 2, ramp = m.wood) {
  const p = path(ctx, [[-w / 2, y0], [w / 2, y0], [w / 2, y1], [-w / 2, y1]]);
  fill(ctx, p, lin(ctx, -w / 2, 0, w / 2, 0, ramp));
  if (ramp === R.wood || ramp === R.paleWood) clip(ctx, p, () => { for (let y = y0 - 3; y > y1; y -= 5.5) line(ctx, [[-w / 2 + 0.2, y], [-w / 2 + 0.5, y - 1.6]], 0.45, ramp[1]); });
}

/** Faixas de metal/couro na haste. */
function band(ctx, ramp, y, w = 2.6, h = 1.1) {
  fill(ctx, path(ctx, [[-w / 2, y - h / 2], [w / 2, y - h / 2], [w / 2, y + h / 2], [-w / 2, y + h / 2]]), lin(ctx, -w / 2, 0, w / 2, 0, ramp));
}

// ---------- Formas ----------
export const SHAPES = {
  sword: {
    len: 34, grip: 4.5,
    paint(ctx, m) {
      const heavy = m.heavy || m.variant === 'great';
      pommel(ctx, m, 3.2, heavy ? 2.1 : 1.7);
      grip(ctx, m, 1.8, -3.8, heavy ? 2.6 : 2.2);
      if (m.variant === 'shell') {
        const p = path(ctx, [[-2.2, -5], [2.4, -5], [3.2, -12], [2.4, -20], [1, -27], [0, -29.5], [-1.4, -25], [-2.6, -16]]);
        fill(ctx, p, lin(ctx, -3, -20, 3, -8, m.blade));
        clip(ctx, p, () => { for (let y = -8; y > -28; y -= 3.4) line(ctx, [[-3, y + 1.2], [0, y], [3, y + 1.2]], 0.7, R.coral[2]); });
        crossguard(ctx, { ...m, fit: R.teal }, -4.6, 4.2);
        return;
      }
      straightBlade(ctx, m, -5, heavy ? 25.5 : 24.5, heavy ? 5.2 : 4.2, heavy ? 4.6 : 3.6, heavy ? 5 : 4);
      crossguard(ctx, m, -4.6, heavy ? 5.6 : 4.8, heavy ? 2.2 : 1.8);
    }
  },
  dagger: {
    len: 22, grip: 4,
    paint(ctx, m) {
      pommel(ctx, m, 2.7, 1.4);
      if (m.variant === 'fang') {
        grip(ctx, { ...m, grip: R.green }, 1.6, -3.2, 2.2);
        const p = path(ctx, [[-2, -4], [2.2, -4], [2.4, -9], [1.2, -14], [-1.2, -18.2], [-0.6, -13], [-1.8, -8]]);
        vol(ctx, p, R.bone, [-2, -18, 4.4, 14], { lx: 0.2, ao: 0.2 });
        line(ctx, [[0.3, -5], [0, -11], [-0.8, -15]], 0.7, '#5ac54f');
        fill(ctx, ellipse(ctx, 0, -4, 3.2, 1.2), lin(ctx, 0, -5, 0, -3, R.green));
        return;
      }
      grip(ctx, m, 1.6, -2.8, 2);
      straightBlade(ctx, m, -4, 13.5, m.crude ? 3.8 : 3.4, m.crude ? 3 : 2.4, 3.5);
      crossguard(ctx, m, -3.6, m.crude ? 2.8 : 3.4, 1.5);
    }
  },
  sabre: {
    len: 33, grip: 4.5,
    paint(ctx, m) {
      pommel(ctx, m, 3, 1.5);
      grip(ctx, m, 1.8, -3.6, 2.1);
      const k = m.variant === 'khopesh';
      const wide = m.variant === 'scimitar';
      // Lâmina curva (curva para a esquerda/cima; fio na esquerda), ou gancho do khopesh.
      const pts = k
        ? [[-1.6, -4.8], [1.6, -4.8], [1.6, -14], [0.8, -19], [-2.5, -24.5], [-6.5, -26], [-9, -24], [-6.6, -24.2], [-3.4, -21.4], [-1.4, -17.4], [-1.6, -12]]
        : wide
          ? [[-1.8, -4.8], [1.6, -4.8], [2.2, -12], [2.4, -19], [1.2, -25], [-1.6, -30.5], [-3.6, -26], [-3.8, -18], [-2.6, -11]]
          : [[-1.7, -4.8], [1.5, -4.8], [1.9, -13], [1.3, -21], [-0.4, -27], [-2.8, -30.5], [-2.8, -25], [-2.8, -17], [-2.2, -10]];
      const p = path(ctx, pts);
      fill(ctx, p, lin(ctx, -4, -20, 3, -10, m.blade));
      clip(ctx, p, () => {
        line(ctx, pts.slice(k ? 6 : 5).concat([pts[0]]).reverse(), 0.9, top(m.blade));
        line(ctx, [[1.2, -5], [1.4, -13], [0.8, -20]], 0.8, m.blade[0]);
        if (m.ghost) for (let y = -8; y > -27; y -= 4.5) fill(ctx, ellipse(ctx, -0.6, y, 0.6, 1.1), '#ffffff');
        if (m.engrave === 'hiero') engrave(ctx, m, -7, -20, 3);
        if (m.edge) line(ctx, pts.slice(k ? 6 : 5).concat([pts[0]]).reverse(), 1.1, top(m.edge));
      });
      // Guarda em concha (sabre/cutelo) ou barra curta.
      if (m.variant === 'cutlass' || m.fit === R.gold && !k) {
        const bow = new ctx.Path2D();
        bow.moveTo(1.6, -4.6); bow.bezierCurveTo(5.4, -4.4, 5, 2.6, 1.2, 3.4);
        ctx.save(); ctx.strokeStyle = mid(m.fit); ctx.lineWidth = 1.1; ctx.stroke(bow); ctx.restore();
        fill(ctx, ellipse(ctx, 0.6, -4.6, 3.6, 1.6), lin(ctx, -3, -6, 3, -3, m.fit));
      } else crossguard(ctx, m, -4.6, 3.6, 1.6);
      if (m.rank >= 2 && m.gem) gem(ctx, 0, -4.6, 1.2, m.gem);
    }
  },
  axe: {
    len: 32, grip: 6,
    paint(ctx, m) {
      const dbl = m.variant === 'double';
      const crude = m.variant === 'crude' || m.crude;
      shaft(ctx, m, 6, -26.5, 2.3);
      band(ctx, m.grip, 2.6, 2.7, 1.3); band(ctx, m.grip, 0.6, 2.7, 1.3); band(ctx, m.grip, -1.4, 2.7, 1.3);
      fill(ctx, ellipse(ctx, 0, 6.2, 1.5, 1.1), mid(m.fit));
      // Cabeça: lâmina em meia-lua à direita; à esquerda, ponta de trás ou segunda lâmina.
      const blade = (s, big) => {
        const reach = big ? 10.5 : 8.6;
        const pts = crude
          ? [[s * 1.1, -25.5], [s * 4, -27.8], [s * (reach + 0.2), -29], [s * (reach - 1.2), -24], [s * (reach + 0.4), -19.5], [s * 4.4, -17.5], [s * 1.1, -19]]
          : [[s * 1.1, -25.8], [s * 4.2, -26.8], [s * (reach - 1), -30.4], [s * reach, -25], [s * (reach - 0.6), -18.5], [s * (reach - 1.6), -15.6], [s * 4.2, -18.6], [s * 1.1, -19.6]];
        const p = path(ctx, pts);
        fill(ctx, p, lin(ctx, s * 2, -30, s * reach, -16, s < 0 ? m.blade : m.blade.slice().reverse().reverse()));
        clip(ctx, p, () => {
          fill(ctx, path(ctx, [[s * 1, -26], [s * reach, -31], [s * reach, -23], [s * 1, -22]]), lin(ctx, 0, -30, 0, -22, m.blade.slice(Math.floor(m.blade.length / 2))));
          line(ctx, [[s * (reach - 1), -30.4], [s * reach, -25], [s * (reach - 0.6), -18.5], [s * (reach - 1.6), -15.6]], 1.1, s < 0 ? top(m.blade) : m.blade[Math.max(0, m.blade.length - 2)]);
          if (m.edge) line(ctx, [[s * (reach - 1), -30.4], [s * reach, -25], [s * (reach - 0.6), -18.5]], 1.1, top(m.edge));
          if (m.engrave === 'notches') for (const y of [-27, -21]) fill(ctx, path(ctx, [[s * reach, y], [s * (reach - 1.3), y + 0.7], [s * reach, y + 1.4]]), '#00000000');
          if (m.engrave && m.engrave !== 'notches') engrave(ctx, m, -19.5, -29, 6);
          if (m.engrave === 'lava') line(ctx, [[s * 3, -24], [s * 5.5, -22.5], [s * 7, -25]], 0.8, '#ff5000');
        });
      };
      if (dbl) blade(-1, false);
      else {
        // Contrapeso/ponta de trás.
        fill(ctx, path(ctx, [[-1, -25], [-4.6, -23.8], [-5.4, -22.6], [-1, -20.8]]), lin(ctx, -5, -25, -1, -20, m.blade));
      }
      blade(1, true);
      // Olho da cabeça (alvado) com rebite/gema.
      fill(ctx, path(ctx, [[-1.6, -27.6], [1.6, -27.6], [1.8, -18], [-1.8, -18]]), lin(ctx, -2, 0, 2, 0, m.fit));
      fill(ctx, path(ctx, [[-1.2, -28.8], [1.2, -28.8], [0, -30.4]]), mid(m.fit));
      if (m.gem) gem(ctx, 0, -22.8, 1.15, m.gem);
      else fill(ctx, ellipse(ctx, 0, -22.8, 0.8, 0.8), top(m.fit));
      if (m.tie) line(ctx, [[1.2, -16.4], [2.6, -13.4], [2, -11]], 1, m.tie[3]);
    }
  },
  spear: {
    len: 40, grip: 12,
    paint(ctx, m) {
      const jav = m.variant === 'javelin';
      const w = jav ? 1.6 : 2;
      shaft(ctx, m, 12, -21.5, w);
      // Ponteira do cabo.
      fill(ctx, path(ctx, [[-w / 2 - 0.3, 10.6], [w / 2 + 0.3, 10.6], [0, 12.6]]), mid(m.fit));
      if (jav) {
        // Penas no cabo e alça de arremesso: a lança de arremesso não se confunde com a de estocada.
        for (const s of [-1, 1]) fill(ctx, path(ctx, [[s * 0.6, 10], [s * 3.4, 11.6], [s * 3.2, 7.4], [s * 0.6, 5.6]]), s < 0 ? '#f9e6cf' : '#c42430');
        line(ctx, [[0, 9], [0, 6]], 0.5, '#5d2c28');
        fill(ctx, ellipse(ctx, 1.7, -2, 1.5, 3), '#00000000');
        ctx.save(); ctx.strokeStyle = mid(m.grip); ctx.lineWidth = 0.9; ctx.beginPath(); ctx.ellipse(1.6, -1.5, 1.6, 2.8, 0, -Math.PI / 2, Math.PI / 2); ctx.stroke(); ctx.restore();
        band(ctx, m.grip, -1.5, 2.2, 3.2);
      } else {
        band(ctx, m.grip, 1, 2.6, 3.4);
      }
      // Alvado com amarração.
      fill(ctx, path(ctx, [[-1.3, -20.5], [1.3, -20.5], [1.1, -24], [-1.1, -24]]), lin(ctx, -1.3, 0, 1.3, 0, m.fit));
      band(ctx, m.fit, -21, 2.8, 0.9);
      // Ponta: folha (lança), farpada e estreita (arremesso), cristal (glacial).
      const pts = jav
        ? [[-1, -23.6], [-2.6, -24.6], [-1.2, -26.6], [0, -33], [1.2, -26.6], [2.6, -24.6], [1, -23.6]]
        : m.crystal
          ? [[-1.2, -23.6], [-3, -27], [-1.6, -31], [0, -35.6], [1.6, -31], [3, -27], [1.2, -23.6]]
          : [[-1.2, -23.6], [-3.1, -27.4], [-2.4, -31], [0, -35.4], [2.4, -31], [3.1, -27.4], [1.2, -23.6]];
      const p = path(ctx, pts);
      fill(ctx, p, mid(m.blade));
      clip(ctx, p, () => {
        fill(ctx, path(ctx, [[-4, -22], [0, -22], [0, -36], [-4, -36]]), lin(ctx, -3, -34, 0, -24, m.blade.slice(Math.floor(m.blade.length / 2))));
        fill(ctx, path(ctx, [[0, -22], [4, -22], [4, -36], [0, -36]]), lin(ctx, 0, -34, 3, -24, m.blade.slice(0, Math.ceil(m.blade.length / 2) + 1)));
        line(ctx, [[0, -24], [0, -34]], 0.7, top(m.blade));
        if (m.engrave === 'frost' || m.crystal) line(ctx, [[-1.5, -27], [0, -30], [1.4, -28]], 0.5, '#ffffff');
      });
      if (m.gem) gem(ctx, 0, -22.4, 1.05, m.gem);
      // Borla vermelha (lança de caça) / fita.
      if (!jav && m.rank <= 1) { line(ctx, [[1.2, -21], [2.6, -18], [2.2, -15.5]], 1.1, '#c42430'); line(ctx, [[1.2, -21], [3.2, -18.4]], 0.7, '#ea323c'); }
      if (!jav && m.crystal) { line(ctx, [[1.2, -21], [2.8, -18.4], [2.4, -15.8]], 1, '#d5e8ef'); }
    }
  },
  trident: {
    len: 38, grip: 12,
    paint(ctx, m) {
      shaft(ctx, m, 12, -21, 2);
      fill(ctx, path(ctx, [[-1.3, 10.6], [1.3, 10.6], [0, 12.6]]), mid(m.fit));
      band(ctx, m.grip, 1, 2.6, 3.6);
      const tine = m.prong ?? m.blade;
      // Travessa curva.
      const bar = path(ctx, [[-5.4, -23.6], [-3.6, -21.4], [0, -20.4], [3.6, -21.4], [5.4, -23.6], [4.2, -24.4], [0, -22.6], [-4.2, -24.4]]);
      fill(ctx, bar, lin(ctx, 0, -25, 0, -20, m.fit));
      for (const [x, tip, w] of [[-4.6, -31.5, 1.3], [0, -35.6, 1.5], [4.6, -31.5, 1.3]]) {
        const p = path(ctx, [[x - w / 2, -23.5], [x + w / 2, -23.5], [x + w / 2, tip + 3], [x + w * 1.2, tip + 3.6], [x, tip], [x - w * 1.2, tip + 3.6], [x - w / 2, tip + 3]]);
        fill(ctx, p, lin(ctx, x - w, 0, x + w, 0, tine));
        line(ctx, [[x - w / 2 + 0.2, -24], [x - w / 2 + 0.2, tip + 3]], 0.5, top(tine));
      }
      if (m.gem) gem(ctx, 0, -22.4, 1.2, m.gem);
      if (m.engrave === 'moss') { line(ctx, [[-1, -21], [-2.6, -17.5], [-1.6, -14.5]], 0.9, '#33984b'); line(ctx, [[1, -21.4], [2, -18.6]], 0.8, '#1e6f50'); }
      if (m.glow && m.rank >= 4) line(ctx, [[0, -24], [0, -33]], 0.5, '#ffeb57');
    }
  },
  staff: {
    len: 40, grip: 14,
    paint(ctx, m) {
      const metal = m.variant === 'scepter' || m.variant === 'ankh';
      if (metal) {
        shaft(ctx, m, 14, -24, 1.9, m.fit);
        for (const y of [8, 0, -8, -16]) band(ctx, m.grip, y, 2.5, 1.1);
        fill(ctx, ellipse(ctx, 0, 14, 1.4, 1.4), mid(m.fit));
      } else {
        // Galho torto.
        const p = path(ctx, [[-1.1, 14], [1.1, 14], [1.4, 6], [0.8, -2], [1.5, -10], [1, -18], [1.6, -23], [-1.4, -23], [-0.6, -17], [-1.2, -9], [-0.5, -1], [-1.3, 7]]);
        fill(ctx, p, lin(ctx, -1.4, 0, 1.6, 0, m.wood === R.wood ? R.wood : m.wood));
        clip(ctx, p, () => { for (let y = 10; y > -22; y -= 6) fill(ctx, ellipse(ctx, 0.3, y, 0.5, 0.7), R.wood[0]); });
        band(ctx, m.grip, 1, 2.8, 3.8);
      }
      // Cabeça.
      const cy = -29;
      if (m.variant === 'ankh') {
        ctx.save(); ctx.strokeStyle = mid(m.fit); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.ellipse(0, cy - 1.5, 2.6, 3.6, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
        ctx.save(); ctx.strokeStyle = top(m.fit); ctx.lineWidth = 0.6; ctx.beginPath(); ctx.ellipse(0, cy - 1.5, 2.6, 3.6, 0, Math.PI, Math.PI * 1.6); ctx.stroke(); ctx.restore();
        fill(ctx, path(ctx, [[-5.4, cy + 1.6], [5.4, cy + 1.6], [5.4, cy + 3.2], [-5.4, cy + 3.2]]), lin(ctx, 0, cy + 1, 0, cy + 4, m.fit));
        gem(ctx, 0, cy - 1.5, 1.6, R.lapis);
        for (const s of [-1, 1]) fill(ctx, path(ctx, [[s * 1.2, cy + 3.4], [s * 6, cy + 6.6], [s * 4, cy + 4.2]]), m.fit[3]);
        return;
      }
      const orb = m.gem ?? R.green;
      // Garras que seguram a esfera.
      for (const s of [-1, 1]) line(ctx, [[s * 0.8, -22.5], [s * 4.6, -25.6], [s * 4.6, -31], [s * 2, -34.4]], 1.3, metal ? mid(m.fit) : m.wood[2]);
      if (m.wings) for (const s of [-1, 1]) fill(ctx, path(ctx, [[s * 2.6, -26], [s * 8, -33], [s * 7, -28.6], [s * 8.2, -27.4], [s * 4, -24.4]]), lin(ctx, s * 3, -33, s * 7, -24, R.white));
      if (m.engrave === 'runes') for (const s of [-1, 1]) fill(ctx, path(ctx, [[s * 3, -24.6], [s * 6.2, -30], [s * 3.8, -27.6]]), R.silver[3]);
      vol(ctx, ellipse(ctx, 0, cy, 4.2, 4.2), orb, [-4.2, cy - 4.2, 8.4, 8.4], { ao: 0.2 });
      fill(ctx, ellipse(ctx, -1.6, cy - 1.7, 1.2, 1.1), '#ffffff');
      if (m.engrave === 'runes') line(ctx, [[-0.5, cy + 1.6], [0.6, cy], [-0.4, cy - 1.4]], 0.5, '#ffffff');
      for (const s of [-1, 1]) line(ctx, [[s * 4.6, -31], [s * 2, -34.4]], 1, metal ? top(m.fit) : m.wood[3]);
      if (!metal && m.tie !== null) { line(ctx, [[-1, -21], [-3.4, -17.5], [-2.6, -14]], 0.9, '#33984b'); fill(ctx, ellipse(ctx, -3.2, -16.6, 1.1, 0.7, 0.6), '#5ac54f'); }
    }
  },
  club: {
    len: 30, grip: 5,
    paint(ctx, m) {
      const v = m.variant;
      if (v === 'hammer') {
        shaft(ctx, m, 5, -22, 2.4);
        band(ctx, m.grip, 1, 2.9, 4);
        fill(ctx, ellipse(ctx, 0, 5.4, 1.5, 1.2), mid(m.fit));
        const head = path(ctx, [[-7.4, -27.6], [7.4, -27.6], [7.6, -19.4], [-7.6, -19.4]]);
        vol(ctx, head, m.blade, [-7.6, -27.6, 15.2, 8.2], { lx: 0.2, ly: 0.1, ao: 0.4 });
        for (const s of [-1, 1]) fill(ctx, path(ctx, [[s * 7.4, -27.6], [s * 8.8, -26.4], [s * 8.8, -20.6], [s * 7.6, -19.4]]), lin(ctx, 0, -28, 0, -19, m.fit));
        fill(ctx, path(ctx, [[-2.6, -28], [2.6, -28], [2.6, -19], [-2.6, -19]]), lin(ctx, -3, 0, 3, 0, m.fit));
        line(ctx, [[-7, -27], [7, -27]], 0.7, top(m.blade));
        GLYPH_STAR(ctx, 0, -23.5, 1.8, '#ffeb57');
        if (m.gem) gem(ctx, 0, -17.8, 1, m.gem);
        return;
      }
      if (v === 'mace') {
        shaft(ctx, m, 5, -20, 2, m.fit);
        band(ctx, m.grip, 1, 2.6, 4.4);
        fill(ctx, ellipse(ctx, 0, 5.4, 1.6, 1.3), mid(m.fit));
        vol(ctx, ellipse(ctx, 0, -24, 3.8, 4.4), m.blade, [-4, -28.4, 8, 8.8], { ao: 0.35 });
        for (const [x, y, w, h] of [[-5.6, -24, 2.2, 5.4], [5.6, -24, 2.2, 5.4], [0, -29.8, 5, 2], [-3.6, -27.8, 2, 2.4], [3.6, -27.8, 2, 2.4]]) {
          vol(ctx, ellipse(ctx, x, y, w / 2 + 0.3, h / 2 + 0.3), m.blade, [x - w, y - h, w * 2, h * 2], { ao: 0.2 });
        }
        fill(ctx, ellipse(ctx, 0, -32.2, 1, 1.4), mid(m.blade));
        line(ctx, [[-2.5, -25.5], [-1.6, -27]], 0.7, top(m.blade));
        return;
      }
      // Clava (madeira ou tronco de gelo do gigante) com cravos.
      const giant = v === 'giant';
      grip(ctx, m, 4.5, -4, 2.2);
      const p = path(ctx, [[-1.4, -4], [1.4, -4], [3.4, -14], [4.8, -22], [4, -28], [0, -30.6], [-4, -28], [-4.6, -22], [-3.2, -14]]);
      vol(ctx, p, m.wood, [-4.8, -30.6, 9.6, 27], { lx: 0.25, ly: 0.3, ao: 0.3 });
      clip(ctx, p, () => {
        for (let y = -8; y > -28; y -= 4) line(ctx, [[-3.4, y], [-1.4, y - 1.5]], 0.5, m.wood[1]);
        if (giant) {
          fill(ctx, path(ctx, [[-5, -31], [5, -31], [5, -22], [2, -24], [-1, -21], [-5, -23]]), lin(ctx, -4, -30, 4, -21, R.ice));
          line(ctx, [[-3, -29], [-1, -26]], 0.6, '#ffffff');
        }
      });
      const spikes = giant ? [[-4.6, -24], [4.8, -22], [-4.2, -16], [3.8, -15], [0, -30.6], [-3.6, -28.4], [3.6, -28.2]] : [[-4.4, -22], [4.6, -21], [-3.4, -15], [3.4, -14], [0, -30.4]];
      for (const [x, y] of spikes) {
        const a = Math.atan2(y + 20, x);
        const tipX = x + Math.cos(a) * 2.6; const tipY = y + Math.sin(a) * 2.6;
        fill(ctx, path(ctx, [[x - Math.sin(a) * 0.9, y + Math.cos(a) * 0.9], [tipX, tipY], [x + Math.sin(a) * 0.9, y - Math.cos(a) * 0.9]]), giant ? R.ice[4] : mid(m.fit === R.paleWood ? R.iron : m.fit));
      }
    }
  },
  claw: {
    len: 20, grip: 4,
    paint(ctx, m) {
      // Garra de punho (katar): barra de empunhadura, braçadeira e três lâminas curvas.
      const frame = path(ctx, [[-4.6, 4], [4.6, 4], [5, -6], [3.4, -7.6], [-3.4, -7.6], [-5, -6]]);
      vol(ctx, frame, m.fit, [-5, -7.6, 10, 11.6], { ao: 0.4 });
      fill(ctx, path(ctx, [[-3, 2.2], [3, 2.2], [3.2, -5], [-3.2, -5]]), m.grip[0]);
      band(ctx, m.grip, -1.4, 6.2, 2);
      line(ctx, [[-4.4, 3.6], [-4.6, -6]], 0.6, top(m.fit));
      if (m.gem) gem(ctx, 0, -6.4, 1.3, m.gem);
      for (const [x, lean, h] of [[-2.8, -1.6, 9], [0, -0.6, 11.5], [2.8, 0.6, 9.5]]) {
        const p = path(ctx, [[x - 0.9, -7.4], [x + 0.9, -7.4], [x + 1.1 + lean * 0.4, -7.4 - h * 0.55], [x + lean, -7.4 - h], [x - 0.4 + lean * 0.3, -7.4 - h * 0.55]]);
        fill(ctx, p, lin(ctx, x - 1, -7 - h, x + 1, -7, m.blade));
        line(ctx, [[x - 0.6, -7.6], [x - 0.2 + lean * 0.3, -7.4 - h * 0.6], [x + lean, -7.4 - h]], 0.55, top(m.blade));
      }
      if (m.variant === 'dragon') for (const s of [-1, 1]) fill(ctx, path(ctx, [[s * 4.8, -3], [s * 7, -1.2], [s * 5, 0.6]]), m.fit[2]);
    }
  },
  bow: {
    len: 38, grip: 19,
    paint(ctx, m) {
      // Arco recurvo: barriga para a esquerda (alto à esquerda depois do giro), corda reta.
      const pts = [];
      for (let i = 0; i <= 30; i += 1) {
        const t = i / 30;
        const y = 18 - t * 36;
        const x = -Math.sin(t * Math.PI) * 5 + Math.sin(t * Math.PI * 2) * 0 + (t < 0.08 ? (0.08 - t) * 14 : t > 0.92 ? (t - 0.92) * 14 : 0);
        pts.push([x, y]);
      }
      line(ctx, [[1, 18.6], [1, -18.6]], 0.6, '#f9e6cf');
      line(ctx, pts, 2.2, m.wood[1]);
      line(ctx, pts.map(([x, y]) => [x - 0.5, y]), 1, m.wood[3]);
      band(ctx, m.grip, 0, 2.8, 4.4);
      for (const y of [18.2, -18.2]) fill(ctx, ellipse(ctx, 1, y, 1, 1), mid(m.fit));
    }
  },
  pickaxe: {
    len: 28, grip: 5,
    paint(ctx, m) {
      shaft(ctx, m, 5, -24, 2.2);
      band(ctx, m.grip, 1, 2.6, 3.4);
      const p = path(ctx, [[-8.4, -18.6], [-5.6, -23], [0, -25.6], [5.6, -23], [8.4, -18.6], [5.4, -21.4], [0, -22.8], [-5.4, -21.4]]);
      fill(ctx, p, lin(ctx, 0, -27, 0, -19, m.blade));
      line(ctx, [[-7.6, -19.4], [-5.2, -22.6], [0, -25], [5, -22.8]], 0.7, top(m.blade));
      fill(ctx, path(ctx, [[-1.6, -27], [1.6, -27], [1.6, -21.6], [-1.6, -21.6]]), lin(ctx, -2, 0, 2, 0, m.fit));
    }
  },
  hatchet: {
    len: 24, grip: 5,
    paint(ctx, m) {
      shaft(ctx, m, 5, -18, 2);
      band(ctx, m.grip, 1, 2.5, 3.4);
      const p = path(ctx, [[1, -18.6], [4, -19.6], [7.4, -22], [7.8, -17], [7, -12.4], [4, -14], [1, -14.4]]);
      fill(ctx, p, lin(ctx, 1, -21, 8, -12, m.blade));
      line(ctx, [[7.4, -22], [7.8, -17], [7, -12.4]], 1, top(m.blade));
      fill(ctx, path(ctx, [[-1.4, -20], [1.4, -20], [1.5, -14], [-1.5, -14]]), lin(ctx, -2, 0, 2, 0, m.fit));
    }
  }
};

function GLYPH_STAR(ctx, x, y, r, c) {
  const pts = [];
  for (let i = 0; i < 10; i += 1) { const a = -Math.PI / 2 + (i * Math.PI) / 5; const rr = i % 2 ? r * 0.45 : r; pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]); }
  fill(ctx, path(ctx, pts), c);
}

/**
 * Pinta a arma no contexto (32 x 32 unidades). mode 'icon': cabe no ícone (centro no meio, escala para
 * preencher a diagonal); mode 'hand': escala 1, com a empunhadura em `grip` (x, y do sprite).
 * Devolve onde ficou a ponta (para o brilho).
 */
export function paintWeapon(ctx, shapeKey, m, { mode = 'icon', grip: at = [8, 24], box = 32, inset = 0, widen = 1 } = {}) {
  const shape = SHAPES[shapeKey] ?? SHAPES.sword;
  const len = shape.len;
  let s; let ox; let oy;
  const k = Math.SQRT1_2;
  if (mode === 'icon') {
    s = Math.min(1.5, (box - inset * 2) * 1.32 / len);
    // Centro da arma (meio do comprimento) no meio do quadro.
    const cLocal = -(len / 2 - shape.grip);
    ox = box / 2 - (-cLocal * s) * k; oy = box / 2 + (-cLocal * s) * k;
    // Armas largas (garra, machado de 2 lâminas) não precisam encher tanto.
  } else {
    s = 1; [ox, oy] = at;
  }
  ctx.save();
  ctx.translate(ox, oy);
  ctx.rotate(Math.PI / 4);
  ctx.scale(s * widen, s);
  shape.paint(ctx, m);
  ctx.restore();
  const tipLocal = len - shape.grip;
  return { tip: [ox + tipLocal * s * k, oy - tipLocal * s * k], scale: s, origin: [ox, oy] };
}
