import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView
    },
    {
      path: '/:screenName',
      name: 'user',
      component: () => import('../views/UserView.vue')
    },
    {
      path: '/:screenName/albums/:userId-:albumId',
      name: 'album',
      component: () => import('../views/AlbumView.vue')
    },
  ]
})

export default router
