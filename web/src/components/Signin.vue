<script setup>
import { Twitter } from './twitter.js';

const apiUrl = API_URL;
const clientId = TWITTER_CLIENT_ID;
const redirectUrl = location.origin + import.meta.env.BASE_URL;
console.log('[redirect URL]', redirectUrl);

const twitter = new Twitter(clientId, redirectUrl, apiUrl);

const signin = event => {
  console.log('[signin.clicked]', event);
  authorize();
};

function authorize() {
  const state = randomString(10);
  const verifier = randomString(43);
  const authorizeUrl = twitter.constructAuthorizeUrl(state, verifier);
  console.log('[authorize URL]', authorizeUrl);

  sessionStorage.setItem('session', `${state}&${verifier}`);
  console.log('[session]', sessionStorage.getItem('session'));
  window.location.href = authorizeUrl;
}

function randomString(length) {
  return chance.string({ length, pool: '0123456789abcdef' });
}
</script>

<template>
  <div class="signin">
    <button id="signin" @click="signin">ログイン</button>
  </div>
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

.greetings h1,
.greetings h3 {
  text-align: center;
}

@media (min-width: 1024px) {
  .greetings h1,
  .greetings h3 {
    text-align: left;
  }
}
</style>
