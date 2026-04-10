<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { fireConfetti, generateShareImage } from '../utils/canvas'
import type { UnifiedNetworkConfig } from '../types/quizz'

// Ref pour la ShareCard (html2canvas)
const shareCardRef = ref<InstanceType<typeof import('./quizz/ShareCard.vue').default> | null>(null)

// --- Composables ---
import { useI18nCMS } from '../composables/useI18nCMS'
import { useGame } from '../composables/useGame'
import { useLeaderboard } from '../composables/useLeaderboard'

// --- Components ---
import StartScreen from './quizz/StartScreen.vue'
import GameScreen from './quizz/GameScreen.vue'
import EndScreen from './quizz/EndScreen.vue'
import ShareCard from './quizz/ShareCard.vue'
import Header from './ui/Header.vue'

// UI Global State (Loading / Errors specific to the API)
const uiIsLoading = ref(true)
const uiError = ref<string | null>(null)
const uiIsChecking = ref(false)
const uiVerifyingIdx = ref<number | null>(null)

// Init composables
const { t, locale, hydrateContent, getI18nArray } = useI18nCMS()
const {
  state: game,
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
} = useGame()
const {
  form,
  uiLeader,
  initLeaderboard,
  saveScore,
  validateEmail,
  clearNameError,
  clearEmailError
} = useLeaderboard(getI18nArray, t)

const clearAllErrors = () => {
  clearEmailError()
  clearNameError()
}

// Share Modal State
const visibleNetworks = ref<string[]>([])
const showShareModal = ref(false)
const isGenerating = ref(false)
const generatedImageUrl = ref<string | null>(null)

const socialNetworks = computed(
  () => getI18nArray('end.share_modal.networks') as UnifiedNetworkConfig[]
)

onMounted(async () => {
  try {
    await hydrateContent()
  } finally {
    uiIsLoading.value = false
  }
  initLeaderboard()
  // Synchronise form.socials avec visibleNetworks
  visibleNetworks.value = Object.keys(form.socials).filter((k) => form.socials[k])

  // DEV Fallback: Auto-fill email and name to avoid typing on every test
  if (import.meta.env.DEV) {
    form.name = form.name || 'AdminTest'
    form.email = form.email || 'test@norml.fr'
  }
})

const startGame = async (difficulty: string) => {
  resetGame()
  uiIsLoading.value = true
  uiError.value = null
  game.difficulty = difficulty
  form.isSaved = false
  showShareModal.value = false

  try {
    const res = await fetch(`/api/game/start?lang=${locale.value}&level=${difficulty}`)
    if (!res.ok) throw new Error(t('errors.fetch_fail'))
    const data = await res.json()
    if (!data || data.length === 0) throw new Error(t('errors.no_questions'))

    game.questions = data
    prepareNewQuestion()

    // reset step helper
    game.selectedAnswer = null
    game.hasAnswered = false
    game.showPointPopup = false
    uiVerifyingIdx.value = null

    // Track event
    if (window.mixpanel) {
      window.mixpanel.track('quiz_started', {
        level: difficulty
      })
    }

    game.status = 'playing'
    // Scroll au sommet pour le début du quiz
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } catch {
    uiError.value = t('errors.server_unavailable')
  } finally {
    uiIsLoading.value = false
  }
}

const selectAnswer = async (domIndex: number, visualIndex: number) => {
  if (game.hasAnswered || uiIsChecking.value) return

  uiIsChecking.value = true
  uiVerifyingIdx.value = visualIndex
  game.selectedAnswer = game.shuffledOptions[visualIndex].originalIndex

  try {
    const res = await fetch('/api/game/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questionId: game.questions[game.currentQIndex]._id,
        userIndex: game.shuffledOptions[visualIndex].originalIndex
      })
    })
    const result = await res.json()

    // On valide la vraie reponse coté composable
    game.questions[game.currentQIndex].correct = result.correctIndex
    // Update data with exact answer if correct
    if (result.correct) {
      game.score++
      game.showPointPopup = true
      setTimeout(() => (game.showPointPopup = false), 1500)
    }
    game.questions[game.currentQIndex].explanation = result.explanation
    game.hasAnswered = true
  } catch (e) {
    console.error(e)
  } finally {
    uiIsChecking.value = false
    uiVerifyingIdx.value = null
  }
}

const nextQuestion = () => {
  if (isLastQuestion.value) {
    endTime.value = Date.now()
    game.status = 'end'
    // Scroll au sommet pour que l'utilisateur voie bien son score
    window.scrollTo({ top: 0, behavior: 'smooth' })
    // Confettis uniquement pour les réussites via performance isSuccess DRY !
    if (playerPerformance.value.isSuccess) fireConfetti()

    // Track completing
    if (window.mixpanel) {
      window.mixpanel.track('quiz_completed', {
        level: game.difficulty,
        score: game.score,
        total: game.questions.length,
        isSuccess: playerPerformance.value.isSuccess
      })
    }
  } else {
    game.currentQIndex++
    game.selectedAnswer = null
    game.hasAnswered = false
    game.showPointPopup = false
    uiVerifyingIdx.value = null
    prepareNewQuestion()
    // Scroll au sommet pour la question suivante
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

const toggleNetwork = (id: string) => {
  if (visibleNetworks.value.includes(id)) {
    visibleNetworks.value = visibleNetworks.value.filter((n) => n !== id)
    if (!form.socials[id]) delete form.socials[id]
  } else {
    visibleNetworks.value.push(id)
  }
}

const handleSaveScore = () => {
  if (!validateEmail()) return

  const timeSpent = Math.floor((endTime.value - startTime.value) / 1000)

  saveScore(
    game.difficulty,
    game.score,
    timeSpent,
    socialNetworks.value,
    () => {
      // Track save score
      if (window.mixpanel) {
        window.mixpanel.track('score_saved', {
          score: game.score,
          level: game.difficulty,
          opt_in: form.consent
        })
      }
    },
    (err) => {
      uiError.value = err
    }
  )
}

const generateShare = async () => {
  const shareNode = shareCardRef.value?.cardEl
  if (!shareNode) return
  isGenerating.value = true
  try {
    generatedImageUrl.value = await generateShareImage(shareNode)
    showShareModal.value = true
  } catch (e) {
    console.error(e)
  } finally {
    isGenerating.value = false
  }
}

const handleShareClick = (network: UnifiedNetworkConfig) => {
  if (generatedImageUrl.value) {
    const link = document.createElement('a')
    link.download = 'score-norml.png'
    link.href = generatedImageUrl.value
    link.click()
  }
  let finalUrl = network.url
  const shareTextRaw = t('share.default_text', {
    score: game.score,
    total: game.questions.length
  })
  const shareText = encodeURIComponent(
    shareTextRaw !== 'share.default_text'
      ? shareTextRaw
      : `Score NORML: ${game.score}/${game.questions.length}`
  )
  const shareUrl = encodeURIComponent('https://norml.fr')
  finalUrl = finalUrl.replace('{text}', shareText).replace('{url}', shareUrl)
  window.open(finalUrl, '_blank')
}

const clearInputSocial = (id: string) => {
  form.socials[id] = ''
  toggleNetwork(id)
}

const reloadPage = () => window.location.reload()
</script>

<template>
  <div class="font-main flex h-screen w-full flex-col items-center overflow-hidden select-none">
    <Header
      :is-simple="game.status === 'start'"
      :difficulty="game.status !== 'start' ? game.difficulty : null"
      :score="game.score"
      :total="game.questions.length"
      :progress="progress"
      :show-progress="game.status === 'playing'"
    />

    <StartScreen
      v-if="game.status === 'start'"
      :is-loading="uiIsLoading"
      :error="uiError"
      @start="startGame"
      @retry="reloadPage"
    />

    <GameScreen
      v-else-if="game.status === 'playing'"
      :question="currentQuestion"
      :options="game.shuffledOptions"
      :has-answered="game.hasAnswered"
      :is-correct="isCorrect"
      :is-last-question="isLastQuestion"
      :is-checking="uiIsChecking"
      :selected-answer="game.selectedAnswer"
      :show-point-popup="game.showPointPopup"
      :verifying-idx="uiVerifyingIdx"
      @select="selectAnswer"
      @next="nextQuestion"
    />

    <EndScreen
      v-else-if="game.status === 'end'"
      v-model:name-model="form.name"
      v-model:email-model="form.email"
      v-model:consent-model="form.consent"
      v-model:member-id-model="form.memberId"
      v-model:socials-model="form.socials"
      :score="game.score"
      :total="game.questions.length"
      :rank-info="rankInfo"
      :has-medal="!!medalInfo.medal"
      :is-saved="form.isSaved"
      :leaderboard="form.leaderboard"
      :name-error="uiLeader.nameError"
      :email-error="uiLeader.emailError"
      :is-submitting="uiLeader.isSubmitting"
      :social-networks="socialNetworks"
      :visible-networks="visibleNetworks"
      :is-generating="isGenerating"
      :show-share-modal="showShareModal"
      :generated-image-url="generatedImageUrl"
      :medal="medalInfo.medal"
      @save="handleSaveScore"
      @clear-error="clearAllErrors"
      @toggle-network="toggleNetwork"
      @restart="resetGame"
      @share="generateShare"
      @close-modal="showShareModal = false"
      @download="handleShareClick"
      @clear-input-social="clearInputSocial"
    />

    <!-- Render headless ShareCard for html2canvas -->
    <div class="vh-hidden">
      <ShareCard
        ref="shareCardRef"
        :score="game.score"
        :total="game.questions.length"
        :rank-title="rankInfo.title"
        :rank-desc="rankInfo.desc"
        :medal="medalInfo.medal"
        :difficulty="game.difficulty"
      />
    </div>
  </div>
</template>
