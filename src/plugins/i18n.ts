import { createI18n } from 'vue-i18n';

import fr from '../locales/fr.json';
import en from '../locales/en.json';
import es from '../locales/es.json';

export const messages = {
  fr,
  en,
  es
};

// --- CORRECTION TYPE-SAFE ---

// 1. On récupère la langue brute ou 'en' par défaut
const rawLang = navigator.language || 'en';

// 2. On split. Si le tableau est vide ou si [0] est undefined, on force 'en'.
// Le "|| 'en'" à la fin rassure TypeScript : userLang sera TOUJOURS une string.
const userLang = rawLang.split('-')[0] || 'en';

// 3. On vérifie si cette langue est supportée, sinon 'en'
const defaultLocale = ['fr', 'en', 'es'].includes(userLang) ? userLang : 'en';

const i18n = createI18n({
  legacy: false,
  locale: defaultLocale,
  fallbackLocale: 'en',
  globalInjection: true,
  messages
});

export default i18n;