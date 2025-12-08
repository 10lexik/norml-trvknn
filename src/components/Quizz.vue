<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import confetti from 'canvas-confetti'

// Import des JSONs LOCAUX (Pour l'interface uniquement)
import fr from '../locales/fr.json'
import en from '../locales/en.json'
import es from '../locales/es.json'

// --- 1. INTERFACES ---
interface Question {
  _id: string // ID technique MongoDB
  category: string
  question: string
  options: string[]
  correct?: number // Optionnel car absent avant la réponse API
  explanation?: string // Optionnel car absent avant la réponse API
}

interface LeaderboardEntry {
  name: string
  score: number
  memberId?: string
  isUser?: boolean
}

interface ShuffledOption {
  text: string
  originalIndex: number
}

// --- 2. CONFIGURATION ---
const LEVELS_CONFIG = [
  { id: 'easy', icon: '🌱' },
  { id: 'medium', icon: '🌿' },
  { id: 'hard', icon: '🌳' }
]

const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  { name: 'Marie-Jeanne', score: 20, memberId: '0420' },
  { name: 'Jack Herer', score: 19 },
  { name: 'Militant75', score: 18, memberId: '1312' }
]

const LETTERS = ['A', 'B', 'C', 'D']

// --- 3. ÉTATS (REFS) ---
const { t, locale, setLocaleMessage } = useI18n()

// Chargement & Données
const isLoading = ref(false)
const isChecking = ref(false)
const apiError = ref<string | null>(null)

// Interface : on charge les fichiers locaux par défaut
const availableLocales = ['fr', 'en', 'es']
setLocaleMessage('fr', fr)
setLocaleMessage('en', en)
setLocaleMessage('es', es)

// Jeu
const gameState = ref<'start' | 'playing' | 'end'>('start')
const currentQIndex = ref(0)
const score = ref(0)
const selectedAnswer = ref<number | null>(null)
const hasAnswered = ref(false)
const selectedDifficulty = ref<string>('medium')

const questions = ref<Question[]>([])
const currentShuffledOptions = ref<ShuffledOption[]>([])

// Leaderboard
const userName = ref('')
const userMemberId = ref('')
const scoreSaved = ref(false)
const leaderboard = ref<LeaderboardEntry[]>([...MOCK_LEADERBOARD])
const showPointPopup = ref(false)

// --- 4. CYCLE DE VIE ---
onMounted(() => {
  const savedScores = localStorage.getItem('norml_quiz_scores')
  if (savedScores) {
    try {
      const parsed = JSON.parse(savedScores) as LeaderboardEntry[]
      leaderboard.value = [...MOCK_LEADERBOARD, ...parsed]
      sortLeaderboard()
    } catch (e) {
      console.error(e)
    }
  }
})

// --- 5. LOGIQUE DU JEU ---

const setLang = (l: string) => {
  locale.value = l
}

const prepareNewQuestion = () => {
  const q = questions.value[currentQIndex.value]
  if (!q) return

  const opts = q.options.map((opt, idx) => ({
    text: opt,
    originalIndex: idx
  }))

  currentShuffledOptions.value = opts.sort(() => 0.5 - Math.random())
}

// Démarrage SÉCURISÉ via API
const startGame = async (difficulty: string) => {
  isLoading.value = true
  selectedDifficulty.value = difficulty
  score.value = 0
  currentQIndex.value = 0
  scoreSaved.value = false
  userName.value = ''
  apiError.value = null

  try {
    const res = await fetch(
      `/api/start_game?lang=${locale.value}&level=${difficulty}`
    )
    if (!res.ok) throw new Error('Erreur chargement questions')

    const data = (await res.json()) as Question[]

    if (!data || data.length === 0) {
      throw new Error('Aucune question disponible.')
    }

    questions.value = data
    prepareNewQuestion()

    resetStep()
    gameState.value = 'playing'
  } catch (e: any) {
    console.error(e)
    apiError.value = 'Impossible de lancer le jeu. Serveur indisponible.'
  } finally {
    isLoading.value = false
  }
}

// Vérification SÉCURISÉE via API
const selectAnswer = async (visualIndex: number) => {
  if (hasAnswered.value || isChecking.value) return

  isChecking.value = true
  selectedAnswer.value = visualIndex

  // 1. Récupération des objets
  const selectedOptionObj = currentShuffledOptions.value[visualIndex]
  const currentQ = questions.value[currentQIndex.value]

  // 2. SAFETY CHECK (La correction de ton erreur TS est ICI)
  if (!currentQ || !selectedOptionObj) {
    console.error('Erreur interne : Question ou Option introuvable')
    isChecking.value = false
    return
  }

  try {
    // 3. Appel API avec l'ID sécurisé
    const res = await fetch('/api/check_answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questionId: currentQ._id, // TypeScript est content car on a vérifié !currentQ au dessus
        userIndex: selectedOptionObj.originalIndex
      })
    })

    const result = await res.json()

    if (result.correct) {
      score.value++
      showPointPopup.value = true
    }

    // Mise à jour de la question locale avec la vérité du serveur
    currentQ.correct = result.correctIndex
    currentQ.explanation = result.explanation

    hasAnswered.value = true
  } catch (e) {
    console.error('Erreur vérification', e)
  } finally {
    isChecking.value = false
  }
}

const nextQuestion = () => {
  if (currentQIndex.value === questions.value.length - 1) {
    gameState.value = 'end'
    if (score.value >= 15) {
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#297534', '#4CAF50', '#E4E9D5']
      })
    }
  } else {
    currentQIndex.value++
    prepareNewQuestion()
    resetStep()
  }
}

const resetStep = () => {
  selectedAnswer.value = null
  hasAnswered.value = false
  showPointPopup.value = false
}

const resetGame = () => {
  gameState.value = 'start'
}

const submitScore = () => {
  if (!userName.value) return
  const newEntry: LeaderboardEntry = {
    name: userName.value,
    score: score.value,
    memberId: userMemberId.value,
    isUser: true
  }
  leaderboard.value.push(newEntry)
  sortLeaderboard()

  const existingData = localStorage.getItem('norml_quiz_scores')
  let userHistory = existingData ? JSON.parse(existingData) : []
  userHistory.push(newEntry)
  localStorage.setItem('norml_quiz_scores', JSON.stringify(userHistory))

  scoreSaved.value = true
}

const sortLeaderboard = () => {
  leaderboard.value.sort((a, b) => b.score - a.score)
  leaderboard.value = leaderboard.value.slice(0, 20)
}

const reloadPage = () => {
  window.location.reload()
}

// --- 6. COMPUTED ---
const currentQuestion = computed(
  () => questions.value[currentQIndex.value] || ({} as Question)
)

const isCorrect = computed(() => {
  if (
    selectedAnswer.value === null ||
    currentQuestion.value.correct === undefined
  )
    return false

  const selectedObj = currentShuffledOptions.value[selectedAnswer.value]
  return (
    selectedObj && selectedObj.originalIndex === currentQuestion.value.correct
  )
})

const isLastQuestion = computed(
  () => currentQIndex.value === questions.value.length - 1
)

const progress = computed(() => {
  if (questions.value.length === 0) return 0
  return ((currentQIndex.value + 1) / questions.value.length) * 100
})

const getOptionClass = (visualIndex: number) => {
  if (!hasAnswered.value || currentQuestion.value.correct === undefined)
    return ''

  const optionObj = currentShuffledOptions.value[visualIndex]
  const correctIndexOriginal = currentQuestion.value.correct

  if (optionObj && optionObj.originalIndex === correctIndexOriginal)
    return 'correct'

  if (
    selectedAnswer.value === visualIndex &&
    optionObj &&
    optionObj.originalIndex !== correctIndexOriginal
  )
    return 'wrong'
  return 'dimmed'
}

const rankTitle = computed(() => {
  if (score.value >= 18) return t('end.ranks.expert.title')
  if (score.value >= 10) return t('end.ranks.intermediate.title')
  return t('end.ranks.beginner.title')
})

const rankMessage = computed(() => {
  if (score.value >= 18) return t('end.ranks.expert.desc')
  if (score.value >= 10) return t('end.ranks.intermediate.desc')
  return t('end.ranks.beginner.desc')
})
</script>

<template>
  <div id="quiz-app">
    <div class="quiz-module">
      <header class="quiz-header">
        <div class="header-top">
          <div
            class="lang-switcher"
            :style="{
              visibility: gameState === 'start' ? 'visible' : 'hidden'
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

          <div class="score-display" v-if="gameState !== 'start'">
            <span class="level-badge" :class="selectedDifficulty">
              {{ t('levels.' + selectedDifficulty) }}
            </span>
            <span class="score-value"
              >{{ score }} / {{ questions.length }}</span
            >
          </div>
        </div>

        <div class="logo-area">NORML ACADEMY</div>

        <div class="progress-bar" v-if="gameState === 'playing'">
          <div class="fill" :style="{ width: progress + '%' }"></div>
        </div>
      </header>

      <div v-if="isLoading" class="screen loading-screen">
        <div class="loader-spinner"></div>
        <p>Chargement des données...</p>
      </div>

      <div v-else-if="apiError" class="screen error-screen">
        <h3 style="color: #d32f2f">Erreur</h3>
        <p>{{ apiError }}</p>
        <button class="btn-primary" @click="reloadPage">Réessayer</button>
      </div>

      <template v-else>
        <div v-if="gameState === 'start'" class="screen start-screen">
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
              v-for="level in LEVELS_CONFIG"
              :key="level.id"
              class="btn-diff"
              :class="level.id"
              @click="startGame(level.id)"
            >
              {{ level.icon }} {{ t('levels.' + level.id) }}
            </button>
          </div>
        </div>

        <div v-if="gameState === 'playing'" class="screen game-screen">
          <div class="question-card">
            <span class="category-tag">{{ currentQuestion.category }}</span>
            <h2>{{ currentQuestion.question }}</h2>
          </div>

          <div class="options-grid">
            <button
              v-for="(optObj, index) in currentShuffledOptions"
              :key="index"
              class="btn-option"
              :class="getOptionClass(index)"
              @click="selectAnswer(index)"
              :disabled="hasAnswered"
            >
              <span class="letter">{{ LETTERS[index] }}</span>
              <span class="text">{{ optObj.text }}</span>

              <span
                v-if="showPointPopup && selectedAnswer === index && isCorrect"
                class="point-popup"
              >
                {{ t('game.point_popup') }}
              </span>
            </button>
          </div>

          <div
            v-if="hasAnswered"
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

        <div v-if="gameState === 'end'" class="screen end-screen">
          <div class="score-circle">
            <span class="label-xp">{{ t('end.score_label') }}</span>
            <span class="big-score">{{ score }}</span>
            <span class="total">/ {{ questions.length }}</span>
          </div>

          <h3>{{ rankTitle }}</h3>
          <p class="rank-desc">{{ rankMessage }}</p>

          <div v-if="!scoreSaved" class="save-form">
            <h4>{{ t('end.leaderboard_title') }}</h4>

            <div class="input-group">
              <input
                type="text"
                v-model="userName"
                :placeholder="t('end.placeholder_name')"
                maxlength="15"
              />
            </div>
            <div class="input-group">
              <input
                type="text"
                v-model="userMemberId"
                :placeholder="t('end.placeholder_id')"
              />
            </div>

            <button
              class="btn-primary"
              @click="submitScore"
              :disabled="!userName"
            >
              {{ t('end.btn_save') }}
            </button>

            <button class="btn-skip" @click="resetGame">
              {{ t('end.btn_skip') }}
            </button>
          </div>

          <div v-else class="leaderboard-wrapper">
            <div class="leaderboard-container">
              <h4>
                {{ t('end.top_10') }}
                {{ t('levels.' + selectedDifficulty).toUpperCase() }}
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
                      v-for="(entry, index) in leaderboard"
                      :key="index"
                      :class="{
                        'current-user': entry.isUser,
                        'top-3': index < 3
                      }"
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
              <button class="btn-giant-restart" @click="resetGame">
                {{ t('end.btn_retry') }}
              </button>
              <a
                href="https://www.norml.fr/adherer/"
                target="_blank"
                class="link-join"
              >
                {{ t('end.btn_join') }}
              </a>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped lang="scss">
// Pas de changement dans ton CSS, il est parfait.
// Juste assure-toi d'avoir le style pour .loader-spinner si tu veux l'animation
.loader-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-left-color: #297534;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Le reste de ton CSS... */
/* --- IMPORTS & FONTS --- */
@import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Space+Grotesk:wght@400;600;700;800&display=swap');

:root {
  --poster-beige: #e4e9d5;
  --prohib-black: #141414;
  --reg-green: #297534;
  --highlight-green: #4caf50;
  --error-red: #d32f2f;
}

$font-main: 'Space Grotesk', sans-serif;
$font-mono: 'Share Tech Mono', monospace;

// Container Principal
#quiz-app {
  font-family: $font-main;
  background-color: #e4e9d5;
  color: #141414;
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background-image: radial-gradient(#d0d6c0 1px, transparent 1px);
  background-size: 20px 20px;
  width: 100%;
}

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
    border-bottom: 3px solid #141414;
    padding-bottom: 5px;
    margin-bottom: 15px;
  }
}

/* LANG SWITCHER */
.lang-switcher {
  display: flex;
  justify-content: center;
  gap: 15px;

  button {
    background: transparent;
    border: none;
    color: #141414;
    opacity: 0.5;
    font-size: 0.8rem;
    font-weight: 900;
    cursor: pointer;
    padding: 0;

    &:hover {
      opacity: 1;
    }
    &.active {
      opacity: 1;
      text-decoration: underline;
    }
  }
}

/* SCORE DISPLAY */
.score-display {
  background: #141414;
  color: #4caf50;
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
    margin-bottom: 2px;
    &.easy {
      color: #8bc34a;
    }
    &.medium {
      color: #4caf50;
    }
    &.hard {
      color: #297534;
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
    background: #297534;
    transition: width 0.3s ease;
  }
}

/* ECRANS */
.screen {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  animation: fadeIn 0.4s ease;
}

/* ACCUEIL */
.start-screen {
  text-align: center;
  justify-content: center;

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
    color: #297534;
    svg {
      width: 100%;
      height: 100%;
    }
  }
}

/* DIFFICULTÉ */
.difficulty-selector {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  max-width: 300px;

  p {
    font-weight: bold;
    opacity: 0.7;
    margin-bottom: 5px;
    font-size: 0.9rem;
  }
}

.btn-diff {
  padding: 15px;
  border: 2px solid #141414;
  background: white;
  color: #141414;
  font-family: $font-main;
  font-weight: 800;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 1rem;

  &:hover {
    transform: translateX(5px);
    box-shadow: -5px 5px 0 #141414;
  }

  &.easy {
    border-color: #8bc34a;
    &:hover {
      background: #8bc34a;
      color: white;
    }
  }
  &.medium {
    border-color: #4caf50;
    &:hover {
      background: #4caf50;
      color: white;
    }
  }
  &.hard {
    border-color: #297534;
    &:hover {
      background: #297534;
      color: white;
    }
  }
}

/* JEU */
.game-screen {
  width: 100%;
  box-sizing: border-box;
}

.question-card {
  text-align: center;
  margin-bottom: 30px;

  .category-tag {
    background: #141414;
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
  border: 2px solid #141414;
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
    background: #141414;
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

  &:hover:not(:disabled) {
    background: #141414;
    color: white;
    .letter {
      background: white;
      color: black;
    }
  }

  &.correct {
    background: #297534;
    border-color: #297534;
    color: white;
    .letter {
      background: white;
      color: #297534;
    }
  }

  &.wrong {
    background: #d32f2f;
    border-color: #d32f2f;
    color: white;
    opacity: 0.8;
    .letter {
      background: white;
      color: #d32f2f;
    }
  }

  &.dimmed {
    opacity: 0.4;
    cursor: default;
  }
}

.point-popup {
  position: absolute;
  right: 15px;
  top: 50%;
  transform: translateY(-50%);
  background: #4caf50;
  color: #141414;
  font-weight: 900;
  padding: 5px 10px;
  border-radius: 20px;
  animation: popUp 0.6s ease-out forwards;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
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
    border-color: #297534;
  }
  &.error {
    border-color: #d32f2f;
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
      color: #141414;
    }
  }
}

/* FIN & CLASSEMENT */
.end-screen {
  text-align: center;
  justify-content: center;

  .score-circle {
    width: 120px;
    height: 120px;
    background: #141414;
    color: white;
    border-radius: 50%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    margin-bottom: 20px;
    border: 4px solid #297534;

    .label-xp {
      font-size: 0.7rem;
      color: #4caf50;
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

/* FORMULAIRE SAUVEGARDE */
.save-form {
  width: 100%;
  max-width: 400px;
  background: white;
  padding: 20px;
  border: 2px solid #141414;
  margin-bottom: 20px;
  text-align: left;

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
      box-sizing: border-box;

      &:focus {
        border-color: #297534;
        outline: none;
        background: white;
      }
    }
  }
}

/* Bouton Skip */
.btn-skip {
  background: transparent;
  border: none;
  color: #141414;
  margin-top: 15px;
  cursor: pointer;
  font-family: $font-main;
  font-size: 0.85rem;
  text-decoration: underline;
  opacity: 0.6;
  width: 100%;
  transition: all 0.2s;

  &:hover {
    opacity: 1;
    color: #d32f2f;
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
    border-bottom: 3px solid #141414;
    display: inline-block;
  }
}

.leaderboard-scroll {
  max-height: 250px;
  overflow-y: auto;
  border: 2px solid #141414;
}

.leaderboard-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  font-family: $font-main;

  thead {
    background: #141414;
    color: white;
    th {
      padding: 8px;
      text-align: left;
      text-transform: uppercase;
      font-size: 0.8rem;
      position: sticky;
      top: 0;
    }
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
      color: #297534;
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
      color: #d4af37;
      font-size: 1.1rem;
    }
    &:nth-child(2) .rank {
      color: #c0c0c0;
    }
    &:nth-child(3) .rank {
      color: #cd7f32;
    }

    &.current-user {
      background: rgba(76, 175, 80, 0.15);
      border-left: 4px solid #297534;
      font-weight: bold;
      .name {
        color: #297534;
        text-transform: uppercase;
      }
    }
  }
}

/* BOUTONS ACTIONS FINAUX */
.final-actions {
  width: 100%;
  max-width: 450px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
  margin-top: 10px;
}

.btn-giant-restart {
  background: #141414;
  color: white;
  border: 3px solid #141414;
  padding: 18px 40px;
  font-family: $font-main;
  font-weight: 900;
  font-size: 1.2rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  cursor: pointer;
  width: 100%;
  border-radius: 50px;
  transition: all 0.2s ease;
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.15);
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;

  &:hover {
    transform: translateY(-3px) scale(1.02);
    box-shadow: 0 15px 30px rgba(0, 0, 0, 0.25);
    background: white;
    color: #141414;
  }
  &:active {
    transform: translateY(1px);
  }
}

.link-join {
  color: #141414;
  font-weight: 700;
  text-decoration: none;
  font-size: 0.9rem;
  padding-bottom: 2px;
  border-bottom: 2px solid transparent;
  transition: border-color 0.2s;

  &:hover {
    border-bottom-color: #297534;
    color: #297534;
  }
}

/* BOUTON PRIMAIRE STANDARD */
.btn-primary {
  background: #297534;
  color: white;
  border: none;
  padding: 15px 30px;
  font-family: $font-main;
  font-weight: bold;
  font-size: 1rem;
  text-transform: uppercase;
  cursor: pointer;
  width: 100%;

  &:hover {
    background: #23632c;
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.btn-next {
  @extend .btn-primary;
  background: #141414;
  &:hover {
    background: #333;
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
@keyframes slideUp {
  from {
    transform: translateY(10px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
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
</style>
