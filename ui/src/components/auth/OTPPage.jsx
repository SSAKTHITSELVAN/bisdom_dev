import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { verifyOTP, sendOTP } from '../../api/auth'
import { useAuthStore } from '../../store/authStore'
import Logo from '../ui/Logo'
import Spinner from '../ui/Spinner'
import toast from 'react-hot-toast'

export default function OTPPage() {
  const [otp, setOtp] = useState(['','','','','',''])
  const [loading, setLoading] = useState(false)
  const [resendTimer, setResendTimer] = useState(30)
  const refs = useRef([])
  const navigate = useNavigate()
  const { state } = useLocation()
  const phone = state?.phone || ''
  const setAuth = useAuthStore(s => s.setAuth)

  useEffect(() => {
    refs.current[0]?.focus()
    const t = setInterval(() => setResendTimer(p => p > 0 ? p - 1 : 0), 1000)
    return () => clearInterval(t)
  }, [])

  const handleKey = (i, e) => {
    const val = e.target.value.replace(/\D/g,'')
    if (!val) {
      const n = [...otp]; n[i] = ''; setOtp(n)
      if (i > 0) refs.current[i-1]?.focus()
      return
    }
    // Handle paste
    if (val.length > 1) {
      const digits = val.slice(0,6).split('')
      const n = [...otp]
      digits.forEach((d, idx) => { if (idx < 6) n[idx] = d })
      setOtp(n)
      refs.current[Math.min(5, digits.length - 1)]?.focus()
      return
    }
    const n = [...otp]; n[i] = val; setOtp(n)
    if (i < 5) refs.current[i+1]?.focus()
  }

  const handleVerify = async () => {
    const code = otp.join('')
    if (code.length < 6) { toast.error('Enter 6-digit OTP'); return }
    setLoading(true)
    try {
      const res = await verifyOTP(phone, code)
      const { access_token, is_new_user, is_onboarded } = res.data
      localStorage.setItem('bisdom_token', access_token)
      setAuth(access_token, { phone }, is_onboarded)
      toast.success('Verified!')
      if (!is_onboarded) navigate('/workspace')
      else navigate('/workspace')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Invalid OTP')
      setOtp(['','','','','',''])
      refs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (resendTimer > 0) return
    try {
      await sendOTP(phone)
      toast.success('OTP resent!')
      setResendTimer(30)
    } catch { toast.error('Failed to resend') }
  }

  return (
    <div className="bg-bisdom min-h-screen flex flex-col items-center justify-center px-6 relative">
      <div className="relative z-10 w-full max-w-sm animate-slide-up">
        <div className="text-center mb-10">
          <Logo size="md" />
        </div>

        <div className="glass rounded-3xl p-8">
          <button onClick={() => navigate('/workspace')}
            className="flex items-center gap-2 text-white/50 text-sm mb-6 hover:text-white transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Back
          </button>

          <h2 className="text-2xl font-bold text-white mb-1">Verify OTP</h2>
          <p className="text-sm text-white/50 mb-8">
            Sent to <span className="text-white/80 font-semibold">+91 {phone}</span>
          </p>

          {/* OTP boxes */}
          <div className="flex gap-2 justify-center mb-8">
            {otp.map((digit, i) => (
              <input key={i} ref={el => refs.current[i] = el}
                className="otp-box"
                type="text" inputMode="numeric" maxLength={6}
                value={digit}
                onChange={e => handleKey(i, e)}
                onKeyDown={e => {
                  if (e.key === 'Backspace' && !otp[i] && i > 0) refs.current[i-1]?.focus()
                }}
              />
            ))}
          </div>

          <button className="btn-primary flex items-center justify-center gap-2"
            onClick={handleVerify} disabled={loading}>
            {loading && <Spinner size={18} />}
            {loading ? 'Verifying…' : 'Verify & Continue'}
          </button>

          <div className="text-center mt-5">
            {resendTimer > 0
              ? <p className="text-sm text-white/40">Resend in <span className="text-white/70 font-semibold">{resendTimer}s</span></p>
              : <button onClick={handleResend} className="text-sm text-blue-400 font-semibold hover:text-blue-300">
                  Resend OTP
                </button>
            }
          </div>

          <p className="text-xs text-white/30 text-center mt-4">
            Dev OTP: <span className="font-mono font-bold text-white/50">123456</span>
          </p>
        </div>
      </div>
    </div>
  )
}
