import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path' // Si erreur ici : npm i -D @types/node

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  // --- AJOUTE CECI ---
  css: {
    preprocessorOptions: {
      scss: {
        // Cela injecte les variables et mixins dans TOUS les fichiers .vue automatiquement
        additionalData: `
          @import "@/assets/scss/abstracts/_variables.scss";
          @import "@/assets/scss/abstracts/_mixins.scss";
        `
      }
    }
  }
})
