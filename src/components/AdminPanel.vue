<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from './ui/Button.vue'

const { t } = useI18n()

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
const results = ref<any[]>([])
const isLoadingResults = ref(false)
const languages = ['fr', 'en', 'es']

// Pour la gestion des catégories
const creatingCategoryFor = ref<string | null>(null)

let inactivityTimer: any = null

// --- DIRECTIVES ---
const vFocus = {
  mounted: (el: HTMLElement) => el.focus()
}

// --- CYCLE DE VIE ---
onMounted(() => {
  checkSession()
})

onUnmounted(() => {
  stopInactivityTracking()
})

// --- COMPUTED ---
// Extrait la liste unique des catégories existantes dans tous les pools
const availableCategories = computed(() => {
  const cats = new Set<string>()
  if (!cmsData.value.questions_pool) return []

  const pools = ['easy', 'medium', 'hard']
  pools.forEach((level) => {
    cmsData.value.questions_pool[level]?.forEach((q: any) => {
      if (q.category) cats.add(q.category)
    })
  })

  return Array.from(cats).sort()
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
    alert(t('messages.session_expired'))
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
  // Nettoyage ultra-agressif (espaces, normalisation accents, guillemets parasites)
  secret.value = secret.value
    .trim()
    .normalize('NFC')
    .replace(/^["']|["']$/g, '')
  isLoading.value = true
  statusMsg.value = t('messages.logging_in')
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

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}))
      let msg = errorData.error || `Erreur ${res.status}`

      // Ajout du diagnostic si disponible (notamment pour le 403)
      if (res.status === 403) {
        if (isAuthenticated.value) {
          logout()
        }
        if (errorData.debug) {
          msg += ` (Diag: Env=${errorData.debug.envLoaded ? 'OK' : 'MISSING'}, L=${errorData.debug.sentLen}/${errorData.debug.expectedLen})`
        }
      }

      statusMsg.value = msg
      isLoading.value = false
      isAuthenticated.value = false
      return
    }

    const data = await res.json()
    if (!data.questions_pool) data.questions_pool = { easy: [], medium: [], hard: [] }

    cmsData.value = data
    isAuthenticated.value = true

    localStorage.setItem(STORAGE_KEY, secret.value)
    localStorage.setItem(STORAGE_TIME_KEY, new Date().getTime().toString())
    startInactivityTracking()
    statusMsg.value = ''
  } catch (e: any) {
    console.error(e)
    statusMsg.value = t('messages.network_db_error')
  } finally {
    isLoading.value = false
  }
}

const saveContent = async () => {
  try {
    isLoading.value = true
    statusMsg.value = t('messages.saving')
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
      statusMsg.value = t('messages.save_success')
      localStorage.setItem(STORAGE_TIME_KEY, new Date().getTime().toString())
      resetInactivityTimer()
      setTimeout(() => (statusMsg.value = ''), 3000)
    } else {
      const errorData = await res.json().catch(() => ({}))
      statusMsg.value = `❌ ${errorData.error || t('messages.save_error')}`
    }
  } catch {
    statusMsg.value = t('messages.tech_error')
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
    category: availableCategories.value[0] || 'Général',
    question: '',
    options: ['', '', '', ''],
    correct: 0,
    explanation: ''
  })
}

const removeQuestion = (difficulty: string, index: number) => {
  if (confirm(t('messages.confirm_delete'))) {
    cmsData.value.questions_pool[difficulty].splice(index, 1)
  }
}

const handleCategoryChange = (val: string, level: string, idx: number) => {
  if (val === 'ADD_NEW') {
    creatingCategoryFor.value = `${level}-${idx}`
    cmsData.value.questions_pool[level][idx].category = ''
  }
}

const loadResults = async () => {
  isLoadingResults.value = true
  try {
    const res = await fetch('/api/admin/results', {
      headers: { 'x-admin-secret': secret.value }
    })
    if (res.ok) {
      results.value = await res.json()
    } else {
      statusMsg.value = t('messages.results_load_error')
    }
  } catch (e) {
    console.error(e)
  } finally {
    isLoadingResults.value = false
  }
}

const getBrowserInfo = (ua: string) => {
  if (!ua) return 'Inconnu'
  const lower = ua.toLowerCase()
  let os = 'Autre OS'
  if (lower.includes('windows')) os = 'Windows'
  else if (lower.includes('iphone') || lower.includes('ipad')) os = 'iOS'
  else if (lower.includes('android')) os = 'Android'
  else if (lower.includes('macintosh')) os = 'macOS'
  else if (lower.includes('linux')) os = 'Linux'

  let browser = 'Autre Navigateur'
  if (lower.includes('firefox')) browser = 'Firefox'
  else if (lower.includes('chrome')) browser = 'Chrome'
  else if (lower.includes('safari') && !lower.includes('chrome')) browser = 'Safari'
  else if (lower.includes('edge')) browser = 'Edge'

  return `${browser} / ${os}`
}

const exportToCSV = () => {
  if (!results.value.length) return

  const headers = [
    'Date',
    'Nom',
    'Email',
    'Score',
    'Difficulté',
    'Secondes',
    'IP',
    'Ville',
    'Région',
    'Pays',
    'Navigateur',
    'User Agent',
    'Referrer',
    'Largeur Écran',
    'UTM Source',
    'UTM Medium',
    'UTM Campaign',
    'Instagram',
    'X',
    'Facebook',
    'Bluesky',
    'TikTok',
    'Consentement',
    'Membre ID'
  ]
  const rows = results.value.map((r) => [
    new Date(r.createdAt || r.updatedAt).toLocaleString(),
    r.name,
    r.email,
    r.score,
    r.difficulty,
    r.time,
    r.ip || '',
    r.city || '',
    r.region || '',
    r.country || '',
    getBrowserInfo(r.userAgent),
    r.userAgent || '',
    r.referrer || '',
    r.screenWidth || '',
    r.utm_source || '',
    r.utm_medium || '',
    r.utm_campaign || '',
    r.socials?.instagram || '',
    r.socials?.x || '',
    r.socials?.facebook || '',
    r.socials?.bluesky || '',
    r.socials?.tiktok || '',
    r.consent ? '1' : '0',
    r.memberId || ''
  ])

  const csvContent = [
    headers.join(';'),
    ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `leads_quizz_${new Date().toISOString().split('T')[0]}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

const switchTab = (tab: string) => {
  activeTab.value = tab
  if (tab === 'results') {
    loadResults()
  }
}
</script>

<template>
  <div class="admin-panel-root">
    <div
      v-if="!isAuthenticated"
      class="admin-login-wrapper"
    >
      <div class="login-card">
        <h1>{{ t('login.title') }}</h1>
        <div class="input-group">
          <input
            v-model="secret"
            type="password"
            :placeholder="t('login.password_placeholder')"
            autocomplete="current-password"
            @keyup.enter="login"
          />
          <Button
            variant="primary"
            size="sm"
            :is-loading="isLoading"
            @click="login"
          >
            {{ t('login.btn_enter') }}
          </Button>
        </div>
        <div
          v-if="statusMsg"
          class="login-status"
          :class="{ error: statusMsg.includes('⛔') || statusMsg.includes('Diag') }"
        >
          {{ statusMsg }}
        </div>
      </div>
    </div>

    <div
      v-else
      class="dashboard"
    >
      <div class="top-bar">
        <div class="bar-header">
          <div class="brand-group">
            <span class="brand">{{ t('topbar.brand') }}</span>
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
          <Button
            variant="ghost"
            class="p-2 text-xl"
            :title="t('topbar.btn_logout_title')"
            @click="logout"
          >
            🚪
          </Button>
        </div>

        <div class="bar-actions">
          <span
            v-if="statusMsg"
            class="status"
            >{{ statusMsg }}</span
          >
          <div class="buttons-group">
            <Button
              variant="secondary"
              size="xs"
              @click="showRawJson = !showRawJson"
            >
              {{ showRawJson ? t('topbar.view_form') : t('topbar.view_json') }}
            </Button>
            <Button
              variant="primary"
              size="xs"
              :is-loading="isLoading"
              @click="saveContent"
            >
              {{ t('topbar.btn_save') }}
            </Button>
          </div>
        </div>
      </div>

      <div class="admin-view-content">
        <div
          v-if="showRawJson"
          class="raw-mode"
        >
          <textarea
            :value="JSON.stringify(cmsData, null, 2)"
            @input="(e) => (cmsData = JSON.parse((e.target as HTMLTextAreaElement).value))"
          />
        </div>

        <div
          v-else
          class="visual-mode"
        >
          <div class="tabs-nav">
            <button
              v-for="tab in [
                { id: 'general', icon: '🏠', label: t('tabs.general') },
                { id: 'ui', icon: '🎨', label: t('tabs.ui') }
              ]"
              :key="tab.id"
              :class="{ active: activeTab === tab.id }"
              @click="activeTab = tab.id"
            >
              {{ tab.label }}
            </button>

            <div class="sep" />

            <button
              v-for="lvl in [
                { id: 'easy', icon: '🌱', label: t('tabs.easy') },
                { id: 'medium', icon: '🌿', label: t('tabs.medium') },
                { id: 'hard', icon: '🌳', label: t('tabs.hard') }
              ]"
              :key="lvl.id"
              :class="['level-tab', lvl.id, { active: activeTab === lvl.id }]"
              @click="activeTab = lvl.id"
            >
              {{ lvl.label }} ({{ questionCount(lvl.id) }})
            </button>

            <div class="sep" />

            <button
              class="results-tab"
              :class="{ active: activeTab === 'results' }"
              @click="switchTab('results')"
            >
              {{ t('tabs.results') }}
            </button>
          </div>

          <div class="content-area">
            <div v-if="activeTab === 'general' && cmsData.start">
              <h3>{{ t('general.home_title') }}</h3>
              <div class="form-section">
                <div class="form-group">
                  <label>{{ t('general.field_title') }}</label>
                  <input
                    v-model="cmsData.start.title"
                    type="text"
                    autocomplete="off"
                  />
                </div>
                <div class="form-group">
                  <label>{{ t('general.field_subtitle') }}</label>
                  <textarea
                    v-model="cmsData.start.subtitle"
                    rows="3"
                    autocomplete="off"
                  />
                </div>
                <div class="form-group">
                  <label>{{ t('general.field_btn') }}</label>
                  <input
                    v-model="cmsData.start.btn"
                    type="text"
                    autocomplete="off"
                  />
                </div>
              </div>

              <h3>{{ t('general.end_title') }}</h3>
              <div class="form-section">
                <div class="form-group">
                  <label>{{ t('general.field_leaderboard_title') }}</label>
                  <input
                    v-model="cmsData.end.leaderboard_title"
                    type="text"
                    autocomplete="off"
                  />
                </div>
                <div class="form-group">
                  <label>{{ t('general.field_share_tagline') }}</label>
                  <input
                    v-model="cmsData.end.share_card.tagline"
                    type="text"
                    autocomplete="off"
                  />
                </div>
              </div>
            </div>

            <div v-if="activeTab === 'ui' && cmsData.game">
              <h3>{{ t('ui_texts.game_title') }}</h3>
              <div class="form-section grid-2">
                <div class="form-group">
                  <label>{{ t('ui_texts.field_correct') }}</label>
                  <input
                    v-model="cmsData.game.correct"
                    type="text"
                    autocomplete="off"
                  />
                </div>
                <div class="form-group">
                  <label>{{ t('ui_texts.field_wrong') }}</label>
                  <input
                    v-model="cmsData.game.wrong"
                    type="text"
                    autocomplete="off"
                  />
                </div>
                <div class="form-group">
                  <label>{{ t('ui_texts.field_info_label') }}</label>
                  <input
                    v-model="cmsData.game.argument_label"
                    type="text"
                    autocomplete="off"
                  />
                </div>
                <div class="form-group">
                  <label>{{ t('ui_texts.field_btn_next') }}</label>
                  <input
                    v-model="cmsData.game.btn_next"
                    type="text"
                    autocomplete="off"
                  />
                </div>
              </div>
            </div>

            <div v-if="activeTab === 'results'">
              <div class="results-header">
                <h3>{{ t('results.title', { count: results.length }) }}</h3>
                <div class="results-actions">
                  <Button
                    variant="secondary"
                    size="xs"
                    :is-loading="isLoadingResults"
                    @click="loadResults"
                  >
                    {{ t('results.btn_refresh') }}
                  </Button>
                  <Button
                    variant="primary"
                    size="xs"
                    :disabled="!results.length"
                    @click="exportToCSV"
                  >
                    {{ t('results.btn_export') }}
                  </Button>
                </div>
              </div>

              <div class="table-container">
                <table class="leads-table">
                  <thead>
                    <tr>
                      <th>{{ t('results.col_rank') }}</th>
                      <th>{{ t('results.col_timestamp') }}</th>
                      <th>{{ t('results.col_identity') }}</th>
                      <th>{{ t('results.col_results') }}</th>
                      <th>{{ t('results.col_socials') }}</th>
                      <th>{{ t('results.col_system') }}</th>
                      <th>{{ t('results.col_trace') }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="(res, idx) in results"
                      :key="res._id"
                      class="audit-row"
                    >
                      <td class="mono-id">#{{ results.length - idx }}</td>
                      <td class="date-cell">
                        {{ new Date(res.createdAt || res.updatedAt).toLocaleDateString() }}<br />
                        <small>{{
                          new Date(res.createdAt || res.updatedAt).toLocaleTimeString()
                        }}</small>
                      </td>
                      <td class="name-cell">
                        <div class="participant-box">
                          <div class="name-line">
                            <strong>{{ res.name }}</strong>
                            <span
                              v-if="res.memberId"
                              class="mono-member"
                              >#{{ res.memberId }}</span
                            >
                          </div>
                          <a
                            :href="'mailto:' + res.email"
                            class="email-audit"
                            >{{ res.email }}</a
                          >
                        </div>
                      </td>
                      <td class="score-cell">
                        <div class="score-audit">
                          <span class="score-val">{{ res.score }}</span>
                          <span
                            class="diff-tag"
                            :class="res.difficulty"
                            >{{ res.difficulty }}</span
                          >
                        </div>
                      </td>
                      <td class="geo-cell">
                        <div class="tech-box">
                          <span class="city-text"
                            >{{ res.city || 'N/A' }} <i>{{ res.region }}</i></span
                          >
                          <code class="mono-ip">{{ res.ip }}</code>
                        </div>
                      </td>
                      <td class="ua-cell">
                        <div class="tech-box">
                          <span class="browser-info">{{ getBrowserInfo(res.userAgent) }}</span>
                          <div class="ua-tooltip-trigger">
                            UA Details
                            <div class="ua-tooltip-content">{{ res.userAgent }}</div>
                          </div>
                          <small class="res-info">Rés: {{ res.screenWidth }}px</small>
                        </div>
                      </td>
                      <td class="source-cell">
                        <div class="tech-box">
                          <span
                            v-if="res.referrer"
                            class="ref-link"
                            >Ref: {{ res.referrer }}</span
                          >
                          <span
                            v-if="res.utm_source"
                            class="utm-tag"
                            >UTM: {{ res.utm_source }} / {{ res.utm_campaign || '-' }}</span
                          >
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <div
                  v-if="!results.length && !isLoadingResults"
                  class="empty-state"
                >
                  {{ t('results.empty_state') }}
                </div>
              </div>
            </div>

            <div v-if="['easy', 'medium', 'hard'].includes(activeTab)">
              <div class="level-header">
                <h3>
                  {{ t('quiz_pool.title', { level: activeTab.toUpperCase(), count: questionCount(activeTab) }) }}
                </h3>
                <Button
                  variant="primary"
                  size="xs"
                  @click="addQuestion(activeTab)"
                >
                  {{ t('quiz_pool.btn_add') }}
                </Button>
              </div>

              <div
                v-for="(q, idx) in cmsData.questions_pool[activeTab]"
                :key="idx"
                class="question-card"
              >
                <div class="card-top">
                  <span class="q-number"
                    >#{{ cmsData.questions_pool[activeTab].length - (idx as number) }}</span
                  >
                  <div class="cat-selector-group">
                    <select
                      v-if="creatingCategoryFor !== activeTab + '-' + idx"
                      v-model="q.category"
                      class="cat-input"
                      @change="
                        handleCategoryChange(
                          ($event.target as HTMLSelectElement).value,
                          activeTab,
                          idx as number
                        )
                      "
                    >
                      <option
                        v-for="cat in availableCategories"
                        :key="cat"
                        :value="cat"
                      >
                        {{ cat }}
                      </option>
                      <option value="ADD_NEW">{{ t('quiz_pool.add_new_category') }}</option>
                    </select>
                    <input
                      v-else
                      v-model="q.category"
                      v-focus
                      :placeholder="t('quiz_pool.new_category_placeholder')"
                      class="cat-input new-cat"
                      @blur="creatingCategoryFor = null"
                      @keyup.enter="creatingCategoryFor = null"
                    />
                  </div>
                  <button
                    class="btn-delete"
                    @click="removeQuestion(activeTab, idx as number)"
                  >
                    {{ t('quiz_pool.btn_delete') }}
                  </button>
                </div>

                <div class="form-group">
                  <label>{{ t('quiz_pool.field_question') }}</label>
                  <textarea
                    v-model="q.question"
                    rows="2"
                  />
                </div>

                <div class="options-grid">
                  <div
                    v-for="(opt, oIdx) in q.options"
                    :key="oIdx"
                    class="opt-row"
                    :class="{ 'is-correct': q.correct === oIdx }"
                  >
                    <input
                      v-model="q.correct"
                      type="radio"
                      :name="'correct-' + activeTab + '-' + idx"
                      :value="oIdx"
                    />
                    <input
                      v-model="q.options[oIdx]"
                      type="text"
                      :placeholder="t('quiz_pool.option_placeholder', { number: (oIdx as number) + 1 })"
                    />
                  </div>
                </div>

                <div class="form-group mt-10">
                  <label>{{ t('quiz_pool.field_explanation') }}</label>
                  <textarea
                    v-model="q.explanation"
                    rows="2"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@reference "../styles/main.css";

.admin-panel-root {
  @apply bg-poster-beige min-h-screen w-full font-main text-prohib-black;

  /* LOGIN SCREEN */
  & .admin-login-wrapper {
    @apply fixed inset-0 flex flex-col items-center justify-center bg-poster-beige p-6;

    & .login-card {
      @apply border-prohib-black shadow-brutal-lg w-full max-w-md border-4 bg-white p-8;

      & h1 {
        @apply mb-6 text-2xl font-black uppercase;
      }

      & input {
        @apply border-prohib-black mb-4 w-full border-2 p-3 font-mono;
      }
    }
  }

  /* DASHBOARD */
  & .dashboard {
    @apply flex flex-1 flex-col;

    & .top-bar {
      @apply border-prohib-black/10 sticky top-0 z-50 mb-5 flex items-center justify-between border-b bg-white px-6 py-4;

      & .bar-header {
        @apply flex items-center gap-4;

        & .brand {
          @apply text-lg font-black uppercase;
        }

        & .lang-switcher {
          @apply flex gap-1;

          & .btn-lang {
            @apply bg-prohib-black/5 px-3 py-1 text-xs font-bold uppercase transition-colors;

            &.active {
              @apply bg-prohib-black text-white;
            }
          }
        }
      }

      & .bar-actions {
        @apply flex items-center gap-3;

        & .status {
          @apply text-xs opacity-60 font-mono;
        }

        & .buttons-group {
          @apply flex gap-2;
        }
      }
    }

    /* TABS */
    & .tabs-nav {
      @apply mb-4 flex flex-wrap gap-1 px-6;

      & button {
        @apply bg-prohib-black/5 border-prohib-black/0 border-2 px-4 py-2 text-sm font-bold transition-all;

        &.active {
          @apply border-prohib-black bg-white;
        }
      }
    }

    /* CONTENT AREAS */
    & .admin-view-content {
      @apply px-6 pb-20;

      & h3 {
        @apply border-prohib-black mb-6 border-b-2 pb-1 text-xl font-black uppercase;
      }

      & .form-group {
        @apply mb-5;

        & label {
          @apply text-prohib-black/50 mb-1 block text-[10px] font-black uppercase tracking-widest;
        }
      }

      & .grid-2 {
        @apply grid grid-cols-1 gap-4 md:grid-cols-2;
      }

      & .raw-mode textarea {
        @apply bg-prohib-black min-h-[70vh] w-full border-0 p-6 font-mono text-white;
      }

      /* Question Editing */
      & .question-card {
        @apply border-prohib-black/10 bg-white mb-4 border-2 p-6 transition-shadow hover:shadow-md;

        & .card-top {
          @apply bg-prohib-black/5 mb-4 flex items-center gap-3 p-3;
        }

        & .q-input {
          @apply border-prohib-black/10 w-full border-b-2 bg-transparent text-lg font-bold outline-hidden;
        }

        & .options-grid {
          @apply mt-4 grid grid-cols-1 gap-2 md:grid-cols-2;

          & .opt-row {
            @apply flex items-center gap-3 p-3 transition-colors;

            &.is-correct {
              @apply border-reg-green bg-reg-green/10 border;
            }

            & input[type='radio'] {
              @apply h-5 w-5 accent-reg-green;
            }
          }
        }
      }

      /* Results Table */
      & .table-container {
        @apply border-prohib-black/10 bg-white border-2 shadow-brutal-soft overflow-x-auto;
      }

      & .leads-table {
        @apply w-full border-collapse font-mono text-xs;

        & th {
          @apply bg-prohib-black/5 p-4 text-left font-black uppercase tracking-tighter;
        }

        & td {
          @apply border-prohib-black/5 border-b p-4;
        }

        & .audit-row:hover {
          @apply bg-prohib-black/[0.02];
        }

        & .mono-id {
          @apply bg-prohib-black/5 border-prohib-black/10 border-r text-center font-black;
        }

        & .date-cell {
          @apply opacity-60;
        }

        & .participant-box {
          @apply flex flex-col gap-1;

          & .email-audit {
            @apply text-reg-green font-bold hover:underline;
          }

          & .mono-member {
            @apply bg-prohib-black/5 rounded-sm px-2 py-0.5;
          }
        }

        & .score-audit {
          @apply flex flex-col items-start gap-1;

          & .score-val {
            @apply text-lg font-black leading-none;
          }

          & .diff-tag {
            @apply inline-block rounded-sm px-1.5 py-0.5 text-[9px] font-black uppercase text-white;

            &.easy {
              @apply bg-gray-400;
            }

            &.medium {
              @apply bg-blue-600;
            }

            &.hard {
              @apply bg-prohib-black;
            }
          }
        }

        /* Tech Box Info */
        & .tech-box {
          @apply flex flex-col gap-1 text-[10px];

          & .mono-ip {
            @apply bg-prohib-black/5 px-1;
          }

          & .browser-info {
            @apply opacity-80 font-black;
          }

          & .raw-ua {
            @apply line-clamp-2 md:max-w-[200px] opacity-40;
          }

          & .res-info,
          & .utm-tag {
            @apply opacity-50;
          }
        }
      }
    }
  }
}

/* Mobile Adjustments */
@media (max-width: 768px) {
  .admin-panel-root .dashboard .top-bar {
    @apply flex-col items-start gap-4;

    & .bar-header,
    & .bar-actions {
      @apply w-full justify-between;
    }
  }
}
</style>
