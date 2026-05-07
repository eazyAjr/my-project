import { defineStore } from 'pinia'
import { ref } from 'vue'
import request from '@/api/request'
import axios from 'axios'
import { getToken } from '@/utils/auth'

export const useOrderStore = defineStore('order', () => {
  const orders = ref([])
  const total = ref(0)

  async function analyzeTemplate(headers) {
    return request.post('/templates/analyze', { headers })
  }

  async function saveTemplate(fingerprint, headers, mapping) {
    return request.post('/templates', { fingerprint, headers, mapping })
  }

  async function validateOrders(list) {
    return request.post('/orders/validate', { list })
  }

  async function batchSubmit(list) {
    return request.post('/orders/batch', { list })
  }

  async function getOrders(params = {}) {
    const res = await request.get('/orders', { params })
    if (res.success) {
      orders.value = res.data
      total.value = res.total
    }
    return res
  }

  async function deleteOrder(id) {
    return request.delete(`/orders/${id}`)
  }

  async function exportOrders(params = {}) {
    const token = getToken()
    const res = await axios.get('/api/orders/export', {
      params,
      responseType: 'blob',
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
    const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = '运单列表.xlsx'
    a.click()
    URL.revokeObjectURL(url)
    return res
  }

  return { orders, total, analyzeTemplate, saveTemplate, validateOrders, batchSubmit, getOrders, deleteOrder, exportOrders }
})
