import { GEAR_ICON_SIZE, drawGearIcon, frameTier } from '../art/gearIcons.js';
import { quantizePixels } from '../art/palette.js';

// Ícone de cada peça de equipamento como imagem (data URL) para os menus em HTML.
const cache = new Map();

export function gearIconUrl(id, rarity = 'common') {
  const key = `${id}|${rarity}`;
  if (cache.has(key)) return cache.get(key);
  let url = '';
  try {
    const pixels = drawGearIcon(id, rarity);
    const size = pixels?.width ?? GEAR_ICON_SIZE;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = pixels?.height ?? size;
    canvas.getContext('2d').putImageData(new ImageData(quantizePixels(pixels).data, canvas.width, canvas.height), 0, 0);
    url = canvas.toDataURL();
  } catch {
    url = '';
  }
  cache.set(key, url);
  return url;
}

/** <img> pixelado da peça (tamanho em px na tela), com a moldura e o brilho da raridade. */
export function gearIconHtml(id, rarity = 'common', size = 32) {
  const url = gearIconUrl(id, rarity);
  return url ? `<img class="pixel-icon gear-icon gear-icon--${frameTier(id, rarity)}" src="${url}" width="${size}" height="${size}" alt="">` : '<span class="gear-icon gear-icon--missing"></span>';
}
