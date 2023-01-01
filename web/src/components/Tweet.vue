<script setup>
defineProps({
  tweet: {
    type: Object,
    required: true,
  },
  user: {
    type: Object,
    required: true,
  },
})
</script>

<template>
  <article>
    <img :src="user.profile_image_url" />
    <div>{{ user.name }} @{{ user.username }}</div>
    <p>{{ tweet.text }}</p>
  </article>
</template>

<style scoped>
</style>
