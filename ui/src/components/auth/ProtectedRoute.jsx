import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useEffect, useState } from 'react'

export default function ProtectedRoute({ children, requireOnboarding = true }) {
  const { token, isOnboarded } = useAuthStore()
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    // Wait for zustand to hydrate from localStorage
    const unsubscribe = useAuthStore.persist.onFinishHydration(() => {
      setIsHydrated(true)
    })

    // Fallback: mark as hydrated after 100ms even if event doesn't fire
    const timeout = setTimeout(() => setIsHydrated(true), 100)

    return () => {
      unsubscribe()
      clearTimeout(timeout)
    }
  }, [])

  // Don't redirect until zustand has hydrated
  if (!isHydrated) {
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

  if (!token) return <Navigate to="/login" replace />
  if (requireOnboarding && !isOnboarded) return <Navigate to="/onboarding" replace />
  return children
}
