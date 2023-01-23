<script setup>
import { ref } from 'vue';
import { useUserStore } from '@/stores/user';

const props = defineProps({
  album: {
    type: Object,
    required: true,
  },
});

const apiUrl = API_URL;
const { getAuthorizationHeader } = useUserStore();
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

async function deleteAlbum(albumId) {
  const authorizationHeader = getAuthorizationHeader();
  if (authorizationHeader == null) {
    throw new Error('Not authorized.');
  }

  const response = await fetch(`${apiUrl}/albums/${albumId}`, {
    method: 'DELETE',
    headers: {
      ...authorizationHeader,
    },
  });

  if (!response.ok) {
    throw new Error('Cannot delete album.');
  }

  return await response.json();
}
</script>

<template>
  <form @submit.prevent="onSubmit" @click.stop="">
    <input type="submit" value="🗑️" :disabled="disabled" />
  </form>
</template>

<style scoped>
</style>
