<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
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
  buildSessionPayload,
  resetGame } = useGame()
const { form, uiLeader, initLeaderboard, saveScore, validateName, validateEmail, clearNameError, clearEmailError } = useLeaderboard(getI18nArray, t)

const availableLocales = ['fr', 'en', 'es']
const LEVEL_IDS = ['easy', 'medium', 'hard']

// Share Modal State
const visibleNetworks = ref<string[]>([])
const showShareModal = ref(false)
const isGenerating = ref(false)
const generatedImageUrl = ref<string | null>(null)

const socialNetworks = computed(() => getI18nArray('end.share_modal.networks') as UnifiedNetworkConfig[])

// --- Session Tracking Helpers ---

/** Envoie les données de session au serveur */
const sendSession = async (status: 'completed' | 'abandoned') => {
  const payload = buildSessionPayload(status, locale.value)
  try {
    const res = await fetch('/api/game/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    if (!res.ok) {
      const err = await res.text()
      console.error('[SESSION_API_ERROR]', res.status, err)
    }
  } catch (e) {
    console.error('[SESSION_SEND_ERROR]', e)
  }
}

/** Envoie les données d'abandon via sendBeacon (fiable même si la page se ferme) */
const sendAbandonBeacon = () => {
  if (game.status !== 'playing') return
  const payload = buildSessionPayload('abandoned', locale.value)
  const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' })
  navigator.sendBeacon('/api/game/session', blob)
}

// --- Lifecycle ---

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

  // Abandon detection : envoie les données si l'utilisateur quitte pendant le quiz
  window.addEventListener('beforeunload', sendAbandonBeacon)
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', sendAbandonBeacon)
})

const setLang = async (l: string) => {
  locale.value = l
  uiIsLoading.value = true
  await hydrateContent()
  uiIsLoading.value = false
}

const startGame = async (difficulty: string) => {
  resetGame()
  uiIsLoading.value = true
  uiError.value = null
  game.difficulty = difficulty
  form.isSaved = false
  showShareModal.value = false
  
  // Initialiser le tracking pour cette nouvelle session
  initTracking()
  
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
      try {
        window.mixpanel.track('quiz_started', {
          level: difficulty
        })
      } catch (e) {
        console.error('Mixpanel error', e)
      }
    }

    startTime.value = Date.now()
    game.status = 'playing'
    // Scroll au sommet pour le début du quiz
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } catch (e: any) {
    uiError.value = t('errors.server_unavailable')
  } finally {
    uiIsLoading.value = false
  }
}

const selectAnswer = async (domIndex: number, visualIndex: number) => {
  if (game.hasAnswered || uiIsChecking.value) return
  
  // --- Tracking : figer le chrono avant la latence réseau ---
  const timeToAnswerMs = Date.now() - questionStartTime.value

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

    // --- Tracking : enregistrer le détail de cette réponse ---
    recordAnswer(
      game.questions[game.currentQIndex]._id,
      game.questions[game.currentQIndex].category || '',
      result.correct,
      game.shuffledOptions[visualIndex].originalIndex,
      timeToAnswerMs
    )
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
    if (playerPerformance.value.isSuccess) {
      try {
        fireConfetti()
      } catch (e) {
        console.error('Confetti error', e)
      }
    }
    
    // Track completing
    if (window.mixpanel) {
      try {
        window.mixpanel.track('quiz_completed', {
          level: game.difficulty,
          score: game.score,
          total: game.questions.length,
          isSuccess: playerPerformance.value.isSuccess
        })
      } catch (e) {
        console.error('Mixpanel error', e)
      }
    }

    // --- Tracking : sauvegarder la session complète ---
    sendSession('completed')
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
  if (!validateEmail()) return;

  const timeSpent = Math.floor((endTime.value - startTime.value) / 1000)
  
  saveScore(
    game.difficulty, 
    game.score, 
    timeSpent,
    socialNetworks.value,
    {
      lang: locale.value,
      sessionId: sessionId.value,
      playerId: playerId.value
    },
    () => { 
        // Track save score
        if (window.mixpanel) {
          try {
            window.mixpanel.track('score_saved', {
              score: game.score,
              level: game.difficulty,
              opt_in: form.consent
            })
          } catch (e) {}
        }
    }, 
    (err) => { uiError.value = err }
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
  <div class="quiz-module">
    <header class="quiz-header">
      <!-- <div class="header-top">
        <div class="lang-switcher" :class="{ 'is-hidden': game.status !== 'start' }">
          <button
            v-for="l in availableLocales"
            :key="l"
            :class="{ active: locale === l }"
            @click="setLang(l)"
          >
            {{ l.toUpperCase() }}
          </button>
        </div>
        <div class="score-display" v-if="game.status !== 'start'">
          <span class="level-badge" :class="game.difficulty">{{ t('levels.' + game.difficulty + '.label') }}</span>
          <span class="score-value">{{ game.score }} / {{ game.questions.length }}</span>
        </div>
      </div> -->
      <div class="logo-area">
        <img src="../assets/img/logo.svg" :alt="t('header.brand')" class="main-logo" />
      </div>
      <div class="progress-bar" v-if="game.status === 'playing'">
        <div class="fill" :style="{ width: progress + '%' }"></div>
      </div>
    </header>

    <StartScreen
      v-if="game.status === 'start'"
      :isLoading="uiIsLoading"
      :error="uiError"
      @start="startGame"
      @retry="reloadPage"
    />

    <GameScreen
      v-else-if="game.status === 'playing'"
      :question="currentQuestion"
      :options="game.shuffledOptions"
      :hasAnswered="game.hasAnswered"
      :isCorrect="isCorrect"
      :isLastQuestion="isLastQuestion"
      :isChecking="uiIsChecking"
      :selectedAnswer="game.selectedAnswer"
      :showPointPopup="game.showPointPopup"
      :verifyingIdx="uiVerifyingIdx"
      @select="selectAnswer"
      @next="nextQuestion"
    />

    <EndScreen
      v-else-if="game.status === 'end'"
      :score="game.score"
      :total="game.questions.length"
      :rankInfo="rankInfo"
      :hasMedal="!!medalInfo.medal"
      :isSaved="form.isSaved"
      :leaderboard="form.leaderboard"
      :nameError="uiLeader.nameError"
      :emailError="uiLeader.emailError"
      :isSubmitting="uiLeader.isSubmitting"
      v-model:nameModel="form.name"
      v-model:emailModel="form.email"
      v-model:consentModel="form.consent"
      v-model:memberIdModel="form.memberId"
      v-model:socialsModel="form.socials"
      :socialNetworks="socialNetworks"
      :visibleNetworks="visibleNetworks"
      :isGenerating="isGenerating"
      :showShareModal="showShareModal"
      :generatedImageUrl="generatedImageUrl"
      :medal="medalInfo.medal"
      @save="handleSaveScore"
      @clearError="clearEmailError(); clearNameError()"
      @toggleNetwork="toggleNetwork"
      @restart="resetGame"
      @share="generateShare"
      @closeModal="showShareModal = false"
      @download="handleShareClick"
      @clearInputSocial="clearInputSocial"
    />

    <!-- Render headless ShareCard for html2canvas -->
    <ShareCard
      ref="shareCardRef"
      :score="game.score"
      :total="game.questions.length"
      :rankTitle="rankInfo.title"
      :rankDesc="rankInfo.desc"
      :medal="medalInfo.medal"
      :difficulty="game.difficulty"
    />
  </div>
</template>
