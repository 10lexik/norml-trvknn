<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'

import goldMedalImg from '@/assets/img/gold.svg'
import silverMedalImg from '@/assets/img/silver.svg'
import bronzeMedalImg from '@/assets/img/bronze.svg'

const { t, locale } = useI18n()

const props = defineProps<{
  score: number
  total: number
  rankTitle: string
  rankDesc: string
  medal: 'gold' | 'silver' | 'bronze' | null
  difficulty: string
  mode?: 'hidden' | 'preview'
}>()

const cardElRef = ref<HTMLElement | null>(null)
defineExpose({ cardEl: cardElRef })

const medalLabel = computed(() => {
  if (props.medal === 'gold') return t('end.share_card.medal_gold')
  if (props.medal === 'silver') return t('end.share_card.medal_silver')
  if (props.medal === 'bronze') return t('end.share_card.medal_bronze')
  return ''
})

const medalImageSrc = computed(() => {
  if (props.medal === 'gold') return goldMedalImg
  if (props.medal === 'silver') return silverMedalImg
  if (props.medal === 'bronze') return bronzeMedalImg
  return ''
})

const generatedDate = computed(() => {
  return new Date().toLocaleDateString(locale.value, {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  })
})

const badgeColor = computed(() => {
  switch (props.difficulty) {
    case 'hard':
      return '#fbb03b'
    case 'medium':
      return '#c0c0c0'
    default:
      return '#bf8970'
  }
})
</script>

<template>
  <div
    ref="cardElRef"
    class="share-card-hidden"
    :class="[medal ? `medal-${medal}` : '', { 'is-preview': mode === 'preview' }]"
  >
    <div class="cert-inner">
      <!-- BLOC MÉDAILLE -->
      <div class="cert-medal-block">
        <!-- Médaille SVG Externe -->
        <div class="medal-glow" />
        <img
          v-if="medalImageSrc"
          :src="medalImageSrc"
          class="medal-image"
          alt="Médaille du Quizz"
        />

        <div class="cert-badge-container">
          <svg
            viewBox="0 0 450 90"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect
              x="0"
              y="0"
              width="450"
              height="90"
              rx="45"
              :fill="badgeColor"
            />
            <text
              x="225"
              y="48"
              font-family="Outfit, sans-serif"
              font-weight="900"
              font-size="44"
              fill="#0a0a0a"
              text-anchor="middle"
              dominant-baseline="central"
              style="text-transform: uppercase; letter-spacing: 2px"
            >
              {{ t('levels.' + difficulty + '.label') }}
            </text>
          </svg>
        </div>

        <div
          class="cert-score-big"
          :style="{ color: `var(--medal-color-primary)` }"
        >
          {{ score
          }}<span
            class="small"
            :style="{ color: `var(--medal-color-primary)`, opacity: 0.6 }"
            >/{{ total }}</span
          >
        </div>
      </div>

      <!-- TITRE DU RANG -->
      <div
        class="cert-rank-title"
        :style="{ color: `var(--medal-color-primary)` }"
      >
        {{ rankTitle }}
      </div>

      <!-- PIED DE PAGE -->
      <div class="cert-footer">
        <div class="cert-footer-site">{{ t('end.share_card.website') }}</div>
        <div class="cert-footer-date">
          {{ t('end.share_card.delivered_on') }} {{ generatedDate }}
        </div>
      </div>
    </div>
  </div>
</template>
