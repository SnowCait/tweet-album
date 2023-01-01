<script setup>
import { ref } from 'vue';
import { useRoute } from 'vue-router';

const apiUrl = API_URL;
const { userId } = useRoute().params;
const albums = ref([]);
fetchAlbums(userId);

async function fetchAlbums(userId) {
  const response = await fetch(`${apiUrl}/${userId}/albums`, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error('Cannot get albums.');
  }

  const data = await response.json();
  albums.value = data.albums;
}
</script>

<template>
  <section>
    <h2>アルバム一覧</h2>
    <ul id="albums">
      <ul v-for="album in albums">
        <RouterLink :to="{ name: 'album', params: { userId, albumId: album.id } }">{{ album.id }}</RouterLink>
      </ul>
    </ul>
  </section>
</template>

<style scoped>
</style>
