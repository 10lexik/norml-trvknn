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
  color: '', // default to inherit or text-prohib-black
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
    return `<span class="font-black bg-prohib-black text-white px-1.5 py-0.5 inline-block mx-0.5" style="transform: rotate(${rotation}) skew(-10deg)">${match}</span>`
  })
})

const variantClasses = computed(() => {
  switch (props.variant) {
    case 'h1':
      return 'text-4xl md:text-5xl font-black leading-[1.05] tracking-tight'
    case 'h2':
      return 'text-xl md:text-2xl font-black'
    case 'intro':
      return 'text-3xl md:text-4xl font-black border-b-[6px] pb-2 self-start leading-none'
    case 'body':
      return 'text-base md:text-lg font-medium tracking-tight'
    case 'explanation':
      return 'text-xl font-medium leading-relaxed'
    case 'ui':
      return 'font-bold'
    case 'caption':
      return 'text-sm opacity-70'
    default:
      return ''
  }
})
</script>

<template>
  <component
    :is="tag"
    class="transition-all duration-300"
    :class="[
      variantClasses,
      color,
      { 'text-center': centered },
      { uppercase: uppercase },
      {
        'text-balance': !noBalance && (variant === 'h1' || variant === 'h2' || variant === 'intro')
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
/* Ensure custom font inheritance if needed */
h1 {
  line-height: 1.05;
  word-spacing: -0.05em;
}

:deep(.font-black) {
  display: inline-block;
  line-height: normal;
}
</style>
