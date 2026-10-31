import test from 'node:test';
import assert from 'node:assert/strict';
import { PlayerSkills, SKILLS, SKILL_MAX_LEVEL, skillLevelForXp, skillXpForLevel } from '../src/data/skills.js';

test('skills: XP acumula e sobe de nível pela curva 50*n²', () => {
  const skills = new PlayerSkills();
  assert.equal(skills.level('blade'), 0);
  assert.equal(skills.addXp('blade', 50), 1); // 50 XP = nível 1
  assert.equal(skills.level('blade'), 1);
  assert.equal(skills.addXp('blade', 150), 1); // 200 XP = nível 2
  assert.equal(skills.level('blade'), 2);
  assert.equal(skillXpForLevel(3), 450);
  assert.equal(skillLevelForXp(449), 2);
  assert.equal(skillLevelForXp(450), 3);
});

test('skills: todos os bônus crescem com o nível e têm teto', () => {
  const skills = new PlayerSkills({ blade: 50 * 10 * 10, archery: 50 * 20 * 20, dodge: 50 * 50 * 50, block: 50 * 5 * 5 });
  assert.equal(skills.level('blade'), 10);
  assert.ok(Math.abs(skills.bladeDamageMultiplier() - 1.2) < 1e-9);
  assert.ok(Math.abs(skills.archeryDamageMultiplier() - 1.4) < 1e-9);
  assert.equal(skills.dodgeStaminaMultiplier(), 0.7); // não passa do piso de 70%
  assert.equal(skills.dodgeIframeBonusMs(), 150); // não passa do teto
  assert.equal(skills.blockDefenseBonus(), 5);
});

test('skills: nível máximo e serialização salva/carrega', () => {
  const skills = new PlayerSkills();
  skills.addXp('blade', 50 * SKILL_MAX_LEVEL * SKILL_MAX_LEVEL * 2);
  assert.equal(skills.level('blade'), SKILL_MAX_LEVEL);
  const restored = new PlayerSkills(skills.serialize());
  assert.equal(restored.level('blade'), SKILL_MAX_LEVEL);
  assert.deepEqual(Object.keys(SKILLS).sort(), ['archery', 'blade', 'block', 'dodge']);
});
