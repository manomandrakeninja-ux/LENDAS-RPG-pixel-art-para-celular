// Pose montada da própria skin (rodada 2 da arte): as pernas sentadas são feitas com os pixels das
// pernas do quadro parado do herói, sem pernas genéricas no cavalo. Só remaneja pixels (gira 90° e
// desloca), então a calça, a bota e a luz de cada skin continuam as dela.
// De lado: a coxa deita para a frente sobre a sela e a canela desce até o estribo (joelho dobrado).
// De frente/de costas: as pernas abrem para os lados do cavalo (montado escarranchado).

/** Linha do quadril num quadro de altura `height` (44 na folha 56x64). */
export const hipRow = (height) => Math.round(height * (44 / 64));

/**
 * frame: { width, height, data } (RGBA do quadro parado). dir: right|left|down|up.
 * Devolve { width, height, data, ox, oy } — ox/oy = canto da imagem nas coordenadas do quadro — ou null.
 */
export function riderLegs(frame, dir) {
  const { width: W, height: H, data } = frame;
  const hip = hipRow(H);
  const k = H / 64;
  const solid = (x, y) => data[(y * W + x) * 4 + 3] >= 128;
  let x0 = W; let x1 = -1; let bottom = -1;
  for (let y = hip; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      if (!solid(x, y)) continue;
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); bottom = Math.max(bottom, y);
    }
  }
  if (x1 < 0 || bottom - hip < 4) return null;
  const legH = bottom - hip + 1;
  const pad = Math.ceil(10 * k);
  const outW = x1 - x0 + 1 + pad * 2 + legH;
  const outH = legH + pad;
  const out = new Uint8ClampedArray(outW * outH * 4);
  const ox = x0 - pad - (dir === 'left' ? legH : 0);
  const oy = hip;
  const put = (x, y, sx, sy) => {
    const tx = x - ox; const ty = y - oy;
    if (tx < 0 || ty < 0 || tx >= outW || ty >= outH) return;
    const s = (sy * W + sx) * 4;
    out.set(data.subarray(s, s + 4), (ty * outW + tx) * 4);
  };
  if (dir === 'right' || dir === 'left') {
    const f = dir === 'right' ? 1 : -1;
    const thigh = Math.max(3, Math.round(legH * 0.42));
    const wide = x1 - x0 + 1;
    const cx = Math.round((x0 + x1) / 2);
    // Canela primeiro (a coxa fica por cima no joelho): desce do joelho, um pouco recuada.
    const kneeX = cx + f * (thigh + 1);
    for (let y = hip + thigh; y <= bottom; y += 1) {
      for (let x = x0; x <= x1; x += 1) {
        if (!solid(x, y)) continue;
        const tx = f > 0 ? kneeX - (x1 - x) : kneeX + (x - x0);
        put(tx, hip + Math.round(wide * 0.45) + (y - hip - thigh), x, y);
      }
    }
    // Coxa girada 90°: o lado da frente da perna vira o de cima, do quadril até o joelho.
    for (let y = hip; y < hip + thigh; y += 1) {
      for (let x = x0; x <= x1; x += 1) {
        if (!solid(x, y)) continue;
        const along = y - hip;
        const across = f > 0 ? x1 - x : x - x0;
        put(cx + f * along, hip + Math.round(across * 0.55), x, y);
      }
    }
  } else {
    // Abre cada perna para o seu lado: a coxa vai em diagonal e a canela pende ao lado do cavalo.
    const cx = (x0 + x1) / 2;
    // Rodada 3: as pernas abriam como asas para fora do cavalo; agora 3 px mais para dentro.
    const spread = Math.round(5 * k);
    const thighRows = Math.max(2, Math.round(5 * k));
    for (let y = hip; y <= bottom; y += 1) {
      const t = Math.min(1, (y - hip) / thighRows);
      for (let x = x0; x <= x1; x += 1) {
        if (!solid(x, y)) continue;
        const side = x < cx ? -1 : 1;
        put(x + side * Math.round(spread * t), y, x, y);
      }
    }
  }
  return { width: outW, height: outH, data: out, ox, oy };
}
