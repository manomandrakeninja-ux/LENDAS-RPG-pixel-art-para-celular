import { defineConfig } from 'vite';

export default defineConfig({
  // Caminhos relativos: o build funciona em qualquer pasta/servidor (ex.: GitHub Pages).
  base: './',
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
