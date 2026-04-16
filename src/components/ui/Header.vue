<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import logoUrl from '@/assets/img/logo.svg'

interface Props {
  difficulty?: string | null
  score?: number
  total?: number
  progress?: number
  showProgress?: boolean
  isSimple?: boolean
}

const { t } = useI18n()

withDefaults(defineProps<Props>(), {
  difficulty: null,
  score: 0,
  total: 0,
  progress: 0,
  showProgress: false,
  isSimple: false
})
</script>

<template>
  <header
    class="header-main"
    :class="isSimple ? 'is-simple' : 'is-game'"
  >
    <div
      class="header-inner"
      :class="isSimple ? 'is-simple-inner' : 'is-game-inner'"
    >
      <div
        class="logo-wrapper"
        :class="isSimple ? 'logo-large' : 'logo-small'"
      >
        <img
          :src="logoUrl"
          :alt="t('header.brand')"
          class="logo-img"
        />
      </div>

      <div
        v-if="!isSimple && difficulty"
        class="score-hud animate-in slide-in-from-right-4 fade-in duration-500"
      >
        <span class="diff-badge">
          {{ t('levels.' + difficulty + '.label') }}
        </span>
        <span class="score-text"> {{ score }} / {{ total }} </span>
      </div>
    </div>

    <!-- Progress Bar (Only during play) -->
    <div
      v-if="showProgress && !isSimple"
      class="progress-wrapper animate-in fade-in duration-700"
    >
      <div
        class="progress-bar"
        :style="{ width: progress + '%' }"
      />
    </div>
  </header>
</template>

<style scoped>
@reference "../../styles/main.css";

.header-main {
  @apply flex w-full flex-col items-center transition-all duration-300;

  z-index: 40;

  &.is-simple {
  }
  &.is-game {
    @apply bg-poster-beige border-prohib-black/10 border-b px-6 pt-6 pb-2;
  }

  & .header-inner {
    @apply flex w-full max-w-4xl items-center transition-all duration-500;

    &.is-simple-inner {
      @apply justify-center;
    }
    &.is-game-inner {
      @apply mb-4 justify-between;
    }
  }

  & .logo-wrapper {
    @apply transition-all duration-500;

    &.logo-large {
      @apply w-[160px] py-4;
    }
    &.logo-small {
      @apply h-8 md:h-10;
    }

    & .logo-img {
      @apply block h-auto w-full;
    }
  }

  & .score-hud {
    @apply flex items-center gap-4;

    & .diff-badge {
      @apply bg-reg-green rounded px-3 py-1 text-xs font-bold tracking-wider text-white uppercase;
    }
    & .score-text {
      @apply text-prohib-black font-mono text-lg font-bold;
    }
  }

  & .progress-wrapper {
    @apply bg-prohib-black/5 h-2 w-full max-w-4xl overflow-hidden rounded-full;

    & .progress-bar {
      @apply bg-reg-green h-full transition-all duration-300;
    }
  }
}
</style>
