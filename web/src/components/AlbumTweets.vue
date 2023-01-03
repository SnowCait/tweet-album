<script setup>
import Tweet from './Tweet.vue'
import { ref } from 'vue';
import { useRoute } from 'vue-router';

const apiUrl = API_URL;
const { userId, albumId } = useRoute().params;
const title = ref('');
const tweets = ref([]);
const users = ref([]);

run();

async function run() {
  const album = localStorage.getItem('user')
    ? await fetchAlbum(userId, albumId)
    : await fetchAlbumArchive(userId, albumId);

  console.log('[album]', album);
  title.value = album.title;
  tweets.value = album.tweets;
  users.value = album.includes.users;
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

  return await response.json();
}

async function fetchAlbumTitle(userId, albumId) {
  const response = await fetch(`${apiUrl}/${userId}/albums/${albumId}/title`, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error('Cannot get albums title.');
  }

  return await response.json();
}

async function fetchAlbumArchive(userId, albumId) {
  const url = 'https://snowcait.github.io/tweet-album-api/api'
  const response = await fetch(`${url}/${userId}/${albumId}.json`);

  if (!response.ok) {
    throw new Error('Cannot get albums.');
  }

  const { title } = await fetchAlbumTitle(userId, albumId);

  const { data: tweets, includes } = await response.json();
  return {
    title,
    tweets,
    includes,
  };
}
</script>

<template>
  <section>
    <h1>{{ title }}</h1>
    <ul id="tweets">
      <ul v-for="tweet in tweets">
        <Tweet :tweet="tweet" :user="users.find(x => x.id === tweet.author_id)"/>
      </ul>
    </ul>
  </section>
</template>

<style scoped>
</style>
