import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminLogin, setAdminToken, getAdminToken } from '@/api/admin'
import { Lock } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AdminLogin() {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    // Check if already logged in
    if (getAdminToken()) {
      navigate('/admin/dashboard')
    }
  }, [navigate])

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!password.trim()) {
      toast.error('Please enter password')
      return
    }

    setLoading(true)
    try {
      const response = await adminLogin(password)
      setAdminToken(response.data.token)
      toast.success('Admin access granted')
      navigate('/admin/dashboard')
    } catch (error) {
      if (error.response?.status === 403) {
        toast.error('Invalid admin password')
      } else {
        toast.error('Login failed')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a1628 0%, #0d1f3c 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20
    }}>
      <div style={{
        width: '100%',
        maxWidth: 420,
        background: 'rgba(13,31,60,0.8)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 20,
        padding: 40,
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            background: 'linear-gradient(135deg, #054E94, #1A8FFF)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px'
          }}>
            <Lock size={32} color="white" />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#fff', marginBottom: 8 }}>
            Bisdom Admin
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
            Secure authentication
          </p>
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 20 }}>
            <label style={{
              display: 'block',
              fontSize: 12,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.7)',
              marginBottom: 8
            }}>
              Admin Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
              style={{
                width: '100%',
                padding: '14px 16px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 10,
                color: '#fff',
                fontSize: 16,
                outline: 'none'
              }}
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{
              width: '100%',
              padding: '14px',
              fontSize: 14,
              fontWeight: 700
            }}
          >
            {loading ? 'Verifying...' : 'Access Admin Panel'}
          </button>
        </form>

        <div style={{
          marginTop: 24,
          padding: 16,
          background: 'rgba(255,255,255,0.03)',
          borderRadius: 10,
          border: '1px solid rgba(255,255,255,0.06)'
        }}>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, margin: 0 }}>
            <strong style={{ color: 'rgba(255,255,255,0.6)' }}>Note:</strong> Use current time in 24-hour format without colon.
            <br />Example: 14:30 → Password is <span style={{ fontFamily: 'monospace', color: '#60a5fa' }}>1430</span>
          </p>
        </div>
      </div>
    </div>
  )
}
