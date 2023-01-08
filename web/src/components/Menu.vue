<script setup>
import { RouterLink } from 'vue-router';
import { useUserStore } from '@/stores/user';
import Signin from './Signin.vue';
import Authorized from './Authorized.vue';

const store = useUserStore();
</script>

<template>
  <nav>
    <RouterLink :to="{ name: 'user', params: { screenName: store.user?.screenName } }" v-if="store.loggedIn">
      <img :src="store.user?.profileImageUrl" />
      <div>@{{ store.user?.screenName }}</div>
    </RouterLink>
    <Signin v-else/>
    <Authorized />
  </nav>
</template>

<style scoped>
</style>
