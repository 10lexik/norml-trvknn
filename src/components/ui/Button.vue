<script setup lang="ts">
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
  isSimple: false,
  icon: undefined
})

const emit = defineEmits<{
  (e: 'click', event: MouseEvent): void
}>()

const handleClick = (event: MouseEvent) => {
  if (!props.disabled && !props.isLoading) {
    emit('click', event)
  }
}
</script>

<template>
  <button
    :type="type"
    :disabled="disabled || isLoading"
    class="btn-root"
    :class="[`is-variant-${variant}`, `is-size-${size}`, { 'is-full-width': fullWidth }]"
    @click="handleClick"
  >
    <!-- Loading State Overlay -->
    <Loader
      v-if="isLoading"
      size="xs"
      inline
      class="btn-loader"
    />

    <span
      class="btn-content"
      :class="{ 'is-loading-hidden': isLoading && variant !== 'pill' }"
    >
      <!-- Icon Support (specifically for levels) -->
      <span
        v-if="icon"
        class="btn-icon"
      >
        {{ icon }}
      </span>

      <!-- Label / Slot -->
      <span
        class="btn-label-wrapper"
        :class="variant === 'level' ? 'is-centered' : 'is-flex'"
      >
        <span
          v-if="variant === 'ghost'"
          class="btn-ghost-underline"
          :class="{ 'is-simple-theme': isSimple }"
        >
          <slot />
        </span>
        <slot v-else />
      </span>

      <!-- Arrow icon -->
      <span
        v-if="arrow"
        class="btn-arrow"
      >
        →
      </span>
    </span>
  </button>
</template>

<style scoped>
@reference "../../styles/main.css";

.btn-root {
  @apply inline-flex items-center justify-center font-black uppercase transition-all duration-300 select-none;

  @apply disabled:cursor-not-allowed disabled:opacity-50;

  font-family: var(--font-main);

  &.is-full-width {
    @apply w-full;
  }

  /* Components internes */
  & .btn-loader {
    @apply mr-2;
  }

  & .btn-content {
    @apply flex w-full items-center gap-2;

    &.is-loading-hidden {
      @apply opacity-0;
    }
  }

  & .btn-icon {
    @apply text-3xl transition-all duration-300;
  }

  & .btn-label-wrapper {
    &.is-centered {
      @apply flex-1 text-center text-lg;
    }

    &.is-flex {
      @apply flex flex-1 items-center justify-center gap-2;
    }
  }

  & .btn-ghost-underline {
    @apply border-b-3 border-current pb-1 transition-colors;

    &.is-simple-theme {
      @apply border-prohib-black;
    }
  }

  & .btn-arrow {
    @apply text-2xl transition-all duration-300;
  }

  /* Interaction flèche standard */
  &:not(.is-variant-level):hover .btn-arrow {
    @apply translate-x-1.5;
  }

  /* ============================================================
     VARIANTES
     ============================================================ */

  /* Primary */
  &.is-variant-primary {
    @apply bg-prohib-black shadow-brutal-sm text-white;

    &:hover:not(:disabled) {
      @apply bg-reg-green;
    }

    &:active:not(:disabled) {
      @apply translate-x-1 outline-hidden;
    }
  }

  /* Secondary */
  &.is-variant-secondary {
    @apply border-prohib-black shadow-brutal-xs border-4 bg-white;

    &:hover:not(:disabled) {
      @apply bg-reg-green text-white;
    }
  }

  /* Ghost */
  &.is-variant-ghost {
    @apply bg-transparent;
  }

  /* Level */
  &.is-variant-level {
    @apply border-reg-green shadow-brutal-green gap-3 border-4 bg-white p-5;

    & .btn-icon {
      @apply opacity-80 grayscale filter;
    }

    & .btn-arrow {
      @apply translate-x-[-10px] opacity-0;
    }

    &:hover:not(:disabled) {
      @apply bg-reg-green translate-x-0.5 translate-y-0.5 text-white shadow-none;

      & .btn-icon {
        @apply opacity-100 grayscale-0;
      }

      & .btn-arrow {
        @apply translate-x-0 opacity-100;
      }
    }
  }

  /* Pill */
  &.is-variant-pill {
    @apply bg-prohib-black relative mb-2 flex items-center gap-4 rounded-full p-2 pr-6 text-white;

    & .btn-icon {
      @apply bg-reg-green flex h-14 w-14 items-center justify-center rounded-full text-2xl shadow-lg;
    }

    & .btn-label-wrapper {
      @apply text-xl font-black uppercase;
    }

    &:hover:not(:disabled) {
      @apply bg-reg-green;

      & .btn-icon {
        @apply bg-prohib-black;
      }
    }
  }

  /* Outline */
  &.is-variant-outline {
    @apply border-prohib-black/20 border-2 text-sm;

    &:hover:not(:disabled) {
      @apply border-prohib-black bg-prohib-black text-white;
    }
  }

  /* ============================================================
     TAILLES
     ============================================================ */

  &.is-size-xl {
    @apply min-h-[80px] px-10 text-2xl tracking-widest;
  }

  &.is-size-lg {
    @apply min-h-[64px] text-xl;
  }

  &.is-size-md {
    @apply min-h-[56px] px-6 text-lg;
  }

  &.is-size-sm {
    @apply min-h-[48px] px-4 text-base;
  }

  &.is-size-xs {
    @apply min-h-[32px] px-3 text-xs leading-none;
  }
}
</style>
