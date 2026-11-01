import Phaser from 'phaser';
import { DOCKS, dockPosition, TILE } from '../data/worldRegions.js';
import { FISH_STATES, nextWaitMs, rollCatch, FISH_BITE_WINDOW_MS } from '../data/fishing.js';

// Pesca nos píeres: um "varal" ao lado de cada porto; E para jogar a linha, esperar a boia
// afundar ("!") e apertar E de novo dentro da janela para fisgar.

const SPOT_RANGE = 70;

export class FishingSystem {
  constructor(scene) {
    this.scene = scene;
    this.spots = DOCKS.map((dock) => {
      const p = dockPosition(dock);
      const spot = {
        dock, x: p.x + TILE * 2, y: p.y - TILE * 0.4,
        state: FISH_STATES[0], timer: 0, biteUntil: 0
      };
      spot.label = scene.add.text(spot.x, spot.y - 34, '', {
        fontFamily: 'Press Start 2P', fontSize: '8px', color: '#bfe8ff',
        backgroundColor: '#14161ee0', padding: { x: 6, y: 4 }
      }).setOrigin(0.5).setDepth(spot.y + 30).setVisible(false);
      spot.buoy = scene.add.text(spot.x, spot.y - 16, '🎣', { fontSize: '14px' })
        .setOrigin(0.5).setDepth(spot.y + 20).setVisible(false);
      return spot;
    });
  }

  nearest(player, range = SPOT_RANGE) {
    let best = null;
    let bestD = range;
    for (const spot of this.spots) {
      const d = Math.hypot(spot.x - player.x, spot.y - player.y);
      if (d < bestD) { bestD = d; best = spot; }
    }
    return best;
  }

  /** E perto do varal: começa a pescar ou fisga na hora certa. Devolve true se interagiu. */
  interact(player) {
    const spot = this.nearest(player);
    if (!spot) return false;
    const scene = this.scene;
    const now = scene.time.now;
    if (spot.state === FISH_STATES[2] && now <= spot.biteUntil) {
      // Fisgou!
      const catchResult = rollCatch();
      spot.state = FISH_STATES[0];
      spot.label.setVisible(false);
      spot.buoy.setVisible(false);
      if (scene.inventory?.add('fish', catchResult.fish)) {
        scene.ui?.showMessage(`🐟 Fisgou ${catchResult.fish} peixe${catchResult.fish > 1 ? 's' : ''}!${catchResult.coins ? ` +${catchResult.coins} moedas` : ''}`);
        scene.economy?.addCoins(catchResult.coins);
        scene.effects?.spawnHarvest(spot.x, spot.y - 20, 0x9fd0ff);
        scene.audio?.playCollect?.();
        scene.campaign?.onGathered?.({ fish: catchResult.fish });
        scene.save?.();
      } else {
        scene.ui?.showMessage('Mochila cheia! O peixe escapou...');
      }
      return true;
    }
    if (spot.state !== FISH_STATES[0]) return true; // já está pescando
    spot.state = FISH_STATES[1];
    spot.timer = nextWaitMs();
    spot.buoy.setVisible(true);
    spot.buoy.setText('🎣');
    spot.label.setText('...');
    scene.ui?.showMessage('🎣 Linha na água... espere a boia afundar!');
    scene.audio?.playPick?.();
    return true;
  }

  update(delta) {
    const scene = this.scene;
    const player = scene.player;
    const now = scene.time.now;
    for (const spot of this.spots) {
      if (spot.state === FISH_STATES[1]) {
        spot.timer -= delta;
        if (spot.timer <= 0) {
          spot.state = FISH_STATES[2];
          spot.biteUntil = now + FISH_BITE_WINDOW_MS;
          spot.buoy.setText('❗');
          scene.audio?.playHit?.();
        }
      } else if (spot.state === FISH_STATES[2] && now > spot.biteUntil) {
        spot.state = FISH_STATES[0];
        spot.buoy.setVisible(false);
        if (player && Math.hypot(spot.x - player.x, spot.y - player.y) < 300) {
          scene.ui?.showMessage('💨 O peixe escapou...');
        }
      }
      const near = player && Math.hypot(spot.x - player.x, spot.y - player.y) < 240;
      if (spot.state === FISH_STATES[0]) {
        spot.buoy.setVisible(false);
        spot.label.setVisible(Boolean(near));
        if (near) spot.label.setText('🎣 PESCAR (E)');
      } else if (spot.state === FISH_STATES[1]) {
        spot.label.setVisible(Boolean(near));
        if (near) spot.label.setText('...');
      } else {
        spot.label.setVisible(Boolean(near));
        if (near) spot.label.setText('❗ APERTE E!');
      }
    }
  }
}
