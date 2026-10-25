import { RESOURCE_TYPES } from './config.js';

// Converte texturas do jogo em imagens (data URL) para usar nos menus em HTML.
const cache = new Map();

export function textureUrl(scene, key, frame) {
  const id = `${key}|${frame ?? ''}`;
  if (cache.has(id)) return cache.get(id);
  if (!scene?.textures?.exists(key)) return '';
  const url = scene.textures.getBase64(key, frame);
  cache.set(id, url);
  return url;
}

export function resourceIconUrl(scene, type) {
  if (type === 'coins') return textureUrl(scene, 'coin-hud-icon');
  const definition = RESOURCE_TYPES[type];
  if (!definition) return '';
  return definition.codeIcon
    ? textureUrl(scene, `resource-code-${definition.codeIcon}`)
    : textureUrl(scene, 'resource-icons', definition.icon);
}

/** <img> pixelado de um recurso (tamanho em px na tela). */
export function resourceIconHtml(scene, type, size = 24) {
  const url = resourceIconUrl(scene, type);
  return url ? `<img class="pixel-icon" src="${url}" width="${size}" height="${size}" alt="">` : '';
}
