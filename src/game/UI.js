import Phaser from 'phaser';
import { BUILDING_DEFS, DUNGEON_CONFIG } from '../data/buildings.js';
import { HARVEST_STRUCTURE_TYPES } from '../data/harvestStructures.js';
import { BOSS_CONFIG } from '../data/boss.js';
import { INVENTORY_CONFIG, RESOURCE_TYPES, WORLD } from './config.js';
import { drawIcon } from '../art/icons.js';
import { MAP_SCALE, MapRenderer } from './MapRenderer.js';
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
    // Apertar faz a ação; manter apertado continua minerando. O click só vale para teclado.
    let lastPointerAction = -Infinity;
    this.worldAction.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      lastPointerAction = performance.now();
      this.scene.actionHeld = true;
      // Com controles de toque ligados, o TouchControls já faz a ação no pointerdown.
      if (!this.scene.touch?.enabled) this.scene.performContextAction();
    });
    const release = () => { this.scene.actionHeld = false; };
    for (const type of ['pointerup', 'pointercancel']) window.addEventListener(type, release);
    this.worldAction.addEventListener('pointerleave', release);
    this.worldAction.addEventListener('click', (event) => {
      // O toque/clique já agiu no pointerdown; aqui só vale teclado (Enter/Espaço no botão).
      if (performance.now() - lastPointerAction > 800) this.scene.performContextAction();
    });
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
    // Celular: painel enxuto (só vida, XP, vigor e moedas), minimapa menor e sem dicas de teclado.
    const phone = Boolean(this.scene.touch?.enabled) && (height < 560 || width < 560);
    if (phone) {
      return { compact: true, phone, hudWidth: 196, hudHeight: 62, hudX: 107, mapSize: 112, barWidth: 168 };
    }
    return {
      compact,
      phone: false,
      barWidth: 212,
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
    this.mapRenderer = new MapRenderer(this.scene);
    this.minimapSize = this.metrics.mapSize - 20;
    if (this.scene.textures.exists('minimap-view')) this.scene.textures.remove('minimap-view');
    this.minimapTexture = this.scene.textures.createCanvas('minimap-view', 176, 176);
    this.minimapImage = this.scene.add.image(this.mapX, this.mapY, 'minimap-view')
      .setScrollFactor(0)
      .setDepth(5000);
    this.minimapTimer = 0;
    this.minimapStats = { rendered: false, kinds: [] };
    this.drawMapBase();
    this.fixed.push(this.mapBg, this.mapLabel, this.minimapImage);

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
    const top = 12 + this.metrics.hudHeight + (this.metrics.phone ? 4 : 10);
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

  /** Posiciona os textos e barras do painel de status (computador ou celular). */
  layoutHud() {
    const phone = this.metrics.phone;
    const left = phone ? 20 : 22;
    const bar = this.metrics.barWidth;
    const rows = phone
      ? { label: 18, health: 32, xp: 48, stamina: 56 }
      : { label: 18, health: 40, xp: 55, stamina: 66 };
    this.healthLabel.setPosition(left, rows.label);
    this.healthBar.setPosition(left, rows.health).setSize(bar + 4, 13);
    for (const item of [this.healthTrail, this.healthFill, this.healthShine]) item.setPosition(left + 2, rows.health + 2);
    this.xpBar.setPosition(left, rows.xp).setSize(bar + 4, 5);
    this.xpFill.setPosition(left + 2, rows.xp + 1);
    this.staminaBar.setPosition(left, rows.stamina).setSize(bar + 4, 8);
    this.staminaFill.setPosition(left + 2, rows.stamina + 2);
    // No celular as moedas ficam na linha da vida; dia, status, XP em texto e minérios somem.
    if (phone) {
      this.coinIcon.setPosition(150, 22);
      this.coinLabel.setPosition(160, 18);
    } else {
      this.coinIcon.setPosition(28, 124);
      this.coinLabel.setPosition(42, 120);
    }
    for (const item of [this.xpLabel, this.dayLabel, this.statusLabel, this.mapLabel]) item?.setVisible(!phone);
    for (const counter of this.oreCounters ?? []) {
      counter.icon.setVisible(!phone);
      counter.label.setVisible(!phone);
    }
  }

  /** O ponto (x, y) da tela está sobre o minimapa? */
  minimapAt(x, y) {
    const half = this.metrics.mapSize / 2;
    return Math.abs(x - this.mapX) <= half && Math.abs(y - this.mapY) <= half;
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

  /** Ajusta o recorte do minimapa ao tamanho atual da moldura. */
  drawMapBase() {
    this.minimapSize = this.metrics.mapSize - 20;
    this.minimapImage.setPosition(this.mapX, this.mapY);
    this.minimapImage.setCrop(0, 0, this.minimapSize, this.minimapSize);
    this.minimapImage.setDisplayOrigin(this.minimapSize / 2, this.minimapSize / 2);
    this.minimapTimer = 0;
  }

  resize() {
    const { width } = this.scene.scale;
    this.metrics = this.getMetrics();
    this.hudBg.setSize(this.metrics.hudWidth, this.metrics.hudHeight)
      .setPosition(this.metrics.hudX, 12 + this.metrics.hudHeight / 2);
    this.layoutHud();
    this.layoutQuickBar();
    this.mapX = width - this.metrics.mapSize / 2 - 12;
    this.mapY = this.metrics.phone ? 10 + this.metrics.mapSize / 2 : 91;
    this.mapBg.setSize(this.metrics.mapSize, this.metrics.mapSize).setPosition(this.mapX, this.mapY);
    const quick = this.quickButtons.reduce((bottom, button) => Math.max(bottom, button.y + button.size), 0);
    const rootStyle = document.documentElement.style;
    rootStyle.setProperty('--minimap-bottom', `${Math.round(this.mapY + this.metrics.mapSize / 2 + 8)}px`);
    rootStyle.setProperty('--minimap-width', `${Math.round(this.metrics.mapSize + 12)}px`);
    rootStyle.setProperty('--quickbar-bottom', `${Math.round(quick + (this.metrics.compact ? 8 : 26))}px`);
    document.body.classList.toggle('is-phone', this.metrics.phone);
    this.mapLabel.setPosition(this.mapX, 10);
    this.drawMapBase();
    this.layoutHint();
    this.message.setPosition(width / 2, 120);
    this.message.setWordWrapWidth(Math.min(520, width - 32));
    this.warning.setPosition(width / 2, 178);
  }

  update(player, inventory, progression, economy, camp, time, nearestResource, nearestStructure, nearestBackpack, nearestEnemy, isNearCamp, enemies, world, storeAllAvailable = false) {
    const phone = this.metrics.phone;
    const barWidth = this.metrics.barWidth;
    this.healthLabel.setText(phone
      ? `VIDA ${Math.ceil(player.health)}/${player.maxHealth}`
      : `VIDA  ${Math.ceil(player.health)} / ${player.maxHealth}    DEF ${player.defense}`);
    const healthWidth = Math.max(0, Math.round((barWidth * (player.health / player.maxHealth)) / 4) * 4);
    const staminaWidth = Math.max(0, Math.round((barWidth * (player.stamina / 100)) / 4) * 4);
    this.healthFill.setDisplaySize(healthWidth, 9);
    this.healthTrail.setDisplaySize(healthWidth, 9);
    this.healthShine.setDisplaySize(healthWidth, 2);
    this.staminaFill.setDisplaySize(staminaWidth, 4);
    this.xpLabel.setText(progression.level >= 20
      ? `NÍVEL ${progression.level} • XP MÁXIMO`
      : `NÍVEL ${progression.level} • XP ${progression.xp}/${progression.xpToNext}`);
    this.xpFill.setDisplaySize(Math.max(0, Math.round(barWidth * progression.xpRatio)), 3);
    this.coinLabel.setText(phone ? String(economy.coins) : `${economy.coins} MOEDAS`);
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

    // Missões primeiro; depois cavernas, escadas, portos e baús do mundo grande.
    const hero = this.scene.player;
    const questTarget = this.scene.campaign?.nearestInteraction() ??
      (hero ? this.scene.regionWorld?.nearestFeature(hero.x, hero.y) : null) ?? null;
    const mines = (resource) => Boolean(resource?.definition?.requiresPickaxe) || resource?.type === 'stone';
    let hint = 'WASD mover   •   M mapa   •   Clique / J atacar   •   Espaço esquivar   •   Q especial';
    if (questTarget) {
      hint = `E  •  ${questTarget.label}`;
    } else if (nearestStructure) {
      const definition = HARVEST_STRUCTURE_TYPES[nearestStructure.type];
      hint = `E  •  ${definition.requiresPickaxe ? 'Minerar' : 'Coletar'} ${definition.label}`;
    } else if (nearestResource) hint = `E  •  ${mines(nearestResource) ? 'Minerar' : 'Coletar'} ${RESOURCE_TYPES[nearestResource.type].label}`;
    else if (nearestBackpack) hint = nearestBackpack.kind === 'chest' ? 'E  •  Abrir baú do monstro' : 'E  •  Recuperar mochila de morte';
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
    if (phone) hint = '';
    this.hint.setText(hint).setVisible(hint !== '');
    this.worldAction.hidden = this.buildingMenuOpen;
    this.storeAllAvailable = storeAllAvailable;
    this.storeAllAction.hidden = !storeAllAvailable || this.buildingMenuOpen ||
      (Boolean(this.scene.touch?.enabled) && inventory.total === 0);
    this.storeAllAction.disabled = inventory.total === 0;
    this.storeAllAction.textContent = inventory.total > 0 ? 'GUARDAR TUDO' : 'MOCHILA VAZIA';
    this.worldAction.textContent = questTarget
      ? questTarget.label.split(' ')[0].toUpperCase()
      : nearestStructure
      ? `${HARVEST_STRUCTURE_TYPES[nearestStructure.type].requiresPickaxe ? 'MINERAR' : 'COLETAR'} ${HARVEST_STRUCTURE_TYPES[nearestStructure.type].label.toUpperCase()}`
      : nearestResource
        ? `${mines(nearestResource) ? 'MINERAR' : 'COLETAR'} ${RESOURCE_TYPES[nearestResource.type].label.toUpperCase()}`
        : nearestBackpack
          ? (nearestBackpack.kind === 'chest' ? 'ABRIR BAÚ' : 'RECUPERAR MOCHILA')
          : 'ATACAR';

    this.statusLabel.setText(this.statusText(time));
    this.updateRain();
    this.minimapTimer -= this.scene.game.loop.delta;
    if (this.minimapTimer <= 0) {
      this.minimapTimer = 120;
      this.renderMinimap(player, camp, enemies);
    }
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
    // Os buffs agora aparecem como ícones no painel de efeitos (EffectsPanel).
    return parts.join(' • ');
  }

  /**
   * Minimapa local: mostra o terreno ao redor do jogador (norte para cima), com
   * névoa de exploração, acampamento, moradores, locais de missão, mina,
   * masmorra, radar da torre e setas na borda para o acampamento e a missão rastreada.
   */
  renderMinimap(player = this.scene.player, camp = this.scene.camp, enemies = this.scene.enemies ?? []) {
    if (!player) return;
    const size = this.minimapSize;
    const context = this.minimapTexture.getContext();
    const renderer = this.mapRenderer;
    renderer.updateFog();
    const span = 1100;
    const scale = size / span;
    const left = player.x - span / 2;
    const top = player.y - span / 2;
    const toX = (x) => (x - left) * scale;
    const toY = (y) => (y - top) * scale;
    const kinds = [];
    context.save();
    context.imageSmoothingEnabled = false;
    context.clearRect(0, 0, 176, 176);
    context.beginPath();
    context.rect(0, 0, size, size);
    context.clip();
    context.fillStyle = '#0b0f0d';
    context.fillRect(0, 0, size, size);
    this.drawCrop(context, renderer.terrain, left, top, span, size);
    renderer.drawCamp(context, toX, toY, scale);
    renderer.drawNpcs(context, toX, toY, 2);
    this.drawCrop(context, renderer.fog, left, top, span, size);

    const inside = (x, y, margin = 0) => x >= -margin && y >= -margin && x <= size + margin && y <= size + margin;
    const mine = this.scene.harvestStructures?.state?.byType('mineMarker')?.[0];
    if (mine && inside(toX(mine.x), toY(mine.y), 4)) {
      kinds.push('mine');
      context.fillStyle = '#1b1b1f';
      context.fillRect(toX(mine.x) - 4, toY(mine.y) - 4, 8, 8);
      context.fillStyle = '#c1cbd0';
      context.fillRect(toX(mine.x) - 2, toY(mine.y) - 2, 4, 4);
    }
    if (camp?.dungeonRevealed || camp?.defense?.dragonRadar) {
      const x = toX(DUNGEON_CONFIG.x);
      const y = toY(DUNGEON_CONFIG.y);
      if (inside(x, y, 6)) {
        kinds.push('dungeon');
        context.fillStyle = '#e2463f';
        context.beginPath();
        context.moveTo(x, y - 5);
        context.lineTo(x + 5, y + 4);
        context.lineTo(x - 5, y + 4);
        context.closePath();
        context.fill();
      }
    }
    if (camp?.defense?.radarActive) {
      context.fillStyle = '#ff5d4f';
      for (const enemy of enemies) {
        if (!enemy.active) continue;
        if (Phaser.Math.Distance.Between(enemy.x, enemy.y, camp.x, camp.y) > BUILDING_DEFS.tower.radarRange) continue;
        context.fillRect(Math.round(toX(enemy.x)) - 1, Math.round(toY(enemy.y)) - 1, 3, 3);
      }
      kinds.push('radar');
    }
    for (const enemy of enemies) {
      if (!enemy.active || !(enemy.isQuestBoss || enemy.isElite)) continue;
      const x = toX(enemy.x);
      const y = toY(enemy.y);
      if (!inside(x, y)) continue;
      context.fillStyle = enemy.isQuestBoss ? '#ff8a5a' : '#e15950';
      context.fillRect(Math.round(x) - 2, Math.round(y) - 2, 4, 4);
    }
    // Invasão: invasores (pontos laranja; o líder, dourado) e a região invadida.
    const invasion = this.scene.invasion;
    if (invasion?.active) {
      for (const enemy of invasion.invaders) {
        const x = toX(enemy.x);
        const y = toY(enemy.y);
        if (!inside(x, y)) continue;
        context.fillStyle = enemy.isInvasionLeader ? '#ffd56b' : '#ff8a2a';
        context.fillRect(Math.round(x) - 2, Math.round(y) - 2, 5, 5);
        context.strokeStyle = '#1a120d';
        context.lineWidth = 1;
        context.strokeRect(Math.round(x) - 2.5, Math.round(y) - 2.5, 6, 6);
        if (!kinds.includes('invader')) kinds.push('invader');
      }
      const center = invasion.center;
      if (center) {
        const cx = toX(center.x);
        const cy = toY(center.y);
        if (inside(cx, cy, -4)) {
          context.fillStyle = 'rgba(255, 138, 42, 0.28)';
          context.beginPath();
          context.arc(cx, cy, 22, 0, Math.PI * 2);
          context.fill();
          context.fillStyle = '#ff8a2a';
          context.font = '10px "Press Start 2P", monospace';
          context.textAlign = 'center';
          context.fillText('!', cx, cy + 4);
        } else {
          const angle = Math.atan2(cy - size / 2, cx - size / 2);
          const radius = size / 2 - 7;
          context.save();
          context.translate(size / 2 + Math.cos(angle) * radius, size / 2 + Math.sin(angle) * radius);
          context.rotate(angle);
          context.fillStyle = '#ff8a2a';
          context.strokeStyle = '#1a120d';
          context.lineWidth = 2;
          context.beginPath();
          context.moveTo(6, 0);
          context.lineTo(-4, -5);
          context.lineTo(-4, 5);
          context.closePath();
          context.fill();
          context.stroke();
          context.restore();
        }
        kinds.push('invasion');
      }
    }
    const quest = renderer.drawQuestSites(context, toX, toY, { size: 4 });
    if (quest.length > 0) kinds.push('quest');

    // Setas na borda: acampamento (laranja) e alvo da missão rastreada (dourado).
    const edgeArrow = (x, y, color) => {
      const cx = size / 2;
      const angle = Math.atan2(y - cx, x - cx);
      const radius = size / 2 - 7;
      const ax = cx + Math.cos(angle) * radius;
      const ay = cx + Math.sin(angle) * radius;
      context.save();
      context.translate(ax, ay);
      context.rotate(angle);
      context.fillStyle = color;
      context.strokeStyle = '#1a120d';
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(6, 0);
      context.lineTo(-4, -5);
      context.lineTo(-4, 5);
      context.closePath();
      context.fill();
      context.stroke();
      context.restore();
    };
    if (camp && !inside(toX(camp.x), toY(camp.y), -4)) {
      edgeArrow(toX(camp.x), toY(camp.y), '#e1a65f');
      kinds.push('camp-arrow');
    } else if (camp) {
      kinds.push('camp');
    }
    const target = this.scene.campaign?.trackedTarget?.();
    if (target && !inside(toX(target.x), toY(target.y), -4)) {
      edgeArrow(toX(target.x), toY(target.y), '#ffd76b');
      kinds.push('quest-arrow');
    }

    renderer.drawPlayer(context, size / 2, size / 2, 5);
    // Vinheta e borda interna.
    const vignette = context.createRadialGradient(size / 2, size / 2, size * 0.32, size / 2, size / 2, size * 0.72);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(10,6,4,0.55)');
    context.fillStyle = vignette;
    context.fillRect(0, 0, size, size);
    context.strokeStyle = '#2a1d14';
    context.lineWidth = 2;
    context.strokeRect(1, 1, size - 2, size - 2);
    context.fillStyle = '#ffe08a';
    context.font = '8px "Press Start 2P", monospace';
    context.textAlign = 'center';
    context.fillText('N', size / 2, 11);
    context.restore();
    this.minimapTexture.refresh();
    this.minimapStats = { rendered: true, kinds, size, span, playerAtCenter: true };
  }

  /** Desenha um recorte do canvas de mapa (escala MAP_SCALE) cobrindo a área [left, top, span]. */
  drawCrop(context, source, left, top, span, size) {
    const sx = left / MAP_SCALE;
    const sy = top / MAP_SCALE;
    const sw = span / MAP_SCALE;
    const cx = Math.max(0, sx);
    const cy = Math.max(0, sy);
    const cw = Math.min(source.width, sx + sw) - cx;
    const ch = Math.min(source.height, sy + sw) - cy;
    if (cw <= 0 || ch <= 0) return;
    const ratio = size / sw;
    context.drawImage(source, cx, cy, cw, ch, (cx - sx) * ratio, (cy - sy) * ratio, cw * ratio, ch * ratio);
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
