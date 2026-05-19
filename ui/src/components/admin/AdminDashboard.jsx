import { useState, useEffect } from 'react'
import { getAdminStats } from '@/api/admin'
import { Users, FileText, TrendingUp, CheckCircle, Activity, Sparkles, Building2, ShoppingCart } from 'lucide-react'
import Spinner from '@/components/ui/Spinner'

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const response = await getAdminStats()
      setStats(response.data)
    } catch (error) {
      console.error('Failed to load stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const StatCard = ({ icon: Icon, label, value, color = '#60a5fa', sublabel }) => (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 16,
      padding: 20,
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      transition: 'all 0.2s'
    }}
    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
    >
      <div style={{
        width: 56,
        height: 56,
        borderRadius: 14,
        background: `${color}15`,
        border: `1px solid ${color}30`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0
      }}>
        <Icon size={28} color={color} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 600, marginBottom: 4 }}>
          {label}
        </div>
        <div style={{ fontSize: 28, fontWeight: 800, color: '#fff', lineHeight: 1 }}>
          {value?.toLocaleString() || 0}
        </div>
        {sublabel && (
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
            {sublabel}
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div style={{ padding: '24px 32px' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#fff', marginBottom: 8 }}>
          Dashboard Overview
        </h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
          Real-time platform statistics and metrics
        </p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <Spinner size={32} color="rgba(255,255,255,0.4)" />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          <StatCard
            icon={Users}
            label="Total Users"
            value={stats?.total_users}
            color="#60a5fa"
          />

          <StatCard
            icon={Building2}
            label="Total Suppliers"
            value={stats?.total_suppliers}
            color="#10b981"
          />

          <StatCard
            icon={ShoppingCart}
            label="Total Buyers"
            value={stats?.total_buyers}
            color="#f59e0b"
          />

          <StatCard
            icon={FileText}
            label="Total Requirements"
            value={stats?.total_requirements}
            sublabel={`${stats?.active_requirements || 0} active`}
            color="#8b5cf6"
          />

          <StatCard
            icon={TrendingUp}
            label="Total Leads"
            value={stats?.total_leads}
            sublabel={`${stats?.active_negotiations || 0} negotiating`}
            color="#ec4899"
          />

          <StatCard
            icon={CheckCircle}
            label="Completed Deals"
            value={stats?.total_deals}
            color="#14b8a6"
          />

          <StatCard
            icon={Activity}
            label="Active Negotiations"
            value={stats?.active_negotiations}
            color="#f97316"
          />

          <StatCard
            icon={Sparkles}
            label="Recent Requirements"
            value={stats?.recent_requirements}
            sublabel="Last 7 days"
            color="#a855f7"
          />
        </div>
      )}

      {/* System Health */}
      {!loading && stats && (
        <div style={{
          marginTop: 32,
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 16,
          padding: 24
        }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 16 }}>
            System Health
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>
                Active Rate
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#10b981' }}>
                {stats.total_requirements > 0
                  ? `${Math.round((stats.active_requirements / stats.total_requirements) * 100)}%`
                  : '0%'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>
                Avg. Matches per Requirement
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#60a5fa' }}>
                {stats.total_requirements > 0
                  ? (stats.total_leads / stats.total_requirements).toFixed(1)
                  : '0'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>
                Conversion Rate
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#f59e0b' }}>
                {stats.total_leads > 0
                  ? `${Math.round((stats.total_deals / stats.total_leads) * 100)}%`
                  : '0%'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>
                Supplier/Buyer Ratio
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#8b5cf6' }}>
                {stats.total_buyers > 0
                  ? (stats.total_suppliers / stats.total_buyers).toFixed(1)
                  : '0'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
