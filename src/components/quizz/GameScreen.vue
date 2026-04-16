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
  if (props.verifyingIdx === idx) return 'is-verifying'
  if (!hasAnswered || correctAnswer === undefined) return 'is-pending'

  if (originalIdx === correctAnswer) return 'is-correct'
  if (selectedAnswer === originalIdx) return 'is-wrong'
  return 'is-disabled'
}
</script>

<template>
  <main class="game-screen-wrapper">
    <div class="game-screen-inner">
      <Transition
        name="fade-slide"
        mode="out-in"
      >
        <div
          :key="question._id"
          class="game-content-stack"
        >
          <!-- Question Card -->
          <div class="question-card">
            <span class="category-badge">
              {{ question.category }}
            </span>
            <Fonts
              tag="h2"
              variant="h1"
              uppercase
              class="question-text"
              :content="question.question"
            />
          </div>

          <!-- Options Grid -->
          <div class="options-grid">
            <button
              v-for="(opt, index) in options"
              :key="index"
              class="option-btn"
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
              <span class="option-letter">{{ optionLetters[index] }}</span>
              <span class="option-text">
                {{ opt.text }}
                <Loader
                  v-if="verifyingIdx === index"
                  size="xs"
                  inline
                />
              </span>

              <span
                v-if="showPointPopup && selectedAnswer === opt.originalIndex && isCorrect"
                class="point-popup"
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
              class="feedback-box"
              :class="isCorrect ? 'is-correct border-reg-green' : 'border-error-red'"
            >
              <div class="flex items-center gap-4">
                <span
                  v-if="isCorrect"
                  class="feedback-icon-correct"
                  >✓</span
                >
                <span
                  v-else
                  class="feedback-icon-wrong"
                  >✗</span
                >
                <Fonts
                  tag="span"
                  variant="h1"
                  uppercase
                  class="feedback-title"
                  :class="isCorrect ? 'text-reg-green' : 'text-error-red'"
                >
                  {{ isCorrect ? t('game.correct') : t('game.wrong') }}
                </Fonts>
              </div>

              <div class="feedback-explanation-box">
                <Fonts
                  variant="ui"
                  uppercase
                  class="feedback-arg-label"
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
                class="feedback-btn-next"
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
@reference "../../styles/main.css";

.game-screen-wrapper {
  @apply bg-poster-beige w-full flex-1 overflow-y-auto p-6 md:p-12;

  & .game-screen-inner {
    @apply mx-auto w-full max-w-4xl;

    & .game-content-stack {
      @apply flex flex-col gap-8 md:gap-12;

      /* Question Card */
      & .question-card {
        @apply border-prohib-black shadow-brutal-xl relative border-4 bg-white p-8 md:p-12;

        & .category-badge {
          @apply bg-reg-green absolute -top-4 -left-4 px-4 py-2 text-sm font-black tracking-widest text-white uppercase;
        }
        & .question-text {
          @apply text-2xl leading-tight md:text-4xl;
        }
      }

      /* Options Grid */
      & .options-grid {
        @apply grid grid-cols-1 gap-4 md:grid-cols-2;

        & .option-btn {
          @apply relative flex items-center gap-6 border-4 p-6 text-left transition-all duration-200 active:translate-y-1;

          &:hover .option-letter {
            @apply opacity-100;
          }

          &.is-verifying { @apply bg-white/50 border-reg-green animate-pulse; }
          &.is-pending { @apply bg-white hover:bg-reg-green/5 border-reg-green/20; }
          &.is-correct { @apply bg-reg-green text-white border-reg-green; }
          &.is-wrong { @apply bg-error-red text-white border-error-red; }
          &.is-disabled { @apply bg-white/50 opacity-40 border-reg-green/10 cursor-not-allowed; }

          & .option-letter {
            @apply text-2xl font-black opacity-30 md:text-3xl transition-opacity duration-200;
          }
          & .option-text {
            @apply flex items-center gap-2 text-lg font-bold uppercase md:text-xl;
          }
          & .point-popup {
            @apply bg-reg-green absolute -top-8 left-1/2 -translate-x-1/2 animate-ping px-4 py-2 font-black text-white;
          }
        }
      }

      /* Feedback Box */
      & .feedback-box {
        @apply shadow-brutal-soft flex flex-col gap-6 border-4 p-8 bg-white;

        & .feedback-icon-correct { @apply text-reg-green text-2xl font-black md:text-3xl; }
        & .feedback-icon-wrong { @apply text-error-red text-2xl font-black md:text-3xl; }
        & .feedback-title { @apply text-2xl md:text-3xl; }
        & .feedback-explanation-box {
          @apply space-y-4;
          & .feedback-arg-label { @apply text-prohib-black/50 text-sm tracking-widest; }
        }
        & .feedback-btn-next { @apply mt-4; }
      }
    }
  }
}

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
