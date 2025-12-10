<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import { useI18n } from 'vue-i18n'
import confetti from 'canvas-confetti'
import html2canvas from 'html2canvas'

// --- 1. IMPORTS & FALLBACKS ---
import fr from '../locales/fr.json'
import en from '../locales/en.json'
import es from '../locales/es.json'

// --- 2. TYPES ---
interface Question {
  _id: string
  category: string
  question: string
  options: string[]
  correct?: number
  explanation?: string
}

// Configuration UNIFIÉE (Input + Share)
interface UnifiedNetworkConfig {
  id: string
  label: string
  icon: string
  url: string // Url de partage
  color: string
  baseUrl: string // Url de profil (pour le nettoyage input)
}

interface LeaderboardEntry {
  name: string
  score: number
  memberId?: string
  isUser?: boolean
  socials?: Record<string, string>
}

// --- 2.5. HELPER TYPO ---
const autoFixTypo = (data: any): any => {
  if (typeof data === 'string') {
    return data.replace(/ ([!?:;])/g, '\u00A0$1')
  }
  if (Array.isArray(data)) {
    return data.map((item) => autoFixTypo(item))
  }
  if (data && typeof data === 'object') {
    const sorted: any = {}
    Object.keys(data).forEach((key) => {
      sorted[key] = autoFixTypo(data[key])
    })
    return sorted
  }
  return data
}

// --- 3. CONFIGURATION ---
const LEVEL_IDS = ['easy', 'medium', 'hard']
const { t, tm, locale, setLocaleMessage } = useI18n()
const availableLocales = ['fr', 'en', 'es']

setLocaleMessage('fr', autoFixTypo(fr))
setLocaleMessage('en', autoFixTypo(en))
setLocaleMessage('es', autoFixTypo(es))

// --- 4. STATE ---
const ui = reactive({
  isLoading: false,
  isChecking: false,
  verifyingIdx: null as number | null,
  error: null as string | null
})

const game = reactive({
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

const form = reactive({
  name: '',
  memberId: '',
  socials: {} as Record<string, string>,
  isSaved: false,
  leaderboard: [] as LeaderboardEntry[]
})

// UI States
const visibleNetworks = ref<string[]>([]) // Pour l'accordéon inputs
const shareCardRef = ref<HTMLElement | null>(null)
const isGenerating = ref(false)
const showShareModal = ref(false)
const generatedImageUrl = ref<string | null>(null)

// --- 5. LOGIQUE CMS ---
const hydrateContent = async () => {
  try {
    const res = await fetch(`/api/get_content?lang=${locale.value}`)
    if (res.ok) {
      const remoteData = await res.json()
      if (remoteData && Object.keys(remoteData).length > 0) {
        const cleanData = autoFixTypo(remoteData)
        setLocaleMessage(locale.value, cleanData)
      }
    }
  } catch (e) {}
}

// --- 6. CYCLE DE VIE ---
onMounted(async () => {
  hydrateContent()
  const localUser = localStorage.getItem('norml_user_infos')
  if (localUser) {
    try {
      const u = JSON.parse(localUser)
      form.name = u.name || ''
      form.memberId = u.memberId || ''
      if (u.socials) {
        form.socials = u.socials
        visibleNetworks.value = Object.keys(u.socials).filter(
          (k) => u.socials[k]
        )
      }
    } catch (e) {
      console.error(e)
    }
  }
  const savedScores = localStorage.getItem('norml_quiz_scores')
  const mocks = getI18nArray('end.mock_leaderboard') as LeaderboardEntry[]
  let data = [...mocks]
  if (savedScores) {
    try {
      const parsed = JSON.parse(savedScores)
      if (Array.isArray(parsed)) data = [...data, ...parsed]
    } catch (e) {
      console.error(e)
    }
  }
  form.leaderboard = data.sort((a, b) => b.score - a.score).slice(0, 20)
})

// --- 7. ACTIONS JEU ---
const setLang = async (l: string) => {
  locale.value = l
  await hydrateContent()
}

const startGame = async (difficulty: string) => {
  ui.isLoading = true
  ui.error = null
  game.difficulty = difficulty
  game.score = 0
  game.currentQIndex = 0
  form.isSaved = false
  showShareModal.value = false
  try {
    const res = await fetch(
      `/api/start_game?lang=${locale.value}&level=${difficulty}`
    )
    if (!res.ok) throw new Error(t('errors.fetch_fail'))
    const rawData = await res.json()
    const data = autoFixTypo(rawData)
    if (!data || data.length === 0) throw new Error(t('errors.no_questions'))
    game.questions = data
    prepareNewQuestion()
    resetStep()
    game.status = 'playing'
  } catch (e: any) {
    ui.error = t('errors.server_unavailable')
  } finally {
    ui.isLoading = false
  }
}

const prepareNewQuestion = () => {
  const q = game.questions[game.currentQIndex]
  if (!q) return
  game.shuffledOptions = q.options
    .map((opt, idx) => ({ text: opt, originalIndex: idx }))
    .sort(() => 0.5 - Math.random())
}

const selectAnswer = async (visualIndex: number) => {
  if (game.hasAnswered || ui.isChecking) return
  ui.isChecking = true
  ui.verifyingIdx = visualIndex
  game.selectedAnswer = visualIndex
  try {
    const res = await fetch('/api/check_answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questionId: game.questions[game.currentQIndex]._id,
        userIndex: game.shuffledOptions[visualIndex].originalIndex
      })
    })
    const result = await res.json()
    if (result.correct) {
      game.score++
      game.showPointPopup = true
    }
    game.questions[game.currentQIndex].correct = result.correctIndex
    game.questions[game.currentQIndex].explanation = autoFixTypo(
      result.explanation
    )
    game.hasAnswered = true
  } catch (e) {
    console.error(e)
  } finally {
    ui.isChecking = false
    ui.verifyingIdx = null
  }
}

const nextQuestion = () => {
  if (game.currentQIndex === game.questions.length - 1) endGame()
  else {
    game.currentQIndex++
    prepareNewQuestion()
    resetStep()
  }
}
const resetStep = () => {
  game.selectedAnswer = null
  game.hasAnswered = false
  game.showPointPopup = false
  ui.verifyingIdx = null
}
const endGame = () => {
  game.status = 'end'
  if (game.score >= game.questions.length * 0.75)
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#297534', '#4CAF50', '#E4E9D5']
    })
}

// --- 8. UI INPUTS (ACCORDÉON) ---
const toggleInputNetwork = (id: string) => {
  if (visibleNetworks.value.includes(id)) {
    if (!form.socials[id])
      visibleNetworks.value = visibleNetworks.value.filter((n) => n !== id)
  } else {
    visibleNetworks.value.push(id)
  }
}

const clearInputSocial = (id: string) => {
  form.socials[id] = ''
  toggleInputNetwork(id)
}

// --- 9. PARTAGE VIRAL ---
const openShareModal = async () => {
  if (!shareCardRef.value) return
  isGenerating.value = true
  try {
    const canvas = await html2canvas(shareCardRef.value, {
      backgroundColor: '#1a1a1a',
      scale: 2,
      useCORS: true
    })
    generatedImageUrl.value = canvas.toDataURL('image/png')
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
  const shareText = encodeURIComponent(
    `Score NORML: ${game.score}/${game.questions.length} ! 🌿`
  )
  const shareUrl = encodeURIComponent('https://norml.fr')
  finalUrl = finalUrl.replace('{text}', shareText).replace('{url}', shareUrl)
  window.open(finalUrl, '_blank')
}

// --- 10. SAUVEGARDE ---
const submitScore = async () => {
  if (!form.name) return
  ui.isLoading = true

  const finalSocials: Record<string, string> = {}

  // Utilisation de la liste unifiée pour créer les liens
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

  try {
    const payload = {
      name: form.name,
      score: game.score,
      memberId: form.memberId,
      socials: finalSocials,
      difficulty: game.difficulty
    }
    const res = await fetch('/api/submit_score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    if (!res.ok) throw new Error('Erreur sauvegarde')
    const realTop10 = await res.json()
    form.leaderboard = realTop10.map((entry: LeaderboardEntry) => ({
      ...entry,
      isUser: entry.name === form.name
    }))
    localStorage.setItem(
      'norml_user_infos',
      JSON.stringify({
        name: form.name,
        memberId: form.memberId,
        socials: form.socials
      })
    )
    form.isSaved = true
  } catch (e) {
    console.error(e)
    ui.error = 'Erreur sauvegarde.'
  } finally {
    ui.isLoading = false
  }
}

// --- 11. HELPERS ---
const reloadPage = () => window.location.reload()

const getI18nArray = (key: string): any[] => {
  const d = tm(key)
  return Array.isArray(d)
    ? d
    : d && typeof d === 'object'
      ? Object.values(d)
      : []
}
const optionLetters = computed(() => {
  const l = getI18nArray('game.letters')
  return l.length ? l : ['A', 'B', 'C', 'D']
})
const currentQuestion = computed(
  () => game.questions[game.currentQIndex] || ({} as Question)
)
const isCorrect = computed(() => {
  if (
    game.selectedAnswer === null ||
    currentQuestion.value.correct === undefined
  )
    return false
  const o = game.shuffledOptions[game.selectedAnswer]
  return o && o.originalIndex === currentQuestion.value.correct
})
const isLastQuestion = computed(
  () => game.currentQIndex === game.questions.length - 1
)
const progress = computed(() =>
  game.questions.length
    ? ((game.currentQIndex + 1) / game.questions.length) * 100
    : 0
)
const getOptionClass = (idx: number) => {
  if (ui.verifyingIdx === idx) return 'is-verifying'
  if (!game.hasAnswered || currentQuestion.value.correct === undefined)
    return ''
  const o = game.shuffledOptions[idx]
  const c = currentQuestion.value.correct
  if (o.originalIndex === c) return 'correct'
  if (game.selectedAnswer === idx) return 'wrong'
  return 'dimmed'
}
const rankInfo = computed(() => {
  const s = game.score
  if (s >= 18)
    return {
      title: t('end.ranks.expert.title'),
      desc: t('end.ranks.expert.desc')
    }
  if (s >= 10)
    return {
      title: t('end.ranks.intermediate.title'),
      desc: t('end.ranks.intermediate.desc')
    }
  return {
    title: t('end.ranks.beginner.title'),
    desc: t('end.ranks.beginner.desc')
  }
})

// LISTE UNIQUE (Sert pour Inputs ET Share)
const socialNetworks = computed(() => {
  const nets = getI18nArray('end.share_modal.networks')
  return nets as UnifiedNetworkConfig[]
})
</script>

<template>
  <div class="quiz-module">
    <header class="quiz-header">
      <div class="header-top">
        <div
          class="lang-switcher"
          :style="{
            visibility: game.status === 'start' ? 'visible' : 'hidden'
          }"
        >
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
          <span class="level-badge" :class="game.difficulty">{{
            t('levels.' + game.difficulty + '.label')
          }}</span>
          <span class="score-value"
            >{{ game.score }} / {{ game.questions.length }}</span
          >
        </div>
      </div>
      <div class="logo-area">{{ t('header.brand') }}</div>
      <div class="progress-bar" v-if="game.status === 'playing'">
        <div class="fill" :style="{ width: progress + '%' }"></div>
      </div>
    </header>

    <div v-if="ui.isLoading" class="screen loading-screen">
      <div class="loader-spinner"></div>
      <p>{{ t('ui.loading') }}</p>
    </div>
    <div v-else-if="ui.error" class="screen error-screen">
      <h3 style="color: #d32f2f">{{ t('ui.error_title') }}</h3>
      <p>{{ ui.error }}</p>
      <button class="btn-primary" @click="reloadPage">
        {{ t('ui.btn_retry') }}
      </button>
    </div>

    <div v-else-if="game.status === 'start'" class="screen start-screen">
      <h1>{{ t('start.title') }}</h1>
      <p class="subtitle">{{ t('start.subtitle') }}</p>
      <div class="icon-hero">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path
            d="M12 3L1 9L12 15L21 10.09V17H23V9M5 13.18V17.18L12 21L19 17.18V13.18L12 17L5 13.18Z"
          />
        </svg>
      </div>
      <div class="difficulty-selector">
        <p>{{ t('start.choose_level') }}</p>
        <button
          v-for="id in LEVEL_IDS"
          :key="id"
          class="btn-diff"
          :class="id"
          @click="startGame(id)"
        >
          {{ t('levels.' + id + '.icon') }} {{ t('levels.' + id + '.label') }}
        </button>
      </div>
    </div>

    <div v-else-if="game.status === 'playing'" class="screen game-screen">
      <div class="question-card">
        <span class="category-tag">{{ currentQuestion.category }}</span>
        <h2>{{ currentQuestion.question }}</h2>
      </div>
      <div class="options-grid">
        <button
          v-for="(opt, index) in game.shuffledOptions"
          :key="index"
          class="btn-option"
          :class="getOptionClass(index)"
          :disabled="game.hasAnswered || ui.isChecking"
          @click="selectAnswer(index)"
        >
          <span v-if="ui.verifyingIdx === index" class="mini-loader"></span
          ><span class="letter">{{ optionLetters[index] }}</span
          ><span class="text">{{ opt.text }}</span>
          <span
            v-if="
              game.showPointPopup && game.selectedAnswer === index && isCorrect
            "
            class="point-popup"
            >{{ t('game.point_popup') }}</span
          >
        </button>
      </div>
      <div
        v-if="game.hasAnswered"
        class="feedback-box"
        :class="isCorrect ? 'success' : 'error'"
      >
        <div class="feedback-header">
          {{ isCorrect ? t('game.correct') : t('game.wrong') }}
        </div>
        <div class="feedback-content">
          <strong>{{ t('game.argument_label') }}</strong>
          <p>{{ currentQuestion.explanation }}</p>
        </div>
        <button class="btn-next" @click="nextQuestion">
          {{ isLastQuestion ? t('game.btn_results') : t('game.btn_next') }}
        </button>
      </div>
    </div>

    <div v-else-if="game.status === 'end'" class="screen end-screen">
      <div class="score-circle">
        <span class="label-xp">{{ t('end.score_label') }}</span
        ><span class="big-score">{{ game.score }}</span
        ><span class="total">/ {{ game.questions.length }}</span>
      </div>
      <h3>{{ rankInfo.title }}</h3>
      <p class="rank-desc">{{ rankInfo.desc }}</p>

      <div v-if="!form.isSaved" class="save-form">
        <h4>{{ t('end.leaderboard_title') }}</h4>

        <div class="form-row main-row">
          <span class="prefix-icon">👤</span>
          <input
            type="text"
            v-model="form.name"
            :placeholder="t('end.placeholder_name')"
            maxlength="15"
            class="main-input"
          />
        </div>

        <div class="social-section" v-if="socialNetworks.length">
          <div class="social-bar">
            <button
              v-for="net in socialNetworks"
              :key="net.id"
              class="icon-btn"
              :class="{
                active: visibleNetworks.includes(net.id) || form.socials[net.id]
              }"
              @click="toggleInputNetwork(net.id)"
              :title="net.label"
            >
              {{ net.icon }}
            </button>
          </div>
          <transition-group name="slide">
            <div
              v-for="net in socialNetworks"
              :key="net.id"
              class="form-row social-row"
              v-show="visibleNetworks.includes(net.id) || form.socials[net.id]"
            >
              <span class="prefix-icon social-icon">{{ net.icon }}</span>
              <input
                type="text"
                v-model="form.socials[net.id]"
                :placeholder="net.label"
              />
              <button class="close-btn" @click="clearInputSocial(net.id)">
                ×
              </button>
            </div>
          </transition-group>
        </div>

        <div class="form-row secondary-row">
          <span class="prefix-icon">#</span>
          <input
            type="text"
            v-model="form.memberId"
            :placeholder="t('end.placeholder_id')"
          />
        </div>

        <div class="actions-row">
          <button
            class="btn-primary"
            @click="submitScore"
            :disabled="!form.name || ui.isLoading"
          >
            {{ ui.isLoading ? '...' : t('end.btn_save') }}
          </button>
          <button class="btn-skip" @click="game.status = 'start'">
            {{ t('end.btn_skip') }}
          </button>
        </div>
      </div>

      <div v-else class="leaderboard-wrapper">
        <div class="final-actions top-actions">
          <button
            class="btn-action-trigger"
            @click="openShareModal"
            :disabled="isGenerating"
          >
            {{ isGenerating ? '...' : t('end.share_modal.title') }}
          </button>
        </div>

        <div class="leaderboard-container">
          <h4>
            {{ t('end.top_10') }}
            {{ t('levels.' + game.difficulty + '.label').toUpperCase() }}
          </h4>
          <div class="leaderboard-scroll">
            <table class="leaderboard-table">
              <thead>
                <tr>
                  <th>{{ t('end.col_rank') }}</th>
                  <th>{{ t('end.col_name') }}</th>
                  <th>{{ t('end.col_score') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(entry, index) in form.leaderboard"
                  :key="index"
                  :class="{ 'current-user': entry.isUser, 'top-3': index < 3 }"
                >
                  <td class="rank">{{ index + 1 }}</td>
                  <td class="name">
                    <div class="name-row">
                      <span>{{ entry.name }}</span>
                      <span v-if="entry.memberId" class="badge-member"
                        >#{{ entry.memberId }}</span
                      >
                    </div>
                    <div
                      class="social-icons"
                      v-if="entry.socials && socialNetworks.length"
                    >
                      <template v-for="net in socialNetworks" :key="net.id">
                        <a
                          v-if="entry.socials[net.id]"
                          :href="entry.socials[net.id]"
                          target="_blank"
                          class="s-lnk"
                          >{{ net.icon }}</a
                        >
                      </template>
                    </div>
                  </td>
                  <td class="score-val">{{ entry.score }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="final-actions bottom-actions">
          <button class="btn-giant-restart" @click="game.status = 'start'">
            {{ t('end.btn_retry') }}
          </button>
          <a :href="t('end.btn_join.url')" target="_blank" class="link-join">{{
            t('end.btn_join.text')
          }}</a>
        </div>
      </div>
    </div>

    <div
      v-if="showShareModal"
      class="share-modal-overlay"
      @click.self="showShareModal = false"
    >
      <div class="share-modal-content">
        <h3>{{ t('end.share_modal.title') }}</h3>
        <p class="modal-hint">{{ t('end.share_modal.hint') }}</p>
        <div class="preview-img-container">
          <img
            v-if="generatedImageUrl"
            :src="generatedImageUrl"
            alt="Score"
            class="preview-img"
          />
        </div>
        <div class="share-buttons-grid">
          <button
            v-for="net in socialNetworks"
            :key="net.id"
            class="btn-network-option"
            :style="{ backgroundColor: net.color }"
            @click="handleShareClick(net)"
          >
            <span class="icon">{{ net.icon }}</span> {{ net.label }}
          </button>
        </div>
        <button class="btn-close-modal" @click="showShareModal = false">
          {{ t('end.share_modal.btn_close') }}
        </button>
      </div>
    </div>

    <div class="share-card-hidden" ref="shareCardRef">
      <div class="card-content">
        <div class="card-logo">{{ t('header.brand') }}</div>
        <div class="card-rank">{{ rankInfo.title }}</div>
        <div class="card-score-big">
          {{ game.score
          }}<span class="small">/{{ game.questions.length }}</span>
        </div>
        <div class="card-text">{{ t('end.share_card.tagline') }}</div>
        <div class="card-footer">{{ t('end.share_card.website') }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/scss/abstracts/variables' as *;
@use '@/assets/scss/abstracts/mixins' as *;
@use 'sass:color';

.quiz-module {
  width: 100%;
  max-width: 600px;
  margin: auto;
  background: transparent;
  min-height: 500px;
  position: relative;
  display: flex;
  flex-direction: column;
}

/* HEADER */
.quiz-header {
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  .header-top {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 10px;
  }
  .logo-area {
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 2px;
    border-bottom: 3px solid $prohib-black;
    padding-bottom: 5px;
    margin-bottom: 15px;
  }
}
.lang-switcher {
  display: flex;
  gap: 15px;
  button {
    background: transparent;
    border: none;
    color: $prohib-black;
    opacity: 0.5;
    font-weight: 900;
    cursor: pointer;
    padding: 0;
    transition: opacity 0.2s;
    &:hover,
    &.active {
      opacity: 1;
    }
    &.active {
      text-decoration: underline;
    }
  }
}
.score-display {
  background: $prohib-black;
  color: $highlight-green;
  padding: 5px 10px;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
  font-family: $font-mono;
  .level-badge {
    font-size: 0.7rem;
    color: white;
    text-transform: uppercase;
    &.easy {
      color: $light-green;
    }
    &.medium {
      color: $highlight-green;
    }
    &.hard {
      color: $reg-green;
    }
  }
  .score-value {
    font-size: 1.1rem;
    font-weight: bold;
  }
}
.progress-bar {
  width: 100%;
  height: 6px;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 3px;
  overflow: hidden;
  .fill {
    height: 100%;
    background: $reg-green;
    transition: width 0.3s ease;
  }
}

/* ECRANS */
.screen {
  width: 100%;
}
.loading-screen,
.error-screen,
.start-screen,
.end-screen {
  text-align: center;
  justify-content: center;
}

/* ANIMATIONS FLUIDES */
.btn-diff,
.btn-option,
.btn-primary,
.btn-action-trigger,
.btn-network-option,
.icon-btn,
.btn-close-modal {
  transition:
    transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1),
    filter 0.2s ease,
    box-shadow 0.2s ease;
  will-change: transform;
}

/* START */
.start-screen {
  h1 {
    font-size: 2.5rem;
    line-height: 1;
    margin: 0 0 10px 0;
    text-transform: uppercase;
  }
  .subtitle {
    font-size: 1.1rem;
    opacity: 0.8;
    margin-bottom: 30px;
  }
  .icon-hero {
    width: 80px;
    height: 80px;
    margin-bottom: 20px;
    color: $reg-green;
    svg {
      width: 100%;
      height: 100%;
    }
  }
}
.difficulty-selector {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  max-width: 300px;
  margin: auto;
  p {
    font-weight: bold;
    opacity: 0.7;
    margin-bottom: 5px;
  }
}
.btn-diff {
  padding: 15px;
  border: 2px solid $prohib-black;
  background: white;
  color: $prohib-black;
  font-family: $font-main;
  font-weight: 800;
  text-transform: uppercase;
  cursor: pointer;
  font-size: 1rem;
  &:hover {
    transform: translateX(5px);
    box-shadow: -5px 5px 0 $prohib-black;
  }
  &.easy {
    border-color: $light-green;
    &:hover {
      background: $light-green;
      color: white;
    }
  }
  &.medium {
    border-color: $highlight-green;
    &:hover {
      background: $highlight-green;
      color: white;
    }
  }
  &.hard {
    border-color: $reg-green;
    &:hover {
      background: $reg-green;
      color: white;
    }
  }
}

/* JEU */
.question-card {
  text-align: center;
  margin-bottom: 30px;
  .category-tag {
    background: $prohib-black;
    color: white;
    padding: 4px 8px;
    font-size: 0.7rem;
    text-transform: uppercase;
    font-weight: bold;
    border-radius: 2px;
  }
  h2 {
    font-size: 1.3rem;
    margin-top: 15px;
    line-height: 1.3;
  }
}
.options-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
  width: 100%;
}
.btn-option {
  background: white;
  border: 2px solid $prohib-black;
  padding: 15px;
  text-align: left;
  font-family: $font-main;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  position: relative;
  overflow: hidden;
  .letter {
    background: $prohib-black;
    color: white;
    width: 24px;
    height: 24px;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 0.8rem;
    margin-right: 15px;
    font-weight: bold;
    flex-shrink: 0;
  }
  .mini-loader {
    width: 16px;
    height: 16px;
    border: 3px solid rgba(0, 0, 0, 0.1);
    border-left-color: $prohib-black;
    border-radius: 50%;
    margin-right: 15px;
    animation: spin 1s linear infinite;
    display: inline-block;
  }
  &:hover:not(:disabled) {
    background: $prohib-black;
    color: white;
    .letter {
      background: white;
      color: black;
    }
  }
  &.is-verifying {
    background: color.scale($prohib-black, $lightness: 90%);
    cursor: wait;
    .letter {
      display: none;
    }
    .mini-loader {
      display: inline-block;
    }
  }
  &.correct {
    background: $reg-green;
    border-color: $reg-green;
    color: white;
    .letter {
      background: white;
      color: $reg-green;
    }
  }
  &.wrong {
    background: $error-red;
    border-color: $error-red;
    color: white;
    opacity: 0.8;
    .letter {
      background: white;
      color: $error-red;
    }
  }
  &.dimmed {
    opacity: 0.4;
    cursor: default;
  }
  &:disabled:not(.is-verifying):not(.correct):not(.wrong) {
    cursor: not-allowed;
    opacity: 0.6;
  }
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
.point-popup {
  position: absolute;
  right: 15px;
  top: 50%;
  transform: translateY(-50%);
  background: $highlight-green;
  color: $prohib-black;
  font-weight: 900;
  padding: 5px 10px;
  border-radius: 20px;
  animation: popUp 0.6s ease-out forwards;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
}
@keyframes popUp {
  0% {
    transform: translateY(0) scale(0.5);
    opacity: 0;
  }
  50% {
    transform: translateY(-10px) scale(1.1);
    opacity: 1;
  }
  100% {
    transform: translateY(-20px) scale(1);
    opacity: 0;
  }
}

/* FEEDBACK */
.feedback-box {
  margin-top: 25px;
  width: 100%;
  background: white;
  border: 2px solid;
  padding: 20px;
  text-align: left;
  box-shadow: 5px 5px 0 rgba(0, 0, 0, 0.1);
  animation: slideUp 0.3s ease;
  &.success {
    border-color: $reg-green;
  }
  &.error {
    border-color: $error-red;
  }
  .feedback-header {
    font-weight: 900;
    text-transform: uppercase;
    font-size: 1.1rem;
    margin-bottom: 10px;
  }
  .feedback-content {
    font-size: 0.9rem;
    line-height: 1.4;
    margin-bottom: 20px;
    strong {
      display: block;
      margin-bottom: 5px;
      color: $prohib-black;
    }
  }
}
.btn-next {
  @include btn-base;
  background: $prohib-black;
  &:hover {
    background: color.adjust($prohib-black, $lightness: 15%);
  }
}

/* FIN & FORM */
.end-screen {
  .score-circle {
    width: 120px;
    height: 120px;
    background: $prohib-black;
    color: white;
    border-radius: 50%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    margin-bottom: 20px;
    border: 4px solid $reg-green;
    .label-xp {
      font-size: 0.7rem;
      color: $highlight-green;
      margin-bottom: 5px;
    }
    .big-score {
      font-family: $font-mono;
      font-size: 3.5rem;
      line-height: 1;
    }
    .total {
      font-size: 0.9rem;
      opacity: 0.7;
    }
  }
  h3 {
    font-size: 1.6rem;
    margin: 0 0 10px 0;
    text-transform: uppercase;
  }
  .rank-desc {
    font-size: 1rem;
    margin-bottom: 20px;
    max-width: 400px;
  }
}

/* CONTAINER FORM */
.save-form {
  width: 100%;
  max-width: 400px;
  background: white;
  padding: 25px;
  border: 2px solid $prohib-black;
  margin: auto;
  margin-bottom: 20px;
  text-align: left;
  box-shadow: 5px 5px 0 rgba(0, 0, 0, 0.05);
  h4 {
    margin: 0 0 20px 0;
    text-transform: uppercase;
    font-size: 1rem;
    letter-spacing: 1px;
    text-align: center;
  }
}

.form-row {
  display: flex;
  align-items: center;
  background: #f9f9f9;
  border: 2px solid #ddd;
  border-radius: 8px;
  margin-bottom: 12px;
  transition:
    border-color 0.2s,
    background 0.2s;
  &:focus-within {
    border-color: $prohib-black;
    background: white;
  }
  .prefix-icon {
    width: 40px;
    text-align: center;
    font-size: 1.1rem;
    color: #666;
    border-right: 1px solid #eee;
    flex-shrink: 0;
  }
  input {
    width: 100%;
    padding: 12px 10px;
    border: none;
    background: transparent;
    font-family: $font-main;
    font-size: 0.95rem;
    outline: none;
    color: $prohib-black;
    &::placeholder {
      color: #aaa;
      font-weight: normal;
    }
  }
}
.main-row {
  border-color: $prohib-black;
  .main-input {
    font-weight: bold;
    font-size: 1.1rem;
  }
}

/* SOCIAL SECTION (ACCORDÉON INPUTS) */
.social-section {
  margin: 20px 0;
  padding-bottom: 15px;
  border-bottom: 1px dashed #ddd;
  .label-tiny {
    font-size: 0.7rem;
    color: #999;
    text-transform: uppercase;
    letter-spacing: 1px;
    font-weight: 800;
    margin-bottom: 10px;
    display: block;
  }
}
.social-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 10px;
  .icon-btn {
    width: 42px;
    height: 42px;
    border-radius: 50%;
    border: 2px solid #eee;
    background: white;
    font-size: 1.2rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ccc;
    opacity: 0.7;
    filter: grayscale(1);

    transition:
      transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1),
      filter 0.2s ease,
      box-shadow 0.2s ease;

    &:hover {
      transform: scale(1.1);
      border-color: #ccc;
      opacity: 1;
      filter: grayscale(0);
    }
    &.active {
      border-color: $prohib-black;
      background: $prohib-black;
      color: white;
      opacity: 1;
      transform: scale(1.15);
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
      filter: grayscale(0);
    }
  }
}
.social-row {
  margin-bottom: 8px;
  animation: slideIn 0.25s ease-out;
  border-color: #eee;
  .social-icon {
    font-size: 1rem;
    width: 36px;
  }
  input {
    font-size: 0.9rem;
    padding: 10px;
  }
  .close-btn {
    width: 30px;
    background: transparent;
    border: none;
    font-size: 1.2rem;
    color: #ccc;
    cursor: pointer;
    &:hover {
      color: $error-red;
    }
  }
}
@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease;
}
.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
  height: 0;
  margin: 0;
  overflow: hidden;
}

/* ACTIONS */
.final-actions {
  width: 100%;
  max-width: 450px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
  margin-top: 10px;
}
.top-actions {
  margin-bottom: 20px;
}
.actions-row {
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.btn-skip {
  background: transparent;
  border: none;
  color: $prohib-black;
  cursor: pointer;
  font-family: $font-main;
  font-size: 0.85rem;
  text-decoration: underline;
  opacity: 0.6;
  width: 100%;
  &:hover {
    opacity: 1;
    color: $error-red;
  }
}

/* --- SHARE BUTTON (VIRAL - DOUBLE LAYER) --- */
.btn-action-trigger {
  @include btn-base;
  position: relative;
  z-index: 1;
  background: transparent;
  overflow: hidden;
  color: white;
  width: 100%;
  margin-bottom: 10px;
  font-weight: bold;
  box-shadow: 0 4px 15px rgba(200, 50, 100, 0.3);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background-color: $reg-green;
    z-index: -2;
  }
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    z-index: -1;
    opacity: 1;
    background: linear-gradient(
      45deg,
      #f09433 0%,
      #e6683c 25%,
      #dc2743 50%,
      #cc2366 75%,
      #bc1888 100%
    );
    transition: opacity 0.4s ease;
  }
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
    &::after {
      opacity: 0;
    }
  }
  &:active {
    transform: translateY(0);
  }
  &:disabled {
    opacity: 0.7;
    cursor: wait;
  }
}

/* MODALE PARTAGE */
.share-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  z-index: 999;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
  animation: fadeIn 0.2s;
}
.share-modal-content {
  background: white;
  width: 100%;
  max-width: 400px;
  border-radius: 12px;
  padding: 25px;
  text-align: center;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
  animation: slideUpModal 0.3s;
  h3 {
    margin-top: 0;
    text-transform: uppercase;
    color: $prohib-black;
  }
  .modal-hint {
    font-size: 0.9rem;
    color: #666;
    margin-bottom: 20px;
  }
}
.preview-img-container {
  margin-bottom: 20px;
  img {
    max-width: 100%;
    border-radius: 8px;
    border: 1px solid #ddd;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  }
}
.share-buttons-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
  margin-bottom: 20px;
}
.btn-network-option {
  border: none;
  padding: 12px;
  border-radius: 8px;
  color: white;
  font-family: $font-main;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 0.9rem;
  transition:
    transform 0.2s ease,
    filter 0.2s ease;
  will-change: transform;
  &:hover {
    filter: brightness(1.1);
    transform: translateY(-2px);
  }
  &:active {
    transform: translateY(0);
  }
}
.btn-close-modal {
  background: transparent;
  border: 2px solid #ccc;
  padding: 8px 20px;
  border-radius: 20px;
  cursor: pointer;
  font-weight: bold;
  color: #666;
  &:hover {
    border-color: $prohib-black;
    color: $prohib-black;
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
@keyframes slideUpModal {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* CARTE CACHÉE */
.share-card-hidden {
  position: fixed;
  left: -9999px;
  top: 0;
  width: 1080px;
  height: 1080px;
  background: $prohib-black;
  color: white;
  display: flex;
  justify-content: center;
  align-items: center;
  font-family: $font-main;
  text-align: center;
  z-index: -1;
  .card-content {
    border: 20px solid $reg-green;
    width: 90%;
    height: 90%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    background: radial-gradient(circle, #2a2a2a 0%, #1a1a1a 100%);
    border-radius: 40px;
    padding: 50px;
  }
  .card-logo {
    font-size: 3rem;
    font-weight: 900;
    letter-spacing: 10px;
    margin-bottom: 40px;
    opacity: 0.8;
  }
  .card-rank {
    font-size: 5rem;
    text-transform: uppercase;
    color: $highlight-green;
    font-weight: 800;
    margin-bottom: 20px;
  }
  .card-score-big {
    font-size: 18rem;
    font-family: $font-mono;
    font-weight: bold;
    line-height: 1;
    color: white;
    text-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    .small {
      font-size: 6rem;
      opacity: 0.5;
    }
  }
  .card-text {
    font-size: 2.5rem;
    margin-top: 40px;
    line-height: 1.4;
    font-style: italic;
    white-space: pre-wrap;
  }
  .card-footer {
    margin-top: auto;
    font-size: 2rem;
    font-weight: bold;
    background: white;
    color: $prohib-black;
    padding: 10px 40px;
    border-radius: 50px;
  }
}

/* LEADERBOARD TABLE */
.leaderboard-wrapper {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.leaderboard-container {
  width: 100%;
  max-width: 450px;
  animation: slideUp 0.3s ease;
  margin-bottom: 10px;
  h4 {
    margin: 0 0 10px 0;
    text-transform: uppercase;
    font-size: 1rem;
    border-bottom: 3px solid $prohib-black;
    display: inline-block;
  }
}
.leaderboard-scroll {
  max-height: 250px;
  overflow-y: auto;
  border: 2px solid $prohib-black;
}
.leaderboard-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  font-family: $font-main;
  thead th {
    padding: 8px;
    text-align: left;
    text-transform: uppercase;
    font-size: 0.8rem;
    position: sticky;
    top: 0;
    background: $prohib-black;
    color: white;
  }
  tbody tr {
    border-bottom: 1px solid #eee;
    td {
      padding: 8px;
      font-size: 0.9rem;
    }
    .rank {
      font-weight: bold;
      width: 30px;
      text-align: center;
    }
    .score-val {
      font-weight: bold;
      text-align: right;
      color: $reg-green;
    }
    .badge-member {
      font-size: 0.7rem;
      background: #eee;
      padding: 2px 4px;
      border-radius: 4px;
      margin-left: 5px;
      color: #666;
    }
    .name-row {
      display: flex;
      align-items: center;
    }
    .social-icons {
      display: flex;
      gap: 5px;
      margin-top: 3px;
    }
    .s-lnk {
      text-decoration: none;
      font-size: 0.8rem;
      opacity: 0.7;
      transition: transform 0.2s;
      &:hover {
        transform: scale(1.2);
        opacity: 1;
      }
    }
    &.top-3 .rank {
      color: $gold;
      font-size: 1.1rem;
    }
    &:nth-child(2) .rank {
      color: $silver;
    }
    &:nth-child(3) .rank {
      color: $bronze;
    }
    &.current-user {
      background: rgba(76, 175, 80, 0.15);
      border-left: 4px solid $reg-green;
      font-weight: bold;
      .name {
        color: $reg-green;
        text-transform: uppercase;
      }
    }
  }
}
.link-join {
  color: $prohib-black;
  font-weight: 700;
  text-decoration: none;
  font-size: 0.9rem;
  border-bottom: 2px solid transparent;
  transition: border-color 0.2s;
  &:hover {
    border-bottom-color: $reg-green;
    color: $reg-green;
  }
}
</style>
