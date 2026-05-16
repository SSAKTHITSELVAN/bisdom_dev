import client from './client'
export const sendReqChat = data   => client.post('/req-chat/', data)
export const getReqChat  = reqId  => client.get(`/req-chat/${reqId}`)
