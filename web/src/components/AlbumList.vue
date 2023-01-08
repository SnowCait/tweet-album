<script setup>
import { ref } from 'vue';
import { useRoute } from 'vue-router';
import { useUserStore } from '@/stores/user'
import AlbumDelete from '../components/AlbumDelete.vue'

const { loggedIn, fetchUserBy } = useUserStore();

const apiUrl = API_URL;
const { screenName } = useRoute().params;
const userId = ref('');
const albums = ref([]);

run();

async function run() {
  const user = await fetchUserBy(screenName);
  const data = await fetchAlbums(user.userId);
  userId.value = user.userId;
  albums.value = data.albums;
}

async function fetchAlbums(userId) {
  const response = await fetch(`${apiUrl}/users/${userId}/albums`, {
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
    <ul id="albums">
      <ul v-for="album in albums">
        <div v-if="!album.deletionTime">
          <RouterLink :to="{ name: 'album', params: { screenName, userId, albumId: album.id } }">{{ album.title }}</RouterLink>
          <AlbumDelete :album="album" v-if="loggedIn" />
        </div>
        <div v-else>
          {{ album.title }}
        </div>
      </ul>
    </ul>
  </section>
</template>

<style scoped>
</style>
