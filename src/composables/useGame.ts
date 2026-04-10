import { reactive, computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Question } from '../types/quizz'

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
      return {
        ratio: 0,
        percentage: 0,
        medal: null as null | 'gold' | 'silver' | 'bronze',
        rank: 'beginner',
        isSuccess: false
      }
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
    currentQuestion,
    isCorrect,
    isLastQuestion,
    progress,
    playerPerformance,
    rankInfo,
    medalInfo,
    prepareNewQuestion,
    resetGame
  }
}
