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
export function emissiveMask(data, width, height, { frameWidth = width, limit = 24 } = {}) {
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
        if (opaque && contrast >= 45) found.push([contrast, y * width + x]);
      }
    }
    found.sort((a, b) => b[0] - a[0]);
    for (const [, k] of found.slice(0, limit)) keep[k] = 1;
  }
  return keep;
}
