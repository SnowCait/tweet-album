<script setup>
import { ref, computed } from 'vue';
import { useRoute } from 'vue-router';
import { useUserStore } from '@/stores/user';
import AlbumCreate from './AlbumCreate.vue';
import AlbumArchive from './AlbumArchive.vue';
import AlbumDelete from './AlbumDelete.vue';

const { loggedIn, fetchUserBy } = useUserStore();

const apiUrl = API_URL;
const limit = ALBUMS_LIMIT;
const { screenName } = useRoute().params;
const userId = ref('');
const userName = ref('');
const albums = ref([]);
const creatable = computed(() =>
  albums.value.filter(album => !album.archived && album.deletionTime === undefined).length < limit
);

run();

async function run() {
  const user = await fetchUserBy(screenName);
  const data = await fetchAlbums(user.userId);
  userId.value = user.userId;
  userName.value = user.userName;
  albums.value = data.albums;

  document.title = `${user.userName} (@${user.screenName}) のアルバム`;
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

async function create(event) {
  console.log('[create clicked]');
  const dialog = document.getElementById('create-dialog');
  dialog.showModal();
}

async function cancel(event) {
  console.log('[dialog clicked]');
  const dialog = document.getElementById('create-dialog');
  const insideDialog = (
    event.x >= dialog.offsetLeft &&
    event.x <= dialog.offsetLeft + dialog.offsetWidth &&
    event.y >= dialog.offsetTop &&
    event.y <= dialog.offsetTop + dialog.offsetHeight
  );

  if (!insideDialog) {
    dialog.close();
  }
}
</script>

<template>
  <h1>{{ userName }}のアルバム</h1>
  <section>
    <ul id="albums" class="albums">
      <li>
        <div class="book-cover create">
          <button @click="create" :disabled="!creatable">＋</button>
        </div>
      </li>
      <li v-for="album in albums">
        <RouterLink :to="{ name: 'album', params: { screenName, userId, albumId: album.id } }" v-if="!album.deletionTime">
          <div class="book-cover">
            <div class="title">{{ album.title }}</div>
            <AlbumArchive :album="album" v-if="loggedIn && !album.archived" />
            <AlbumDelete :album="album" v-if="loggedIn" />
          </div>
        </RouterLink>
        <div class="book-cover" v-else>
          <div class="title">{{ album.title }}</div>
        </div>
      </li>
    </ul>
  </section>
  <dialog id="create-dialog" @click="cancel">
    <AlbumCreate />
  </dialog>
</template>

<style scoped>
.albums {
  list-style-type: none;
  padding: 0;
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
}

/* https://zenn.dev/team_zenn/articles/19cbfe9db2a638 */

.book-cover {
  width: 120px;
  height: 180px;
  position: relative;
  box-shadow: 10px 15px 22px -5px rgba(0, 0, 0, 0.2),
    0 0 2px rgba(0, 0, 0, 0.15);
  border-radius: 4px;
  margin: 0.5em;
  background-color: rgb(250, 250, 250);
}

.book-cover:after {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background: linear-gradient(
    -90deg,
    rgba(255, 255, 255, 0) 0%,
    rgba(255, 255, 255, 0.1) 80%,
    rgba(255, 255, 255, 0.4) 94%,
    rgba(255, 255, 255, 0.5) 96%,
    rgba(255, 255, 255, 0) 100%
  );
  border: solid 1px lightgray;
  border-radius: 4px;
}

.create button {
  width: 100%;
  height: 100%;
  font-size: 2em;
  background-color: transparent;
  border: none;
}

.title {
  padding: 2em 1em;
  font-size: 1.2em;
  word-wrap: break-word;
}

dialog {
  margin: auto;
  padding: 2em;
  border: none;
  border-radius: 5px;
}
</style>
