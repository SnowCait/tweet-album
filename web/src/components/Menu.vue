<script setup>
import { RouterLink } from 'vue-router'
import { useUserStore } from '@/stores/user'
import Signin from './Signin.vue';
import Authorized from './Authorized.vue';

const store = useUserStore();
</script>

<template>
  <nav>
    <RouterLink :to="{ name: 'user', params: { screenName: store.user?.username } }" v-if="store.loggedIn">
      <div>@{{ store.user?.username }}</div>
    </RouterLink>
    <Signin v-else/>
    <Authorized />
  </nav>
</template>

<style scoped>
</style>
