import { useState, useEffect } from 'react'
import { getAdminStats, getGrowthData } from '@/api/admin'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import { Users, FileText, TrendingUp, CheckCircle, Activity, Sparkles, Building2, ShoppingCart } from 'lucide-react'
import Spinner from '@/components/ui/Spinner'

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [growthData, setGrowthData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('month')
  const [loadingGrowth, setLoadingGrowth] = useState(false)
  const { handleAuthError } = useAdminAuth()

  useEffect(() => {
    loadStats()
  }, [])

  useEffect(() => {
    loadGrowthData()
  }, [period])

  const loadStats = async () => {
    try {
      const statsResponse = await getAdminStats()
      setStats(statsResponse.data)
    } catch (error) {
      console.error('Failed to load stats:', error)
      handleAuthError(error)
    } finally {
      setLoading(false)
    }
  }

  const loadGrowthData = async () => {
    setLoadingGrowth(true)
    try {
      const growthResponse = await getGrowthData({ period })
      setGrowthData(growthResponse.data)
    } catch (error) {
      console.error('Failed to load growth data:', error)
    } finally {
      setLoadingGrowth(false)
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

  const BarChart = ({ data, labels, color, height = 240 }) => {
    if (!data || data.length === 0) return null

    const max = Math.max(...data, 1)
    const barCount = data.length
    const showAllLabels = barCount <= 14  // Show all labels only if 14 or fewer bars

    return (
      <div style={{ width: '100%', position: 'relative' }}>
        {/* Chart area with horizontal scroll for year view */}
        <div style={{
          width: '100%',
          overflowX: barCount > 90 ? 'auto' : 'visible',
          overflowY: 'visible'
        }}>
          <div style={{
            width: barCount > 90 ? `${barCount * 8}px` : '100%',  // Fixed width for year view
            minWidth: '100%',
            height,
            display: 'flex',
            alignItems: 'flex-end',
            gap: barCount > 90 ? '2px' : barCount > 30 ? '1px' : '4px',
            padding: '0 8px'
          }}>
          {data.map((value, idx) => {
            const barHeight = max > 0 ? (value / max) * 100 : 0
            return (
              <div
                key={idx}
                style={{
                  flex: 1,
                  height: `${barHeight}%`,
                  minHeight: value > 0 ? '2px' : '0',
                  background: value > 0 ? color : 'rgba(255,255,255,0.05)',
                  borderRadius: barCount > 30 ? '1px' : '3px 3px 0 0',
                  position: 'relative',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '0.7'
                  e.currentTarget.style.transform = 'scaleY(1.05)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '1'
                  e.currentTarget.style.transform = 'scaleY(1)'
                }}
                title={`${labels[idx]}: ${value}`}
              >
                {/* Show value on top of bar if significant */}
                {value > 0 && barCount <= 30 && (
                  <div style={{
                    position: 'absolute',
                    top: -20,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    fontSize: 10,
                    fontWeight: 700,
                    color: color,
                    whiteSpace: 'nowrap'
                  }}>
                    {value}
                  </div>
                )}
              </div>
            )
          })}
        </div>

          </div>
        </div>

        {/* X-axis labels */}
        <div style={{
          width: '100%',
          overflowX: barCount > 90 ? 'auto' : 'visible'
        }}>
          <div style={{
            width: barCount > 90 ? `${barCount * 8}px` : '100%',
            minWidth: '100%',
            display: 'flex',
            marginTop: 8,
            padding: '0 8px',
            gap: barCount > 90 ? '2px' : barCount > 30 ? '1px' : '4px'
          }}>
          {labels.map((label, idx) => {
            // Show label based on period and position
            const showLabel = showAllLabels ||
                            (barCount > 14 && barCount <= 30 && idx % 2 === 0) ||
                            (barCount > 30 && barCount <= 90 && idx % 5 === 0) ||
                            (barCount > 90 && idx % 30 === 0) ||
                            idx === 0 ||
                            idx === labels.length - 1

            return (
              <div
                key={idx}
                style={{
                  flex: 1,
                  fontSize: 9,
                  color: 'rgba(255,255,255,0.4)',
                  textAlign: 'center',
                  visibility: showLabel ? 'visible' : 'hidden'
                }}
              >
                {label}
              </div>
            )
          })}
          </div>
        </div>

        {/* Y-axis reference line */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          pointerEvents: 'none',
          padding: '0 8px'
        }}>
          {[...Array(5)].map((_, i) => (
            <div key={i} style={{
              borderTop: i > 0 ? '1px dashed rgba(255,255,255,0.05)' : 'none',
              position: 'relative'
            }}>
              {i > 0 && (
                <span style={{
                  position: 'absolute',
                  left: -24,
                  top: -8,
                  fontSize: 9,
                  color: 'rgba(255,255,255,0.3)'
                }}>
                  {Math.round(max * (5 - i) / 5)}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  const PeriodFilter = ({ value, onChange }) => {
    const periods = [
      { value: 'week', label: 'Last Week', days: 7 },
      { value: 'month', label: 'Last Month', days: 30 },
      { value: 'year', label: 'Last Year', days: 365 }
    ]

    return (
      <div style={{ display: 'flex', gap: 8 }}>
        {periods.map(p => (
          <button
            key={p.value}
            onClick={() => onChange(p.value)}
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              fontSize: 11,
              fontWeight: 600,
              background: value === p.value ? 'rgba(96,165,250,0.2)' : 'rgba(255,255,255,0.05)',
              color: value === p.value ? '#60a5fa' : 'rgba(255,255,255,0.5)',
              border: value === p.value ? '1px solid rgba(96,165,250,0.4)' : '1px solid rgba(255,255,255,0.08)',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => {
              if (value !== p.value) {
                e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
              }
            }}
            onMouseLeave={e => {
              if (value !== p.value) {
                e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
              }
            }}
          >
            {p.label}
          </button>
        ))}
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
      {!loading && (
        <div style={{ marginTop: 32 }}>
          {/* Filter Bar */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20
          }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#fff', margin: 0, marginBottom: 4 }}>
                Growth Analytics
              </h2>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', margin: 0 }}>
                Track user registrations and requirement posting trends
              </p>
            </div>
            <PeriodFilter value={period} onChange={setPeriod} />
          </div>

          {loadingGrowth ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
              <Spinner size={24} color="rgba(255,255,255,0.4)" />
            </div>
          ) : growthData && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
              gap: 20
            }}>
              {/* User Registrations Chart */}
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 16,
                padding: 24
              }}>
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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
                          User Registrations
                        </h3>
                        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', margin: 0 }}>
                          Daily new user sign-ups
                        </p>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 24, fontWeight: 800, color: '#60a5fa' }}>
                        {growthData.total_users}
                      </div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>
                        Total in period
                      </div>
                    </div>
                  </div>
                </div>
                <BarChart
                  data={growthData.user_registrations}
                  labels={growthData.date_labels}
                  color="#60a5fa"
                  height={240}
                />
              </div>

              {/* Requirements Posted Chart */}
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 16,
                padding: 24
              }}>
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 24, fontWeight: 800, color: '#8b5cf6' }}>
                        {growthData.total_requirements}
                      </div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>
                        Total in period
                      </div>
                    </div>
                  </div>
                </div>
                <BarChart
                  data={growthData.requirements_posted}
                  labels={growthData.date_labels}
                  color="#8b5cf6"
                  height={240}
                />
              </div>
            </div>
          )}
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
