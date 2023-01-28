<script setup>
import AlbumList from '../components/AlbumList.vue'
import Logout from '../components/Logout.vue';
</script>

<template>
  <div class="album">
    <header>
      <Logout />
    </header>
    <main>
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
