<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import Button from './Button.vue'

interface Props {
  title?: string
  message: string
  showRetry?: boolean
}

const { t } = useI18n()

withDefaults(defineProps<Props>(), {
  title: '',
  showRetry: true
})

const emit = defineEmits<{
  (e: 'retry'): void
}>()
</script>

<template>
  <div class="error-wrapper animate-in fade-in slide-in-from-bottom-4 duration-500">
    <div class="error-icon-box">
      <span class="error-icon-text">!</span>
    </div>

    <h3 class="error-title">
      {{ title || t('ui.error_title') }}
    </h3>

    <p class="error-message">
      {{ message }}
    </p>

    <Button
      v-if="showRetry"
      variant="pill"
      @click="emit('retry')"
    >
      {{ t('ui.btn_retry') }}
    </Button>
  </div>
</template>

<style scoped>
@reference "../../styles/main.css";

.error-wrapper {
  @apply flex flex-1 flex-col items-center justify-center p-6 text-center;

  & .error-icon-box {
    @apply bg-error-red/10 text-error-red mb-6 flex h-16 w-16 items-center justify-center rounded-full;

    & .error-icon-text {
      @apply text-3xl font-black;
    }
  }

  & .error-title {
    @apply text-error-red mb-3 text-xl font-black tracking-tight uppercase md:text-2xl;
  }

  & .error-message {
    @apply mb-8 max-w-xs text-sm leading-relaxed font-medium opacity-80 md:text-base;
  }
}
</style>
