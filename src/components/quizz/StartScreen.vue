<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const LEVEL_IDS = ['easy', 'medium', 'hard']

defineProps<{
  isLoading: boolean
  error: string | null
}>()

const emit = defineEmits<{
  (e: 'start', difficulty: string): void
  (e: 'retry'): void
}>()
</script>

<template>
  <div>
    <div v-if="isLoading" class="screen loading-screen">
      <div class="loader-spinner"></div>
      <p>{{ t('ui.loading') }}</p>
    </div>
    <div v-else-if="error" class="screen error-screen">
      <h3 class="error-title">{{ t('ui.error_title') }}</h3>
      <p>{{ error }}</p>
      <button class="btn-primary" @click="emit('retry')">
        {{ t('ui.btn_retry') }}
      </button>
    </div>
    <div v-else class="screen start-screen">
      <h1>{{ t('start.title') }}</h1>
      <p class="subtitle">{{ t('start.subtitle') }}</p>

      <div class="difficulty-selector">
        <p>{{ t('start.choose_level') }}</p>
        <button
          v-for="id in LEVEL_IDS"
          :key="id"
          class="btn-diff"
          :class="id"
          @click="emit('start', id)"
        >
          {{ t('levels.' + id + '.icon') }} {{ t('levels.' + id + '.label') }}
        </button>
      </div>
    </div>
  </div>
</template>
