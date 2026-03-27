<script setup lang="ts">
import { watch, nextTick, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Question } from '../../types/quizz'

const { t } = useI18n()

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

const optionLetters = ['A', 'B', 'C', 'D']
const feedbackBox = ref<HTMLElement | null>(null)

watch(() => props.hasAnswered, async (newVal) => {
  if (newVal) {
    await nextTick()
    if (feedbackBox.value) {
      feedbackBox.value.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }
})

const getOptionClass = (
  idx: number,
  originalIdx: number,
  hasAnswered: boolean,
  selectedAnswer: number | null,
  correctAnswer?: number
) => {
  if (props.verifyingIdx === idx) return 'is-verifying'
  if (!hasAnswered || correctAnswer === undefined) return ''

  if (originalIdx === correctAnswer) return 'correct'
  if (selectedAnswer === originalIdx) return 'wrong'
  return 'dimmed'
}
</script>

<template>
  <div class="screen game-screen">
    <div class="question-card">
      <span class="category-tag">{{ question.category }}</span>
      <h2>{{ question.question }}</h2>
    </div>
    
    <div class="options-grid">
      <button
        v-for="(opt, index) in options"
        :key="index"
        class="btn-option"
        :class="getOptionClass(index, opt.originalIndex, hasAnswered, selectedAnswer, question.correct)"
        :disabled="hasAnswered || isChecking"
        @click="emit('select', index, index)"
      >
        <span v-if="verifyingIdx === index" class="mini-loader"></span>
        <span class="letter">{{ optionLetters[index] }}</span>
        <span class="text">{{ opt.text }}</span>
        <span
          v-if="showPointPopup && selectedAnswer === opt.originalIndex && isCorrect"
          class="point-popup"
        >
          {{ t('game.point_popup') }}
        </span>
      </button>
    </div>

    <div
      v-if="hasAnswered"
      ref="feedbackBox"
      class="feedback-box"
      :class="isCorrect ? 'success' : 'error'"
    >
      <div class="feedback-header">
        {{ isCorrect ? t('game.correct') : t('game.wrong') }}
      </div>
      <div class="feedback-content">
        <strong>{{ t('game.argument_label') }}</strong>
        <p>{{ question.explanation }}</p>
      </div>
      <button class="btn-next" @click="emit('next')">
        {{ isLastQuestion ? t('game.btn_results') : t('game.btn_next') }}
      </button>
    </div>
  </div>
</template>
