import { reactive, computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Question } from '../types/quizz'

// --- Tracking Helpers ---

/** Génère un UUID v4 (crypto-safe) */
const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback pour navigateurs plus anciens
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/** Récupère ou crée un playerId persistant dans localStorage */
const getOrCreatePlayerId = (): string => {
  const STORAGE_KEY = 'norml_player_id'
  let playerId = localStorage.getItem(STORAGE_KEY)
  if (!playerId) {
    playerId = generateUUID()
    localStorage.setItem(STORAGE_KEY, playerId)
  }
  return playerId
}

/** Détecte le type de device de façon structurée */
const getDeviceType = (): 'mobile' | 'tablet' | 'desktop' => {
  const ua = navigator.userAgent
  if (/Mobi|Android.*Mobile|iPhone|iPod/i.test(ua)) return 'mobile'
  if (/iPad|Android(?!.*Mobile)|Tablet/i.test(ua)) return 'tablet'
  return 'desktop'
}

export interface QuestionDetail {
  questionId: string
  category: string
  isCorrect: boolean
  responseTimeMs: number
  selectedIndex: number
}

export function useGame() {
  const { t } = useI18n()

  const state = reactive({
    status: 'start' as 'start' | 'playing' | 'end',
    score: 0,
    currentQIndex: 0,
    selectedAnswer: null as number | null,
    hasAnswered: false,
    difficulty: 'medium',
    questions: [] as Question[],
    shuffledOptions: [] as { text: string; originalIndex: number }[],
    showPointPopup: false
  })

  // Chrono
  const startTime = ref(0)
  const endTime = ref(0)

  // --- Tracking Data ---
  const sessionId = ref('')
  const playerId = ref('')
  const questionDetails = ref<QuestionDetail[]>([])
  const questionStartTime = ref(0)

  // Computed
  const currentQuestion = computed(() => state.questions[state.currentQIndex] || ({} as Question))
  const isCorrect = computed(() => currentQuestion.value.correct === state.selectedAnswer)
  const isLastQuestion = computed(() => state.currentQIndex === state.questions.length - 1)

  const progress = computed(() => {
    if (!state.questions.length) return 0
    return ((state.currentQIndex + 1) / state.questions.length) * 100
  })

  const playerPerformance = computed(() => {
    if (!state.questions.length) {
      return { ratio: 0, percentage: 0, medal: null as null | 'gold' | 'silver' | 'bronze', rank: 'beginner', isSuccess: false }
    }
    const ratio = state.score / state.questions.length
    const percentage = Math.round(ratio * 100)
    let medal: 'gold' | 'silver' | 'bronze' | null = null
    let rank = 'beginner'

    if (ratio === 1) {
      medal = 'gold'
      rank = 'expert'
    } else if (ratio >= 0.9) {
      medal = 'silver'
      rank = 'advanced'
    } else if (ratio >= 0.8) {
      medal = 'bronze'
      rank = 'intermediate'
    }

    return { ratio, percentage, medal, rank, isSuccess: ratio >= 0.8 }
  })

  const rankInfo = computed(() => {
    const { rank } = playerPerformance.value
    if (!state.questions.length) return { title: '', desc: '' }
    return { title: t(`end.ranks.${rank}.title`), desc: t(`end.ranks.${rank}.desc`) }
  })

  const medalInfo = computed(() => {
    return { medal: playerPerformance.value.medal, percentage: playerPerformance.value.percentage }
  })

  // Methods
  const prepareNewQuestion = () => {
    const q = state.questions[state.currentQIndex]
    if (!q) return
    state.shuffledOptions = q.options
      .map((opt, idx) => ({ text: opt, originalIndex: idx }))
      .sort(() => 0.5 - Math.random()) // Shuffle
    // Démarrer le chrono pour cette question
    questionStartTime.value = Date.now()
  }

  /** Enregistre le détail d'une réponse pour le tracking */
  const recordAnswer = (questionId: string, category: string, isCorrectAnswer: boolean, selectedIndex: number, responseTimeMs: number) => {
    questionDetails.value.push({
      questionId,
      category,
      isCorrect: isCorrectAnswer,
      responseTimeMs,
      selectedIndex
    })
  }

  /** Initialise le tracking pour une nouvelle partie */
  const initTracking = () => {
    sessionId.value = generateUUID()
    playerId.value = getOrCreatePlayerId()
    questionDetails.value = []
    questionStartTime.value = 0
  }

  /** Retourne les infos device structurées */
  const getDeviceInfo = () => ({
    deviceType: getDeviceType(),
    screenWidth: window.screen.width,
    screenHeight: window.screen.height
  })

  /** Construit le payload complet de session pour l'envoi API */
  const buildSessionPayload = (status: 'started' | 'completed' | 'abandoned', lang: string) => {
    const urlParams = new URLSearchParams(window.location.search)
    const device = getDeviceInfo()
    const answeredCount = questionDetails.value.length
    const total = state.questions.length || 1

    return {
      sessionId: sessionId.value,
      playerId: playerId.value,
      status,
      difficulty: state.difficulty,
      lang,
      score: state.score,
      totalQuestions: state.questions.length,
      timeSpentMs: status === 'completed'
        ? endTime.value - startTime.value
        : Date.now() - startTime.value,
      questionDetails: questionDetails.value,
      lastQuestionIndex: state.currentQIndex,
      completionRate: Math.round((answeredCount / total) * 100) / 100,
      // Device
      ...device,
      // Marketing
      referrer: document.referrer || 'direct',
      utm_source: urlParams.get('utm_source'),
      utm_medium: urlParams.get('utm_medium'),
      utm_campaign: urlParams.get('utm_campaign'),
      utm_content: urlParams.get('utm_content'),
      utm_term: urlParams.get('utm_term')
    }
  }

  const resetGame = () => {
    state.score = 0
    state.currentQIndex = 0
    state.hasAnswered = false
    state.selectedAnswer = null
    state.status = 'start'
  }

  return {
    state,
    startTime,
    endTime,
    // Tracking
    sessionId,
    playerId,
    questionDetails,
    questionStartTime,
    // Computed
    currentQuestion,
    isCorrect,
    isLastQuestion,
    progress,
    playerPerformance,
    rankInfo,
    medalInfo,
    // Methods
    prepareNewQuestion,
    recordAnswer,
    initTracking,
    getDeviceInfo,
    buildSessionPayload,
    resetGame
  }
}
