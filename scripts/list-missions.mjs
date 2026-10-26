import fs from 'node:fs';
import { CHAPTERS, MISSIONS, NPCS, REGIONS, SITES } from '../src/data/campaign.js';
import { RESOURCE_TYPES } from '../src/game/config.js';
import { BUILDING_DEFS } from '../src/data/buildings.js';
import { ENEMY_TYPES } from '../src/data/enemies.js';
import { HARVEST_STRUCTURE_TYPES } from '../src/data/harvestStructures.js';
import { FORGE_RECIPES } from '../src/data/buildingSystems.js';

// Gera LISTA-MISSOES.md com as 100 missões (para revisar o roteiro). `npm run missions:list`.
const item = (type) => RESOURCE_TYPES[type]?.label ?? type;
const site = (id) => SITES[id]?.name ?? id;
const enemy = (target) => {
  if (target === 'any') return 'inimigos';
  if (ENEMY_TYPES[target]) return ENEMY_TYPES[target].name;
  const spec = Object.values(SITES).map((entry) => entry.enemies ?? entry.boss).find((entry) => entry?.tag === target);
  return spec?.name ?? target;
};

function objective(entry) {
  const { type, target, count } = entry;
  switch (type) {
    case 'gather': return `Coletar ${count} ${item(target)}`;
    case 'structure': return `Coletar/abrir ${count}× ${HARVEST_STRUCTURE_TYPES[target]?.label ?? target}`;
    case 'kill': return `Derrotar ${count} ${enemy(target)}${entry.region ? ` (${REGIONS[entry.region]?.name ?? entry.region})` : ''}`;
    case 'boss': return `Derrotar o chefe ${enemy(target)}`;
    case 'bossPhase': return `Levar ${enemy(target)} a ${Math.round(entry.ratio * 100)}% da vida`;
    case 'owns': return `Ter fabricado: ${target.map((id) => FORGE_RECIPES[id]?.name ?? id).join(' ou ')}`;
    case 'craft': return `Fabricar ${count} ${item(target)}`;
    case 'building': return `${BUILDING_DEFS[target]?.name ?? target} no nível ${entry.level}`;
    case 'animal': return `Liberar animal: ${item(target)}`;
    case 'plant': return `Plantar ${count}× ${target === 'any' ? 'qualquer cultura' : target}`;
    case 'harvest': return `Colher ${count}× ${target === 'any' ? 'qualquer cultura' : target}`;
    case 'buy': return `Comprar ${count} itens`;
    case 'sell': return `Vender ${count} itens`;
    case 'deliver': return `Entregar ${count} ${item(target)}`;
    case 'reach': return `Chegar em ${site(target)}`;
    case 'interact': return `Investigar ${site(target)}`;
    case 'rescue': return `Resgatar ${count > 1 ? `${count} ` : ''}${site(target)}`;
    case 'talk': return `Conversar com ${NPCS[target]?.name ?? target}`;
    case 'puzzle': return `Resolver o enigma dos pilares (${target})`;
    case 'defend': return `Resistir ${count} s em ${site(target)}`;
    case 'flag': return `Concluir: ${target}`;
    case 'seals': return `Recuperar ${count} selos elementais`;
    case 'choice': return 'Tomar a decisão final (destruir ou restaurar o Golem)';
    case 'residents': return `Ter ${count} moradores no acampamento`;
    default: return `${type} ${target ?? ''} ${count ?? ''}`;
  }
}

function rewards(entry) {
  const parts = [`${entry.xp} XP`, `${entry.coins} moedas`];
  for (const [type, amount] of Object.entries(entry.items ?? {})) parts.push(`${amount} ${item(type)}`);
  return parts.join(', ');
}

const lines = ['# LENDAS — As Cinzas do Primeiro Mundo: lista das 100 missões', ''];
lines.push('Gerado a partir de `src/data/campaign.js` (`npm run missions:list`).', '');
for (const [index, chapter] of CHAPTERS.entries()) {
  const number = index + 1;
  lines.push(`## Capítulo ${number} — ${chapter.title ?? chapter.name ?? ''} (${REGIONS[chapter.region]?.name ?? chapter.region})`, '');
  lines.push('| Nº | Missão | Quem pede | Objetivos | Recompensa |', '|---|---|---|---|---|');
  for (const mission of MISSIONS.filter((entry) => entry.chapter === number)) {
    const goals = mission.objectives.map(objective).join('<br>');
    const giver = NPCS[mission.npc]?.name ?? mission.npc;
    lines.push(`| ${mission.number} | **${mission.title}**<br>${mission.description} | ${giver} | ${goals} | ${rewards(mission.rewards)} |`);
  }
  lines.push('');
}
fs.writeFileSync('LISTA-MISSOES.md', `${lines.join('\n')}\n`);
console.log(`LISTA-MISSOES.md: ${MISSIONS.length} missões`);
