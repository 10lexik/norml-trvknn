<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import { useI18n } from 'vue-i18n'
import confetti from 'canvas-confetti'

// --- 1. IMPORTS & FALLBACKS ---
// On garde les fichiers locaux comme sécurité si le réseau plante
import fr from '../locales/fr.json'
import en from '../locales/en.json'
import es from '../locales/es.json'

// --- 2. TYPES & INTERFACES ---
interface Question {
  _id: string
  category: string
  question: string
  options: string[]
  correct?: number
  explanation?: string
}

interface LeaderboardEntry {
  name: string
  score: number
  memberId?: string
  isUser?: boolean
}

// --- 3. CONFIGURATION ---
const LEVEL_IDS = ['easy', 'medium', 'hard']
const { t, tm, locale, setLocaleMessage } = useI18n()

const availableLocales = ['fr', 'en', 'es']

// Initialisation i18n avec les données locales
setLocaleMessage('fr', fr)
setLocaleMessage('en', en)
setLocaleMessage('es', es)

// --- 4. ÉTATS DU JEU (REACTIVE) ---

// État de l'interface (Loading, Erreurs, Feedback visuel)
const ui = reactive({
  isLoading: false, // Chargement global (au début)
  isChecking: false, // Empêche le double-clic
  verifyingIdx: null as number | null, // Index du bouton qui "tourne"
  error: null as string | null // Message d'erreur API
})

// État de la partie en cours
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

// État du Leaderboard & Formulaire
const form = reactive({
  name: '',
  memberId: '',
  isSaved: false,
  leaderboard: [] as LeaderboardEntry[]
})

// --- 5. LOGIQUE "HEADLESS CMS" ---
// Récupère les textes (Titres, Menus) depuis MongoDB sans les questions
const hydrateContent = async () => {
  try {
    const res = await fetch(`/api/get_content?lang=${locale.value}`)
    if (res.ok) {
      const remoteData = await res.json()
      // Si données reçues, on écrase les textes locaux
      if (remoteData && Object.keys(remoteData).length > 0) {
        setLocaleMessage(locale.value, remoteData)
      }
    }
  } catch (e) {
    // Silencieux : on reste sur le fichier local en cas d'erreur
  }
}

// --- 6. CYCLE DE VIE ---
onMounted(async () => {
  // 1. Charger les textes CMS (Non bloquant)
  hydrateContent()

  // 2. Charger le leaderboard local
  const saved = localStorage.getItem('norml_quiz_scores')

  // On récupère les mocks depuis le JSON (local ou distant)
  const mocks = getI18nArray('end.mock_leaderboard') as LeaderboardEntry[]
  let data = [...mocks]

  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed)) data = [...data, ...parsed]
    } catch (e) {
      console.error(e)
    }
  }

  form.leaderboard = data.sort((a, b) => b.score - a.score).slice(0, 20)
})

// --- 7. ACTIONS DU JEU ---

// Changement de langue
const setLang = async (l: string) => {
  locale.value = l
  await hydrateContent() // On recharge le contenu CMS pour la nouvelle langue
}

// Lancer une partie
const startGame = async (difficulty: string) => {
  ui.isLoading = true
  ui.error = null

  // Reset des états
  game.difficulty = difficulty
  game.score = 0
  game.currentQIndex = 0
  form.isSaved = false
  form.name = ''

  try {
    // Appel API pour récupérer les questions (MongoDB)
    const res = await fetch(
      `/api/start_game?lang=${locale.value}&level=${difficulty}`
    )
    if (!res.ok) throw new Error(t('errors.fetch_fail'))

    const data = await res.json()
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

// Préparer la question (mélanger les options)
const prepareNewQuestion = () => {
  const q = game.questions[game.currentQIndex]
  if (!q) return
  game.shuffledOptions = q.options
    .map((opt, idx) => ({ text: opt, originalIndex: idx }))
    .sort(() => 0.5 - Math.random())
}

// Vérifier une réponse (Appel API sécurisé)
const selectAnswer = async (visualIndex: number) => {
  if (game.hasAnswered || ui.isChecking) return

  ui.isChecking = true
  ui.verifyingIdx = visualIndex
  game.selectedAnswer = visualIndex

  const currentQ = game.questions[game.currentQIndex]
  const selectedOpt = game.shuffledOptions[visualIndex]

  try {
    const res = await fetch('/api/check_answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questionId: currentQ._id,
        userIndex: selectedOpt.originalIndex
      })
    })

    const result = await res.json()

    // Mise à jour du score et de la question (révélation)
    if (result.correct) {
      game.score++
      game.showPointPopup = true
    }
    currentQ.correct = result.correctIndex
    currentQ.explanation = result.explanation
    game.hasAnswered = true
  } catch (e) {
    console.error(e)
  } finally {
    ui.isChecking = false
    ui.verifyingIdx = null
  }
}

// Passer à la suite
const nextQuestion = () => {
  if (game.currentQIndex === game.questions.length - 1) {
    endGame()
  } else {
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
  // Confettis si bon score (> 75%)
  if (game.score >= game.questions.length * 0.75) {
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#297534', '#4CAF50', '#E4E9D5']
    })
  }
}

// Sauvegarder le score (Local pour l'instant, bientôt API)
const submitScore = () => {
  if (!form.name) return

  const entry: LeaderboardEntry = {
    name: form.name,
    score: game.score,
    memberId: form.memberId,
    isUser: true
  }

  form.leaderboard.push(entry)
  form.leaderboard.sort((a, b) => b.score - a.score) // Tri immédiat
  form.leaderboard = form.leaderboard.slice(0, 20) // Garde top 20

  // Persistance LocalStorage
  const existing = localStorage.getItem('norml_quiz_scores')
  let history = existing ? JSON.parse(existing) : []
  history.push(entry)
  localStorage.setItem('norml_quiz_scores', JSON.stringify(history))

  form.isSaved = true
}

// --- 8. HELPERS (COMPUTED) ---

// Helper pour récupérer des tableaux depuis i18n
const getI18nArray = (key: string): any[] => {
  const data = tm(key)
  return Array.isArray(data)
    ? data
    : data && typeof data === 'object'
      ? Object.values(data)
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
  const opt = game.shuffledOptions[game.selectedAnswer]
  return opt && opt.originalIndex === currentQuestion.value.correct
})

const isLastQuestion = computed(
  () => game.currentQIndex === game.questions.length - 1
)
const progress = computed(() =>
  game.questions.length
    ? ((game.currentQIndex + 1) / game.questions.length) * 100
    : 0
)

// Gestion des classes CSS des boutons réponses
const getOptionClass = (idx: number) => {
  if (ui.verifyingIdx === idx) return 'is-verifying'
  if (!game.hasAnswered || currentQuestion.value.correct === undefined)
    return ''

  const opt = game.shuffledOptions[idx]
  const correctIdx = currentQuestion.value.correct

  if (opt.originalIndex === correctIdx) return 'correct'
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
          <span class="level-badge" :class="game.difficulty">
            {{ t('levels.' + game.difficulty + '.label') }}
          </span>
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
      <button class="btn-primary" @click="() => window.location.reload()">
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
          <span v-if="ui.verifyingIdx === index" class="mini-loader"></span>
          <span class="letter">{{ optionLetters[index] }}</span>
          <span class="text">{{ opt.text }}</span>

          <span
            v-if="
              game.showPointPopup && game.selectedAnswer === index && isCorrect
            "
            class="point-popup"
          >
            {{ t('game.point_popup') }}
          </span>
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
        <span class="label-xp">{{ t('end.score_label') }}</span>
        <span class="big-score">{{ game.score }}</span>
        <span class="total">/ {{ game.questions.length }}</span>
      </div>

      <h3>{{ rankInfo.title }}</h3>
      <p class="rank-desc">{{ rankInfo.desc }}</p>

      <div v-if="!form.isSaved" class="save-form">
        <h4>{{ t('end.leaderboard_title') }}</h4>
        <div class="input-group">
          <input
            type="text"
            v-model="form.name"
            :placeholder="t('end.placeholder_name')"
            maxlength="15"
          />
        </div>
        <div class="input-group">
          <input
            type="text"
            v-model="form.memberId"
            :placeholder="t('end.placeholder_id')"
          />
        </div>
        <button class="btn-primary" @click="submitScore" :disabled="!form.name">
          {{ t('end.btn_save') }}
        </button>
        <button class="btn-skip" @click="game.status = 'start'">
          {{ t('end.btn_skip') }}
        </button>
      </div>

      <div v-else class="leaderboard-wrapper">
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
                    {{ entry.name }}
                    <span v-if="entry.memberId" class="badge-member"
                      >#{{ entry.memberId }}</span
                    >
                  </td>
                  <td class="score-val">{{ entry.score }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="final-actions">
          <button class="btn-giant-restart" @click="game.status = 'start'">
            {{ t('end.btn_retry') }}
          </button>
          <a :href="t('end.btn_join.url')" target="_blank" class="link-join">{{
            t('end.btn_join.text')
          }}</a>
        </div>
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

/* ECRANS GÉNÉRAUX */
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
  transition: all 0.2s;
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
  transition: all 0.2s;
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

/* FIN */
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

/* FORMULAIRE & TABLE */
.save-form {
  width: 100%;
  max-width: 400px;
  background: white;
  padding: 20px;
  border: 2px solid $prohib-black;
  margin-bottom: 20px;
  text-align: left;
  margin: auto;
  h4 {
    margin: 0 0 15px 0;
    text-transform: uppercase;
    font-size: 1rem;
  }
  .input-group {
    margin-bottom: 15px;
    input {
      width: 100%;
      padding: 12px;
      border: 2px solid #ccc;
      font-family: $font-main;
      font-size: 1rem;
      background: #f9f9f9;
      &:focus {
        border-color: $reg-green;
        outline: none;
        background: white;
      }
    }
  }
}
.btn-skip {
  background: transparent;
  border: none;
  color: $prohib-black;
  margin-top: 15px;
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
.final-actions {
  width: 100%;
  max-width: 450px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
  margin-top: 10px;
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
