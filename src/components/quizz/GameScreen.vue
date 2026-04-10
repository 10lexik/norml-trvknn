<script setup lang="ts">
import { watch, nextTick, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Loader from '../ui/Loader.vue'
import Button from '../ui/Button.vue'
import Fonts from '../ui/Fonts.vue'
import type { Question } from '../../types/quizz'

const { t, tm } = useI18n()

const props = defineProps<{
  question: Question
  options: { text: string; originalIndex: number }[]
  hasAnswered: boolean
  isCorrect: boolean
  isLastQuestion: boolean
  isChecking: boolean
  selectedAnswer: number | null
  showPointPopup: boolean
  verifyingIdx: number | null
}>()

const emit = defineEmits<{
  (e: 'select', originalIndex: number, domIndex: number): void
  (e: 'next'): void
}>()

const optionLetters = tm('game.letters') as string[]
const feedbackBox = ref<HTMLElement | null>(null)

watch(
  () => props.hasAnswered,
  async (newVal) => {
    if (newVal) {
      await nextTick()
      if (feedbackBox.value) {
        feedbackBox.value.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
  }
)

const getOptionClass = (
  idx: number,
  originalIdx: number,
  hasAnswered: boolean,
  selectedAnswer: number | null,
  correctAnswer?: number
) => {
  if (props.verifyingIdx === idx) return 'bg-white/50 border-reg-green animate-pulse'
  if (!hasAnswered || correctAnswer === undefined)
    return 'bg-white hover:bg-reg-green/5 border-reg-green/20'

  if (originalIdx === correctAnswer) return 'bg-reg-green text-white border-reg-green'
  if (selectedAnswer === originalIdx) return 'bg-error-red text-white border-error-red'
  return 'bg-white/50 opacity-40 border-reg-green/10 cursor-not-allowed'
}
</script>

<template>
  <main class="bg-poster-beige w-full flex-1 overflow-y-auto p-6 md:p-12">
    <div class="mx-auto w-full max-w-4xl">
      <Transition
        name="fade-slide"
        mode="out-in"
      >
        <div
          :key="question._id"
          class="flex flex-col gap-8 md:gap-12"
        >
          <!-- Question Card -->
          <div
            class="border-prohib-black relative border-4 bg-white p-8 shadow-[12px_12px_0px_0px_rgba(20,20,20,1)] md:p-12"
          >
            <span
              class="bg-reg-green absolute -top-4 -left-4 px-4 py-2 text-sm font-black tracking-widest text-white uppercase"
            >
              {{ question.category }}
            </span>
            <Fonts
              tag="h2"
              variant="h1"
              uppercase
              class="text-2xl leading-tight md:text-4xl"
              :content="question.question"
            />
          </div>

          <!-- Options Grid -->
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <button
              v-for="(opt, index) in options"
              :key="index"
              class="group relative flex items-center gap-6 border-4 p-6 text-left transition-all duration-200 active:translate-y-1"
              :class="
                getOptionClass(
                  index,
                  opt.originalIndex,
                  hasAnswered,
                  selectedAnswer,
                  question.correct
                )
              "
              :disabled="hasAnswered || isChecking"
              @click="emit('select', index, index)"
            >
              <span class="text-2xl font-black opacity-30 group-hover:opacity-100 md:text-3xl">{{
                optionLetters[index]
              }}</span>
              <span class="flex items-center gap-2 text-lg font-bold uppercase md:text-xl">
                {{ opt.text }}
                <Loader
                  v-if="verifyingIdx === index"
                  size="xs"
                  inline
                />
              </span>

              <span
                v-if="showPointPopup && selectedAnswer === opt.originalIndex && isCorrect"
                class="bg-reg-green absolute -top-8 left-1/2 -translate-x-1/2 animate-ping px-4 py-2 font-black text-white"
              >
                {{ t('game.point_popup') }}
              </span>
            </button>
          </div>

          <!-- Feedback Box -->
          <Transition name="fade-up">
            <div
              v-if="hasAnswered"
              ref="feedbackBox"
              class="flex flex-col gap-6 border-4 p-8 shadow-[8px_8px_0px_0px_rgba(20,20,20,0.2)]"
              :class="isCorrect ? 'border-reg-green bg-white' : 'border-error-red bg-white'"
            >
              <div class="flex items-center gap-4">
                <span
                  v-if="isCorrect"
                  class="text-reg-green text-2xl font-black md:text-3xl"
                  >✓</span
                >
                <span
                  v-else
                  class="text-error-red text-2xl font-black md:text-3xl"
                  >✗</span
                >
                <Fonts
                  tag="span"
                  variant="h1"
                  uppercase
                  class="text-2xl md:text-3xl"
                  :class="isCorrect ? 'text-reg-green' : 'text-error-red'"
                >
                  {{ isCorrect ? t('game.correct') : t('game.wrong') }}
                </Fonts>
              </div>

              <div class="space-y-4">
                <Fonts
                  variant="ui"
                  uppercase
                  class="text-prohib-black/50 text-sm tracking-widest"
                >
                  {{ t('game.argument_label') }}
                </Fonts>
                <Fonts variant="explanation">
                  {{ question.explanation }}
                </Fonts>
              </div>

              <Button
                variant="primary"
                full-width
                class="mt-4"
                @click="emit('next')"
              >
                {{ isLastQuestion ? t('game.btn_results') : t('game.btn_next') }}
              </Button>
            </div>
          </Transition>
        </div>
      </Transition>
    </div>
  </main>
</template>

<style scoped>
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.4s ease;
}
.fade-slide-enter-from {
  opacity: 0;
  transform: translateX(20px);
}
.fade-slide-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

.fade-up-enter-active {
  transition: all 0.5s ease-out;
}
.fade-up-enter-from {
  opacity: 0;
  transform: translateY(30px);
}
</style>
