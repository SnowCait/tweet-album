<script setup>
import AlbumCreate from '../components/AlbumCreate.vue'
import AlbumList from '../components/AlbumList.vue'
</script>

<template>
  <div class="album">
    <main>
      <h1>{{ $route.params.userId }} のアルバム</h1>
      <AlbumCreate />
      <AlbumList />
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
