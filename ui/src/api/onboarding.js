import client from './client'
export const verifyGST       = gstin => client.post('/onboarding/verify-gst', { gstin })
export const completeOnboard = data  => client.post('/onboarding/complete', data)
