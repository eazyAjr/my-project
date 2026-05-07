import { defineStore } from 'pinia'
import { ref } from 'vue'
import { setToken, setUser, clearAuth, getToken, getUser } from '@/utils/auth'
import request from '@/api/request'

export const useUserStore = defineStore('user', () => {
  const token = ref(getToken() || '')
  const userInfo = ref(getUser() || null)

  async function login(username, password) {
    try {
      const res = await request.post('/login', { username, password })
      if (res.success) {
        token.value = res.token
        userInfo.value = res.userInfo
        setToken(res.token)
        setUser(res.userInfo)
        return { success: true }
      }
      return { success: false, message: res.message || '登录失败' }
    } catch (err) {
      return { success: false, message: err.response?.data?.message || '网络请求失败' }
    }
  }

  async function fetchUserInfo() {
    try {
      const res = await request.get('/me')
      if (res.success) {
        userInfo.value = res.userInfo
        setUser(res.userInfo)
      }
      return res
    } catch {
      return { success: false }
    }
  }

  function logout() {
    token.value = ''
    userInfo.value = null
    clearAuth()
  }

  const isLoggedIn = () => !!token.value

  return { token, userInfo, login, logout, isLoggedIn, fetchUserInfo }
})
