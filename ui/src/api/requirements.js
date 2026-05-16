import client from './client'
export const chatRequirement    = data => client.post('/requirements/chat', data)
export const confirmRequirement = id   => client.post('/requirements/confirm', { requirement_id: id })
export const listRequirements   = ()   => client.get('/requirements/')
export const getRequirement     = id   => client.get(`/requirements/${id}`)
