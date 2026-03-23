import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  // Le bloc serveur (Vercel prendra le dessus sur le proxy)
  server: {
    host: true
  },

  // Correction ici : on utilise la méthode compatible avec tes imports
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
})
