import { useState, useEffect } from 'react'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { useAuthStore } from '@/store/authStore'
import { Menu, Bell, AlertTriangle, ShieldCheck, ChevronRight, Zap, ThumbsDown, X } from 'lucide-react'
import { getPendingActions } from '@/api/conversations'
import NewRequirementChat from './NewRequirementChat'
import RequirementOverview from './RequirementOverview'
import WelcomeScreen from './WelcomeScreen'
import ProfilePanel from './ProfileEditorV4'
import SettingsPanel from './SettingsPanel'
import GeneralReqChat from './GeneralReqChat'
import DealChat from './DealChat'
import ConversationView from './ConversationView'

const ACTION_META = {
  buyer_decision:    { label: 'Your Decision Needed', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)', icon: <AlertTriangle size={14} color="#f59e0b"/> },
  review_offer:      { label: 'Review Final Offer',   color: '#a78bfa', bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.2)', icon: <Zap size={14} color="#a78bfa"/> },
  supplier_confirm:  { label: 'Confirm Deal',         color: '#10b981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)', icon: <ShieldCheck size={14} color="#10b981"/> },
  supplier_respond:  { label: 'AI Needs Your Input',  color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)', icon: <AlertTriangle size={14} color="#f59e0b"/> },
  supplier_declined: { label: 'Supplier Declined',    color: '#ef4444', bg: 'rgba(239,68,68,0.06)', border: 'rgba(239,68,68,0.15)', icon: <ThumbsDown size={14} color="#ef4444"/> },
}

export default function MainPanel({ buyerRequirements, leadsByRequirement, sellerLeads, onToggleSidebar, pendingCount = 0 }) {
  const { route, goChat, goLead } = useWorkspaceStore()
  const { user } = useAuthStore()
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false)
  const [mobileActions, setMobileActions] = useState([])

  const openMobileActions = async () => {
    setMobileActionsOpen(true)
    try {
      const res = await getPendingActions()
      setMobileActions(res.data.pending || [])
    } catch {}
  }

  const navigateAction = (item) => {
    const isSupplierAction = ['supplier_confirm', 'supplier_respond'].includes(item.action)
    if (isSupplierAction) {
      goLead(item.lead_id)
    } else {
      goChat(item.requirement_id, item.lead_id)
    }
    setMobileActionsOpen(false)
  }

  const renderContent = () => {
    switch (route.view) {
      case 'lead': {
        const lead = sellerLeads.find(l => l.id === route.leadId)
        if (!lead) return <div style={{ flex:1, overflow:'auto' }}><WelcomeScreen /></div>
        return <ConversationView leadId={lead.id} />
      }

      case 'deal_chat': {
        const lead = sellerLeads.find(l => l.id === route.leadId)
          || Object.values(leadsByRequirement).flat().find(l => l.id === route.leadId)
        if (!lead) return <div style={{ flex:1, overflow:'auto' }}><WelcomeScreen /></div>
        return <DealChat lead={lead} conversationId={route.convId || lead.conversation?.id} />
      }

      case 'chat': {
        const leads = leadsByRequirement[route.reqId] || []
        const lead = leads.find(l => l.id === route.leadId)
        if (!lead) return <div style={{ flex:1, overflow:'auto' }}><WelcomeScreen /></div>
        return <DealChat lead={lead} conversationId={lead.conversation?.id} />
      }

      case 'profile':         return <div style={{ flex:1, overflow:'auto' }}><ProfilePanel /></div>
      case 'settings':        return <div style={{ flex:1, overflow:'auto' }}><SettingsPanel /></div>
      case 'new_requirement': return <div style={{ flex:1, overflow:'auto' }}><NewRequirementChat /></div>

      case 'general_chat': {
        const req = buyerRequirements.find(r => r.id === route.reqId)
        const leads = leadsByRequirement[route.reqId] || []
        return <div style={{ flex:1, overflow:'auto' }}><GeneralReqChat req={req} leads={leads} /></div>
      }

      case 'requirement': {
        const req = buyerRequirements.find(r => r.id === route.reqId)
        const leads = leadsByRequirement[route.reqId] || []
        return <div style={{ flex:1, overflow:'auto' }}><RequirementOverview req={req} leads={leads} /></div>
      }

      default: return <div style={{ flex:1, overflow:'auto' }}><WelcomeScreen /></div>
    }
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
      {/* Mobile header */}
      <div className="mobile-header" style={{
        display: 'none',
        alignItems: 'center',
        padding: '10px 14px',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        background: '#0d1f3c',
      }}>
        <button
          onClick={onToggleSidebar}
          style={{
            width: 34, height: 34, borderRadius: 8,
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0,
          }}
        >
          <Menu size={17} color="rgba(255,255,255,0.8)" />
        </button>
        <span style={{ flex:1, textAlign:'center', fontSize: 15, fontWeight: 700, letterSpacing: '-0.3px', background: 'linear-gradient(135deg,#fff,#93c5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Bisdom
        </span>
        <button
          onClick={openMobileActions}
          style={{
            width: 34, height: 34, borderRadius: 8,
            background: pendingCount > 0 ? 'rgba(245,158,11,0.12)' : 'rgba(255,255,255,0.08)',
            border: `1px solid ${pendingCount > 0 ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.12)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0, position: 'relative',
          }}
        >
          <Bell size={16} color={pendingCount > 0 ? '#f59e0b' : 'rgba(255,255,255,0.6)'} />
          {pendingCount > 0 && (
            <span style={{
              position:'absolute', top:-4, right:-4,
              background:'#ef4444', color:'#fff',
              fontSize:8, fontWeight:800, borderRadius:'50%',
              width:15, height:15, display:'flex', alignItems:'center', justifyContent:'center',
              border:'2px solid #0d1f3c'
            }}>
              {pendingCount}
            </span>
          )}
        </button>
      </div>

      {/* Mobile actions overlay */}
      {mobileActionsOpen && (
        <>
          <div onClick={() => setMobileActionsOpen(false)} style={{ position:'fixed', inset:0, zIndex:400, background:'rgba(0,0,0,0.5)' }}/>
          <div style={{
            position:'fixed', top:0, right:0, bottom:0, zIndex:401,
            width:'80vw', maxWidth:320, background:'#0c1524',
            borderLeft:'1px solid rgba(255,255,255,0.1)',
            display:'flex', flexDirection:'column',
            animation:'slideInRight 0.2s ease',
          }}>
            <div style={{ padding:'16px', borderBottom:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <AlertTriangle size={14} color="#f59e0b"/>
                <span style={{ fontSize:14, fontWeight:700, color:'#fff' }}>Actions</span>
                {mobileActions.length > 0 && (
                  <span style={{ background:'rgba(245,158,11,0.15)', color:'#f59e0b', fontSize:9, fontWeight:800, borderRadius:10, padding:'2px 7px' }}>{mobileActions.length}</span>
                )}
              </div>
              <button onClick={() => setMobileActionsOpen(false)} style={{ width:30, height:30, borderRadius:8, background:'rgba(255,255,255,0.06)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <X size={14} color="rgba(255,255,255,0.5)"/>
              </button>
            </div>
            <div style={{ flex:1, overflowY:'auto', padding:'8px 0' }}>
              {mobileActions.length === 0 ? (
                <div style={{ textAlign:'center', padding:'40px 16px', color:'rgba(255,255,255,0.3)', fontSize:12 }}>No pending actions</div>
              ) : (
                mobileActions.map((item, i) => {
                  const meta = ACTION_META[item.action] || ACTION_META.buyer_decision
                  return (
                    <div key={i} onClick={() => navigateAction(item)} style={{
                      padding:'12px 14px', margin:'0 8px 6px',
                      borderRadius:10, cursor:'pointer',
                      display:'flex', alignItems:'center', gap:10,
                      background: meta.bg, border:`1px solid ${meta.border}`,
                    }}>
                      <div style={{ width:32, height:32, borderRadius:8, flexShrink:0, background: meta.border, display:'flex', alignItems:'center', justifyContent:'center' }}>
                        {meta.icon}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:12, fontWeight:700, color: meta.color }}>{meta.label}</div>
                        <div style={{ fontSize:10, color:'rgba(255,255,255,0.5)', marginTop:2 }}>
                          {item.product || `Lead #${item.lead_id}`}
                          {item.current_offer_price ? ` · ₹${item.current_offer_price.toLocaleString()}` : ''}
                        </div>
                      </div>
                      <ChevronRight size={13} color="rgba(255,255,255,0.25)"/>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </>
      )}

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {renderContent()}
      </div>
    </div>
  )
}
