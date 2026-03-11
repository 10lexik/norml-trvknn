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

  const rankInfo = computed(() => {
    if (!state.questions.length) return { title: '', desc: '' }
    if (state.score >= 18) {
      return { title: t('end.ranks.expert.title'), desc: t('end.ranks.expert.desc') }
    }
    if (state.score >= 10) {
      return { title: t('end.ranks.intermediate.title'), desc: t('end.ranks.intermediate.desc') }
    }
    return { title: t('end.ranks.beginner.title'), desc: t('end.ranks.beginner.desc') }
  })

  // Methods
  const prepareNewQuestion = () => {
    const q = state.questions[state.currentQIndex]
    if (!q) return
    state.shuffledOptions = q.options
      .map((opt, idx) => ({ text: opt, originalIndex: idx }))
      .sort(() => 0.5 - Math.random()) // Shuffle
  }

  const selectAnswer = (index: number) => {
    if (state.hasAnswered) return
    state.selectedAnswer = state.shuffledOptions[index].originalIndex
    state.hasAnswered = true
    if (isCorrect.value) {
      state.score++
      state.showPointPopup = true
      setTimeout(() => (state.showPointPopup = false), 1500)
    }
  }

  const nextQuestion = () => {
    if (isLastQuestion.value) {
      endTime.value = Date.now()
      state.status = 'end'
    } else {
      state.currentQIndex++
      state.hasAnswered = false
      state.selectedAnswer = null
      prepareNewQuestion()
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
    currentQuestion,
    isCorrect,
    isLastQuestion,
    progress,
    rankInfo,
    prepareNewQuestion,
    selectAnswer,
    nextQuestion,
    resetGame
  }
}
