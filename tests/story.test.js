import assert from 'node:assert/strict';
import test from 'node:test';
import { LORE, MISSIONS, MISSIONS_BY_ID, NPCS, SITES } from '../src/data/campaign.js';
import {
  AURELIAN_ECHOES, AURELIAN_FINAL_WORDS, BONDS, CHAPTER_STORY, ENDINGS, MISSION_STORY, NPC_STORY_LINES, SECRET_ENDING, SPEAKERS
} from '../src/data/story.js';
import { STORY_SCENE_KEYS } from '../src/art/storyScenes.js';
import { CampaignState } from '../src/game/CampaignState.js';

test('história: todo capítulo tem abertura e ilustração; registros citados existem', () => {
  for (let chapter = 1; chapter <= 10; chapter += 1) {
    assert.ok(CHAPTER_STORY[chapter]?.text?.length > 40, `capítulo ${chapter}`);
    assert.ok(STORY_SCENE_KEYS.includes(String(chapter)), `ilustração ${chapter}`);
  }
  for (const key of ['final', 'aurelian', 'libertar']) assert.ok(STORY_SCENE_KEYS.includes(key), key);
  for (const [number, story] of Object.entries(MISSION_STORY)) {
    assert.ok(MISSIONS.find((mission) => mission.number === Number(number)), `missão ${number}`);
    for (const key of story.lore ?? []) assert.ok(LORE[key], `missão ${number}: registro ${key}`);
  }
  for (const ending of Object.values(ENDINGS)) assert.ok(LORE[ending.lore], ending.lore);
  for (const key of [...SECRET_ENDING.echoes, ...SECRET_ENDING.evidence]) assert.ok(LORE[key], key);
  assert.equal(Object.keys(AURELIAN_FINAL_WORDS).sort().join(), 'destroy,free,restore');
});

test('história: objetivos e recompensas das missões não mudaram; Bram reage na missão 9', () => {
  assert.equal(MISSIONS.length, 100);
  assert.deepEqual(MISSIONS_BY_ID.m009.objectives, [{ type: 'interact', target: 'cristal', count: 1 }]);
  assert.ok(MISSIONS_BY_ID.m009.outro.includes('Bram'));
  assert.ok(MISSIONS_BY_ID.m009.storyLore.includes('fragmento'));
});

test('Aurelian: retrato, ecos no mapa e laços com moradores que existem', () => {
  assert.ok(SPEAKERS.aurelian.palette);
  for (const echo of AURELIAN_ECHOES) {
    assert.equal(SITES[echo.id]?.kind, 'echo', echo.id);
    assert.ok(MISSIONS_BY_ID[echo.afterMission], echo.afterMission);
  }
  for (const [npc, bond] of Object.entries(BONDS)) {
    assert.ok(NPCS[npc], npc);
    assert.ok(MISSIONS_BY_ID[bond.afterMission], bond.afterMission);
    assert.ok(bond.options.some((option) => option.bond) && bond.options.some((option) => !option.bond));
  }
  for (const npc of Object.keys(NPC_STORY_LINES)) assert.ok(NPCS[npc], npc);
});

test('final secreto: só libera com ecos, laços e provas; a escolha "libertar" fica salva', () => {
  const state = new CampaignState();
  assert.equal(state.secretProgress().unlocked, false);
  for (const key of [...SECRET_ENDING.echoes, ...SECRET_ENDING.evidence]) state.addLore(key);
  for (const npc of SECRET_ENDING.bonds.slice(1)) state.flags[`bond_${npc}`] = true;
  assert.equal(state.secretProgress().unlocked, false, 'falta um laço');
  state.flags[`bond_${SECRET_ENDING.bonds[0]}`] = false;
  assert.equal(state.secretProgress().unlocked, false, 'resposta fria não conta');
  state.flags[`bond_${SECRET_ENDING.bonds[0]}`] = true;
  assert.equal(state.secretProgress().unlocked, true);
  state.choice = 'free';
  const restored = new CampaignState(JSON.parse(JSON.stringify(state.serialize())));
  assert.equal(restored.choice, 'free');
  assert.equal(restored.secretProgress().unlocked, true);
});
