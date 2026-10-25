import Phaser from 'phaser';
import { BUILDING_DEFS, DUNGEON_CONFIG } from '../data/buildings.js';
import { HARVEST_STRUCTURE_TYPES } from '../data/harvestStructures.js';
import { BOSS_CONFIG } from '../data/boss.js';
import { INVENTORY_CONFIG, RESOURCE_TYPES, WORLD } from './config.js';

const TEXT_STYLE = {
  fontFamily: 'Press Start 2P',
  color: '#fff1ce',
  fontSize: '8px'
};

export class GameUI {
  constructor(scene) {
    this.scene = scene;
    this.fixed = [];
    this.buildingMenuOpen = false;
    this.storeAllAvailable = false;
    this.messageTimer = null;
    this.worldAction = document.getElementById('world-action');
    this.storeAllAction = document.getElementById('store-all-action');
    this.bossHealth = document.getElementById('boss-health');
    this.bossHealthName = document.getElementById('boss-health-name');
    this.bossHealthValues = document.getElementById('boss-health-values');
    this.bossHealthFill = document.getElementById('boss-health-fill');
    this.lastBackpackFull = scene.inventory.isFull;
    this.metrics = this.getMetrics();
    this.worldAction.addEventListener('click', () => this.scene.performContextAction());
    this.storeAllAction.addEventListener('click', () => this.scene.storeAllAtCamp());
    this.ensureResourceIconTextures();
    this.ensureCoinIconTexture();
    this.makeHud();
  }

  // O menu do acampamento (tecla C) é a visão geral dentro do painel de prédios.
  get campOpen() {
    return this.scene.buildingMenu?.isOpen === true && this.scene.buildingMenu.building === 'camp';
  }

  getMetrics() {
    const { width, height } = this.scene.scale;
    const compact = width < 700 || height < 520;
    return {
      compact,
      hudWidth: compact ? 262 : 348,
      hudHeight: 260,
      // Centro do fundo do HUD: sempre colado à esquerda, junto dos textos (x = 22).
      // Antes, em telas baixas (celular deitado), o fundo ia para o meio e cobria o personagem.
      hudX: compact ? 140 : 183,
      mapSize: compact ? 156 : 168
    };
  }

  ensureResourceIconTextures() {
    const draw = {
      seeds: (context) => {
        context.fillStyle = '#6f9d3e'; context.fillRect(4, 7, 3, 5);
        context.fillStyle = '#d6d65b'; context.fillRect(9, 5, 3, 6);
        context.fillStyle = '#87b44e'; context.fillRect(5, 3, 2, 4);
      },
      iron: (context) => {
        context.fillStyle = '#4f5d64'; context.fillRect(3, 7, 10, 5);
        context.fillStyle = '#c1cbd0'; context.fillRect(4, 5, 8, 4);
        context.fillStyle = '#e1e5e2'; context.fillRect(5, 5, 4, 1);
      },
      coal: (context) => {
        context.fillStyle = '#202225'; context.fillRect(3, 5, 10, 7);
        context.fillStyle = '#45494d'; context.fillRect(5, 4, 6, 3);
        context.fillStyle = '#6a6e72'; context.fillRect(5, 6, 2, 1);
      },
      gold: (context) => {
        context.fillStyle = '#9c721d'; context.fillRect(3, 7, 10, 5);
        context.fillStyle = '#f0c747'; context.fillRect(4, 5, 8, 4);
        context.fillStyle = '#fff09a'; context.fillRect(5, 5, 3, 1);
      },
      potion: (context) => {
        context.fillStyle = '#a4a08b'; context.fillRect(7, 2, 3, 3);
        context.fillStyle = '#b13f57'; context.fillRect(5, 5, 7, 8);
        context.fillStyle = '#ff7b8f'; context.fillRect(6, 7, 2, 3);
      },
      torch: (context) => {
        context.fillStyle = '#8d4d27'; context.fillRect(7, 7, 3, 7);
        context.fillStyle = '#ff8b2b'; context.fillRect(6, 3, 5, 5);
        context.fillStyle = '#ffe06a'; context.fillRect(7, 4, 3, 3);
      },
      egg: (context) => {
        context.fillStyle = '#ead8b5'; context.fillRect(5, 3, 6, 9);
        context.fillRect(4, 5, 8, 5);
        context.fillStyle = '#fff3d3'; context.fillRect(6, 4, 3, 3);
      },
      wool: (context) => {
        context.fillStyle = '#f1eddf'; context.fillRect(3, 5, 10, 7);
        context.fillRect(5, 3, 6, 3);
        context.fillStyle = '#bdb9a8'; context.fillRect(4, 10, 8, 1);
      },
      milk: (context) => {
        context.fillStyle = '#d7e1e5'; context.fillRect(5, 4, 7, 9);
        context.fillStyle = '#f2f4e8'; context.fillRect(6, 6, 5, 6);
        context.fillStyle = '#9eb4c0'; context.fillRect(6, 2, 5, 2);
      },
      staminaPotion: (context) => {
        context.fillStyle = '#a4a08b'; context.fillRect(7, 2, 3, 3);
        context.fillStyle = '#3f8f5b'; context.fillRect(5, 5, 7, 8);
        context.fillStyle = '#9be08f'; context.fillRect(6, 7, 2, 3);
      },
      trap: (context) => {
        context.fillStyle = '#4b4f53'; context.fillRect(2, 9, 12, 3);
        context.fillStyle = '#c9ced1';
        for (let x = 3; x < 14; x += 3) context.fillRect(x, 5, 1, 4);
        context.fillStyle = '#8b2f2f'; context.fillRect(7, 10, 2, 1);
      },
      elixir: (context) => {
        context.fillStyle = '#d6c27a'; context.fillRect(7, 1, 2, 3);
        context.fillStyle = '#8b3fb1'; context.fillRect(5, 4, 6, 9);
        context.fillStyle = '#f0a6ff'; context.fillRect(6, 6, 2, 4);
      },
      titanCore: (context) => {
        context.fillStyle = '#3b201c'; context.fillRect(4, 4, 8, 8);
        context.fillStyle = '#9e4d38'; context.fillRect(5, 5, 6, 6);
        context.fillStyle = '#ffb06a'; context.fillRect(6, 5, 3, 2);
        context.fillStyle = '#ffe0a0'; context.fillRect(6, 6, 2, 2);
      }
    };
    for (const definition of Object.values(RESOURCE_TYPES)) {
      if (!definition.codeIcon) continue;
      const key = `resource-code-${definition.codeIcon}`;
      if (this.scene.textures.exists(key)) continue;
      const texture = this.scene.textures.createCanvas(key, 16, 16);
      const context = texture.getContext();
      context.imageSmoothingEnabled = false;
      context.clearRect(0, 0, 16, 16);
      draw[definition.codeIcon]?.(context);
      texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      texture.refresh();
    }
  }

  ensureCoinIconTexture() {
    if (this.scene.textures.exists('coin-hud-icon')) return;
    const texture = this.scene.textures.createCanvas('coin-hud-icon', 12, 12);
    const context = texture.getContext();
    context.imageSmoothingEnabled = false;
    context.clearRect(0, 0, 12, 12);
    context.fillStyle = '#8b641b';
    context.fillRect(2, 2, 8, 8);
    context.fillStyle = '#f0c743';
    context.fillRect(3, 2, 6, 8);
    context.fillRect(2, 3, 8, 6);
    context.fillStyle = '#fff09a';
    context.fillRect(4, 3, 3, 2);
    texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    texture.refresh();
  }

  text(x, y, content, style = {}) {
    const item = this.scene.add.text(x, y, content, { ...TEXT_STYLE, ...style })
      .setScrollFactor(0).setDepth(5000);
    this.fixed.push(item);
    return item;
  }

  makeHud() {
    const { width } = this.scene.scale;
    // Chuva em dias chuvosos (afeta a irrigação da Fazenda nível 6+): riscos em pixel por cima do mundo.
    this.rain = this.scene.add.graphics().setScrollFactor(0).setDepth(4990);
    this.rainDrops = Array.from({ length: 90 }, () => ({
      x: Math.random() * 1600,
      y: Math.random() * 1000,
      speed: 7 + Math.random() * 5,
      length: 6 + Math.floor(Math.random() * 6)
    }));
    this.fixed.push(this.rain);
    this.hudBg = this.scene.add.nineslice(
      this.metrics.hudX,
      130,
      'panel',
      'panel',
      this.metrics.hudWidth,
      this.metrics.hudHeight,
      6,
      6,
      6,
      6
    ).setScrollFactor(0).setDepth(4999);
    this.fixed.push(this.hudBg);
    this.healthLabel = this.text(22, 18, '', { fontSize: '8px' });
    this.healthBar = this.scene.add.rectangle(22, 40, 216, 13, 0x42513c)
      .setOrigin(0).setScrollFactor(0).setDepth(5000);
    this.healthTrail = this.scene.add.rectangle(24, 42, 212, 9, 0xf0b36f)
      .setOrigin(0).setScrollFactor(0).setDepth(5000.5);
    this.healthFill = this.scene.add.rectangle(24, 42, 212, 9, 0xd96858)
      .setOrigin(0).setScrollFactor(0).setDepth(5001);
    this.healthShine = this.scene.add.rectangle(24, 42, 212, 2, 0xffe0b4)
      .setOrigin(0).setScrollFactor(0).setDepth(5002).setAlpha(0.35);
    this.staminaBar = this.scene.add.rectangle(22, 66, 216, 8, 0x42513c)
      .setOrigin(0).setScrollFactor(0).setDepth(5000);
    this.staminaFill = this.scene.add.rectangle(24, 68, 216, 4, 0xe6c66b)
      .setOrigin(0).setScrollFactor(0).setDepth(5001);
    this.xpLabel = this.text(22, 78, '', { fontSize: '8px', color: '#d8c6ff' });
    this.xpBar = this.scene.add.rectangle(22, 55, 216, 5, 0x3b2b50)
      .setOrigin(0).setScrollFactor(0).setDepth(5000);
    this.xpFill = this.scene.add.rectangle(24, 56, 212, 3, 0xa77bdc)
      .setOrigin(0).setScrollFactor(0).setDepth(5001);
    this.fixed.push(
      this.healthBar,
      this.healthTrail,
      this.healthFill,
      this.healthShine,
      this.staminaBar,
      this.staminaFill,
      this.xpBar,
      this.xpFill
    );
    this.inventoryLabel = this.text(22, 100, '', { fontSize: '8px' });
    this.backpackSlots = [];
    this.resourceCounts = [];
    for (let index = 0; index < INVENTORY_CONFIG.maxSlots; index += 1) {
      const background = this.scene.add.rectangle(22, 113, 50, 24, 0x17251f, 0.92)
        .setOrigin(0)
        .setStrokeStyle(1, 0x526447)
        .setScrollFactor(0)
        .setDepth(5000.2);
      const icon = this.scene.add.image(35, 125, 'resource-icons', 0)
        .setDisplaySize(16, 16)
        .setScrollFactor(0)
        .setDepth(5001)
        .setVisible(false);
      const count = this.text(49, 121, '', { fontSize: '8px' });
      count.setOrigin(0).setDepth(5002);
      const slot = { background, icon, count, type: null };
      this.backpackSlots.push(slot);
      this.resourceCounts.push({ type: null, label: count });
      this.fixed.push(background, icon);
    }
    this.dayLabel = this.text(22, 181, '', { fontSize: '8px' });
    this.coinIcon = this.scene.add.image(26, 240, 'coin-hud-icon')
      .setDisplaySize(12, 12)
      .setScrollFactor(0)
      .setDepth(5001);
    this.coinLabel = this.text(42, 236, '', { fontSize: '8px', color: '#ffe987' });
    this.statusLabel = this.text(22, 252, '', { fontSize: '8px', color: '#9fe0ff' });
    // Ferro e carvão ficam sempre visíveis (mochila + armazém), com ícones próprios.
    this.oreCounters = ['iron', 'coal'].map((type, index) => {
      const x = 152 + index * 56;
      const icon = this.scene.add.image(x, 240, `resource-code-${type}`)
        .setDisplaySize(14, 14)
        .setScrollFactor(0)
        .setDepth(5001);
      this.fixed.push(icon);
      const label = this.text(x + 10, 236, '', { fontSize: '8px', color: type === 'iron' ? '#d7e0e4' : '#a9adb1' });
      return { type, icon, label };
    });
    this.fixed.push(this.coinIcon);
    this.layoutBackpackSlots();
    this.hint = this.text(22, this.scene.scale.height - 34, '', {
      fontSize: '8px', backgroundColor: '#1d2b24dd', padding: { x: 8, y: 5 }
    }).setScrollFactor(0);
    this.hint.setDepth(5000);
    this.layoutHint();

    this.mapX = width - this.metrics.mapSize / 2 - 12;
    this.mapY = 91;
    this.mapBg = this.scene.add.nineslice(
      this.mapX,
      this.mapY,
      'panel',
      'panel',
      this.metrics.mapSize,
      this.metrics.mapSize,
      6,
      6,
      6,
      6
    ).setScrollFactor(0).setDepth(4999);
    this.mapLabel = this.text(this.mapX, 10, 'MAPA • M', {
      fontSize: '8px', fontStyle: 'bold', color: '#ecd99f'
    }).setOrigin(0.5);
    this.mapBase = this.scene.add.rectangle(this.mapX, this.mapY, 120, 120, 0x2d493a, 0.95)
      .setStrokeStyle(2, 0x5f7046)
      .setScrollFactor(0)
      .setDepth(5000);
    this.mapExplored = this.scene.add.graphics().setScrollFactor(0).setDepth(5000.5);
    this.mapCampMarker = this.scene.add.rectangle(this.mapX, this.mapY, 10, 10, 0xe1a65f)
      .setStrokeStyle(1, 0x30261f)
      .setScrollFactor(0)
      .setDepth(5001);
    this.mapMarkers = this.scene.add.graphics().setScrollFactor(0).setDepth(5001.5);
    this.mapPlayerMarker = this.scene.add.rectangle(this.mapX, this.mapY, 6, 6, 0xffd75a)
      .setStrokeStyle(1, 0x30261f)
      .setScrollFactor(0)
      .setDepth(5002);
    this.lastExploredCount = -1;
    this.drawMapBase();
    this.fixed.push(
      this.mapBg,
      this.mapLabel,
      this.mapBase,
      this.mapExplored,
      this.mapCampMarker,
      this.mapMarkers,
      this.mapPlayerMarker
    );

    this.message = this.text(width / 2, 120, '', {
      fontSize: '8px', fontStyle: 'bold', align: 'center', backgroundColor: '#26392ddd',
      padding: { x: 12, y: 7 }, wordWrap: { width: Math.min(520, width - 32) }
    }).setOrigin(0.5).setAlpha(0);
    this.message.setDepth(5100);

    this.warning = this.text(width / 2, 178, '', {
      fontSize: '8px', fontStyle: 'bold', align: 'center', color: '#ffe0a0',
      backgroundColor: '#4b2c27ee', padding: { x: 12, y: 8 }
    }).setOrigin(0.5).setVisible(false);
    this.warning.setDepth(5150);
  }

  layoutBackpackSlots() {
    const compact = this.metrics.compact;
    const columns = compact ? 3 : 4;
    const spacing = compact ? 54 : 64;
    const rowSpacing = compact ? 24 : 28;
    const slotWidth = compact ? 48 : 50;
    this.backpackSlots.forEach((slot, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const x = 22 + column * spacing;
      const y = 113 + row * rowSpacing;
      slot.background.setSize(slotWidth, 22).setPosition(x, y);
      slot.icon.setPosition(x + 13, y + 11);
      slot.count.setPosition(x + 26, y + 7);
    });
    this.dayLabel.setPosition(22, compact ? 215 : 199);
  }

  layoutHint() {
    const { width, height } = this.scene.scale;
    if (this.scene.touch?.enabled) this.hint.setOrigin(0.5, 0).setPosition(width / 2, height - 96);
    // No centro, entre o botão Guardar Tudo (esquerda) e o botão de ação (direita).
    else this.hint.setOrigin(0.5, 0).setPosition(width / 2, height - 44);
  }

  drawMapBase() {
    this.mapBase.setPosition(this.mapX, this.mapY).setSize(120, 120);
    this.mapCampMarker.setPosition(this.mapX, this.mapY);
    this.mapExplored.clear();
    this.lastExploredCount = -1;
  }

  resize() {
    const { width } = this.scene.scale;
    this.metrics = this.getMetrics();
    this.layoutBackpackSlots();
    this.hudBg.setSize(this.metrics.hudWidth, this.metrics.hudHeight)
      .setPosition(this.metrics.hudX, 130);
    this.mapX = width - this.metrics.mapSize / 2 - 12;
    this.mapBg.setSize(this.metrics.mapSize, this.metrics.mapSize).setPosition(this.mapX, 91);
    this.mapLabel.setPosition(this.mapX, 10);
    this.drawMapBase();
    this.layoutHint();
    this.message.setPosition(width / 2, 120);
    this.message.setWordWrapWidth(Math.min(520, width - 32));
    this.warning.setPosition(width / 2, 178);
  }

  update(player, inventory, progression, economy, camp, time, nearestResource, nearestStructure, nearestBackpack, nearestEnemy, isNearCamp, enemies, world, storeAllAvailable = false) {
    this.healthLabel.setText(`VIDA  ${Math.ceil(player.health)} / ${player.maxHealth}    DEF ${player.defense}`);
    const healthWidth = Math.max(0, Math.round((212 * (player.health / player.maxHealth)) / 4) * 4);
    const staminaWidth = Math.max(0, Math.round((212 * (player.stamina / 100)) / 4) * 4);
    this.healthFill.setDisplaySize(healthWidth, 9);
    this.healthTrail.setDisplaySize(healthWidth, 9);
    this.healthShine.setDisplaySize(healthWidth, 2);
    this.staminaFill.setDisplaySize(staminaWidth, 4);
    this.xpLabel.setText(progression.level >= 20
      ? `NÍVEL ${progression.level} • XP MÁXIMO`
      : `NÍVEL ${progression.level} • XP ${progression.xp}/${progression.xpToNext}`);
    this.xpFill.setDisplaySize(Math.max(0, Math.round(212 * progression.xpRatio)), 3);
    this.coinLabel.setText(`${economy.coins} MOEDAS`);
    for (const counter of this.oreCounters) {
      counter.label.setText(String((inventory.items[counter.type] ?? 0) + (camp?.storage?.[counter.type] ?? 0)));
    }
    this.inventoryLabel.setText(`MOCHILA ${inventory.usedSlots}/${inventory.maxSlots}  •  ${inventory.total}/${inventory.totalCapacity}`);
    const occupied = Object.entries(inventory.items)
      .filter(([, amount]) => amount > 0)
      .slice(0, inventory.maxSlots);
    this.backpackSlots.forEach((slot, index) => {
      const type = occupied[index]?.[0] ?? null;
      if (slot.type !== type) {
        slot.type = type;
        if (type) {
          const definition = RESOURCE_TYPES[type];
          const texture = definition.codeIcon ? `resource-code-${definition.codeIcon}` : 'resource-icons';
          const frame = definition.codeIcon ? '__BASE' : definition.icon;
          slot.icon.setTexture(texture, frame).setVisible(true);
        } else {
          slot.icon.setVisible(false);
        }
      }
      slot.count.setText(type ? String(inventory.items[type]) : '');
      this.resourceCounts[index].type = type;
    });
    if (inventory.isFull && !this.lastBackpackFull) {
      this.showMessage(INVENTORY_CONFIG.fullMessage);
    }
    this.lastBackpackFull = inventory.isFull;
    this.dayLabel.setText(`DIA ${time.dayCount ?? 1}  •  ${time.isNight ? 'NOITE' : 'DIA'}  •  ${time.label}   |   ATQ ${player.attack}`);

    this.warning.setVisible(Boolean(time.warningActive));
    if (time.warningActive) {
      this.warning.setText(`A NOITE CHEGA EM ${time.secondsUntilNight ?? 0}s  •  F no acampamento para dormir`);
    }

    let hint = 'WASD mover   •   M mapa   •   Clique / J atacar   •   Espaço esquivar   •   Q especial';
    if (nearestStructure) {
      const definition = HARVEST_STRUCTURE_TYPES[nearestStructure.type];
      hint = `E  •  ${definition.requiresPickaxe ? 'Minerar' : 'Coletar'} ${definition.label}`;
    } else if (nearestResource) hint = `E  •  ${nearestResource.type === 'stone' ? 'Minerar' : 'Coletar'} ${RESOURCE_TYPES[nearestResource.type].label}`;
    else if (nearestBackpack) hint = 'E  •  Recuperar mochila de morte';
    else if (isNearCamp) {
      hint = time.isNight
        ? 'C  •  Abrir acampamento   |   F  •  Dormir / pular a noite   |   M  •  Mapa'
        : 'C  •  Abrir acampamento   |   F  •  Descansar / salvar   |   M  •  Mapa';
    } else if (nearestEnemy) hint = 'J ou clique  •  Atacar   |   Q  •  Golpe especial';
    if (this.scene.touch?.enabled) {
      // No celular o botão de ação já mostra o que fazer; a dica só aparece no acampamento.
      hint = isNearCamp && !nearestStructure && !nearestResource && !nearestBackpack
        ? 'Toque num prédio para abrir  •  ACAMP. para a visão geral'
        : '';
    }
    this.hint.setText(hint).setVisible(hint !== '');
    this.worldAction.hidden = this.buildingMenuOpen;
    this.storeAllAvailable = storeAllAvailable;
    this.storeAllAction.hidden = !storeAllAvailable || this.buildingMenuOpen;
    this.storeAllAction.disabled = inventory.total === 0;
    this.storeAllAction.textContent = inventory.total > 0 ? 'GUARDAR TUDO' : 'MOCHILA VAZIA';
    this.worldAction.textContent = nearestStructure
      ? `${HARVEST_STRUCTURE_TYPES[nearestStructure.type].requiresPickaxe ? 'MINERAR' : 'COLETAR'} ${HARVEST_STRUCTURE_TYPES[nearestStructure.type].label.toUpperCase()}`
      : nearestResource
        ? `${nearestResource.type === 'stone' ? 'MINERAR' : 'COLETAR'} ${RESOURCE_TYPES[nearestResource.type].label.toUpperCase()}`
        : nearestBackpack
          ? 'RECUPERAR MOCHILA'
          : 'ATACAR';

    this.statusLabel.setText(this.statusText(time));
    this.updateRain();
    this.updateMinimap(player, world);
    this.updateMinimapMarkers(camp, enemies);
  }

  updateRain() {
    this.rain.clear();
    if (!this.scene.isRaining || this.buildingMenuOpen) return;
    const { width, height } = this.scene.scale;
    this.rain.lineStyle(1, 0xa9d4ff, 0.45);
    for (const drop of this.rainDrops) {
      drop.y += drop.speed;
      drop.x -= drop.speed * 0.25;
      if (drop.y > height) {
        drop.y = -drop.length;
        drop.x = Math.random() * (width + 80);
      }
      if (drop.x < -10) drop.x = width + Math.random() * 40;
      this.rain.lineBetween(drop.x, drop.y, drop.x - drop.length * 0.25, drop.y + drop.length);
    }
  }

  statusText(time) {
    const parts = [];
    const raid = this.scene.raid;
    if (raid?.statusText) parts.push(raid.statusText);
    if (this.scene.isRaining) parts.push('CHUVA');
    for (const buff of this.scene.buffs?.list() ?? []) parts.push(buff.name.toUpperCase());
    return parts.join(' • ');
  }

  /** Mina (sempre), masmorra (quando revelada) e radar da Torre de Vigia (nível 4+). */
  updateMinimapMarkers(camp, enemies = []) {
    const mapLeft = this.mapX - 60;
    const mapTop = this.mapY - 60;
    const toX = (x) => mapLeft + (x / WORLD.width) * 120;
    const toY = (y) => mapTop + (y / WORLD.height) * 120;
    const graphics = this.mapMarkers;
    graphics.clear();
    const mine = this.scene.harvestStructures?.state?.byType('mineMarker')?.[0];
    if (mine) {
      graphics.fillStyle(0x1b1b1f, 1).fillRect(toX(mine.x) - 4, toY(mine.y) - 4, 8, 8);
      graphics.fillStyle(0xc1cbd0, 1).fillRect(toX(mine.x) - 2, toY(mine.y) - 2, 4, 4);
    }
    if (camp?.dungeonRevealed || camp?.defense?.dragonRadar) {
      const dungeon = DUNGEON_CONFIG;
      graphics.fillStyle(0xe2463f, 1).fillTriangle(
        toX(dungeon.x), toY(dungeon.y) - 5,
        toX(dungeon.x) + 5, toY(dungeon.y) + 4,
        toX(dungeon.x) - 5, toY(dungeon.y) + 4
      );
    }
    if (camp?.defense?.radarActive) {
      graphics.fillStyle(0xff5d4f, 1);
      for (const enemy of enemies) {
        if (!enemy.active) continue;
        const distance = Phaser.Math.Distance.Between(enemy.x, enemy.y, camp.x, camp.y);
        if (distance > BUILDING_DEFS.tower.radarRange) continue;
        graphics.fillRect(Math.round(toX(enemy.x)) - 1, Math.round(toY(enemy.y)) - 1, 2, 2);
      }
    }
  }

  updateMinimap(player, world) {
    const mapLeft = this.mapX - 60;
    const mapTop = this.mapY - 60;
    const mapSize = 120;
    const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
    const playerX = mapLeft + (player.x / WORLD.width) * mapSize;
    const playerY = mapTop + (player.y / WORLD.height) * mapSize;
    const campX = mapLeft + (WORLD.camp.x / WORLD.width) * mapSize;
    const campY = mapTop + (WORLD.camp.y / WORLD.height) * mapSize;

    this.mapCampMarker.setPosition(campX, campY).setVisible(true);
    this.mapPlayerMarker.setPosition(
      clamp(playerX, mapLeft + 3, mapLeft + mapSize - 3),
      clamp(playerY, mapTop + 3, mapTop + mapSize - 3)
    ).setVisible(true);

    if (!world) return;
    const revealedCells = world.getRevealedCells();
    if (revealedCells.length === this.lastExploredCount) return;
    this.lastExploredCount = revealedCells.length;

    this.mapExplored.clear();
    this.mapExplored.fillStyle(0x52774d, 0.78);
    const fogSize = WORLD.tileSize * 2;
    const columns = Math.ceil(WORLD.width / fogSize);
    const rows = Math.ceil(WORLD.height / fogSize);
    const cellWidth = mapSize / columns;
    const cellHeight = mapSize / rows;
    for (const cell of revealedCells) {
      const x = mapLeft + cell.column * cellWidth;
      const y = mapTop + cell.row * cellHeight;
      if (x < mapLeft || y < mapTop || x >= mapLeft + mapSize || y >= mapTop + mapSize) continue;
      this.mapExplored.fillRect(
        Math.floor(x),
        Math.floor(y),
        Math.max(1, Math.ceil(cellWidth)),
        Math.max(1, Math.ceil(cellHeight))
      );
    }
  }

  updateBossHealth(boss, player) {
    const visible = Boolean(boss && !boss.dead && player &&
      Phaser.Math.Distance.Between(boss.x, boss.y, player.x, player.y) <= BOSS_CONFIG.healthBarRange);
    this.bossHealth.hidden = !visible;
    if (!visible) return;
    this.bossHealthName.textContent = boss.name.toUpperCase();
    this.bossHealthValues.textContent = `${boss.health} / ${boss.maxHealth}`;
    this.bossHealthFill.style.width = `${Math.max(0, Math.min(100, (boss.health / boss.maxHealth) * 100))}%`;
  }

  showMessage(text) {
    if (this.messageTimer) this.messageTimer.remove(false);
    this.message.setText(text).setAlpha(1);
    this.message.setPosition(this.scene.scale.width / 2, 120);
    this.message.setDepth(5100);
    this.messageTimer = this.scene.time.delayedCall(1900, () => {
      this.scene.tweens.add({ targets: this.message, alpha: 0, duration: 300 });
    });
  }
}
