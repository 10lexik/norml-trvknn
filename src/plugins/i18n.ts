import { createI18n } from 'vue-i18n'

import fr from '../locales/fr.json'
import en from '../locales/en.json'
import es from '../locales/es.json'

export const messages = {
  fr,
  en,
  es
}

const i18n = createI18n({
  legacy: false,
  // On force le français par défaut tant que les autres langues ne sont pas prêtes
  locale: 'fr',
  fallbackLocale: 'fr',
  globalInjection: true,
  messages
})

export default i18n
