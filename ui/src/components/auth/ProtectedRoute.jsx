import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

export default function ProtectedRoute({ children, requireOnboarding = true }) {
  const { token, isOnboarded } = useAuthStore()
  if (!token) return <Navigate to="/login" replace />
  if (requireOnboarding && !isOnboarded) return <Navigate to="/onboarding" replace />
  return children
}
