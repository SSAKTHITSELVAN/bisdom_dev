import { useState, useEffect } from 'react'
import { getAllRequirements, getRequirementMatches } from '@/api/admin'
import { FileText, ChevronDown, ChevronUp, MapPin, DollarSign, Package, Calendar, Phone } from 'lucide-react'
import Spinner from '@/components/ui/Spinner'

export default function AdminRequirements() {
  const [requirements, setRequirements] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState(null)
  const [matches, setMatches] = useState({})
  const [loadingMatches, setLoadingMatches] = useState({})

  useEffect(() => {
    loadRequirements()
  }, [])

  const loadRequirements = async () => {
    try {
      const response = await getAllRequirements({ limit: 100 })
      setRequirements(response.data.requirements)
    } catch (error) {
      console.error('Failed to load requirements:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleExpand = async (reqId) => {
    if (expandedId === reqId) {
      setExpandedId(null)
      return
    }

    setExpandedId(reqId)

    if (!matches[reqId]) {
      setLoadingMatches({ ...loadingMatches, [reqId]: true })
      try {
        const response = await getRequirementMatches(reqId)
        setMatches({ ...matches, [reqId]: response.data })
      } catch (error) {
        console.error('Failed to load matches:', error)
      } finally {
        setLoadingMatches({ ...loadingMatches, [reqId]: false })
      }
    }
  }

  const StatusBadge = ({ status }) => {
    const colors = {
      'capturing': { bg: 'rgba(59,130,246,0.15)', text: '#60a5fa', border: 'rgba(59,130,246,0.3)' },
      'enriched': { bg: 'rgba(139,92,246,0.15)', text: '#a78bfa', border: 'rgba(139,92,246,0.3)' },
      'matching': { bg: 'rgba(245,158,11,0.15)', text: '#fbbf24', border: 'rgba(245,158,11,0.3)' },
      'matched': { bg: 'rgba(16,185,129,0.15)', text: '#34d399', border: 'rgba(16,185,129,0.3)' },
      'confirmed': { bg: 'rgba(20,184,166,0.15)', text: '#5eead4', border: 'rgba(20,184,166,0.3)' },
    }
    const color = colors[status] || colors['capturing']
    return (
      <span style={{
        padding: '4px 10px',
        borderRadius: 6,
        fontSize: 10,
        fontWeight: 700,
        background: color.bg,
        color: color.text,
        border: `1px solid ${color.border}`,
        textTransform: 'uppercase',
        letterSpacing: '0.05em'
      }}>
        {status}
      </span>
    )
  }

  const MatchScore = ({ score, aboveThreshold }) => {
    const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : score >= 20 ? '#60a5fa' : '#ef4444'
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8
      }}>
        <div style={{
          width: 40,
          height: 6,
          background: 'rgba(255,255,255,0.1)',
          borderRadius: 3,
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${score}%`,
            height: '100%',
            background: color,
            transition: 'width 0.3s'
          }} />
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, color }}>
          {score.toFixed(1)}%
        </span>
        {aboveThreshold && (
          <span style={{
            fontSize: 9,
            fontWeight: 700,
            color: '#10b981',
            background: 'rgba(16,185,129,0.15)',
            border: '1px solid rgba(16,185,129,0.3)',
            padding: '2px 6px',
            borderRadius: 4,
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            ✓ Match
          </span>
        )}
      </div>
    )
  }

  return (
    <div style={{ padding: '24px 32px' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#fff', marginBottom: 8 }}>
          Posted Requirements
        </h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
          All buyer requirements with matching suppliers
        </p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <Spinner size={32} color="rgba(255,255,255,0.4)" />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {requirements.map((req) => {
            const isExpanded = expandedId === req.id
            const reqMatches = matches[req.id]

            return (
              <div key={req.id} style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 16,
                overflow: 'hidden',
                transition: 'all 0.2s'
              }}>
                {/* Requirement Header */}
                <div
                  onClick={() => toggleExpand(req.id)}
                  style={{
                    padding: 20,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: 'rgba(59,130,246,0.15)',
                    border: '1px solid rgba(59,130,246,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <FileText size={22} color="#60a5fa" />
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                      <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: 0 }}>
                        {req.product}
                      </h3>
                      <StatusBadge status={req.enrichment_status} />
                      {req.leads_count > 0 && (
                        <span style={{
                          fontSize: 11,
                          color: 'rgba(255,255,255,0.5)',
                          background: 'rgba(255,255,255,0.05)',
                          padding: '4px 8px',
                          borderRadius: 6
                        }}>
                          {req.leads_count} {req.leads_count === 1 ? 'match' : 'matches'}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Package size={14} />
                        <span>{req.quantity} {req.quantity_unit || 'units'}</span>
                      </div>
                      {req.budget_max && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <DollarSign size={14} />
                          <span>₹{req.budget_max.toLocaleString()}</span>
                        </div>
                      )}
                      {req.delivery_location && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <MapPin size={14} />
                          <span>{req.delivery_location}</span>
                        </div>
                      )}
                      {req.buyer_phone && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Phone size={14} />
                          <span>{req.buyer_phone}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: 'rgba(255,255,255,0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {isExpanded ? <ChevronUp size={18} color="rgba(255,255,255,0.5)" /> : <ChevronDown size={18} color="rgba(255,255,255,0.5)" />}
                  </div>
                </div>

                {/* Matches Table */}
                {isExpanded && (
                  <div style={{
                    borderTop: '1px solid rgba(255,255,255,0.08)',
                    padding: 20,
                    background: 'rgba(0,0,0,0.2)'
                  }}>
                    {loadingMatches[req.id] ? (
                      <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                        <Spinner size={24} color="rgba(255,255,255,0.4)" />
                      </div>
                    ) : reqMatches && reqMatches.matches.length > 0 ? (
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Supplier</th>
                              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Location</th>
                              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Match Score</th>
                              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reliability</th>
                              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Offer</th>
                              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Round</th>
                            </tr>
                          </thead>
                          <tbody>
                            {reqMatches.matches.map((match, idx) => (
                              <tr key={match.lead_id} style={{
                                borderBottom: idx < reqMatches.matches.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none'
                              }}>
                                <td style={{ padding: '16px', fontSize: 13, color: '#fff' }}>
                                  <div style={{ fontWeight: 600 }}>{match.supplier_name}</div>
                                  {match.supplier_phone && (
                                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                                      {match.supplier_phone}
                                    </div>
                                  )}
                                </td>
                                <td style={{ padding: '16px', fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
                                  {match.location || '—'}
                                </td>
                                <td style={{ padding: '16px' }}>
                                  <MatchScore score={match.fit_score || 0} aboveThreshold={match.fit_score >= 20} />
                                </td>
                                <td style={{ padding: '16px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <div style={{ fontSize: 14, fontWeight: 700, color: '#fbbf24' }}>
                                      {match.reliability_score}
                                    </div>
                                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>/100</span>
                                  </div>
                                </td>
                                <td style={{ padding: '16px' }}>
                                  <span style={{
                                    padding: '4px 8px',
                                    borderRadius: 6,
                                    fontSize: 11,
                                    fontWeight: 600,
                                    background: 'rgba(59,130,246,0.15)',
                                    color: '#60a5fa',
                                    textTransform: 'capitalize'
                                  }}>
                                    {match.status.replace(/_/g, ' ')}
                                  </span>
                                </td>
                                <td style={{ padding: '16px', fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
                                  {match.current_offer_price ? `₹${match.current_offer_price}` : '—'}
                                </td>
                                <td style={{ padding: '16px', fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
                                  {match.negotiation_round || 0}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: 40 }}>
                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
                          No matches found for this requirement
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
