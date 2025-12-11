<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Quizz from './components/Quizz.vue'
import AdminPanel from './components/AdminPanel.vue'

const isAdminMode = ref(false)

onMounted(() => {
  const params = new URLSearchParams(window.location.search)
  // CORRECTION : On accepte "?admin=true" OU "?mode=admin"
  if (params.get('admin') === 'true' || params.get('mode') === 'admin') {
    isAdminMode.value = true
  }
})
</script>

<template>
  <div id="app-container">
    <AdminPanel v-if="isAdminMode" />
    <Quizz v-else />
  </div>
</template>

<style scoped>
/* Votre style global */
</style>
