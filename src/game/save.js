import { migrateLegacyDayTime } from './DayNightCycle.js';
import { INVENTORY_CONFIG } from './config.js';

export const SAVE_VERSION = 2;
export const SAVE_KEY_V1 = 'brumavale-save-v1';
export const SAVE_KEY_V2 = 'lendas-save-v2';
export const SAVE_KEY_CORRUPT = 'lendas-save-v2-corrupt';
// Cópia do save feita no início de um ataque ao acampamento; usada no "recomeçar" após a derrota.
export const SAVE_KEY_PRE_RAID = 'lendas-save-v2-pre-raid';
// Chave usada quando o jogo ainda se chamava Brumavale; lida só se a nova não existir.
export const LEGACY_SAVE_KEY_V2 = 'brumavale-save-v2';

const storageAvailable = () => typeof localStorage !== 'undefined';

export function migrateV1ToV2(data = {}) {
  const legacyTime = Number(data.dayTime);
  const cycleTime = Number.isFinite(legacyTime)
    ? migrateLegacyDayTime(legacyTime)
    : migrateLegacyDayTime(8 / 24);
  return {
    version: SAVE_VERSION,
    savedAt: new Date().toISOString(),
    time: {
      cycleTime,
      dayCount: 1
    },
    inventory: data.inventory ?? {
      capacityVersion: INVENTORY_CONFIG.capacityVersion,
      maxSlots: INVENTORY_CONFIG.maxSlots,
      unitsPerSlot: INVENTORY_CONFIG.unitsPerSlot,
      items: {}
    },
    player: data.player ?? { health: 100, maxHealth: 100, attack: 12, defense: 0 },
    progression: data.progression ?? {},
    economy: data.economy ?? {},
    boss: data.boss ?? {},
    camp: data.camp ?? { levels: {}, questKills: 0, questClaimed: false, crafted: {}, storage: {} },
    farm: data.farm ?? { plots: [], animals: {} },
    market: data.market ?? { day: 1, offers: [] },
    deathBackpacks: Array.isArray(data.deathBackpacks) ? data.deathBackpacks : [],
    harvestStructures: Array.isArray(data.harvestStructures) ? data.harvestStructures : []
  };
}

export function migrateSave(data = {}) {
  const version = Number(data.version) || 1;
  if (version > SAVE_VERSION) {
    throw new Error(`Save versão ${version} é mais recente que a versão suportada (${SAVE_VERSION}).`);
  }
  if (version === SAVE_VERSION) {
    const cycleTime = Number(data.time?.cycleTime);
    const dayCount = Number(data.time?.dayCount);
    return {
      ...data,
      version: SAVE_VERSION,
      savedAt: data.savedAt ?? new Date().toISOString(),
      time: {
        cycleTime: Number.isFinite(cycleTime) ? cycleTime : migrateLegacyDayTime(8 / 24),
        dayCount: Number.isFinite(dayCount) ? Math.max(1, Math.floor(dayCount)) : 1
      },
      inventory: {
        ...(data.inventory ?? {}),
        capacityVersion: INVENTORY_CONFIG.capacityVersion,
        maxSlots: Number(data.inventory?.capacityVersion) >= INVENTORY_CONFIG.capacityVersion
          ? Math.min(INVENTORY_CONFIG.maxSlots, Math.max(1, Number(data.inventory?.maxSlots) || INVENTORY_CONFIG.maxSlots))
          : INVENTORY_CONFIG.maxSlots,
        unitsPerSlot: INVENTORY_CONFIG.unitsPerSlot,
        items: data.inventory?.items ?? {}
      },
      progression: data.progression ?? {},
      economy: data.economy ?? {},
      boss: data.boss ?? {},
      camp: {
        ...(data.camp ?? {}),
        levels: data.camp?.levels ?? {},
        crafted: data.camp?.crafted ?? {},
        storage: data.camp?.storage ?? {}
      },
      farm: data.farm ?? { plots: [], animals: {} },
      market: data.market ?? { day: 1, offers: [] },
      deathBackpacks: Array.isArray(data.deathBackpacks) ? data.deathBackpacks : [],
      harvestStructures: Array.isArray(data.harvestStructures) ? data.harvestStructures : []
    };
  }
  return migrateV1ToV2(data);
}

export function createSaveEnvelope(data = {}) {
  return {
    ...data,
    version: SAVE_VERSION,
    savedAt: new Date().toISOString()
  };
}

export function loadSaveDetailed() {
  if (!storageAvailable()) return { data: null, sourceVersion: null, migrated: false, error: null };

  let rawV2 = localStorage.getItem(SAVE_KEY_V2);
  if (rawV2 === null) {
    rawV2 = localStorage.getItem(LEGACY_SAVE_KEY_V2);
    if (rawV2 !== null) {
      try {
        localStorage.setItem(SAVE_KEY_V2, rawV2);
      } catch {
        // Se a cópia falhar, o save antigo continua sendo lido na próxima vez.
      }
    }
  }
  if (rawV2 !== null) {
    try {
      const parsed = JSON.parse(rawV2);
      const data = migrateSave(parsed);
      return { data, sourceVersion: 2, migrated: false, error: null };
    } catch (error) {
      try {
        localStorage.setItem(SAVE_KEY_CORRUPT, rawV2);
      } catch {
        // A quarentena é best effort; o jogo ainda deve iniciar.
      }
      return { data: null, sourceVersion: 2, migrated: false, error };
    }
  }

  const rawV1 = localStorage.getItem(SAVE_KEY_V1);
  if (rawV1 === null) return { data: null, sourceVersion: null, migrated: false, error: null };
  try {
    const parsed = JSON.parse(rawV1);
    const data = migrateSave(parsed);
    const saved = saveGame(data);
    return { data, sourceVersion: 1, migrated: true, error: saved ? null : new Error('Não foi possível gravar o save migrado.') };
  } catch (error) {
    return { data: null, sourceVersion: 1, migrated: false, error };
  }
}

/** Apaga todos os saves (atual, antigos, cópia antes da invasão e corrompido). As configurações ficam. */
export function clearAllSaves() {
  if (!storageAvailable()) return false;
  for (const key of [SAVE_KEY_V2, SAVE_KEY_V1, LEGACY_SAVE_KEY_V2, SAVE_KEY_PRE_RAID, SAVE_KEY_CORRUPT]) {
    try {
      localStorage.removeItem(key);
    } catch {
      return false;
    }
  }
  return true;
}

export function loadSave() {
  return loadSaveDetailed().data;
}

export function saveGame(data) {
  if (!storageAvailable()) return false;
  try {
    localStorage.setItem(SAVE_KEY_V2, JSON.stringify(createSaveEnvelope(data)));
    return true;
  } catch (error) {
    console.error('Não foi possível salvar o progresso local.', error);
    return false;
  }
}

export function savePreRaidSnapshot() {
  if (!storageAvailable()) return false;
  const current = localStorage.getItem(SAVE_KEY_V2);
  if (current === null) return false;
  try {
    localStorage.setItem(SAVE_KEY_PRE_RAID, current);
    return true;
  } catch {
    return false;
  }
}

/** Volta ao save de antes do ataque. Sem cópia, mantém o save atual. */
export function restorePreRaidSnapshot() {
  if (!storageAvailable()) return false;
  const snapshot = localStorage.getItem(SAVE_KEY_PRE_RAID);
  if (snapshot === null) return false;
  try {
    localStorage.setItem(SAVE_KEY_V2, snapshot);
    return true;
  } catch {
    return false;
  }
}
