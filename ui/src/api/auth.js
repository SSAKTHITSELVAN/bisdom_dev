import client from './client'
export const sendOTP   = phone => client.post('/auth/send-otp', { phone })
export const verifyOTP = (phone, otp) => client.post('/auth/verify-otp', { phone, otp })
