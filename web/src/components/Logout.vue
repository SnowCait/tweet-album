<script setup>
import { useUserStore } from '@/stores/user';
const { loggedIn, logout } = useUserStore();
</script>

<template>
  <div v-if="loggedIn">
    <button @click="logout">ログアウト</button>
  </div>
</template>

<style scoped>
</style>
