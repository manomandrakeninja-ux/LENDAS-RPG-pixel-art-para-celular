import Phaser from 'phaser';
import { BUILDING_ORDER } from '../data/buildings.js';
import {
  DAILY_UNLOCK_MISSION,
  LORE,
  MISSIONS,
  MISSIONS_BY_ID,
  NPCS,
  REGIONS,
  SEALS,
  SITES
} from '../data/campaign.js';
import { isRainyDay } from '../data/weather.js';
import { drawNpc } from '../art/person.js';
import { drawSiteArt } from '../art/sites.js';
import { CampaignState } from './CampaignState.js';
import { Enemy } from './Enemies.js';
import { RESOURCE_TYPES } from './config.js';
import { LEATHER_DROP, RARE_SHOP } from '../data/campaign.js';
import { QuestUI } from './QuestUI.js';
import { AURELIAN_ECHOES, AURELIAN_FINAL_WORDS, AURELIAN_LINES, BONDS, ENDINGS, GOLEM_CHOICE, NPC_STORY_LINES, SECRET_ENDING, SPEAKERS } from '../data/story.js';

const INTERACT_RANGE = 46;
const SPAWN_RANGE = 380;
const DEFEND_RADIUS = 170;

export { RARE_SHOP } from '../data/campaign.js';

/**
 * Lado "mundo" da campanha: locais de missão, moradores, inimigos e chefes de
 * missão, regiões com perigo, puzzles, defesas, eventos do dia e integração com a cena.
 */
export class CampaignSystem {
  constructor(scene, saved) {
    this.scene = scene;
    this.state = new CampaignState(saved);
    this.sites = new Map();
    this.npcs = new Map();
    this.eventSites = {};
    this.questEnemies = [];
    this.regionKey = null;
    this.hazardTimer = 0;
    this.hazardMessageAt = 0;
    this.siteTimer = 0;
    this.defendTimers = {};
    this.lastBossRatio = {};
    this.ensureTextures();
    this.drawRegions();
    this.ui = new QuestUI(scene, this);
    this.syncWorld();
    scene.events.once('shutdown', () => this.destroy());
  }

  // ---------- Contexto para objetivos de estado ----------

  get ctx() {
    const scene = this.scene;
    const camp = scene.camp;
    return {
      level: () => scene.progression.level,
      owns: (recipes) => recipes.some((id) => camp.equipment.has(id)),
      buildingLevel: (key) => (camp.isBuilt(key) && camp.durability[key] > 0 ? camp.levels[key] : 0),
      animalUnlocked: (product) => scene.farm.unlockedAnimals.includes(product),
      available: (item) => (scene.inventory.items[item] ?? 0) + (camp.storage[item] ?? 0)
    };
  }

  // ---------- Texturas ----------

  ensureTextures() {
    const textures = this.scene.textures;
    const put = (key, pixels) => {
      if (textures.exists(key)) return;
      const texture = textures.createCanvas(key, pixels.width, pixels.height);
      texture.getContext().putImageData(new ImageData(pixels.data, pixels.width, pixels.height), 0, 0);
      texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      texture.refresh();
    };
    const arts = new Set(Object.values(SITES).map((site) => site.art).filter(Boolean));
    for (const art of [...arts, 'pillarLit', 'bridgeFixed']) put(`site-${art}`, drawSiteArt(art));
    for (const [id, speaker] of Object.entries(SPEAKERS)) put(`npc-${id}-0`, drawNpc(speaker.palette, 0));
    for (const [id, npc] of Object.entries(NPCS)) {
      for (const frame of [0, 1]) put(`npc-${id}-${frame}`, drawNpc(npc.palette, frame));
      if (!this.scene.anims.exists(`npc-${id}-idle`)) {
        this.scene.anims.create({
          key: `npc-${id}-idle`,
          frames: [{ key: `npc-${id}-0` }, { key: `npc-${id}-1` }],
          frameRate: 1.6,
          repeat: -1
        });
      }
    }
  }

  // ---------- Regiões ----------

  drawRegions() {
    this.regionGraphics = this.scene.add.graphics().setDepth(-998);
    for (const region of Object.values(REGIONS)) {
      if (!region.radius) continue;
      // Degradê: anéis concêntricos com transparência crescente para o centro.
      for (let step = 6; step >= 1; step -= 1) {
        const ratio = step / 6;
        this.regionGraphics.fillStyle(region.tint, region.alpha * (1 - ratio) * 0.55 + region.alpha * 0.12);
        this.regionGraphics.fillEllipse(region.x, region.y, region.radius * 2 * ratio, region.radius * 1.6 * ratio);
      }
    }
    this.scene.hudCamera?.ignore(this.regionGraphics);
  }

  regionAt(x, y) {
    for (const [key, region] of Object.entries(REGIONS)) {
      if (!region.radius) continue;
      const nx = (x - region.x) / region.radius;
      const ny = (y - region.y) / (region.radius * 0.8);
      if (nx * nx + ny * ny <= 1) return key;
    }
    return null;
  }

  // ---------- Quais locais e moradores aparecem ----------

  siteRegion(site) {
    return site.region ?? 'acampamento';
  }

  /** Locais usados por uma missão ativa (ou por um evento do dia). */
  activeSiteIds() {
    const ids = new Set();
    const state = this.state;
    for (const mission of state.activeMissions()) {
      const entry = state.entry(mission.id);
      mission.objectives.forEach((objective, index) => {
        // Objetivos de evento já cumpridos não precisam mais do local.
        if (objective.type !== 'deliver' && (entry.progress[index] ?? 0) >= (objective.count ?? 1)) return;
        for (const id of this.sitesForObjective(mission, objective)) ids.add(id);
      });
    }
    for (const id of Object.keys(this.eventSites)) ids.add(id);
    for (const echo of AURELIAN_ECHOES) {
      if (state.stateOf(echo.afterMission) === 'done' && !state.lore.includes(echo.lore)) ids.add(echo.id);
    }
    // Locais já resolvidos somem.
    for (const id of [...ids]) {
      const saved = state.sites[id] ?? {};
      const site = this.siteDef(id);
      if (!site) ids.delete(id);
      else if (['rescue', 'talk'].includes(site.kind) && saved.done) ids.delete(id);
    }
    return ids;
  }

  siteDef(id) {
    return SITES[id] ?? this.eventSites[id] ?? null;
  }

  sitesForObjective(mission, objective) {
    const entries = Object.entries(SITES);
    const target = objective.target;
    switch (objective.type) {
      case 'reach':
      case 'interact':
      case 'defend':
        return SITES[target] ? [target] : [];
      case 'talk': {
        if (this.npcInCamp(target)) return [];
        if (SITES[target]) return [target];
        return entries.filter(([, site]) => site.recruits === target).map(([id]) => id);
      }
      case 'rescue':
        return entries.filter(([id, site]) => id === target || site.group === target).map(([id]) => id);
      case 'puzzle':
        return entries.filter(([, site]) => site.group === target).map(([id]) => id);
      case 'boss':
      case 'bossPhase':
        return entries.filter(([, site]) => site.boss?.tag === target).map(([id]) => id);
      case 'kill':
        return entries.filter(([, site]) => site.enemies?.tag === target).map(([id]) => id);
      case 'structure':
        return entries.filter(([, site]) => site.emits?.target === target).map(([id]) => id);
      case 'choice':
        return entries.filter(([, site]) => site.kind === 'choice').map(([id]) => id);
      case 'gather':
      case 'deliver': {
        const givers = entries.filter(([, site]) => site.gives?.[target]);
        const near = givers.filter(([, site]) => [mission.region, 'acampamento'].includes(this.siteRegion(site)));
        return (near.length > 0 ? near : givers).map(([id]) => id);
      }
      default:
        return [];
    }
  }

  npcInCamp(id) {
    const npc = NPCS[id];
    if (!npc) return false;
    if (npc.startsInCamp || this.state.recruited.includes(id)) return true;
    const recruitedBySite = Object.values(SITES).some((site) => site.recruits === id);
    if (recruitedBySite) return false;
    // Construtor e mercador chegam quando a primeira missão deles é liberada.
    return MISSIONS.some((mission) => mission.npc === id && this.state.stateOf(mission.id) !== 'locked');
  }

  // ---------- Criação/remoção de locais e moradores ----------

  syncWorld() {
    const wanted = this.activeSiteIds();
    for (const [id, site] of this.sites) {
      if (!wanted.has(id)) this.removeSite(id, site);
    }
    for (const id of wanted) if (!this.sites.has(id)) this.createSite(id);
    for (const id of Object.keys(NPCS)) {
      const inCamp = this.npcInCamp(id);
      if (inCamp && !this.npcs.has(id)) this.createNpc(id);
      if (!inCamp && this.npcs.has(id)) this.removeNpc(id);
    }
    this.refreshMarkers();
  }

  createSite(id) {
    const def = this.siteDef(id);
    if (!def) return;
    const scene = this.scene;
    const objects = [];
    let sprite = null;
    if (def.art && def.kind !== 'assault') {
      let texture = `site-${def.art}`;
      if (def.art === 'sheep') texture = null;
      if (def.kind === 'pillar' && this.pillarLit(def)) texture = 'site-pillarLit';
      sprite = texture
        ? scene.add.image(def.x, def.y, texture).setOrigin(0.5, 0.9)
        : scene.add.sprite(def.x, def.y, 'livestock', 0).setOrigin(0.5, 0.9).play('sheep-walk');
      sprite.setDepth(def.y + 6);
      objects.push(sprite);
    }
    const label = scene.add.text(def.x, def.y - (sprite ? sprite.displayHeight * 0.9 + 10 : 20), def.name.toUpperCase(), {
      fontSize: '8px', color: '#ffe8a8', backgroundColor: '#2a1d14d9', padding: { x: 4, y: 3 }
    }).setOrigin(0.5).setScale(0.5).setDepth(def.y + 900);
    const marker = scene.add.text(def.x, label.y - 12, '!', {
      fontSize: '8px', color: '#ffd76b', stroke: '#2a1d14', strokeThickness: 4
    }).setOrigin(0.5).setDepth(def.y + 901);
    scene.tweens.add({ targets: marker, y: marker.y - 4, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    objects.push(label, marker);
    scene.hudCamera?.ignore(objects);
    this.sites.set(id, { id, def, sprite, label, marker, objects, spawned: [], usesLeft: def.uses ?? 1, readyAt: 0 });
  }

  removeSite(id, site = this.sites.get(id)) {
    if (!site) return;
    for (const object of site.objects) object.destroy();
    for (const enemy of site.spawned) {
      if (enemy.active && !enemy.dead) this.scene.enemyDirector.remove(enemy);
    }
    this.sites.delete(id);
  }

  createNpc(id) {
    const npc = NPCS[id];
    const scene = this.scene;
    const x = scene.camp.x + npc.home.x;
    const y = scene.camp.y + npc.home.y;
    const sprite = scene.add.sprite(x, y, `npc-${id}-0`).setOrigin(0.5, 0.68).setDepth(y + 30).play(`npc-${id}-idle`);
    const label = scene.add.text(x, y - 26, npc.role.toUpperCase(), {
      fontSize: '8px', color: '#f4e6c6', backgroundColor: '#2a1d14cc', padding: { x: 3, y: 2 }
    }).setOrigin(0.5).setScale(0.5).setDepth(y + 900);
    const marker = scene.add.text(x, y - 38, '', {
      fontSize: '8px', color: '#ffd76b', stroke: '#2a1d14', strokeThickness: 4
    }).setOrigin(0.5).setDepth(y + 901);
    scene.tweens.add({ targets: marker, y: marker.y - 3, duration: 650, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    scene.hudCamera?.ignore([sprite, label, marker]);
    this.npcs.set(id, { id, sprite, label, marker, x, y });
  }

  removeNpc(id) {
    const npc = this.npcs.get(id);
    if (!npc) return;
    npc.sprite.destroy();
    npc.label.destroy();
    npc.marker.destroy();
    this.npcs.delete(id);
  }

  /** "!" = missão para aceitar, "?" = missão pronta para entregar. */
  refreshMarkers() {
    const ctx = this.ctx;
    for (const [id, npc] of this.npcs) {
      let mark = '';
      for (const mission of MISSIONS) {
        if (mission.npc !== id) continue;
        const state = this.state.stateOf(mission.id);
        if (state === 'active' && this.state.isComplete(mission, ctx)) { mark = '?'; break; }
        if (state === 'available') mark = '!';
      }
      if (!mark && this.pendingBond(id)) mark = '...';
      npc.marker.setText(mark);
    }
  }

  // ---------- Eventos do jogo ----------

  /** Ponto único de entrada dos eventos reais do jogo (coleta, abate, construção...). */
  emit(event) {
    const changes = this.state.emit(event);
    if (changes.length === 0) return changes;
    for (const change of changes) {
      if (change.mission) {
        const objective = change.mission.objectives[change.index];
        // Contagem de segundos (defesa) avisa só a cada 10 s, para não encher a tela.
        if (objective.type === 'defend' && change.value % 10 !== 0 && change.value < change.count) continue;
        this.ui.toast(`${change.mission.title}: ${this.ui.objectiveLabel(objective)} ${change.value}/${change.count}`);
      } else if (change.daily && change.value >= change.count) {
        this.ui.toast(`Diária pronta: ${change.template.title}`, 'gold');
      }
    }
    this.afterProgress();
    return changes;
  }

  /** Abate de inimigo: missões, couro de lobos/javalis e chefes. */
  onEnemyDefeated(enemy) {
    const region = this.regionAt(enemy.x, enemy.y);
    this.emit({
      type: 'kill',
      kind: enemy.kind,
      tag: enemy.questTag ?? null,
      elite: Boolean(enemy.isElite),
      region,
      night: Boolean(this.scene.timeState?.isNight)
    });
    if (enemy.isQuestBoss) this.emit({ type: 'boss', target: enemy.questTag });
    // Couro: lobos, javalis e ursos às vezes deixam couro.
    if (LEATHER_DROP.enemies.includes(enemy.kind) && Math.random() < LEATHER_DROP.chance) this.giveItems({ leather: 1 }, enemy.x, enemy.y);
    this.questEnemies = this.questEnemies.filter((entry) => entry !== enemy);
  }

  /** Itens obtidos de verdade (coleta, baú, drop, colheita, animais) contam para "coletar". */
  onGathered(bundle = {}) {
    for (const [target, amount] of Object.entries(bundle)) {
      if (amount > 0) this.emit({ type: 'gather', target, amount });
    }
  }

  giveItems(bundle, x, y) {
    const result = this.scene.inventory.addBundle(bundle);
    if (Object.keys(result.remaining).length > 0) {
      this.scene.deathBackpacks.create(x ?? this.scene.player.x, y ?? this.scene.player.y, result.remaining);
    }
    this.onGathered(result.accepted);
    return result;
  }

  afterProgress() {
    this.autoTurnIn();
    this.syncWorld();
    this.ui.refresh();
  }

  /** Missões sem entrega de itens se concluem sozinhas (com a tela de recompensa). */
  autoTurnIn() {
    const ctx = this.ctx;
    for (const mission of this.state.activeMissions()) {
      const needsDelivery = mission.objectives.some((objective) => objective.type === 'deliver');
      if (!needsDelivery && this.state.isComplete(mission, ctx)) this.turnIn(mission.id);
    }
  }

  accept(id) {
    if (!this.state.accept(id)) return false;
    const mission = MISSIONS_BY_ID[id];
    this.ui.toast(`Missão aceita: ${mission.title}`, 'gold');
    // Objetivos de estado já cumpridos (ex.: já ter a espada) contam na hora.
    this.afterProgress();
    this.scene.save();
    return true;
  }

  turnIn(id) {
    const mission = MISSIONS_BY_ID[id];
    if (!mission || !this.state.canTurnIn(id, this.ctx)) return null;
    // Confere o pagamento, conclui a missão e só então consome os itens:
    // assim nunca se perde item sem concluir, nem se conclui sem pagar.
    const cost = this.state.deliveryCost(mission);
    const hasCost = Object.keys(cost).length > 0;
    if (hasCost && !this.scene.camp.canPay(cost)) return null;
    const result = this.state.turnIn(id, this.ctx);
    if (!result) return null;
    if (hasCost) this.scene.camp.pay(cost);
    this.applyRewards(result.rewards);
    const lore = mission.lore ? LORE[mission.lore] : null;
    this.ui.showReward(mission, result.rewards, lore);
    const next = this.state.availableMissions()[0];
    // Etapas seguidas de uma mesma luta (fases do Golem) começam na hora.
    if (next?.autoAccept) this.state.accept(next.id);
    else if (next) this.offerMission(next);
    if (mission.chapter !== next?.chapter && next) this.ui.showChapter(next.chapter);
    if (id === MISSIONS[DAILY_UNLOCK_MISSION - 1].id) this.state.refreshDaily(this.scene.timeState.dayCount);
    for (const [npcId, bond] of Object.entries(BONDS)) {
      if (bond.afterMission === id) this.ui.toast(`${NPCS[npcId].name} quer conversar com você.`, 'gold');
    }
    if (mission.number === 99) this.showEnding();
    this.syncWorld();
    this.ui.refresh();
    this.scene.save();
    return result;
  }

  /** Oferece a missão recém-liberada na hora, com o morador que a pede. */
  offerMission(mission) {
    this.ui.toast(`Nova missão: ${mission.title}`, 'gold');
    this.ui.dialogue(mission.npc, `Nova missão — ${mission.title}: ${mission.description}${mission.intro ? ` ${mission.intro}` : ''}`, [
      { label: 'ACEITAR', primary: true, action: () => this.accept(mission.id) },
      { label: 'DEPOIS (L)', action: () => {} }
    ]);
  }

  /** Destino mais próximo da missão rastreada (local ou morador), para o rastreador apontar. */
  trackedTarget() {
    const state = this.state;
    const mission = state.tracked ? MISSIONS_BY_ID[state.tracked] : null;
    if (!mission) return null;
    const ctx = this.ctx;
    const player = this.scene.player;
    const candidates = [];
    mission.objectives.forEach((objective, index) => {
      if (state.objectiveValue(mission, index, ctx) >= (objective.count ?? 1)) return;
      for (const id of this.sitesForObjective(mission, objective)) {
        const site = this.sites.get(id);
        if (site) candidates.push({ name: site.def.name, x: site.def.x, y: site.def.y });
      }
      if (objective.type === 'talk' && this.npcs.has(objective.target)) {
        const npc = this.npcs.get(objective.target);
        candidates.push({ name: NPCS[objective.target].name, x: npc.x, y: npc.y });
      }
    });
    if (candidates.length === 0 && state.isComplete(mission, ctx) && this.npcs.has(mission.npc)) {
      const npc = this.npcs.get(mission.npc);
      candidates.push({ name: NPCS[mission.npc].name, x: npc.x, y: npc.y });
    }
    let best = null;
    for (const candidate of candidates) {
      candidate.distance = Phaser.Math.Distance.Between(player.x, player.y, candidate.x, candidate.y);
      if (!best || candidate.distance < best.distance) best = candidate;
    }
    if (!best) return null;
    const angle = Math.atan2(best.y - player.y, best.x - player.x);
    const directions = ['L', 'SE', 'S', 'SO', 'O', 'NO', 'N', 'NE'];
    best.direction = directions[(Math.round(angle / (Math.PI / 4)) + 8) % 8];
    best.steps = Math.round(best.distance / 10);
    return best;
  }

  chapterTitle(number) {
    return ['O Viajante sem Memória', 'A Vila Começa a Viver', 'Ferro, Comércio e Muralhas', 'Os Mistérios da Floresta',
      'O Reino Perdido', 'A Terra Congelada', 'O Deserto dos Ossos', 'A Guerra das Cinzas', 'A Montanha das Cinzas',
      'O Destino de Eldoria'][number - 1] ?? '';
  }

  applyRewards(rewards = {}) {
    const scene = this.scene;
    if (rewards.coins) scene.economy.addCoins(rewards.coins);
    if (rewards.items && Object.keys(rewards.items).length > 0) {
      // Recompensas vão para o armazém da Casa; o que não couber, para a mochila.
      const { remaining } = scene.camp.store(rewards.items);
      if (Object.keys(remaining).length > 0) {
        const left = scene.inventory.addBundle(remaining).remaining;
        if (Object.keys(left).length > 0) scene.deathBackpacks.create(scene.player.x, scene.player.y, left);
      }
    }
    if (rewards.xp) scene.grantExperience(rewards.xp);
  }

  claimDaily(index) {
    const daily = this.state.daily.list[index];
    const template = daily && this.state.dailyTemplate(daily);
    if (!template) return null;
    const cost = template.objective.type === 'deliver' ? { [template.objective.target]: template.objective.count } : null;
    if (cost && !this.scene.camp.canPay(cost)) return null;
    const result = this.state.claimDaily(index, this.ctx);
    if (!result) return null;
    if (cost) this.scene.camp.pay(cost);
    this.applyRewards(result.rewards);
    this.ui.toast(`Diária concluída: ${template.title} • +${result.rewards.coins} moedas`, 'gold');
    this.ui.refresh();
    this.scene.save();
    return result;
  }

  /** Final conforme a escolha da missão 95 (fica salvo nos Registros). */
  showEnding() {
    const key = ['destroy', 'free'].includes(this.state.choice) ? this.state.choice : 'restore';
    const ending = ENDINGS[key];
    this.state.addLore(ending.lore);
    this.ui.showChapter(10, {
      title: ending.title, kicker: key === 'free' ? 'Final secreto' : 'Fim da campanha', text: LORE[ending.lore].text, image: ending.image ?? 'final',
      onClose: () => this.ui.dialogue('aurelian', AURELIAN_FINAL_WORDS[key], [{ label: 'CONTINUAR', action: () => {} }])
    });
  }

  // ---------- Interação (tecla E / botão de ação) ----------

  /** Local ou morador mais próximo com que dá para interagir. */
  nearestInteraction() {
    const player = this.scene.player;
    let best = null;
    let bestDistance = INTERACT_RANGE;
    for (const [id, npc] of this.npcs) {
      const distance = Phaser.Math.Distance.Between(player.x, player.y, npc.x, npc.y);
      if (distance < bestDistance) {
        best = { type: 'npc', id, label: `Falar com ${NPCS[id].name}` };
        bestDistance = distance;
      }
    }
    for (const [id, site] of this.sites) {
      const def = site.def;
      if (['marker', 'enemies', 'boss', 'defend', 'assault'].includes(def.kind)) continue;
      const distance = Phaser.Math.Distance.Between(player.x, player.y, def.x, def.y);
      if (distance < bestDistance + 8) {
        const verbs = { source: 'Coletar em', loot: 'Revistar', investigate: 'Investigar', rescue: 'Resgatar', talk: 'Falar em', pillar: 'Ativar', choice: 'Decidir em', echo: 'Ouvir' };
        best = { type: 'site', id, label: `${verbs[def.kind] ?? 'Usar'} ${def.name}` };
        bestDistance = distance;
      }
    }
    return best;
  }

  interact() {
    const target = this.nearestInteraction();
    if (!target) return false;
    if (target.type === 'npc') this.talkToNpc(target.id);
    else this.useSite(target.id);
    return true;
  }

  talkToNpc(id) {
    const npc = NPCS[id];
    const ctx = this.ctx;
    this.emit({ type: 'talk', targets: [id] });
    const ready = MISSIONS.find((mission) => mission.npc === id && this.state.stateOf(mission.id) === 'active' &&
      this.state.isComplete(mission, ctx));
    if (ready) {
      this.ui.dialogue(id, ready.outro ?? 'Excelente trabalho! Aqui está a sua recompensa.', [
        { label: 'ENTREGAR', primary: true, action: () => this.turnIn(ready.id) },
        { label: 'DEPOIS', action: () => {} }
      ]);
      return;
    }
    const offer = MISSIONS.find((mission) => mission.npc === id && this.state.stateOf(mission.id) === 'available');
    if (offer) {
      this.ui.dialogue(id, `${offer.title}: ${offer.description}${offer.intro ? ` ${offer.intro}` : ''}`, [
        { label: 'ACEITAR', primary: true, action: () => this.accept(offer.id) },
        { label: 'AGORA NÃO', action: () => {} }
      ]);
      return;
    }
    const bond = this.pendingBond(id);
    if (bond) {
      this.openBond(id, bond);
      return;
    }
    if (id === 'mercador' && (this.state.flags.shadowMerchant || this.state.flags.mirageMarket)) {
      this.openShop(id);
      return;
    }
    const lines = this.storyLines(id);
    const line = lines[(this.state.currentChapter + this.state.residents + (this.talkCount = (this.talkCount ?? 0) + 1)) % lines.length];
    const active = MISSIONS.find((mission) => mission.npc === id && this.state.stateOf(mission.id) === 'active');
    this.ui.dialogue(id, active ? `${line} (Missão: ${active.title})` : line, [{ label: 'ATÉ MAIS', action: () => {} }]);
  }

  /** Falas do morador de acordo com o capítulo atual (src/data/story.js). */
  storyLines(id) {
    const byChapter = NPC_STORY_LINES[id];
    const chapter = this.state.currentChapter;
    if (!byChapter) return NPCS[id].lines;
    const unlocked = Object.keys(byChapter).map(Number).filter((from) => from <= chapter).sort((a, b) => b - a);
    const lines = unlocked.flatMap((from) => byChapter[from]).slice(0, 4);
    return lines.length > 0 ? lines : NPCS[id].lines;
  }

  openShop(owner) {
    const coins = this.scene.economy.coins;
    this.ui.dialogue(owner, `Mercadorias raras. Você tem ${coins} moedas.`, [
      ...RARE_SHOP.map((offer) => ({
        label: `${offer.name.toUpperCase()} • ${offer.price}`,
        disabled: coins < offer.price,
        action: () => {
          if (!this.scene.economy.spendCoins(offer.price)) return;
          this.giveItems(offer.items);
          this.emit({ type: 'buy', amount: 1 });
          this.ui.toast(`Comprou ${offer.name}.`, 'gold');
          this.scene.save();
          this.openShop(owner);
        }
      })),
      { label: 'SAIR', action: () => {} }
    ], { keepOpen: true });
  }

  siteState(id) {
    this.state.sites[id] ??= {};
    return this.state.sites[id];
  }

  useSite(id) {
    const site = this.sites.get(id);
    if (!site) return;
    const def = site.def;
    const saved = this.siteState(id);
    const scene = this.scene;
    switch (def.kind) {
      case 'source': {
        if (performance.now() < site.readyAt) return;
        if (site.usesLeft <= 0) { scene.ui.showMessage(`${def.name}: nada mais por hoje.`); return; }
        if (!scene.inventory.canAddBundle(def.gives)) { scene.ui.showMessage('Mochila cheia! Volte ao acampamento'); return; }
        site.usesLeft -= 1;
        site.readyAt = performance.now() + 400;
        this.giveItems(def.gives, def.x, def.y);
        if (def.emits) this.emit({ ...def.emits });
        scene.effects.spawnHarvest(def.x, def.y - 10, 0xa9d4ff);
        scene.audio.playCollect();
        scene.ui.showMessage(`${def.name}: +${this.formatBundle(def.gives)}`);
        break;
      }
      case 'loot': {
        const owner = this.ownerMission(id);
        if (saved.lootedFor === owner) { scene.ui.showMessage(`${def.name} já foi revistado.`); return; }
        if (!scene.inventory.canAddBundle(def.gives)) { scene.ui.showMessage('Mochila cheia! Volte ao acampamento'); return; }
        saved.lootedFor = owner;
        this.giveItems(def.gives, def.x, def.y);
        if (def.lore && this.state.addLore(def.lore)) this.ui.toast(`Registro descoberto: ${LORE[def.lore].title}`, 'gold');
        this.emit({ type: 'interact', target: id });
        if (def.emits) this.emit({ ...def.emits });
        scene.audio.playCollect();
        scene.ui.showMessage(`${def.name}: +${this.formatBundle(def.gives)}`);
        break;
      }
      case 'investigate': {
        if (def.seal && this.state.addSeal(def.seal)) {
          this.scene.showEpic?.('SELO RECUPERADO', `${SEALS[def.seal].name} pulsa em sintonia com o fragmento vermelho.`, 4200);
        }
        if (def.lore && this.state.addLore(def.lore)) {
          this.ui.dialogue(null, `${LORE[def.lore].title}: ${LORE[def.lore].text}`, [{ label: 'CONTINUAR', action: () => {} }], { title: def.name });
        } else {
          scene.ui.showMessage(`${def.name}: investigado.`);
        }
        this.emit({ type: 'interact', target: id });
        break;
      }
      case 'rescue': {
        saved.done = true;
        if (def.recruits) {
          this.state.recruit(def.recruits);
          this.ui.toast(`${NPCS[def.recruits].name} se juntou ao acampamento!`, 'gold');
        }
        if (def.residents) this.state.residents += def.residents;
        if (def.event) this.applyRewards(def.reward);
        scene.effects.spawnHeal(def.x, def.y - 10);
        scene.ui.showMessage(`${def.name}: resgatado!`);
        this.emit({ type: 'rescue', target: id, group: def.group ?? null });
        if (def.event) delete this.eventSites[id];
        break;
      }
      case 'talk': {
        if (def.event === 'merchant') { this.openShop(null); return; }
        saved.done = true;
        if (def.recruits) {
          this.state.recruit(def.recruits);
          this.ui.toast(`${NPCS[def.recruits].name} se juntou ao acampamento!`, 'gold');
        }
        if (def.residents) this.state.residents += def.residents;
        if (def.flag) this.state.flags[def.flag] = true;
        this.ui.dialogue(def.recruits ?? null, def.recruits ? NPCS[def.recruits].lines[0] : `${def.name}: acordo fechado.`, [{ label: 'CONTINUAR', action: () => {} }], { title: def.name });
        this.emit({ type: 'talk', targets: [id, def.recruits].filter(Boolean) });
        break;
      }
      case 'pillar':
        this.activatePillar(id, def);
        break;
      case 'echo': {
        // Memória de Aurelian: cena ilustrada e depois a voz do rei.
        const echo = AURELIAN_ECHOES.find((entry) => entry.id === def.echo);
        if (!echo) return;
        this.state.addLore(echo.lore);
        this.ui.toast(`Eco do Rei encontrado: ${echo.title.replace('Memória: ', '')}`, 'gold');
        this.ui.showChapter(10, {
          title: echo.title, kicker: 'Eco do Rei', text: echo.text, image: 'aurelian',
          onClose: () => this.ui.dialogue('aurelian', echo.speech, [{ label: 'CONTINUAR', action: () => {} }])
        });
        break;
      }
      case 'choice':
        // Primeiro fala o que restou de Aurelian; depois a escolha.
        this.ui.dialogue('aurelian', AURELIAN_LINES.choice, [{ label: 'OUVIR A ESCOLHA', primary: true, action: () => this.showGolemChoice() }]);
        return;
      default:
        return;
    }
    this.syncWorld();
    this.ui.refresh();
    scene.save();
  }

  /** Missão 95: restaurar, destruir ou (com tudo descoberto) libertar o Coração. */
  showGolemChoice() {
    const secret = this.state.secretProgress();
    const options = [
      { label: GOLEM_CHOICE.restore.label, primary: true, action: () => this.makeChoice('restore') },
      { label: GOLEM_CHOICE.destroy.label, action: () => this.makeChoice('destroy') }
    ];
    if (secret.unlocked) options.unshift({ label: SECRET_ENDING.choice.label, primary: true, action: () => this.makeChoice('free') });
    const text = secret.unlocked
      ? `${GOLEM_CHOICE.text} Você reuniu todas as memórias do rei, os laços com os moradores e as provas do Eclipse: o Coração pode ser libertado.`
      : `${GOLEM_CHOICE.text} ${SECRET_ENDING.hint}`;
    this.ui.dialogue(null, text, options, { title: GOLEM_CHOICE.title });
  }

  /** Conversa pessoal disponível com o morador (laço), se houver. */
  pendingBond(id) {
    const bond = BONDS[id];
    if (!bond || this.state.stateOf(bond.afterMission) !== 'done') return null;
    return this.state.flags[`bond_${id}`] === undefined ? bond : null;
  }

  openBond(id, bond) {
    this.ui.dialogue(id, bond.text, bond.options.map((option) => ({
      label: option.label,
      primary: option.bond,
      action: () => {
        this.state.flags[`bond_${id}`] = option.bond;
        if (option.bond) this.ui.toast(`Laço fortalecido com ${NPCS[id].name}.`, 'gold');
        this.ui.dialogue(id, option.reply, [{ label: 'CONTINUAR', action: () => {} }]);
        this.refreshMarkers();
        this.scene.save();
      }
    })));
  }

  makeChoice(choice) {
    this.state.choice = choice;
    this.ui.toast(GOLEM_CHOICE[choice]?.toast ?? SECRET_ENDING.choice.toast, 'gold');
    this.afterProgress();
    this.scene.save();
  }

  /** Missão ativa que está usando o local (para itens de "revistar" uma vez por missão). */
  ownerMission(id) {
    for (const mission of this.state.activeMissions()) {
      if (mission.objectives.some((objective) => this.sitesForObjective(mission, objective).includes(id))) return mission.id;
    }
    return 'evento';
  }

  pillarLit(def) {
    const lit = this.siteState(`puzzle-${def.group}`).lit ?? 0;
    return def.order <= lit;
  }

  activatePillar(id, def) {
    const puzzle = this.siteState(`puzzle-${def.group}`);
    const lit = puzzle.lit ?? 0;
    const total = Object.values(SITES).filter((site) => site.group === def.group).length;
    if (def.order <= lit) return;
    if (def.order === lit + 1) {
      puzzle.lit = lit + 1;
      this.sites.get(id)?.sprite?.setTexture('site-pillarLit');
      this.scene.effects.spawnHarvest(def.x, def.y - 18, 0xffe08a);
      this.scene.ui.showMessage(`${def.name} acendeu (${puzzle.lit}/${total}).`);
      if (puzzle.lit >= total) this.emit({ type: 'puzzle', target: def.group });
    } else {
      puzzle.lit = 0;
      for (const [siteId, site] of this.sites) {
        if (site.def.group === def.group) site.sprite?.setTexture(`site-${site.def.art}`);
        void siteId;
      }
      this.scene.cameras.main.shake(160, 0.004, true);
      this.scene.ui.showMessage('A sequência se desfez. Leia a dica da missão e tente de novo.');
    }
  }

  formatBundle(bundle) {
    return Object.entries(bundle).map(([type, amount]) => `${amount} ${RESOURCE_TYPES[type]?.label.toLowerCase() ?? type}`).join(', ');
  }

  // ---------- Inimigos e chefes de missão ----------

  spawnGroup(site, spec, count, { boss = false } = {}) {
    const scene = this.scene;
    const def = site.def;
    const created = [];
    for (let index = 0; index < count; index += 1) {
      const angle = (index / Math.max(1, count)) * Math.PI * 2 + Math.random() * 0.6;
      const radius = boss ? 0 : 40 + Math.random() * 50;
      const x = def.x + Math.cos(angle) * radius;
      const y = def.y + 20 + Math.sin(angle) * radius * 0.7;
      const enemy = new Enemy(scene, x, y, spec.kind, {
        elite: boss || Boolean(spec.elite),
        isNight: false,
        name: spec.name,
        visual: spec.visual
      });
      enemy.isQuestEnemy = true;
      enemy.questTag = spec.tag;
      enemy.perception = boss ? 420 : 320;
      if (boss) {
        enemy.isQuestBoss = true;
        enemy.noFlee = true;
        enemy.maxHealth = Math.round(enemy.maxHealth * (spec.health ?? 5) / 2.2);
        const startRatio = this.bossStartRatio(spec.tag);
        enemy.health = Math.max(1, Math.round(enemy.maxHealth * startRatio));
        enemy.damage = Math.round(enemy.damage * (spec.damage ?? 1.3));
      }
      if (spec.scale) enemy.sprite.setScale(spec.scale);
      if (spec.tint) enemy.sprite.setTint(spec.tint);
      if (spec.campAssault) {
        enemy.ignoresSafeZone = true;
        enemy.homeX = scene.camp.x;
        enemy.homeY = scene.camp.y;
        enemy.perception = 900;
      }
      scene.enemies.push(enemy);
      scene.hudCamera?.ignore(enemy);
      created.push(enemy);
      this.questEnemies.push(enemy);
    }
    site.spawned.push(...created);
    return created;
  }

  /** Chefes que já passaram por uma fase voltam com a vida daquela fase. */
  bossStartRatio(tag) {
    let ratio = 1;
    for (const mission of MISSIONS) {
      if (this.state.stateOf(mission.id) !== 'done') continue;
      for (const objective of mission.objectives) {
        if (objective.type === 'bossPhase' && objective.target === tag) ratio = Math.min(ratio, objective.ratio);
      }
    }
    return ratio;
  }

  /** Quantos inimigos com a etiqueta ainda faltam para as missões ativas. */
  remainingKills(tag) {
    let needed = 0;
    for (const mission of this.state.activeMissions()) {
      const entry = this.state.entry(mission.id);
      mission.objectives.forEach((objective, index) => {
        if (objective.type === 'kill' && objective.target === tag) needed = Math.max(needed, objective.count - entry.progress[index]);
      });
    }
    return needed;
  }

  bossNeeded(tag) {
    return this.state.activeMissions().some((mission) => {
      const entry = this.state.entry(mission.id);
      return mission.objectives.some((objective, index) =>
        ['boss', 'bossPhase'].includes(objective.type) && objective.target === tag && entry.progress[index] < 1);
    });
  }

  updateSites(delta) {
    const scene = this.scene;
    const player = scene.player;
    for (const [id, site] of this.sites) {
      const def = site.def;
      site.spawned = site.spawned.filter((enemy) => enemy.active && !enemy.dead);
      const distance = Phaser.Math.Distance.Between(player.x, player.y, def.x, def.y);
      if (def.kind === 'marker' && distance < 90) {
        this.emit({ type: 'reach', target: id });
        if (def.flag) this.state.flags[def.flag] = true;
      } else if (def.kind === 'enemies' && distance < SPAWN_RANGE && site.spawned.length === 0) {
        const missing = this.remainingKills(def.enemies.tag);
        if (missing > 0) {
          this.spawnGroup(site, def.enemies, Math.min(missing, def.enemies.count));
          scene.ui.showMessage(`${def.name}: inimigos à vista!`);
        }
      } else if (def.kind === 'boss' && !def.boss.worldBoss && distance < SPAWN_RANGE && site.spawned.length === 0 && this.bossNeeded(def.boss.tag)) {
        this.spawnGroup(site, def.boss, 1, { boss: true });
        scene.showEpic?.(def.boss.name.toUpperCase(), def.name, 2600);
      } else if (def.kind === 'assault' && site.spawned.length === 0 && scene.timeState?.isNight) {
        const missing = this.remainingKills(def.enemies.tag);
        if (missing > 0) this.startAssault(site, Math.min(missing, def.enemies.count));
      } else if (def.kind === 'defend') {
        this.updateDefend(id, site, distance, delta);
      }
    }
    // Fases dos chefes (ex.: Golem de Fogo com metade da vida).
    for (const enemy of this.questEnemies) {
      if (!enemy.isQuestBoss || enemy.dead) continue;
      const ratio = enemy.health / enemy.maxHealth;
      if (ratio <= 0.5 && !enemy.enraged) {
        enemy.enraged = true;
        enemy.baseSpeed = Math.round(enemy.baseSpeed * 1.3);
        enemy.damage = Math.round(enemy.damage * 1.25);
        enemy.sprite.setTint(0xff8a5a);
        if (enemy.questTag === 'golem') scene.showEpic?.('O COLOSSO DESPERTA', 'O Golem de Fogo entra em fúria!', 2600);
      }
      if (this.lastBossRatio[enemy.questTag] !== ratio) {
        this.lastBossRatio[enemy.questTag] = ratio;
        this.emit({ type: 'bossPhase', target: enemy.questTag, ratio });
      }
    }
  }

  startAssault(site, count) {
    const scene = this.scene;
    const spec = { ...site.def.enemies, campAssault: true };
    const created = this.spawnGroup(site, spec, count);
    created.forEach((enemy, index) => {
      const angle = (index / count) * Math.PI * 2;
      enemy.body.reset(scene.camp.x + Math.cos(angle) * 460, scene.camp.y + Math.sin(angle) * 380);
    });
    scene.showEpic?.(site.def.name.toUpperCase(), 'Inimigos se aproximam do acampamento!', 3000);
  }

  updateDefend(id, site, distance, delta) {
    const def = site.def;
    const timer = this.defendTimers[id] ?? { seconds: 0, spawnMs: 0 };
    this.defendTimers[id] = timer;
    if (distance > DEFEND_RADIUS) return;
    timer.seconds += delta / 1000;
    timer.spawnMs -= delta;
    if (timer.spawnMs <= 0 && site.spawned.length < 6) {
      timer.spawnMs = 6000;
      this.spawnGroup(site, def.enemies, def.enemies.count);
    }
    this.emit({ type: 'defend', target: id, seconds: timer.seconds });
  }

  // ---------- Regiões com perigo ----------

  updateRegion(delta) {
    const scene = this.scene;
    const player = scene.player;
    const key = this.regionAt(player.x, player.y);
    if (key !== this.regionKey) {
      this.regionKey = key;
      if (key) scene.ui.showMessage(`— ${REGIONS[key].name} —`);
    }
    const hazard = key ? REGIONS[key].hazard : null;
    if (!hazard || this.state.flags[hazard.flag]) return;
    this.hazardTimer += delta;
    if (this.hazardTimer < 2000) return;
    this.hazardTimer = 0;
    // O perigo enfraquece, mas não mata sozinho: o jogador sempre consegue voltar.
    const floor = Math.ceil(player.maxHealth * 0.15);
    if (player.health > floor) {
      player.health = Math.max(floor, player.health - hazard.damage);
      scene.onPlayerDamaged?.();
    }
    if (scene.time.now - this.hazardMessageAt > 6000) {
      this.hazardMessageAt = scene.time.now;
      scene.ui.showMessage(hazard.message);
    }
  }

  // ---------- Dia a dia ----------

  /** Virada do dia: diárias novas e um evento aleatório (tempestade, refugiado ou mercador). */
  onDayAdvance(day) {
    if (this.state.refreshDaily(day)) this.ui.toast('Novas missões diárias no Diário (L).', 'gold');
    for (const id of Object.keys(this.eventSites)) delete this.eventSites[id];
    if (!this.state.dailiesUnlocked) {
      this.syncWorld();
      return;
    }
    const scene = this.scene;
    const camp = scene.camp;
    if (isRainyDay(day)) {
      const built = BUILDING_ORDER.filter((key) => key !== 'wall' && camp.isBuilt(key) && camp.durability[key] > 0);
      const target = built[day % Math.max(1, built.length)];
      if (target) {
        camp.damageBuilding(target, 6);
        scene.ui.showMessage(`Uma tempestade danificou: ${scene.buildingName(target)}. Repare na Casa ou no prédio.`);
      }
    }
    const roll = Math.random();
    if (roll < 0.25) {
      this.eventSites[`evento-refugiado-${day}`] = {
        name: 'Pedido de Abrigo', x: camp.x - 420, y: camp.y + 320, kind: 'rescue', art: 'tent', residents: 1,
        event: true, reward: { coins: 20, items: { food: 3 }, xp: 40 }
      };
      this.ui.toast('Um sobrevivente pede abrigo perto do acampamento.', 'gold');
    } else if (roll < 0.4) {
      this.eventSites[`evento-mercador-${day}`] = {
        name: 'Mercador Raro', x: camp.x + 300, y: camp.y + 360, kind: 'talk', art: 'merchantTent', event: 'merchant'
      };
      this.ui.toast('Um mercador raro montou sua tenda perto do acampamento!', 'gold');
    }
    this.syncWorld();
    this.ui.refresh();
  }

  // ---------- Laço principal ----------

  update(delta) {
    if (!this.state.introShown && this.scene.player && !window.__lendasSplash?.active) {
      this.state.introShown = true;
      this.ui.showChapter(1, {
        onClose: () => this.ui.dialogue('vigia', `${LORE.despertar.text} "Ei, viajante! Você está vivo. Me ajude a manter o fogo aceso e eu te conto o que sei."`, [
          { label: 'ACEITAR A PRIMEIRA MISSÃO', primary: true, action: () => this.accept(MISSIONS[0].id) },
          { label: 'DEPOIS', action: () => {} }
        ], { title: 'As Cinzas do Primeiro Mundo' })
      });
    }
    this.updateSites(delta);
    this.siteTimer -= delta;
    if (this.siteTimer <= 0) {
      this.siteTimer = 500;
      this.updateRegion(500);
      // Objetivos de estado (construir, fabricar, ter itens) e marcadores dos moradores.
      this.autoTurnIn();
      this.syncWorld();
      this.ui.refreshTracker();
    }
  }

  /** Pontos para o minimapa: locais ativos da missão rastreada em destaque. */
  mapPoints() {
    const tracked = this.state.tracked ? MISSIONS_BY_ID[this.state.tracked] : null;
    const trackedIds = new Set(tracked ? tracked.objectives.flatMap((objective) => this.sitesForObjective(tracked, objective)) : []);
    return [...this.sites.values()]
      .filter((site) => site.def.kind !== 'assault')
      .map((site) => ({ x: site.def.x, y: site.def.y, name: site.def.name, tracked: trackedIds.has(site.id) }));
  }

  /** Chefe de missão mais próximo (para a barra de vida de chefe). */
  nearestBoss() {
    const player = this.scene.player;
    return this.questEnemies.find((enemy) => enemy.isQuestBoss && !enemy.dead && enemy.active &&
      Phaser.Math.Distance.Between(enemy.x, enemy.y, player.x, player.y) < 520) ?? null;
  }

  serialize() {
    return this.state.serialize();
  }

  destroy() {
    this.ui.destroy();
  }
}
