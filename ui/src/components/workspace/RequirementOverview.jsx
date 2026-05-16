import { useState } from 'react'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { setExpiry, expireReq } from '@/api/expiry'
import StatusBadge from '@/components/ui/StatusBadge'
import toast from 'react-hot-toast'
import { Bot, Package, TrendingUp, CheckCircle, AlertTriangle, Clock, XCircle } from 'lucide-react'

function LeadCard({ lead, onClick }) {
  const needsInput = lead.ai_paused_for_buyer
  const isActive   = ['agent_initiated','negotiating','renegotiating'].includes(lead.status)

  return (
    <button onClick={onClick}
      style={{
        width:'100%', textAlign:'left', cursor:'pointer',
        background: needsInput ? 'rgba(251,191,36,0.07)' : 'rgba(255,255,255,0.04)',
        border: needsInput ? '1px solid rgba(251,191,36,0.25)' : '1px solid rgba(255,255,255,0.08)',
        borderRadius:12, padding:'14px 16px', marginBottom:10,
        transition:'all 0.2s', fontFamily:'Montserrat,sans-serif'
      }}
      onMouseEnter={e => e.currentTarget.style.background = needsInput ? 'rgba(251,191,36,0.12)' : 'rgba(255,255,255,0.08)'}
      onMouseLeave={e => e.currentTarget.style.background = needsInput ? 'rgba(251,191,36,0.07)' : 'rgba(255,255,255,0.04)'}
    >
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:32, height:32, borderRadius:9, background: isActive ? 'rgba(96,165,250,0.2)' : 'rgba(255,255,255,0.08)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Bot size={15} color={isActive ? '#60a5fa' : 'rgba(255,255,255,0.4)'}/>
          </div>
          <div>
            <div style={{ fontSize:13, fontWeight:600, color:'#fff' }}>Seller Agent #{lead.supplier_id}</div>
            <div style={{ fontSize:10, color:'rgba(255,255,255,0.35)', marginTop:1 }}>Round {lead.negotiation_round || 0}{lead.max_negotiation_rounds && lead.max_negotiation_rounds < 900 ? `/${lead.max_negotiation_rounds}` : ''}</div>
          </div>
        </div>
        <StatusBadge status={lead.status}/>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
        {[
          { label:'Best Offer', value: lead.current_offer_price ? `₹${lead.current_offer_price.toLocaleString()}` : '—' },
          { label:'Lead Time',  value: lead.current_lead_time ? `${lead.current_lead_time}d` : '—' },
          { label:'Fit Score',  value: lead.fit_score ? `${lead.fit_score.toFixed(0)}%` : '—' },
        ].map(({ label, value }) => (
          <div key={label} style={{ background:'rgba(255,255,255,0.05)', borderRadius:8, padding:'8px 10px' }}>
            <div style={{ fontSize:10, color:'rgba(255,255,255,0.4)', marginBottom:3 }}>{label}</div>
            <div style={{ fontSize:13, fontWeight:700, color:'#fff' }}>{value}</div>
          </div>
        ))}
      </div>

      {needsInput && (
        <div style={{ marginTop:10, display:'flex', alignItems:'center', gap:6, background:'rgba(251,191,36,0.1)', borderRadius:8, padding:'7px 10px' }}>
          <AlertTriangle size={13} color="#fbbf24"/>
          <span style={{ fontSize:11, color:'#fbbf24', fontWeight:600 }}>Your decision needed — tap to review</span>
        </div>
      )}
      {lead.status === 'deal_closed' && (
        <div style={{ marginTop:10, display:'flex', alignItems:'center', gap:6, background:'rgba(74,222,128,0.1)', borderRadius:8, padding:'7px 10px' }}>
          <CheckCircle size={13} color="#4ade80"/>
          <span style={{ fontSize:11, color:'#4ade80', fontWeight:600 }}>Deal closed at ₹{lead.final_price?.toLocaleString()}/unit</span>
        </div>
      )}
    </button>
  )
}

export default function RequirementOverview({ req, leads = [] }) {
  const { goChat, goGeneralChat } = useWorkspaceStore()
  const [showExpiry, setShowExpiry] = useState(false)
  const [expiryDate, setExpiryDate] = useState(
    req?.expires_at ? new Date(req.expires_at).toISOString().split('T')[0] : ''
  )

  if (!req) return (
    <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', background:'#0a1628' }}>
      <div style={{ textAlign:'center', color:'rgba(255,255,255,0.3)' }}>
        <Package size={36} style={{ margin:'0 auto 12px', opacity:0.3 }}/>
        <p style={{ fontSize:13 }}>Loading requirement…</p>
      </div>
    </div>
  )

  const active   = leads.filter(l => ['agent_initiated','negotiating','renegotiating'].includes(l.status))
  const needsYou = leads.filter(l => l.ai_paused_for_buyer)
  const closed   = leads.filter(l => l.status === 'deal_closed')

  const handleSetExpiry = async () => {
    try {
      await setExpiry({ requirement_id: req.id, expires_at: expiryDate ? new Date(expiryDate).toISOString() : null })
      toast.success('Expiry set')
      setShowExpiry(false)
    } catch { toast.error('Failed to set expiry') }
  }

  const handleClose = async () => {
    try {
      await expireReq(req.id)
      toast.success('Requirement closed')
    } catch { toast.error('Failed') }
  }

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', background:'#0a1628', overflow:'hidden' }}>
      {/* Header */}
      <div style={{ padding:'24px 32px 20px', borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ display:'flex', alignItems:'flex-start', gap:14, marginBottom:16 }}>
          <div style={{ width:44, height:44, borderRadius:13, background:'rgba(96,165,250,0.15)', border:'1px solid rgba(96,165,250,0.2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Package size={20} color="#60a5fa"/>
          </div>
          <div>
            <h2 style={{ fontSize:18, fontWeight:800, color:'#fff', marginBottom:4 }}>{req.product}</h2>
            <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
              <span style={{ fontSize:12, color:'rgba(255,255,255,0.5)' }}>{req.quantity} {req.quantity_unit||'units'}</span>
              <span style={{ color:'rgba(255,255,255,0.2)' }}>·</span>
              <span style={{ fontSize:12, color:'rgba(255,255,255,0.5)' }}>{req.budget_max ? `Budget ₹${req.budget_max.toLocaleString()}` : 'Budget flexible'}</span>
              {req.delivery_location && <>
                <span style={{ color:'rgba(255,255,255,0.2)' }}>·</span>
                <span style={{ fontSize:12, color:'rgba(255,255,255,0.5)' }}>{req.delivery_location}</span>
              </>}
              <StatusBadge status={req.enrichment_status}/>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display:'flex', gap:12 }}>
          {[
            { icon:Bot,          label:'Total Sellers',  value:leads.length,   color:'#60a5fa' },
            { icon:TrendingUp,   label:'Negotiating',    value:active.length,  color:'#34d399' },
            { icon:AlertTriangle,label:'Need Decision',  value:needsYou.length,color:'#fbbf24' },
            { icon:CheckCircle,  label:'Closed',         value:closed.length,  color:'#4ade80' },
          ].map(({ icon:Icon, label, value, color }) => (
            <div key={label} style={{ flex:1, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:10, padding:'10px 14px' }}>
              <Icon size={14} color={color} style={{ marginBottom:6 }}/>
              <div style={{ fontSize:18, fontWeight:800, color:'#fff' }}>{value}</div>
              <div style={{ fontSize:10, color:'rgba(255,255,255,0.4)' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div style={{ display:'flex', gap:8, marginTop:14, flexWrap:'wrap' }}>
          <button onClick={() => goGeneralChat(req.id)}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', background:'rgba(96,165,250,0.1)', border:'1px solid rgba(96,165,250,0.2)', borderRadius:8, cursor:'pointer', fontFamily:'Montserrat,sans-serif', fontSize:12, fontWeight:600, color:'#60a5fa' }}>
            <Bot size={13}/> Ask AI about this
          </button>
          <button onClick={() => setShowExpiry(p => !p)}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, cursor:'pointer', fontFamily:'Montserrat,sans-serif', fontSize:12, fontWeight:600, color:'rgba(255,255,255,0.6)' }}>
            <Clock size={13}/> {req.expires_at ? `Expires ${new Date(req.expires_at).toLocaleDateString()}` : 'Set Expiry'}
          </button>
          {!req.is_expired && (
            <button onClick={handleClose}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:8, cursor:'pointer', fontFamily:'Montserrat,sans-serif', fontSize:12, fontWeight:600, color:'#f87171' }}>
              <XCircle size={13}/> Close Requirement
            </button>
          )}
        </div>

        {showExpiry && (
          <div style={{ marginTop:10, display:'flex', gap:8, alignItems:'center' }}>
            <input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)}
              style={{ background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:8, color:'#fff', padding:'7px 12px', fontFamily:'Montserrat,sans-serif', fontSize:12, outline:'none' }}/>
            <button onClick={handleSetExpiry} className="btn-primary" style={{ width:'auto', padding:'7px 16px', fontSize:12 }}>Set</button>
            <button onClick={() => setShowExpiry(false)} className="btn-ghost" style={{ fontSize:12, padding:'7px 12px' }}>Cancel</button>
          </div>
        )}
      </div>

      {/* Seller list */}
      <div style={{ flex:1, overflowY:'auto', padding:'20px 32px' }}>
        <p style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.35)', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:14 }}>
          Seller Conversations ({leads.length})
        </p>

        {leads.length === 0 && (
          <div style={{ textAlign:'center', padding:'48px 0', color:'rgba(255,255,255,0.3)' }}>
            <Bot size={36} style={{ margin:'0 auto 12px', opacity:0.3 }}/>
            <p style={{ fontSize:13 }}>Matching suppliers…</p>
            <p style={{ fontSize:11, marginTop:6, opacity:0.6 }}>AI agents will appear here once matched</p>
          </div>
        )}

        {/* Priority order: needs decision → active → others */}
        {[...needsYou, ...active.filter(l => !needsYou.includes(l)), ...leads.filter(l => !active.includes(l) && !needsYou.includes(l))].map(lead => (
          <LeadCard key={lead.id} lead={lead} onClick={() => goChat(req.id, lead.id)}/>
        ))}
      </div>
    </div>
  )
}