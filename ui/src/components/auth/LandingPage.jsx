import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { sendOTP, verifyOTP } from '../../api/auth'
import { verifyGST } from '../../api/onboarding'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'
import {
  Building2, Zap, Shield, Globe, TrendingUp, Users,
  ArrowRight, Phone, Check, RefreshCw, Loader2, Sparkles
} from 'lucide-react'

export default function LandingPage() {
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authMode, setAuthMode] = useState(null) // 'signin' | 'signup'
  const [step, setStep] = useState('phone') // 'phone' | 'otp' | 'gstin'

  const [phoneNumber, setPhoneNumber] = useState('')
  const [otp, setOtp] = useState('')
  const [gstin, setGstin] = useState('')

  const [loading, setLoading] = useState(false)
  const [canResendOTP, setCanResendOTP] = useState(false)
  const [resendTimer, setResendTimer] = useState(30)

  const navigate = useNavigate()
  const { setAuth, token, user } = useAuthStore()

  // Redirect if already logged in
  useEffect(() => {
    if (token && user?.onboarding_complete) {
      navigate('/workspace', { replace: true })
    }
  }, [token, user, navigate])

  // Resend OTP countdown
  useEffect(() => {
    if (step === 'otp' && resendTimer > 0 && !canResendOTP) {
      const timer = setTimeout(() => setResendTimer(prev => prev - 1), 1000)
      return () => clearTimeout(timer)
    } else if (step === 'otp' && resendTimer === 0) {
      setCanResendOTP(true)
    }
  }, [step, resendTimer, canResendOTP])

  // Handle Sign In / Sign Up button click
  const handleAuthStart = (mode) => {
    setAuthMode(mode)
    setShowAuthModal(true)
    setStep('phone')
    setPhoneNumber('')
    setOtp('')
    setGstin('')
  }

  // Handle phone submission
  const handlePhoneSubmit = async (e) => {
    e.preventDefault()
    if (!/^[6-9]\d{9}$/.test(phoneNumber)) {
      toast.error('Please enter a valid 10-digit mobile number')
      return
    }

    setLoading(true)
    try {
      const res = await sendOTP({ phone: phoneNumber })
      if (res.data?.message) {
        toast.success(res.data.message)
      } else {
        toast.success('OTP sent successfully!')
      }
      setStep('otp')
      setResendTimer(30)
      setCanResendOTP(false)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to send OTP')
    } finally {
      setLoading(false)
    }
  }

  // Handle OTP verification
  const handleOTPSubmit = async (e) => {
    e.preventDefault()
    if (!/^\d{6}$/.test(otp)) {
      toast.error('Please enter a valid 6-digit OTP')
      return
    }

    setLoading(true)
    try {
      const res = await verifyOTP({ phone: phoneNumber, otp })
      const { access_token, user } = res.data

      setAuth(access_token, user, user.onboarding_complete)

      // Check if user needs onboarding
      if (!user.onboarding_complete) {
        // For new users (sign up flow), ask for GSTIN
        if (authMode === 'signup') {
          setStep('gstin')
        } else {
          // Existing user not yet onboarded - send to onboarding
          navigate('/onboarding')
        }
      } else {
        // Existing user already onboarded
        toast.success('Welcome back!')
        navigate('/workspace')
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Invalid OTP')
    } finally {
      setLoading(false)
    }
  }

  // Handle GSTIN verification
  const handleGSTINSubmit = async (e) => {
    e.preventDefault()
    if (!/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}\d[Z]{1}[A-Z\d]{1}$/.test(gstin)) {
      toast.error('Please enter a valid GSTIN (e.g., 29ABCDE1234F1Z5)')
      return
    }

    setLoading(true)
    try {
      await verifyGST({ gstin })
      toast.success('GSTIN verified! Setting up your profile...')
      navigate('/onboarding')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Invalid GSTIN')
    } finally {
      setLoading(false)
    }
  }

  // Resend OTP
  const handleResendOTP = async () => {
    setLoading(true)
    setCanResendOTP(false)
    setResendTimer(30)
    try {
      await sendOTP({ phone: phoneNumber })
      toast.success('OTP resent successfully!')
    } catch (err) {
      toast.error('Failed to resend OTP')
      setCanResendOTP(true)
    } finally {
      setLoading(false)
    }
  }

  const closeModal = () => {
    setShowAuthModal(false)
    setAuthMode(null)
    setStep('phone')
    setPhoneNumber('')
    setOtp('')
    setGstin('')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 backdrop-blur-lg bg-white/5 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Building2 className="w-6 h-6" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Bisdom
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleAuthStart('signin')}
              className="px-6 py-2.5 rounded-lg font-semibold text-sm transition-all hover:bg-white/10 border border-white/20"
            >
              Sign In
            </button>
            <button
              onClick={() => handleAuthStart('signup')}
              className="px-6 py-2.5 rounded-lg font-semibold text-sm bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg shadow-blue-500/25"
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>

        <div className="max-w-7xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 mb-8">
            <Sparkles className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium text-blue-300">AI-Powered B2B Procurement Platform</span>
          </div>

          <h1 className="text-6xl md:text-7xl font-bold mb-6 leading-tight">
            Connect with
            <span className="block bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Verified B2B Suppliers
            </span>
          </h1>

          <p className="text-xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
            Automate your procurement with AI agents that find, negotiate, and close deals with
            trusted suppliers across India. Save time, reduce costs, and scale faster.
          </p>

          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => handleAuthStart('signup')}
              className="group px-8 py-4 rounded-xl font-semibold text-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all shadow-xl shadow-blue-500/25 flex items-center gap-2"
            >
              Start Free Trial
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => handleAuthStart('signin')}
              className="px-8 py-4 rounded-xl font-semibold text-lg border border-white/20 hover:bg-white/10 transition-all"
            >
              Sign In
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 mt-20 max-w-3xl mx-auto">
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-400 mb-2">10K+</div>
              <div className="text-sm text-gray-400">Verified Suppliers</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-purple-400 mb-2">50K+</div>
              <div className="text-sm text-gray-400">Deals Closed</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-pink-400 mb-2">95%</div>
              <div className="text-sm text-gray-400">Success Rate</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Why Choose Bisdom?</h2>
            <p className="text-gray-400 text-lg">AI-powered features that transform your procurement process</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Zap className="w-8 h-8" />}
              title="AI-Powered Matching"
              description="Our AI instantly finds the perfect suppliers based on your requirements, location, and budget."
              gradient="from-yellow-500 to-orange-500"
            />
            <FeatureCard
              icon={<Users className="w-8 h-8" />}
              title="Automated Negotiations"
              description="AI agents negotiate on your behalf 24/7, securing the best deals while you focus on your business."
              gradient="from-blue-500 to-cyan-500"
            />
            <FeatureCard
              icon={<Shield className="w-8 h-8" />}
              title="GSTIN Verified"
              description="All suppliers are verified through GSTIN, ensuring you work with legitimate, trusted businesses."
              gradient="from-green-500 to-emerald-500"
            />
            <FeatureCard
              icon={<Globe className="w-8 h-8" />}
              title="Pan-India Network"
              description="Access thousands of verified suppliers across all states and industries in India."
              gradient="from-purple-500 to-pink-500"
            />
            <FeatureCard
              icon={<TrendingUp className="w-8 h-8" />}
              title="Smart Analytics"
              description="Track deals, monitor negotiations, and get insights to optimize your procurement strategy."
              gradient="from-red-500 to-rose-500"
            />
            <FeatureCard
              icon={<Check className="w-8 h-8" />}
              title="Instant Deal Closure"
              description="Close deals in hours, not weeks. Our AI handles the entire process from discovery to confirmation."
              gradient="from-indigo-500 to-violet-500"
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 backdrop-blur-xl border border-white/10 rounded-3xl p-12">
            <h2 className="text-4xl font-bold mb-4">Ready to Transform Your Procurement?</h2>
            <p className="text-gray-300 text-lg mb-8">
              Join thousands of businesses already saving time and money with Bisdom.
            </p>
            <button
              onClick={() => handleAuthStart('signup')}
              className="group px-10 py-4 rounded-xl font-semibold text-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all shadow-xl shadow-blue-500/25 inline-flex items-center gap-2"
            >
              Get Started for Free
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </section>

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-white/10 rounded-2xl shadow-2xl max-w-md w-full p-8 relative">
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            >
              ✕
            </button>

            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-4">
                {step === 'phone' && <Phone className="w-8 h-8" />}
                {step === 'otp' && <Check className="w-8 h-8" />}
                {step === 'gstin' && <Building2 className="w-8 h-8" />}
              </div>
              <h2 className="text-2xl font-bold">
                {authMode === 'signin' ? 'Sign In' : 'Create Account'}
              </h2>
              <p className="text-gray-400 mt-2">
                {step === 'phone' && 'Enter your mobile number to continue'}
                {step === 'otp' && 'Enter the OTP sent to your phone'}
                {step === 'gstin' && 'Verify your business with GSTIN'}
              </p>
            </div>

            {/* Phone Step */}
            {step === 'phone' && (
              <form onSubmit={handlePhoneSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">Mobile Number</label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="Enter 10-digit number"
                    className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-blue-500 focus:outline-none transition-colors"
                    disabled={loading}
                    autoFocus
                  />
                  <p className="text-xs text-gray-500 mt-1">Starting with 6-9</p>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Sending OTP...
                    </>
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* OTP Step */}
            {step === 'otp' && (
              <form onSubmit={handleOTPSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">
                    OTP sent to {phoneNumber}
                  </label>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Enter 6-digit OTP"
                    className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-blue-500 focus:outline-none transition-colors text-center text-2xl tracking-widest"
                    disabled={loading}
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      Verify OTP
                      <Check className="w-5 h-5" />
                    </>
                  )}
                </button>
                <div className="text-center">
                  {canResendOTP ? (
                    <button
                      type="button"
                      onClick={handleResendOTP}
                      disabled={loading}
                      className="text-sm text-blue-400 hover:text-blue-300 font-medium flex items-center justify-center gap-1 mx-auto"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Resend OTP
                    </button>
                  ) : (
                    <p className="text-sm text-gray-500">
                      Resend OTP in {resendTimer}s
                    </p>
                  )}
                </div>
              </form>
            )}

            {/* GSTIN Step */}
            {step === 'gstin' && (
              <form onSubmit={handleGSTINSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">
                    Business GSTIN
                  </label>
                  <input
                    type="text"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value.toUpperCase().slice(0, 15))}
                    placeholder="29ABCDE1234F1Z5"
                    className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-blue-500 focus:outline-none transition-colors uppercase"
                    disabled={loading}
                    autoFocus
                  />
                  <p className="text-xs text-gray-500 mt-1">15-character GST identification number</p>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Verifying GSTIN...
                    </>
                  ) : (
                    <>
                      Verify & Continue
                      <Check className="w-5 h-5" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function FeatureCard({ icon, title, description, gradient }) {
  return (
    <div className="group relative p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all hover:-translate-y-1">
      <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-gray-400 leading-relaxed">{description}</p>
    </div>
  )
}
