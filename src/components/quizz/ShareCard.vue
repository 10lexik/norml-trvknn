<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

defineProps<{
  score: number
  total: number
  rankTitle: string
}>()

const cardEl = ref<HTMLElement | null>(null)
defineExpose({ cardEl })
</script>

<template>
  <div ref="cardEl" class="share-card-hidden">
    <div class="card-content">
      <div class="card-logo">{{ t('header.brand') }}</div>
      <div class="card-rank">{{ rankTitle }}</div>
      <div class="card-score-big">
        {{ score }}<span class="small">/{{ total }}</span>
      </div>
      <div class="card-text">{{ t('end.share_card.tagline') }}</div>
      <div class="card-footer">{{ t('end.share_card.website') }}</div>
    </div>
  </div>
</template>
