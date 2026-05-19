import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAdminToken, clearAdminToken } from '@/api/admin'

/**
 * Hook to check admin authentication
 * Redirects to login if not authenticated
 */
export function useAdminAuth() {
  const navigate = useNavigate()

  useEffect(() => {
    const token = getAdminToken()
    if (!token) {
      navigate('/admin/login', { replace: true })
    }
  }, [navigate])

  const handleAuthError = (error) => {
    if (error.response?.status === 403 || error.message === 'Admin not authenticated') {
      clearAdminToken()
      navigate('/admin/login', { replace: true })
      return true
    }
    return false
  }

  return { handleAuthError }
}
