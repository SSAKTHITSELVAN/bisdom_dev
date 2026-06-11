import client from './client'

export const submitReview = (data) => client.post('/reviews/submit', data)
export const getDealReviewStatus = (dealId) => client.get(`/reviews/deal/${dealId}`)
export const getUserReviews = (userId) => client.get(`/reviews/user/${userId}`)
export const getReviewContextForLead = (leadId) => client.get(`/reviews/for-lead/${leadId}`)
