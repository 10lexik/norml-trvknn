<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { LeaderboardEntry, UnifiedNetworkConfig } from '../../types/quizz'

const { t } = useI18n()

const props = defineProps<{
  score: number
  total: number
  rankInfo: { title: string; desc: string }
  hasMedal: boolean
  isSaved: boolean
  leaderboard: LeaderboardEntry[]
  nameError: string | null
  isSubmitting: boolean
  nameModel: string
  memberIdModel: string
  socialsModel: Record<string, string>
  socialNetworks: UnifiedNetworkConfig[]
  visibleNetworks: string[]
  isGenerating: boolean
  showShareModal: boolean
  generatedImageUrl: string | null
  emailModel: string
  consentModel: boolean
  emailError: string | null
}>()

const emit = defineEmits<{
  (e: 'update:nameModel', value: string): void
  (e: 'update:memberIdModel', value: string): void
  (e: 'update:socialsModel', value: Record<string, string>): void
  (e: 'save'): void
  (e: 'clearError'): void
  (e: 'toggleNetwork', id: string): void
  (e: 'clearInputSocial', id: string): void
  (e: 'restart'): void
  (e: 'share'): void
  (e: 'closeModal'): void
  (e: 'download', net: UnifiedNetworkConfig): void
  (e: 'update:emailModel', value: string): void
  (e: 'update:consentModel', value: boolean): void
}>()

const onNameInput = (e: Event) => {
  emit('update:nameModel', (e.target as HTMLInputElement).value)
  emit('clearError')
}

const onEmailInput = (e: Event) => {
  emit('update:emailModel', (e.target as HTMLInputElement).value)
  emit('clearError')
}

const onConsentChange = (e: Event) => {
  emit('update:consentModel', (e.target as HTMLInputElement).checked)
}

const onMemberIdInput = (e: Event) => {
  emit('update:memberIdModel', (e.target as HTMLInputElement).value)
}

const onSocialInput = (key: string, e: Event) => {
  // Using props.socialsModel but we must destructure from defineProps or use directly
  const newSocials = { ...props.socialsModel, [key]: (e.target as HTMLInputElement).value }
  emit('update:socialsModel', newSocials)
}

const showPrivacyModal = ref(false)

</script>

<template>
  <div class="screen end-screen">
    <div class="score-circle">
      <span class="label-xp">{{ t('end.score_label') }}</span>
      <span class="big-score">{{ score }}</span>
      <span class="total">/ {{ total }}</span>
    </div>
    <h3>{{ rankInfo.title }}</h3>
    <p class="rank-desc">{{ rankInfo.desc }}</p>

    <div v-if="!isSaved" class="save-form">
      <!-- 1. IDENTITÉ & CONTACT (Essentiel) -->
      <div class="form-group primary-group">
        <div class="form-row" :class="{ 'has-error': nameError }">
          <div v-if="nameError" class="input-tooltip">
            {{ nameError }}
            <div class="tooltip-arrow"></div>
          </div>
          <span class="prefix-icon">👤</span>
          <input
            type="text"
            :value="nameModel"
            @input="onNameInput"
            :placeholder="t('end.placeholder_name')"
            maxlength="15"
          />
        </div>

        <div class="form-row" :class="{ 'has-error': emailError }">
           <div v-if="emailError" class="input-tooltip">
            {{ emailError }}
            <div class="tooltip-arrow"></div>
          </div>
          <span class="prefix-icon">✉️</span>
          <input
            type="email"
            :value="emailModel"
            @input="onEmailInput"
            :placeholder="t('end.placeholder_email')"
          />
        </div>

        <div class="consent-row">
          <label class="consent-label">
            <input 
              type="checkbox" 
              :checked="consentModel"
              @change="onConsentChange"
            />
            <span class="consent-text">{{ t('end.rgpd_consent') }}</span>
          </label>
        </div>
      </div>

      <!-- SÉPARATEUR VISUEL LÉGER -->
      <div class="private-separator"></div>

      <!-- 2. OPTIONNEL (Gamification / Public) -->
      <div class="form-group optional-group">
        <h4 class="optional-title">{{ t('end.optional_title') }}</h4>
        <p class="optional-subtitle">{{ t('end.social_subtitle') }}</p>

        <div class="form-row">
          <span class="prefix-icon">#</span>
          <input
            type="text"
            :value="memberIdModel"
            @input="onMemberIdInput"
            :placeholder="t('end.placeholder_id')"
          />
        </div>

        <div class="social-section" v-if="socialNetworks.length">
          <div class="social-bar">
            <button
              v-for="net in socialNetworks"
              :key="net.id"
              class="icon-btn"
              :class="{ active: visibleNetworks.includes(net.id) || socialsModel[net.id] }"
              @click="emit('toggleNetwork', net.id)"
              :title="net.label"
            >
              <span v-html="net.icon"></span>
            </button>
          </div>
          <transition-group name="slide">
            <div
              v-for="net in socialNetworks"
              :key="net.id"
              class="form-row social-row"
              v-show="visibleNetworks.includes(net.id) || socialsModel[net.id]"
            >
              <span class="prefix-icon social-icon" v-html="net.icon"></span>
              <input
                type="text"
                :value="socialsModel[net.id]"
                @input="(e) => onSocialInput(net.id, e)"
                :placeholder="net.label"
              />
              <button class="close-btn" @click="emit('clearInputSocial', net.id)">×</button>
            </div>
          </transition-group>
        </div>
      </div>

      <i18n-t
        keypath="end.rgpd_global_disclaimer"
        tag="p"
        class="legal-disclaimer"
      >
        <template #privacy_policy>
          <a href="#" class="privacy-link" @click.prevent="showPrivacyModal = true">
            {{ t('end.privacy_policy_title') }}
          </a>
        </template>
      </i18n-t>

      <div class="actions-row">
        <button
          class="btn-primary btn-action-trigger"
          @click="emit('save')"
          :disabled="!nameModel || !emailModel || isSubmitting"
        >
          <span v-if="isSubmitting" class="mini-loader-white"></span>
          <span v-else>{{ hasMedal ? t('end.btn_save') : t('end.btn_save_no_medal') }}</span>
        </button>
        <button class="btn-skip" @click="emit('restart')">
          {{ t('end.btn_skip') }}
        </button>
      </div>
    </div>

    <div v-else class="leaderboard-wrapper">
      <div v-if="hasMedal" class="final-actions top-actions">
        <button class="btn-action-trigger" @click="emit('share')" :disabled="isGenerating">
          {{ isGenerating ? '...' : t('end.share_modal.title') }}
        </button>
      </div>

      <div class="leaderboard-container">
        <h4>{{ t('end.top_10') }}</h4>
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
                :class="{ 'current-user': entry.isUser, 'top-3': index < 3 }"
              >
                <td class="rank">{{ index + 1 }}</td>
                <td class="name">
                  <div class="name-row">
                    <span>{{ entry.name }}</span>
                    <span v-if="entry.memberId" class="badge-member">#{{ entry.memberId }}</span>
                  </div>
                  <div class="social-icons" v-if="entry.socials && socialNetworks.length">
                    <template v-for="net in socialNetworks" :key="net.id">
                      <a
                        v-if="entry.socials[net.id]"
                        :href="entry.socials[net.id]"
                        target="_blank"
                        class="s-lnk"
                        v-html="net.icon"
                      ></a>
                    </template>
                  </div>
                </td>
                <td class="score-val">
                  {{ entry.score }}
                  <span v-if="entry.time" class="time-spent">
                    {{ Math.floor(entry.time / 60) }}m {{ entry.time % 60 }}s
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div class="final-actions bottom-actions">
        <button class="btn-giant-restart" @click="emit('restart')">
          {{ t('end.btn_retry') }}
        </button>
        <a :href="t('end.btn_join.url')" target="_blank" class="link-join">
          {{ t('end.btn_join.text') }}
        </a>
      </div>
    </div>

    <!-- MODALE DU CERTIFICAT (RESTAURÉE) -->
    <div v-if="showShareModal" class="share-modal-overlay" @click.self="emit('closeModal')">
      <div class="share-modal-content">
        <h3 class="modal-hint">{{ t('end.share_modal.hint') }}</h3>
        <div class="preview-img-container">
          <img v-if="generatedImageUrl" :src="generatedImageUrl" alt="Score" class="preview-img" />
        </div>
        <div class="share-buttons-row">
          <button
            v-for="net in socialNetworks"
            :key="net.id"
            class="btn-network-circle"
            :style="{ backgroundColor: net.color }"
            @click="emit('download', net)"
            :title="net.label"
          >
           <span class="icon" v-html="net.icon"></span>
          </button>
        </div>
        <button class="btn-close-modal" @click="emit('closeModal')">
          {{ t('end.share_modal.btn_close') }}
        </button>
      </div>
    </div>

    <!-- MODALE PRIVACY (REUTILISATION DU STYLE) -->
    <div v-if="showPrivacyModal" class="share-modal-overlay" @click.self="showPrivacyModal = false">
      <div class="share-modal-content">
        <h3>{{ t('end.privacy_policy_title') }}</h3>
        <p class="modal-hint" style="text-align: left; margin-bottom: 20px; line-height: 1.5; white-space: pre-line;">
          {{ t('end.privacy_policy_text') }}
        </p>
        <button class="btn-close-modal" @click="showPrivacyModal = false">
          {{ t('end.share_modal.btn_close') }}
        </button>
      </div>
    </div>
  </div>
</template>
