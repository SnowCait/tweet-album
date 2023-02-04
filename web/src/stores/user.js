import { ref } from 'vue';
import { defineStore } from 'pinia'
import { computed } from '@vue/reactivity';

export const useUserStore = defineStore('user', () => {
  console.log('[user store]');
  const apiUrl = API_URL;
  const json = localStorage.getItem('user');

  // State
  const user = ref(JSON.parse(json));
  const userId = ref(user.value.userId);
  const userName = ref(user.value.name);
  const screenName = ref(user.value.screenName);

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

  const refreshAccessToken = async () => {
    console.log('[refresh access token]');
    const authorizationHeader = getAuthorizationHeader();
    if (authorizationHeader == null) {
      throw new Error('Not authorized.');
    }

    const response = await fetch(`${apiUrl}/refresh`, {
      method: 'POST',
      headers: {
        ...authorizationHeader,
      },
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    const token = await response.json();

    const json = localStorage.getItem('user');
    const me = JSON.parse(json);
    console.log('[user before]', me);
    me.accessToken = token.accessToken;
    me.expirationTime = token.expirationTime;
    console.log('[user after]', me);
    localStorage.setItem('user', JSON.stringify(me));
    user.value = me;
    userId.value = me.userId;
    userName.value = me.name;
    screenName.value = me.screenName;

    setTimer();
  }

  const logout = () => {
    console.log('[logout]');
    localStorage.clear();
    user.value = null;
    userId.value = '';
    userName.value = '';
    screenName.value = '';
    location.reload(); // Workaround for updating user store
  };

  // Background
  const setTimer = () => {
    console.log('[expired at]', user.value.expirationTime, new Date(user.value.expirationTime));
    const goodTime = user.value.expirationTime - 5 * 60 * 1000;
    const delay = goodTime - Date.now();
    setTimeout(refreshAccessToken, delay);
  };
  if (user.value) {
    setTimer();
  }

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
