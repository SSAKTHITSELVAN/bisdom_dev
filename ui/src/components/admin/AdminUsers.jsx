import { useState, useEffect } from 'react'
import { getAllUsers } from '@/api/admin'
import { Users, Phone, Building2, MapPin, Star, FileText, TrendingUp, Filter } from 'lucide-react'
import Spinner from '@/components/ui/Spinner'

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // 'all', 'buyer', 'supplier'

  useEffect(() => {
    loadUsers()
  }, [filter])

  const loadUsers = async () => {
    setLoading(true)
    try {
      const params = filter !== 'all' ? { role: filter } : {}
      const response = await getAllUsers(params)
      setUsers(response.data.users)
    } catch (error) {
      console.error('Failed to load users:', error)
    } finally {
      setLoading(false)
    }
  }

  const FilterButton = ({ value, label, count }) => (
    <button
      onClick={() => setFilter(value)}
      style={{
        padding: '10px 20px',
        borderRadius: 10,
        fontSize: 13,
        fontWeight: 600,
        background: filter === value ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.05)',
        color: filter === value ? '#60a5fa' : 'rgba(255,255,255,0.6)',
        border: filter === value ? '1px solid rgba(59,130,246,0.4)' : '1px solid rgba(255,255,255,0.08)',
        cursor: 'pointer',
        transition: 'all 0.2s',
        display: 'flex',
        alignItems: 'center',
        gap: 8
      }}
    >
      {label}
      {count !== undefined && (
        <span style={{
          padding: '2px 8px',
          borderRadius: 6,
          fontSize: 11,
          fontWeight: 700,
          background: filter === value ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.1)'
        }}>
          {count}
        </span>
      )}
    </button>
  )

  const RoleBadge = ({ isSupplier, isBuyer }) => {
    if (isSupplier && isBuyer) {
      return (
        <div style={{ display: 'flex', gap: 4 }}>
          <span style={{
            padding: '3px 8px',
            borderRadius: 6,
            fontSize: 10,
            fontWeight: 700,
            background: 'rgba(16,185,129,0.15)',
            color: '#34d399',
            border: '1px solid rgba(16,185,129,0.3)'
          }}>SUPPLIER</span>
          <span style={{
            padding: '3px 8px',
            borderRadius: 6,
            fontSize: 10,
            fontWeight: 700,
            background: 'rgba(245,158,11,0.15)',
            color: '#fbbf24',
            border: '1px solid rgba(245,158,11,0.3)'
          }}>BUYER</span>
        </div>
      )
    }
    if (isSupplier) {
      return (
        <span style={{
          padding: '3px 8px',
          borderRadius: 6,
          fontSize: 10,
          fontWeight: 700,
          background: 'rgba(16,185,129,0.15)',
          color: '#34d399',
          border: '1px solid rgba(16,185,129,0.3)'
        }}>SUPPLIER</span>
      )
    }
    if (isBuyer) {
      return (
        <span style={{
          padding: '3px 8px',
          borderRadius: 6,
          fontSize: 10,
          fontWeight: 700,
          background: 'rgba(245,158,11,0.15)',
          color: '#fbbf24',
          border: '1px solid rgba(245,158,11,0.3)'
        }}>BUYER</span>
      )
    }
    return null
  }

  return (
    <div style={{ padding: '24px 32px' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#fff', marginBottom: 8 }}>
          Platform Users
        </h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
          All registered users, buyers, and suppliers
        </p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Filter size={16} color="rgba(255,255,255,0.5)" />
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>Filter:</span>
        </div>
        <FilterButton value="all" label="All Users" />
        <FilterButton value="supplier" label="Suppliers" />
        <FilterButton value="buyer" label="Buyers" />
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <Spinner size={32} color="rgba(255,255,255,0.4)" />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
          {users.map((user) => (
            <div key={user.id} style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 16,
              padding: 20,
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
            >
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: user.profile?.is_supplier ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                  border: user.profile?.is_supplier ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(245,158,11,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Users size={22} color={user.profile?.is_supplier ? '#34d399' : '#fbbf24'} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: 0 }}>
                      {user.profile?.trade_name || `User #${user.id}`}
                    </h3>
                  </div>
                  {user.profile && (
                    <RoleBadge isSupplier={user.profile.is_supplier} isBuyer={user.profile.is_buyer} />
                  )}
                </div>
              </div>

              {/* Details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Phone size={14} color="rgba(255,255,255,0.4)" />
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>
                    {user.phone_number}
                  </span>
                </div>

                {user.profile?.gstin && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Building2 size={14} color="rgba(255,255,255,0.4)" />
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontFamily: 'monospace' }}>
                      {user.profile.gstin}
                    </span>
                  </div>
                )}

                {user.profile?.city && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <MapPin size={14} color="rgba(255,255,255,0.4)" />
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>
                      {user.profile.city}, {user.profile.state}
                    </span>
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Star size={14} color="rgba(255,255,255,0.4)" />
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>
                    Reliability: {user.profile?.reliability_score || 0}/100
                  </span>
                </div>
              </div>

              {/* Stats */}
              <div style={{
                marginTop: 16,
                paddingTop: 16,
                borderTop: '1px solid rgba(255,255,255,0.06)',
                display: 'flex',
                gap: 16
              }}>
                {user.profile?.is_buyer && (
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <FileText size={12} color="rgba(255,255,255,0.4)" />
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>
                        Requirements
                      </span>
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>
                      {user.requirements_count || 0}
                    </div>
                  </div>
                )}

                {user.profile?.is_supplier && (
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <TrendingUp size={12} color="rgba(255,255,255,0.4)" />
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>
                        Leads
                      </span>
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>
                      {user.leads_count || 0}
                    </div>
                  </div>
                )}

                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginBottom: 4 }}>
                    Status
                  </div>
                  <span style={{
                    padding: '3px 8px',
                    borderRadius: 6,
                    fontSize: 10,
                    fontWeight: 700,
                    background: user.is_onboarded ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                    color: user.is_onboarded ? '#34d399' : '#f87171',
                    border: user.is_onboarded ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(239,68,68,0.3)',
                    textTransform: 'uppercase'
                  }}>
                    {user.is_onboarded ? 'Active' : 'Pending'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && users.length === 0 && (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>
            No users found
          </p>
        </div>
      )}
    </div>
  )
}
