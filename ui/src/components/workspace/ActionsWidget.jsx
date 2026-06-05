import { useState, useEffect } from 'react'
import { getPendingActions } from '@/api/conversations'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { useAuthStore } from '@/store/authStore'
import { AlertTriangle, ShieldCheck, X, ChevronRight, Zap, MessageSquare, ThumbsDown, Trash2 } from 'lucide-react'

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
  const [dismissed, setDismissed] = useState([])
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

  const visibleActions = pending.filter(item => !dismissed.includes(item.lead_id))

  if (visibleActions.length === 0 && !open) return null

  const navigate = (item) => {
    const isSupplierAction = ['supplier_confirm', 'supplier_respond'].includes(item.action)
    if (isSupplierAction) {
      goLead(item.lead_id)
    } else {
      goChat(item.requirement_id, item.lead_id)
    }
    setOpen(false)
  }

  const clearAll = () => {
    setDismissed(pending.map(p => p.lead_id))
    setOpen(false)
  }

  return (
    <>
      {/* Floating trigger button */}
      {visibleActions.length > 0 && (
        <button
          onClick={() => setOpen(true)}
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
              {visibleActions.length}
            </span>
          </div>
        </button>
      )}

      {/* Overlay backdrop */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position:'fixed', inset:0, zIndex:300,
            background:'rgba(0,0,0,0.4)',
            transition:'opacity 0.2s',
          }}
        />
      )}

      {/* Slide-in panel from right */}
      <div style={{
        position:'fixed', top:0, right:0, bottom:0, zIndex:301,
        width:360, maxWidth:'85vw',
        background:'#0c1524',
        borderLeft:'1px solid rgba(255,255,255,0.1)',
        boxShadow:'-8px 0 40px rgba(0,0,0,0.5)',
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition:'transform 0.25s ease',
        display:'flex', flexDirection:'column',
      }}>
        {/* Panel header */}
        <div style={{
          padding:'18px 20px', borderBottom:'1px solid rgba(255,255,255,0.07)',
          display:'flex', alignItems:'center', justifyContent:'space-between',
          flexShrink:0,
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <AlertTriangle size={16} color="#f59e0b"/>
            <span style={{ fontSize:15, fontWeight:700, color:'#fff' }}>Actions</span>
            {visibleActions.length > 0 && (
              <span style={{ background:'rgba(245,158,11,0.15)', color:'#f59e0b', fontSize:10, fontWeight:800, borderRadius:10, padding:'2px 8px' }}>
                {visibleActions.length}
              </span>
            )}
          </div>
          <button onClick={() => setOpen(false)} style={{ background:'rgba(255,255,255,0.06)', border:'none', cursor:'pointer', width:30, height:30, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <X size={14} color="rgba(255,255,255,0.5)"/>
          </button>
        </div>

        {/* Action items */}
        <div style={{ flex:1, overflowY:'auto', padding:'8px 0' }}>
          {visibleActions.length === 0 ? (
            <div style={{ textAlign:'center', padding:'40px 20px', color:'rgba(255,255,255,0.3)', fontSize:13 }}>
              No pending actions
            </div>
          ) : (
            visibleActions.map((item, i) => {
              const meta = ACTION_META[item.action] || ACTION_META.buyer_decision
              return (
                <div key={i} onClick={() => navigate(item)} style={{
                  padding:'14px 20px', margin:'0 8px 4px',
                  borderRadius:12, cursor:'pointer',
                  display:'flex', alignItems:'center', gap:12,
                  background: meta.bg,
                  border:`1px solid ${meta.border}`,
                  transition:'all 0.15s'
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.transform = 'translateX(-2px)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = meta.bg; e.currentTarget.style.transform = 'translateX(0)' }}
                >
                  <div style={{ width:36, height:36, borderRadius:10, flexShrink:0, background: meta.border, border:`1px solid ${meta.border}`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    {meta.icon}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:700, color: meta.color }}>{meta.label}</div>
                    <div style={{ fontSize:11, color:'rgba(255,255,255,0.6)', marginTop:3, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                      {item.product || `Lead #${item.lead_id}`}
                      {item.current_offer_price ? ` · ₹${item.current_offer_price.toLocaleString()}/unit` : ''}
                    </div>
                  </div>
                  <ChevronRight size={14} color="rgba(255,255,255,0.3)"/>
                </div>
              )
            })
          )}
        </div>

        {/* Clear All button at bottom */}
        {visibleActions.length > 0 && (
          <div style={{ padding:'12px 20px', borderTop:'1px solid rgba(255,255,255,0.07)', flexShrink:0 }}>
            <button onClick={clearAll} style={{
              width:'100%', padding:'11px', fontSize:12, fontWeight:600,
              color:'#ef4444', background:'rgba(239,68,68,0.06)',
              border:'1px solid rgba(239,68,68,0.15)', borderRadius:10,
              cursor:'pointer', fontFamily:'Montserrat,sans-serif',
              display:'flex', alignItems:'center', justifyContent:'center', gap:8,
            }}>
              <Trash2 size={13}/> Clear All
            </button>
          </div>
        )}
      </div>
    </>
  )
}
