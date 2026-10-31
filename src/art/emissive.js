// Pontos que brilham sozinhos no desenho dos chefes (olhos, gemas, coroa, chamas): pixels de cor viva
// (saturada) que se destacam do entorno opaco, no máximo `limit` por quadro (os mais contrastados).
// Áreas grandes claras (ouro, escamas), brilhos pálidos e a luz de borda da silhueta não entram.
// Usado em EnemyVisual (camada aditiva por cima da noite) e nos testes.

export function isEmissivePixel(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const luma = 0.299 * r + 0.587 * g + 0.114 * b;
  return max >= 190 && (max - min) / max >= 0.55 && luma >= 110;
}

const RING = [[1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0], [0, 2], [0, -2]];

/** Máscara (1 = acende) de uma folha RGBA width x height com quadros de `frameWidth` px lado a lado. */
export function emissiveMask(data, width, height, { frameWidth = width, limit = 24, minContrast = 45 } = {}) {
  const luma = (i) => 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  const keep = new Uint8Array(width * height);
  for (let x0 = 0; x0 < width; x0 += frameWidth) {
    const found = [];
    for (let y = 2; y < height - 2; y += 1) {
      for (let x = x0 + 2; x < Math.min(width, x0 + frameWidth) - 2; x += 1) {
        const i = (y * width + x) * 4;
        if (data[i + 3] < 128 || !isEmissivePixel(data[i], data[i + 1], data[i + 2])) continue;
        let sum = 0;
        let opaque = true;
        for (const [dx, dy] of RING) {
          const j = ((y + dy) * width + x + dx) * 4;
          if (data[j + 3] < 128) { opaque = false; break; }
          sum += luma(j);
        }
        const contrast = luma(i) - sum / RING.length;
        if (opaque && contrast >= minContrast) found.push([contrast, y * width + x]);
      }
    }
    found.sort((a, b) => b[0] - a[0]);
    for (const [, k] of found.slice(0, limit)) keep[k] = 1;
  }
  return keep;
}

/**
 * Pontos de olho/núcleo dos monstros comuns: o critério dos chefes um pouco mais solto (contraste 30,
 * até 4 por quadro) e, se o quadro não tiver nenhum pixel de cor viva, os 2 pixels claros mais
 * contrastados da metade de cima (normalmente os olhos).
 */
export function commonEmissiveMask(data, width, height, { frameWidth = width } = {}) {
  const keep = emissiveMask(data, width, height, { frameWidth, limit: 4, minContrast: 30 });
  const luma = (i) => 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  for (let x0 = 0; x0 < width; x0 += frameWidth) {
    const x1 = Math.min(width, x0 + frameWidth);
    let lit = 0;
    for (let y = 0; y < height && !lit; y += 1) for (let x = x0; x < x1; x += 1) if (keep[y * width + x]) { lit = 1; break; }
    if (lit) continue;
    const found = [];
    for (let y = 2; y < Math.floor(height * 0.6); y += 1) {
      for (let x = x0 + 2; x < x1 - 2; x += 1) {
        const i = (y * width + x) * 4;
        if (data[i + 3] < 128 || luma(i) < 140) continue;
        let sum = 0; let opaque = true;
        for (const [dx, dy] of RING) {
          const j = ((y + dy) * width + x + dx) * 4;
          if (data[j + 3] < 128) { opaque = false; break; }
          sum += luma(j);
        }
        const contrast = luma(i) - sum / RING.length;
        if (opaque && contrast >= 50) found.push([contrast, y * width + x]);
      }
    }
    found.sort((a, b) => b[0] - a[0]);
    for (const [, k] of found.slice(0, 2)) keep[k] = 1;
  }
  return keep;
}

/**
 * Halo dos pontos acesos (camada aditiva): núcleo quase branco, anel na cor do ponto que cai em 4
 * degraus até `radius` px, preso ao próprio quadro. Devolve um RGBA novo.
 */
export function emissiveHalo(data, width, height, keep, { frameWidth = width, radius = 6 } = {}) {
  const out = new Uint8ClampedArray(width * height * 4);
  const r = Math.ceil(radius);
  for (let k = 0; k < keep.length; k += 1) {
    if (!keep[k]) continue;
    const px = k % width; const py = Math.floor(k / width);
    const f0 = Math.floor(px / frameWidth) * frameWidth; const f1 = Math.min(width, f0 + frameWidth);
    const i = k * 4;
    const color = [data[i], data[i + 1], data[i + 2]];
    for (let dy = -r; dy <= r; dy += 1) {
      for (let dx = -r; dx <= r; dx += 1) {
        const x = px + dx; const y = py + dy;
        if (x < f0 || x >= f1 || y < 0 || y >= height) continue;
        const d = Math.hypot(dx, dy);
        if (d > radius) continue;
        const level = Math.ceil((1 - d / (radius + 0.5)) * 4) / 4;
        const alpha = d < 1 ? 255 : Math.round(level * level * 190);
        const o = (y * width + x) * 4;
        if (alpha <= out[o + 3]) continue;
        const white = d < 1 ? 0.55 : d < 2 ? 0.25 : 0;
        out[o] = color[0] + (255 - color[0]) * white;
        out[o + 1] = color[1] + (255 - color[1]) * white;
        out[o + 2] = color[2] + (255 - color[2]) * white;
        out[o + 3] = alpha;
      }
    }
  }
  return out;
}
