import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    component: () => import('@/views/Layout.vue'),
    redirect: '/order-import',
    children: [
      {
        path: 'order-import',
        name: 'OrderImport',
        component: () => import('@/views/OrderImport.vue'),
        meta: { title: '批量下单导入' }
      },
      {
        path: 'order-list',
        name: 'OrderList',
        component: () => import('@/views/OrderList.vue'),
        meta: { title: '已导入运单' }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  document.title = to.meta.title ? `${to.meta.title} - 万能导入` : '万能导入'
  next()
})

export default router
