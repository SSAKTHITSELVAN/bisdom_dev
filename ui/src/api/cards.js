import client from './client'

export const generateCard        = (leadId)           => client.post(`/cards/leads/${leadId}/generate-card`)
export const getCard             = (leadId)           => client.get(`/cards/leads/${leadId}/card`)
export const askQuestion         = (leadId, question) => client.post(`/cards/leads/${leadId}/qa`, { question })
export const answerQuestion      = (leadId, qaId, answer) => client.post(`/cards/leads/${leadId}/qa/${qaId}/answer`, { answer })
export const listQA              = (leadId)           => client.get(`/cards/leads/${leadId}/qa`)
export const submitCard          = (leadId)           => client.post(`/cards/leads/${leadId}/submit-card`)
export const getSubmittedCards   = (reqId)            => client.get(`/cards/requirements/${reqId}/cards`)
export const selectSupplier      = (reqId, leadId)    => client.post(`/cards/requirements/${reqId}/select`, { lead_id: leadId })
export const closeDeal           = (leadId)           => client.post(`/cards/deal/close`, { lead_id: leadId })
export const getCardActions      = ()                 => client.get('/cards/actions-needed')
