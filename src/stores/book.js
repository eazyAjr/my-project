import { defineStore } from 'pinia'
import { ref } from 'vue'
import request from '@/api/request'
import axios from 'axios'
import { getToken } from '@/utils/auth'

export const useBookStore = defineStore('book', () => {
  const books = ref([])
  const total = ref(0)

  async function getBooks(params = {}) {
    const res = await request.get('/books', { params })
    if (res.success) {
      books.value = res.data
      total.value = res.total
    }
    return res
  }

  async function addBook(book) {
    const res = await request.post('/books', book)
    return res
  }

  async function updateBook(id, data) {
    const res = await request.put(`/books/${id}`, data)
    return res
  }

  async function deleteBook(id) {
    const res = await request.delete(`/books/${id}`)
    return res
  }

  async function exportBooks(params = {}) {
    const token = getToken()
    const res = await axios.get('/api/books/export', {
      params,
      responseType: 'blob',
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
    const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = '图书列表.xlsx'
    a.click()
    URL.revokeObjectURL(url)
    return res
  }

  async function importBooks(list) {
    const res = await request.post('/books/batch', { list })
    return res
  }

  return { books, total, getBooks, addBook, updateBook, deleteBook, exportBooks, importBooks }
})
