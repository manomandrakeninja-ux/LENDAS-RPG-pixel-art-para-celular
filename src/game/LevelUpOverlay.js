import { PERKS } from '../data/progression.js';

export class LevelUpOverlay {
  constructor(scene) {
    this.scene = scene;
    this.root = document.getElementById('level-up-panel');
    this.title = document.getElementById('level-up-title');
    this.reward = document.getElementById('level-up-reward');
    this.question = document.getElementById('level-up-question');
    this.attributes = document.getElementById('level-up-attributes');
    this.perks = document.getElementById('level-up-perks');
    this.healthButton = document.getElementById('level-up-health');
    this.attackButton = document.getElementById('level-up-attack');
    this.defenseButton = document.getElementById('level-up-defense');

    this.handleHealth = () => this.scene.chooseLevelUp('health');
    this.handleAttack = () => this.scene.chooseLevelUp('attack');
    this.handleDefense = () => this.scene.chooseLevelUp('defense');
    this.handlePerk = (event) => {
      const perk = event.target.closest('[data-perk]')?.dataset.perk;
      if (perk) this.scene.choosePerk(perk);
    };
    this.healthButton.addEventListener('click', this.handleHealth);
    this.attackButton.addEventListener('click', this.handleAttack);
    this.defenseButton.addEventListener('click', this.handleDefense);
    this.perks.addEventListener('click', this.handlePerk);
  }

  show(level) {
    this.title.textContent = `NÍVEL ${level}`;
    this.reward.hidden = false;
    this.question.textContent = 'Escolha seu bônus de atributo:';
    this.attributes.hidden = false;
    this.perks.hidden = true;
    this.root.hidden = false;
  }

  showPerks(level, offer) {
    this.title.textContent = `TALENTO • NÍVEL ${level}`;
    this.reward.hidden = true;
    this.question.textContent = 'Escolha um talento permanente:';
    this.attributes.hidden = true;
    this.perks.replaceChildren(...offer.map((perk) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.perk = perk;
      const name = document.createElement('span');
      name.textContent = PERKS[perk].name.toUpperCase();
      const description = document.createElement('small');
      description.textContent = PERKS[perk].description;
      button.append(name, description);
      return button;
    }));
    this.perks.hidden = false;
    this.root.hidden = false;
  }

  hide() {
    this.root.hidden = true;
  }

  destroy() {
    this.healthButton.removeEventListener('click', this.handleHealth);
    this.attackButton.removeEventListener('click', this.handleAttack);
    this.defenseButton.removeEventListener('click', this.handleDefense);
    this.perks.removeEventListener('click', this.handlePerk);
  }
}
