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
    class="mx-auto flex w-full max-w-[400px] flex-1 flex-col px-6 py-8 md:py-16"
  >
    <!-- Step: Welcome -->
    <div
      v-if="currentStep === 'welcome'"
      class="flex flex-1 flex-col items-center justify-between pb-4 text-center"
    >
      <Fonts
        tag="h1"
        variant="h1"
        class="text-prohib-black mt-4"
        :content="t('start.title')"
      />

      <Button
        variant="ghost"
        size="lg"
        arrow
        is-simple
        class="self-end"
        @click="goToStep('intro')"
      >
        {{ t('start.btn_get_certified').replace('→', '').trim() }}
      </Button>
    </div>

    <!-- Step: Intro (Mise au point) -->
    <div
      v-if="currentStep === 'intro'"
      class="bg-reg-green -mx-6 flex flex-1 flex-col justify-between gap-6 px-6 py-10 text-white shadow-[0_0_0_100vmax_var(--color-reg-green)] [clip-path:inset(0_-100vmax)] md:px-12 md:py-16"
    >
      <div class="space-y-6">
        <Fonts
          tag="h2"
          variant="intro"
          class="border-white text-white"
        >
          {{ t('start.subtitle') }}
        </Fonts>

        <div class="space-y-5">
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
        class="self-end text-white!"
        @click="goToStep('difficulty')"
      >
        {{ t('start.btn_start').replace('→', '').trim() }}
      </Button>
    </div>

    <!-- Step: Difficulty -->
    <div
      v-if="currentStep === 'difficulty'"
      class="flex flex-1 flex-col items-center justify-between pb-4"
    >
      <div
        class="bg-reg-green mt-4 -rotate-1 px-6 py-3 text-white shadow-[6px_6px_0px_0px_rgba(20,20,20,1)]"
      >
        <Fonts
          tag="h2"
          variant="h2"
          uppercase
          centered
        >
          {{ t('start.choose_level') }}
        </Fonts>
      </div>

      <div class="grid w-full max-w-[280px] grid-cols-1 gap-4">
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

<style scoped></style>
