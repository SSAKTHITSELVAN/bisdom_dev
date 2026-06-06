import { useState, useEffect } from 'react'
import { getPendingActions } from '@/api/conversations'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { AlertTriangle, ShieldCheck, ChevronRight, Zap, ThumbsDown, Trash2, CheckCircle } from 'lucide-react'

const ACTION_META = {
  buyer_decision:        { label: 'Your Decision Needed',    color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.2)',  icon: <AlertTriangle size={13} color="#f59e0b"/> },
  review_offer:          { label: 'Review Final Offer',      color: '#a78bfa', bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.2)', icon: <Zap size={13} color="#a78bfa"/> },
  supplier_approve_offer:{ label: 'Review AI Offer',         color: '#a78bfa', bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.2)', icon: <Zap size={13} color="#a78bfa"/> },
  supplier_confirm:      { label: 'Confirm Deal',            color: '#10b981', bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.2)',  icon: <ShieldCheck size={13} color="#10b981"/> },
  supplier_respond:      { label: 'AI Needs Your Input',     color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.2)',  icon: <AlertTriangle size={13} color="#f59e0b"/> },
  supplier_declined:     { label: 'Supplier Declined',       color: '#ef4444', bg: 'rgba(239,68,68,0.06)',   border: 'rgba(239,68,68,0.15)',  icon: <ThumbsDown size={13} color="#ef4444"/> },
}

export default function ActionsWidget({ refreshKey }) {
  const [pending, setPending] = useState([])
  const [visited, setVisited] = useState([])
  const { goChat, goLead } = useWorkspaceStore()

  const load = async () => {
    try {
      const res = await getPendingActions()
      setPending(res.data.pending || [])
    } catch {}
  }

  useEffect(() => { load() }, [refreshKey])
  useEffect(() => {
    const t = setInterval(load, 20000)
    return () => clearInterval(t)
  }, [])

  const navigate = (item) => {
    setVisited(prev => prev.includes(item.lead_id) ? prev : [...prev, item.lead_id])
    const isSupplierAction = ['supplier_confirm', 'supplier_respond', 'supplier_approve_offer'].includes(item.action)
    if (isSupplierAction) {
      goLead(item.lead_id)
    } else {
      goChat(item.requirement_id, item.lead_id)
    }
  }

  const clearAll = () => {
    setVisited(pending.map(p => p.lead_id))
  }

  const incomplete = pending.filter(item => !visited.includes(item.lead_id))
  const done = pending.filter(item => visited.includes(item.lead_id))
  const activeCount = incomplete.length

  return (
    <div className="actions-panel-wrapper">
      {/* Panel header */}
      <div style={{
        padding:'16px 16px 12px', borderBottom:'1px solid rgba(255,255,255,0.07)',
        display:'flex', alignItems:'center', justifyContent:'space-between',
        flexShrink:0,
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <AlertTriangle size={14} color="#f59e0b"/>
          <span style={{ fontSize:13, fontWeight:700, color:'#fff' }}>Actions</span>
          {activeCount > 0 && (
            <span style={{ background:'rgba(245,158,11,0.15)', color:'#f59e0b', fontSize:9, fontWeight:800, borderRadius:10, padding:'2px 7px' }}>
              {activeCount}
            </span>
          )}
        </div>
      </div>

      {/* Action items — incomplete first, done at bottom */}
      <div style={{ flex:1, overflowY:'auto', padding:'4px 0' }}>
        {pending.length === 0 ? (
          <div style={{ textAlign:'center', padding:'32px 16px', color:'rgba(255,255,255,0.25)', fontSize:11 }}>
            No pending actions
          </div>
        ) : (
          <>
            {/* Incomplete — active tasks */}
            {incomplete.map((item, i) => {
              const meta = ACTION_META[item.action] || ACTION_META.buyer_decision
              return (
                <div key={`active-${item.lead_id}`} onClick={() => navigate(item)} style={{
                  padding:'10px 12px', margin:'0 6px 4px',
                  borderRadius:10, cursor:'pointer',
                  display:'flex', alignItems:'center', gap:10,
                  background: meta.bg,
                  border:`1px solid ${meta.border}`,
                  transition:'all 0.2s'
                }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                  onMouseLeave={e => e.currentTarget.style.background = meta.bg}
                >
                  <div style={{ width:30, height:30, borderRadius:8, flexShrink:0, background: meta.border, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    {meta.icon}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:11, fontWeight:700, color: meta.color }}>{meta.label}</div>
                    <div style={{ fontSize:10, color:'rgba(255,255,255,0.5)', marginTop:2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                      {item.product || `Lead #${item.lead_id}`}
                      {item.current_offer_price ? ` · ₹${item.current_offer_price.toLocaleString()}` : ''}
                    </div>
                  </div>
                  <ChevronRight size={12} color="rgba(255,255,255,0.25)"/>
                </div>
              )
            })}

            {/* Done — visited tasks (dull, at bottom) */}
            {done.length > 0 && incomplete.length > 0 && (
              <div style={{ margin:'8px 12px 4px', borderTop:'1px solid rgba(255,255,255,0.05)' }}/>
            )}
            {done.map((item) => {
              const meta = ACTION_META[item.action] || ACTION_META.buyer_decision
              return (
                <div key={`done-${item.lead_id}`} onClick={() => navigate(item)} style={{
                  padding:'8px 12px', margin:'0 6px 3px',
                  borderRadius:8, cursor:'pointer',
                  display:'flex', alignItems:'center', gap:10,
                  background:'rgba(255,255,255,0.02)',
                  border:'1px solid rgba(255,255,255,0.04)',
                  opacity: 0.5,
                  transition:'all 0.2s'
                }}>
                  <div style={{ width:26, height:26, borderRadius:7, flexShrink:0, background:'rgba(255,255,255,0.06)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <CheckCircle size={12} color="rgba(255,255,255,0.3)"/>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:10, fontWeight:600, color:'rgba(255,255,255,0.4)', textDecoration:'line-through' }}>{meta.label}</div>
                    <div style={{ fontSize:9, color:'rgba(255,255,255,0.3)', marginTop:1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                      {item.product || `Lead #${item.lead_id}`}
                    </div>
                  </div>
                </div>
              )
            })}
          </>
        )}
      </div>

      {/* Clear All */}
      {pending.length > 0 && activeCount > 0 && (
        <div style={{ padding:'10px 12px', borderTop:'1px solid rgba(255,255,255,0.07)', flexShrink:0 }}>
          <button onClick={clearAll} style={{
            width:'100%', padding:'8px', fontSize:11, fontWeight:600,
            color:'rgba(255,255,255,0.4)', background:'rgba(255,255,255,0.04)',
            border:'1px solid rgba(255,255,255,0.08)', borderRadius:8,
            cursor:'pointer', fontFamily:'Montserrat,sans-serif',
            display:'flex', alignItems:'center', justifyContent:'center', gap:6,
          }}>
            <Trash2 size={11}/> Clear All
          </button>
        </div>
      )}
    </div>
  )
}
