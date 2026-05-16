import { useNavigate, useLocation } from 'react-router-dom'
import { Home, MessageSquare, LayoutDashboard, User } from 'lucide-react'

const tabs = [
  { path: '/home',      icon: Home,            label: 'Home'      },
  { path: '/leads',     icon: MessageSquare,   label: 'Leads'     },
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/profile',   icon: User,            label: 'Profile'   },
]

export default function BottomNav() {
  const navigate  = useNavigate()
  const { pathname } = useLocation()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass-dark border-t border-white/10"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {tabs.map(({ path, icon: Icon, label }) => {
          const active = pathname.startsWith(path)
          return (
            <button key={path} onClick={() => navigate(path)}
              className="flex flex-col items-center gap-1 flex-1 py-2 transition-all"
              style={{ opacity: active ? 1 : 0.45 }}>
              <div className="relative">
                <Icon size={22} strokeWidth={active ? 2.5 : 1.8}
                  color={active ? '#60a5fa' : '#fff'} />
                {active && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-400" />
                )}
              </div>
              <span className="text-[10px] font-semibold tracking-wide"
                style={{ color: active ? '#60a5fa' : 'rgba(255,255,255,0.45)' }}>
                {label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
