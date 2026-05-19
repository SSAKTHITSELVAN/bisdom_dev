import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { sendOTP, verifyOTP } from '../../api/auth'
import Logo from '../ui/Logo'
import Spinner from '../ui/Spinner'
import toast from 'react-hot-toast'
import { Bot, User, ArrowRight } from 'lucide-react'

export default function ConversationalLogin() {
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [currentStep, setCurrentStep] = useState('welcome') // welcome, phone, otp, done
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const navigate = useNavigate()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isTyping])

  useEffect(() => {
    // Initial welcome message
    setTimeout(() => addBotMessage("Hi! I'm Bisdom AI. Let's get you started on India's smartest B2B commerce platform. 🚀"), 500)
    setTimeout(() => addBotMessage("What's your mobile number? (10 digits, starting with 6-9)"), 1500)
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

  const handleSendMessage = async () => {
    if (!inputValue.trim() || loading) return

    const value = inputValue.trim()
    addUserMessage(value)
    setInputValue('')
    setLoading(true)

    if (currentStep === 'welcome') {
      // Validate phone number
      const phoneDigits = value.replace(/\D/g, '')
      if (phoneDigits.length !== 10 || !phoneDigits.match(/^[6-9]\d{9}$/)) {
        setLoading(false)
        addBotMessage("Hmm, that doesn't look like a valid Indian mobile number. Please enter 10 digits starting with 6-9.")
        return
      }

      setPhone(phoneDigits)

      try {
        await sendOTP(`+91${phoneDigits}`)
        addBotMessage(`Perfect! I've sent a 6-digit OTP to +91 ${phoneDigits.slice(0,5)}*****`)
        addBotMessage("Please enter the OTP to verify your number:")
        setCurrentStep('otp')
      } catch (err) {
        addBotMessage("Oops! Couldn't send the OTP. Please try again or check your number.")
      } finally {
        setLoading(false)
      }
    } else if (currentStep === 'otp') {
      // Validate OTP
      const otpDigits = value.replace(/\D/g, '')
      if (otpDigits.length !== 6) {
        setLoading(false)
        addBotMessage("The OTP should be 6 digits. Please check and try again.")
        return
      }

      try {
        const response = await verifyOTP(`+91${phone}`, otpDigits)
        localStorage.setItem('token', response.data.access_token)

        addBotMessage("✅ Verified! Welcome to Bisdom!")
        addBotMessage("Let me take you to your workspace...")

        setTimeout(() => {
          if (response.data.is_onboarded) {
            navigate('/workspace')
          } else {
            navigate('/onboarding')
          }
        }, 2000)
      } catch (err) {
        setLoading(false)
        addBotMessage("That OTP doesn't match. Please try again or request a new one.")
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
      {/* Background effects */}
      <div style={{
        position: 'absolute',
        top: '-50%',
        right: '-20%',
        width: '60%',
        height: '100%',
        background: 'radial-gradient(circle, rgba(96,165,250,0.1) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-30%',
        left: '-10%',
        width: '50%',
        height: '80%',
        background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)',
        pointerEvents: 'none'
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
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '32px 24px',
        position: 'relative',
        zIndex: 1
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          {messages.map((msg, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                gap: 16,
                marginBottom: 24,
                alignItems: 'flex-start',
                animation: 'slideIn 0.3s ease-out'
              }}
            >
              {msg.type === 'bot' ? (
                <>
                  {/* Bot Avatar */}
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: 'linear-gradient(135deg, #054E94, #1A8FFF)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: '0 4px 12px rgba(96,165,250,0.3)'
                  }}>
                    <Bot size={22} color="white" />
                  </div>

                  {/* Bot Message */}
                  <div style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '16px 16px 16px 4px',
                    padding: '14px 18px',
                    maxWidth: '85%',
                    color: '#fff',
                    fontSize: 15,
                    lineHeight: 1.6,
                    backdropFilter: 'blur(10px)'
                  }}>
                    {msg.text}
                  </div>
                </>
              ) : (
                <>
                  <div style={{ flex: 1 }} />

                  {/* User Message */}
                  <div style={{
                    background: 'linear-gradient(135deg, #054E94, #1A8FFF)',
                    borderRadius: '16px 16px 4px 16px',
                    padding: '14px 18px',
                    maxWidth: '85%',
                    color: '#fff',
                    fontSize: 15,
                    lineHeight: 1.6,
                    boxShadow: '0 4px 12px rgba(96,165,250,0.3)'
                  }}>
                    {msg.text}
                  </div>

                  {/* User Avatar */}
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <User size={22} color="rgba(255,255,255,0.6)" />
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

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div style={{
        padding: '16px 24px 24px',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(13,31,60,0.6)',
        backdropFilter: 'blur(20px)',
        position: 'relative',
        zIndex: 10
      }}>
        <div style={{
          maxWidth: '800px',
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
                  : "Type your mobile number..."
              }
              disabled={loading}
              maxLength={currentStep === 'otp' ? 6 : 10}
              inputMode={currentStep === 'otp' ? 'numeric' : 'tel'}
              style={{
                flex: 1,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 12,
                padding: '14px 18px',
                fontSize: 15,
                color: '#fff',
                outline: 'none',
                transition: 'all 0.2s',
                fontFamily: 'inherit'
              }}
              onFocus={(e) => {
                e.target.style.background = 'rgba(255,255,255,0.08)'
                e.target.style.borderColor = 'rgba(96,165,250,0.4)'
              }}
              onBlur={(e) => {
                e.target.style.background = 'rgba(255,255,255,0.05)'
                e.target.style.borderColor = 'rgba(255,255,255,0.15)'
              }}
            />

            <button
              onClick={handleSendMessage}
              disabled={loading || !inputValue.trim()}
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: loading || !inputValue.trim()
                  ? 'rgba(255,255,255,0.1)'
                  : 'linear-gradient(135deg, #054E94, #1A8FFF)',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: loading || !inputValue.trim() ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                flexShrink: 0,
                opacity: loading || !inputValue.trim() ? 0.5 : 1
              }}
              onMouseEnter={(e) => {
                if (!loading && inputValue.trim()) {
                  e.currentTarget.style.transform = 'scale(1.05)'
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(96,165,250,0.4)'
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              {loading ? (
                <Spinner size={20} color="white" />
              ) : (
                <ArrowRight size={22} color="white" />
              )}
            </button>
          </div>

          <p style={{
            fontSize: 11,
            color: 'rgba(255,255,255,0.3)',
            marginTop: 12,
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
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .typing-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: rgba(255,255,255,0.4);
          animation: typing 1.4s infinite;
        }

        @keyframes typing {
          0%, 60%, 100% {
            opacity: 0.3;
            transform: scale(0.8);
          }
          30% {
            opacity: 1;
            transform: scale(1.2);
          }
        }

        input::placeholder {
          color: rgba(255,255,255,0.4);
        }
      `}</style>
    </div>
  )
}
