<script setup>
import { ref } from 'vue';

const props = defineProps({
  album: {
    type: Object,
    required: true,
  },
});

const apiUrl = API_URL;
const disabled = ref(false);

const onSubmit = async _ => {
  disabled.value = true;

  try {
    const { deletionTime } = await deleteAlbum(props.album.id);
    console.log('[deletion time]', deletionTime);
    props.album.deletionTime = deletionTime;
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

async function deleteAlbum(albumId) {
  const authorization = getAuthorizationHeader();
  if (authorization == null) {
    throw new Error('Not authorized.');
  }

  const response = await fetch(`${apiUrl}/albums/${albumId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': authorization,
    },
  });

  if (!response.ok) {
    throw new Error('Cannot delete album.');
  }

  return await response.json();
}
</script>

<template>
  <form @submit.prevent="onSubmit">
    <input type="submit" value="🗑️" :disabled="disabled" />
  </form>
</template>

<style scoped>
</style>
