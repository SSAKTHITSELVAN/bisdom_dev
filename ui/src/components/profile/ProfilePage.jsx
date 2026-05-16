import { useState, useEffect } from 'react'
import { getDashboard } from '../../api/dashboard'
import { useAuthStore } from '../../store/authStore'
import PageLayout from '../ui/PageLayout'
import Spinner from '../ui/Spinner'
import { User, Building2, MapPin, Star, Package, Award, LogOut } from 'lucide-react'

export default function ProfilePage() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const { logout, user } = useAuthStore()

  useEffect(() => {
    getDashboard()
      .then(r => setProfile(r.data.profile))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleLogout = () => {
    logout()
    window.location.href = '/login'
  }

  return (
    <PageLayout title="Profile">
      {loading && (
        <div className="flex justify-center py-16">
          <Spinner size={28} color="rgba(255,255,255,0.4)" />
        </div>
      )}

      {!loading && (
        <div className="space-y-4 animate-slide-up">
          {/* Business card */}
          <div className="glass rounded-3xl p-6 text-center">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500/40 to-blue-700/40 flex items-center justify-center mx-auto mb-4 border border-blue-400/20">
              <span className="text-3xl font-black text-blue-300">
                {(profile?.trade_name || 'B').charAt(0)}
              </span>
            </div>
            <h2 className="text-xl font-bold text-white">{profile?.trade_name || '—'}</h2>
            <div className="flex items-center justify-center gap-3 mt-2">
              {profile?.is_buyer && <span className="badge badge-blue">Buyer</span>}
              {profile?.is_supplier && <span className="badge badge-green">Supplier</span>}
              <span className={`badge ${profile?.status === 'complete' ? 'badge-green' : 'badge-amber'}`}>
                {profile?.status === 'complete' ? 'Profile Complete' : 'Building…'}
              </span>
            </div>
          </div>

          {/* Business summary */}
          {profile?.business_summary && (
            <div className="glass rounded-2xl p-4">
              <p className="text-xs text-white/40 font-semibold uppercase tracking-wider mb-2">About</p>
              <p className="text-sm text-white/75 leading-relaxed">{profile.business_summary}</p>
            </div>
          )}

          {/* Product categories */}
          {profile?.product_categories?.length > 0 && (
            <div className="glass rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Package size={16} className="text-blue-400" />
                <p className="text-xs text-white/40 font-semibold uppercase tracking-wider">Products</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {profile.product_categories.map((c, i) => (
                  <span key={i} className="badge badge-blue">{c}</span>
                ))}
              </div>
            </div>
          )}

          {/* Reliability score */}
          <div className="glass rounded-2xl p-4 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-yellow-500/20 flex items-center justify-center shrink-0">
              <Star size={24} className="text-yellow-400" />
            </div>
            <div>
              <p className="text-xs text-white/40 font-semibold uppercase tracking-wider">Reliability Score</p>
              <p className="text-2xl font-bold text-white mt-0.5">{profile?.reliability_score || 0}<span className="text-sm text-white/40">/100</span></p>
            </div>
          </div>

          {/* Agent config info */}
          <div className="glass rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Award size={16} className="text-purple-400" />
              <p className="text-xs text-white/40 font-semibold uppercase tracking-wider">AI Agent</p>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex justify-between">
                <span className="text-xs text-white/50">Negotiation Style</span>
                <span className="text-xs font-semibold text-white capitalize">Balanced</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-white/50">Max Rounds</span>
                <span className="text-xs font-semibold text-white">5</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-white/50">Auto-Accept Score</span>
                <span className="text-xs font-semibold text-white">80+</span>
              </div>
            </div>
          </div>

          {/* Logout */}
          <button onClick={handleLogout}
            className="w-full glass rounded-2xl p-4 flex items-center justify-center gap-3 hover:bg-red-500/10 border border-red-500/0 hover:border-red-500/20 transition-all">
            <LogOut size={18} className="text-red-400" />
            <span className="text-sm font-semibold text-red-400">Sign Out</span>
          </button>

          <div className="text-center pb-4">
            <p className="text-xs text-white/20">Bisdom v1.0 · AI Commerce Engine</p>
          </div>
        </div>
      )}
    </PageLayout>
  )
}
