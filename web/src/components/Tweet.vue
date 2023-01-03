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
    <div class="main">
      <div class="user">
        <div class="name">{{ user.name }}</div>
        <div class="screen-name">@{{ user.username }}</div>
      </div>
      <p class="text">{{ tweet.text }}</p>
    </div>
  </article>
</template>

<style scoped>
article {
  padding: 12px 16px;
  display: flex;
  flex-direction: row;
}

img {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  margin-right: 12px;
}

.main {
  color: rgb(15, 20, 25);
  font-size: 15px;
  font-weight: 400;
}

.user {
  display: flex;
  flex-direction: row;
  font-family: "Segoe UI",Meiryo,system-ui,-apple-system,BlinkMacSystemFont,sans-serif;
}

.name {
  margin-right: 4px;
  font-weight: 700;
}

.screen-name {
  color: rgb(83, 100, 113);
  font-size: 15px;
}

.text {
  line-height: 20px;
}

.hashtag {
  color: rgb(29, 155, 240);
}
</style>
