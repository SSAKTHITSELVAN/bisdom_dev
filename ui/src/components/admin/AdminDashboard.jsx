import { useState, useEffect } from 'react'
import { getAdminStats, getGrowthData } from '@/api/admin'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import { Users, FileText, TrendingUp, CheckCircle, Activity, Sparkles, Building2, ShoppingCart } from 'lucide-react'
import Spinner from '@/components/ui/Spinner'

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [growthData, setGrowthData] = useState(null)
  const [loading, setLoading] = useState(true)
  const { handleAuthError } = useAdminAuth()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [statsResponse, growthResponse] = await Promise.all([
        getAdminStats(),
        getGrowthData()
      ])
      setStats(statsResponse.data)
      setGrowthData(growthResponse.data)
    } catch (error) {
      console.error('Failed to load data:', error)
      handleAuthError(error)
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

  const LineChart = ({ data, dates, label, color, height = 200 }) => {
    if (!data || data.length === 0) return null

    const max = Math.max(...data, 1)
    const points = data.map((val, idx) => ({
      x: (idx / (data.length - 1)) * 100,
      y: 100 - (val / max) * 100
    }))

    const pathData = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
      .join(' ')

    const areaData = `${pathData} L 100 100 L 0 100 Z`

    return (
      <div style={{ width: '100%', height }}>
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={{ width: '100%', height: '100%' }}
        >
          {/* Area fill */}
          <path
            d={areaData}
            fill={`${color}20`}
            strokeWidth="0"
          />
          {/* Line */}
          <path
            d={pathData}
            fill="none"
            stroke={color}
            strokeWidth="0.5"
            vectorEffect="non-scaling-stroke"
          />
          {/* Points */}
          {points.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r="1"
              fill={color}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
      </div>
    )
  }

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
            label="Total Registered Users"
            value={stats?.total_users}
            sublabel={`${stats?.users_with_profiles || 0} with complete profiles`}
            color="#60a5fa"
          />

          <StatCard
            icon={ShoppingCart}
            label="Posted Requirements"
            value={stats?.users_posted_requirements}
            sublabel="Users who acted as buyers"
            color="#f59e0b"
          />

          <StatCard
            icon={Building2}
            label="Received Leads"
            value={stats?.users_received_leads}
            sublabel="Users who acted as suppliers"
            color="#10b981"
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

      {/* Growth Charts */}
      {!loading && growthData && (
        <div style={{
          marginTop: 32,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: 20
        }}>
          {/* User Growth Chart */}
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 16,
            padding: 24
          }}>
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: 'rgba(96,165,250,0.15)',
                  border: '1px solid rgba(96,165,250,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Users size={20} color="#60a5fa" />
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: 0 }}>
                    User Growth
                  </h3>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', margin: 0 }}>
                    Cumulative registrations over last 30 days
                  </p>
                </div>
              </div>
            </div>
            <LineChart
              data={growthData.user_growth}
              dates={growthData.dates}
              label="Users"
              color="#60a5fa"
              height={200}
            />
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: 16,
              fontSize: 11,
              color: 'rgba(255,255,255,0.4)'
            }}>
              <span>{growthData.dates[0]}</span>
              <span>Total: {growthData.user_growth[growthData.user_growth.length - 1]}</span>
              <span>{growthData.dates[growthData.dates.length - 1]}</span>
            </div>
          </div>

          {/* Requirements Posted Chart */}
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 16,
            padding: 24
          }}>
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: 'rgba(139,92,246,0.15)',
                  border: '1px solid rgba(139,92,246,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <FileText size={20} color="#8b5cf6" />
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: 0 }}>
                    Requirements Posted
                  </h3>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', margin: 0 }}>
                    Daily requirement posting activity
                  </p>
                </div>
              </div>
            </div>
            <LineChart
              data={growthData.requirements_posted}
              dates={growthData.dates}
              label="Requirements"
              color="#8b5cf6"
              height={200}
            />
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: 16,
              fontSize: 11,
              color: 'rgba(255,255,255,0.4)'
            }}>
              <span>{growthData.dates[0]}</span>
              <span>Total: {growthData.requirements_posted.reduce((a, b) => a + b, 0)}</span>
              <span>{growthData.dates[growthData.dates.length - 1]}</span>
            </div>
          </div>
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
                Profile Completion Rate
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#10b981' }}>
                {stats.total_users > 0
                  ? `${Math.round((stats.users_with_profiles / stats.total_users) * 100)}%`
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
                Lead → Deal Conversion
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#f59e0b' }}>
                {stats.total_leads > 0
                  ? `${Math.round((stats.total_deals / stats.total_leads) * 100)}%`
                  : '0%'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>
                Active Requirement Rate
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#8b5cf6' }}>
                {stats.total_requirements > 0
                  ? `${Math.round((stats.active_requirements / stats.total_requirements) * 100)}%`
                  : '0%'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
