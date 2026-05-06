import { defineStore } from 'pinia'
import { ref } from 'vue'
import booksData from '@/mock/books.json'

export const useBookStore = defineStore('book', () => {
  const books = ref(JSON.parse(JSON.stringify(booksData)))
  let nextId = books.value.length > 0 ? Math.max(...books.value.map(b => b.id)) + 1 : 1

  function addBook(book) {
    book.id = nextId++
    books.value.push({ ...book })
  }

  function updateBook(id, data) {
    const idx = books.value.findIndex(b => b.id === id)
    if (idx !== -1) {
      books.value[idx] = { ...books.value[idx], ...data }
    }
  }

  function deleteBook(id) {
    const idx = books.value.findIndex(b => b.id === id)
    if (idx !== -1) books.value.splice(idx, 1)
  }

  function batchAdd(list) {
    list.forEach(item => {
      addBook(item)
    })
  }

  return { books, addBook, updateBook, deleteBook, batchAdd }
})
