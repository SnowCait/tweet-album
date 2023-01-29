import { ref } from 'vue';
import { defineStore } from 'pinia'
import { computed } from '@vue/reactivity';

export const useUserStore = defineStore('user', () => {
  const apiUrl = API_URL;
  const json = localStorage.getItem('user');

  // State
  const user = ref(JSON.parse(json));
  const userId = ref('');
  const userName = ref('');
  const screenName = ref('');

  // Getters
  const loggedIn = computed(() => user.value !== null);

  // Actions
  const getAuthorizationHeader = () => {
    const user = localStorage.getItem('user');
    console.log('[user]', user);

    if (!user) {
      console.log('[unauthorized]');
      return null;
    }

    const { userId, accessToken } = JSON.parse(user);
    return {
      'Authorization': `${userId}:${accessToken}`,
    };
  }

  const fetchUserBy = async screenName => {
    const response = await fetch(`${apiUrl}/users/by/${screenName}`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error('Cannot get user.');
    }

   return await response.json();
  };

  const logout = () => {
    console.log('[logout]');
    localStorage.clear();
    user.value = null;
    userId.value = '';
    userName.value = '';
    screenName.value = '';
    location.reload(); // Workaround for updating user store
  };

  return {
    user,
    userId,
    userName,
    screenName,
    loggedIn,
    getAuthorizationHeader,
    fetchUserBy,
    logout,
  };
});
