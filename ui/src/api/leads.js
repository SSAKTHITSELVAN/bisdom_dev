import client from './client'
export const listLeads           = ()   => client.get('/leads/')
export const listLeadsAsBuyer    = ()   => client.get('/leads/as-buyer')
export const listLeadsAsSupplier = ()   => client.get('/leads/as-supplier')
export const getLead             = id   => client.get(`/leads/${id}`)
export const getCounterpart      = id   => client.get(`/leads/${id}/counterpart-profile`)
