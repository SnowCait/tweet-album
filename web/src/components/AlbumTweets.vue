<script setup>
import { ref } from 'vue';
import { useRoute } from 'vue-router';
import { useUserStore } from '@/stores/user';
import Tweet from './Tweet.vue';

const apiUrl = API_URL;
const { userId, albumId } = useRoute().params;
const { loggedIn, getAuthorizationHeader } = useUserStore();
const title = ref('');
const tweets = ref([]);
const users = ref([]);

run();

async function run() {
  const album = loggedIn
    ? await fetchMyAlbum(albumId)
    : await fetchAlbumArchive(userId, albumId);

  console.log('[album]', album);
  title.value = album.title;
  tweets.value = album.tweets;
  users.value = album.includes.users;
}

async function fetchMyAlbum(albumId) {
  const authorizationHeader = getAuthorizationHeader();
  if (authorizationHeader === null) {
    throw new Error('Not authorized.');
  }

  const response = await fetch(`${apiUrl}/albums/${albumId}`, {
    method: 'GET',
    headers: {
      ...authorizationHeader,
    },
  });

  if (!response.ok) {
    throw new Error('Cannot get albums.');
  }

  return await response.json();
}

async function fetchAlbumTitle(userId, albumId) {
  const response = await fetch(`${apiUrl}/users/${userId}/albums/${albumId}`, {
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
  <h1>{{ title }}</h1>
  <section>
    <ul>
      <li v-for="tweet in tweets">
        <Tweet :tweet="tweet" :user="users.find(x => x.id === tweet.author_id)"/>
      </li>
    </ul>
  </section>
</template>

<style scoped>
ul {
  list-style: none;
  padding: 0;
  border: 1px solid rgb(239, 243, 244);
  border-bottom-style: none;
}

li {
  border-bottom: 1px solid rgb(239, 243, 244);
}
</style>
