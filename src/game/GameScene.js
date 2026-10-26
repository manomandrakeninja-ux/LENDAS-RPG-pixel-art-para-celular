import Phaser from 'phaser';
import { Obstacles } from './Obstacles.js';
import { BackpackPanel } from './BackpackPanel.js';
import { CampaignSystem } from './CampaignSystem.js';
import { PixelCanvas } from '../art/pixel.js';
import { COMBAT_CONFIG } from '../data/combat.js';
import { DAY_NIGHT_CONFIG } from '../data/dayNight.js';
import { HARVEST_STRUCTURE_TYPES } from '../data/harvestStructures.js';
import { LEVEL_CHOICES, PERK_EFFECTS, PERKS, PlayerProgression } from '../data/progression.js';
import { enemyXp } from '../data/enemies.js';
import { chestCoins, rollCoinDrop } from '../data/economy.js';
import { BOSS_CONFIG } from '../data/boss.js';
import { CONSUMABLES, itemForHotkey, useConsumable } from '../data/consumables.js';
import { ENCHANTMENTS, FARM_CROPS } from '../data/buildingSystems.js';
import { BUILDING_DEFS, CAMP_COMPLETION_MESSAGE, DUNGEON_CONFIG } from '../data/buildings.js';
import { isRaining } from '../data/weather.js';
import { CampfireTravelers, TRAVELER_GOODS } from '../data/travelers.js';
import { INVENTORY_CONFIG, WORLD, RESOURCE_TYPES } from './config.js';
import { AudioManager } from './Audio.js';
import { Camp } from './Camp.js';
import { DayNightCycle } from './DayNightCycle.js';
import { DeathBackpackManager } from './DeathBackpack.js';
import { EnemyDirector } from './EnemyDirector.js';
import { PixelEffects } from './Effects.js';
import { Inventory } from './Inventory.js';
import { LightingSystem } from './LightingSystem.js';
import { Player } from './Player.js';
import { loadSaveDetailed, saveGame, clearAllSaves } from './save.js';
import { HarvestStructures } from './HarvestStructures.js';
import { FarmSystem } from './FarmSystem.js';
import { MarketSystem } from './MarketSystem.js';
import { BuildingMenu } from './BuildingMenu.js';
import { GameUI } from './UI.js';
import { World } from './World.js';
import { WorldMapOverlay } from './WorldMapOverlay.js';
import { ExperiencePickups } from './ExperiencePickups.js';
import { LevelUpOverlay } from './LevelUpOverlay.js';
import { EconomySystem } from './EconomySystem.js';
import { CoinPickups } from './CoinPickups.js';
import { BiomeBoss } from './BiomeBoss.js';
import { TouchControls } from './TouchControls.js';
import { BuffSystem, DAILY_BUFF_IDS } from './BuffSystem.js';
import { RaidDirector } from './RaidDirector.js';
import { createGameAnimations, preloadGameAssets } from './assets.js';
import { TORCH_RECIPE } from '../data/itemCatalog.js';
import { ItemInfoPanel } from './ItemInfoPanel.js';
import { VillagerManager } from './Villagers.js';
import { SettingsPanel } from './SettingsPanel.js';
import { rollMonsterChest } from '../data/monsterChests.js';
import { MISSIONS } from '../data/campaign.js';

// Primeira missão que pede para enfrentar o Golem de Fogo; a anterior libera a área.
const GOLEM_MISSION = MISSIONS.find((mission) => mission.objectives.some((objective) =>
  ['boss', 'bossPhase'].includes(objective.type) && objective.target === BOSS_CONFIG.campaignTag));
const GOLEM_UNLOCK_MISSION = GOLEM_MISSION ? MISSIONS.find((mission) => mission.number === GOLEM_MISSION.number - 1) : null;
import { CRAFT_RECIPES_BY_ID, CRAFT_STATIONS, recipeItems } from '../data/craftRecipes.js';

export const PICKAXE_MESSAGE = 'Você precisa de uma picareta para minerar isso.';
// Mineração: segure o botão por 4 s (picareta de ferro: 2 s).
const MINING_DURATION_MS = 4000;
const MINING_STRIKE_MS = 480;
const MINING_MAX_DISTANCE = 76;

export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  preload() {
    // A tela de início (Splash.js) acompanha o carregamento por este evento.
    this.load.on('progress', (value) => window.dispatchEvent(new CustomEvent('lendas:progress', { detail: value })));
    preloadGameAssets(this);
  }

  create() {
    // scene.restart() reaproveita esta instância: o estado de fim de jogo precisa ser zerado.
    this.gameOver = false;
    this.skipSave = false;
    this.wasUiPaused = false;
    this.hitstopActive = false;
    this.mining = null;
    this.dungeonMarker = null;
    document.getElementById('game-over').hidden = true;
    document.getElementById('epic-banner').hidden = true;
    createGameAnimations(this);
    const saveResult = loadSaveDetailed();
    const saved = saveResult.data;
    this.worldBounds = { ...WORLD, camp: WORLD.camp };
    this.inventory = new Inventory(saved?.inventory);
    this.buffs = new BuffSystem(saved?.buffs);
    this.travelers = new CampfireTravelers(saved?.travelers);
    this.traps = [];
    this.obstacles = new Obstacles(this);
    this.world = new World(this);
    this.world.create();
    this.camp = new Camp(this, saved?.camp);
    this.raid = new RaidDirector(this, saved?.raid);
    const inventoryOverflow = this.inventory.takeMigrationOverflow();
    this.progression = new PlayerProgression(saved?.progression);
    this.economy = new EconomySystem(saved?.economy);
    this.player = new Player(this, WORLD.camp.x, WORLD.camp.y + 85, saved?.player, this.progression);
    this.player.recalculateEquipment(this.camp.equipment);
    this.obstacles.collide(this.player);
    this.audio = new AudioManager();
    this.dayNight = new DayNightCycle(saved?.time);
    this.timeState = this.dayNight.getState();
    this.farm = new FarmSystem({
      saved: saved?.farm ?? {},
      level: this.camp.levels.farm
    });
    this.market = new MarketSystem({
      saved: saved?.market ?? {},
      day: this.timeState.dayCount,
      level: this.camp.levels.market,
      ownedAccessories: () => this.camp.equipment.accessories
    });
    this.travelers.refresh(this.timeState.dayCount, this.camp.levels.campfire);
    this.isRaining = isRaining(this.timeState);
    this.harvestStructures = new HarvestStructures(this, {
      saved: saved?.harvestStructures ?? [],
      dayCount: this.timeState.dayCount
    });
    this.enemies = [];
    this.enemyDirector = new EnemyDirector(this, this.enemies);
    this.enemyDirector.populate(this.timeState);
    this.camp.defense.setupEnemyCollision(this.enemies);
    this.effects = new PixelEffects(this);
    this.boss = saved?.boss?.defeated
      ? null
      : new BiomeBoss(this, BOSS_CONFIG.x, BOSS_CONFIG.y, saved?.boss ?? {});
    if (saved?.boss?.defeated) this.camp.equipment.unlockRecipe(BOSS_CONFIG.recipeId);
    this.experiencePickups = new ExperiencePickups(this);
    this.coinPickups = new CoinPickups(this);
    this.deathBackpacks = new DeathBackpackManager(this, saved?.deathBackpacks ?? []);
    if (Object.keys(inventoryOverflow).length > 0) {
      const overflowStorage = this.camp.store(inventoryOverflow);
      if (Object.keys(overflowStorage.remaining).length > 0) {
        this.deathBackpacks.create(this.player.x, this.player.y, overflowStorage.remaining);
      }
    }
    this.world.setNight(this.timeState.isNight);
    this.harvestStructures.setNight(this.timeState.isNight);
    this.createDungeonMarker();

    this.cameras.main.setBounds(0, 0, WORLD.width, WORLD.height);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setZoom(this.worldZoom()).setRoundPixels(true);

    this.duskTint = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0xd88952, 0)
      .setOrigin(0).setScrollFactor(0).setDepth(3997);
    this.damageFlash = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0xff6b57, 0)
      .setOrigin(0).setScrollFactor(0).setDepth(5000);
    this.lighting = new LightingSystem(this, this.camp);

    this.ui = new GameUI(this);
    this.levelUpOverlay = new LevelUpOverlay(this);
    this.worldMap = new WorldMapOverlay(this);
    this.buildingMenu = new BuildingMenu(this);
    this.backpackPanel = new BackpackPanel(this);
    this.itemInfo = new ItemInfoPanel(this);
    this.touch = new TouchControls(this);
    this.settingsPanel = new SettingsPanel(this);
    // Tremor da tela pode ser desligado nas Configurações.
    const camera = this.cameras.main;
    const shake = camera.shake.bind(camera);
    camera.shake = (...args) => (this.settingsPanel?.shake === false ? camera : shake(...args));
    this.restState = null;
    this.storeAllAvailable = false;
    this.wasNearCamp = false;
    this.lastBuildingMessage = '';
    this.hudCamera = this.cameras.add(0, 0, this.scale.width, this.scale.height)
      .setName('HUD')
      .setRoundPixels(true);
    const uiObjects = new Set(this.ui.fixed);
    this.cameras.main.ignore([...uiObjects]);
    this.hudCamera.ignore(this.children.list.filter((child) => !uiObjects.has(child)));
    // Campanha "As Cinzas do Primeiro Mundo": 100 missões, moradores, regiões e diárias.
    this.campaign = new CampaignSystem(this, saved?.campaign);
    this.campaign.state.refreshDaily(this.timeState.dayCount);
    // Moradores dos prédios (níveis 4 e 8): andam no acampamento, falam e ajudam nas invasões.
    this.villagers = new VillagerManager(this);

    this.keys = this.input.keyboard.addKeys({
      up: 'W', down: 'S', left: 'A', right: 'D',
      a: 'A', d: 'D', w: 'W', s: 'S',
      interact: 'E', attack: 'J', dodge: 'SPACE', special: 'Q',
      camp: 'C', map: 'M', rest: 'F', sleep: 'R', escape: 'ESC'
    });
    this.cursors = this.input.keyboard.createCursorKeys();
    this.input.keyboard.on('keydown', () => this.audio.unlock());
    this.input.keyboard.on('keydown-L', () => {
      if (this.campaign?.ui?.isOpen || !this.overlayBlocked()) this.toggleJournal();
    });
    this.input.keyboard.on('keydown-ESC', () => {
      if (this.worldMap.isOpen) this.worldMap.close();
      else if (this.buildingMenu.isOpen) this.buildingMenu.close();
      else if (this.campaign?.ui.isOpen) this.campaign.ui.toggleJournal(false);
      else if (this.campaign?.ui.dialog && !this.campaign.ui.dialog.hidden) this.campaign.ui.closeDialogue();
      else if (this.campaign?.ui.reward && !this.campaign.ui.reward.hidden) this.campaign.ui.closeReward();
      else if (this.campaign?.ui.chapterCard && !this.campaign.ui.chapterCard.hidden) this.campaign.ui.closeChapter();
      else if (this.backpackPanel.isOpen) this.backpackPanel.close();
    });
    this.input.keyboard.on('keydown-M', () => {
      if (this.worldMap.isOpen) this.worldMap.close();
      else if (!this.overlayBlocked()) this.worldMap.open();
    });
    this.input.keyboard.on('keydown-B', () => this.toggleBackpack());
    this.input.keyboard.on('keydown-I', () => this.toggleBackpack());
    this.input.keyboard.on('keydown-C', () => {
      if (this.ui.campOpen || !this.overlayBlocked()) this.toggleCampMenu();
    });
    this.input.keyboard.on('keydown-F', () => this.restAtCamp());
    this.input.keyboard.on('keydown-R', () => this.sleepAtCamp());
    this.input.keyboard.on('keydown-E', () => this.interact());
    this.input.keyboard.on('keydown-J', () => this.attackNearby());
    this.input.keyboard.on('keydown-Q', () => this.specialAttack());
    this.input.keyboard.on('keydown-ONE', () => this.useHotkey('1'));
    this.input.keyboard.on('keydown-TWO', () => this.useHotkey('2'));
    this.input.keyboard.on('keydown-THREE', () => this.useHotkey('3'));
    this.input.keyboard.on('keydown-FOUR', () => this.useHotkey('4'));
    this.input.keyboard.on('keydown-FIVE', () => this.useHotkey('5'));
    this.gameOverRoot = document.getElementById('game-over');
    this.gameOverText = document.getElementById('game-over-text');
    this.gameOverButton = document.getElementById('game-over-restart');
    this.epicBanner = document.getElementById('epic-banner');
    this.epicTitle = document.getElementById('epic-banner-title');
    this.epicText = document.getElementById('epic-banner-text');
    this.handleGameOverRestart = () => this.restartFromLastSave();
    this.gameOverButton.addEventListener('click', this.handleGameOverRestart);

    this.handleCanvasPointerDown = (event) => {
      if (event.button !== 0) return;
      this.audio.unlock();
      const rect = this.game.canvas.getBoundingClientRect();
      const x = (event.clientX - rect.left) * (this.scale.width / rect.width);
      const y = (event.clientY - rect.top) * (this.scale.height / rect.height);
      if (this.isUiPaused()) return;
      // Barra rápida do HUD: Mochila, Comer (tecla 2) e Poção (tecla 1).
      if (this.ui.minimapAt(x, y)) {
        this.worldMap.open();
        return;
      }
      const quick = this.ui.quickButtonAt(x, y);
      if (quick) {
        if (quick === 'backpack') this.toggleBackpack();
        else if (quick === 'journal') this.toggleJournal();
        else this.useHotkey(quick === 'eat' ? '2' : '1');
        return;
      }
      if (this.gameOver) return;
      const worldPoint = this.cameras.main.getWorldPoint(x, y);
      const clickedBuilding = Object.entries(this.camp.buildings).find(([, building]) =>
        (building.sprites ?? [building.sprite]).some((sprite) => sprite?.visible &&
          Math.abs(worldPoint.x - sprite.x) <= 34 &&
          worldPoint.y <= sprite.y + 10 && worldPoint.y >= sprite.y - 58)
      );
      if (clickedBuilding) {
        this.openBuilding(clickedBuilding[0]);
        return;
      }
      if (this.world.nearbyResource(this.player.x, this.player.y) ||
          this.harvestStructures.nearest(this.player.x, this.player.y) ||
          this.deathBackpacks.nearest(this.player.x, this.player.y)) this.interact();
      else this.attackNearby();
    };
    this.game.canvas.addEventListener('pointerdown', this.handleCanvasPointerDown);

    this.scale.on('resize', () => {
      this.duskTint.setSize(this.scale.width, this.scale.height);
      this.damageFlash.setSize(this.scale.width, this.scale.height);
      this.lighting.resize();
      this.hudCamera.setViewport(0, 0, this.scale.width, this.scale.height);
      this.ui.resize();
      this.cameras.main.setZoom(this.worldZoom());
    });

    this.handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') this.save();
    };
    this.handlePageHide = () => this.save();
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    window.addEventListener('pagehide', this.handlePageHide);

    this.events.once('shutdown', () => this.save());
    this.events.once('shutdown', () => {
      this.game.canvas.removeEventListener('pointerdown', this.handleCanvasPointerDown);
      this.gameOverButton.removeEventListener('click', this.handleGameOverRestart);
      this.touch?.destroy();
      this.worldMap?.destroy();
      this.levelUpOverlay?.destroy();
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
      window.removeEventListener('pagehide', this.handlePageHide);
    });

    this.world.revealAround(this.player.x, this.player.y);
    const returnMessage = saveResult.migrated
      ? 'Save antigo migrado para a versão 2.'
      : saved ? 'Bom retorno a LENDAS!' : 'Explore, colete e fortaleça seu lar.';
    this.ui.showMessage(returnMessage);
    if (this.progression.hasPendingChoice) this.showLevelUpChoice();
    this.raid.checkDay(this.timeState.dayCount);
    this.saveTimer = this.time.addEvent({ delay: 60000, loop: true, callback: () => this.save() });
    this.lastPhase = this.timeState.phase;
    this.warningTriggered = false;
    this.isRespawning = false;
    // Atrás da tela de início o mundo fica parado; ele volta quando o jogador começa.
    window.dispatchEvent(new CustomEvent('lendas:ready', { detail: this }));
    if (window.__lendasSplash?.active) this.scene.pause();
  }

  /** Zoom do mundo: 2 em telas até ~1440 px de altura, mais em telas maiores (2K/4K). */
  worldZoom() {
    return Math.max(2, Math.round(this.scale.height / 540));
  }

  toggleJournal() {
    if (this.worldMap?.isOpen || this.buildingMenu?.isOpen || this.gameOver) return;
    this.campaign?.ui.toggleJournal();
  }

  /** Baú com itens aleatórios ao lado de um monstro especial derrotado. */
  dropMonsterChest(source, tier = 'elite') {
    const loot = rollMonsterChest(tier);
    const angle = Math.random() * Math.PI * 2;
    const x = Phaser.Math.Clamp(source.x + Math.cos(angle) * 18, 40, this.worldBounds.width - 40);
    const y = Phaser.Math.Clamp(source.y + Math.sin(angle) * 12 + 6, 40, this.worldBounds.height - 40);
    const chest = this.deathBackpacks.create(x, y, loot.items, null, { kind: 'chest', coins: loot.coins, name: source.name ?? '' });
    this.effects.spawnImpact(x, y - 8, { tint: 0xffd76b, strong: true });
    this.campaign?.ui?.toast?.(`${source.name ?? 'O monstro'} deixou um baú!`, 'gold');
    return chest;
  }

  /** Painéis que não podem ficar por baixo de outro (menu de prédio, mapa, nível, item, configurações, missão concluída). */
  overlayBlocked() {
    return Boolean(
      this.gameOver ||
      this.progression?.hasPendingChoice ||
      this.worldMap?.isOpen ||
      this.buildingMenu?.isOpen ||
      this.itemInfo?.isOpen ||
      this.settingsPanel?.isOpen ||
      (this.campaign?.ui?.reward && !this.campaign.ui.reward.hidden)
    );
  }

  /** Missão que precisa estar concluída para enfrentar o Golem de Fogo (null = livre). */
  golemLockMission() {
    if (!this.campaign || !GOLEM_UNLOCK_MISSION) return null;
    return this.campaign.state.stateOf(GOLEM_UNLOCK_MISSION.id) === 'done' ? null : GOLEM_UNLOCK_MISSION;
  }

  /** Trava/destrava o golem e mostra o aviso de área restrita perto dele. */
  updateGolemLock() {
    const boss = this.boss;
    if (!boss) return;
    const lock = this.golemLockMission();
    boss.locked = Boolean(lock);
    // Save antigo em que o golem já tinha sido derrotado: ele volta para as missões dele.
    if (boss.dead && !lock && this.campaign?.bossNeeded?.(BOSS_CONFIG.campaignTag)) {
      boss.defeated = false;
      boss.revive(this.campaign.bossStartRatio?.(BOSS_CONFIG.campaignTag) ?? 1);
      this.showEpic?.(BOSS_CONFIG.name.toUpperCase(), 'O guardião do Núcleo desperta.', 2600);
    }
    if (!lock || boss.dead) return;
    const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, boss.x, boss.y);
    if (distance < 260) this.warnRestrictedArea(lock);
  }

  warnRestrictedArea(lock = this.golemLockMission()) {
    if (!lock) return;
    const now = this.time.now;
    if (now - (this.restrictedWarnedAt ?? -Infinity) < 3500) return;
    this.restrictedWarnedAt = now;
    this.ui.showMessage(`ÁREA RESTRITA • Finalize a missão ${lock.number} (${lock.title}) para enfrentar o ${BOSS_CONFIG.name}.`);
  }

  /** O alvo é o golem travado? Mostra "IMUNE" e o aviso, e não deixa levar dano. */
  bossIsProtected(target) {
    if (!target?.isBoss || !target.locked) return false;
    this.effects.spawnDamage(target.x, target.y - 30, 'IMUNE', '#9fd2ff');
    this.effects.spawnHit(target.x, target.y - 20, 0x9fd2ff, 5);
    this.warnRestrictedArea();
    return true;
  }

  /** Cada dano no golem atualiza a fase das missões (metade da vida na missão 96). */
  onBossDamaged(boss) {
    const ratio = boss.health / boss.maxHealth;
    this.campaign?.emit({ type: 'bossPhase', target: BOSS_CONFIG.campaignTag, ratio });
    if (ratio <= 0.5 && !boss.enraged && boss.health > 0) {
      boss.enraged = true;
      boss.sprite?.setTint?.(0xff8a5a);
      this.showEpic?.('O COLOSSO DESPERTA', `O ${BOSS_CONFIG.name} entra em fúria!`, 2600);
    }
  }

  /** Algum painel que deve pausar o jogo está aberto? */
  isUiPaused() {
    return Boolean(
      this.progression?.hasPendingChoice ||
      this.worldMap?.isOpen ||
      this.buildingMenu?.isOpen ||
      this.itemInfo?.isOpen ||
      this.settingsPanel?.isOpen ||
      this.campaign?.ui?.isBlocking
    );
  }

  toggleBackpack() {
    if (this.worldMap?.isOpen || this.buildingMenu?.isOpen || this.gameOver) return;
    this.backpackPanel.toggle();
  }

  update(_time, delta) {
    if (this.gameOver) {
      this.player.body.setVelocity(0, 0);
      for (const enemy of this.enemies) enemy.body?.setVelocity(0, 0);
      return;
    }
    if (this.player.health <= 0 && !this.isRespawning) this.respawn();

    // Pausa automática: escolha de nível, mapa, menus dos prédios, conversas, diário,
    // missão concluída, informações de item e configurações param o relógio, a física e os inimigos.
    const paused = this.isUiPaused();
    if (paused !== this.wasUiPaused) {
      this.wasUiPaused = paused;
      if (paused) {
        this.physics.world.pause();
        this.cancelMining?.();
      } else if (!this.hitstopActive) this.physics.world.resume();
    }
    if (!paused) this.timeState = this.updateDayNight(delta);
    this.isRaining = isRaining(this.timeState);
    if (!paused) {
      if (this.buffs.update(delta, this.timeState.dayCount)) this.player.recalculateEquipment(this.camp.equipment);
      this.updateFarm(delta);
      this.updateCampEffects(delta);
      this.raid.update(delta);
    }
    this.menuRefreshTimer = (this.menuRefreshTimer ?? 0) + delta;
    if (this.menuRefreshTimer >= 500) {
      this.menuRefreshTimer = 0;
      this.buildingMenu?.refresh();
    }
    if (paused) {
      this.player.body.setVelocity(0, 0);
      for (const enemy of this.enemies) enemy.body?.setVelocity(0, 0);
      this.boss?.body?.setVelocity(0, 0);
    } else {
      const pointer = this.input.activePointer;
      const pointerWorld = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      this.player.update(delta, this.keys, this.cursors, pointerWorld, this.touch.vector);
      this.player.dodge(this.keys, this.touch.consumeDodge());
      this.world.revealAround(this.player.x, this.player.y);
      this.enemyDirector.update(delta, this.player, this.timeState);
      this.camp.defense.update(delta, this.enemies);
      this.updateBuildingLabels();
      this.villagers?.update(delta);
      this.updateEnemyStatus(delta);
      this.updateTraps();
      this.updateGolemLock();
      this.boss?.update(delta, this.player);
      this.campaign?.update(delta);
      if (Phaser.Input.Keyboard.JustDown(this.keys.attack)) this.attackNearby();
      if (Phaser.Input.Keyboard.JustDown(this.keys.special)) this.specialAttack();
    }

    this.updateMining(delta);
    this.experiencePickups.update(delta, this.player, (amount) => this.collectExperience(amount));
    this.coinPickups.update(delta, this.player, (amount) => this.collectCoins(amount));

    const resource = this.world.nearbyResource(this.player.x, this.player.y);
    const structureCandidate = this.harvestStructures.nearest(this.player.x, this.player.y);
    const resourceDistance = resource
      ? Phaser.Math.Distance.Between(this.player.x, this.player.y, resource.x, resource.y)
      : Infinity;
    const structureDistance = structureCandidate
      ? Phaser.Math.Distance.Between(this.player.x, this.player.y, structureCandidate.x, structureCandidate.y)
      : Infinity;
    const nearestStructure = structureDistance <= resourceDistance ? structureCandidate : null;
    for (const entry of [...this.world.resources, ...this.world.nightResources]) {
      entry.hint.setVisible(entry === resource && !nearestStructure);
    }
    this.harvestStructures.updateHints(nearestStructure);
    if (this.harvestStructures.discoverNear(this.player.x, this.player.y)) this.save();
    if (this.worldMap.isOpen) {
      this.worldMapRefreshTimer = (this.worldMapRefreshTimer ?? 0) + delta;
      if (this.worldMapRefreshTimer >= 200) {
        this.worldMapRefreshTimer = 0;
        this.worldMap.render();
      }
    }
    const backpack = this.deathBackpacks.nearest(this.player.x, this.player.y);
    this.deathBackpacks.updateHints(backpack);
    const enemy = this.nearestEnemy(68);
    this.effects.updateAmbient(delta, {
      isNight: this.timeState.isNight,
      camera: this.cameras.main,
      player: this.player
    });
    const isNearCamp = this.camp.isNear(this.player.x, this.player.y);
    this.updateCampEntry(isNearCamp);
    this.touch.update({
      hidden: this.worldMap.isOpen || this.buildingMenu?.isOpen || this.progression.hasPendingChoice,
      nearCamp: isNearCamp,
      campOpen: this.ui.campOpen
    });
    this.ui.update(this.player, this.inventory, this.progression, this.economy, this.camp, {
      isNight: this.timeState.isNight,
      label: this.timeState.clock,
      dayCount: this.timeState.dayCount,
      phase: this.timeState.phase,
      warningActive: this.timeState.warningActive,
      secondsUntilNight: this.timeState.secondsUntilNight
    }, resource, nearestStructure, backpack, enemy, isNearCamp, this.enemies, this.world, this.storeAllAvailable);
    this.ui.updateBossHealth(this.campaign?.nearestBoss() ?? this.boss, this.player);
  }

  updateDayNight(delta) {
    const state = this.dayNight.update(delta);
    this.isNight = state.isNight;
    this.clockLabel = state.clock;
    this.dayCount = state.dayCount;
    this.duskTint.setFillStyle(0xd88952, state.phase === 'dusk' ? 0.18 * state.lightLevel : state.phase === 'dawn' ? 0.12 * (1 - state.lightLevel) : 0);
    this.camp.setLightLevel(state.lightLevel);
    this.world.setNight(state.isNight);
    this.harvestStructures.setNight(state.isNight);
    this.lighting.update(delta, state, this.player);

    if (state.rolledOver) {
      this.handleDayAdvance(state.dayCount);
    }

    if (state.warningActive && !this.warningTriggered) {
      this.warningTriggered = true;
      this.audio.playNightWarning(DAY_NIGHT_CONFIG.warningTone);
    } else if (!state.warningActive) {
      this.warningTriggered = false;
    }

    if (state.phase !== this.lastPhase) {
      if (state.phase === 'night') {
        this.audio.playNightfall();
        this.ui.showMessage('A noite chegou. Os inimigos noturnos ficaram mais fortes.');
      } else if (state.phase === 'dawn') {
        this.audio.playDawn();
        this.ui.showMessage(`Amanheceu. Dia ${state.dayCount} começou.`);
      }
      this.lastPhase = state.phase;
    }
    return state;
  }

  handleDayAdvance(dayCount) {
    const day = Math.max(1, Math.floor(Number(dayCount) || 1));
    this.harvestStructures.handleDayChange(day);
    if (this.market.day !== day) {
      const { auctionResult, orders } = this.market.advanceDay(day, this.economy);
      this.applyAuctionResult(auctionResult);
      for (const order of orders) {
        const { remaining } = this.camp.store(order.bundle);
        if (Object.keys(remaining).length > 0) this.deathBackpacks.create(this.camp.x + 30, this.camp.y + 60, remaining);
      }
      if (orders.length > 0) this.ui.showMessage(`Encomenda entregue no armazém (${orders.length}).`);
    }
    if (this.travelers.refresh(day, this.camp.levels.campfire)) {
      this.ui.showMessage('Um viajante chegou à fogueira com uma missão.');
    }
    this.raid.checkDay(day);
    this.campaign?.onDayAdvance(day);
    this.save();
  }

  buildingName(key) {
    return BUILDING_DEFS[key]?.name ?? key;
  }

  /** Derrota no ataque: congela o jogo e oferece recomeçar do save de antes do ataque. */
  triggerGameOver(text) {
    this.gameOver = true;
    this.skipSave = true;
    this.buildingMenu.close();
    this.worldMap.close();
    this.gameOverText.textContent = text;
    this.gameOverRoot.hidden = false;
    this.cameras.main.shake(600, 0.012, true);
  }

  applyAuctionResult(result) {
    if (!result) return;
    if (!result.won) {
      if (result.refunded > 0) this.ui.showMessage(`Leilão perdido • ${result.refunded} moedas devolvidas.`);
      return;
    }
    if (result.item) {
      this.camp.equipment.addAccessory(result.item);
      this.player.recalculateEquipment(this.camp.equipment);
      this.showEpic('LEILÃO VENCIDO', `Você arrematou: ${this.market.auctionItemLabel}.`);
    } else if (result.fallback) {
      this.camp.store(result.fallback);
      this.ui.showMessage('Leilão vencido • ouro guardado no armazém.');
    }
  }

  updateCampEntry(isNearCamp) {
    if (isNearCamp && !this.wasNearCamp) {
      this.storeAllAvailable = true;
      if (this.camp.unlocked('house', 'autoStore') && this.inventory.total > 0) {
        const stored = this.camp.storeAll(this.inventory);
        if (stored.storedTotal > 0) {
          this.ui.showMessage(stored.complete ? 'Casa: mochila guardada automaticamente.' : 'Casa: armazém cheio, parte ficou na mochila.');
          this.save();
        }
      }
    } else if (!isNearCamp) {
      this.storeAllAvailable = false;
    }
    this.wasNearCamp = isNearCamp;
  }

  storeAllAtCamp() {
    if (!this.camp.isNear(this.player.x, this.player.y)) {
      const result = { ok: false, message: 'Entre no acampamento para usar o armazém.' };
      this.ui.showMessage(result.message);
      return result;
    }
    if (!this.camp.storageAccessible()) {
      const result = { ok: false, message: 'A Casa está destruída. Repare-a para usar o armazém.' };
      this.ui.showMessage(result.message);
      return result;
    }
    if (this.inventory.total === 0) {
      const result = { ok: false, message: 'A mochila já está vazia.' };
      this.ui.showMessage(result.message);
      return result;
    }
    const stored = this.camp.storeAll(this.inventory);
    const result = stored.complete
      ? { ok: true, message: 'Mochila guardada no armazém da casa.' }
      : {
          ok: false,
          message: 'Armazém sem espaço para guardar toda a mochila.'
        };
    this.ui.showMessage(result.message);
    if (stored.storedTotal > 0) this.save();
    return { ...result, ...stored };
  }

  nearestEnemy(range) {
    const normal = this.enemyDirector.nearest(range, this.player);
    if (!this.boss || this.boss.dead) return normal;
    const bossDistance = Phaser.Math.Distance.Between(this.boss.x, this.boss.y, this.player.x, this.player.y);
    if (bossDistance > range) return normal;
    if (!normal) return this.boss;
    const normalDistance = Phaser.Math.Distance.Between(normal.x, normal.y, this.player.x, this.player.y);
    return bossDistance <= normalDistance ? this.boss : normal;
  }

  attackNearby() {
    if (this.player.attackCooldown > 0 || this.progression?.hasPendingChoice || this.worldMap?.isOpen || this.buildingMenu?.isOpen || this.itemInfo?.isOpen || this.settingsPanel?.isOpen || this.campaign?.ui?.isBlocking || this.gameOver) return;
    this.player.attackCooldown = COMBAT_CONFIG.basicAttackCooldownMs;
    if (this.mining) this.cancelMining();
    const target = this.nearestEnemy(COMBAT_CONFIG.basicAttackRange);
    const facing = this.player.facing ?? { x: 0, y: 1 };
    const swingAngle = target
      ? Phaser.Math.Angle.Between(this.player.x, this.player.y - 8, target.x, target.y - 8)
      : Math.atan2(facing.y, facing.x);
    this.player.showAttack(swingAngle);
    if (!target) {
      this.effects.spawnSwingTrail(this.player.x, this.player.y, swingAngle, false);
      this.comboStep = 0;
      // Arco Longo: sem inimigo corpo a corpo, dispara uma flecha no mais próximo ao alcance.
      if (this.camp.equipment.hasBow) this.fireBow();
      return;
    }
    // Combo: golpes encadeados dentro da janela avançam 1 → 2 → 3; o terceiro é o golpe final.
    const now = this.time.now;
    const chained = now - (this.lastHitAt ?? -Infinity) <= COMBAT_CONFIG.combo.windowMs;
    this.comboStep = chained ? ((this.comboStep ?? 0) % COMBAT_CONFIG.combo.length) + 1 : 1;
    this.lastHitAt = now;
    const finisher = this.comboStep === COMBAT_CONFIG.combo.length;
    const multiplier = finisher
      ? this.progression.hasPerk('rhythm') ? PERK_EFFECTS.rhythmFinisherMultiplier : COMBAT_CONFIG.combo.finisherMultiplier
      : 1;
    const attack = Math.round(this.player.attack * multiplier);
    const angle = swingAngle;
    if (this.bossIsProtected(target)) {
      this.effects.spawnSwingTrail(this.player.x, this.player.y, angle, false);
      return;
    }
    const damage = Math.min(target.health, attack);
    this.effects.spawnSwingTrail(this.player.x, this.player.y, angle, finisher);
    this.effects.spawnSlash(target.x, target.y - 10, angle, finisher ? 2 : 1);
    const killed = target.hit(attack, angle);
    this.effects.spawnImpact(target.x, target.y - 10, { tint: finisher ? 0xffd76b : 0xffe0a0, strong: finisher || killed });
    this.audio.playHit();
    if (finisher || killed) this.hitstop(killed ? 70 : 50);
    this.effects.spawnDamage(target.x, target.y - 18, damage, finisher ? '#ffe28a' : undefined);
    this.applyWeaponEffects(target, damage, killed);
    const shake = finisher ? COMBAT_CONFIG.screenShake.enemyDefeated : COMBAT_CONFIG.screenShake.enemyHit;
    this.cameras.main.shake(shake.duration, shake.intensity, true);
    if (killed) {
      this.defeatEnemy(target);
    } else {
      if (finisher && !target.isBoss) target.applyKnockback?.(angle, COMBAT_CONFIG.knockback.elite * COMBAT_CONFIG.combo.finisherKnockback);
      this.effects.spawnHit(target.x, target.y - 10, 0xffe0a0, finisher ? 11 : 7);
    }
  }

  /** Encantamento ativo e desgaste da arma após um golpe que acertou. */
  applyWeaponEffects(target, damage, killed) {
    const equipment = this.camp.equipment;
    const enchant = equipment.activeEnchant;
    if (enchant === 'vampire') {
      const healed = Math.max(1, Math.round(damage * ENCHANTMENTS.vampire.lifeStealRatio));
      this.player.heal(healed);
    } else if (!killed && !target.isBoss && enchant === 'fire') {
      target.applyBurn?.(ENCHANTMENTS.fire.burnDamagePerSecond, ENCHANTMENTS.fire.burnMs);
    } else if (!killed && !target.isBoss && enchant === 'ice') {
      target.applySlow?.(ENCHANTMENTS.ice.slowRatio, ENCHANTMENTS.ice.slowMs);
    }
    if (equipment.wear('weapon')) {
      this.player.recalculateEquipment(equipment);
      this.ui.showMessage('Sua arma quebrou! Repare no Ferreiro (nível 4).');
    }
  }

  fireBow() {
    const range = 280;
    const candidates = [...this.enemies, ...(this.boss && !this.boss.dead ? [this.boss] : [])]
      .filter((enemy) => enemy.active && Phaser.Math.Distance.Between(enemy.x, enemy.y, this.player.x, this.player.y) <= range)
      .sort((left, right) => Phaser.Math.Distance.Between(left.x, left.y, this.player.x, this.player.y) -
        Phaser.Math.Distance.Between(right.x, right.y, this.player.x, this.player.y));
    const target = candidates[0];
    if (!target) return false;
    const arrow = this.add.rectangle(this.player.x, this.player.y - 8, 8, 2, 0xf3e3b0).setDepth(9000);
    this.hudCamera?.ignore(arrow);
    arrow.rotation = Phaser.Math.Angle.Between(this.player.x, this.player.y - 8, target.x, target.y - 8);
    const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, target.x, target.y);
    this.tweens.add({
      targets: arrow,
      x: target.x,
      y: target.y - 8,
      duration: Math.max(80, (distance / 520) * 1000),
      onComplete: () => {
        arrow.destroy();
        if (!target.active || target.dead) return;
        const damage = Math.max(1, Math.round(this.player.attack * 0.7));
        this.damageEnemy(target, damage, { weapon: true });
      }
    });
    return true;
  }

  /**
   * Dano vindo de fora do golpe corpo a corpo: torres, flechas, armadilhas, queimadura e auras.
   * options: { color, burn: { dps, ms }, slow: { ratio, ms }, weapon }
   */
  damageEnemy(enemy, amount, options = {}) {
    if (!enemy?.active || enemy.dead || amount <= 0) return false;
    if (this.bossIsProtected(enemy)) return false;
    const damage = Math.min(enemy.health, Math.round(amount));
    const killed = enemy.hit(Math.round(amount), null);
    this.effects.spawnDamage(enemy.x, enemy.y - 18, damage, options.color);
    if (options.weapon) this.applyWeaponEffects(enemy, damage, killed);
    if (killed) {
      this.defeatEnemy(enemy);
      return true;
    }
    if (options.burn) enemy.applyBurn?.(options.burn.dps, options.burn.ms);
    if (options.slow) enemy.applySlow?.(options.slow.ratio, options.slow.ms);
    return false;
  }

  specialAttack() {
    if (this.player.specialCooldown > 0 ||
        this.player.stamina < COMBAT_CONFIG.specialStaminaCost ||
        this.progression?.hasPendingChoice || this.worldMap?.isOpen || this.ui.campOpen || this.buildingMenu?.isOpen || this.isUiPaused()) return;
    this.player.specialCooldown = 4800;
    this.player.stamina -= COMBAT_CONFIG.specialStaminaCost;
    this.player.showAttack();
    this.effects.spawnSpecial(this.player.x, this.player.y - 4);
    const targets = this.enemies.filter((enemy) => enemy.active &&
      Phaser.Math.Distance.Between(enemy.x, enemy.y, this.player.x, this.player.y) < COMBAT_CONFIG.specialAttackRange);
    if (this.boss && !this.boss.dead &&
        Phaser.Math.Distance.Between(this.boss.x, this.boss.y, this.player.x, this.player.y) < COMBAT_CONFIG.specialAttackRange &&
        !this.bossIsProtected(this.boss)) {
      targets.push(this.boss);
    }
    const specialMultiplier = this.progression.hasPerk('brute')
      ? PERK_EFFECTS.bruteSpecialMultiplier
      : COMBAT_CONFIG.specialAttackMultiplier;
    targets.forEach((enemy) => {
      const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, enemy.x, enemy.y);
      const damage = Math.min(enemy.health, this.player.attack * specialMultiplier);
      this.effects.spawnSlash(enemy.x, enemy.y - 10, angle, 1);
      const killed = enemy.hit(this.player.attack * specialMultiplier, angle);
      this.effects.spawnDamage(enemy.x, enemy.y - 18, damage, '#ffe28a');
      if (killed) this.defeatEnemy(enemy);
    });
    this.cameras.main.shake(
      COMBAT_CONFIG.screenShake.enemyHit.duration,
      COMBAT_CONFIG.screenShake.enemyHit.intensity * 1.5,
      true
    );
    this.ui.showMessage(targets.length ? 'Golpe especial!' : 'Golpe especial — sem alvo por perto.');
  }

  useHotkey(hotkey) {
    const type = itemForHotkey(hotkey, this.inventory.items);
    if (!type) {
      const missing = {
        1: 'Sem poções de vida.',
        2: 'Sem comida na mochila.',
        3: 'Sem tochas na mochila.',
        4: 'Sem poção de vigor ou armadilha.',
        5: 'Sem elixir na mochila.'
      };
      this.ui.showMessage(missing[hotkey] ?? 'Nada para usar.');
      return;
    }
    this.useItem(type);
  }

  useItem(type) {
    if (this.progression?.hasPendingChoice || this.worldMap?.isOpen || this.buildingMenu?.isOpen ||
        this.player.health <= 0 || this.gameOver) return;
    const result = useConsumable(type, this.inventory, this.player);
    const label = RESOURCE_TYPES[type]?.label ?? type;
    if (!result.ok) {
      if (result.reason === 'full-health') this.ui.showMessage('A vida já está cheia.');
      if (result.reason === 'full-stamina') this.ui.showMessage('O vigor já está cheio.');
      return;
    }
    if (result.healed) {
      this.effects.spawnHeal(this.player.x, this.player.y - 8);
      this.ui.showMessage(`${label} • +${result.healed} de vida`);
    } else if (result.stamina) {
      this.ui.showMessage(`${label} • vigor restaurado`);
    } else if (result.trap) {
      this.placeTrap(this.player.x, this.player.y + 6);
      this.ui.showMessage('Armadilha armada no chão.');
    } else if (result.buff) {
      this.buffs.apply(result.buff);
      this.player.recalculateEquipment(this.camp.equipment);
      this.ui.showMessage(`${label} • +20% ATQ e DEF por 5 min`);
    } else {
      this.ui.showMessage(`Tocha acesa • luz ampliada por ${Math.round(result.durationMs / 1000)}s`);
    }
    this.audio.playCollect();
    this.save();
  }

  placeTrap(x, y) {
    if (!this.textures.exists('trap-placed')) {
      const texture = this.textures.createCanvas('trap-placed', 14, 8);
      const context = texture.getContext();
      context.fillStyle = '#4b4f53';
      context.fillRect(0, 4, 14, 4);
      context.fillStyle = '#c9ced1';
      for (let tooth = 1; tooth < 14; tooth += 3) context.fillRect(tooth, 0, 1, 4);
      texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      texture.refresh();
    }
    const sprite = this.add.image(x, y, 'trap-placed').setDepth(y - 4);
    this.hudCamera?.ignore(sprite);
    this.traps.push({ x, y, sprite });
  }

  updateTraps() {
    const trapConfig = CONSUMABLES.trap;
    for (const trap of [...this.traps]) {
      const victim = this.enemies.find((enemy) => enemy.active && !enemy.dead &&
        Phaser.Math.Distance.Between(enemy.x, enemy.y, trap.x, trap.y) < 18);
      if (!victim) continue;
      this.traps.splice(this.traps.indexOf(trap), 1);
      trap.sprite.destroy();
      victim.stun?.(trapConfig.rootMs);
      this.effects.spawnHit(trap.x, trap.y - 4, 0xc9ced1, 10);
      this.damageEnemy(victim, trapConfig.damage, { color: '#e6e6e6' });
    }
  }

  collectCoins(amount) {
    this.economy.addCoins(amount);
    this.ui.showMessage(`+${amount} moedas`);
    this.audio.playCollect();
    this.save();
  }

  collectExperience(amount) {
    this.grantExperience(amount, true);
    this.audio.playCollect();
  }

  grantExperience(amount, announce = true) {
    const result = this.progression.addXp(amount);
    this.player.recalculateEquipment(this.camp.equipment);
    if (result.leveledUp) {
      this.worldMap.close();
      this.showLevelUpChoice();
    } else if (announce) {
      this.ui.showMessage(`+${amount} XP`);
    }
    this.save();
    return result;
  }

  showLevelUpChoice() {
    if (!this.progression.hasPendingChoice) {
      this.levelUpOverlay.hide();
      return false;
    }
    if (this.progression.hasPendingAttribute) {
      this.levelUpOverlay.show(this.progression.nextChoiceLevel);
    } else {
      this.levelUpOverlay.showPerks(this.progression.pendingPerks[0], this.progression.perkOffer());
    }
    return true;
  }

  choosePerk(perk) {
    const result = this.progression.choosePerk(perk);
    if (!result.applied) return false;
    const previousMax = this.player.maxHealth;
    this.player.recalculateEquipment(this.camp.equipment);
    this.player.heal(this.player.maxHealth - previousMax);
    if (!this.showLevelUpChoice()) {
      this.ui.showMessage(`Talento obtido • ${PERKS[perk].name}`);
    }
    this.save();
    return true;
  }

  chooseLevelUp(attribute) {
    const result = this.progression.choose(attribute);
    if (!result.applied) return false;
    const previousMax = this.player.maxHealth;
    this.player.recalculateEquipment(this.camp.equipment);
    this.player.heal(this.player.maxHealth - previousMax);
    if (!this.showLevelUpChoice()) {
      this.ui.showMessage(`Nível ${this.progression.level} • ${LEVEL_CHOICES[attribute].label}`);
    }
    this.save();
    return true;
  }

  defeatBoss(boss) {
    if (!boss || boss.defeated) return;
    boss.dead = true;
    boss.defeated = true;
    this.campaign?.emit({ type: 'boss', target: BOSS_CONFIG.campaignTag });
    boss.body?.setVelocity(0, 0);
    boss.body?.disableBody?.(true, true);
    boss.setVisible(false);
    this.effects.spawnDeath(boss.x, boss.y - 10, 0xe56a4c);
    const rareAccepted = this.inventory.add(BOSS_CONFIG.rareItem, BOSS_CONFIG.rareItemAmount);
    if (!rareAccepted) {
      this.deathBackpacks.create(boss.x, boss.y, {
        [BOSS_CONFIG.rareItem]: BOSS_CONFIG.rareItemAmount
      });
    }
    this.coinPickups.spawn(boss.x, boss.y + 8, BOSS_CONFIG.coinDrop);
    this.dropMonsterChest(boss, 'boss');
    this.camp.equipment.unlockRecipe(BOSS_CONFIG.recipeId);
    this.player.recalculateEquipment(this.camp.equipment);
    this.ui.showMessage(`${BOSS_CONFIG.name} derrotado! Núcleo do Titã e receita rara obtidos.`);
    this.audio.playCollect();
    this.cameras.main.shake(420, 0.012, true);
    this.save();
  }

  defeatEnemy(enemy) {
    if (enemy?.isBoss) {
      this.defeatBoss(enemy);
      return;
    }
    // Torres, queimadura e golpe podem acertar o mesmo inimigo no mesmo quadro.
    if (!enemy || enemy.dead) return;
    enemy.dead = true;
    this.travelers.recordKill(enemy.kind);
    const deathColor = enemy.isElite ? 0xffd56b : enemy.kind === 'wolf' ? 0xb9a984 : 0x9fd477;
    this.effects.spawnDeath(enemy.x, enemy.y - 8, deathColor);
    const drops = enemy.rollDrops();
    if (this.progression.hasPerk('scavenger') && Math.random() < PERK_EFFECTS.scavengerChance) {
      for (const type of Object.keys(drops)) drops[type] *= 2;
    }
    if (this.progression.hasPerk('vampirism')) this.player.heal(PERK_EFFECTS.vampirismHealPerKill);
    const result = this.inventory.addBundle(drops);
    this.campaign?.onGathered(result.accepted);
    this.campaign?.onEnemyDefeated(enemy);
    // Invasores não deixam cristais: o XP deles volta dobrado na recompensa do ataque.
    if (enemy.isRaider) this.raid.onRaiderDefeated(enemy);
    else this.experiencePickups.spawn(enemy.x, enemy.y, enemyXp(enemy.kind, enemy.isElite));
    this.coinPickups.spawn(enemy.x + 9, enemy.y, rollCoinDrop(enemy.definition.period, Math.random, enemy.isElite));
    if (Object.keys(result.remaining).length > 0) {
      this.deathBackpacks.create(enemy.x, enemy.y, result.remaining);
    }
    if (enemy.isElite || enemy.isQuestBoss) this.dropMonsterChest(enemy, enemy.isQuestBoss ? 'boss' : 'elite');
    this.camp.questKills += 1;
    const gained = Object.entries(result.accepted)
      .map(([type, amount]) => `+${amount} ${RESOURCE_TYPES[type]?.label.toLowerCase() ?? type}`)
      .join(', ');
    this.ui.showMessage(Object.keys(result.remaining).length > 0
      ? INVENTORY_CONFIG.fullMessage
      : gained ? `${enemy.name} derrotado • ${gained}` : `${enemy.name} derrotado`);
    this.audio.playCollect();
    this.cameras.main.shake(
      COMBAT_CONFIG.screenShake.enemyDefeated.duration,
      COMBAT_CONFIG.screenShake.enemyDefeated.intensity,
      true
    );
    this.enemyDirector.remove(enemy);
    this.save();
  }

  respawn() {
    this.isRespawning = true;
    const day = this.timeState.dayCount;
    const camp = this.camp;
    const raidActive = Boolean(this.raid?.active);
    let mode = 'normal';
    if (camp.unlocked('house', 'autoRevive') && camp.lastAutoReviveDay !== day) mode = 'house';
    else if (camp.unlocked('campfire', 'unlimitedRevive')) mode = 'campfire';
    else if (camp.unlocked('campfire', 'localRevive') && this.timeState.isNight && camp.lastLocalReviveNight !== day) mode = 'campfire';
    else if (raidActive) mode = 'raid';

    this.player.knockbackTimer = 0;
    this.player.dodgeTimer = 0;
    this.player.knockbackX = 0;
    this.player.knockbackY = 0;
    this.player.stamina = 100;
    this.player.invulnerable = 1600;
    let message;
    if (mode === 'house') {
      // Casa nível 9: volta no mesmo lugar, sem perder nada.
      camp.lastAutoReviveDay = day;
      this.player.health = Math.max(1, Math.round(this.player.maxHealth * BUILDING_DEFS.house.autoReviveHealthRatio));
      message = 'A proteção da Casa te trouxe de volta (30% de vida).';
    } else {
      if (mode === 'normal') {
        const lost = this.inventory.removeFraction(COMBAT_CONFIG.death.carriedResourceLossRatio);
        if (Object.keys(lost).length > 0) this.deathBackpacks.create(this.player.x, this.player.y, lost);
      }
      if (mode === 'campfire' && !camp.unlocked('campfire', 'unlimitedRevive')) camp.lastLocalReviveNight = day;
      this.player.body.reset(WORLD.camp.x, WORLD.camp.y + 85);
      const ratio = mode === 'campfire'
        ? Math.max(BUILDING_DEFS.campfire.reviveHealthRatio, raidActive ? 0.3 : 0)
        : mode === 'raid' ? 0.3 : 1;
      this.player.health = Math.max(1, Math.round(this.player.maxHealth * ratio));
      message = mode === 'campfire'
        ? 'A Fogueira te ressuscitou com 50% de vida.'
        : mode === 'raid'
          ? 'Você caiu no ataque e voltou à fogueira com 30% de vida.'
          : 'Você caiu. Parte da mochila foi deixada no local da morte.';
    }
    this.effects.spawnHeal(this.player.x, this.player.y - 8);
    this.audio.playDeath();
    this.cameras.main.shake(
      COMBAT_CONFIG.screenShake.playerHit.duration,
      COMBAT_CONFIG.screenShake.playerHit.intensity,
      true
    );
    this.buildingMenu?.close();
    this.ui.showMessage(message);
    this.save();
    this.isRespawning = false;
  }

  interact() {
    if (this.mining || this.overlayBlocked() || this.campaign?.ui?.isOpen) return;
    if (this.campaign?.interact()) return;
    const resource = this.world.nearbyResource(this.player.x, this.player.y);
    const structure = this.harvestStructures.nearest(this.player.x, this.player.y);
    const backpack = this.deathBackpacks.nearest(this.player.x, this.player.y);
    const resourceDistance = resource
      ? Phaser.Math.Distance.Between(this.player.x, this.player.y, resource.x, resource.y)
      : Infinity;
    const structureDistance = structure
      ? Phaser.Math.Distance.Between(this.player.x, this.player.y, structure.x, structure.y)
      : Infinity;
    if (structure && structureDistance <= resourceDistance) {
      this.collectHarvestStructure(structure);
      return;
    }
    if (resource) {
      if (resource.definition?.requiresPickaxe && !this.camp.pickaxeTier) {
        this.ui.showMessage(PICKAXE_MESSAGE);
        return;
      }
      const amount = resource.amount ?? Phaser.Math.Between(2, 4);
      const gather = () => {
        if (!this.inventory.add(resource.type, amount)) {
          this.ui.showMessage(INVENTORY_CONFIG.fullMessage);
          return;
        }
        this.effects.spawnHarvest(resource.x, resource.y - 8, RESOURCE_TYPES[resource.type]?.accent ?? 0x9ed36e);
        this.campaign?.onGathered({ [resource.type]: amount });
        this.world.harvest(resource);
        this.audio.playCollect();
        this.ui.showMessage(`Coletou ${amount} ${RESOURCE_TYPES[resource.type]?.label.toLowerCase() ?? resource.type}!`);
        this.save();
      };
      if (resource.definition?.requiresPickaxe) {
        if (!this.inventory.canAdd(resource.type, amount)) {
          this.ui.showMessage(INVENTORY_CONFIG.fullMessage);
          return;
        }
        this.beginMining({
          x: resource.x,
          y: resource.y,
          node: resource.node,
          label: RESOURCE_TYPES[resource.type]?.label.toLowerCase() ?? 'pedra',
          iron: this.camp.pickaxeTier === 'iron',
          onDone: gather
        });
      } else {
        gather();
      }
      return;
    }
    if (backpack) {
      const isChest = backpack.kind === 'chest';
      const result = this.deathBackpacks.collect(backpack, this.inventory);
      if (result.coins > 0) this.economy.addCoins(result.coins);
      this.campaign?.onGathered(result.accepted);
      const gained = [
        ...Object.entries(result.accepted).map(([type, amount]) => `+${amount} ${RESOURCE_TYPES[type]?.label.toLowerCase() ?? type}`),
        ...(result.coins > 0 ? [`+${result.coins} moedas`] : [])
      ].join(', ');
      this.audio.playCollect();
      if (isChest) this.effects.spawnHarvest(backpack.x, backpack.y - 10, 0xffd76b);
      this.ui.showMessage(result.complete
        ? `${isChest ? 'Baú do monstro aberto' : 'Recuperou a mochila de morte'} • ${gained}`
        : `${INVENTORY_CONFIG.fullMessage}${gained ? ` • ${gained}` : ''}`);
      this.save();
      return;
    }
    if (this.camp.isNear(this.player.x, this.player.y)) this.restAtCamp();
  }

  collectHarvestStructure(structure) {
    if (!structure?.available || structure.collecting) return;
    const definition = HARVEST_STRUCTURE_TYPES[structure.type];
    const pickaxeTier = this.camp.pickaxeTier;
    if (definition.requiresPickaxe && !pickaxeTier) {
      this.ui.showMessage(PICKAXE_MESSAGE);
      return;
    }
    const reward = this.harvestStructures.previewReward(structure);
    if (!reward.loot) {
      if (pickaxeTier === 'iron' && definition.requiresPickaxe) reward.amount += 1;
      if (this.camp.hasTool('axe') && ['tree', 'herbBush', 'rock', 'oreVein', 'coalVein', 'goldVein'].includes(structure.type)) {
        reward.amount += 1;
      }
    }
    if (reward.loot && !this.inventory.canAddBundle(reward.loot)) {
      this.ui.showMessage(INVENTORY_CONFIG.fullMessage);
      return;
    }
    if (!reward.loot && !this.inventory.canAdd(reward.type, reward.amount)) {
      this.ui.showMessage(INVENTORY_CONFIG.fullMessage);
      return;
    }
    if (!this.harvestStructures.reserveCollection(structure)) return;

    const finish = () => {
      let gained = '';
      let leftover = {};
      if (reward.loot) {
        const result = this.inventory.addBundle(reward.loot);
        this.campaign?.onGathered(result.accepted);
        leftover = result.remaining;
        if (Object.keys(leftover).length > 0) {
          this.deathBackpacks.create(structure.x, structure.y, leftover);
        }
        gained = Object.entries(result.accepted)
          .map(([type, amount]) => `+${amount} ${RESOURCE_TYPES[type]?.label.toLowerCase() ?? type}`)
          .join(', ');
        // Baús também guardam moedas: elas caem no chão e são atraídas pelo jogador.
        const coins = chestCoins(structure.id);
        this.coinPickups.spawn(structure.x, structure.y + 10, coins);
        gained = `${gained}${gained ? ', ' : ''}+${coins} moedas`;
      } else {
        if (!this.inventory.add(reward.type, reward.amount)) {
          this.harvestStructures.cancelCollection(structure);
          this.ui.showMessage(INVENTORY_CONFIG.fullMessage);
          return;
        }
        gained = `+${reward.amount} ${RESOURCE_TYPES[reward.type]?.label.toLowerCase() ?? reward.type}`;
        this.campaign?.onGathered({ [reward.type]: reward.amount });
      }
      this.campaign?.emit({ type: 'structure', target: structure.type });
      if (!this.harvestStructures.collect(structure)) return;
      const accent = reward.loot
        ? 0xe2b64d
        : RESOURCE_TYPES[reward.type]?.accent ?? 0x9ed36e;
      this.effects.spawnHarvest(structure.x, structure.y - 8, accent);
      this.audio.playCollect();
      const label = definition.label.toLowerCase();
      this.ui.showMessage(Object.keys(leftover).length > 0
        ? INVENTORY_CONFIG.fullMessage
        : reward.loot ? `Baú aberto • ${gained}` : `Coletou ${gained} • ${label}`);
      this.save();
    };

    if (definition.requiresPickaxe) {
      this.beginMining({
        x: structure.x,
        y: structure.y,
        node: structure.node,
        label: definition.label.toLowerCase(),
        iron: pickaxeTier === 'iron',
        onDone: () => {
          structure.node?.clearTint();
          finish();
        },
        onCancel: () => this.harvestStructures.cancelCollection(structure)
      });
    } else {
      finish();
    }
  }

  /** Botão de ação está apertado? (tecla E, botão da tela ou toque). */
  isActionHeld() {
    return Boolean(this.keys?.interact?.isDown || this.actionHeld);
  }

  /** Começa a picaretar: o jogador precisa segurar o botão até a barra encher. */
  beginMining({ x, y, node = null, label, iron = false, onDone, onCancel = null }) {
    this.cancelMining();
    const duration = iron ? MINING_DURATION_MS / 2 : MINING_DURATION_MS;
    this.mining = {
      x, y, node, label, duration, onDone, onCancel,
      elapsed: 0,
      strikeTimer: MINING_STRIKE_MS,
      baseX: node?.x ?? x
    };
    node?.setTint(0xffd9a0);
    this.player.startMining(x, y);
    if (!this.miningBar) {
      this.miningBar = this.add.graphics().setDepth(9500);
      this.miningLabel = this.add.text(0, 0, '', {
        fontFamily: 'Press Start 2P',
        fontSize: '8px',
        color: '#ffe9b0',
        stroke: '#2a1d1a',
        strokeThickness: 3
      }).setOrigin(0.5, 1).setDepth(9501).setResolution(2);
      this.hudCamera?.ignore([this.miningBar, this.miningLabel]);
    }
    this.miningBar.setVisible(true);
    this.miningLabel.setVisible(true);
    this.ui.showMessage(`Segure para minerar ${label}...`);
    this.drawMiningBar();
  }

  updateMining(delta) {
    const mining = this.mining;
    if (!mining) return;
    const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, mining.x, mining.y);
    if (distance > MINING_MAX_DISTANCE) {
      this.cancelMining('Você se afastou da rocha.');
      return;
    }
    if (!this.isActionHeld() || this.buildingMenu?.isOpen || this.worldMap?.isOpen || this.gameOver) {
      this.cancelMining('Mineração interrompida — segure o botão para continuar.');
      return;
    }
    this.player.body?.setVelocity(0, 0);
    mining.elapsed += delta;
    mining.strikeTimer -= delta;
    if (mining.strikeTimer <= 0) {
      // Cada batida da picareta: faíscas, lascas, tremida na rocha e som.
      mining.strikeTimer += MINING_STRIKE_MS;
      const side = this.player.x <= mining.x ? -1 : 1;
      this.effects.spawnMiningHit(mining.x + side * 6, mining.y - 8);
      this.audio.playPick?.();
      this.cameras.main.shake(60, 0.0016, true);
      if (mining.node) {
        mining.node.x = mining.baseX;
        this.tweens.add({ targets: mining.node, x: mining.baseX - side * 1.5, duration: 45, yoyo: true });
      }
    }
    if (mining.elapsed >= mining.duration) {
      const done = mining.onDone;
      this.clearMining();
      done?.();
      return;
    }
    this.drawMiningBar();
  }

  drawMiningBar() {
    const mining = this.mining;
    if (!mining || !this.miningBar) return;
    const ratio = Phaser.Math.Clamp(mining.elapsed / mining.duration, 0, 1);
    const width = 40;
    const x = Math.round(this.player.x - width / 2);
    const y = Math.round(this.player.y - 42);
    this.miningBar.clear();
    this.miningBar.fillStyle(0x1d1612, 0.9).fillRect(x - 2, y - 2, width + 4, 9);
    this.miningBar.fillStyle(0x4a3a2c, 1).fillRect(x, y, width, 5);
    this.miningBar.fillStyle(0xf0a840, 1).fillRect(x, y, Math.round(width * ratio), 5);
    this.miningBar.fillStyle(0xffe6a0, 1).fillRect(x, y, Math.round(width * ratio), 1);
    const seconds = Math.max(0, (mining.duration - mining.elapsed) / 1000);
    this.miningLabel.setText(`${seconds.toFixed(1)}s`).setPosition(this.player.x, y - 3);
  }

  cancelMining(message = null) {
    const mining = this.mining;
    if (!mining) return;
    const cancel = mining.onCancel;
    mining.node?.clearTint();
    this.clearMining();
    cancel?.();
    if (message) this.ui.showMessage(message);
  }

  clearMining() {
    const mining = this.mining;
    if (mining?.node) mining.node.x = mining.baseX;
    this.mining = null;
    this.player.stopMining();
    this.miningBar?.clear().setVisible(false);
    this.miningLabel?.setVisible(false);
  }

  /** Pausa curtinha no impacto para o golpe "pesar". */
  hitstop(ms = 50) {
    if (this.hitstopActive) return;
    this.hitstopActive = true;
    this.physics.world.pause();
    this.anims.pauseAll();
    setTimeout(() => {
      this.hitstopActive = false;
      if (!this.sys.isActive()) return;
      if (!this.isUiPaused()) this.physics.world.resume();
      this.anims.resumeAll();
    }, ms);
  }

  /** No celular, o nome dos prédios só aparece perto do jogador (menos poluição na tela). */
  updateBuildingLabels() {
    const mode = this.settingsPanel?.labels ?? 'auto';
    const nearOnly = mode === 'near' || (mode === 'auto' && Boolean(this.ui?.metrics?.phone));
    for (const building of Object.values(this.camp.buildings)) {
      const label = building.label;
      if (!label) continue;
      const near = Phaser.Math.Distance.Between(this.player.x, this.player.y, label.x, label.y + 30) < 110;
      label.setAlpha(!nearOnly || near ? 1 : 0);
    }
  }

  upgradeBuilding(key) {
    const result = this.camp.upgrade(key);
    if (result.ok) {
      if (key === 'farm') this.farm.setLevel(this.camp.levels.farm);
      if (key === 'market') this.market.setLevel(this.camp.levels.market);
      if (key === 'campfire') this.travelers.refresh(this.timeState.dayCount, this.camp.levels.campfire);
      this.player.recalculateEquipment(this.camp.equipment);
      if (result.completed) this.completeCamp();
      this.save();
    }
    this.ui.showMessage(result.message);
    return result;
  }

  /** Todos os 7 prédios no nível 10: mensagem épica e masmorra marcada no mapa. */
  completeCamp() {
    this.camp.dungeonRevealed = true;
    this.createDungeonMarker();
    this.showEpic('ACAMPAMENTO LENDÁRIO', CAMP_COMPLETION_MESSAGE, 9000);
    this.cameras.main.shake(500, 0.01, true);
    this.audio.playDawn();
  }

  createDungeonMarker() {
    if (this.dungeonMarker || !(this.camp.dungeonRevealed || this.camp.defense?.dragonRadar)) return;
    if (!this.textures.exists('dungeon-entrance')) {
      const texture = this.textures.createCanvas('dungeon-entrance', 40, 30);
      // Portal de pedra escura com runas e brilho vermelho do Dragão.
      const gate = new PixelCanvas(40, 30);
      const stone = ['#1f1a1d', '#3a3337', '#544a50', '#6f6469', '#8a7f84'];
      gate.shadow(20, 28, 18, 2, 120);
      gate.forPolygon([[1, 30], [3, 9], [10, 3], [30, 3], [37, 9], [39, 30]], (x, y) => {
        const seam = y % 5 === 4 || (x + (Math.floor(y / 5) % 2) * 4) % 8 === 0;
        gate.pixel(x, y, seam ? stone[0] : x < 12 ? stone[3] : x > 28 ? stone[1] : stone[2]);
      });
      gate.forEllipse(20, 18, 9, 12, (x, y) => { if (y >= 9) gate.pixel(x, y, '#0c0809'); });
      gate.forEllipse(20, 22, 5, 6, (x, y) => gate.pixel(x, y, '#2a0c0c'));
      gate.rect(18, 18, 4, 3, '#e2463f');
      gate.pixel(19, 18, '#ffb0a0');
      for (const [x, y] of [[6, 14], [6, 20], [33, 14], [33, 20], [20, 5]]) {
        gate.rect(x, y, 2, 2, '#e2463f');
        gate.pixel(x, y, '#ff9a7a');
      }
      gate.outline();
      texture.getContext().putImageData(new ImageData(gate.data, 40, 30), 0, 0);
      texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      texture.refresh();
    }
    const sprite = this.add.image(DUNGEON_CONFIG.x, DUNGEON_CONFIG.y, 'dungeon-entrance').setOrigin(0.5, 1).setDepth(DUNGEON_CONFIG.y);
    const label = this.add.text(DUNGEON_CONFIG.x, DUNGEON_CONFIG.y - 40, DUNGEON_CONFIG.label.toUpperCase(), {
      fontFamily: 'Press Start 2P', fontSize: '8px', color: '#ffb0a0', backgroundColor: '#2a1513dd', padding: { x: 5, y: 3 }
    }).setOrigin(0.5).setDepth(DUNGEON_CONFIG.y + 1);
    this.hudCamera?.ignore([sprite, label]);
    this.dungeonMarker = { sprite, label };
  }

  showEpic(title, text, durationMs = 5000) {
    this.epicTitle.textContent = title;
    this.epicText.textContent = text;
    this.epicBanner.hidden = false;
    this.epicTimer?.remove(false);
    this.epicTimer = this.time.delayedCall(durationMs, () => {
      this.epicBanner.hidden = true;
    });
  }

  openBuilding(key) {
    return this.buildingMenu.open(key);
  }

  // Tecla C ou botão ACAMP. no celular: visão geral dos 7 prédios.
  toggleCampMenu() {
    if (this.ui.campOpen) this.buildingMenu.close();
    else if (this.camp.isNear(this.player.x, this.player.y)) this.buildingMenu.open('camp');
    else this.ui.showMessage('O acampamento está longe. Volte para a fogueira.');
  }

  onBuildingMenuStateChanged(open) {
    this.ui.buildingMenuOpen = open;
    this.ui.worldAction.hidden = open;
  }

  /** Cobra do conjunto mochila + armazém + moedas. */
  payCost(cost) {
    return this.camp.pay(cost);
  }

  giveToBackpack(bundle) {
    if (!this.inventory.canAddBundle(bundle)) return false;
    this.inventory.addBundle(bundle);
    return true;
  }

  buildingMenuAction(action, arg, arg2) {
    const wasFull = this.inventory.isFull;
    let result = { ok: false, message: 'Ação inválida.' };
    const camp = this.camp;
    if (action === 'plant') {
      const crop = arg2;
      if (!this.farm.canPlantCrop(crop)) {
        result = { ok: false, message: 'Esta semente ainda não está disponível.' };
      } else if (!camp.canPay(FARM_CROP_COST(crop))) {
        result = { ok: false, message: 'Faltam sementes. Compre no mercado.' };
      } else {
        const planted = this.farm.plant(Number(arg), crop);
        if (planted.ok) {
          camp.pay(FARM_CROP_COST(crop));
          this.campaign?.emit({ type: 'plant', target: crop });
          result = { ok: true, message: 'Semente plantada. Volte quando o crescimento terminar.' };
        } else {
          result = { ok: false, message: 'Este canteiro não pode receber essa plantação.' };
        }
      }
    } else if (action === 'harvest') {
      const harvestedCrop = this.farm.plots[Number(arg)]?.crop ?? null;
      const harvested = this.farm.harvestPlot(Number(arg), Date.now(), (bundle) => this.inventory.canAddBundle(bundle));
      if (harvested.ok) {
        this.inventory.addBundle(harvested.bundle);
        this.campaign?.onGathered(harvested.bundle);
        this.campaign?.emit({ type: 'harvest', target: harvestedCrop });
        result = { ok: true, message: `Colheita: ${formatGain(harvested.bundle)}.` };
      } else {
        result = { ok: false, message: harvested.reason === 'inventory' ? INVENTORY_CONFIG.fullMessage : 'A colheita ainda não está pronta.' };
      }
    } else if (action === 'collect-animal') {
      const collected = this.farm.collectAnimal(arg, Date.now(), (bundle) => this.inventory.canAddBundle(bundle));
      if (collected.ok) {
        this.inventory.addBundle(collected.bundle);
        this.campaign?.onGathered(collected.bundle);
        result = { ok: true, message: `Produto coletado: ${formatGain(collected.bundle)}.` };
      } else {
        result = { ok: false, message: collected.reason === 'inventory' ? INVENTORY_CONFIG.fullMessage : 'O produto ainda não está pronto.' };
      }
    } else if (action === 'barn-take') {
      const wanted = Math.min(Number(arg) || 5, this.farm.barn);
      if (wanted > 0 && this.inventory.canAdd('food', wanted)) {
        this.inventory.add('food', this.farm.withdrawBarn(wanted));
        result = { ok: true, message: `Celeiro: +${wanted} comida na mochila.` };
      } else {
        result = { ok: false, message: INVENTORY_CONFIG.fullMessage };
      }
    } else if (action === 'barn-store') {
      const { stored } = camp.store({ food: this.farm.barn });
      this.farm.withdrawBarn(stored.food ?? 0);
      result = stored.food ? { ok: true, message: `Celeiro: ${stored.food} comida movida para o armazém.` } : { ok: false, message: 'Armazém sem espaço.' };
    } else if (action === 'craft') {
      result = camp.craft(arg);
      if (result.ok) this.campaign?.emit({ type: 'craft', target: arg });
    } else if (action === 'craft-item') {
      // Receitas de itens (aba Receitas da Fogueira, Casa, Ferreiro e Fazenda).
      const recipe = CRAFT_RECIPES_BY_ID[arg];
      const items = recipe ? recipeItems(recipe) : {};
      if (!recipe) result = { ok: false, message: 'Receita desconhecida.' };
      else if ((camp.levels[recipe.station] ?? 0) < recipe.level) {
        result = { ok: false, message: `Requer ${CRAFT_STATIONS[recipe.station]} nível ${recipe.level}.` };
      } else if (Object.keys(items).length > 0 && !this.inventory.canAddBundle(items)) {
        result = { ok: false, message: INVENTORY_CONFIG.fullMessage };
      } else if (!camp.pay(recipe.cost)) {
        result = { ok: false, message: 'Faltam materiais para esta receita.' };
      } else {
        if (Object.keys(items).length > 0) this.inventory.addBundle(items);
        const extras = [];
        if (recipe.yield.coins) {
          this.economy.addCoins(recipe.yield.coins);
          extras.push(`+${recipe.yield.coins} moedas`);
        }
        if (recipe.yield.xp) {
          this.grantExperience(recipe.yield.xp, false);
          extras.push(`+${recipe.yield.xp} XP`);
        }
        this.campaign?.emit({ type: 'craft', target: arg });
        this.effects.spawnHarvest(this.player.x, this.player.y - 10, 0xf2c45c);
        this.audio.playCollect();
        const gained = [formatGain(items), ...extras].filter(Boolean).join(', ');
        result = { ok: true, message: `${recipe.name}: ${gained}.` };
      }
    } else if (action === 'craft-torch') {
      // Fogueira: 2 madeiras + 1 tecido = 1 tocha (TORCH_RECIPE no catálogo de itens).
      if (!this.inventory.canAdd('torch', 1) && this.inventory.items.torch === 0) result = { ok: false, message: INVENTORY_CONFIG.fullMessage };
      else if (!camp.pay(TORCH_RECIPE.cost)) result = { ok: false, message: 'A tocha precisa de 2 madeiras e 1 tecido.' };
      else {
        this.inventory.restore('torch', 1);
        this.campaign?.emit({ type: 'craft', target: 'torch' });
        result = { ok: true, message: 'Você fabricou uma tocha.' };
      }
    } else if (action === 'enchant') {
      camp.equipment.setActiveEnchant(arg);
      result = { ok: true, message: `Encantamento ativo: ${ENCHANTMENTS[arg]?.name ?? 'nenhum'}.` };
    } else if (action === 'repair-item') {
      result = camp.equipment.repair(arg, (cost) => this.payCost(cost));
      this.player.recalculateEquipment(camp.equipment);
    } else if (action === 'upgrade-item') {
      result = camp.equipment.upgrade(arg, (cost) => this.payCost(cost));
      this.player.recalculateEquipment(camp.equipment);
    } else if (action === 'dismantle') {
      result = camp.equipment.dismantle(arg, (bundle) => {
        const { remaining } = camp.store(bundle);
        return Object.keys(remaining).length === 0 || this.giveToBackpack(remaining);
      });
      if (result.ok) result.message = `${result.message} Materiais guardados: ${formatGain(result.returned)}.`;
      this.player.recalculateEquipment(camp.equipment);
    } else if (action === 'upgrade') {
      result = this.upgradeBuilding(arg);
    } else if (action === 'repair') {
      result = camp.repair(arg);
    } else if (action === 'repair-wall') {
      result = camp.defense.repairWall();
    } else if (action === 'store-all') {
      result = this.storeAllAtCamp();
    } else if (action === 'deposit') {
      result = camp.deposit(arg, 1, this.inventory);
    } else if (action === 'withdraw') {
      result = camp.withdraw(arg, 1, this.inventory);
    } else if (action === 'secret-deposit') {
      result = camp.depositSecret(arg, 1, this.inventory);
    } else if (action === 'secret-withdraw') {
      result = camp.withdrawSecret(arg, 1, this.inventory);
    } else if (action === 'rest') {
      result = this.restAtHouse();
    } else if (action === 'sleep') {
      result = this.sleepAtHouse();
    } else if (action === 'sleep-camp') {
      result = this.sleepAtCamp() ?? { ok: false, message: '' };
    } else if (action === 'daily-buff') {
      result = this.chooseDailyBuff(arg);
    } else if (action === 'rest-fire') {
      this.restAtCamp();
      result = { ok: true, message: 'Descansou junto à fogueira.' };
    } else if (action === 'cook') {
      const recipe = BUILDING_DEFS.campfire.cookRecipe;
      if (!camp.unlocked('campfire', 'cook')) result = { ok: false, message: 'Cozinhar requer Fogueira nível 3.' };
      else if (!this.inventory.canAddBundle(recipe.yield)) result = { ok: false, message: INVENTORY_CONFIG.fullMessage };
      else if (!camp.pay(recipe.cost)) result = { ok: false, message: 'Faltam 2 comidas.' };
      else {
        this.inventory.addBundle(recipe.yield);
        result = { ok: true, message: 'Você cozinhou uma poção de vida.' };
      }
    } else if (action === 'accept-quest') {
      result = this.travelers.acceptQuest()
        ? { ok: true, message: 'Missão aceita. Volte à fogueira quando terminar.' }
        : { ok: false, message: 'Termine a missão atual primeiro.' };
    } else if (action === 'claim-quest') {
      const reward = this.travelers.claim(camp.paymentSources(), (cost) => camp.pay(cost));
      if (reward) {
        this.economy.addCoins(reward.coins);
        const { remaining } = camp.store(reward.items);
        if (Object.keys(remaining).length > 0) this.giveToBackpack(remaining);
        result = { ok: true, message: `Missão concluída! +${reward.coins} moedas e ${formatGain(reward.items)} no armazém.` };
      } else {
        result = { ok: false, message: 'A missão ainda não foi cumprida.' };
      }
    } else if (action === 'traveler-buy') {
      const bought = this.travelers.buy(arg, this.economy, (bundle) => this.giveToBackpack(bundle));
      const good = TRAVELER_GOODS.find((entry) => entry.id === arg);
      if (bought.ok) this.campaign?.emit({ type: 'buy', amount: 1 });
      result = bought.ok
        ? { ok: true, message: `Comprou ${good.name}: -${bought.spent} moedas.` }
        : { ok: false, message: bought.reason === 'coins' ? 'Moedas insuficientes.' : bought.reason === 'inventory' ? INVENTORY_CONFIG.fullMessage : 'Esgotado.' };
    } else if (action === 'buy') {
      const bought = this.market.buy(arg, this.inventory, this.economy, arg2 === 'traveler' ? 'traveler' : 'daily');
      if (bought.ok) this.campaign?.emit({ type: 'buy', amount: 1 });
      result = bought.ok
        ? { ok: true, message: `Compra realizada: -${bought.spent} moedas.` }
        : { ok: false, message: bought.reason === 'coins' ? 'Moedas insuficientes.' : bought.reason === 'inventory' ? INVENTORY_CONFIG.fullMessage : 'Produto esgotado.' };
    } else if (action === 'sell') {
      const sold = this.market.sell(arg, this.inventory, this.economy);
      if (sold.ok) this.campaign?.emit({ type: 'sell', amount: 1 });
      result = sold.ok
        ? { ok: true, message: `Venda concluída: +${sold.coins} ${sold.coins === 1 ? 'moeda' : 'moedas'}.` }
        : { ok: false, message: sold.reason === 'locked' ? 'Vendas exigem Mercado nível 2.' : 'Item indisponível.' };
    } else if (action === 'order') {
      const ordered = this.market.placeOrder(arg, this.economy);
      result = ordered.ok
        ? { ok: true, message: `Encomenda feita: -${ordered.spent} moedas. Chega no dia ${ordered.order.readyDay}.` }
        : { ok: false, message: ordered.reason === 'coins' ? 'Moedas insuficientes.' : 'Encomendas exigem Mercado nível 8.' };
    } else if (action === 'bid') {
      const bid = this.market.bid(this.economy);
      result = bid.ok
        ? { ok: true, message: bid.leading ? `Lance de ${bid.bid} moedas. Você está vencendo!` : `Lance de ${bid.bid}. O rival cobriu!` }
        : { ok: false, message: bid.reason === 'coins' ? 'Moedas insuficientes para o lance.' : 'Não é possível dar lance agora.' };
    }
    if (!wasFull && this.inventory.isFull) {
      result = { ...result, message: INVENTORY_CONFIG.fullMessage };
    }
    this.lastBuildingMessage = result.message;
    if (result.ok) {
      this.ui.showMessage(result.message);
      this.save();
    }
    return result;
  }

  performContextAction() {
    if (this.campaign?.nearestInteraction()) {
      this.interact();
      return;
    }
    if (this.world.nearbyResource(this.player.x, this.player.y) ||
        this.harvestStructures.nearest(this.player.x, this.player.y) ||
        this.deathBackpacks.nearest(this.player.x, this.player.y)) this.interact();
    else this.attackNearby();
  }

  restAtHouse() {
    if (!this.camp.isNear(this.player.x, this.player.y)) {
      return { ok: false, message: 'Entre no acampamento para descansar.' };
    }
    if (this.restState) return { ok: false, message: 'Você já está descansando.' };
    const camp = this.camp;
    const ratio = camp.stat('house', 'restHealRatio') ?? 0.5;
    this.player.heal(Math.round(this.player.maxHealth * ratio));
    if (camp.stat('house', 'restStamina')) this.player.stamina = 100;
    this.applyWellRested();
    this.effects.spawnHeal(this.player.x, this.player.y - 8);
    const endsAt = Date.now() + 30000;
    this.restState = { endsAt };
    this.restTimer = this.time.delayedCall(30000, () => {
      this.restState = null;
      this.restTimer = null;
      const state = this.dayNight.advanceGameMinutes(30);
      if (state.rolledOver) this.handleDayAdvance(state.dayCount);
      this.ui.showMessage('Descanso concluído: 30 minutos de jogo passaram.');
      this.save();
    });
    return { ok: true, message: `Descansando... ${Math.round(ratio * 100)}% da vida restaurada.` };
  }

  /** Casa nível 3: +10% ATQ por 2 min; nível 7: até o fim do dia. */
  applyWellRested() {
    if (!this.camp.unlocked('house', 'wellRested')) return;
    if (this.camp.unlocked('house', 'wellRestedAllDay')) {
      this.buffs.apply('wellRested', { untilDay: this.dayNight.dayCount });
    } else {
      this.buffs.apply('wellRested', { durationMs: BUILDING_DEFS.house.wellRestedBuff.durationMs });
    }
    this.player.recalculateEquipment(this.camp.equipment);
  }

  /** Efeitos ao acordar: Bem Descansado e, na Casa nível 8, a refeição da cozinheira. */
  applyWakeUp() {
    this.applyWellRested();
    if (this.camp.unlocked('house', 'cook')) {
      const meal = BUILDING_DEFS.house.mealBuff;
      this.buffs.apply('meal', { durationMs: meal.durationMs });
      this.camp.store({ food: meal.food });
      return ' A cozinheira preparou uma refeição.';
    }
    return '';
  }

  canSleepNow() {
    if (this.raid?.active || this.raid?.warning) return 'Não dá para dormir durante um ataque ao acampamento!';
    if (!this.camp.unlocked('house', 'sleep')) return 'Melhore a Casa para o nível 2 para dormir e pular a noite.';
    return null;
  }

  sleepAtHouse() {
    if (!this.camp.isNear(this.player.x, this.player.y)) {
      return { ok: false, message: 'Entre no acampamento para dormir.' };
    }
    const blocked = this.canSleepNow();
    if (blocked) return { ok: false, message: blocked };
    if (this.restTimer) {
      this.restTimer.remove(false);
      this.restTimer = null;
    }
    this.restState = null;
    this.dayNight.skipToNextDay();
    this.enemyDirector.clearNightEnemies();
    this.handleDayAdvance(this.dayNight.dayCount);
    this.world.setNight(false);
    this.harvestStructures.setNight(false);
    this.lastPhase = 'day';
    this.warningTriggered = false;
    this.player.health = this.player.maxHealth;
    this.player.stamina = 100;
    this.player.invulnerable = 1000;
    const extra = this.applyWakeUp();
    this.audio.playDawn();
    return { ok: true, message: `Você dormiu. Dia ${this.dayNight.dayCount} começou e o progresso foi salvo.${extra}` };
  }

  chooseDailyBuff(type) {
    const camp = this.camp;
    if (!camp.unlocked('house', 'dailyBuff')) return { ok: false, message: 'O buff diário exige Casa nível 10.' };
    const day = this.dayNight.dayCount;
    if (camp.dailyBuffDay === day) return { ok: false, message: 'Você já escolheu o buff de hoje.' };
    const buffId = DAILY_BUFF_IDS[type];
    if (!buffId) return { ok: false, message: 'Buff desconhecido.' };
    camp.dailyBuffDay = day;
    this.buffs.apply(buffId, { untilDay: day });
    this.player.recalculateEquipment(camp.equipment);
    return { ok: true, message: `Buff do dia: ${BUILDING_DEFS.house.dailyBuffs[type].description}` };
  }

  recoverAtCamp() {
    this.player.heal(this.player.maxHealth);
    this.player.stamina = 100;
    this.effects.spawnHeal(this.player.x, this.player.y - 8);
    if (this.camp.unlocked('campfire', 'warmth')) {
      this.buffs.apply('warmth', { durationMs: BUILDING_DEFS.campfire.warmthBuff.durationMs });
      this.player.recalculateEquipment(this.camp.equipment);
    }
    if (this.camp.questKills >= 5 && !this.camp.questClaimed) {
      this.camp.questClaimed = true;
      const reward = this.inventory.addBundle({ food: 8, herbs: 2 });
      const rewardStorage = this.camp.store(reward.remaining);
      if (Object.keys(rewardStorage.remaining).length > 0) {
        this.deathBackpacks.create(this.player.x, this.player.y, rewardStorage.remaining);
      }
      if (Object.keys(reward.remaining).length > 0) return INVENTORY_CONFIG.fullMessage;
      return 'Missão concluída! Recompensa: 8 comidas e 2 ervas.';
    }
    return this.camp.unlocked('campfire', 'warmth')
      ? 'Descansou e salvou. Calor da Fogueira: +10% ATQ por 3 min.'
      : 'Descansou, recuperou a vida e salvou o jogo.';
  }

  restAtCamp() {
    if (!this.camp.isNear(this.player.x, this.player.y)) {
      this.ui.showMessage('Só é possível descansar junto à fogueira.');
      return;
    }
    const phase = this.dayNight.getState().phase;
    if ((phase === 'night' || phase === 'dawn') && !this.canSleepNow()) {
      this.sleepAtCamp();
      return;
    }
    this.ui.showMessage(this.recoverAtCamp());
    this.save();
  }

  sleepAtCamp() {
    if (!this.camp.isNear(this.player.x, this.player.y)) {
      this.ui.showMessage('Só é possível dormir junto à fogueira ou à casa.');
      return { ok: false, message: 'Só é possível dormir junto à fogueira ou à casa.' };
    }
    const phase = this.dayNight.getState().phase;
    if (phase !== 'night' && phase !== 'dawn') {
      this.ui.showMessage('Você só pode pular a noite depois que ela começar.');
      return { ok: false, message: 'Você só pode pular a noite depois que ela começar.' };
    }
    const blocked = this.canSleepNow();
    if (blocked) {
      this.ui.showMessage(blocked);
      return { ok: false, message: blocked };
    }
    this.dayNight.skipNight();
    this.enemyDirector.clearNightEnemies();
    this.handleDayAdvance(this.dayNight.dayCount);
    this.world.setNight(false);
    this.harvestStructures.setNight(false);
    this.lastPhase = 'day';
    this.warningTriggered = false;
    this.player.invulnerable = 1000;
    const recoveryMessage = this.recoverAtCamp();
    const extra = this.applyWakeUp();
    this.audio.playDawn();
    const message = `Você dormiu até amanhecer. Dia ${this.dayNight.dayCount} começou. ${recoveryMessage}${extra}`;
    this.ui.showMessage(message);
    this.save();
    return { ok: true, message };
  }

  // ---------- Efeitos contínuos do acampamento ----------

  updateFarm(delta) {
    const produced = this.farm.update(Date.now(), delta, {
      efficiency: this.camp.efficiency('farm'),
      raining: this.isRaining,
      store: (bundle) => this.camp.store(bundle),
      canStore: (bundle) => this.camp.storageCanAccept(bundle)
    });
    if (!produced) return;
    const parts = [];
    if (produced.barn > 0) parts.push(`+${produced.barn} comida no celeiro`);
    if (Object.keys(produced.storage).length > 0) parts.push(`${formatGain(produced.storage)} no armazém`);
    const now = this.time.now;
    if (now - (this.lastFarmMessageAt ?? -Infinity) > 8000) {
      this.lastFarmMessageAt = now;
      this.ui.showMessage(`Fazenda • ${parts.join(' • ')}`);
    }
    this.farmSaveTimer = (this.farmSaveTimer ?? 0) + 1;
    if (this.farmSaveTimer >= 10) {
      this.farmSaveTimer = 0;
      this.save();
    }
  }

  /** Cura da Fogueira (nível 2+) e da refeição; dano em inimigos dentro do fogo (nível 6+). */
  updateCampEffects(delta) {
    const seconds = delta / 1000;
    const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.camp.x, this.camp.y);
    let regen = this.buffs.effects.regenPerSecond;
    if (distance < this.camp.protectRadius) regen += this.camp.campfireRegen;
    if (regen > 0 && this.player.health > 0 && this.player.health < this.player.maxHealth) {
      this.player.heal(regen * seconds);
    }
  }

  updateEnemyStatus(delta) {
    const camp = this.camp;
    const radius = camp.protectRadius;
    const aura = (camp.stat('campfire', 'auraDamagePerSecond') ?? 0) * (camp.efficiency('campfire') > 0 ? 1 : 0);
    const flames = this.raid?.active ? (camp.stat('campfire', 'raidFlameDamagePerSecond') ?? 0) * (camp.efficiency('campfire') > 0 ? 1 : 0) : 0;
    this.auraTimer = (this.auraTimer ?? 0) + delta;
    const auraTick = this.auraTimer >= 1000;
    if (auraTick) this.auraTimer -= 1000;
    for (const enemy of [...this.enemies]) {
      if (!enemy.active || enemy.dead) continue;
      const burn = enemy.tickStatus?.(delta) ?? 0;
      if (burn > 0 && this.damageEnemy(enemy, burn, { color: '#ffb066' })) continue;
      if (auraTick && (aura + flames) > 0 &&
          Phaser.Math.Distance.Between(enemy.x, enemy.y, camp.x, camp.y) < radius) {
        this.damageEnemy(enemy, aura + flames, { color: '#ffcf6b' });
      }
    }
  }

  onPlayerDamaged() {
    const equipment = this.camp.equipment;
    const brokeArmor = equipment.wear('armor');
    const brokeShield = equipment.wear('shield');
    if (brokeArmor || brokeShield) {
      this.player.recalculateEquipment(equipment);
      this.ui.showMessage(`${brokeArmor ? 'Sua armadura' : 'Seu escudo'} quebrou! Repare no Ferreiro (nível 4).`);
    }
  }

  /** Recomeçar do zero (engrenagem): apaga o progresso e recarrega o jogo. */
  restartFromScratch() {
    // Sem isso, o save automático ao fechar a página gravaria o jogo antigo de volta.
    this.skipSave = true;
    clearAllSaves();
    window.location.reload();
  }

  restartFromLastSave() {
    this.gameOverRoot.hidden = true;
    this.skipSave = true;
    this.raid?.restoreSnapshot?.();
    this.scene.restart();
  }

  save() {
    if (!this.inventory || !this.player || !this.camp || this.skipSave) return;
    saveGame({
      inventory: this.inventory.serialize(),
      player: {
        health: this.player.health, maxHealth: this.player.maxHealth,
        attack: this.player.attack, defense: this.player.defense,
        baseAttack: this.player.baseAttack, baseDefense: this.player.baseDefense
      },
      progression: this.progression.serialize(),
      economy: this.economy.serialize(),
      boss: this.boss ? this.boss.serialize() : { defeated: true, health: 0 },
      camp: this.camp.serialize(),
      farm: this.farm.serialize(),
      market: this.market.serialize(),
      buffs: this.buffs.serialize(),
      travelers: this.travelers.serialize(),
      raid: this.raid?.serialize?.() ?? this.savedRaid ?? null,
      campaign: this.campaign?.serialize() ?? this.savedCampaign ?? undefined,
      time: {
        cycleTime: this.dayNight.cycleTime,
        dayCount: this.dayNight.dayCount
      },
      deathBackpacks: this.deathBackpacks.serialize(),
      harvestStructures: this.harvestStructures.serialize()
    });
  }
}

function formatGain(bundle = {}) {
  return Object.entries(bundle)
    .map(([type, amount]) => `+${amount} ${RESOURCE_TYPES[type]?.label.toLowerCase() ?? type}`)
    .join(', ');
}

function FARM_CROP_COST(crop) {
  return FARM_CROPS[crop]?.cost ?? { seeds: 1 };
}
