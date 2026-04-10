import { useI18n } from 'vue-i18n'
import { autoFixTypo } from '../utils/string'

// Static fallbacks
import { messages } from '../plugins/i18n'

export function useI18nCMS() {
  const { t, tm, locale, setLocaleMessage } = useI18n()

  // Set initial locales locally just in case
  setLocaleMessage('fr', autoFixTypo(messages.fr))
  setLocaleMessage('en', autoFixTypo(messages.en))
  setLocaleMessage('es', autoFixTypo(messages.es))

  const deepMerge = (target: any, source: any) => {
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        if (!target[key]) target[key] = {}
        deepMerge(target[key], source[key])
      } else {
        target[key] = source[key]
      }
    }
    return target
  }

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
          const current = { ...tm('') } as any // Get all current messages
          const cleanRemote = autoFixTypo(remoteData)
          const merged = deepMerge(current, cleanRemote)
          setLocaleMessage(locale.value, merged)
        }
      }
    } catch (e) {
      console.error('Erreur API CMS', e)
    }
  }

  // Wrapper for tm to return array (type safe)
  const getI18nArray = (key: string): any[] => {
    const d = tm(key)
    return Array.isArray(d) ? d : d && typeof d === 'object' ? Object.values(d) : []
  }

  return {
    t,
    locale,
    hydrateContent,
    getI18nArray
  }
}
