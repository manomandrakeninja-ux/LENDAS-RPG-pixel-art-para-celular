import Phaser from 'phaser';
import { COMBAT_CONFIG } from '../data/combat.js';
import { DAY_NIGHT_CONFIG } from '../data/dayNight.js';
import { HARVEST_STRUCTURE_TYPES } from '../data/harvestStructures.js';
import { PERK_EFFECTS, PERKS, PlayerProgression } from '../data/progression.js';
import { rollCoinDrop } from '../data/economy.js';
import { BOSS_CONFIG } from '../data/boss.js';
import { isConsumable, itemForHotkey, useConsumable } from '../data/consumables.js';
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
import { loadSaveDetailed, saveGame } from './save.js';
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
import { createGameAnimations, preloadGameAssets } from './assets.js';

export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  preload() {
    preloadGameAssets(this);
  }

  create() {
    createGameAnimations(this);
    const saveResult = loadSaveDetailed();
    const saved = saveResult.data;
    this.worldBounds = { ...WORLD, camp: WORLD.camp };
    this.inventory = new Inventory(saved?.inventory);
    this.world = new World(this);
    this.world.create();
    this.camp = new Camp(this, saved?.camp);
    const inventoryOverflow = this.inventory.takeMigrationOverflow();
    this.progression = new PlayerProgression(saved?.progression);
    this.economy = new EconomySystem(saved?.economy);
    this.player = new Player(this, WORLD.camp.x, WORLD.camp.y + 85, saved?.player, this.progression);
    this.player.recalculateEquipment(this.camp.equipment);
    this.audio = new AudioManager();
    this.dayNight = new DayNightCycle(saved?.time);
    this.timeState = this.dayNight.getState();
    this.farm = new FarmSystem({
      saved: saved?.farm ?? {},
      level: this.camp.levels.farm
    });
    this.market = new MarketSystem({
      saved: saved?.market ?? {},
      day: this.timeState.dayCount
    });
    this.harvestStructures = new HarvestStructures(this, {
      saved: saved?.harvestStructures ?? [],
      dayCount: this.timeState.dayCount
    });
    this.enemies = [];
    this.enemyDirector = new EnemyDirector(this, this.enemies);
    this.enemyDirector.populate(this.timeState);
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

    this.cameras.main.setBounds(0, 0, WORLD.width, WORLD.height);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setZoom(2).setRoundPixels(true);

    this.duskTint = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0xd88952, 0)
      .setOrigin(0).setScrollFactor(0).setDepth(3997);
    this.damageFlash = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0xff6b57, 0)
      .setOrigin(0).setScrollFactor(0).setDepth(5000);
    this.lighting = new LightingSystem(this, this.camp);

    this.ui = new GameUI(this);
    this.levelUpOverlay = new LevelUpOverlay(this);
    this.worldMap = new WorldMapOverlay(this);
    this.buildingMenu = new BuildingMenu(this);
    this.touch = new TouchControls(this);
    this.restState = null;
    this.storeAllAvailable = false;
    this.wasNearCamp = false;
    this.lastBuildingMessage = '';
    this.hudCamera = this.cameras.add(0, 0, this.scale.width, this.scale.height)
      .setName('HUD')
      .setRoundPixels(true);
    const uiObjects = new Set([...this.ui.fixed, ...this.ui.campPanel]);
    this.cameras.main.ignore([...uiObjects]);
    this.hudCamera.ignore(this.children.list.filter((child) => !uiObjects.has(child)));

    this.keys = this.input.keyboard.addKeys({
      up: 'W', down: 'S', left: 'A', right: 'D',
      a: 'A', d: 'D', w: 'W', s: 'S',
      interact: 'E', attack: 'J', dodge: 'SPACE', special: 'Q',
      camp: 'C', map: 'M', rest: 'F', sleep: 'R', escape: 'ESC'
    });
    this.cursors = this.input.keyboard.createCursorKeys();
    this.input.keyboard.on('keydown', () => this.audio.unlock());
    this.input.keyboard.on('keydown-ESC', () => {
      if (this.worldMap.isOpen) this.worldMap.close();
      else if (this.buildingMenu.isOpen) this.buildingMenu.close();
      else this.ui.toggleCamp(false);
    });
    this.input.keyboard.on('keydown-M', () => this.worldMap.toggle());
    this.input.keyboard.on('keydown-C', () => this.toggleCampMenu());
    this.input.keyboard.on('keydown-F', () => this.restAtCamp());
    this.input.keyboard.on('keydown-R', () => this.sleepAtCamp());
    this.input.keyboard.on('keydown-E', () => this.interact());
    this.input.keyboard.on('keydown-J', () => this.attackNearby());
    this.input.keyboard.on('keydown-Q', () => this.specialAttack());
    this.input.keyboard.on('keydown-ONE', () => this.useHotkey('1'));
    this.input.keyboard.on('keydown-TWO', () => this.useHotkey('2'));
    this.input.keyboard.on('keydown-THREE', () => this.useHotkey('3'));

    this.handleCanvasPointerDown = (event) => {
      if (event.button !== 0) return;
      this.audio.unlock();
      const rect = this.game.canvas.getBoundingClientRect();
      const x = (event.clientX - rect.left) * (this.scale.width / rect.width);
      const y = (event.clientY - rect.top) * (this.scale.height / rect.height);
      if (this.worldMap?.isOpen || this.buildingMenu?.isOpen) return;
      const tappedSlot = this.ui.backpackSlots.find(({ background, type }) => type &&
        x >= background.x && x <= background.x + background.width &&
        y >= background.y && y <= background.y + background.height);
      if (tappedSlot && !this.ui.campOpen) {
        if (isConsumable(tappedSlot.type)) this.useItem(tappedSlot.type);
        return;
      }
      if (this.ui.campOpen) {
        for (const [key, { button }] of Object.entries(this.ui.campButtons)) {
          const withinButton = Math.abs(x - button.x) <= button.width / 2 &&
            Math.abs(y - button.y) <= button.height / 2;
          if (withinButton) {
            if (key === 'sleep') this.sleepAtCamp();
            else this.upgradeBuilding(key);
            break;
          }
        }
        return;
      }
      const worldPoint = this.cameras.main.getWorldPoint(x, y);
      const clickedBuilding = Object.entries(this.camp.buildings).find(([, building]) =>
        Math.abs(worldPoint.x - building.sprite.x) <= 52 &&
        Math.abs(worldPoint.y - building.sprite.y) <= 58
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
    this.saveTimer = this.time.addEvent({ delay: 60000, loop: true, callback: () => this.save() });
    this.lastPhase = this.timeState.phase;
    this.warningTriggered = false;
    this.isRespawning = false;
  }

  update(_time, delta) {
    if (this.player.health <= 0 && !this.isRespawning) this.respawn();

    this.timeState = this.updateDayNight(delta);
    const autoHarvest = this.farm.update(Date.now(), (bundle) => this.camp.storageCanAccept(bundle));
    if (autoHarvest) {
      this.camp.store(autoHarvest);
      const gained = Object.entries(autoHarvest)
        .map(([type, amount]) => `+${amount} ${RESOURCE_TYPES[type]?.label.toLowerCase() ?? type}`)
        .join(', ');
      this.ui.showMessage(`Colheita automática • ${gained} guardado no armazém`);
      this.save();
    }
    this.menuRefreshTimer = (this.menuRefreshTimer ?? 0) + delta;
    if (this.menuRefreshTimer >= 500) {
      this.menuRefreshTimer = 0;
      this.buildingMenu?.refresh();
    }
    if (this.worldMap.isOpen || this.progression.hasPendingChoice) {
      this.player.body.setVelocity(0, 0);
      for (const enemy of this.enemies) enemy.body?.setVelocity(0, 0);
      this.boss?.body?.setVelocity(0, 0);
    } else if (this.ui.campOpen || this.buildingMenu?.isOpen) {
      this.player.body.setVelocity(0, 0);
    } else {
      const pointer = this.input.activePointer;
      const pointerWorld = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      this.player.update(delta, this.keys, this.cursors, pointerWorld, this.touch.vector);
      this.player.dodge(this.keys, this.touch.consumeDodge());
      this.world.revealAround(this.player.x, this.player.y);
      this.enemyDirector.update(delta, this.player, this.timeState);
      this.boss?.update(delta, this.player);
      if (Phaser.Input.Keyboard.JustDown(this.keys.attack)) this.attackNearby();
      if (Phaser.Input.Keyboard.JustDown(this.keys.special)) this.specialAttack();
    }

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
    this.ui.updateBossHealth(this.boss, this.player);
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
    if (this.market.day !== day) this.market.restock(day);
    this.save();
  }

  updateCampEntry(isNearCamp) {
    if (isNearCamp && !this.wasNearCamp) {
      this.storeAllAvailable = true;
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
    if (this.player.attackCooldown > 0 || this.progression?.hasPendingChoice || this.worldMap?.isOpen || this.ui.campOpen || this.buildingMenu?.isOpen) return;
    this.player.attackCooldown = COMBAT_CONFIG.basicAttackCooldownMs;
    this.player.showAttack();
    const target = this.nearestEnemy(COMBAT_CONFIG.basicAttackRange);
    if (!target) {
      this.comboStep = 0;
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
    const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y - 8, target.x, target.y - 8);
    const damage = Math.min(target.health, attack);
    this.effects.spawnSlash(target.x, target.y - 10, angle, finisher ? 2 : 1);
    const killed = target.hit(attack, angle);
    this.effects.spawnDamage(target.x, target.y - 18, damage, finisher ? '#ffe28a' : undefined);
    const shake = finisher ? COMBAT_CONFIG.screenShake.enemyDefeated : COMBAT_CONFIG.screenShake.enemyHit;
    this.cameras.main.shake(shake.duration, shake.intensity, true);
    if (killed) {
      this.defeatEnemy(target);
    } else {
      if (finisher && !target.isBoss) target.applyKnockback?.(angle, COMBAT_CONFIG.knockback.elite * COMBAT_CONFIG.combo.finisherKnockback);
      this.effects.spawnHit(target.x, target.y - 10, 0xffe0a0, finisher ? 11 : 7);
    }
  }

  specialAttack() {
    if (this.player.specialCooldown > 0 ||
        this.player.stamina < COMBAT_CONFIG.specialStaminaCost ||
        this.progression?.hasPendingChoice || this.worldMap?.isOpen || this.ui.campOpen || this.buildingMenu?.isOpen) return;
    this.player.specialCooldown = 4800;
    this.player.stamina -= COMBAT_CONFIG.specialStaminaCost;
    this.player.showAttack();
    this.effects.spawnSpecial(this.player.x, this.player.y - 4);
    const targets = this.enemies.filter((enemy) => enemy.active &&
      Phaser.Math.Distance.Between(enemy.x, enemy.y, this.player.x, this.player.y) < COMBAT_CONFIG.specialAttackRange);
    if (this.boss && !this.boss.dead &&
        Phaser.Math.Distance.Between(this.boss.x, this.boss.y, this.player.x, this.player.y) < COMBAT_CONFIG.specialAttackRange) {
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
      const missing = { 1: 'Sem poções de vida.', 2: 'Sem comida na mochila.', 3: 'Sem tochas na mochila.' };
      this.ui.showMessage(missing[hotkey] ?? 'Nada para usar.');
      return;
    }
    this.useItem(type);
  }

  useItem(type) {
    if (this.progression?.hasPendingChoice || this.worldMap?.isOpen || this.buildingMenu?.isOpen ||
        this.player.health <= 0) return;
    const result = useConsumable(type, this.inventory, this.player);
    const label = RESOURCE_TYPES[type]?.label ?? type;
    if (!result.ok) {
      if (result.reason === 'full-health') this.ui.showMessage('A vida já está cheia.');
      return;
    }
    if (result.healed) {
      this.effects.spawnHeal(this.player.x, this.player.y - 8);
      this.ui.showMessage(`${label} • +${result.healed} de vida`);
    } else {
      this.ui.showMessage(`Tocha acesa • luz ampliada por ${Math.round(result.durationMs / 1000)}s`);
    }
    this.audio.playCollect();
    this.save();
  }

  collectCoins(amount) {
    this.economy.addCoins(amount);
    this.ui.showMessage(`+${amount} moedas`);
    this.audio.playCollect();
    this.save();
  }

  collectExperience(amount) {
    const result = this.progression.addXp(amount);
    this.player.maxHealth = this.progression.maxHealth;
    if (result.leveledUp) {
      this.worldMap.close();
      this.showLevelUpChoice();
    } else {
      this.ui.showMessage(`+${amount} XP`);
    }
    this.audio.playCollect();
    this.save();
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
    this.player.maxHealth = this.progression.maxHealth;
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
    this.player.maxHealth = this.progression.maxHealth;
    this.player.recalculateEquipment(this.camp.equipment);
    if (!this.showLevelUpChoice()) {
      this.ui.showMessage(`Nível ${this.progression.level} • ${attribute === 'attack' ? 'ATAQUE +2' : 'DEFESA +2'}`);
    }
    this.save();
    return true;
  }

  defeatBoss(boss) {
    if (!boss || boss.defeated) return;
    boss.dead = true;
    boss.defeated = true;
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
    this.camp.equipment.unlockRecipe(BOSS_CONFIG.recipeId);
    this.player.recalculateEquipment(this.camp.equipment);
    this.ui.showMessage('Titã do Bioma derrotado! Núcleo do Titã e receita rara obtidos.');
    this.audio.playCollect();
    this.cameras.main.shake(420, 0.012, true);
    this.save();
  }

  defeatEnemy(enemy) {
    if (enemy?.isBoss) {
      this.defeatBoss(enemy);
      return;
    }
    const deathColor = enemy.isElite ? 0xffd56b : enemy.kind === 'wolf' ? 0xb9a984 : 0x9fd477;
    this.effects.spawnDeath(enemy.x, enemy.y - 8, deathColor);
    const drops = enemy.rollDrops();
    if (this.progression.hasPerk('scavenger') && Math.random() < PERK_EFFECTS.scavengerChance) {
      for (const type of Object.keys(drops)) drops[type] *= 2;
    }
    if (this.progression.hasPerk('vampirism')) this.player.heal(PERK_EFFECTS.vampirismHealPerKill);
    const result = this.inventory.addBundle(drops);
    this.experiencePickups.spawn(enemy.x, enemy.y, enemy.definition.xp ?? 0);
    this.coinPickups.spawn(enemy.x + 9, enemy.y, rollCoinDrop(enemy.definition.period));
    if (Object.keys(result.remaining).length > 0) {
      this.deathBackpacks.create(enemy.x, enemy.y, result.remaining);
    }
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
    const deathX = this.player.x;
    const deathY = this.player.y;
    const lost = this.inventory.removeFraction(COMBAT_CONFIG.death.carriedResourceLossRatio);
    if (Object.keys(lost).length > 0) {
      this.deathBackpacks.create(deathX, deathY, lost);
    }
    this.player.body.reset(WORLD.camp.x, WORLD.camp.y + 85);
    this.player.knockbackTimer = 0;
    this.player.dodgeTimer = 0;
    this.player.knockbackX = 0;
    this.player.knockbackY = 0;
    this.player.health = this.player.maxHealth;
    this.player.stamina = 100;
    this.player.invulnerable = 1600;
    this.effects.spawnHeal(this.player.x, this.player.y - 8);
    this.audio.playDeath();
    this.cameras.main.shake(
      COMBAT_CONFIG.screenShake.playerHit.duration,
      COMBAT_CONFIG.screenShake.playerHit.intensity,
      true
    );
    this.ui.toggleCamp(false);
    this.buildingMenu?.close();
    this.ui.showMessage('Você caiu. Parte da mochila foi deixada no local da morte.');
    this.save();
    this.isRespawning = false;
  }

  interact() {
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
        this.ui.showMessage('Você precisa de uma picareta');
        return;
      }
      const amount = resource.amount ?? Phaser.Math.Between(2, 4);
      if (!this.inventory.add(resource.type, amount)) {
        this.ui.showMessage(INVENTORY_CONFIG.fullMessage);
        return;
      }
      this.effects.spawnHarvest(resource.x, resource.y - 8, RESOURCE_TYPES[resource.type]?.accent ?? 0x9ed36e);
      this.world.harvest(resource);
      this.audio.playCollect();
      this.ui.showMessage(`Coletou ${amount} ${RESOURCE_TYPES[resource.type]?.label.toLowerCase() ?? resource.type}!`);
      this.save();
      return;
    }
    if (backpack) {
      const result = this.deathBackpacks.collect(backpack, this.inventory);
      const gained = Object.entries(result.accepted)
        .map(([type, amount]) => `+${amount} ${RESOURCE_TYPES[type]?.label.toLowerCase() ?? type}`)
        .join(', ');
      this.audio.playCollect();
      this.ui.showMessage(result.complete
        ? `Recuperou a mochila de morte • ${gained}`
        : INVENTORY_CONFIG.fullMessage);
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
      this.ui.showMessage('Você precisa de uma picareta');
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
        leftover = result.remaining;
        if (Object.keys(leftover).length > 0) {
          this.deathBackpacks.create(structure.x, structure.y, leftover);
        }
        gained = Object.entries(result.accepted)
          .map(([type, amount]) => `+${amount} ${RESOURCE_TYPES[type]?.label.toLowerCase() ?? type}`)
          .join(', ');
      } else {
        if (!this.inventory.add(reward.type, reward.amount)) {
          this.harvestStructures.cancelCollection(structure);
          this.ui.showMessage(INVENTORY_CONFIG.fullMessage);
          return;
        }
        gained = `+${reward.amount} ${RESOURCE_TYPES[reward.type]?.label.toLowerCase() ?? reward.type}`;
      }
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
      const duration = pickaxeTier === 'iron' ? 1400 : 2200;
      this.ui.showMessage(`Minerando ${definition.label.toLowerCase()}...`);
      structure.node?.setTint(0xffc15a);
      this.tweens.add({
        targets: structure.node,
        alpha: 0.58,
        duration: Math.floor(duration / 6),
        yoyo: true,
        repeat: 5
      });
      this.time.delayedCall(duration, finish);
    } else {
      finish();
    }
  }

  upgradeBuilding(key) {
    const result = this.camp.upgrade(key, this.inventory);
    if (result.ok && key === 'farm') this.farm.setLevel(this.camp.levels.farm);
    this.ui.setCampFeedback(result.message);
    this.ui.showMessage(result.message);
    if (result.ok) this.save();
    return result;
  }

  openBuilding(key) {
    return this.buildingMenu.open(key);
  }

  // Tecla C ou botão ACAMP. no celular.
  toggleCampMenu() {
    if (this.ui.campOpen) this.ui.toggleCamp(false);
    else if (this.camp.isNear(this.player.x, this.player.y)) this.ui.toggleCamp(true);
    else this.ui.showMessage('O acampamento está longe. Volte para a fogueira.');
  }

  onBuildingMenuStateChanged(open) {
    this.ui.buildingMenuOpen = open;
    if (open) this.ui.toggleCamp(false);
    this.ui.worldAction.hidden = open;
  }

  buildingMenuAction(action, arg, arg2) {
    const wasFull = this.inventory.isFull;
    let result = { ok: false, message: 'Ação inválida.' };
    if (action === 'plant') {
      const plotId = Number(arg);
      const crop = arg2;
      if ((this.inventory.items.seeds ?? 0) < 1) {
        result = { ok: false, message: 'Você precisa de sementes. Compre no mercado.' };
      } else {
        this.inventory.remove({ seeds: 1 });
        const planted = this.farm.plant(plotId, crop);
        if (planted.ok) {
          result = { ok: true, message: 'Semente plantada. Volte quando o crescimento terminar.' };
        } else {
          this.inventory.restore('seeds', 1);
          result = { ok: false, message: 'Este canteiro não pode receber essa plantação.' };
        }
      }
    } else if (action === 'harvest') {
      const harvested = this.farm.harvestPlot(Number(arg), Date.now(), (bundle) => this.inventory.canAddBundle(bundle));
      if (harvested.ok) {
        this.inventory.addBundle({ [harvested.type]: harvested.amount });
        result = {
          ok: true,
          message: `Colheita: +${harvested.amount} ${RESOURCE_TYPES[harvested.type]?.label.toLowerCase() ?? harvested.type}.`
        };
      } else {
        result = { ok: false, message: harvested.reason === 'inventory' ? INVENTORY_CONFIG.fullMessage : 'A colheita ainda não está pronta.' };
      }
    } else if (action === 'collect-animal') {
      const collected = this.farm.collectAnimal(arg, Date.now(), (bundle) => this.inventory.canAddBundle(bundle));
      if (collected.ok) {
        this.inventory.addBundle({ [collected.type]: collected.amount });
        result = { ok: true, message: `Produto coletado: +${collected.amount} ${RESOURCE_TYPES[collected.type]?.label.toLowerCase() ?? collected.type}.` };
      } else {
        result = { ok: false, message: collected.reason === 'inventory' ? INVENTORY_CONFIG.fullMessage : 'O produto ainda não está pronto.' };
      }
    } else if (action === 'craft') {
      result = this.camp.craft(arg, this.inventory);
    } else if (action === 'upgrade') {
      result = this.upgradeBuilding(arg);
    } else if (action === 'store-all') {
      result = this.storeAllAtCamp();
    } else if (action === 'deposit') {
      result = this.camp.deposit(arg, 1, this.inventory);
    } else if (action === 'withdraw') {
      result = this.camp.withdraw(arg, 1, this.inventory);
    } else if (action === 'rest') {
      result = this.restAtHouse();
    } else if (action === 'sleep') {
      result = this.sleepAtHouse();
    } else if (action === 'buy') {
      const bought = this.market.buy(arg, this.inventory, this.economy);
      result = bought.ok
        ? { ok: true, message: `Compra realizada: -${bought.spent} moedas.` }
        : { ok: false, message: bought.reason === 'coins' ? 'Moedas insuficientes.' : bought.reason === 'inventory' ? INVENTORY_CONFIG.fullMessage : 'Produto esgotado.' };
    } else if (action === 'sell') {
      const sold = this.market.sell(arg, this.inventory, this.economy);
      result = sold.ok
        ? { ok: true, message: `Venda concluída: +${sold.coins} ${sold.coins === 1 ? 'moeda' : 'moedas'}.` }
        : { ok: false, message: sold.reason === 'inventory' ? INVENTORY_CONFIG.fullMessage : 'Item indisponível.' };
    }
    if (!wasFull && this.inventory.isFull) {
      result = { ...result, message: INVENTORY_CONFIG.fullMessage };
    }
    if (result.ok) {
      this.lastBuildingMessage = result.message;
      this.ui.showMessage(result.message);
      this.save();
    } else {
      this.lastBuildingMessage = result.message;
    }
    return result;
  }

  performContextAction() {
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
    this.player.heal(this.player.maxHealth);
    this.player.stamina = 100;
    this.effects.spawnHeal(this.player.x, this.player.y - 8);
    const endsAt = Date.now() + 30000;
    this.restState = { endsAt };
    this.restTimer = this.time.delayedCall(30000, () => {
      this.restState = null;
      this.restTimer = null;
      const state = this.dayNight.advanceGameMinutes(30);
      if (state.rolledOver) this.handleDayAdvance(state.dayCount);
      this.ui.showMessage('Descanso concluído: vida restaurada e 30 minutos de jogo passaram.');
      this.save();
    });
    return { ok: true, message: 'Descansando por 30 segundos reais...' };
  }

  sleepAtHouse() {
    if (!this.camp.isNear(this.player.x, this.player.y)) {
      return { ok: false, message: 'Entre no acampamento para dormir.' };
    }
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
    this.audio.playDawn();
    return { ok: true, message: `Você dormiu. Dia ${this.dayNight.dayCount} começou e o progresso foi salvo.` };
  }

  recoverAtCamp() {
    this.player.heal(this.player.maxHealth);
    this.player.stamina = 100;
    this.effects.spawnHeal(this.player.x, this.player.y - 8);
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
    return 'Descansou, recuperou a vida e salvou o jogo.';
  }

  restAtCamp() {
    if (!this.camp.isNear(this.player.x, this.player.y)) {
      this.ui.showMessage('Só é possível descansar junto à fogueira.');
      return;
    }
    const phase = this.dayNight.getState().phase;
    if (phase === 'night' || phase === 'dawn') {
      this.sleepAtCamp();
      return;
    }
    this.ui.showMessage(this.recoverAtCamp());
    this.save();
  }

  sleepAtCamp() {
    if (!this.camp.isNear(this.player.x, this.player.y)) {
      this.ui.showMessage('Só é possível dormir junto à fogueira ou à casa.');
      return;
    }
    const phase = this.dayNight.getState().phase;
    if (phase !== 'night' && phase !== 'dawn') {
      this.ui.showMessage('Você só pode pular a noite depois que ela começar.');
      return;
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
    this.audio.playDawn();
    this.ui.showMessage(`Você dormiu até amanhecer. Dia ${this.dayNight.dayCount} começou. ${recoveryMessage}`);
    this.save();
  }

  save() {
    if (!this.inventory || !this.player || !this.camp) return;
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
      time: {
        cycleTime: this.dayNight.cycleTime,
        dayCount: this.dayNight.dayCount
      },
      deathBackpacks: this.deathBackpacks.serialize(),
      harvestStructures: this.harvestStructures.serialize()
    });
  }
}
