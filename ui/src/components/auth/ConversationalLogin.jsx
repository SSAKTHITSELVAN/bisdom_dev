import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { sendOTP, verifyOTP } from '../../api/auth'
import { verifyGST } from '../../api/onboarding'
import { useAuthStore } from '@/store/authStore'
import Logo from '../ui/Logo'
import Spinner from '../ui/Spinner'
import toast from 'react-hot-toast'
import { Bot, User, ArrowRight, RefreshCw, Building2, CheckCircle } from 'lucide-react'

export default function ConversationalLogin() {
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [currentStep, setCurrentStep] = useState('choose') // choose, welcome, phone, otp, gstin, done
  const [authType, setAuthType] = useState(null) // 'signin' or 'signup'
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const [showChoiceButtons, setShowChoiceButtons] = useState(true)
  const [canResendOTP, setCanResendOTP] = useState(false)
  const [resendTimer, setResendTimer] = useState(30)
  const [gstData, setGstData] = useState(null)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }, 100)
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isTyping])

  // Ensure scroll container starts at top
  useEffect(() => {
    const container = document.getElementById('chat-messages-container')
    if (container && messages.length === 0) {
      container.scrollTop = 0
    }
  }, [messages])

  // Resend OTP countdown timer
  useEffect(() => {
    if (currentStep === 'otp' && resendTimer > 0) {
      const timer = setTimeout(() => {
        setResendTimer(prev => prev - 1)
      }, 1000)
      return () => clearTimeout(timer)
    } else if (currentStep === 'otp' && resendTimer === 0) {
      setCanResendOTP(true)
    }
  }, [currentStep, resendTimer])

  useEffect(() => {
    // Prevent duplicate initialization in React StrictMode
    if (initialized) return
    setInitialized(true)

    // Initial welcome - default to signup
    const timeouts = [
      setTimeout(() => addBotMessage("👋 Welcome to Bisdom!"), 500),
      setTimeout(() => addBotMessage("I'm your AI assistant, here to help you connect with verified B2B suppliers across India."), 1600),
      setTimeout(() => addBotMessage("Let's create your account."), 3200),
      setTimeout(() => addBotMessage("What's your mobile number?"), 4000),
      setTimeout(() => addBotMessage("(Enter 10 digits, starting with 6-9)"), 4800)
    ]

    // Automatically set to signup mode and skip choice
    setTimeout(() => {
      setAuthType('signup')
      setShowChoiceButtons(false)
      setCurrentStep('phone')
    }, 3000)

    return () => timeouts.forEach(t => clearTimeout(t))
  }, [])

  const addBotMessage = (text) => {
    setIsTyping(true)
    setTimeout(() => {
      setMessages(prev => [...prev, { type: 'bot', text, timestamp: new Date() }])
      setIsTyping(false)
    }, 800)
  }

  const addUserMessage = (text) => {
    setMessages(prev => [...prev, { type: 'user', text, timestamp: new Date() }])
  }

  const handleChoice = (choice) => {
    setAuthType(choice)
    setShowChoiceButtons(false)
    addUserMessage(choice === 'signin' ? 'Sign In' : 'Sign Up')

    setTimeout(() => {
      if (choice === 'signin') {
        addBotMessage("Great! Let's sign you in.")
      } else {
        addBotMessage("Excellent! Let's create your account.")
      }
    }, 300)

    setTimeout(() => addBotMessage("What's your mobile number?"), 1200)
    setTimeout(() => addBotMessage("(Enter 10 digits, starting with 6-9)"), 2000)

    setCurrentStep('phone')
  }

  const handleResendOTP = async () => {
    if (!canResendOTP || loading || !phone) return

    setLoading(true)
    try {
      await sendOTP({ phone })
      addBotMessage("✅ New OTP sent!")
      setTimeout(() => addBotMessage("📱 Please check your SMS."), 800)
      // Restart timer
      setCanResendOTP(false)
      setResendTimer(30)
    } catch (err) {
      const errorMsg = err.response?.data?.detail?.[0]?.msg || err.response?.data?.detail || "Couldn't resend OTP"
      addBotMessage(`❌ ${errorMsg}`)
    } finally {
      setLoading(false)
    }
  }

  const handleSendMessage = async () => {
    if (!inputValue.trim() || loading) return

    const value = inputValue.trim()
    addUserMessage(value)
    setInputValue('')
    setLoading(true)

    if (currentStep === 'phone') {
      // Validate phone number
      const phoneDigits = value.replace(/\D/g, '')
      if (phoneDigits.length !== 10 || !phoneDigits.match(/^[6-9]\d{9}$/)) {
        setLoading(false)
        addBotMessage("🤔 Hmm, that doesn't look right.")
        setTimeout(() => addBotMessage("Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9."), 800)
        return
      }

      setPhone(phoneDigits)

      try {
        // Send OTP
        await sendOTP({ phone: phoneDigits })
        addBotMessage(`✅ Perfect! I've sent a 6-digit OTP to +91 ${phoneDigits.slice(0,5)}*****`)
        setTimeout(() => addBotMessage("📱 Please check your SMS and enter the OTP below:"), 1000)
        setTimeout(() => addBotMessage("💡 Didn't receive it? You can resend after 30 seconds."), 2000)
        setCurrentStep('otp')
        // Start resend OTP timer
        setCanResendOTP(false)
        setResendTimer(30)
      } catch (err) {
        const errorMsg = err.response?.data?.detail?.[0]?.msg || err.response?.data?.detail || "Couldn't send OTP"
        addBotMessage(`❌ ${errorMsg}`)
        addBotMessage("Please check your number and try again.")
      } finally {
        setLoading(false)
      }
    } else if (currentStep === 'otp') {
      // Validate OTP
      const otpDigits = value.replace(/\D/g, '')
      if (otpDigits.length !== 6) {
        setLoading(false)
        addBotMessage("🔢 The OTP should be exactly 6 digits.")
        setTimeout(() => addBotMessage("Please check your SMS and enter all 6 digits."), 800)
        return
      }

      try {
        // Verify OTP
        const response = await verifyOTP({ phone, otp: otpDigits })
        const token = response.data.access_token
        const isOnboarded = response.data.is_onboarded

        // CRITICAL: setAuth will handle localStorage with correct key 'bisdom_token'
        // This matches axios interceptor in client.js
        setAuth(token, null, isOnboarded)

        addBotMessage("🎉 Verified!")

        // Wait for zustand to finish persisting before navigating
        await new Promise(resolve => setTimeout(resolve, 200))

        // For Sign Up (new user) - ask for GSTIN
        if (authType === 'signup' && !isOnboarded) {
          setTimeout(() => addBotMessage("Now, let's verify your business."), 1000)
          setTimeout(() => addBotMessage("What's your company's GSTIN?"), 1800)
          setTimeout(() => addBotMessage("(15-character GST identification number)"), 2600)
          setCurrentStep('gstin')
          setLoading(false)
        }
        // If user is already onboarded (existing user) - go to workspace
        else if (isOnboarded) {
          setTimeout(() => addBotMessage("Welcome back to Bisdom!"), 1000)
          setTimeout(() => {
            setLoading(false)
            // Force a small delay to ensure hydration completes
            setTimeout(() => navigate('/workspace', { replace: true }), 100)
          }, 2000)
        }
        // If user is not onboarded (incomplete signup) - go to onboarding
        else {
          setTimeout(() => addBotMessage("Let's complete your profile setup..."), 1000)
          setTimeout(() => {
            setLoading(false)
            setTimeout(() => navigate('/onboarding', { replace: true }), 100)
          }, 2000)
        }
      } catch (err) {
        setLoading(false)
        const errorMsg = err.response?.data?.detail || "OTP verification failed"
        addBotMessage(`❌ ${errorMsg}`)
        addBotMessage("Please check the OTP and try again.")
      }
    } else if (currentStep === 'gstin') {
      // Validate GSTIN (15 characters, alphanumeric)
      const gstinValue = value.toUpperCase()
      if (gstinValue.length !== 15 || !/^[0-9A-Z]{15}$/.test(gstinValue)) {
        setLoading(false)
        addBotMessage("🤔 That doesn't look like a valid GSTIN.")
        setTimeout(() => addBotMessage("Please enter a valid 15-character GST identification number."), 800)
        return
      }

      try {
        // Verify GSTIN with backend
        const response = await verifyGST(gstinValue)

        if (response.data.valid) {
          setGstData(response.data)
          setLoading(false)
          addBotMessage("✅ Perfect! GSTIN verified.")
          setTimeout(() => addBotMessage(`🏢 Company: ${response.data.trade_name || response.data.legal_name}`), 800)
          setTimeout(() => addBotMessage(`📍 Location: ${response.data.city}, ${response.data.state}`), 1400)
          setTimeout(() => addBotMessage(`✓ Status: ${response.data.gst_status}`), 2000)
          setTimeout(() => addBotMessage("Let me set up your workspace..."), 2800)

          setTimeout(() => {
            navigate('/onboarding', { state: { gstin: gstinValue, gstData: response.data }, replace: true })
          }, 4000)
        } else {
          setLoading(false)
          addBotMessage(`❌ ${response.data.error || 'GSTIN verification failed'}`)
          addBotMessage("Please check your GSTIN and try again.")
        }
      } catch (err) {
        setLoading(false)
        const errorMsg = err.response?.data?.detail || "Couldn't verify GSTIN"
        addBotMessage(`❌ ${errorMsg}`)
        addBotMessage("Please check your GSTIN and try again.")
      }
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a1628 0%, #0d1f3c 50%, #0a1628 100%)',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Animated Background Effects */}
      <div style={{
        position: 'absolute',
        top: '-50%',
        right: '-20%',
        width: '60%',
        height: '100%',
        background: 'radial-gradient(circle, rgba(96,165,250,0.15) 0%, transparent 70%)',
        pointerEvents: 'none',
        animation: 'pulse 8s ease-in-out infinite'
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-30%',
        left: '-10%',
        width: '50%',
        height: '80%',
        background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)',
        pointerEvents: 'none',
        animation: 'pulse 10s ease-in-out infinite reverse'
      }} />

      {/* Floating particles */}
      <div style={{
        position: 'absolute',
        top: '20%',
        left: '10%',
        width: '4px',
        height: '4px',
        borderRadius: '50%',
        background: 'rgba(96,165,250,0.3)',
        animation: 'float 6s ease-in-out infinite'
      }} />
      <div style={{
        position: 'absolute',
        top: '60%',
        right: '15%',
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        background: 'rgba(139,92,246,0.3)',
        animation: 'float 8s ease-in-out infinite 2s'
      }} />
      <div style={{
        position: 'absolute',
        bottom: '30%',
        left: '20%',
        width: '5px',
        height: '5px',
        borderRadius: '50%',
        background: 'rgba(96,165,250,0.25)',
        animation: 'float 7s ease-in-out infinite 1s'
      }} />

      {/* Header */}
      <div style={{
        padding: '20px 24px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(13,31,60,0.6)',
        backdropFilter: 'blur(20px)',
        position: 'relative',
        zIndex: 10
      }}>
        <div style={{
          maxWidth: '800px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          gap: 12
        }}>
          <Logo size="sm" />
          <div style={{
            flex: 1,
            height: 1,
            background: 'linear-gradient(90deg, rgba(255,255,255,0.1), transparent)'
          }} />
          <div style={{
            fontSize: 11,
            color: 'rgba(255,255,255,0.4)',
            fontWeight: 600,
            letterSpacing: '0.05em'
          }}>
            SECURE LOGIN
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div
        id="chat-messages-container"
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '40px 24px 240px',
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div style={{
          maxWidth: '900px',
          margin: '0 auto',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start'
        }}>
          {messages.map((msg, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                gap: 16,
                marginBottom: 28,
                alignItems: 'flex-start',
                animation: 'slideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                opacity: 0,
                animationFillMode: 'forwards',
                animationDelay: '0.1s'
              }}
            >
              {msg.type === 'bot' ? (
                <>
                  {/* Bot Avatar */}
                  <div style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: 'linear-gradient(135deg, #054E94 0%, #1A8FFF 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: '0 6px 20px rgba(96,165,250,0.4)',
                    border: '2px solid rgba(255,255,255,0.1)',
                    transition: 'transform 0.3s ease',
                    animation: 'scaleIn 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}>
                    <Bot size={24} color="white" strokeWidth={2.5} />
                  </div>

                  {/* Bot Message */}
                  <div style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '20px 20px 20px 6px',
                    padding: idx === 0 ? '20px 24px' : '18px 22px',
                    maxWidth: '75%',
                    color: '#fff',
                    fontSize: idx === 0 ? 18 : 16,
                    fontWeight: idx === 0 ? 600 : 400,
                    lineHeight: 1.7,
                    backdropFilter: 'blur(20px)',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    cursor: 'default'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.2)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)'
                  }}
                  >
                    {msg.text}
                  </div>
                </>
              ) : (
                <>
                  <div style={{ flex: 1 }} />

                  {/* User Message */}
                  <div style={{
                    background: 'linear-gradient(135deg, #054E94 0%, #1A8FFF 100%)',
                    borderRadius: '20px 20px 6px 20px',
                    padding: '18px 22px',
                    maxWidth: '70%',
                    color: '#fff',
                    fontSize: 16,
                    fontWeight: 500,
                    lineHeight: 1.6,
                    letterSpacing: '0.3px',
                    boxShadow: '0 6px 20px rgba(96,165,250,0.4)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    cursor: 'default'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(96,165,250,0.5)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(96,165,250,0.4)'
                  }}
                  >
                    {msg.text}
                  </div>

                  {/* User Avatar */}
                  <div style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: 'rgba(255,255,255,0.08)',
                    border: '2px solid rgba(255,255,255,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    animation: 'scaleIn 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}>
                    <User size={24} color="rgba(255,255,255,0.7)" strokeWidth={2.5} />
                  </div>
                </>
              )}
            </div>
          ))}

          {/* Typing Indicator */}
          {isTyping && (
            <div style={{
              display: 'flex',
              gap: 16,
              alignItems: 'flex-start',
              animation: 'slideIn 0.3s ease-out'
            }}>
              <div style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #054E94, #1A8FFF)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Bot size={22} color="white" />
              </div>

              <div style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '16px 16px 16px 4px',
                padding: '14px 18px',
                display: 'flex',
                gap: 6
              }}>
                <div className="typing-dot" />
                <div className="typing-dot" style={{ animationDelay: '0.2s' }} />
                <div className="typing-dot" style={{ animationDelay: '0.4s' }} />
              </div>
            </div>
          )}

          {/* Choice Buttons - Hidden since we default to signup */}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area - Fixed at Bottom */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '20px 24px 28px',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        background: 'rgba(10,22,40,0.95)',
        backdropFilter: 'blur(30px)',
        boxShadow: '0 -10px 40px rgba(0,0,0,0.3)',
        zIndex: 100
      }}>
        <div style={{
          maxWidth: '900px',
          margin: '0 auto',
          position: 'relative'
        }}>
          <div style={{
            display: 'flex',
            gap: 12,
            alignItems: 'flex-end'
          }}>
            <input
              ref={inputRef}
              type={currentStep === 'otp' ? 'text' : 'tel'}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                currentStep === 'otp'
                  ? "Enter 6-digit OTP..."
                  : currentStep === 'gstin'
                  ? "Enter 15-character GSTIN..."
                  : currentStep === 'phone'
                  ? "Type your mobile number..."
                  : "Type here..."
              }
              disabled={loading || currentStep === 'choose'}
              maxLength={currentStep === 'otp' ? 6 : currentStep === 'gstin' ? 15 : 10}
              inputMode={currentStep === 'otp' ? 'numeric' : 'tel'}
              autoFocus
              style={{
                flex: 1,
                background: 'rgba(255,255,255,0.06)',
                border: '2px solid rgba(255,255,255,0.12)',
                borderRadius: 16,
                padding: '16px 20px',
                fontSize: 16,
                color: '#fff',
                outline: 'none',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                fontFamily: 'inherit',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}
              onFocus={(e) => {
                e.target.style.background = 'rgba(255,255,255,0.09)'
                e.target.style.borderColor = 'rgba(96,165,250,0.5)'
                e.target.style.boxShadow = '0 6px 20px rgba(96,165,250,0.2)'
                e.target.style.transform = 'translateY(-1px)'
              }}
              onBlur={(e) => {
                e.target.style.background = 'rgba(255,255,255,0.06)'
                e.target.style.borderColor = 'rgba(255,255,255,0.12)'
                e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'
                e.target.style.transform = 'translateY(0)'
              }}
            />

            <button
              onClick={handleSendMessage}
              disabled={loading || !inputValue.trim()}
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                background: loading || !inputValue.trim()
                  ? 'rgba(255,255,255,0.08)'
                  : 'linear-gradient(135deg, #054E94 0%, #1A8FFF 100%)',
                border: loading || !inputValue.trim()
                  ? '2px solid rgba(255,255,255,0.1)'
                  : '2px solid rgba(255,255,255,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: loading || !inputValue.trim() ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                flexShrink: 0,
                opacity: loading || !inputValue.trim() ? 0.4 : 1,
                boxShadow: loading || !inputValue.trim()
                  ? 'none'
                  : '0 6px 20px rgba(96,165,250,0.3)'
              }}
              onMouseEnter={(e) => {
                if (!loading && inputValue.trim()) {
                  e.currentTarget.style.transform = 'scale(1.08) translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 8px 28px rgba(96,165,250,0.5)'
                }
              }}
              onMouseLeave={(e) => {
                if (!loading && inputValue.trim()) {
                  e.currentTarget.style.transform = 'scale(1) translateY(0)'
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(96,165,250,0.3)'
                }
              }}
              onMouseDown={(e) => {
                if (!loading && inputValue.trim()) {
                  e.currentTarget.style.transform = 'scale(0.95) translateY(0)'
                }
              }}
              onMouseUp={(e) => {
                if (!loading && inputValue.trim()) {
                  e.currentTarget.style.transform = 'scale(1.08) translateY(-2px)'
                }
              }}
            >
              {loading ? (
                <Spinner size={24} color="white" />
              ) : (
                <ArrowRight size={26} color="white" strokeWidth={2.5} />
              )}
            </button>
          </div>

          {/* Resend OTP Button */}
          {currentStep === 'otp' && (
            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
              {canResendOTP ? (
                <button
                  onClick={handleResendOTP}
                  disabled={loading}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#60a5fa',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    borderRadius: 8,
                    transition: 'all 0.2s',
                    opacity: loading ? 0.5 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) {
                      e.currentTarget.style.background = 'rgba(96,165,250,0.1)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!loading) {
                      e.currentTarget.style.background = 'transparent'
                    }
                  }}
                >
                  <RefreshCw size={14} />
                  Resend OTP
                </button>
              ) : (
                <p style={{
                  fontSize: 11,
                  color: 'rgba(255,255,255,0.3)',
                  margin: 0
                }}>
                  Resend OTP in {resendTimer}s
                </p>
              )}
            </div>
          )}

          <p style={{
            fontSize: 11,
            color: 'rgba(255,255,255,0.3)',
            marginTop: currentStep === 'otp' ? 8 : 12,
            textAlign: 'center'
          }}>
            By continuing, you agree to Bisdom's Terms of Service and Privacy Policy
          </p>
        </div>
      </div>

      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.8);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 0.6;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.05);
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0) translateX(0);
            opacity: 0.3;
          }
          50% {
            transform: translateY(-20px) translateX(10px);
            opacity: 0.6;
          }
        }

        .typing-dot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: rgba(255,255,255,0.5);
          animation: typing 1.4s ease-in-out infinite;
        }

        @keyframes typing {
          0%, 60%, 100% {
            opacity: 0.3;
            transform: scale(0.8);
          }
          30% {
            opacity: 1;
            transform: scale(1.3);
          }
        }

        input::placeholder {
          color: rgba(255,255,255,0.45);
        }

        /* Custom scrollbar */
        ::-webkit-scrollbar {
          width: 8px;
        }

        ::-webkit-scrollbar-track {
          background: rgba(255,255,255,0.02);
        }

        ::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.1);
          border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.15);
        }
      `}</style>
    </div>
  )
}
