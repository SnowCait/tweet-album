<script setup>
import Tweet from './Tweet.vue'
import { ref } from 'vue';
import { useRoute } from 'vue-router';

const apiUrl = API_URL;
const { userId, albumId } = useRoute().params;
const tweets = ref([]);
const users = ref([]);

if (localStorage.getItem('user')) {
  fetchAlbum(userId, albumId);
} else {
  fetchAlbumArchive(userId, albumId);
}

function getAuthorizationHeader() {
  const user = localStorage.getItem('user');
  console.log('[user]', user);

  if (!user) {
    console.error('[unauthorized]');
    return null;
  }

  const { id: userId, access_token: accessToken } = JSON.parse(user);
  return `${userId}:${accessToken}`;
}

async function fetchAlbum(userId, albumId) {
  const authorization = getAuthorizationHeader();
  if (authorization == null) {
    throw new Error('Not authorized.');
  }

  const response = await fetch(`${apiUrl}/${userId}/albums/${albumId}`, {
    method: 'GET',
    headers: {
      'Authorization': authorization,
    },
  });

  if (!response.ok) {
    throw new Error('Cannot get albums.');
  }

  const data = await response.json();
  console.log('[album]', data);
  tweets.value = data.tweets;
  users.value = data.includes.users;
}

async function fetchAlbumArchive(userId, albumId) {
  const url = 'https://snowcait.github.io/tweet-album-api/api'
  const response = await fetch(`${url}/${userId}/${albumId}.json`);

  if (!response.ok) {
    throw new Error('Cannot get albums.');
  }

  const data = await response.json();
  console.log('[album archive]', data);
  tweets.value = data.data;
  users.value = data.includes.users;
}
</script>

<template>
  <section>
    <h1>{{ $route.params.userId }} のアルバム {{ $route.params.albumId }}</h1>
    <ul id="tweets">
      <ul v-for="tweet in tweets">
        <Tweet :tweet="tweet" :user="users.find(x => x.id === tweet.author_id)"/>
      </ul>
    </ul>
  </section>
</template>

<style scoped>
</style>
