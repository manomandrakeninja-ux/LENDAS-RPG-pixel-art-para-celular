import { SAVE_KEY_V2, SAVE_VERSION, migrateSave } from './save.js';

export const BACKUP_PREFIX = 'LENDAS1:';

const toBase64 = (bytes) => {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
};
const fromBase64 = (text) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0));

async function pipe(bytes, stream) {
  const out = new Blob([bytes]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

/** Texto do save -> código "LENDAS1:..." (deflate + base64). */
export async function encodeBackup(rawSave) {
  JSON.parse(rawSave);
  const packed = await pipe(new TextEncoder().encode(rawSave), new CompressionStream('deflate-raw'));
  return BACKUP_PREFIX + toBase64(packed);
}

/** Código -> objeto de save validado e migrado. Lança Error com mensagem em português. */
export async function decodeBackup(code) {
  const text = String(code ?? '').replace(/\s+/g, '');
  if (!text.startsWith(BACKUP_PREFIX)) throw new Error('Código inválido: não parece um backup do LENDAS.');
  let json;
  try {
    const bytes = await pipe(fromBase64(text.slice(BACKUP_PREFIX.length)), new DecompressionStream('deflate-raw'));
    json = new TextDecoder().decode(bytes);
  } catch {
    throw new Error('Código corrompido ou incompleto.');
  }
  let data;
  try {
    data = JSON.parse(json);
  } catch {
    throw new Error('Código corrompido ou incompleto.');
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('O backup não tem um save válido.');
  if (!data.progression || typeof data.progression !== 'object') throw new Error('O backup não tem um save válido.');
  if (Number(data.version) > SAVE_VERSION) throw new Error('Backup de uma versão mais nova do jogo.');
  return migrateSave(data);
}

export async function exportSaveCode(store = globalThis.localStorage) {
  const raw = store?.getItem(SAVE_KEY_V2);
  if (!raw) throw new Error('Ainda não há save para exportar. Use SALVAR AGORA.');
  return encodeBackup(raw);
}

/** Valida e grava o código no lugar do save atual. O chamador recarrega a página. */
export async function importSaveCode(code, store = globalThis.localStorage) {
  const data = await decodeBackup(code);
  store.setItem(SAVE_KEY_V2, JSON.stringify(data));
  return data;
}
