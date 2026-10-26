import { PixelCanvas, darken, lighten } from './pixel.js';

// Personagens (moradores da campanha) no mesmo estilo do herói: 24 x 32, de frente.
// palette: { tunic, scarf, hair, skin, hat?, beard?, longHair?, dress? }

function ramp3(hex) {
  return [darken(hex, 0.35), hex, lighten(hex, 0.25)];
}

/** Quadro 0 = parado, 1 = respirando (corpo 1 px abaixo). decorate(canvas, top) desenha extras antes do contorno. */
export function drawNpc(palette, frame = 0, decorate = null) {
  const canvas = new PixelCanvas(24, 32);
  const bob = frame === 1 ? 1 : 0;
  const skin = ramp3(palette.skin);
  const hair = ramp3(palette.hair);
  const tunic = ramp3(palette.tunic);
  const scarf = ramp3(palette.scarf);
  const pants = ['#2f2722', '#463a32'];
  const boot = ['#24170f', '#4a3020'];

  canvas.shadow(12, 29, 7, 2, 110);
  // Pernas e botas.
  for (const x of [8, 13]) {
    canvas.rect(x, 23, 3, 4, pants[1]);
    canvas.rect(x, 26, 3, 2, boot[1]);
    canvas.rect(x, 28, 3, 1, boot[0]);
  }
  const top = 15 + bob;
  // Túnica com volume e cinto.
  canvas.rect(7, top, 10, 8 - bob, tunic[1]);
  canvas.rect(7, top, 2, 8 - bob, tunic[2]);
  canvas.rect(15, top, 2, 8 - bob, tunic[0]);
  canvas.rect(7, top + 5, 10, 1, '#4a2f1e');
  canvas.rect(11, top + 5, 2, 1, '#e8c15a');
  if (palette.dress) {
    canvas.polygon([[7, top + 6], [17, top + 6], [18, 27], [6, 27]], tunic[1]);
    canvas.rect(6, 26, 12, 1, tunic[0]);
    canvas.rect(7, top + 6, 2, 27 - top - 6, tunic[2]);
  }
  // Lenço / gola.
  canvas.rect(8, top, 8, 2, scarf[1]);
  canvas.pixel(8, top, scarf[2]);
  // Braços.
  for (const [x, shade] of [[5, 2], [17, 0]]) {
    canvas.rect(x, top + 1, 2, 4, tunic[shade]);
    canvas.rect(x, top + 5, 2, 2, skin[1]);
  }
  // Cabeça.
  const head = 5 + bob;
  canvas.rect(8, head + 4, 8, 7, skin[1]);
  canvas.rect(8, head + 4, 2, 6, skin[2]);
  canvas.rect(8, head + 10, 8, 1, skin[0]);
  canvas.rect(9, head + 6, 2, 2, '#1c1822');
  canvas.rect(13, head + 6, 2, 2, '#1c1822');
  canvas.pixel(9, head + 6, '#e9f1ff');
  canvas.pixel(13, head + 6, '#e9f1ff');
  if (palette.beard) {
    canvas.rect(8, head + 8, 8, 3, hair[1]);
    canvas.rect(10, head + 8, 4, 1, skin[0]);
    canvas.pixel(8, head + 8, hair[2]);
  } else {
    canvas.pixel(11, head + 9, skin[0]);
    canvas.pixel(12, head + 9, skin[0]);
  }
  // Cabelo.
  canvas.rect(7, head, 10, 4, hair[1]);
  canvas.rect(8, head - 1, 8, 1, hair[1]);
  canvas.rect(8, head, 4, 2, hair[2]);
  canvas.rect(7, head + 4, 1, 4, hair[1]);
  canvas.rect(16, head + 4, 1, 4, hair[0]);
  if (palette.longHair) {
    canvas.rect(6, head + 2, 2, 11, hair[1]);
    canvas.rect(16, head + 2, 2, 11, hair[0]);
    canvas.pixel(6, head + 2, hair[2]);
  }
  // Chapéu ou capuz.
  if (palette.hat) {
    const hat = ramp3(palette.hat);
    canvas.rect(6, head - 1, 12, 2, hat[1]);
    canvas.rect(8, head - 4, 8, 3, hat[1]);
    canvas.rect(8, head - 4, 3, 3, hat[2]);
    canvas.rect(6, head, 12, 1, hat[0]);
  }
  decorate?.(canvas, top);
  return canvas.outline();
}

const WOOD = ['#4a2f1e', '#7a5032', '#a0703f'];
const METAL = ['#55595f', '#9aa0a8', '#dfe4e8'];

/** Ferramenta na mão direita (lado direito da tela). */
function drawProp(canvas, prop, top) {
  const handX = 18;
  const handY = top + 5;
  switch (prop) {
    case 'hammer':
      canvas.line(handX, handY + 2, handX + 2, handY - 6, WOOD[1]);
      canvas.rect(handX, handY - 9, 6, 4, METAL[1]);
      canvas.rect(handX, handY - 9, 6, 1, METAL[2]);
      canvas.rect(handX + 5, handY - 9, 1, 4, METAL[0]);
      break;
    case 'pitchfork':
      canvas.line(handX + 1, handY + 6, handX + 1, handY - 12, WOOD[1]);
      canvas.rect(handX - 1, handY - 12, 5, 1, METAL[1]);
      for (const dx of [-1, 1, 3]) canvas.line(handX + dx, handY - 12, handX + dx, handY - 16, METAL[2]);
      break;
    case 'ladle':
      canvas.line(handX, handY + 1, handX + 3, handY - 7, METAL[1]);
      canvas.rect(handX + 2, handY - 10, 4, 3, METAL[1]);
      canvas.pixel(handX + 3, handY - 10, METAL[2]);
      break;
    case 'staff':
      canvas.line(handX + 1, handY + 8, handX + 1, handY - 13, WOOD[1]);
      canvas.rect(handX, handY - 15, 3, 3, '#e0452f');
      canvas.pixel(handX + 1, handY - 15, '#ff9a7a');
      break;
    case 'spear':
      canvas.line(handX + 1, handY + 8, handX + 1, handY - 13, WOOD[0]);
      canvas.polygon([[handX - 1, handY - 13], [handX + 1, handY - 18], [handX + 3, handY - 13]], METAL[2]);
      break;
    case 'coins':
      canvas.rect(handX - 1, handY + 1, 5, 5, '#8a6a3a');
      canvas.rect(handX, handY, 3, 1, '#5a3a20');
      canvas.pixel(handX + 1, handY + 3, '#f2c45c');
      break;
    case 'basket':
      canvas.rect(handX - 2, handY + 1, 7, 4, '#b08040');
      canvas.line(handX - 2, handY + 1, handX + 1, handY - 2, '#8a6030');
      canvas.line(handX + 1, handY - 2, handX + 4, handY + 1, '#8a6030');
      canvas.pixel(handX - 1, handY, '#e0452f');
      canvas.pixel(handX + 2, handY, '#7ac04a');
      break;
    default:
      break;
  }
}

/** Morador do acampamento: o mesmo personagem com a ferramenta do seu prédio. */
export function drawVillager(palette, prop = 'none', frame = 0) {
  return drawNpc(palette, frame, (canvas, top) => drawProp(canvas, prop, top));
}
