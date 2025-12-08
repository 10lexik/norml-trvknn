// src/main.ts
import './assets/scss/main.scss' // <--- INDISPENSABLE pour le fond beige et la police
import { createApp } from 'vue'
import App from './App.vue'
import i18n from './plugins/i18n' // ou ton chemin correct

const app = createApp(App)
app.use(i18n)
app.mount('#app')
