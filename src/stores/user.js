import { defineStore } from 'pinia'
import { ref } from 'vue'
import { setToken, setUser, clearAuth, getToken, getUser } from '@/utils/auth'
import usersData from '@/mock/users.json'

export const useUserStore = defineStore('user', () => {
  const token = ref(getToken() || '')
  const userInfo = ref(getUser() || null)

  function login(username, password) {
    const user = usersData.find(
      u => u.username === username && u.password === password
    )
    if (!user) return { success: false, message: '账号或密码错误' }

    const fakeToken = 'token_' + Date.now()
    token.value = fakeToken
    userInfo.value = { username: user.username, nickname: user.nickname, role: user.role }
    setToken(fakeToken)
    setUser(userInfo.value)
    return { success: true }
  }

  function logout() {
    token.value = ''
    userInfo.value = null
    clearAuth()
  }

  const isLoggedIn = () => !!token.value

  return { token, userInfo, login, logout, isLoggedIn }
})
