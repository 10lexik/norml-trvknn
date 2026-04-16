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
    class="share-card-root"
    :class="[medal ? `is-medal-${medal}` : '', { 'is-preview': mode === 'preview' }]"
  >
    <div class="cert-inner">
      <!-- BLOC MÉDAILLE -->
      <div class="cert-medal-block">
        <div class="medal-glow" />
        <img
          v-if="medalImageSrc"
          :src="medalImageSrc"
          class="medal-image"
          alt="Médaille"
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

        <div class="cert-score-big">
          {{ score }}<span class="score-total">/{{ total }}</span>
        </div>
      </div>

      <!-- TITRE DU RANG -->
      <div class="cert-rank-title">
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

<style scoped>
@reference "../../styles/main.css";

.share-card-root {
  --medal-color-primary: #bf8970;
  --medal-color-glow: rgba(191, 137, 112, 0.3);

  &.is-medal-gold {
    --medal-color-primary: #fbb03b;
    --medal-color-glow: rgba(251, 176, 59, 0.4);
  }

  &.is-medal-silver {
    --medal-color-primary: #c0c0c0;
    --medal-color-glow: rgba(192, 192, 192, 0.3);
  }

  @apply bg-prohib-black relative flex flex-col items-center justify-center overflow-hidden p-20 text-center;

  width: 1200px;
  height: 1200px;
  color: white;

  &.is-preview {
    @apply h-auto w-full p-8;

    aspect-ratio: 1/1;
  }

  & .cert-inner {
    @apply flex w-full max-w-[1000px] flex-col items-center gap-12;
  }

  & .cert-medal-block {
    @apply relative mb-4 flex flex-col items-center justify-center;

    & .medal-glow {
      @apply absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2;

      width: 700px;
      height: 700px;
      border-radius: 50%;
      background: radial-gradient(circle, var(--medal-color-glow) 0%, transparent 70%);
      pointer-events: none;
    }

    & .medal-image {
      @apply relative z-10;

      width: 599px;
      height: auto;
      filter: drop-shadow(0 20px 50px rgba(0, 0, 0, 0.9));
    }

    & .cert-badge-container {
      @apply mt-4 flex w-3/4 items-center justify-center;

      & svg {
        max-width: 100%;
        height: auto;
      }
    }

    & .cert-score-big {
      @apply font-mono relative z-10 mt-8 font-black leading-none;

      font-size: 5.5rem;
      color: var(--medal-color-primary);

      & .score-total {
        @apply align-baseline opacity-60;

        font-size: inherit;
      }
    }
  }

  & .cert-rank-title {
    @apply font-black uppercase leading-tight;

    font-size: 4.8rem;
    letter-spacing: 5px;
    color: var(--medal-color-primary);
  }

  & .cert-footer {
    @apply mt-auto flex w-full flex-col items-center gap-2 pb-8;

    & .cert-footer-site {
      @apply font-black uppercase;

      font-size: 2.5rem;
      letter-spacing: 6px;
      color: var(--medal-color-primary);
    }

    & .cert-footer-date {
      @apply opacity-50;

      font-size: 2.6rem;
      letter-spacing: 1px;
    }
  }
}
</style>
