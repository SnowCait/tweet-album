<script setup>
import { useRoute } from 'vue-router';

const apiUrl = API_URL;
const { userId } = useRoute().params;
listAlbums(userId);

async function listAlbums(userId) {
  const { albums } = await fetchAlbms(userId);
  console.table(albums);
  const list = document.getElementById('albums');
  console.log(list);
  if (albums.length === 0) {
    console.warn('Albums are not found.')
  }
  while (list.firstChild) {
    list.removeChild(list.firstChild);
  }
  for (const album of albums) {
    const li = document.createElement('li');
    li.textContent = JSON.stringify(album);
    list.appendChild(li);
  }
}

async function fetchAlbms(userId) {
  const response = await fetch(`${apiUrl}/${userId}/albums`, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error('Cannot get albums.');
  }

  return await response.json();
}
</script>

<template>
  <section>
    <h2>アルバム一覧</h2>
    <ul id="albums"></ul>
  </section>
</template>

<style scoped>
</style>
