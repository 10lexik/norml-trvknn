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
  medalInfo, prepareNewQuestion, selectAnswer: localSelectAnswer, nextQuestion: localNextQuestion, resetGame } = useGame()
const { form, uiLeader, initLeaderboard, saveScore, validateName, clearNameError } = useLeaderboard(getI18nArray, t)

const availableLocales = ['fr', 'en', 'es']
const LEVEL_IDS = ['easy', 'medium', 'hard']

// Share Modal State
const visibleNetworks = ref<string[]>([])
const showShareModal = ref(false)
const isGenerating = ref(false)
const generatedImageUrl = ref<string | null>(null)

const socialNetworks = computed(() => getI18nArray('end.share_modal.networks') as UnifiedNetworkConfig[])

onMounted(async () => {
  try {
    await hydrateContent()
  } finally {
    uiIsLoading.value = false
  }
  initLeaderboard()
  // Synchronise form.socials avec visibleNetworks
  visibleNetworks.value = Object.keys(form.socials).filter((k) => form.socials[k])
})

const setLang = async (l: string) => {
  locale.value = l
  uiIsLoading.value = true
  await hydrateContent()
  uiIsLoading.value = false
}

const startGame = async (difficulty: string) => {
  uiIsLoading.value = true
  uiError.value = null
  game.difficulty = difficulty
  game.score = 0
  game.currentQIndex = 0
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
    
    startTime.value = Date.now()
    game.status = 'playing'
  } catch (e: any) {
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
    // Confettis uniquement pour les réussites via performance isSuccess DRY !
    if (playerPerformance.value.isSuccess) fireConfetti()
  } else {
    game.currentQIndex++
    game.selectedAnswer = null
    game.hasAnswered = false
    game.showPointPopup = false
    uiVerifyingIdx.value = null
    prepareNewQuestion()
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
  const timeSpent = Math.floor((endTime.value - startTime.value) / 1000)
  
  // Format socials to full URL before save (like current logic)
  const finalSocials: Record<string, string> = {}
  socialNetworks.value.forEach((net) => {
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
  
  // Temporary switch to clean data before save
  const originalSocials = {...form.socials}
  form.socials = finalSocials
  
  saveScore(
    game.difficulty, 
    game.score, 
    timeSpent, 
    () => { /* success */ }, 
    (err) => { uiError.value = err; form.socials = originalSocials }
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
      <div class="header-top">
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
      </div>
      <div class="logo-area">{{ t('header.brand') }}</div>
      <div class="progress-bar" v-if="game.status === 'playing'">
        <div class="fill" :style="{ width: progress + '%' }"></div>
      </div>
    </header>

    <StartScreen
      v-if="game.status === 'start'"
      :isLoading="uiIsLoading"
      :error="uiError"
      :t="t"
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
      :t="t"
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
      :isSubmitting="uiLeader.isSubmitting"
      v-model:nameModel="form.name"
      v-model:memberIdModel="form.memberId"
      v-model:socialsModel="form.socials"
      :socialNetworks="socialNetworks"
      :visibleNetworks="visibleNetworks"
      :isGenerating="isGenerating"
      :showShareModal="showShareModal"
      :generatedImageUrl="generatedImageUrl"
      :t="t"
      @save="handleSaveScore"
      @clearError="clearNameError"
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
      :t="t"
    />
  </div>
</template>
