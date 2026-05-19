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

const adminRequest = (config) => {
  const token = getAdminToken()
  if (!token) {
    throw new Error('Admin not authenticated')
  }
  return client({
    ...config,
    headers: {
      ...config.headers,
      'Authorization': `Bearer ${token}`,
    },
  })
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
