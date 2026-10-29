// Configurações do jogador (engrenagem ao lado do minimapa), guardadas no navegador.
// Ficam fora do save do jogo: valem para este aparelho, não para a partida.

const STORAGE_KEY = 'lendas-configuracoes';

export const DEFAULT_SETTINGS = Object.freeze({
  interface: 'auto', // auto | pc | mobile
  sound: true,
  music: true,
  volume: 70, // 0 a 100
  shake: true,
  labels: 'auto', // auto | always | near
  stickSize: 'medium', // small | medium | large
  stickSide: 'left', // left | right
  zoom: 'normal', // near | normal | far | farthest (zoom da câmera)
  graphics: 'high', // high | balanced | light (Ajustes > Gráficos)
  graphicsChosen: false, // false: ainda vale a detecção automática da primeira execução
  fpsCap30: false, // limite de 30 fps (poupa bateria e CPU)
  fpsCounter: false // contador de fps na tela
});

// Tamanho do joystick de toque: diâmetro da base e raio de movimento do dedo (px).
export const STICK_SIZES = Object.freeze({
  small: Object.freeze({ base: 88, radius: 34 }),
  medium: Object.freeze({ base: 112, radius: 44 }),
  large: Object.freeze({ base: 144, radius: 58 })
});

const CHOICES = {
  interface: ['auto', 'pc', 'mobile'],
  labels: ['auto', 'always', 'near'],
  stickSize: ['small', 'medium', 'large'],
  stickSide: ['left', 'right'],
  zoom: ['near', 'normal', 'far', 'farthest'],
  graphics: ['high', 'balanced', 'light']
};

function storage() {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

/** Corrige valores inválidos (save antigo, edição manual) para os padrões. */
export function normalizeSettings(raw = {}) {
  const value = { ...DEFAULT_SETTINGS };
  if (CHOICES.interface.includes(raw.interface)) value.interface = raw.interface;
  if (CHOICES.labels.includes(raw.labels)) value.labels = raw.labels;
  if (CHOICES.stickSize.includes(raw.stickSize)) value.stickSize = raw.stickSize;
  if (CHOICES.stickSide.includes(raw.stickSide)) value.stickSide = raw.stickSide;
  if (CHOICES.zoom.includes(raw.zoom)) value.zoom = raw.zoom;
  if (typeof raw.sound === 'boolean') value.sound = raw.sound;
  if (typeof raw.music === 'boolean') value.music = raw.music;
  if (typeof raw.shake === 'boolean') value.shake = raw.shake;
  if (CHOICES.graphics.includes(raw.graphics)) value.graphics = raw.graphics;
  if (typeof raw.graphicsChosen === 'boolean') value.graphicsChosen = raw.graphicsChosen;
  if (typeof raw.fpsCap30 === 'boolean') value.fpsCap30 = raw.fpsCap30;
  if (typeof raw.fpsCounter === 'boolean') value.fpsCounter = raw.fpsCounter;
  const volume = Number(raw.volume);
  if (Number.isFinite(volume)) value.volume = Math.max(0, Math.min(100, Math.round(volume / 10) * 10));
  return value;
}

export function loadSettings(store = storage()) {
  try {
    return normalizeSettings(JSON.parse(store?.getItem(STORAGE_KEY) ?? '{}'));
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings, store = storage()) {
  try {
    store?.setItem(STORAGE_KEY, JSON.stringify(normalizeSettings(settings)));
    return true;
  } catch {
    return false;
  }
}
