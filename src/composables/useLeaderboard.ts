import { reactive, ref } from 'vue'
import type { LeaderboardEntry } from '../types/quizz'

export function useLeaderboard(getI18nArray: (key: string) => any[], t: (key: string) => string) {
  const form = reactive({
    name: '',
    email: '',
    consent: true,
    memberId: '',
    socials: {} as Record<string, string>,
    isSaved: false,
    leaderboard: [] as LeaderboardEntry[]
  })

  const ui = reactive({
    nameError: null as string | null,
    emailError: null as string | null,
    isSubmitting: false,
    verifyingIdx: null as number | null
  })

  // Init local storage values and mock leaderboard
  const initLeaderboard = () => {
    const localUser = localStorage.getItem('norml_user_infos')
    if (localUser) {
      try {
        const u = JSON.parse(localUser)
        form.name = u.name || ''
        form.memberId = u.memberId || ''
        if (u.socials) {
          form.socials = u.socials
        }
      } catch (e) {
        console.error(e)
      }
    }
    const mocks = getI18nArray('end.mock_leaderboard') as LeaderboardEntry[]
    form.leaderboard = mocks.slice(0, 10)
  }

  const validateName = () => {
    const safeName = form.name.trim()
    const nameRegex = /^[a-zA-Z0-9\u00C0-\u00FF _-]{2,15}$/
    if (!safeName) {
      ui.nameError = t('errors.name_required')
      return false
    }
    if (!nameRegex.test(safeName)) {
      ui.nameError = t('errors.invalid_name')
      return false
    }
    ui.nameError = null
    return true
  }

  const clearNameError = () => {
    ui.nameError = null
  }

  const validateEmail = () => {
    const safeEmail = form.email.trim()
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!safeEmail) {
      ui.emailError = t('errors.email_required')
      return false
    }
    if (!emailRegex.test(safeEmail)) {
      ui.emailError = t('errors.invalid_email')
      return false
    }
    ui.emailError = null
    return true
  }

  const clearEmailError = () => {
    ui.emailError = null
  }

  const formatSocials = (networks: any[]) => {
    const finalSocials: Record<string, string> = {}
    networks.forEach((net) => {
      const handle = form.socials[net.id]
      if (handle) {
        const clean = handle
          .replace(/^@/, '')
          .replace(/https?:\/\//, '')
          .replace('www.', '')
          .replace(net.baseUrl + '/', '')
          .trim()
        if (clean) finalSocials[net.id] = `https://${net.baseUrl}/${clean}`
      }
    })
    return finalSocials
  }

  const saveScore = async (
    difficulty: string,
    score: number,
    timeMs: number,
    networks: any[],
    onSuccess: () => void,
    onError: (msg: string) => void
  ) => {
    if (!validateName()) return

    ui.isSubmitting = true
    try {
      const urlParams = new URLSearchParams(window.location.search)
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        consent: form.consent,
        memberId: form.memberId.trim() || undefined,
        score,
        difficulty,
        time: timeMs,
        socials: formatSocials(networks),
        referrer: document.referrer || 'direct',
        screenWidth: window.screen.width,
        // UTM tracking
        utm_source: urlParams.get('utm_source'),
        utm_medium: urlParams.get('utm_medium'),
        utm_campaign: urlParams.get('utm_campaign')
      }

      const res = await fetch('/api/game/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await res.json()
      if (!res.ok) {
        const errType = data.error || data.message || 'Erreur inconnue'
        if (errType.includes('Pseudo déjà pris') || res.status === 409) {
          ui.nameError = t('errors.name_taken')
        } else {
          onError(errType)
        }
        return
      }

      form.leaderboard = data.map((doc: any) => ({
        name: doc.name,
        score: doc.score,
        time: doc.time,
        memberId: doc.memberId,
        isUser: doc.name === form.name.trim(),
        socials: doc.socials || {}
      }))

      form.isSaved = true
      localStorage.setItem(
        'norml_user_infos',
        JSON.stringify({
          name: form.name.trim(),
          memberId: form.memberId.trim(),
          socials: form.socials
        })
      )

      onSuccess()
    } catch (e: any) {
      onError(t('errors.fetch_fail'))
    } finally {
      ui.isSubmitting = false
    }
  }

  return {
    form,
    uiLeader: ui,
    initLeaderboard,
    saveScore,
    validateName,
    validateEmail,
    clearNameError,
    clearEmailError
  }
}
