import { useState, useEffect } from 'react'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { useAuthStore } from '@/store/authStore'
import StatusBadge from '@/components/ui/StatusBadge'
import { Plus, ChevronDown, ChevronRight, Bot, Package, ShoppingCart, Settings, LogOut, Search, User, MessageSquare, X } from 'lucide-react'

function timeAgo(d) {
  if (!d) return ''
  const diff = Date.now() - new Date(d).getTime()
  const m = Math.floor(diff/60000)
  if (m < 1) return 'now'
  if (m < 60) return `${m}m`
  const h = Math.floor(m/60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h/24)}d`
}

function RequirementFolder({ req, leads = [], onNavClick }) {
  const { route, goRequirement, goChat, goGeneralChat, expandedRequirements, toggleExpanded } = useWorkspaceStore()
  const isExpanded = expandedRequirements[req.id]
  const isSelected = route.reqId === req.id && !route.leadId && route.view !== 'general_chat'
  const activeLeads = leads.filter(l => ['agent_initiated','negotiating','renegotiating'].includes(l.status))
  const needsInput  = leads.filter(l => l.ai_paused_for_buyer).length

  return (
    <div style={{ marginBottom: 2 }}>
      {/* Folder row */}
      <div
        onClick={() => { onNavClick(() => goRequirement(req.id))(); if (leads.length) toggleExpanded(req.id) }}
        className={`sidebar-item ${isSelected ? 'active' : ''}`}
        style={{ paddingRight: 6 }}
      >
        <div style={{ width:26, height:26, borderRadius:7, background:'rgba(96,165,250,0.15)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <Package size={12} color="#60a5fa" />
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <span style={{ fontSize:12, fontWeight:600, color:'#fff', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:130 }}>
              {req.product}
            </span>
            <div style={{ display:'flex', alignItems:'center', gap:4 }}>
              {needsInput > 0 && <span style={{ width:6, height:6, borderRadius:'50%', background:'#fbbf24', flexShrink:0 }}/>}
              {activeLeads.length > 0 && <span style={{ background:'#1A8FFF', color:'#fff', fontSize:9, fontWeight:800, borderRadius:10, padding:'1px 5px' }}>{activeLeads.length}</span>}
            </div>
          </div>
          <div style={{ fontSize:10, color:'rgba(255,255,255,0.3)', marginTop:1 }}>
            {req.quantity > 0 ? `${req.quantity} ${req.quantity_unit||'units'} · ` : ''}{timeAgo(req.created_at)}
            {req.expires_at && <span style={{ color:'#f87171', marginLeft:4 }}>· exp</span>}
          </div>
        </div>
        {leads.length > 0 && (
          <div onClick={e => { e.stopPropagation(); toggleExpanded(req.id) }} style={{ flexShrink:0 }}>
            {isExpanded ? <ChevronDown size={12} color="rgba(255,255,255,0.35)"/> : <ChevronRight size={12} color="rgba(255,255,255,0.35)"/>}
          </div>
        )}
      </div>

      {/* Sub items when expanded */}
      {isExpanded && (
        <>
          {/* General AI chat */}
          <div
            className={`sub-item ${route.view === 'general_chat' && route.reqId === req.id ? 'active' : ''}`}
            onClick={onNavClick(() => goGeneralChat(req.id))}
          >
            <Bot size={11} style={{ flexShrink:0, color: route.view === 'general_chat' && route.reqId === req.id ? '#60a5fa' : 'rgba(255,255,255,0.35)' }}/>
            <span style={{ fontSize:11 }}>Ask AI about this</span>
          </div>

          {/* Individual seller chats */}
          {leads.map(lead => {
            const dotColor =
              lead.status === 'deal_closed' ? '#10b981' :
              lead.status === 'offer_ready' ? '#f59e0b' :
              lead.status === 'awaiting_supplier_confirm' ? '#10b981' :
              lead.status === 'pending_supplier_approval' ? '#a78bfa' :
              ['agent_initiated','negotiating','renegotiating'].includes(lead.status) ? '#3b82f6' :
              ['not_selected','declined'].includes(lead.status) ? '#6b7280' :
              'rgba(255,255,255,0.2)'
            const subLabel =
              lead.status === 'offer_ready' ? 'decision needed' :
              lead.status === 'deal_closed' ? 'deal closed' :
              lead.status === 'awaiting_supplier_confirm' ? 'confirming...' :
              lead.status === 'pending_supplier_approval' ? 'seller reviewing' :
              lead.current_offer_price ? `₹${lead.current_offer_price.toLocaleString()}/unit` :
              lead.status.replace(/_/g, ' ')
            return (
              <div key={lead.id}
                className={`sub-item ${route.view === 'chat' && route.leadId === lead.id ? 'active' : ''}`}
                onClick={onNavClick(() => goChat(req.id, lead.id))}
              >
                <div style={{ width:6, height:6, borderRadius:'50%', flexShrink:0, background: dotColor }}/>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:11, fontWeight:500, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                    {lead.supplier_info?.trade_name || `Seller #${lead.supplier_id}`}
                  </div>
                  <div style={{ fontSize:10, color:'rgba(255,255,255,0.3)', marginTop:1 }}>
                    {subLabel}
                  </div>
                </div>
                {lead.status === 'offer_ready' && (
                  <div style={{ fontSize:8, fontWeight:700, color:'#f59e0b', background:'rgba(245,158,11,0.12)', padding:'2px 5px', borderRadius:4, flexShrink:0 }}>
                    ACT
                  </div>
                )}
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}

function SellerLeadGroup({ leads, onNavClick }) {
  const { route, goLead, goDealChat } = useWorkspaceStore()

  // Group by lead lifecycle status (negotiation flow)
  const reviewOffer  = leads.filter(l => l.status === 'pending_supplier_approval')
  const negotiating  = leads.filter(l => ['negotiating','renegotiating','agent_initiated','new'].includes(l.status) && l.status !== 'pending_supplier_approval')
  const offerSent    = leads.filter(l => l.status === 'offer_ready')
  const awaitConfirm = leads.filter(l => l.status === 'awaiting_supplier_confirm')
  const closed       = leads.filter(l => l.status === 'deal_closed')
  const notSelected  = leads.filter(l => ['not_selected','declined'].includes(l.status))

  const statusColor = (lead) => {
    if (lead.status === 'pending_supplier_approval') return '#a78bfa'
    if (lead.status === 'offer_ready') return '#3b82f6'
    if (lead.status === 'awaiting_supplier_confirm') return '#f59e0b'
    if (lead.status === 'deal_closed') return '#10b981'
    if (['negotiating','renegotiating'].includes(lead.status)) return '#60a5fa'
    if (['not_selected','declined'].includes(lead.status)) return '#6b7280'
    return 'rgba(255,255,255,0.2)'
  }

  const statusLabel = (lead) => {
    if (lead.status === 'pending_supplier_approval') return 'review offer'
    if (lead.status === 'offer_ready') return 'buyer reviewing'
    if (lead.status === 'awaiting_supplier_confirm') return 'confirm deal'
    if (lead.status === 'deal_closed') return 'closed'
    if (lead.current_offer_price) return `₹${lead.current_offer_price.toLocaleString()}/unit`
    return lead.status.replace(/_/g, ' ')
  }

  const Section = ({ title, items, color }) => items.length === 0 ? null : (
    <div style={{ marginBottom:8 }}>
      <div style={{ fontSize:9, fontWeight:700, color:'rgba(255,255,255,0.3)', letterSpacing:'0.08em', textTransform:'uppercase', padding:'4px 8px' }}>
        <span style={{ color }}>{title}</span> ({items.length})
      </div>
      {items.map(lead => (
        <div key={lead.id}
          className={`sidebar-item ${(route.view === 'lead' || route.view === 'deal_chat') && route.leadId === lead.id ? 'active' : ''}`}
          onClick={onNavClick(() => {
            if (lead.status === 'deal_closed') {
              goDealChat(lead.id, lead.conversation?.id)
            } else {
              goLead(lead.id)
            }
          })}
        >
          <div style={{ width:26, height:26, borderRadius:7, background:`${statusColor(lead)}20`, border:`1px solid ${statusColor(lead)}30`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <ShoppingCart size={12} color={statusColor(lead)}/>
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:12, fontWeight:600, color:'#fff' }}>
              {lead.requirement?.product || `Lead #${lead.id}`}
            </div>
            <div style={{ fontSize:10, color:'rgba(255,255,255,0.3)', marginTop:1 }}>
              {statusLabel(lead)} · {timeAgo(lead.updated_at)}
            </div>
          </div>
          <div style={{ width:6, height:6, borderRadius:'50%', flexShrink:0, background: statusColor(lead) }}/>
        </div>
      ))}
    </div>
  )

  return (
    <>
      <Section title="Review Offer"      items={reviewOffer}  color="#a78bfa"/>
      <Section title="Negotiating"       items={negotiating}  color="#60a5fa"/>
      <Section title="Offer Sent"        items={offerSent}    color="#3b82f6"/>
      <Section title="Confirm Deal"      items={awaitConfirm} color="#f59e0b"/>
      <Section title="Closed"            items={closed}       color="#10b981"/>
      <Section title="Not Selected"      items={notSelected}  color="#6b7280"/>
    </>
  )
}

export default function Sidebar({ buyerRequirements, leadsByRequirement, sellerLeads, loading, isOpen, onClose }) {
  const { sidebarTab, setSidebarTab, goNewReq, goProfile, goSettings, route } = useWorkspaceStore()
  const { logout } = useAuthStore()
  const [search, setSearch] = useState('')

  const filteredReqs   = buyerRequirements.filter(r => r.product?.toLowerCase().includes(search.toLowerCase()))
  const filteredSeller = sellerLeads.filter(l => String(l.id).includes(search) || String(l.requirement_id).includes(search))

  // Close sidebar on mobile when clicking a nav item
  const handleNavClick = (callback) => {
    return () => {
      callback()
      if (window.innerWidth <= 768) onClose()
    }
  }

  return (
    <div className={`sidebar ${isOpen ? 'mobile-open' : ''}`}>
      {/* Logo + New */}
      <div style={{ padding:'14px 12px 10px', borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:19, fontWeight:900, letterSpacing:'-0.5px', background:'linear-gradient(135deg,#fff,#93c5fd)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
              Bisdom
            </span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <button onClick={handleNavClick(goNewReq)} title="New requirement"
              style={{ width:28, height:28, borderRadius:8, background:'rgba(96,165,250,0.15)', border:'1px solid rgba(96,165,250,0.25)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
              <Plus size={15} color="#60a5fa"/>
            </button>
            {/* Mobile close button */}
            <button onClick={onClose} className="mobile-close-btn" title="Close sidebar"
              style={{ width:28, height:28, borderRadius:8, background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)', display:'none', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
              <X size={15} color="rgba(255,255,255,0.6)"/>
            </button>
          </div>
        </div>
        <div style={{ position:'relative' }}>
          <Search size={12} style={{ position:'absolute', left:9, top:'50%', transform:'translateY(-50%)', color:'rgba(255,255,255,0.3)' }}/>
          <input className="bisdom-input" value={search} onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft:28, fontSize:12, padding:'7px 10px 7px 28px' }} placeholder="Search…"/>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', padding:'7px 10px', gap:6, borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
        {[['buying','Buying'], ['selling','Selling']].map(([key, label]) => (
          <button key={key} onClick={() => setSidebarTab(key)}
            style={{ flex:1, padding:'6px 0', borderRadius:8, border:'none', cursor:'pointer', fontSize:11, fontWeight:700, fontFamily:'Montserrat,sans-serif', transition:'all 0.2s',
              background: sidebarTab===key ? 'rgba(96,165,250,0.2)' : 'transparent',
              color: sidebarTab===key ? '#60a5fa' : 'rgba(255,255,255,0.4)',
            }}>
            {label}
            {key==='buying'  && buyerRequirements.length > 0 && <span style={{ marginLeft:4, fontSize:9, opacity:0.7 }}>({buyerRequirements.length})</span>}
            {key==='selling' && sellerLeads.length > 0 && <span style={{ marginLeft:4, fontSize:9, opacity:0.7 }}>({sellerLeads.length})</span>}
          </button>
        ))}
      </div>

      {/* List */}
      <div style={{ flex:1, overflowY:'auto', padding:'6px 6px' }}>
        {loading && <div style={{ textAlign:'center', padding:20, color:'rgba(255,255,255,0.3)', fontSize:12 }}>Loading…</div>}

        {!loading && sidebarTab === 'buying' && (
          filteredReqs.length === 0
            ? <div style={{ textAlign:'center', padding:'20px 12px', color:'rgba(255,255,255,0.25)', fontSize:12 }}>
                No requirements yet.<br/>
                <span style={{ color:'#60a5fa', cursor:'pointer' }} onClick={handleNavClick(goNewReq)}>+ Post one</span>
              </div>
            : filteredReqs.map(req => (
                <RequirementFolder key={req.id} req={req} leads={leadsByRequirement[req.id] || []} onNavClick={handleNavClick}/>
              ))
        )}

        {!loading && sidebarTab === 'selling' && (
          filteredSeller.length === 0
            ? <div style={{ textAlign:'center', padding:'20px 12px', color:'rgba(255,255,255,0.25)', fontSize:12 }}>
                No leads yet.<br/>Complete your supplier profile.
              </div>
            : <SellerLeadGroup leads={filteredSeller} onNavClick={handleNavClick}/>
        )}
      </div>

      {/* Bottom */}
      <div style={{ borderTop:'1px solid rgba(255,255,255,0.07)', padding:'6px 8px', display:'flex', flexDirection:'column', gap:2 }}>
        <div className={`sidebar-item ${route.view==='profile' ? 'active' : ''}`} onClick={handleNavClick(goProfile)} style={{ fontSize:12 }}>
          <User size={14}/> Profile
        </div>
        <div className={`sidebar-item ${route.view==='settings' ? 'active' : ''}`} onClick={handleNavClick(goSettings)} style={{ fontSize:12 }}>
          <Settings size={14}/> Settings
        </div>
        <div className="sidebar-item" onClick={handleNavClick(() => { logout(); window.location.href='/login' })} style={{ fontSize:12, color:'rgba(255,255,255,0.35)' }}>
          <LogOut size={14}/> Sign out
        </div>
      </div>
    </div>
  )
}
