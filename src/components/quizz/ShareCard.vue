<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t, locale } = useI18n()

const props = defineProps<{
  score: number
  total: number
  rankTitle: string
  rankDesc: string
  medal: 'gold' | 'silver' | 'bronze' | null
}>()

const cardElRef = ref<HTMLElement | null>(null)
defineExpose({ cardEl: cardElRef })

const medalLabel = computed(() => {
  if (props.medal === 'gold')   return t('end.share_card.medal_gold')
  if (props.medal === 'silver') return t('end.share_card.medal_silver')
  if (props.medal === 'bronze') return t('end.share_card.medal_bronze')
  return ''
})

const generatedDate = computed(() => {
  return new Date().toLocaleDateString(locale.value, {
    day: '2-digit', month: 'long', year: 'numeric'
  })
})
</script>

<template>
  <div ref="cardElRef" class="share-card-hidden" :class="medal ? `medal-${medal}` : ''">
    <div class="cert-inner">

      <!-- EN-TÊTE INSTITUTIONNEL -->
      <div class="cert-header">
        <div class="cert-logo">{{ t('header.brand') }}</div>
        <div class="cert-header-rule"></div>
        <div class="cert-subtitle-top">{{ t('end.share_card.certificate_subtitle') }}</div>
      </div>

      <!-- BLOC MÉDAILLE -->
      <div class="cert-medal-block">
        <!-- Médaille SVG -->
        <div class="medal-glow"></div>
        <svg class="medal-svg" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="grad-gold" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stop-color="#fff0a0"/>
              <stop offset="40%" stop-color="#d4af37"/>
              <stop offset="100%" stop-color="#7a5c00"/>
            </radialGradient>
            <radialGradient id="grad-silver" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stop-color="#f0f0f0"/>
              <stop offset="40%" stop-color="#c0c0c0"/>
              <stop offset="100%" stop-color="#606060"/>
            </radialGradient>
            <radialGradient id="grad-bronze" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stop-color="#f5c99a"/>
              <stop offset="40%" stop-color="#cd7f32"/>
              <stop offset="100%" stop-color="#6b3b10"/>
            </radialGradient>
            <filter id="medal-shadow">
              <feDropShadow dx="0" dy="8" stdDeviation="12" flood-opacity="0.5"/>
            </filter>
          </defs>
          <!-- Ruban -->
          <rect x="82" y="0" width="36" height="60" rx="4"
            :fill="medal === 'gold' ? '#a08000' : medal === 'silver' ? '#909090' : '#8b4c00'"/>
          <rect x="88" y="0" width="12" height="60" rx="3"
            :fill="medal === 'gold' ? '#d4af37' : medal === 'silver' ? '#c0c0c0' : '#cd7f32'"/>
          <!-- Cercle externe -->
          <circle cx="100" cy="130" r="66" filter="url(#medal-shadow)"
            :fill="medal === 'gold' ? '#7a5c00' : medal === 'silver' ? '#808080' : '#6b3b10'"/>
          <!-- Cercle principal dégradé -->
          <circle cx="100" cy="130" r="60"
            :fill="`url(#grad-${medal || 'bronze'})`"/>
          <!-- Anneau interne -->
          <circle cx="100" cy="130" r="50" fill="none" stroke-width="3"
            :stroke="medal === 'gold' ? '#fff0a0' : medal === 'silver' ? '#f0f0f0' : '#f5c99a'"
            stroke-opacity="0.6"/>
          <!-- Étoile centrale -->
          <text x="100" y="146" text-anchor="middle" font-size="52"
            font-family="serif">⭐</text>
        </svg>

        <div class="medal-label">{{ medalLabel }}</div>
        <div class="cert-score-big">{{ score }}<span class="small">/{{ total }}</span></div>
      </div>

      <!-- TITRE DU RANG -->
      <div class="cert-rank-title">{{ rankTitle }}</div>

      <!-- SÉPARATEUR -->
      <div class="cert-divider">
        <span class="cert-divider-line"></span>
        <span class="cert-divider-dot">◆</span>
        <span class="cert-divider-line"></span>
      </div>

      <!-- DESCRIPTION INSTITUTIONNELLE -->
      <div class="cert-desc">{{ rankDesc }}</div>

      <!-- PIED DE PAGE -->
      <div class="cert-footer">
        <div class="cert-footer-site">{{ t('end.share_card.website') }}</div>
        <div class="cert-footer-date">{{ t('end.share_card.delivered_on') }} {{ generatedDate }}</div>
      </div>

    </div>
  </div>
</template>
