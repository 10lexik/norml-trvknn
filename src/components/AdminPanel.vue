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
  <div class="admin-wrapper">
    <div
      v-if="!isAuthenticated"
      class="login-container"
    >
      <h2>{{ t('login.title') }}</h2>
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
                <label>{{ t('ui_texts.field_correct') }}</label
                ><input
                  v-model="cmsData.game.correct"
                  type="text"
                  autocomplete="off"
                />
              </div>
              <div class="form-group">
                <label>{{ t('ui_texts.field_wrong') }}</label
                ><input
                  v-model="cmsData.game.wrong"
                  type="text"
                  autocomplete="off"
                />
              </div>
              <div class="form-group">
                <label>{{ t('ui_texts.field_info_label') }}</label
                ><input
                  v-model="cmsData.game.argument_label"
                  type="text"
                  autocomplete="off"
                />
              </div>
              <div class="form-group">
                <label>{{ t('ui_texts.field_btn_next') }}</label
                ><input
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
          <!-- BLOC MANQUANT POUR LES QUESTIONS -->
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
              class="question-edit-card"
            >
              <div class="q-card-header">
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

              <div class="options-grid-edit">
                <div
                  v-for="(opt, oIdx) in q.options"
                  :key="oIdx"
                  class="opt-input-group"
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
</template>

<style scoped>
.admin-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 20px;
  font-family: var(--font-main);
  color: var(--color-prohib-black);
}

button {
  font-family: var(--font-main);
  font-weight: 800;
  text-transform: uppercase;
  cursor: pointer;
  border: 2px solid var(--color-prohib-black);
  transition: all 0.2s;
}

.btn-primary {
  background: var(--color-prohib-black);
  color: white;
  padding: 8px 16px;

  &:hover {
    background: color-mix(in srgb, var(--color-prohib-black), white 20%);
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
  padding: 8px 16px;

  &:hover {
    background: #eee;
  }
}

.btn-delete {
  background: transparent;
  color: var(--color-error-red);
  border: 1px solid var(--color-error-red);
  padding: 4px 8px;
  font-size: 0.8rem;

  &:hover {
    background: var(--color-error-red);
    color: white;
  }
}

.btn-logout {
  background: #eee;
  border: 2px solid #ccc;
  padding: 8px;

  &:hover {
    border-color: var(--color-error-red);
    color: var(--color-error-red);
  }
}

input,
textarea,
select {
  width: 100%;
  padding: 10px;
  border: 2px solid #ddd;
  font-family: var(--font-main);
  font-size: 16px;
  border-radius: 4px;

  &:focus {
    border-color: var(--color-prohib-black);
    outline: none;
  }
}

/* --- CATEGORY SELECTOR --- */
.cat-selector-group {
  flex: 1;
  display: flex;

  .cat-input {
    font-weight: bold;
    font-size: 0.9rem;
    padding: 5px 10px;
    height: 35px;

    &.new-cat {
      border: 2px solid var(--color-reg-green);
      background: #f0fff0;
    }
  }
}

.login-container {
  width: 100%;
  max-width: 400px;
  background: white;
  padding: 30px;
  border: 2px solid var(--color-prohib-black);
  text-align: center;

  .input-group {
    display: flex;
    gap: 10px;
    margin-top: 20px;
  }
}

.login-status {
  margin-top: 15px;
  font-size: 0.85rem;
  padding: 10px;
  border-radius: 4px;
  background: #f8f8f8;

  &.error {
    color: var(--color-error-red);
    background: rgba(255, 0, 0, 0.05);
  }
}

.dashboard {
  width: 100%;
  max-width: 1000px;
}

.top-bar {
  background: white;
  padding: 15px;
  border: 2px solid var(--color-prohib-black);
  margin-bottom: 20px;
  position: sticky;
  top: 0;
  z-index: 99;
  display: flex;
  justify-content: space-between;
  align-items: center;

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
    }
  }

  .bar-actions {
    display: flex;
    align-items: center;
    gap: 10px;

    .status {
      font-weight: bold;
      color: var(--color-reg-green);
      font-size: 0.8rem;
    }

    .buttons-group {
      display: flex;
      gap: 10px;
    }
  }
}

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
      border-color: var(--color-prohib-black);
      color: var(--color-prohib-black);
    }
  }

  .level-tab.easy.active {
    border-color: var(--color-light-green);
  }

  .level-tab.medium.active {
    border-color: var(--color-highlight-green);
  }

  .level-tab.hard.active {
    border-color: var(--color-reg-green);
  }
}

.content-area {
  background: white;
  padding: 20px;
  border: 2px solid var(--color-prohib-black);

  h3 {
    border-bottom: 2px solid var(--color-prohib-black);
    padding-bottom: 5px;
    margin: 20px 0;
    text-transform: uppercase;
  }
}

.form-group {
  margin-bottom: 15px;

  label {
    display: block;
    font-weight: bold;
    margin-bottom: 5px;
    font-size: 0.7rem;
    color: #666;
  }
}

.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}

.raw-mode textarea {
  width: 100%;
  height: 70vh;
  background: var(--color-prohib-black);
  color: #eee;
  font-family: monospace;
  padding: 15px;
}

.question-card {
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
  }

  .q-input {
    font-size: 1rem;
    font-weight: bold;
    border: none;
    border-bottom: 2px solid #eee;
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

      &.is-correct {
        background: rgba(66, 185, 131, 0.1);
        border: 1px solid var(--color-reg-green);
      }

      input[type='radio'] {
        width: 20px;
        height: 20px;
        accent-color: var(--color-reg-green);
      }
    }
  }
}

@media (max-width: 768px) {
  .top-bar {
    flex-direction: column;

    .bar-header,
    .bar-actions {
      width: 100%;
    }

    .buttons-group {
      width: 100%;

      button {
        flex: 1;
      }
    }
  }

  .grid-2,
  .options-grid {
    grid-template-columns: 1fr !important;
  }
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;

  h3 {
    margin: 0;
    border: none;
  }
}

.results-actions {
  display: flex;
  gap: 10px;
}

.table-container {
  overflow-x: auto;
  border: 1px solid #eee;
}

.leads-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;

  th,
  td {
    padding: 12px;
    text-align: left;
    border-bottom: 1px solid #eee;
  }

  th {
    background: #f9f9f9;
    font-weight: 800;
    text-transform: uppercase;
    font-size: 0.7rem;
  }

  .date-cell {
    color: #888;
    white-space: nowrap;
  }

  .mono-id {
    font-family: monospace;
    color: #444;
    font-weight: bold;
    border-right: 1px solid #ddd;
    text-align: center;
  }

  .audit-row {
    border-bottom: 1px solid #ddd;

    &:hover {
      background: #fdfdfd;
    }
  }

  .participant-box {
    display: flex;
    flex-direction: column;
    gap: 3px;

    .name-line {
      display: flex;
      align-items: center;
      gap: 6px;
    }
  }

  .mono-member {
    font-family: monospace;
    font-size: 0.75rem;
    background: #eee;
    padding: 2px 4px;
    border-radius: 2px;
  }

  .email-audit {
    color: #2c3e50;
    font-size: 0.8rem;
    font-weight: 700;
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }

  .social-labels {
    display: flex;
    gap: 4px;

    span {
      font-size: 0.6rem;
      padding: 1px 3px;
      background: #f0f0f0;
      border: 1px solid #ccc;
      color: #555;
      font-weight: bold;
      border-radius: 2px;
    }
  }

  .score-audit {
    display: flex;
    flex-direction: column;
    align-items: flex-start;

    .score-val {
      font-size: 1rem;
      font-weight: 900;
      color: #2c3e50;
    }

    .diff-tag {
      font-size: 0.55rem;
      text-transform: uppercase;
      font-weight: 800;
      border-radius: 2px;
      padding: 1px 3px;
      color: white;

      &.easy {
        background: #7f8c8d;
      }

      &.medium {
        background: #34495e;
      }

      &.hard {
        background: #2c3e50;
      }
    }
  }

  .tech-box {
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: 0.75rem;

    .mono-ip {
      font-family: monospace;
      color: #444;
      font-size: 0.7rem;
      background: #f8f8f8;
      padding: 1px 2px;
      width: fit-content;
    }

    .browser-info {
      font-weight: bold;
      color: #2c3e50;
    }

    .raw-ua {
      font-family: monospace;
      font-size: 0.65rem;
      color: #888;
      word-break: break-all;
      max-width: 200px;
      line-height: 1.1;
      max-height: 2.2em;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }

    .res-info {
      color: #999;
      font-size: 0.65rem;
    }

    .ref-link,
    .utm-tag {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 150px;
      color: #555;
      border-left: 2px solid #ddd;
      padding-left: 4px;
      font-family: monospace;
      font-size: 0.65rem;
    }
  }
}

.level-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;

  h3 {
    margin: 0;
    border: none;
  }
}

.question-edit-card {
  border: 1px solid #ddd;
  padding: 20px;
  background: #fff;
  margin-bottom: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);

  .q-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
    background: #f8f9fa;
    padding: 10px;
    border-radius: 4px;
  }

  .q-number {
    font-weight: bold;
    color: #444;
  }
}

.options-grid-edit {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin: 15px 0;

  .opt-input-group {
    display: flex;
    align-items: center;
    gap: 10px;
    background: #fdfdfd;
    padding: 8px;
    border: 1px solid #eee;

    input[type='radio'] {
      width: 18px;
      height: 18px;
      cursor: pointer;
    }
  }
}

.mt-10 {
  margin-top: 10px;
}

.empty-state {
  padding: 80px;
  text-align: center;
  color: #999;
  font-family: monospace;
}
</style>
