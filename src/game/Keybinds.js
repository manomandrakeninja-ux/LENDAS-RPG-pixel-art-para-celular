// Teclas configuráveis das ações principais (computador). Valem para este aparelho.
// Guardamos o KeyboardEvent.code (ex.: 'KeyJ', 'Space', 'Digit1').

const STORAGE_KEY = 'lendas-teclas';

export const KEY_ACTIONS = Object.freeze(['attack', 'special', 'dodge', 'interact', 'potion']);
export const ACTION_LABELS = Object.freeze({
  attack: 'Ataque', special: 'Golpe especial', dodge: 'Esquiva', interact: 'Interagir', potion: 'Poção de vida'
});
export const DEFAULT_KEYBINDS = Object.freeze({
  attack: 'KeyJ', special: 'KeyQ', dodge: 'Space', interact: 'KeyE', potion: 'Digit1'
});

// Teclas já usadas pelo jogo (movimento, painéis, hotkeys 2-5, menu).
const RESERVED = new Set([
  'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyM', 'KeyB', 'KeyV', 'KeyK', 'KeyI', 'KeyC', 'KeyF', 'KeyR', 'KeyL',
  'Escape', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'
]);

/** Código aceito como tecla de ação: letra, dígito, espaço, Shift ou Tab. */
export function isBindableCode(code) {
  return /^Key[A-Z]$/.test(code) || /^Digit[0-9]$/.test(code) || ['Space', 'ShiftLeft', 'ShiftRight', 'Tab'].includes(code);
}

export function isReservedCode(code) {
  return RESERVED.has(code);
}

/** keyCode do Phaser/DOM para criar a tecla da esquiva. */
export function keyCodeFor(code) {
  if (/^Key[A-Z]$/.test(code)) return code.charCodeAt(3);
  if (/^Digit[0-9]$/.test(code)) return 48 + Number(code[5]);
  return { Space: 32, ShiftLeft: 16, ShiftRight: 16, Tab: 9 }[code] ?? null;
}

export function keyLabel(code) {
  if (/^Key[A-Z]$/.test(code)) return code[3];
  if (/^Digit[0-9]$/.test(code)) return code[5];
  return { Space: 'ESPAÇO', ShiftLeft: 'SHIFT', ShiftRight: 'SHIFT', Tab: 'TAB' }[code] ?? code;
}

/** Corrige valores inválidos ou repetidos: se algo colidir, tudo volta ao padrão. */
export function normalizeKeybinds(raw = {}) {
  const value = { ...DEFAULT_KEYBINDS };
  for (const action of KEY_ACTIONS) {
    const code = raw?.[action];
    if (typeof code === 'string' && isBindableCode(code) && !isReservedCode(code)) value[action] = code;
  }
  const codes = KEY_ACTIONS.map((action) => value[action]);
  if (new Set(codes).size !== codes.length) return { ...DEFAULT_KEYBINDS };
  return value;
}

/** Tenta trocar a tecla de uma ação. Devolve { ok, binds, message }. */
export function rebind(binds, action, code) {
  if (!KEY_ACTIONS.includes(action)) return { ok: false, binds, message: 'Ação desconhecida.' };
  if (!isBindableCode(code)) return { ok: false, binds, message: 'Essa tecla não pode ser usada.' };
  if (isReservedCode(code)) return { ok: false, binds, message: 'Essa tecla já tem outra função no jogo.' };
  const other = KEY_ACTIONS.find((candidate) => candidate !== action && binds[candidate] === code);
  if (other) return { ok: false, binds, message: `Essa tecla já é de: ${ACTION_LABELS[other]}.` };
  return { ok: true, binds: { ...binds, [action]: code }, message: '' };
}

/** Ação da tecla pressionada, ou null. */
export function actionForCode(binds, code) {
  return KEY_ACTIONS.find((action) => binds[action] === code) ?? null;
}

function storage() {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export function loadKeybinds(store = storage()) {
  try {
    return normalizeKeybinds(JSON.parse(store?.getItem(STORAGE_KEY) ?? '{}'));
  } catch {
    return { ...DEFAULT_KEYBINDS };
  }
}

export function saveKeybinds(binds, store = storage()) {
  try {
    store?.setItem(STORAGE_KEY, JSON.stringify(normalizeKeybinds(binds)));
    return true;
  } catch {
    return false;
  }
}
