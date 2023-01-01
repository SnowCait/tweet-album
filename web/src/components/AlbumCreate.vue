<script setup>
import { ref } from 'vue';
import { useRoute } from 'vue-router';
import router from '../router';

const apiUrl = API_URL;
const { userId } = useRoute().params;
const keyword = ref('');
const disabled = ref(false);

const onSubmit = async _ => {
  disabled.value = true;

  try {
    const { id } = await createAlbum(keyword.value);
    console.log('[album id]', id);
    keyword.value = '';
    router.push({
      name: 'album',
      params: {
        userId,
        albumId: id,
      },
    })
  } catch (e) {
    console.error(e);
  } finally {
    disabled.value = false;
  }
};

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

async function createAlbum(keyword) {
  const authorization = getAuthorizationHeader();
  if (authorization == null) {
    throw new Error('Not authorized.');
  }

  const response = await fetch(`${apiUrl}/albums`, {
    method: 'POST',
    headers: {
      'Authorization': authorization,
    },
    body: JSON.stringify({
      keyword,
    }),
  });

  if (!response.ok) {
    throw new Error('Cannot create album.');
  }

  return await response.json();
}
</script>

<template>
  <section>
    <h2>アルバム作成</h2>
    <form id="album" @submit.prevent="onSubmit">
      <input type="text" v-model="keyword" placeholder="キーワード" required>
      <input type="submit" value="作成" :disabled="disabled">
    </form>
  </section>
</template>

<style scoped>
</style>
