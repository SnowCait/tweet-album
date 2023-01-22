<script setup>
import { ref } from 'vue';
import { useUserStore } from '@/stores/user';
import router from '../router';

const apiUrl = API_URL;
const { getAuthorizationHeader } = useUserStore();
const keyword = ref('');
const since = ref(new Date().toISOString().substring(0, '2010-11-06'.length));
const disabled = ref(false);

const onSubmit = async _ => {
  disabled.value = true;

  try {
    const { id } = await createAlbum(keyword.value, since.value);
    console.log('[album id]', id);
    keyword.value = '';
    const { userId, screenName } = useUserStore();
    router.push({
      name: 'album',
      params: {
        screenName,
        userId,
        albumId: id,
      },
    });
  } catch (e) {
    console.error(e);
  } finally {
    disabled.value = false;
  }
};

async function createAlbum(keyword, since) {
  const authorizationHeader = getAuthorizationHeader();
  if (authorizationHeader == null) {
    throw new Error('Not authorized.');
  }

  const response = await fetch(`${apiUrl}/albums`, {
    method: 'POST',
    headers: {
      ...authorizationHeader,
    },
    body: JSON.stringify({
      keyword,
      since,
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
    <form @submit.prevent="onSubmit">
      <div>
        <label for="keyword">キーワード: </label>
        <input type="text" id="keyword" v-model="keyword" placeholder="キーワード" required>
      </div>
      <div>
        <label for="since">いつから: </label>
        <input type="date" id="since" v-model="since" required>～
      </div>
      <input type="submit" value="作成" :disabled="disabled">
    </form>
  </section>
</template>

<style scoped>
</style>
