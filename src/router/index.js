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
    redirect: '/order-import',
    meta: { requiresAuth: true },
    children: [
      {
        path: 'order-import',
        name: 'OrderImport',
        component: () => import('@/views/OrderImport.vue'),
        meta: { title: '批量下单导入', requiresAuth: true }
      },
      {
        path: 'order-list',
        name: 'OrderList',
        component: () => import('@/views/OrderList.vue'),
        meta: { title: '已导入运单', requiresAuth: true }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  document.title = to.meta.title ? `${to.meta.title} - 物流批量下单系统` : '物流批量下单系统'
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
