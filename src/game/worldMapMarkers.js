import { WORLD } from './config.js';
import { DUNGEON_CONFIG } from '../data/buildings.js';

// Lógica pura dos marcadores do mapa-múndi (sem Phaser: roda no Node para testes).

export const WORLD_MAP_MARKER_TYPES = Object.freeze({
  camp: 'camp',
  resource: 'resource',
  chest: 'chest',
  enemy: 'enemy',
  player: 'player',
  mine: 'mine',
  dungeon: 'dungeon',
  waylight: 'waylight',
  curiosity: 'curiosity'
});

// A mina aparece sempre (ícone especial); a masmorra, depois que o acampamento fica completo.
// waylights/curiosities: marcadores extras vindos dos sistemas novos (faróis e curiosidades).
export function collectWorldMapMarkers({ structures = [], enemies = [], boss = null, player, dungeonRevealed = false, waylights = [], curiosities = [] } = {}) {
  const discoveredStructures = structures.filter((structure) => structure?.discovered && structure.type !== 'mineMarker');
  const mine = structures.find((structure) => structure?.type === 'mineMarker');
  return {
    mine: mine ? { x: mine.x, y: mine.y, type: WORLD_MAP_MARKER_TYPES.mine } : null,
    dungeon: dungeonRevealed ? { x: DUNGEON_CONFIG.x, y: DUNGEON_CONFIG.y, type: WORLD_MAP_MARKER_TYPES.dungeon } : null,
    camp: { x: WORLD.camp.x, y: WORLD.camp.y, type: WORLD_MAP_MARKER_TYPES.camp },
    player: player
      ? { x: player.x, y: player.y, type: WORLD_MAP_MARKER_TYPES.player }
      : null,
    structures: discoveredStructures
      .filter((structure) => structure.type !== 'chest')
      .map((structure) => ({
        x: structure.x,
        y: structure.y,
        type: WORLD_MAP_MARKER_TYPES.resource,
        structureType: structure.type
      })),
    chests: discoveredStructures
      .filter((structure) => structure.type === 'chest' && !structure.collected)
      .map((structure) => ({
        x: structure.x,
        y: structure.y,
        type: WORLD_MAP_MARKER_TYPES.chest
      })),
    strongEnemies: [
      ...enemies
        .filter((enemy) => enemy?.isElite || enemy?.isBoss || enemy?.kind === 'boss')
        .map((enemy) => ({
          x: enemy.x,
          y: enemy.y,
          type: WORLD_MAP_MARKER_TYPES.enemy
        })),
      ...(boss && !boss.dead
        ? [{ x: boss.x, y: boss.y, type: WORLD_MAP_MARKER_TYPES.enemy }]
        : [])
    ],
    waylights: waylights.map((w) => ({
      x: w.x, y: w.y, type: WORLD_MAP_MARKER_TYPES.waylight, lit: Boolean(w.lit)
    })),
    curiosities: curiosities
      .filter((c) => c.found || c.rumoured)
      .map((c) => ({
        x: c.x, y: c.y, type: WORLD_MAP_MARKER_TYPES.curiosity, found: Boolean(c.found)
      }))
  };
}
