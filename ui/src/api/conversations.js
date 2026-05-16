import client from './client'
export const getConversation    = id     => client.get(`/conversations/${id}`)
export const getConvByLead      = leadId => client.get(`/conversations/lead/${leadId}`)
export const sendMessage        = data   => client.post('/conversations/send', data)
export const toggleChat         = data   => client.post('/conversations/toggle-chat', data)
export const buyerDecision      = data   => client.post('/conversations/buyer-decision', data)
export const supplierEscalation = data   => client.post('/conversations/supplier-escalation', data)
export const suggestResponse    = data   => client.post('/conversations/suggest-response', data)
