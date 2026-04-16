<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  tag?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span' | 'div' | 'label' | 'li'
  variant?: 'h1' | 'h2' | 'body' | 'ui' | 'explanation' | 'caption' | 'intro'
  content?: string
  color?: string
  centered?: boolean
  uppercase?: boolean
  noBalance?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  tag: 'p',
  variant: 'body',
  color: '',
  centered: false,
  uppercase: false,
  noBalance: false
})

const processedContent = computed(() => {
  if (!props.content) return ''

  let counter = 0
  // Remplacement des **texte** par le style highlight avec rotation alternée + skew(-10deg)
  return props.content.replace(/\*\*(.*?)\*\*/g, (_, match) => {
    const rotation = counter % 2 === 0 ? '-0.5deg' : '0.5deg'
    counter++
    return `<span class="font-highlight" style="transform: rotate(${rotation}) skew(-10deg)">${match}</span>`
  })
})
</script>

<template>
  <component
    :is="tag"
    class="font-component"
    :class="[
      `is-variant-${variant}`,
      color,
      { 'is-centered': centered },
      { 'is-uppercase': uppercase },
      {
        'is-balanced': !noBalance && (variant === 'h1' || variant === 'h2' || variant === 'intro')
      }
    ]"
  >
    <template v-if="content">
      <span v-html="processedContent" />
    </template>
    <template v-else>
      <slot />
    </template>
  </component>
</template>

<style scoped>
@reference "../../styles/main.css";

.font-component {
  @apply transition-all duration-300;

  &.is-variant-h1 {
    @apply text-4xl md:text-5xl font-black leading-[1.05] tracking-tight;
  }
  &.is-variant-h2 {
    @apply text-xl md:text-2xl font-black;
  }
  &.is-variant-intro {
    @apply text-3xl md:text-4xl font-black border-b-[6px] pb-2 self-start leading-none;
  }
  &.is-variant-body {
    @apply text-base md:text-lg font-medium tracking-tight;
  }
  &.is-variant-explanation {
    @apply text-xl font-medium leading-relaxed;
  }
  &.is-variant-ui {
    @apply font-bold;
  }
  &.is-variant-caption {
    @apply text-sm opacity-70;
  }

  &.is-centered {
    @apply text-center;
  }
  &.is-uppercase {
    @apply uppercase;
  }
  &.is-balanced {
    @apply text-balance;
  }

  /* Ensure custom font inheritance if needed */
  & h1 {
    line-height: 1.05;
    word-spacing: -0.05em;
  }
}

/* Highlighting pattern (**text**) */
:deep(.font-highlight) {
  @apply font-black bg-prohib-black text-white px-1.5 py-0.5 inline-block mx-0.5;
  line-height: normal;
}
</style>
