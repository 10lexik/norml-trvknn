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
    class="loader-wrapper"
    :class="[
      inline ? 'is-inline' : 'is-block',
      { 'is-fullscreen': fullscreen }
    ]"
  >
    <div
      class="loader-spinner"
      :class="[`loader-sz-${size}`, { 'has-margin': !inline }]"
    />
    <p
      v-if="message !== '' && !inline"
      class="loader-text"
    >
      {{ message || t('ui.loading') }}
    </p>
    <span
      v-else-if="message && inline"
      class="loader-text-inline"
    >
      {{ message }}
    </span>
  </div>
</template>

<style scoped>
@reference "../../styles/main.css";

.loader-wrapper {
  &.is-inline {
    @apply inline-flex items-center gap-2;
  }

  &.is-block {
    @apply flex flex-col items-center justify-center p-6 flex-1;
  }

  &.is-fullscreen {
    @apply bg-poster-beige/80 fixed inset-0 z-50 h-screen w-screen backdrop-blur-sm flex-1 flex-col items-center justify-center p-6;
  }

  & .loader-spinner {
    @apply border-prohib-black/10 border-t-reg-green animate-spin rounded-full;

    &.has-margin {
      @apply mb-4;
    }

    /* Tailles */
    &.loader-sz-xs {
      @apply h-4 w-4 border-2;
    }

    &.loader-sz-sm {
      @apply h-8 w-8 border-2;
    }

    &.loader-sz-md {
      @apply h-12 w-12 border-4;
    }

    &.loader-sz-lg {
      @apply h-20 w-20 border-[6px];
    }
  }

  & .loader-text {
    @apply text-center font-mono text-[10px] font-bold tracking-widest uppercase italic opacity-60;
  }

  & .loader-text-inline {
    @apply text-inherit;
  }
}
</style>
