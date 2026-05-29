import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { sendOTP, verifyOTP } from '../../api/auth'
import { verifyGST } from '../../api/onboarding'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'
import { Phone, Check, RefreshCw, Loader2, Building2, ArrowRight } from 'lucide-react'
import './LandingPage.css'

export default function LandingPage() {
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authMode, setAuthMode] = useState(null) // 'signin' | 'signup-buyer' | 'signup-seller'
  const [step, setStep] = useState('phone') // 'phone' | 'otp' | 'gstin'

  const [phoneNumber, setPhoneNumber] = useState('')
  const [otp, setOtp] = useState('')
  const [gstin, setGstin] = useState('')

  const [loading, setLoading] = useState(false)
  const [canResendOTP, setCanResendOTP] = useState(false)
  const [resendTimer, setResendTimer] = useState(30)

  const navigate = useNavigate()
  const { setAuth, token, isOnboarded } = useAuthStore()

  // Redirect if already logged in
  useEffect(() => {
    if (token && isOnboarded) {
      navigate('/workspace', { replace: true })
    }
  }, [token, isOnboarded, navigate])

  // Resend OTP countdown
  useEffect(() => {
    if (step === 'otp' && resendTimer > 0 && !canResendOTP) {
      const timer = setTimeout(() => setResendTimer(prev => prev - 1), 1000)
      return () => clearTimeout(timer)
    } else if (step === 'otp' && resendTimer === 0) {
      setCanResendOTP(true)
    }
  }, [step, resendTimer, canResendOTP])

  // Theme toggle
  useEffect(() => {
    const saved = localStorage.getItem('bisdom-theme') || 'dark'
    document.documentElement.setAttribute('data-theme', saved)
  }, [])

  const toggleTheme = () => {
    const current = document.documentElement.getAttribute('data-theme')
    const next = current === 'dark' ? 'light' : 'dark'
    document.documentElement.setAttribute('data-theme', next)
    localStorage.setItem('bisdom-theme', next)
  }

  // Reveal animation on scroll
  useEffect(() => {
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible') }),
      { threshold: 0.07, rootMargin: '0px 0px -40px 0px' }
    )
    document.querySelectorAll('.reveal').forEach((el, i) => {
      el.style.transitionDelay = `${(i % 4) * 0.08}s`
      obs.observe(el)
    })
    return () => obs.disconnect()
  }, [])

  // Handle auth start
  const handleAuthStart = (mode) => {
    // If it's "Get Started", go to chatbot directly
    if (mode === 'signup') {
      navigate('/login-chat')
      return
    }

    // Otherwise show modal for Sign In
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
      toast.success(res.data?.message || 'OTP sent successfully!')
      setStep('otp')
      setResendTimer(30)
      setCanResendOTP(false)
    } catch (err) {
      // Handle error properly - extract message string
      const errorMsg = err.response?.data?.detail || err.message || 'Failed to send OTP'
      toast.error(typeof errorMsg === 'string' ? errorMsg : 'Failed to send OTP')
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
      const { access_token, is_onboarded, is_new_user } = res.data

      setAuth(access_token, null, is_onboarded)

      if (!is_onboarded) {
        if (authMode === 'signin') {
          navigate('/onboarding')
        } else {
          setStep('gstin')
        }
      } else {
        toast.success('Welcome back!')
        navigate('/workspace')
      }
    } catch (err) {
      // Handle error properly - extract message string
      const errorMsg = err.response?.data?.detail || err.message || 'Invalid OTP'
      toast.error(typeof errorMsg === 'string' ? errorMsg : 'Invalid OTP')
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
      // Handle error properly - extract message string
      const errorMsg = err.response?.data?.detail || err.message || 'Invalid GSTIN'
      toast.error(typeof errorMsg === 'string' ? errorMsg : 'Invalid GSTIN')
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
      // Handle error properly
      const errorMsg = err.response?.data?.detail || err.message || 'Failed to resend OTP'
      toast.error(typeof errorMsg === 'string' ? errorMsg : 'Failed to resend OTP')
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
    <div className="landing-page">
      {/* Orbs */}
      <div className="orb-canvas">
        <div className="orb o1"></div>
        <div className="orb o2"></div>
        <div className="orb o3"></div>
        <div className="orb o4"></div>
        <div className="orb o5"></div>
      </div>
      <div className="grid-bg"></div>

      {/* Nav */}
      <nav id="main-nav">
        <a href="#" className="nav-logo">Bis<span>dom</span></a>
        <ul className="nav-links">
          <li><a href="#problem">Problem</a></li>
          <li><a href="#buying">For Buyers</a></li>
          <li><a href="#selling">For Sellers</a></li>
          <li><a href="#parallel">How AI Works</a></li>
        </ul>
        <div className="nav-actions">
          <button onClick={() => handleAuthStart('signin')} className="btn-ghost">Sign In</button>
          <button onClick={() => handleAuthStart('signup')} className="btn-solid">Get Started</button>
          <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
            <span className="t-moon">🌙</span>
            <span className="t-sun">☀️</span>
            <div className="toggle-thumb"></div>
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section id="hero">
        <div className="hero-badge">
          <div className="badge-dot"></div>
          AI-Powered B2B Commerce for Textile & Garments · India
        </div>
        <h1 className="hero-h">
          Your Business, Running<br />
          <span className="accent">On Autopilot</span>
        </h1>
        <p className="hero-sub">
          Post your fabric requirement once. Your Bisdom Agent finds suppliers, negotiates the best price,
          and brings you a deal — while you focus on your business.
        </p>
        <div className="hero-btns">
          <button onClick={() => handleAuthStart('signup')} className="btn-hero-p">
            Get Started Free →
          </button>
          <a href="#buying" className="btn-hero-s">See How It Works</a>
        </div>
        <p className="hero-trust">
          Trusted by garment exporters and fabric suppliers across Tirupur & Coimbatore
        </p>

        {/* Split Chat Preview */}
        <div className="hero-preview">
          {/* Buyer side */}
          <div className="hero-chat-card reveal">
            <div className="chat-header">
              <div className="agent-avatar">RF</div>
              <div>
                <div className="agent-name">Raj Fabrics Agent</div>
                <div className="agent-status">
                  <div className="status-dot"></div>Active · Buyer
                </div>
              </div>
            </div>
            <div className="chat-body">
              <div className="msg user">
                <div className="msg-user-avatar">R</div>
                <div className="msg-bubble">I need 500kg cotton fabric for export order</div>
              </div>
              <div className="msg ai">
                <div className="msg-avatar">RF</div>
                <div className="msg-bubble">
                  Got it! What GSM are you looking for — 160, 180, or 200? And what's your target price per kg?
                </div>
              </div>
              <div className="msg user">
                <div className="msg-user-avatar">R</div>
                <div className="msg-bubble">180 GSM, budget ₹175–185/kg, need by 15th</div>
              </div>
              <div className="msg ai">
                <div className="msg-avatar">RF</div>
                <div className="msg-bubble">
                  Perfect. Searching suppliers in Coimbatore & Erode who can deliver 180 GSM, 500kg by 15th...
                </div>
              </div>
              <div className="sys-msg">⚡ Talking to 4 suppliers now</div>
              <div className="msg ai">
                <div className="msg-avatar">RF</div>
                <div className="approve-card">
                  <div className="approve-title">✅ Best deal found!</div>
                  <div className="approve-details">
                    Sri Murugan Textiles · 180 GSM · ₹178/kg · Delivery by 13th
                  </div>
                  <div className="approve-btns">
                    <button className="abtn-yes">✓ Approve Deal</button>
                    <button className="abtn-no">Negotiate More</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Centre connector */}
          <div className="hero-connector">
            <div className="conn-line-r"></div>
            <div className="neg-badge">⚡ Negotiating</div>
            <div className="conn-line"></div>
          </div>

          {/* Seller side */}
          <div className="hero-chat-card reveal">
            <div className="chat-header">
              <div className="agent-avatar">SM</div>
              <div>
                <div className="agent-name">Sri Murugan Textiles Agent</div>
                <div className="agent-status">
                  <div className="status-dot"></div>Active · Supplier
                </div>
              </div>
            </div>
            <div className="chat-body">
              <div className="sys-msg">📩 New RFQ received from Raj Fabrics Agent</div>
              <div className="msg ai">
                <div className="msg-avatar">SM</div>
                <div className="msg-bubble">
                  RFQ: 500kg 180 GSM cotton, delivery Chennai by 15th. Checking your catalogue...
                </div>
              </div>
              <div className="msg ai">
                <div className="msg-avatar">SM</div>
                <div className="msg-bubble">
                  Your stock: 800kg 180 GSM available. Sending quote at ₹182/kg (your floor: ₹175)
                </div>
              </div>
              <div className="sys-msg">💬 Buyer agent counter-offered ₹176/kg</div>
              <div className="msg ai">
                <div className="msg-avatar">SM</div>
                <div className="msg-bubble">
                  Below floor price. Counter-offering ₹178/kg with free delivery to Chennai. Sending now...
                </div>
              </div>
              <div className="msg ai">
                <div className="deal-closed">
                  <div className="deal-closed-title">🎉 Deal Closed!</div>
                  <div className="deal-closed-detail">₹178/kg · 500kg · Delivery Chennai · 13th</div>
                  <div className="deal-closed-detail" style={{ marginTop: '4px' }}>
                    Order value: ₹89,000 · Margin maintained ✓
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="divider"></div>

      {/* Problem Section */}
      <section id="problem" className="s-pad">
        <div className="s-inner">
          <div className="reveal">
            <p className="s-label">The Problem</p>
            <h2 className="s-title">This is how textile trade works today</h2>
            <p className="s-sub">
              Every buyer and supplier in Tirupur knows this pain. Bisdom is built to end it.
            </p>
          </div>
          <div className="chaos-grid">
            <div className="chaos-card reveal">
              <div className="chaos-emoji">📱</div>
              <div className="chaos-title">Calling 15 suppliers for one order</div>
              <div className="chaos-text">
                Half don't pick up. Three say they'll call back. Two quote the wrong GSM. One good supplier — found after 2 hours.
              </div>
              <div className="chaos-tag">⏳ 2–3 hours wasted per order</div>
            </div>
            <div className="chaos-card reveal">
              <div className="chaos-emoji">💬</div>
              <div className="chaos-title">WhatsApp chaos with no follow-up</div>
              <div className="chaos-text">
                RFQ sent to 10 suppliers on WhatsApp. 4 reply. 2 quote. 1 ghosts after agreeing. You lose the order to a competitor who moved faster.
              </div>
              <div className="chaos-tag">❌ Orders lost to slow response</div>
            </div>
            <div className="chaos-card reveal">
              <div className="chaos-emoji">📊</div>
              <div className="chaos-title">Price comparison in an Excel sheet</div>
              <div className="chaos-text">
                Different GSM, different delivery dates, different payment terms — all dumped in a spreadsheet. No easy way to compare apples to apples.
              </div>
              <div className="chaos-tag">😤 Hours of manual work</div>
            </div>
            <div className="chaos-card reveal">
              <div className="chaos-emoji">🔁</div>
              <div className="chaos-title">Suppliers answering irrelevant RFQs</div>
              <div className="chaos-text">
                Your sales team spends half the day responding to buyers who want 50kg when your MOQ is 500kg. Real leads get missed in the noise.
              </div>
              <div className="chaos-tag">💸 Sales time on wrong leads</div>
            </div>
            <div className="chaos-card reveal">
              <div className="chaos-emoji">🤝</div>
              <div className="chaos-title">Negotiation by phone, nothing on record</div>
              <div className="chaos-text">
                Price agreed over call. Supplier ships. Invoice says different rate. Dispute. No written trail. Relationship damaged.
              </div>
              <div className="chaos-tag">⚠️ No proof, no protection</div>
            </div>
            <div className="chaos-card reveal">
              <div className="chaos-emoji">🏭</div>
              <div className="chaos-title">Good suppliers, impossible to find</div>
              <div className="chaos-text">
                The best fabric supplier in Erode has no website, no presence — just word of mouth. Buyers in Chennai never find them. Both miss out.
              </div>
              <div className="chaos-tag">🔍 Hidden market, hidden money</div>
            </div>
          </div>
        </div>
      </section>

      <div className="divider"></div>

      {/* CTA Section */}
      <section id="cta" className="s-pad">
        <div className="s-inner">
          <div className="reveal" style={{ textAlign: 'center' }}>
            <p className="s-label" style={{ textAlign: 'center' }}>Get Started</p>
            <h2 className="s-title" style={{ maxWidth: '100%', textAlign: 'center' }}>
              Ready to stop chasing and start closing?
            </h2>
            <p className="s-sub" style={{ maxWidth: '500px', margin: '14px auto 0', textAlign: 'center' }}>
              Join as a buyer, a supplier, or both. Your Company Agent will be ready in minutes.
            </p>
          </div>
          <div className="cta-cards">
            <div className="cta-card buyer reveal">
              <div className="cta-card-icon">🛒</div>
              <div className="cta-card-title">I'm a Buyer</div>
              <div className="cta-card-text">
                Stop spending hours chasing fabric quotes. Your agent finds the best supplier, negotiates the price,
                and brings you a deal to approve — in minutes, not days.
              </div>
              <button onClick={() => handleAuthStart('signup')} className="cta-btn cta-btn-blue">
                Start as Buyer →
              </button>
            </div>
            <div className="cta-card seller reveal">
              <div className="cta-card-icon">🏭</div>
              <div className="cta-card-title">I'm a Supplier</div>
              <div className="cta-card-text">
                Stop responding to random enquiries. Your agent filters serious buyers, quotes automatically from your
                catalogue, and brings closed orders to your dashboard.
              </div>
              <button onClick={() => handleAuthStart('signup')} className="cta-btn cta-btn-green">
                Start as Supplier →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer>
        <div className="footer-top">
          <div>
            <div className="footer-logo-text">
              Bis<span>dom</span>
            </div>
            <div className="footer-desc">
              Helping textile and garment businesses discover meaningful opportunities — less noise, better deals, faster trade.
            </div>
            <div className="footer-socials">
              <a className="soc-btn" href="#" title="LinkedIn">💼</a>
              <a className="soc-btn" href="#" title="X">𝕏</a>
              <a className="soc-btn" href="mailto:hello@bisdom.in" title="Email">✉️</a>
            </div>
          </div>
          <div>
            <div className="footer-col-title">Product</div>
            <ul className="footer-links">
              <li><a href="#buying">For Buyers</a></li>
              <li><a href="#selling">For Suppliers</a></li>
              <li><a href="#parallel">How AI Works</a></li>
            </ul>
          </div>
          <div>
            <div className="footer-col-title">Company</div>
            <ul className="footer-links">
              <li><a href="#">About Bisdom</a></li>
              <li><a href="#">Contact</a></li>
              <li><a href="#">Privacy Policy</a></li>
              <li><a href="#">Terms of Service</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <div className="footer-copy">
            © 2025 Bisdom · Chennai, India · Built for Indian Textile & Garment Trade
          </div>
          <div className="footer-legal">
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="auth-modal-overlay" onClick={closeModal}>
          <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
            <button onClick={closeModal} className="modal-close">✕</button>

            <div className="modal-header">
              <div className="modal-icon">
                {step === 'phone' && <Phone className="w-8 h-8" />}
                {step === 'otp' && <Check className="w-8 h-8" />}
                {step === 'gstin' && <Building2 className="w-8 h-8" />}
              </div>
              <h2 className="modal-title">
                {authMode === 'signin' && 'Sign In'}
                {authMode === 'signup-buyer' && 'Create Buyer Account'}
                {authMode === 'signup-seller' && 'Create Supplier Account'}
              </h2>
              <p className="modal-subtitle">
                {step === 'phone' && 'Enter your mobile number to continue'}
                {step === 'otp' && 'Enter the OTP sent to your phone'}
                {step === 'gstin' && 'Verify your business with GSTIN'}
              </p>
            </div>

            {/* Phone Step */}
            {step === 'phone' && (
              <form onSubmit={handlePhoneSubmit} className="modal-form">
                <div className="form-group">
                  <label className="form-label">Mobile Number</label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="Enter 10-digit number"
                    className="form-input"
                    disabled={loading}
                    autoFocus
                  />
                  <p className="form-hint">Starting with 6-9</p>
                </div>
                <button type="submit" disabled={loading} className="btn-submit">
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
              <form onSubmit={handleOTPSubmit} className="modal-form">
                <div className="form-group">
                  <label className="form-label">OTP sent to {phoneNumber}</label>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Enter 6-digit OTP"
                    className="form-input otp-input"
                    disabled={loading}
                    autoFocus
                  />
                </div>
                <button type="submit" disabled={loading} className="btn-submit">
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
                <div className="resend-section">
                  {canResendOTP ? (
                    <button
                      type="button"
                      onClick={handleResendOTP}
                      disabled={loading}
                      className="resend-btn"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Resend OTP
                    </button>
                  ) : (
                    <p className="resend-timer">Resend OTP in {resendTimer}s</p>
                  )}
                </div>
              </form>
            )}

            {/* GSTIN Step */}
            {step === 'gstin' && (
              <form onSubmit={handleGSTINSubmit} className="modal-form">
                <div className="form-group">
                  <label className="form-label">Business GSTIN</label>
                  <input
                    type="text"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value.toUpperCase().slice(0, 15))}
                    placeholder="29ABCDE1234F1Z5"
                    className="form-input gstin-input"
                    disabled={loading}
                    autoFocus
                  />
                  <p className="form-hint">15-character GST identification number</p>
                </div>
                <button type="submit" disabled={loading} className="btn-submit">
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
