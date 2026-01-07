<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

// --- CONSTANTES ---
const STORAGE_KEY = 'norml_admin_secret'
const STORAGE_TIME_KEY = 'norml_admin_timestamp'
const SESSION_DURATION = 24 * 60 * 60 * 1000
const INACTIVITY_LIMIT = 5 * 60 * 1000

// --- ETAT ---
const secret = ref('')
const isAuthenticated = ref(false)
const currentLang = ref('fr')
const isLoading = ref(false)
const statusMsg = ref('')
const activeTab = ref('general')
const showRawJson = ref(false)

const cmsData = ref<any>({})
const languages = ['fr', 'en', 'es']

let inactivityTimer: any = null

// --- CYCLE DE VIE ---
onMounted(() => {
  checkSession()
})

onUnmounted(() => {
  stopInactivityTracking()
})

// --- GESTION INACTIVITÉ ---
const startInactivityTracking = () => {
  window.addEventListener('mousemove', resetInactivityTimer)
  window.addEventListener('keydown', resetInactivityTimer)
  window.addEventListener('click', resetInactivityTimer)
  window.addEventListener('scroll', resetInactivityTimer)
  resetInactivityTimer()
}

const stopInactivityTracking = () => {
  window.removeEventListener('mousemove', resetInactivityTimer)
  window.removeEventListener('keydown', resetInactivityTimer)
  window.removeEventListener('click', resetInactivityTimer)
  window.removeEventListener('scroll', resetInactivityTimer)
  if (inactivityTimer) clearTimeout(inactivityTimer)
}

const resetInactivityTimer = () => {
  if (!isAuthenticated.value) return
  if (inactivityTimer) clearTimeout(inactivityTimer)
  inactivityTimer = setTimeout(() => {
    alert('⚠️ Session expirée (inactivité).')
    logout()
  }, INACTIVITY_LIMIT)
}

// --- GESTION SESSION ---
const checkSession = () => {
  const storedSecret = localStorage.getItem(STORAGE_KEY)
  const storedTime = localStorage.getItem(STORAGE_TIME_KEY)

  if (storedSecret && storedTime) {
    const now = new Date().getTime()
    const sessionAge = now - parseInt(storedTime)

    if (sessionAge < SESSION_DURATION) {
      secret.value = storedSecret
      loadContent(currentLang.value)
    } else {
      logout()
    }
  }
}

const logout = () => {
  stopInactivityTracking()
  localStorage.removeItem(STORAGE_KEY)
  localStorage.removeItem(STORAGE_TIME_KEY)
  isAuthenticated.value = false
  secret.value = ''
  cmsData.value = {}
  activeTab.value = 'general'
}

// --- LOGIQUE API ---
const login = async () => {
  if (!secret.value) return
  isLoading.value = true
  await loadContent(currentLang.value)
}

const loadContent = async (lang: string) => {
  currentLang.value = lang
  isLoading.value = true
  statusMsg.value = '...'

  try {
    const res = await fetch(`/api/admin/manage?lang=${lang}`, {
      headers: { 'x-admin-secret': secret.value }
    })

    if (res.status === 403) {
      if (isAuthenticated.value) {
        logout()
      } else {
        alert('⛔️ Mot de passe incorrect')
      }
      isAuthenticated.value = false
      isLoading.value = false
      return
    }

    const data = await res.json()
    if (!data.questions_pool)
      data.questions_pool = { easy: [], medium: [], hard: [] }

    cmsData.value = data
    isAuthenticated.value = true

    localStorage.setItem(STORAGE_KEY, secret.value)
    localStorage.setItem(STORAGE_TIME_KEY, new Date().getTime().toString())
    startInactivityTracking()
    statusMsg.value = ''
  } catch (e) {
    console.error(e)
    statusMsg.value = 'Erreur réseau'
  } finally {
    isLoading.value = false
  }
}

const saveContent = async () => {
  try {
    isLoading.value = true
    const res = await fetch('/api/admin/manage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-secret': secret.value
      },
      body: JSON.stringify({
        lang: currentLang.value,
        content: cmsData.value
      })
    })

    if (res.ok) {
      statusMsg.value = `✅ SAUVEGARDÉ`
      localStorage.setItem(STORAGE_TIME_KEY, new Date().getTime().toString())
      resetInactivityTimer()
      setTimeout(() => (statusMsg.value = ''), 3000)
    } else {
      statusMsg.value = '❌ Erreur'
    }
  } catch (e) {
    alert('Erreur technique')
  } finally {
    isLoading.value = false
  }
}

// Helpers UI
const questionCount = (difficulty: string) => {
  return cmsData.value.questions_pool?.[difficulty]?.length || 0
}

const addQuestion = (difficulty: string) => {
  if (!cmsData.value.questions_pool[difficulty]) {
    cmsData.value.questions_pool[difficulty] = []
  }
  cmsData.value.questions_pool[difficulty].unshift({
    category: 'Nouvelle catégorie',
    question: '',
    options: ['', '', '', ''],
    correct: 0,
    explanation: ''
  })
}

const removeQuestion = (difficulty: string, index: number) => {
  if (confirm('Supprimer cette question ?')) {
    cmsData.value.questions_pool[difficulty].splice(index, 1)
  }
}
</script>

<template>
  <div class="admin-wrapper">
    <div v-if="!isAuthenticated" class="login-container">
      <h2>🔐 Accès Admin</h2>
      <div class="input-group">
        <input
          v-model="secret"
          type="password"
          placeholder="Mot de passe"
          @keyup.enter="login"
        />
        <button class="btn-primary" @click="login" :disabled="isLoading">
          Entrer
        </button>
      </div>
    </div>

    <div v-else class="dashboard">
      <div class="top-bar">
        <div class="bar-header">
          <div class="brand-group">
            <span class="brand">NORL FR ADMIN</span>
            <div class="lang-switcher">
              <button
                v-for="l in languages"
                :key="l"
                class="btn-lang"
                :class="{ active: currentLang === l }"
                @click="loadContent(l)"
              >
                {{ l.toUpperCase() }}
              </button>
            </div>
          </div>
          <button class="btn-logout" @click="logout" title="Déconnexion">
            🚪
          </button>
        </div>

        <div class="bar-actions">
          <span class="status" v-if="statusMsg">{{ statusMsg }}</span>

          <div class="buttons-group">
            <button class="btn-secondary" @click="showRawJson = !showRawJson">
              {{ showRawJson ? 'Form' : 'JSON' }}
            </button>
            <button
              class="btn-primary"
              @click="saveContent"
              :disabled="isLoading"
            >
              {{ isLoading ? '...' : 'SAUVEGARDER' }}
            </button>
          </div>
        </div>
      </div>

      <div v-if="showRawJson" class="raw-mode">
        <textarea
          :value="JSON.stringify(cmsData, null, 2)"
          @input="
            (e) =>
              (cmsData = JSON.parse((e.target as HTMLTextAreaElement).value))
          "
        ></textarea>
      </div>

      <div v-else class="visual-mode">
        <div class="tabs-nav">
          <button
            :class="{ active: activeTab === 'general' }"
            @click="activeTab = 'general'"
          >
            🏠 Général
          </button>
          <button
            :class="{ active: activeTab === 'ui' }"
            @click="activeTab = 'ui'"
          >
            🎨 UI
          </button>
          <div class="sep"></div>
          <button
            class="level-tab easy"
            :class="{ active: activeTab === 'easy' }"
            @click="activeTab = 'easy'"
          >
            🌱 Facile ({{ questionCount('easy') }})
          </button>
          <button
            class="level-tab medium"
            :class="{ active: activeTab === 'medium' }"
            @click="activeTab = 'medium'"
          >
            🌿 Moyen ({{ questionCount('medium') }})
          </button>
          <button
            class="level-tab hard"
            :class="{ active: activeTab === 'hard' }"
            @click="activeTab = 'hard'"
          >
            🌳 Expert ({{ questionCount('hard') }})
          </button>
        </div>

        <div class="content-area">
          <div v-if="activeTab === 'general' && cmsData.start">
            <h3>Accueil</h3>
            <div class="form-section">
              <div class="form-group">
                <label>Titre</label>
                <input type="text" v-model="cmsData.start.title" />
              </div>
              <div class="form-group">
                <label>Sous-titre</label>
                <textarea v-model="cmsData.start.subtitle" rows="3"></textarea>
              </div>
              <div class="form-group">
                <label>Bouton</label>
                <input type="text" v-model="cmsData.start.btn" />
              </div>
            </div>

            <h3>Fin</h3>
            <div class="form-section">
              <div class="form-group">
                <label>Titre Leaderboard</label>
                <input type="text" v-model="cmsData.end.leaderboard_title" />
              </div>
              <div class="form-group">
                <label>Tagline Partage</label>
                <input type="text" v-model="cmsData.end.share_card.tagline" />
              </div>
            </div>
          </div>

          <div v-if="activeTab === 'ui' && cmsData.game">
            <h3>Textes Jeu</h3>
            <div class="form-section grid-2">
              <div class="form-group">
                <label>Correct</label>
                <input type="text" v-model="cmsData.game.correct" />
              </div>
              <div class="form-group">
                <label>Incorrect</label>
                <input type="text" v-model="cmsData.game.wrong" />
              </div>
              <div class="form-group">
                <label>Label Info</label>
                <input type="text" v-model="cmsData.game.argument_label" />
              </div>
              <div class="form-group">
                <label>Btn Suivant</label>
                <input type="text" v-model="cmsData.game.btn_next" />
              </div>
            </div>
          </div>

          <div v-if="['easy', 'medium', 'hard'].includes(activeTab)">
            <div class="questions-header">
              <h3>Pool : {{ activeTab.toUpperCase() }}</h3>
              <button class="btn-primary small" @click="addQuestion(activeTab)">
                + Question
              </button>
            </div>

            <div class="questions-list">
              <div
                v-for="(q, idx) in cmsData.questions_pool[activeTab]"
                :key="idx"
                class="question-card"
              >
                <div class="card-top">
                  <span class="idx">#{{ (idx as number) + 1 }}</span>
                  <input
                    type="text"
                    v-model="q.category"
                    class="cat-input"
                    placeholder="Catégorie"
                  />
                  <button
                    class="btn-delete"
                    @click="removeQuestion(activeTab, idx as number)"
                  >
                    🗑️
                  </button>
                </div>

                <div class="form-group">
                  <input
                    type="text"
                    v-model="q.question"
                    class="q-input"
                    placeholder="Question..."
                  />
                </div>

                <div class="options-grid">
                  <div
                    v-for="(opt, optIdx) in q.options"
                    :key="optIdx"
                    class="opt-row"
                    :class="{ 'is-correct': q.correct === optIdx }"
                  >
                    <input
                      type="radio"
                      :name="'correct-' + activeTab + idx"
                      :value="optIdx"
                      v-model="q.correct"
                    />
                    <input
                      type="text"
                      v-model="q.options[optIdx]"
                      placeholder="Réponse..."
                    />
                  </div>
                </div>

                <div class="form-group">
                  <label>Explication</label>
                  <textarea
                    v-model="q.explanation"
                    rows="2"
                    placeholder="Savoir..."
                  ></textarea>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/scss/abstracts/variables' as *;
@use 'sass:color';

// --- LAYOUT ---
.admin-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 20px;
  font-family: $font-main;
  color: $prohib-black;

  @media (max-width: 768px) {
    padding: 10px;
  }
}

/* --- UI ELEMENTS --- */
button {
  font-family: $font-main;
  font-weight: 800;
  text-transform: uppercase;
  cursor: pointer;
  border: 2px solid $prohib-black;
  transition: all 0.2s;
  font-size: 0.9rem;
}

.btn-primary {
  width: auto;
  background: $prohib-black;
  color: white;
  padding: 8px 16px;
  &:hover {
    background: color.scale($prohib-black, $lightness: 20%);
  }
  &:disabled {
    opacity: 0.5;
  }
  &.small {
    padding: 5px 10px;
    font-size: 0.75rem;
  }
}

.btn-secondary {
  background: white;
  color: $prohib-black;
  padding: 8px 16px;
  &:hover {
    background: #eee;
  }
}

.btn-delete {
  background: transparent;
  color: $error-red;
  border: 1px solid $error-red;
  padding: 4px 8px;
  font-size: 0.8rem;
  &:hover {
    background: $error-red;
    color: white;
  }
}

.btn-logout {
  background: #eee;
  border: 2px solid #ccc;
  padding: 8px;
  &:hover {
    border-color: $error-red;
    color: $error-red;
  }
}

input,
textarea {
  width: 100%;
  padding: 10px;
  border: 2px solid #ddd;
  font-family: $font-main;
  font-size: 16px;
  border-radius: 4px;
  &:focus {
    border-color: $prohib-black;
    outline: none;
  }
}

/* --- LOGIN (FIX MOBILE: ROW) --- */
.login-container {
  width: 100%;
  max-width: 400px;
  background: white;
  padding: 30px;
  border: 2px solid $prohib-black;
  text-align: center;
  box-shadow: 5px 5px 0 rgba(0, 0, 0, 0.1);

  .input-group {
    display: flex;
    gap: 10px;
    margin-top: 20px;
    input {
      flex: 1;
      min-width: 0;
    } /* min-width: 0 pour éviter le débordement flex */
    button {
      flex-shrink: 0;
    }
  }
}

/* --- DASHBOARD --- */
.dashboard {
  width: 100%;
  max-width: 1000px;
}

/* --- TOP BAR (REFONTE) --- */
.top-bar {
  background: white;
  padding: 15px;
  border: 2px solid $prohib-black;
  margin-bottom: 20px;
  position: sticky;
  top: 0;
  z-index: 99;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);

  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 15px;

  /* PARTIE GAUCHE: Logo + Langues + Logout */
  .bar-header {
    display: flex;
    align-items: center;
    gap: 15px;

    .brand-group {
      display: flex;
      align-items: center;
      gap: 15px;
    }
    .brand {
      font-weight: 900;
      font-size: 1.1rem;
      white-space: nowrap;
    }

    .lang-switcher {
      display: flex;
      gap: 5px;
      .btn-lang {
        background: transparent;
        border: 1px solid transparent;
        opacity: 0.5;
        padding: 5px;
        margin: 0;
        &.active {
          opacity: 1;
          border-bottom: 2px solid $prohib-black;
        }
      }
    }
  }

  /* PARTIE DROITE: Actions */
  .bar-actions {
    display: flex;
    align-items: center;
    gap: 10px;

    .status {
      font-weight: bold;
      color: $reg-green;
      font-size: 0.8rem;
      white-space: nowrap;
    }

    .buttons-group {
      display: flex;
      gap: 10px;
    }
  }
}

/* --- TABS --- */
.tabs-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-bottom: 15px;

  button {
    background: #e0e0e0;
    border: 2px solid transparent;
    padding: 8px 12px;
    color: #666;

    &.active {
      background: white;
      border-color: $prohib-black;
      color: $prohib-black;
    }
  }
  .sep {
    width: 10px;
  }

  .level-tab.easy.active {
    border-color: $light-green;
    color: color.scale($light-green, $lightness: -20%);
  }
  .level-tab.medium.active {
    border-color: $highlight-green;
    color: color.scale($highlight-green, $lightness: -20%);
  }
  .level-tab.hard.active {
    border-color: $reg-green;
    color: color.scale($reg-green, $lightness: -20%);
  }
}

/* --- CONTENT --- */
.content-area {
  background: white;
  padding: 20px;
  border: 2px solid $prohib-black;

  h3 {
    margin-top: 0;
    border-bottom: 2px solid $prohib-black;
    padding-bottom: 5px;
    margin-bottom: 20px;
    text-transform: uppercase;
    font-size: 1.1rem;
  }
}

.form-section {
  margin-bottom: 25px;
}
.form-group {
  margin-bottom: 15px;
  label {
    display: block;
    font-weight: bold;
    margin-bottom: 5px;
    font-size: 0.8rem;
    text-transform: uppercase;
    color: #666;
  }
}

.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}

/* --- RAW MODE --- */
.raw-mode textarea {
  width: 100%;
  height: 70vh;
  background: $prohib-black;
  color: #eee;
  font-family: monospace;
  padding: 15px;
}

/* --- QUESTIONS --- */
.questions-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.question-card {
  background: #fff;
  border: 2px solid #eee;
  padding: 15px;
  margin-bottom: 15px;

  .card-top {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 10px;
    background: #f9f9f9;
    padding: 8px;

    .idx {
      font-weight: bold;
      color: $prohib-black;
    }
    .cat-input {
      width: auto;
      flex: 1;
      padding: 5px;
      font-weight: bold;
      font-size: 0.9rem;
    }
  }

  .q-input {
    font-size: 1rem;
    font-weight: bold;
    border: none;
    border-bottom: 2px solid #eee;
    padding-left: 0;
    &:focus {
      border-color: $prohib-black;
    }
  }

  .options-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin: 10px 0;

    .opt-row {
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 4px;
      border: 1px solid transparent;

      &.is-correct {
        background: rgba(66, 185, 131, 0.1);
        border-color: $reg-green;
        input[type='text'] {
          color: color.scale($reg-green, $lightness: -20%);
          font-weight: bold;
        }
      }

      input[type='radio'] {
        width: 20px;
        height: 20px;
        flex-shrink: 0;
        accent-color: $reg-green;
      }
      input[type='text'] {
        border: 1px solid #eee;
        font-size: 0.9rem;
        padding: 8px;
      }
    }
  }
}

/* ========================================= */
/* RESPONSIVE MOBILE ( < 768px )       */
/* ========================================= */
@media (max-width: 768px) {
  /* LOGIN FIX : Garder la ligne */
  .login-container {
    padding: 20px;
    .input-group {
      flex-direction: row;
    }
  }

  /* TOP BAR : Passage en 2 lignes forcées */
  .top-bar {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
    padding: 10px;

    /* LIGNE 1 : Tout en haut */
    .bar-header {
      justify-content: space-between;
      width: 100%;

      .brand-group {
        gap: 10px;
      }
      .brand {
        font-size: 1rem;
      } /* Un peu plus petit */
    }

    /* LIGNE 2 : Boutons d'action pleine largeur */
    .bar-actions {
      flex-direction: column;
      width: 100%;

      .status {
        margin-bottom: 5px;
      }

      .buttons-group {
        width: 100%;
        display: flex;
        gap: 10px;
        button {
          flex: 1;
          padding: 12px;
        } /* 50% - 50% */
      }
    }
  }

  /* Onglets */
  .tabs-nav {
    gap: 5px;
    button {
      width: 48%;
      padding: 10px 5px;
      font-size: 0.8rem;
    }
    .sep {
      display: none;
    }
  }

  /* Contenu */
  .content-area {
    padding: 15px;
  }
  .grid-2 {
    grid-template-columns: 1fr;
  }
  .options-grid {
    grid-template-columns: 1fr !important;
  }

  .question-card {
    .card-top {
      flex-wrap: wrap;
      .cat-input {
        width: 100%;
        margin-bottom: 5px;
      }
      .btn-delete {
        width: 100%;
        margin-top: 5px;
      }
    }
  }
}
</style>
