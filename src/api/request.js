import axios from 'axios'
import { getToken, removeToken, removeUser } from '@/utils/auth'
import { ElMessage } from 'element-plus'

const request = axios.create({
  baseURL: '/api',
  timeout: 10000
})

request.interceptors.request.use(
  (config) => {
    const token = getToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

request.interceptors.response.use(
  (response) => {
    return response.data
  },
  (error) => {
    const msg = error.response?.data?.message || '网络请求失败'
    if (error.response?.status === 401) {
      removeToken()
      removeUser()
      window.location.href = '/login'
    } else {
      ElMessage.error(msg)
    }
    return Promise.reject(error)
  }
)

export default request
