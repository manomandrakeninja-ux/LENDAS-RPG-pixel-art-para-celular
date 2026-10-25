// Configurações do jogador (engrenagem ao lado do minimapa), guardadas no navegador.
// Ficam fora do save do jogo: valem para este aparelho, não para a partida.

const STORAGE_KEY = 'lendas-configuracoes';

export const DEFAULT_SETTINGS = Object.freeze({
  interface: 'auto', // auto | pc | mobile
  sound: true,
  volume: 70, // 0 a 100
  shake: true,
  labels: 'auto' // auto | always | near
});

const CHOICES = {
  interface: ['auto', 'pc', 'mobile'],
  labels: ['auto', 'always', 'near']
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
  if (typeof raw.sound === 'boolean') value.sound = raw.sound;
  if (typeof raw.shake === 'boolean') value.shake = raw.shake;
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
