import { useI18n } from 'vue-i18n'
import { autoFixTypo } from '../utils/string'

// Static fallbacks
import fr from '../locales/fr.json'
import en from '../locales/en.json'
import es from '../locales/es.json'

export function useI18nCMS() {
  const { t, tm, locale, setLocaleMessage } = useI18n()
  
  // Set initial locales locally just in case
  setLocaleMessage('fr', autoFixTypo(fr))
  setLocaleMessage('en', autoFixTypo(en))
  setLocaleMessage('es', autoFixTypo(es))

  const hydrateContent = async () => {
    const forceLocal = (import.meta as any).env.VITE_FORCE_LOCAL_CONTENT === 'true'
    if (forceLocal) {
      console.log('🚧 Mode Local Forcé (.env) : JSON local utilisé.')
      return
    }
    try {
      const res = await fetch(`/api/content/get?lang=${locale.value}`)
      if (res.ok) {
        const remoteData = await res.json()
        if (remoteData && Object.keys(remoteData).length > 0) {
          const cleanData = autoFixTypo(remoteData)
          setLocaleMessage(locale.value, cleanData)
        }
      }
    } catch (e) {
      console.error('Erreur API CMS', e)
    }
  }

  // Wrapper for tm to return array (type safe)
  const getI18nArray = (key: string): any[] => {
    const d = tm(key)
    return Array.isArray(d)
      ? d
      : d && typeof d === 'object'
        ? Object.values(d)
        : []
  }

  return {
    t,
    locale,
    hydrateContent,
    getI18nArray
  }
}
