import client from './client'
export const setExpiry    = data  => client.post('/requirements/set-expiry', data)
export const expireReq    = id    => client.post(`/requirements/expire/${id}`)
