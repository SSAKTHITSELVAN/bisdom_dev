import { useState, useEffect } from 'react'
import { getPendingActions } from '@/api/conversations'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { useAuthStore } from '@/store/authStore'
import { AlertTriangle, ShieldCheck, X, ChevronRight, Zap, MessageSquare, ThumbsDown } from 'lucide-react'

const ACTION_META = {
  buyer_decision:    { label: 'Your Decision Needed',    color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.2)',  icon: <AlertTriangle size={13} color="#f59e0b"/> },
  review_offer:      { label: 'Review Final Offer',      color: '#a78bfa', bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.2)', icon: <Zap size={13} color="#a78bfa"/> },
  supplier_confirm:  { label: 'Confirm Deal',            color: '#10b981', bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.2)',  icon: <ShieldCheck size={13} color="#10b981"/> },
  supplier_respond:  { label: 'AI Needs Your Input',     color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.2)',  icon: <AlertTriangle size={13} color="#f59e0b"/> },
  supplier_declined: { label: 'Supplier Declined',       color: '#ef4444', bg: 'rgba(239,68,68,0.06)',   border: 'rgba(239,68,68,0.15)',  icon: <ThumbsDown size={13} color="#ef4444"/> },
}

export default function ActionsWidget({ refreshKey }) {
  const [pending, setPending] = useState([])
  const [open, setOpen]       = useState(false)
  const { goChat, goLead } = useWorkspaceStore()
  const currentUser = useAuthStore(s => s.user)

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

  if (pending.length === 0) return null

  const navigate = (item) => {
    // Supplier-side actions → go to lead view; buyer-side → go to chat
    const isSupplierAction = ['supplier_confirm', 'supplier_respond'].includes(item.action)
    if (isSupplierAction) {
      goLead(item.lead_id)
    } else {
      goChat(item.requirement_id, item.lead_id)
    }
    setOpen(false)
  }

  return (
    <>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position:'fixed', bottom:24, right:24, zIndex:200,
          width:52, height:52, borderRadius:'50%',
          background:'linear-gradient(135deg, #f59e0b, #d97706)',
          border:'2px solid rgba(245,158,11,0.4)',
          boxShadow:'0 4px 20px rgba(245,158,11,0.4)',
          display:'flex', alignItems:'center', justifyContent:'center',
          cursor:'pointer', animation:'pulse 2s infinite'
        }}>
        <div style={{ position:'relative' }}>
          <AlertTriangle size={22} color="#fff"/>
          <span style={{
            position:'absolute', top:-10, right:-10,
            background:'#ef4444', color:'#fff',
            fontSize:10, fontWeight:800, borderRadius:'50%',
            width:18, height:18, display:'flex', alignItems:'center', justifyContent:'center',
            border:'2px solid #0d1f3c'
          }}>
            {pending.length}
          </span>
        </div>
      </button>

      {open && (
        <div style={{
          position:'fixed', bottom:86, right:24, zIndex:200,
          width:340, background:'#0d1f3c',
          border:'1px solid rgba(255,255,255,0.1)',
          borderRadius:16, overflow:'hidden',
          boxShadow:'0 24px 64px rgba(0,0,0,0.6)'
        }}>
          <div style={{
            padding:'14px 16px', borderBottom:'1px solid rgba(255,255,255,0.07)',
            display:'flex', alignItems:'center', justifyContent:'space-between'
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <AlertTriangle size={15} color="#f59e0b"/>
              <span style={{ fontSize:13, fontWeight:700, color:'#fff' }}>Actions Required</span>
              <span style={{ background:'rgba(245,158,11,0.15)', color:'#f59e0b', fontSize:10, fontWeight:800, borderRadius:10, padding:'1px 7px' }}>
                {pending.length}
              </span>
            </div>
            <button onClick={() => setOpen(false)} style={{ background:'rgba(255,255,255,0.06)', border:'none', cursor:'pointer', width:26, height:26, borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <X size={12} color="rgba(255,255,255,0.5)"/>
            </button>
          </div>

          <div style={{ maxHeight:400, overflowY:'auto' }}>
            {pending.map((item, i) => {
              const meta = ACTION_META[item.action] || ACTION_META.buyer_decision
              return (
                <div key={i} onClick={() => navigate(item)} style={{
                  padding:'12px 16px',
                  borderBottom: i < pending.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                  cursor:'pointer', display:'flex', alignItems:'center', gap:12,
                  background: meta.bg, transition:'background 0.15s'
                }}
                  onMouseEnter={e => e.currentTarget.style.background = `rgba(255,255,255,0.04)`}
                  onMouseLeave={e => e.currentTarget.style.background = meta.bg}
                >
                  <div style={{ width:34, height:34, borderRadius:10, flexShrink:0, background: meta.border, border:`1px solid ${meta.border}`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    {meta.icon}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:700, color: meta.color }}>{meta.label}</div>
                    <div style={{ fontSize:11, color:'rgba(255,255,255,0.6)', marginTop:2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                      {item.product || `Lead #${item.lead_id}`}
                      {item.current_offer_price ? ` · ₹${item.current_offer_price.toLocaleString()}/unit` : ''}
                    </div>
                  </div>
                  <ChevronRight size={14} color="rgba(255,255,255,0.3)"/>
                </div>
              )
            })}
          </div>

          <div style={{ padding:'10px 16px', borderTop:'1px solid rgba(255,255,255,0.05)' }}>
            <button onClick={load} style={{ width:'100%', padding:'8px', fontSize:11, color:'rgba(255,255,255,0.4)', background:'transparent', border:'none', cursor:'pointer', fontFamily:'inherit' }}>
              Refresh
            </button>
          </div>
        </div>
      )}
    </>
  )
}
