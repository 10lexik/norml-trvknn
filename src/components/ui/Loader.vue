<script setup lang="ts">
import { useI18n } from 'vue-i18n'

interface Props {
  message?: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
  fullscreen?: boolean
  inline?: boolean
}

const { t } = useI18n()

withDefaults(defineProps<Props>(), {
  size: 'md',
  fullscreen: false,
  inline: false
})
</script>

<template>
  <div
    :class="[
      inline ? 'inline-flex items-center gap-2' : 'flex flex-col items-center justify-center p-6',
      fullscreen
        ? 'bg-poster-beige/80 fixed inset-0 z-50 h-screen w-screen backdrop-blur-sm'
        : inline
          ? ''
          : 'flex-1'
    ]"
  >
    <div
      class="border-prohib-black/10 border-t-reg-green animate-spin rounded-full"
      :class="[
        inline ? '' : 'mb-4',
        {
          'h-4 w-4 border-2': size === 'xs',
          'h-8 w-8 border-2': size === 'sm',
          'h-12 w-12 border-4': size === 'md',
          'h-20 w-20 border-[6px]': size === 'lg'
        }
      ]"
    />
    <p
      v-if="message !== '' && !inline"
      class="text-center font-mono text-[10px] font-bold tracking-widest uppercase italic opacity-60"
    >
      {{ message || t('ui.loading') }}
    </p>
    <span
      v-else-if="message && inline"
      class="text-inherit"
    >
      {{ message }}
    </span>
  </div>
</template>

<style scoped>
/* No specific styles needed as we use Tailwind */
</style>
