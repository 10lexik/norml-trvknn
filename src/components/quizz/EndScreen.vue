<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Loader from '../ui/Loader.vue'
import Button from '../ui/Button.vue'
import Fonts from '../ui/Fonts.vue'
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
  medal: 'gold' | 'silver' | 'bronze' | null
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
const formRef = ref<HTMLElement | null>(null)

const crownColors = {
  gold: '#fbb03b',
  silver: '#c0c0c0',
  bronze: '#bf8970'
}

const crownColor = computed(() => (props.medal ? crownColors[props.medal] : '#fbb03b'))

const scrollToForm = () => {
  if (formRef.value) {
    // Small delay to ensure keyboard is accounted for on mobile
    setTimeout(() => {
      formRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }
}
</script>

<template>
  <div class="screen end-screen">
    <div class="score-badge-wrapper">
      <div
        v-if="medal"
        class="crown-frame"
        :class="medal"
      >
        <svg
          viewBox="0 0 182.86 155"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g
            id="crown-paths"
            :style="{ fill: crownColor }"
          >
            <path
              d="M41.23,132.27c-.47-.11-.95-.18-1.46-.19-4.15-.05-7.79,2.96-11.97,1.22,0,0,5.54,9,11.74,8.47,2.95-.25,4.75-1.5,5.84-2.73l-.11-.08c-.16-.13-3.53-2.86-4.04-6.68Z"
            />
            <path
              d="M43.78,119.14s8.68,6.03,7.79,12.2c-.88,6.16-5.85,7.04-5.85,7.04,0,0-4.02-3.21-3.83-7.36.19-4.15,3.39-7.61,1.89-11.88Z"
            />
            <path
              d="M33.47,123.97c-.42-.13-.86-.21-1.32-.25-3.79-.25-7.26,2.31-10.99.5,0,0,4.6,8.5,10.29,8.33,2.71-.08,4.41-1.13,5.47-2.2l-.09-.08c-.14-.12-3.08-2.8-3.35-6.31Z"
            />
            <path
              d="M36.47,112.1s7.62,5.95,6.5,11.53c-1.12,5.58-5.7,6.14-5.7,6.14,0,0-3.51-3.13-3.13-6.91.38-3.78,3.49-6.77,2.33-10.76Z"
            />
            <path
              d="M26.51,115.14c-.36-.2-.74-.36-1.16-.48-3.4-.97-7.06.68-10.1-1.7,0,0,2.52,8.63,7.73,9.59,2.48.46,4.24-.16,5.41-.93l-.07-.09c-.1-.14-2.25-3.14-1.81-6.39Z"
            />
            <path
              d="M31.56,104.93s5.76,6.91,3.65,11.77c-2.11,4.86-6.38,4.46-6.38,4.46,0,0-2.58-3.54-1.49-6.9,1.09-3.36,4.5-5.48,4.22-9.33Z"
            />
            <path
              d="M21.03,105.73c-.32-.26-.66-.49-1.05-.69-3.17-1.57-7.06-.61-9.62-3.5,0,0,.91,8.95,5.86,10.83,2.36.9,4.2.61,5.48.07l-.05-.1c-.08-.16-1.64-3.5-.63-6.61Z"
            />
            <path
              d="M27.85,96.61s4.41,7.84,1.46,12.23c-2.96,4.4-7.09,3.23-7.09,3.23,0,0-1.9-3.95-.22-7.06,1.68-3.11,5.42-4.57,5.84-8.41Z"
            />
            <path
              d="M17.88,95.69c-.28-.29-.58-.57-.94-.81-2.89-1.95-6.82-1.52-8.95-4.67,0,0-.27,8.86,4.32,11.35,2.19,1.19,4.02,1.14,5.35.78l-.03-.11c-.05-.16-1.15-3.63.25-6.54Z"
            />
            <path
              d="M25.73,87.66s3.3,8.23-.16,12.15c-3.46,3.91-7.35,2.24-7.35,2.24,0,0-1.34-4.1.71-6.92,2.05-2.82,5.89-3.76,6.81-7.46Z"
            />
            <path
              d="M15.42,84.71c-.23-.33-.5-.64-.82-.92-2.6-2.32-6.56-2.42-8.24-5.84,0,0-1.46,8.74,2.75,11.83,2.01,1.47,3.83,1.67,5.2,1.49l-.02-.11c-.03-.17-.65-3.76,1.13-6.45Z"
            />
            <path
              d="M24.28,77.81s2.16,8.6-1.8,12.01c-3.96,3.41-7.58,1.23-7.58,1.23,0,0-.77-4.25,1.63-6.77,2.41-2.52,6.34-2.94,7.75-6.47Z"
            />
            <path
              d="M15.87,73.69c-.18-.36-.41-.71-.68-1.03-2.24-2.67-6.14-3.33-7.32-6.95,0,0-2.7,8.45,1.04,12.1,1.78,1.74,3.55,2.2,4.93,2.22v-.11c-.01-.17-.11-3.81,2.03-6.22Z"
            />
            <path
              d="M25.62,68.13s.91,8.82-3.5,11.63c-4.4,2.81-7.68.13-7.68.13,0,0-.16-4.31,2.58-6.46,2.74-2.15,6.7-2,8.59-5.3Z"
            />
            <path
              d="M16.28,62.62c-.12-.39-.28-.77-.49-1.13-1.76-3.01-5.49-4.33-6.03-8.1,0,0-4.09,7.86-1.04,12.1,1.45,2.02,3.13,2.77,4.48,3.03v-.11c.04-.17.56-3.77,3.08-5.79Z"
            />
            <path
              d="M26.83,58.8s-.61,8.85-5.42,10.87c-4.82,2.02-7.59-1.18-7.59-1.18,0,0,.58-4.28,3.64-5.93,3.07-1.65,6.94-.83,9.37-3.76Z"
            />
            <path
              d="M19.65,51.5c-.06-.4-.15-.8-.3-1.2-1.25-3.25-4.72-5.15-4.66-8.96,0,0-5.3,7.11-2.97,11.78,1.11,2.22,2.64,3.24,3.94,3.7l.03-.11c.05-.16,1.14-3.64,3.96-5.22Z"
            />
            <path
              d="M30.68,49.42s-2.02,8.63-7.1,9.86c-5.08,1.22-7.3-2.38-7.3-2.38,0,0,1.25-4.13,4.55-5.27,3.3-1.14,6.98.29,9.85-2.21Z"
            />
            <path
              d="M24.74,41.95c-.05-.4-.13-.8-.28-1.2-1.17-3.28-4.6-5.26-4.45-9.06,0,0-5.47,6.98-3.24,11.7,1.06,2.25,2.56,3.3,3.85,3.8l.03-.11c.05-.16,1.23-3.61,4.08-5.13Z"
            />
            <path
              d="M35.82,40.13s-2.22,8.58-7.33,9.69c-5.11,1.1-7.25-2.55-7.25-2.55,0,0,1.35-4.1,4.67-5.16,3.32-1.06,6.98.46,9.9-1.98Z"
            />
            <path
              d="M30.08,31.99c.09-.39.15-.8.15-1.23,0-3.48-2.56-6.51-1.13-10.03,0,0-7.5,4.73-7,9.93.24,2.47,1.3,3.97,2.35,4.87l.07-.09c.1-.13,2.37-2.98,5.57-3.45Z"
            />
            <path
              d="M41.12,34.02s-4.99,7.33-10.16,6.65c-5.18-.68-5.96-4.84-5.96-4.84,0,0,2.66-3.41,6.14-3.28,3.48.12,6.41,2.78,9.99,1.48Z"
            />
            <path
              d="M38,24.49c.13-.38.24-.78.28-1.2.4-3.46-1.8-6.75.02-10.09,0,0-7.99,3.85-8.08,9.07-.04,2.48.84,4.09,1.78,5.11l.08-.08c.12-.12,2.69-2.7,5.92-2.8Z"
            />
            <path
              d="M48.74,27.75s-5.79,6.72-10.85,5.45c-5.07-1.27-5.37-5.49-5.37-5.49,0,0,3.02-3.08,6.47-2.57,3.45.52,6.06,3.49,9.76,2.6Z"
            />
            <path
              d="M46.67,16.96c.18-.36.33-.74.43-1.16.81-3.39-.97-6.92,1.24-10.02,0,0-8.4,2.85-9.12,8.02-.34,2.46.34,4.16,1.14,5.29l.09-.07c.13-.11,3-2.35,6.22-2.06Z"
            />
            <path
              d="M56.94,21.5s-6.56,5.97-11.43,4.09c-4.88-1.87-4.67-6.1-4.67-6.1,0,0,3.38-2.69,6.73-1.76,3.36.93,5.59,4.2,9.37,3.77Z"
            />
            <path
              d="M56.09,10.85c.23-.33.43-.69.58-1.09,1.27-3.25-.02-6.99,2.59-9.76,0,0-8.7,1.68-10.13,6.7-.68,2.39-.23,4.17.42,5.39l.1-.06c.15-.09,3.29-1.92,6.44-1.19Z"
            />
            <path
              d="M65.64,16.74s-7.31,5.02-11.88,2.5c-4.58-2.52-3.79-6.68-3.79-6.68,0,0,3.71-2.21,6.91-.83,3.2,1.38,4.96,4.92,8.77,5.01Z"
            />
            <path
              d="M58.13,9.97c-.69-1.4-1.57-10.93,15.41-4.93,0,0-4.15,2.19-4.82,3.36-.67,1.18-7.29,8.29-10.59,1.57Z"
            />
            <path
              d="M141.73,132.27c.47-.11.95-.18,1.46-.19,4.15-.05,7.79,2.96,11.97,1.22,0,0-5.54,9-11.74,8.47-2.95-.25-4.75-1.5-5.84-2.73l.11-.08c.16-.13,3.53-2.86,4.04-6.68Z"
            />
            <path
              d="M139.18,119.14s-8.68,6.03-7.79,12.2c.88,6.16,5.85,7.04,5.85,7.04,0,0,4.02-3.21,3.83-7.36-.19-4.15-3.4-7.61-1.89-11.88Z"
            />
            <path
              d="M149.48,123.97c.42-.13.86-.21,1.32-.25,3.79-.25,7.26,2.31,10.99.5,0,0-4.6,8.5-10.29,8.33-2.71-.08-4.41-1.13-5.47-2.2l.09-.08c.14-.12,3.08-2.8,3.35-6.31Z"
            />
            <path
              d="M146.49,112.1s-7.62,5.95-6.5,11.53c1.12,5.58,5.7,6.14,5.7,6.14,0,0,3.51-3.13,3.13-6.91-.38-3.78-3.49-6.77-2.33-10.76Z"
            />
            <path
              d="M156.45,115.14c.36-.2.74-.36,1.16-.48,3.4-.97,7.06.68,10.1-1.7,0,0-2.52,8.63-7.73,9.59-2.48.46-4.24-.16-5.41-.93l.07-.09c.1-.14,2.25-3.14,1.81-6.39Z"
            />
            <path
              d="M151.4,104.93s-5.76,6.91-3.65,11.77c2.11,4.86,6.38,4.46,6.38,4.46,0,0,2.58-3.54,1.49-6.9-1.09-3.36-4.5-5.48-4.22-9.33Z"
            />
            <path
              d="M161.92,105.73c.32-.26.66-.49,1.05-.69,3.17-1.57,7.06-.61,9.62-3.5,0,0-.91,8.95-5.86,10.83-2.36.9-4.2.61-5.48.07l.05-.1c.08-.16,1.64-3.5.63-6.61Z"
            />
            <path
              d="M155.11,96.61s-4.41,7.84-1.46,12.23c2.96,4.4,7.09,3.23,7.09,3.23,0,0,1.9-3.95.22-7.06-1.68-3.11-5.42-4.57-5.84-8.41Z"
            />
            <path
              d="M165.07,95.69c.28-.29.58-.57.94-.81,2.89-1.95,6.82-1.52,8.95-4.67,0,0,.27,8.86-4.32,11.35-2.19,1.19-4.02,1.14-5.35.78l.03-.11c.05-.16,1.15-3.63-.25-6.54Z"
            />
            <path
              d="M157.23,87.66s-3.3,8.23.16,12.15c3.46,3.91,7.35,2.24,7.35,2.24,0,0,1.34-4.1-.71-6.92-2.05-2.82-5.89-3.76-6.81-7.46Z"
            />
            <path
              d="M167.54,84.71c.23-.33.5-.64.82-.92,2.6-2.32,6.56-2.42,8.24-5.84,0,0,1.46,8.74-2.75,11.83-2.01,1.47-3.83,1.67-5.2,1.49l.02-.11c.03-.17.65-3.76-1.13-6.45Z"
            />
            <path
              d="M158.68,77.81s-2.16,8.6,1.8,12.01c3.96,3.41,7.58,1.23,7.58,1.23,0,0,.77-4.25-1.63-6.77-2.41-2.52-6.34-2.94-7.75-6.47Z"
            />
            <path
              d="M167.09,73.69c.18-.36.41-.71.68-1.03,2.24-2.67,6.14-3.33,7.32-6.95,0,0,2.7,8.45-1.04,12.1-1.78,1.74-3.55,2.2-4.93,2.22v-.11c.01-.17.11-3.81-2.03-6.22Z"
            />
            <path
              d="M157.34,68.13s-.91,8.82,3.5,11.63c4.4,2.81,7.68.13,7.68.13,0,0,.16-4.31-2.58-6.46-2.74-2.15-6.7-2-8.59-5.3Z"
            />
            <path
              d="M166.68,62.62c.12-.39.28-.77.49-1.13,1.76-3.01,5.49-4.33,6.03-8.1,0,0,4.09,7.86,1.04,12.1-1.45,2.02-3.13,2.77-4.48,3.03v-.11c-.04-.17-.56-3.77-3.08-5.79Z"
            />
            <path
              d="M156.13,58.8s.61,8.85,5.42,10.87c4.82,2.02,7.59-1.18,7.59-1.18,0,0-.58-4.28-3.64-5.93-3.07-1.65-6.94-.83-9.37-3.76Z"
            />
            <path
              d="M163.31,51.5c.06-.4.15-.8.3-1.2,1.25-3.25,4.72-5.15,4.66-8.96,0,0,5.3,7.11,2.97,11.78-1.11,2.22-2.64,3.24-3.94,3.7l-.03-.11c-.05-.16-1.14-3.64-3.96-5.22Z"
            />
            <path
              d="M152.28,49.42s2.02,8.63,7.1,9.86c5.08,1.22,7.3-2.38,7.3-2.38,0,0-1.25-4.13-4.55-5.27-3.3-1.14-6.98.29-9.85-2.21Z"
            />
            <path
              d="M158.22,41.95c.05-.4.13-.8.28-1.2,1.17-3.28,4.6-5.26,4.45-9.06,0,0,5.47,6.98,3.24,11.7-1.06,2.25-2.56,3.3-3.85,3.8l-.03-.11c-.05-.16-1.23-3.61-4.08-5.13Z"
            />
            <path
              d="M147.14,40.13s2.22,8.58,7.33,9.69c5.11,1.1,7.25-2.55,7.25-2.55,0,0-1.35-4.1-4.67-5.16-3.32-1.06-6.98.46-9.9-1.98Z"
            />
            <path
              d="M152.88,31.99c-.09-.39-.15-.8-.15-1.23,0-3.48,2.56-6.51,1.13-10.03,0,0,7.5,4.73,7,9.93-.24,2.47-1.3,3.97-2.35,4.87l-.07-.09c-.1-.13-2.37-2.98-5.57-3.45Z"
            />
            <path
              d="M141.84,34.02s4.99,7.33,10.16,6.65c5.18-.68,5.96-4.84,5.96-4.84,0,0-2.66-3.41-6.14-3.28-3.48.12-6.41,2.78-9.99,1.48Z"
            />
            <path
              d="M144.96,24.49c-.13-.38-.24-.78-.28-1.2-.4-3.46,1.8-6.75-.02-10.09,0,0,7.99,3.85,8.08,9.07.04,2.48-.84,4.09-1.78,5.11l-.08-.08c-.12-.12-2.69-2.7-5.92-2.8Z"
            />
            <path
              d="M134.21,27.75s5.79,6.72,10.85,5.45c5.07-1.27,5.37-5.49,5.37-5.49,0,0-3.02-3.08-6.47-2.57-3.45.52-6.06,3.49-9.76,2.6Z"
            />
            <path
              d="M136.29,16.96c-.18-.36-.33-.74-.43-1.16-.81-3.39.97-6.92-1.24-10.02,0,0,8.4,2.85,9.12,8.02.34,2.46-.34,4.16-1.14,5.29l-.09-.07c-.13-.11-3-2.35-6.22-2.06Z"
            />
            <path
              d="M126.02,21.5s6.56,5.97,11.43,4.09c4.88-1.87,4.67-6.1,4.67-6.1,0,0-3.38-2.69-6.73-1.76-3.36.93-5.59,4.2-9.37,3.77Z"
            />
            <path
              d="M126.87,10.85c-.23-.33-.43-.69-.58-1.09-1.27-3.25.02-6.99-2.59-9.76,0,0,8.7,1.68,10.13,6.7.68,2.39.23,4.17-.42,5.39l-.1-.06c-.15-.09-3.29-1.92-6.44-1.19Z"
            />
            <path
              d="M117.32,16.74s7.31,5.02,11.88,2.5c4.58-2.52,3.8-6.68,3.8-6.68,0,0-3.71-2.21-6.91-.83-3.2,1.38-4.96,4.92-8.77,5.01Z"
            />
            <path
              d="M124.83,9.97c.69-1.4,1.57-10.93-15.41-4.93,0,0,4.15,2.19,4.82,3.36.67,1.18,7.28,8.29,10.59,1.57Z"
            />
            <path
              d="M45.8,140s10.37,12.68,27.93,11.88l-.21-3.34s-12.97,3.06-26.53-9.47l-1.19.93Z"
            />
            <path
              d="M136.74,140s-10.37,12.68-27.93,11.88l.21-3.34s12.97,3.06,26.53-9.47l1.19.93Z"
            />
          </g>
        </svg>
      </div>
      <div class="score-numeric text-center">
        <Fonts
          variant="ui"
          uppercase
          class="text-prohib-black/50 mb-1 text-xs"
        >
          {{ t('end.score_label') }}
        </Fonts>
        <div class="score-row flex items-center justify-center gap-2">
          <Fonts
            tag="span"
            variant="h1"
            class="text-6xl md:text-8xl"
            >{{ score }}</Fonts
          >
          <Fonts
            tag="span"
            variant="h2"
            class="text-2xl opacity-30 md:text-3xl"
            >/ {{ total }}</Fonts
          >
        </div>
      </div>
    </div>
    <Fonts
      tag="h3"
      variant="h1"
      centered
      class="text-prohib-black mt-4 mb-1 text-3xl md:text-4xl"
    >
      {{ rankInfo.title }}
    </Fonts>
    <Fonts
      variant="caption"
      centered
      class="mb-8"
    >
      {{ rankInfo.desc }}
    </Fonts>

    <div
      v-if="!isSaved"
      ref="formRef"
      class="save-form"
    >
      <Fonts
        tag="h4"
        variant="ui"
        uppercase
        class="text-reg-green mb-1"
        >{{ t('end.optional_title') }}</Fonts
      >
      <Fonts
        variant="caption"
        class="mb-4"
        >{{ t('end.social_subtitle') }}</Fonts
      >

      <!-- 1. IDENTITÉ & CONTACT (Essentiel) -->
      <div class="form-group primary-group">
        <div
          class="form-row"
          :class="{ 'has-error': nameError }"
        >
          <div
            v-if="nameError"
            class="input-tooltip"
          >
            {{ nameError }}
            <div class="tooltip-arrow" />
          </div>
          <span class="prefix-icon">👤</span>
          <input
            type="text"
            :value="nameModel"
            :placeholder="t('end.placeholder_name')"
            maxlength="15"
            @input="onNameInput"
            @focus="scrollToForm"
          />
        </div>

        <div
          class="form-row"
          :class="{ 'has-error': emailError }"
        >
          <div
            v-if="emailError"
            class="input-tooltip"
          >
            {{ emailError }}
            <div class="tooltip-arrow" />
          </div>
          <span class="prefix-icon">✉️</span>
          <input
            type="email"
            :value="emailModel"
            :placeholder="t('end.placeholder_email')"
            @input="onEmailInput"
            @focus="scrollToForm"
          />
        </div>

        <div class="consent-row">
          <label class="consent-label">
            <input
              type="checkbox"
              :checked="consentModel"
              @change="onConsentChange"
            />
            <Fonts
              tag="span"
              variant="caption"
              class="consent-text"
            >
              {{ t('end.rgpd_consent') }}
            </Fonts>
          </label>
        </div>
      </div>

      <!-- SÉPARATEUR VISUEL LÉGER -->
      <div class="private-separator" />

      <!-- 2. OPTIONNEL (Gamification / Public) -->
      <div class="form-group optional-group">
        <div class="form-row">
          <span class="prefix-icon">#</span>
          <input
            type="text"
            :value="memberIdModel"
            :placeholder="t('end.placeholder_id')"
            @input="onMemberIdInput"
            @focus="scrollToForm"
          />
        </div>

        <div
          v-if="socialNetworks.length"
          class="social-section"
        >
          <div class="social-bar">
            <button
              v-for="net in socialNetworks"
              :key="net.id"
              class="icon-btn"
              :class="{ active: visibleNetworks.includes(net.id) || socialsModel[net.id] }"
              :title="net.label"
              @click="emit('toggleNetwork', net.id)"
            >
              <span v-html="net.icon" />
            </button>
          </div>
          <transition-group name="slide">
            <div
              v-for="net in socialNetworks"
              v-show="visibleNetworks.includes(net.id) || socialsModel[net.id]"
              :key="net.id"
              class="form-row social-row"
            >
              <span
                class="prefix-icon social-icon"
                v-html="net.icon"
              />
              <input
                type="text"
                :value="socialsModel[net.id]"
                :placeholder="net.label"
                @input="(e) => onSocialInput(net.id, e)"
                @focus="scrollToForm"
              />
              <button
                class="close-btn"
                @click="emit('clearInputSocial', net.id)"
              >
                ×
              </button>
            </div>
          </transition-group>
        </div>
      </div>

      <Fonts
        tag="div"
        variant="caption"
        class="legal-disclaimer"
      >
        <i18n-t keypath="end.rgpd_global_disclaimer">
          <template #privacy_policy>
            <a
              href="#"
              class="privacy-link"
              @click.prevent="showPrivacyModal = true"
            >
              {{ t('end.privacy_policy_title') }}
            </a>
          </template>
        </i18n-t>
      </Fonts>

      <div class="actions-row">
        <Button
          variant="pill"
          :is-loading="isSubmitting"
          :disabled="!nameModel || !emailModel"
          class="flex-1"
          @click="emit('save')"
        >
          {{ hasMedal ? t('end.btn_save') : t('end.btn_save_no_medal') }}
        </Button>
        <Button
          variant="ghost"
          class="text-prohib-black/50!"
          @click="emit('restart')"
        >
          {{ t('end.btn_skip') }}
        </Button>
      </div>
    </div>

    <div
      v-else
      class="leaderboard-wrapper"
    >
      <div
        v-if="hasMedal"
        class="final-actions top-actions"
      >
        <Button
          variant="primary"
          class="w-full"
          :is-loading="isGenerating"
          @click="emit('share')"
        >
          {{ t('end.share_modal.title') }}
        </Button>
      </div>

      <div class="leaderboard-container">
        <h4>{{ t('end.top_10') }}</h4>
        <div class="leaderboard-scroll">
          <table class="leaderboard-table">
            <thead>
              <tr>
                <th
                  v-for="col in ['rank', 'name', 'score']"
                  :key="col"
                >
                  {{ t('end.col_' + col) }}
                </th>
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
                    <span
                      v-if="entry.memberId"
                      class="badge-member"
                      >#{{ entry.memberId }}</span
                    >
                  </div>
                  <div
                    v-if="entry.socials && socialNetworks.length"
                    class="social-icons"
                  >
                    <template
                      v-for="net in socialNetworks"
                      :key="net.id"
                    >
                      <a
                        v-if="entry.socials[net.id]"
                        :href="entry.socials[net.id]"
                        target="_blank"
                        class="s-lnk"
                        v-html="net.icon"
                      />
                    </template>
                  </div>
                </td>
                <td class="score-val">
                  {{ entry.score }}
                  <span
                    v-if="entry.time"
                    class="time-spent"
                  >
                    {{ Math.floor(entry.time / 60) }}m {{ entry.time % 60 }}s
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div class="final-actions bottom-actions">
        <Button
          variant="primary"
          size="lg"
          full-width
          @click="emit('restart')"
        >
          {{ t('end.btn_retry') }}
        </Button>
        <a
          :href="t('end.btn_join.url')"
          target="_blank"
          class="link-join"
        >
          {{ t('end.btn_join.text') }}
        </a>
      </div>
    </div>

    <!-- MODALE DU CERTIFICAT (RESTAURÉE) -->
    <div
      v-if="showShareModal"
      class="share-modal-overlay"
      @click.self="emit('closeModal')"
    >
      <div class="share-modal-content">
        <h3 class="modal-hint">{{ t('end.share_modal.hint') }}</h3>
        <div class="preview-img-container">
          <img
            v-if="generatedImageUrl"
            :src="generatedImageUrl"
            alt="Score"
            class="preview-img"
          />
        </div>
        <div class="share-buttons-row">
          <button
            v-for="net in socialNetworks"
            :key="net.id"
            class="btn-network-circle"
            :style="{ backgroundColor: net.color }"
            :title="net.label"
            @click="emit('download', net)"
          >
            <span
              class="icon"
              v-html="net.icon"
            />
          </button>
        </div>
        <button
          class="btn-close-modal"
          @click="emit('closeModal')"
        >
          {{ t('end.share_modal.btn_close') }}
        </button>
      </div>
    </div>

    <!-- MODALE PRIVACY (REUTILISATION DU STYLE) -->
    <div
      v-if="showPrivacyModal"
      class="share-modal-overlay"
      @click.self="showPrivacyModal = false"
    >
      <div class="share-modal-content">
        <h3>{{ t('end.privacy_policy_title') }}</h3>
        <p
          class="modal-hint"
          style="text-align: left; margin-bottom: 20px; line-height: 1.5; white-space: pre-line"
        >
          {{ t('end.privacy_policy_text') }}
        </p>
        <button
          class="btn-close-modal"
          @click="showPrivacyModal = false"
        >
          {{ t('end.share_modal.btn_close') }}
        </button>
      </div>
    </div>
  </div>
</template>
