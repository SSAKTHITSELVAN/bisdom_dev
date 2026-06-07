import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

const client = axios.create({ baseURL: API_BASE, timeout: 60000 })

client.interceptors.request.use(cfg => {
  const token = localStorage.getItem('bisdom_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

client.interceptors.response.use(
  r => r,
  async err => {
    const status = err.response?.status
    const config = err.config

    if (status === 401) {
      localStorage.removeItem('bisdom_token')
      window.location.href = '/login'
      return Promise.reject(err)
    }

    // Retry on 429 (rate limited) or 502/503/504 (server overloaded)
    if ((status === 429 || status >= 502) && !config._retryCount) {
      config._retryCount = (config._retryCount || 0) + 1
      if (config._retryCount <= 2) {
        const delay = status === 429 ? 3000 : 1500
        await new Promise(r => setTimeout(r, delay * config._retryCount))
        return client(config)
      }
    }

    return Promise.reject(err)
  }
)

export default client
