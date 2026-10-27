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
    // entre atualizações do jogo.
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: { phaser: ['phaser'] }
      }
    }
  }
});
