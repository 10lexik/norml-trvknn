<script setup lang="ts">
import { computed } from 'vue'
import Loader from './Loader.vue'

interface Props {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'pill' | 'level'
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  isLoading?: boolean
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  arrow?: boolean
  fullWidth?: boolean
  isSimple?: boolean
  icon?: string
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  isLoading: false,
  disabled: false,
  type: 'button',
  arrow: false,
  fullWidth: false,
  isSimple: false
})

const emit = defineEmits<{
  (e: 'click', event: MouseEvent): void
}>()

const handleClick = (event: MouseEvent) => {
  if (!props.disabled && !props.isLoading) {
    emit('click', event)
  }
}

const variantClasses = computed(() => {
  switch (props.variant) {
    case 'primary':
      return 'bg-prohib-black text-white hover:bg-reg-green shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] active:shadow-none active:translate-x-1 active:translate-y-1'
    case 'secondary':
      return 'bg-white text-prohib-black border-4 border-prohib-black hover:bg-prohib-black hover:text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5'
    case 'pill':
      return 'bg-prohib-black text-white rounded-full hover:scale-105 active:scale-95 shadow-md px-8 py-4'
    case 'ghost':
      return 'bg-transparent text-prohib-black p-0 group'
    case 'level':
      return 'bg-white border-[4px] border-reg-green text-reg-green hover:bg-reg-green hover:text-white shadow-[8px_8px_0px_0px_rgba(46,138,66,0.2)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 p-5'
    case 'outline':
      return 'border-2 border-reg-green text-reg-green hover:bg-reg-green hover:text-white'
    default:
      return ''
  }
})

const sizeClasses = computed(() => {
  if (props.variant === 'ghost' || props.variant === 'pill' || props.variant === 'level') return ''
  switch (props.size) {
    case 'xs':
      return 'px-3 py-1.5 text-xs font-black uppercase'
    case 'sm':
      return 'px-4 py-2 text-sm font-black uppercase'
    case 'md':
      return 'px-6 py-4 text-base font-black uppercase tracking-wider'
    case 'lg':
      return 'px-8 py-6 text-xl font-black uppercase tracking-widest'
    case 'xl':
      return 'px-10 py-8 text-2xl font-black uppercase tracking-widest'
    default:
      return ''
  }
})
</script>

<template>
  <button
    :type="type"
    :disabled="disabled || isLoading"
    class="inline-flex items-center justify-center font-black uppercase transition-all duration-300 select-none disabled:cursor-not-allowed disabled:opacity-50"
    :class="[variantClasses, sizeClasses, { 'w-full': fullWidth }]"
    @click="handleClick"
  >
    <!-- Simple Loader -->
    <Loader
      v-if="isLoading"
      size="xs"
      inline
      class="mr-2"
    />

    <span
      class="flex w-full items-center gap-2"
      :class="{ 'opacity-0': isLoading && variant !== 'pill' }"
    >
      <!-- Icon Support (specificaly for levels) -->
      <span
        v-if="icon"
        class="text-3xl transition-all duration-300"
        :class="[
          variant === 'level'
            ? 'opacity-80 grayscale filter group-hover:opacity-100 group-hover:grayscale-0'
            : ''
        ]"
      >
        {{ icon }}
      </span>

      <!-- Label / Slot -->
      <span
        class="flex-1"
        :class="[
          variant === 'level' ? 'text-center text-lg' : 'flex items-center justify-center gap-2'
        ]"
      >
        <span
          v-if="variant === 'ghost'"
          class="border-b-3 pb-1 transition-colors"
          :class="[
            isSimple ? 'border-prohib-black group-hover:border-reg-green' : 'border-current'
          ]"
        >
          <slot />
        </span>
        <slot v-else />
      </span>

      <!-- Arrow icon -->
      <span
        v-if="arrow"
        class="text-2xl transition-all duration-300"
        :class="[
          variant === 'level'
            ? 'translate-x-[-10px] opacity-0 group-hover:translate-x-0 group-hover:opacity-100'
            : 'group-hover:translate-x-1.5'
        ]"
      >
        →
      </span>
    </span>
  </button>
</template>

<style scoped>
button {
  font-family: var(--font-main);
}
</style>
