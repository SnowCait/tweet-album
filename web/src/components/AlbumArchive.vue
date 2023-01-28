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
    await archiveAlbum(props.album.id);
    props.album.archived = true;
  } catch (e) {
    console.error(e);
  } finally {
    disabled.value = false;
  }
};

async function archiveAlbum(albumId) {
  const authorizationHeader = getAuthorizationHeader();
  if (authorizationHeader == null) {
    throw new Error('Not authorized.');
  }

  const response = await fetch(`${apiUrl}/albums/${albumId}/archive`, {
    method: 'PUT',
    headers: {
      ...authorizationHeader,
    },
  });

  if (!response.ok) {
    throw new Error('Cannot archive album.');
  }
}
</script>

<template>
  <form @submit.prevent="onSubmit" @click.stop="">
    <input type="submit" value="🔒" :disabled="disabled" />
  </form>
</template>

<style scoped>
</style>
