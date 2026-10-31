import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

// Depois do build, preenche o sw.js com a lista dos arquivos gerados (caminhos relativos).
function precacheServiceWorker() {
  let outDir = 'dist';
  return {
    name: 'lendas-precache',
    apply: 'build',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      const swPath = path.join(outDir, 'sw.js');
      if (!fs.existsSync(swPath)) return;
      const files = [];
      const walk = (dir) => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) walk(full);
          else files.push(path.relative(outDir, full).split(path.sep).join('/'));
        }
      };
      walk(outDir);
      const list = ['./', ...files.filter((file) => file !== 'sw.js').map((file) => './' + file)];
      const version = Date.now().toString(36);
      const source = fs.readFileSync(swPath, 'utf8')
        .replace('/*__PRECACHE__*/[]', JSON.stringify(list))
        .replace('__VERSION__', version);
      fs.writeFileSync(swPath, source);
    }
  };
}

export default defineConfig({
  // Caminhos relativos: o build funciona em qualquer pasta/servidor (ex.: GitHub Pages).
  base: './',
  plugins: [precacheServiceWorker()],
  server: {
    watch: {
      ignored: [
        '**/.*/**',
        '**/*.tmpdir/**',
        'tests/**',
        'scripts/**',
        'dist/**'
      ]
    }
  },
  build: {
    // O Phaser sozinho tem ~1,4 MB; fica num arquivo separado que o celular guarda em cache
    // entre atualizações do jogo. 1700 cobre o art-monster-sprites (arquivo único de dados de
    // sprites: 1,6 MB fonte mas só ~551 kB em gzip, e fica em cache entre atualizações).
    chunkSizeWarningLimit: 1700,
    rollupOptions: {
      output: {
        // Phaser e a arte procedural (sprites gerados em src/art) em chunks próprios:
        // o index encolhe e cada parte fica em cache no celular entre atualizações.
        manualChunks(id) {
          const p = id.split('\\').join('/');
          if (p.includes('node_modules/phaser')) return 'phaser';
          if (p.includes('/src/art/')) {
            // A arte procedural é o pedaço mais pesado: divide por tema pra nenhum chunk passar do limite.
            // Roteamento explícito e acíclico (base não importa nada de dentro de art; misc só importa dos outros):
            // evita warning de "circular chunk" entre art-buildings e art-misc.
            const f = p.split('/').pop();
            if (['pixel.js', 'palette.js', 'painter.js', 'terrain.js', 'natureSprites.js', 'bakedNature.js', 'biomeProps.js', 'icons.js', 'knight.js', 'person.js', 'gear.js'].includes(f)) return 'art-base';
            if (/monster/i.test(f)) return 'art-monsters';
            if (/building|sites/i.test(f)) return 'art-buildings';
            if (/hero|skin|mount|horse/i.test(f)) return 'art-heroes';
            if (/gear|weapon/i.test(f)) return 'art-gear';
            return 'art-misc';
          }
          return undefined;
        }
      }
    }
  }
});
