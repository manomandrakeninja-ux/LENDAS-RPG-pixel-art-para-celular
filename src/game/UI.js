import Phaser from 'phaser';
import { BUILDING_DEFS, DUNGEON_CONFIG } from '../data/buildings.js';
import { HARVEST_STRUCTURE_TYPES } from '../data/harvestStructures.js';
import { BOSS_CONFIG } from '../data/boss.js';
import { INVENTORY_CONFIG, RESOURCE_TYPES, WORLD } from './config.js';
import { drawIcon } from '../art/icons.js';
import { HOTKEY_ITEMS } from '../data/consumables.js';

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
      hudWidth: compact ? 262 : 300,
      hudHeight: 150,
      // Centro do fundo do HUD: sempre colado à esquerda, junto dos textos (x = 22).
      // Antes, em telas baixas (celular deitado), o fundo ia para o meio e cobria o personagem.
      hudX: compact ? 140 : 159,
      mapSize: compact ? 156 : 168
    };
  }

  /** Cria uma textura a partir de um ícone de src/art/icons.js. */
  iconTexture(key, name) {
    if (this.scene.textures.exists(key)) return;
    const pixels = drawIcon(name);
    const texture = this.scene.textures.createCanvas(key, pixels.width, pixels.height);
    texture.getContext().putImageData(new ImageData(pixels.data, pixels.width, pixels.height), 0, 0);
    texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    texture.refresh();
  }

  ensureResourceIconTextures() {
    for (const definition of Object.values(RESOURCE_TYPES)) {
      if (definition.codeIcon) this.iconTexture(`resource-code-${definition.codeIcon}`, definition.codeIcon);
    }
    this.iconTexture('hud-backpack', 'backpack');
    this.iconTexture('hud-journal', 'journal');
    for (const seal of ['sealEarth', 'sealWater', 'sealWind', 'sealLight', 'sealFire']) this.iconTexture(`resource-code-${seal}`, seal);
  }

  ensureCoinIconTexture() {
    this.iconTexture('coin-hud-icon', 'coin');
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
      12 + this.metrics.hudHeight / 2,
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
    this.makeQuickBar();
    this.dayLabel = this.text(22, 98, '', { fontSize: '8px' });
    this.coinIcon = this.scene.add.image(28, 124, 'coin-hud-icon')
      .setDisplaySize(16, 16)
      .setScrollFactor(0)
      .setDepth(5001);
    this.coinLabel = this.text(42, 120, '', { fontSize: '8px', color: '#ffe987' });
    this.statusLabel = this.text(22, 140, '', { fontSize: '8px', color: '#9fe0ff' });
    // Ferro e carvão ficam sempre visíveis (mochila + armazém), com ícones próprios.
    this.oreCounters = ['iron', 'coal'].map((type, index) => {
      const x = 160 + index * 56;
      const icon = this.scene.add.image(x, 124, `resource-code-${type}`)
        .setDisplaySize(16, 16)
        .setScrollFactor(0)
        .setDepth(5001);
      this.fixed.push(icon);
      const label = this.text(x + 12, 120, '', { fontSize: '8px', color: type === 'iron' ? '#d7e0e4' : '#a9adb1' });
      return { type, icon, label };
    });
    this.fixed.push(this.coinIcon);
    this.layoutQuickBar();
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

  /**
   * Barra rápida abaixo do painel: botão da Mochila (abre o painel com todos os
   * itens), Comer (tecla 2) e Poção de vida (tecla 1).
   */
  makeQuickBar() {
    const make = (id, texture, frame, size, iconScale, key, label) => {
      const frameBg = this.scene.add.nineslice(0, 0, 'panel', 'panel', size, size, 6, 6, 6, 6)
        .setOrigin(0).setScrollFactor(0).setDepth(5000);
      const icon = this.scene.add.image(0, 0, texture, frame)
        .setScale(iconScale).setScrollFactor(0).setDepth(5001);
      const count = this.text(0, 0, '', { fontSize: '8px', color: '#fff1ce', stroke: '#140f14', strokeThickness: 3 })
        .setOrigin(1, 1).setDepth(5002);
      const keyLabel = this.text(0, 0, key, { fontSize: '8px', color: '#f4d88f', stroke: '#140f14', strokeThickness: 3 })
        .setOrigin(0, 0).setDepth(5002);
      const caption = this.text(0, 0, label, { fontSize: '8px', color: '#e9dcb8', stroke: '#140f14', strokeThickness: 3 })
        .setOrigin(0.5, 0).setDepth(5002);
      this.fixed.push(frameBg, icon);
      return { id, frameBg, icon, count, keyLabel, caption, size, x: 0, y: 0 };
    };
    this.quickButtons = [
      make('backpack', 'hud-backpack', undefined, 60, 2, 'B', 'MOCHILA'),
      make('eat', 'resource-icons', RESOURCE_TYPES.food.icon, 48, 2, '2', 'COMER'),
      make('potion', 'resource-code-potion', undefined, 48, 2, '1', 'POÇÃO'),
      make('journal', 'hud-journal', undefined, 56, 2, 'L', 'DIÁRIO')
    ];
  }

  layoutQuickBar() {
    const top = 12 + this.metrics.hudHeight + 10;
    const compact = this.metrics.compact;
    // Em telas pequenas os botões encolhem para não encostar no minimapa.
    const sizes = compact
      ? { backpack: 52, eat: 40, potion: 40, journal: 40 }
      : { backpack: 60, eat: 48, potion: 48, journal: 56 };
    const iconScales = compact ? { backpack: 2, eat: 2, potion: 2, journal: 1.5 } : { backpack: 2, eat: 2, potion: 2, journal: 2 };
    const gap = compact ? 8 : 14;
    let x = 14;
    for (const button of this.quickButtons) {
      button.size = sizes[button.id];
      button.frameBg.setSize(button.size, button.size);
      button.icon.setScale(iconScales[button.id]);
      button.caption.setVisible(!compact);
      const y = top + (60 - button.size) / 2;
      button.x = x;
      button.y = y;
      button.frameBg.setPosition(x, y);
      button.icon.setPosition(x + button.size / 2, y + button.size / 2);
      button.count.setPosition(x + button.size - 4, y + button.size - 3);
      button.keyLabel.setPosition(x + 5, y + 5);
      button.caption.setPosition(x + button.size / 2, top + 64);
      x += button.size + gap;
    }
  }

  /** Botão da barra rápida na posição de tela (x, y), ou null. */
  quickButtonAt(x, y) {
    return this.quickButtons.find((button) =>
      x >= button.x && x <= button.x + button.size && y >= button.y && y <= button.y + button.size)?.id ?? null;
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
    this.hudBg.setSize(this.metrics.hudWidth, this.metrics.hudHeight)
      .setPosition(this.metrics.hudX, 12 + this.metrics.hudHeight / 2);
    this.layoutQuickBar();
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
    const edible = HOTKEY_ITEMS[2].reduce((sum, type) => sum + (inventory.items[type] ?? 0), 0);
    const potions = inventory.items.potion ?? 0;
    for (const button of this.quickButtons) {
      if (button.id === 'journal') {
        const campaign = this.scene.campaign?.state;
        button.count.setText(campaign ? `${campaign.completedCount}` : '');
      } else if (button.id === 'backpack') {
        button.count.setText(`${inventory.usedSlots}/${inventory.maxSlots}`)
          .setColor(inventory.isFull ? '#ff9f8a' : '#fff1ce');
      } else {
        const amount = button.id === 'eat' ? edible : potions;
        button.count.setText(String(amount));
        button.icon.setAlpha(amount > 0 ? 1 : 0.35);
      }
    }
    this.scene.backpackPanel?.refresh();
    if (inventory.isFull && !this.lastBackpackFull) {
      this.showMessage(INVENTORY_CONFIG.fullMessage);
    }
    this.lastBackpackFull = inventory.isFull;
    this.dayLabel.setText(`DIA ${time.dayCount ?? 1} • ${time.isNight ? 'NOITE' : 'DIA'} • ${time.label} • ATQ ${player.attack}`);

    this.warning.setVisible(Boolean(time.warningActive));
    if (time.warningActive) {
      this.warning.setText(`A NOITE CHEGA EM ${time.secondsUntilNight ?? 0}s  •  F no acampamento para dormir`);
    }

    const questTarget = this.scene.campaign?.nearestInteraction() ?? null;
    let hint = 'WASD mover   •   M mapa   •   Clique / J atacar   •   Espaço esquivar   •   Q especial';
    if (questTarget) {
      hint = `E  •  ${questTarget.label}`;
    } else if (nearestStructure) {
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
      hint = questTarget
        ? questTarget.label
        : isNearCamp && !nearestStructure && !nearestResource && !nearestBackpack
          ? 'Toque num prédio para abrir  •  ACAMP. para a visão geral'
          : '';
    }
    this.hint.setText(hint).setVisible(hint !== '');
    this.worldAction.hidden = this.buildingMenuOpen;
    this.storeAllAvailable = storeAllAvailable;
    this.storeAllAction.hidden = !storeAllAvailable || this.buildingMenuOpen;
    this.storeAllAction.disabled = inventory.total === 0;
    this.storeAllAction.textContent = inventory.total > 0 ? 'GUARDAR TUDO' : 'MOCHILA VAZIA';
    this.worldAction.textContent = questTarget
      ? questTarget.label.split(' ')[0].toUpperCase()
      : nearestStructure
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
    for (const point of this.scene.campaign?.mapPoints() ?? []) {
      graphics.fillStyle(point.tracked ? 0xffd76b : 0xc59cff, 1);
      const px = Math.round(toX(point.x));
      const py = Math.round(toY(point.y));
      graphics.fillTriangle(px, py - 4, px + 4, py, px, py + 4);
      graphics.fillTriangle(px, py - 4, px - 4, py, px, py + 4);
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
