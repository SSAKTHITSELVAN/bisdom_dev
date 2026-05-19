import axios from 'axios'
import client from './client'

// Store admin token in session storage
let adminToken = null

export const setAdminToken = (token) => {
  adminToken = token
  sessionStorage.setItem('adminToken', token)
}

export const getAdminToken = () => {
  if (!adminToken) {
    adminToken = sessionStorage.getItem('adminToken')
  }
  return adminToken
}

export const clearAdminToken = () => {
  adminToken = null
  sessionStorage.removeItem('adminToken')
}

const adminRequest = async (config) => {
  const token = getAdminToken()
  if (!token) {
    // Don't auto-redirect here - let the component handle it
    throw new Error('Admin not authenticated')
  }

  try {
    // Create a custom axios instance for admin requests to avoid user token interference
    const adminClient = axios.create({
      baseURL: client.defaults.baseURL,
      timeout: client.defaults.timeout
    })

    // Force admin token to be used (override any user token)
    return await adminClient({
      ...config,
      headers: {
        ...config.headers,
        'Authorization': `Bearer ${token}`,
      },
    })
  } catch (error) {
    // If 403, token is expired or invalid - clear it
    if (error.response?.status === 403) {
      clearAdminToken()
      // Don't auto-redirect - let the component handle it
    }
    throw error
  }
}

export const adminLogin = (password) => {
  return client.post('/admin/login', null, { params: { password } })
}

export const getAdminStats = () => {
  return adminRequest({ method: 'get', url: '/admin/stats' })
}

export const getAllRequirements = (params = {}) => {
  return adminRequest({ method: 'get', url: '/admin/requirements', params })
}

export const getRequirementMatches = (requirementId) => {
  return adminRequest({ method: 'get', url: `/admin/requirements/${requirementId}/matches` })
}

export const getAllUsers = (params = {}) => {
  return adminRequest({ method: 'get', url: '/admin/users', params })
}

export const getMapData = () => {
  return adminRequest({ method: 'get', url: '/admin/map-data' })
}

export const getAdminOverview = () => {
  return adminRequest({ method: 'get', url: '/admin/overview' })
}

export const fixProfiles = () => {
  return adminRequest({ method: 'post', url: '/admin/fix-profiles' })
}

export const rematchRequirement = (requirementId) => {
  return adminRequest({ method: 'post', url: `/admin/rematch/${requirementId}` })
}

export const getLeadConversation = (leadId) => {
  return adminRequest({ method: 'get', url: `/admin/conversations/${leadId}` })
}

export const getGrowthData = (params = {}) => {
  return adminRequest({ method: 'get', url: '/admin/growth-data', params })
}
