<script setup>
import AlbumTweets from '../components/AlbumTweets.vue'
</script>

<template>
  <div class="album">
    <main>
      <AlbumTweets />
    </main>
  </div>
</template>

<style>
@media (min-width: 1024px) {
  .album {
    min-height: 100vh;
    display: flex;
    align-items: center;
  }
}
</style>
