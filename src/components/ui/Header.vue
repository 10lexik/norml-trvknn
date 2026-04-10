<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import logoUrl from '@/assets/img/logo.svg'

interface Props {
  difficulty?: string | null
  score?: number
  total?: number
  progress?: number
  showProgress?: boolean
  isSimple?: boolean
}

const { t } = useI18n()

withDefaults(defineProps<Props>(), {
  difficulty: null,
  score: 0,
  total: 0,
  progress: 0,
  showProgress: false,
  isSimple: false
})
</script>

<template>
  <header
    class="flex w-full flex-col items-center transition-all duration-300"
    :class="[
      isSimple ? 'py-8 md:py-4' : 'bg-poster-beige border-prohib-black/10 border-b px-6 pt-6 pb-2'
    ]"
  >
    <div
      class="flex w-full max-w-4xl items-center transition-all duration-500"
      :class="isSimple ? 'justify-center' : 'mb-4 justify-between'"
    >
      <div
        class="transition-all duration-500"
        :class="isSimple ? 'w-[160px] py-4' : 'h-8 md:h-10'"
      >
        <img
          :src="logoUrl"
          :alt="t('header.brand')"
          class="h-auto w-full"
        />
      </div>

      <div
        v-if="!isSimple && difficulty"
        class="animate-in fade-in slide-in-from-right-4 flex items-center gap-4 duration-500"
      >
        <span
          class="bg-reg-green rounded px-3 py-1 text-xs font-bold tracking-wider text-white uppercase"
        >
          {{ t('levels.' + difficulty + '.label') }}
        </span>
        <span class="text-prohib-black font-mono text-lg font-bold">
          {{ score }} / {{ total }}
        </span>
      </div>
    </div>

    <!-- Progress Bar (Only during play) -->
    <div
      v-if="showProgress && !isSimple"
      class="bg-prohib-black/5 animate-in fade-in h-2 w-full max-w-4xl overflow-hidden rounded-full duration-700"
    >
      <div
        class="bg-reg-green h-full transition-all duration-300"
        :style="{ width: progress + '%' }"
      />
    </div>
  </header>
</template>

<style scoped>
header {
  z-index: 40;
}
</style>
