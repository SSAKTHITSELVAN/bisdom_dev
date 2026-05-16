import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

const client = axios.create({ baseURL: API_BASE, timeout: 30000 })

client.interceptors.request.use(cfg => {
  const token = localStorage.getItem('bisdom_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

client.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('bisdom_token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default client
