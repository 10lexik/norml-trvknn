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
  <div
    class="animate-in fade-in slide-in-from-bottom-4 flex flex-1 flex-col items-center justify-center p-6 text-center duration-500"
  >
    <div
      class="bg-error-red/10 text-error-red mb-6 flex h-16 w-16 items-center justify-center rounded-full"
    >
      <span class="text-3xl font-black">!</span>
    </div>

    <h3 class="text-error-red mb-3 text-xl font-black tracking-tight uppercase md:text-2xl">
      {{ title || t('ui.error_title') }}
    </h3>

    <p class="mb-8 max-w-xs text-sm leading-relaxed font-medium opacity-80 md:text-base">
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
/* No specific global styles needed */
</style>
