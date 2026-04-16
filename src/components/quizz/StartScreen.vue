<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Loader from '../ui/Loader.vue'
import ErrorState from '../ui/ErrorState.vue'
import Button from '../ui/Button.vue'
import Fonts from '../ui/Fonts.vue'

const { t, tm } = useI18n()

defineProps<{
  isLoading: boolean
  error: string | null
}>()

const emit = defineEmits<{
  (e: 'start', difficulty: string): void
  (e: 'retry'): void
}>()

// Step control
type Step = 'welcome' | 'intro' | 'difficulty'
const currentStep = ref<Step>('welcome')

const goToStep = (step: Step) => {
  currentStep.value = step
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
</script>

<template>
  <!-- Loading/Error handle -->
  <Loader v-if="isLoading" />
  <ErrorState
    v-else-if="error"
    :message="error"
    @retry="emit('retry')"
  />

  <!-- MAIN STEPS -->
  <div
    v-else
    class="start-screen-wrapper"
  >
    <!-- Step: Welcome -->
    <div
      v-if="currentStep === 'welcome'"
      class="step-welcome"
    >
      <Fonts
        tag="h1"
        variant="h1"
        class="title-welcome"
        :content="t('start.title')"
      />

      <Button
        variant="ghost"
        size="lg"
        arrow
        is-simple
        class="btn-next"
        @click="goToStep('intro')"
      >
        {{ t('start.btn_get_certified').replace('→', '').trim() }}
      </Button>
    </div>

    <!-- Step: Intro (Mise au point) -->
    <div
      v-if="currentStep === 'intro'"
      class="step-intro"
    >
      <div class="intro-content">
        <div class="intro-text-group">
          <Fonts
            v-for="(content, key) in tm('start.intro')"
            :key="key"
            variant="body"
            :content="content"
          />
        </div>
      </div>

      <Button
        variant="ghost"
        size="lg"
        arrow
        class="btn-next-intro"
        @click="goToStep('difficulty')"
      >
        {{ t('start.btn_start').replace('→', '').trim() }}
      </Button>
    </div>

    <!-- Step: Difficulty -->
    <div
      v-if="currentStep === 'difficulty'"
      class="step-difficulty"
    >
      <div class="difficulty-title-wrapper">
        <Fonts
          tag="h2"
          variant="h2"
          uppercase
          centered
        >
          {{ t('start.choose_level') }}
        </Fonts>
      </div>

      <div class="difficulty-grid">
        <Button
          v-for="(level, id) in tm('levels')"
          :key="id"
          variant="level"
          arrow
          :icon="level.icon"
          @click="emit('start', id as string)"
        >
          {{ level.label }}
        </Button>
      </div>
    </div>
  </div>
</template>

<style scoped>
@reference "../../styles/main.css";

.start-screen-wrapper {
  @apply flex h-full w-full max-w-[400px] flex-1 flex-col;

  & .steps-container {
    @apply flex flex-col items-center justify-center;
  }

  /* STEP 1: WELCOME */
  & .step-welcome {
    @apply flex h-full flex-col items-center justify-between text-center;

    & .logo-big {
      @apply mb-12 h-48 w-auto md:h-64;
    }

    & .welcome-title {
      @apply text-prohib-black mb-6 text-4xl font-black uppercase md:text-6xl;
    }

    & .intro-text {
      @apply text-prohib-black/60 mx-auto max-w-xl text-lg;
    }
  }

  /* STEP 2: INTRO_TXT / INSTRUCTIONS */
  & .step-intro {
    @apply bg-reg-green bg-full-bleed-green -mx-6 flex flex-1 flex-col justify-between gap-6 px-6 py-10 text-white md:px-12 md:py-16;

    & .btn-next-intro {
      @apply self-end text-white!;
    }
  }

  /* STEP 3: DIFFICULTY */
  & .step-difficulty {
    @apply flex flex-1 flex-col items-center justify-around;

    & .difficulty-title-wrapper {
      @apply bg-reg-green shadow-brutal-sm mt-4 -rotate-1 px-6 py-3 text-white;
    }

    & .difficulty-grid {
      @apply grid w-full max-w-[280px] grid-cols-1 gap-4;
    }
  }

  & .start-actions {
    @apply mt-12 flex w-full flex-col gap-4;
  }
}
</style>
