import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { sendOTP } from '../../api/auth'
import Logo from '../ui/Logo'
import Spinner from '../ui/Spinner'
import toast from 'react-hot-toast'

export default function PhonePage() {
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async e => {
    e.preventDefault()
    if (!phone || phone.replace(/\D/g,'').length < 10) {
      toast.error('Enter a valid 10-digit number')
      return
    }
    setLoading(true)
    try {
      await sendOTP(phone)
      toast.success('OTP sent!')
      navigate('/verify-otp', { state: { phone } })
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to send OTP')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-bisdom min-h-screen flex flex-col items-center justify-center px-6 relative">
      <div className="relative z-10 w-full max-w-sm animate-slide-up">
        {/* Logo */}
        <div className="text-center mb-12">
          <Logo size="lg" showTagline />
        </div>

        {/* Card */}
        <div className="glass rounded-3xl p-8">
          <h2 className="text-2xl font-bold text-white mb-1">Welcome</h2>
          <p className="text-sm text-white/50 mb-8 font-medium">Enter your mobile number to continue</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 text-white/50">
                <span className="text-sm font-semibold">+91</span>
                <span className="w-px h-4 bg-white/20" />
              </div>
              <input
                className="bisdom-input pl-16"
                type="tel"
                placeholder="9876543210"
                value={phone}
                onChange={e => setPhone(e.target.value.replace(/\D/g,'').slice(0,10))}
                maxLength={10}
                inputMode="numeric"
                autoFocus
              />
            </div>

            <button className="btn-primary flex items-center justify-center gap-2 mt-2" disabled={loading}>
              {loading ? <Spinner size={18} /> : null}
              {loading ? 'Sending OTP…' : 'Get OTP'}
            </button>
          </form>

          <p className="text-xs text-white/30 text-center mt-6 leading-relaxed">
            By continuing, you agree to Bisdom's Terms of Service and Privacy Policy
          </p>
        </div>

        {/* Bottom decoration */}
        <div className="mt-8 text-center">
          <p className="text-xs text-white/25 font-medium tracking-widest uppercase">
            AI-Powered B2B Commerce
          </p>
        </div>
      </div>
    </div>
  )
}
