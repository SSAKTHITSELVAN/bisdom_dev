import { useWorkspaceStore } from '@/store/workspaceStore'
import StatusBadge from '@/components/ui/StatusBadge'
import {
  Bot, Package, TrendingDown, CheckCircle, AlertTriangle,
  ChevronRight, ThumbsUp
} from 'lucide-react'

function LeadRow({ lead, onClick }) {
  const needsInput = lead.ai_paused_for_buyer || lead.status === 'offer_ready'
  const isActive = ['agent_initiated', 'negotiating', 'renegotiating'].includes(lead.status)
  const isDone = ['deal_closed', 'not_selected', 'declined'].includes(lead.status)

  return (
    <button onClick={onClick}
      style={{
        width: '100%', textAlign: 'left', cursor: 'pointer',
        background: needsInput ? 'rgba(251,191,36,0.06)' : 'rgba(255,255,255,0.03)',
        border: needsInput ? '1px solid rgba(251,191,36,0.2)' : '1px solid rgba(255,255,255,0.07)',
        borderRadius: 12, padding: '12px 16px', marginBottom: 8,
        transition: 'all 0.15s', fontFamily: 'Inter,system-ui,sans-serif',
        opacity: isDone && lead.status !== 'deal_closed' ? 0.5 : 1,
      }}
      onMouseEnter={e => { if (!isDone) e.currentTarget.style.background = needsInput ? 'rgba(251,191,36,0.1)' : 'rgba(255,255,255,0.06)' }}
      onMouseLeave={e => { if (!isDone) e.currentTarget.style.background = needsInput ? 'rgba(251,191,36,0.06)' : 'rgba(255,255,255,0.03)' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          background: needsInput ? 'rgba(251,191,36,0.12)' : isActive ? 'rgba(96,165,250,0.12)' : 'rgba(255,255,255,0.06)',
          border: `1px solid ${needsInput ? 'rgba(251,191,36,0.25)' : isActive ? 'rgba(96,165,250,0.2)' : 'rgba(255,255,255,0.1)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          {needsInput ? <AlertTriangle size={15} color="#fbbf24"/>
            : lead.status === 'deal_closed' ? <CheckCircle size={15} color="#4ade80"/>
            : isActive ? <Bot size={15} color="#60a5fa"/>
            : <Package size={15} color="rgba(255,255,255,0.4)"/>}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {lead.supplier_info?.trade_name || `Supplier #${lead.supplier_id}`}
            </span>
            <StatusBadge status={lead.status}/>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>
            {lead.current_offer_price && (
              <span style={{ color: '#10b981', fontWeight: 700 }}>₹{lead.current_offer_price.toLocaleString()}/unit</span>
            )}
            {lead.current_lead_time && <span>{lead.current_lead_time}d delivery</span>}
            {lead.fit_score && <span>Fit {Math.round(lead.fit_score)}%</span>}
            {!lead.current_offer_price && !lead.fit_score && <span>Awaiting offer…</span>}
          </div>
        </div>

        {needsInput && (
          <div style={{ background: 'rgba(251,191,36,0.15)', borderRadius: 6, padding: '4px 8px', flexShrink: 0 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#fbbf24' }}>ACTION</span>
          </div>
        )}
        <ChevronRight size={14} color="rgba(255,255,255,0.2)" style={{ flexShrink: 0 }}/>
      </div>
    </button>
  )
}

export default function RequirementOverview({ req, leads = [] }) {
  const { goChat, goGeneralChat } = useWorkspaceStore()

  if (!req) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a1628' }}>
      <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>
        <Package size={36} style={{ margin: '0 auto 12px', opacity: 0.3 }}/>
        <p style={{ fontSize: 13 }}>Loading requirement…</p>
      </div>
    </div>
  )

  // Compute real stats from lead status
  const active = leads.filter(l => ['agent_initiated', 'negotiating', 'renegotiating', 'pending_supplier_approval'].includes(l.status))
  const needsAction = leads.filter(l => l.ai_paused_for_buyer || l.status === 'offer_ready')
  const closed = leads.filter(l => l.status === 'deal_closed')
  const withOffers = leads.filter(l => l.current_offer_price)
  const bestPrice = withOffers.length > 0 ? Math.min(...withOffers.map(l => l.current_offer_price)) : null

  // Sort: needs action first, then active, then closed, then rest
  const sorted = [...leads].sort((a, b) => {
    const priority = (l) => {
      if (l.ai_paused_for_buyer || l.status === 'offer_ready') return 0
      if (['agent_initiated', 'negotiating', 'renegotiating', 'pending_supplier_approval'].includes(l.status)) return 1
      if (l.status === 'awaiting_supplier_confirm') return 2
      if (l.status === 'deal_closed') return 3
      return 4
    }
    return priority(a) - priority(b)
  })

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#0a1628', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(96,165,250,0.12)', border: '1px solid rgba(96,165,250,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Package size={18} color="#60a5fa"/>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: '#fff', margin: '0 0 4px' }}>{req.product}</h2>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
              <span>{req.quantity} {req.quantity_unit || 'units'}</span>
              <span style={{ color: 'rgba(255,255,255,0.15)' }}>·</span>
              <span>{req.budget_max ? `Budget ₹${req.budget_max.toLocaleString()}` : 'Budget flexible'}</span>
              {req.delivery_location && <>
                <span style={{ color: 'rgba(255,255,255,0.15)' }}>·</span>
                <span>{req.delivery_location}</span>
              </>}
            </div>
          </div>
        </div>

        {/* Key metrics - what buyer cares about */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 14 }}>
          <div style={{ background: needsAction.length > 0 ? 'rgba(251,191,36,0.06)' : 'rgba(255,255,255,0.03)', border: `1px solid ${needsAction.length > 0 ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.06)'}`, borderRadius: 10, padding: '10px 12px' }}>
            <AlertTriangle size={13} color={needsAction.length > 0 ? '#fbbf24' : 'rgba(255,255,255,0.3)'} style={{ marginBottom: 4 }}/>
            <div style={{ fontSize: 18, fontWeight: 800, color: needsAction.length > 0 ? '#fbbf24' : '#fff' }}>{needsAction.length}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Need Action</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '10px 12px' }}>
            <Bot size={13} color="#60a5fa" style={{ marginBottom: 4 }}/>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>{active.length}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Negotiating</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '10px 12px' }}>
            <TrendingDown size={13} color={bestPrice ? '#10b981' : 'rgba(255,255,255,0.3)'} style={{ marginBottom: 4 }}/>
            <div style={{ fontSize: 18, fontWeight: 800, color: bestPrice ? '#10b981' : '#fff' }}>
              {bestPrice ? `₹${bestPrice.toLocaleString()}` : '—'}
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Best Price</div>
          </div>
          <div style={{ background: closed.length > 0 ? 'rgba(74,222,128,0.06)' : 'rgba(255,255,255,0.03)', border: `1px solid ${closed.length > 0 ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.06)'}`, borderRadius: 10, padding: '10px 12px' }}>
            <CheckCircle size={13} color={closed.length > 0 ? '#4ade80' : 'rgba(255,255,255,0.3)'} style={{ marginBottom: 4 }}/>
            <div style={{ fontSize: 18, fontWeight: 800, color: closed.length > 0 ? '#4ade80' : '#fff' }}>{closed.length}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Deals Closed</div>
          </div>
        </div>

        {/* Savings indicator if we have a deal */}
        {closed.length > 0 && req.budget_max && (() => {
          const dealLead = closed[0]
          const savings = dealLead.current_offer_price ? (req.budget_max - dealLead.current_offer_price) * req.quantity : 0
          if (savings > 0) return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 8, marginBottom: 14 }}>
              <ThumbsUp size={13} color="#10b981"/>
              <span style={{ fontSize: 12, color: '#10b981', fontWeight: 600 }}>
                You saved ₹{savings.toLocaleString()} vs budget ({Math.round((savings / (req.budget_max * req.quantity)) * 100)}% below)
              </span>
            </div>
          )
          return null
        })()}

        {/* Ask AI button */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
          <button onClick={() => goGeneralChat(req.id)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)', borderRadius: 8, cursor: 'pointer', fontFamily: 'Inter,system-ui,sans-serif', fontSize: 12, fontWeight: 600, color: '#60a5fa' }}>
            <Bot size={13}/> Ask AI
          </button>
        </div>
      </div>

      {/* Supplier list */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ padding: '16px 24px' }}>
            {leads.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 0', color: 'rgba(255,255,255,0.3)' }}>
                <Bot size={36} style={{ margin: '0 auto 12px', opacity: 0.3 }}/>
                <p style={{ fontSize: 13, marginBottom: 4 }}>Finding matching suppliers…</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>AI is searching for the best textile suppliers for this requirement</p>
              </div>
            ) : (
              <>
                {needsAction.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#fbbf24', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <AlertTriangle size={11}/> Needs Your Decision
                    </div>
                    {sorted.filter(l => l.ai_paused_for_buyer || l.status === 'offer_ready').map(lead => (
                      <LeadRow key={lead.id} lead={lead} onClick={() => goChat(req.id, lead.id)}/>
                    ))}
                  </div>
                )}

                {active.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>
                      AI Negotiating ({active.length})
                    </div>
                    {sorted.filter(l => ['agent_initiated', 'negotiating', 'renegotiating', 'pending_supplier_approval'].includes(l.status) && !l.ai_paused_for_buyer).map(lead => (
                      <LeadRow key={lead.id} lead={lead} onClick={() => goChat(req.id, lead.id)}/>
                    ))}
                  </div>
                )}

                {/* Awaiting supplier / other states */}
                {sorted.filter(l => l.status === 'awaiting_supplier_confirm').length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>
                      Awaiting Supplier
                    </div>
                    {sorted.filter(l => l.status === 'awaiting_supplier_confirm').map(lead => (
                      <LeadRow key={lead.id} lead={lead} onClick={() => goChat(req.id, lead.id)}/>
                    ))}
                  </div>
                )}

                {closed.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#4ade80', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <CheckCircle size={11}/> Deal Closed
                    </div>
                    {sorted.filter(l => l.status === 'deal_closed').map(lead => (
                      <LeadRow key={lead.id} lead={lead} onClick={() => goChat(req.id, lead.id)}/>
                    ))}
                  </div>
                )}

                {sorted.filter(l => ['not_selected', 'declined'].includes(l.status)).length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>
                      Inactive
                    </div>
                    {sorted.filter(l => ['not_selected', 'declined'].includes(l.status)).map(lead => (
                      <LeadRow key={lead.id} lead={lead} onClick={() => goChat(req.id, lead.id)}/>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
      </div>
    </div>
  )
}
