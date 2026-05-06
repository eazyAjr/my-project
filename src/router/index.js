import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { title: '登录' }
  },
  {
    path: '/',
    component: () => import('@/views/Layout.vue'),
    redirect: '/book',
    meta: { requiresAuth: true },
    children: [
      {
        path: 'book',
        name: 'BookManage',
        component: () => import('@/views/BookManage.vue'),
        meta: { title: '图书管理', requiresAuth: true }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  document.title = to.meta.title ? `${to.meta.title} - 图书管理系统` : '图书管理系统'
  const userStore = useUserStore()
  if (to.meta.requiresAuth && !userStore.isLoggedIn()) {
    next({ path: '/login', query: { redirect: to.fullPath } })
  } else if (to.path === '/login' && userStore.isLoggedIn()) {
    next({ path: '/' })
  } else {
    next()
  }
})

export default router
