import { createI18n } from 'vue-i18n'

import frCommon from '../locales/fr/common.json'
import frQuiz from '../locales/fr/quiz.json'
import frAdmin from '../locales/fr/admin.json'
import frErrors from '../locales/fr/errors.json'

import enCommon from '../locales/en/common.json'
import enQuiz from '../locales/en/quiz.json'
import enAdmin from '../locales/en/admin.json'
import enErrors from '../locales/en/errors.json'

import esCommon from '../locales/es/common.json'
import esQuiz from '../locales/es/quiz.json'
import esAdmin from '../locales/es/admin.json'
import esErrors from '../locales/es/errors.json'

export const messages = {
  fr: { ...frCommon, ...frQuiz, ...frAdmin, ...frErrors },
  en: { ...enCommon, ...enQuiz, ...enAdmin, ...enErrors },
  es: { ...esCommon, ...esQuiz, ...esAdmin, ...esErrors }
}

// --- CORRECTION TYPE-SAFE ---

// 1. On récupère la langue brute ou 'en' par défaut
const rawLang = navigator.language || 'en'

// 2. On split. Si le tableau est vide ou si [0] est undefined, on force 'en'.
// Le "|| 'en'" à la fin rassure TypeScript : userLang sera TOUJOURS une string.
const userLang = rawLang.split('-')[0] || 'en'

// 3. On vérifie si cette langue est supportée, sinon 'en'
const defaultLocale = ['fr', 'en', 'es'].includes(userLang) ? userLang : 'en'

const i18n = createI18n({
  legacy: false,
  locale: defaultLocale,
  fallbackLocale: 'en',
  globalInjection: true,
  messages
})

export default i18n
