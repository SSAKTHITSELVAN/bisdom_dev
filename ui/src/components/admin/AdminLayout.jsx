import { useEffect, useState } from 'react'
import { Outlet, useNavigate, NavLink, useLocation } from 'react-router-dom'
import { getAdminToken, clearAdminToken } from '@/api/admin'
import { LayoutDashboard, FileText, Users, Map, LogOut, Shield } from 'lucide-react'

export default function AdminLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    // Check auth after a small delay to allow token to be set
    const checkAuth = () => {
      const token = getAdminToken()
      if (!token) {
        navigate('/admin/login', { replace: true })
      } else {
        setIsAuthenticated(true)
      }
      setChecking(false)
    }

    // Small delay to allow token setting to complete
    const timer = setTimeout(checkAuth, 50)
    return () => clearTimeout(timer)
  }, [navigate, location.pathname])

  // Don't render until authentication check is done
  if (checking || !isAuthenticated) {
    return null
  }

  const handleLogout = () => {
    clearAdminToken()
    navigate('/admin/login')
  }

  const NavItem = ({ to, icon: Icon, label }) => (
    <NavLink
      to={to}
      style={({ isActive }) => ({
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 16px',
        borderRadius: 10,
        fontSize: 14,
        fontWeight: 600,
        color: isActive ? '#60a5fa' : 'rgba(255,255,255,0.6)',
        background: isActive ? 'rgba(59,130,246,0.15)' : 'transparent',
        border: isActive ? '1px solid rgba(59,130,246,0.3)' : '1px solid transparent',
        textDecoration: 'none',
        transition: 'all 0.2s',
      })}
      onMouseEnter={(e) => {
        if (!e.currentTarget.classList.contains('active')) {
          e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
        }
      }}
      onMouseLeave={(e) => {
        if (!e.currentTarget.classList.contains('active')) {
          e.currentTarget.style.background = 'transparent'
        }
      }}
    >
      <Icon size={18} />
      <span>{label}</span>
    </NavLink>
  )

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a1628 0%, #0d1f3c 100%)'
    }}>
      {/* Sidebar */}
      <div style={{
        width: 260,
        background: 'rgba(13,31,60,0.8)',
        backdropFilter: 'blur(20px)',
        borderRight: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
        height: '100vh'
      }}>
        {/* Logo */}
        <div style={{
          padding: '24px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #054E94, #1A8FFF)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Shield size={22} color="white" />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>
                Bisdom Admin
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>
                Management Panel
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <NavItem to="/admin/dashboard" icon={LayoutDashboard} label="Dashboard" />
          <NavItem to="/admin/requirements" icon={FileText} label="Requirements" />
          <NavItem to="/admin/users" icon={Users} label="Users" />
          <NavItem to="/admin/map" icon={Map} label="Supplier Map" />
        </div>

        {/* Logout */}
        <div style={{ padding: '16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 16px',
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 600,
              color: '#ef4444',
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.2)',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239,68,68,0.15)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{
        flex: 1,
        overflowY: 'auto'
      }}>
        <Outlet />
      </div>
    </div>
  )
}
