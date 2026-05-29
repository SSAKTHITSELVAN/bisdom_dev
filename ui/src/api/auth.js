import client from './client'

// Send OTP - accepts object { phone: "1234567890" }
export const sendOTP = (data) => client.post('/auth/send-otp', data)

// Verify OTP - accepts object { phone: "1234567890", otp: "123456" }
export const verifyOTP = (data) => client.post('/auth/verify-otp', data)
