import client from './client'
export const getConfig    = ()     => client.get('/config/')
export const updateConfig = data   => client.put('/config/', data)
