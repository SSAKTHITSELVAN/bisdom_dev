import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

export default function ProtectedRoute({ children, requireOnboarding = true }) {
  const { token, isOnboarded, _hasHydrated } = useAuthStore()

  // Wait for zustand to hydrate from localStorage
  if (!_hasHydrated) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #0a1628 0%, #0d1f3c 100%)'
      }}>
        <div style={{ color: '#fff', fontSize: 14 }}>Loading...</div>
      </div>
    )
  }

  // Check authentication after hydration
  if (!token) return <Navigate to="/login" replace />
  if (requireOnboarding && !isOnboarded) return <Navigate to="/onboarding" replace />
  return children
}
