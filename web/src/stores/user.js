import { computed } from '@vue/reactivity';
import { defineStore } from 'pinia'
import { ref } from 'vue';

export const useUserStore = defineStore('user', () => {
  const json = localStorage.getItem('user');

  // State
  const user = ref(JSON.parse(json));

  // Getters
  const loggedIn = computed(() => user.value !== null);

  // Actions
  const setUser = u => user.value = u;

  return {
    user,
    loggedIn,
    setUser,
  };
});
