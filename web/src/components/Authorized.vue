<script setup>
import { Twitter } from './twitter.js';
import router from '../router'

const apiUrl = API_URL;
const clientId = TWITTER_CLIENT_ID;
const redirectUrl = location.origin + import.meta.env.BASE_URL;
console.log('[redirect URL]', redirectUrl);

const twitter = new Twitter(clientId, redirectUrl, apiUrl);

run();

async function run() {
  const params = new URLSearchParams(location.search);
  const newState = params.get('state');
  const code = params.get('code');
  if (newState && code) {
    console.log('[params]', newState, code);
    await fetchAndSaveAccessToken(newState, code);

    const user = localStorage.getItem('user');
    console.log('[user]', user);

    if (!user) {
      console.error('[unauthorized]');
      return;
    }

    const { username: screenName } = JSON.parse(user);
    await router.replace({
      name: 'user',
      params: {
        screenName,
      },
    });
    location.reload(); // Workaround for updating user store
  }
}

async function fetchAndSaveAccessToken(newState, code) {
  const session = sessionStorage.getItem('session');
  if (!session) {
    throw new Error("state and verifier doesn't exist.");
  }

  const [savedState, savedVerifier] = session.split('&');
  sessionStorage.clear();
  console.log('[session]', savedState, savedVerifier);
  if (newState !== savedState) {
    return;
  }

  const user = await twitter.fetchAccessToken(code, savedVerifier);
  console.log('[token]', user);
  localStorage.setItem('user', JSON.stringify(user));
}

</script>

<template>
</template>

<style scoped>
h1 {
  font-weight: 500;
  font-size: 2.6rem;
  top: -10px;
}

h3 {
  font-size: 1.2rem;
}

.authorized h1,
.authorized h3 {
  text-align: center;
}

@media (min-width: 1024px) {
  .authorized h1,
  .authorized h3 {
    text-align: left;
  }
}
</style>
