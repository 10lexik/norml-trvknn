// src/main.ts
import { createApp } from 'vue'
import './style.css'
import App from './App.vue'

// Import depuis le nouveau dossier plugins
import i18n from './plugins/i18n' 

const app = createApp(App);
app.use(i18n);
app.mount('#app');