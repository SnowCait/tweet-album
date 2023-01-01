<script setup>
</script>

<template>
  <div class="album">
    <main>
      <h1>{{ $route.params.userId }} のアルバム {{ $route.params.albumId }}</h1>
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
