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
          {leads.map(lead => (
            <div key={lead.id}
              className={`sub-item ${route.view === 'chat' && route.leadId === lead.id ? 'active' : ''}`}
              onClick={onNavClick(() => goChat(req.id, lead.id))}
            >
              <div style={{ width:6, height:6, borderRadius:'50%', flexShrink:0, background:
                lead.status === 'deal_closed' ? '#4ade80' :
                lead.status === 'awaiting_supplier_confirm' ? '#10b981' :
                ['agent_initiated','negotiating'].includes(lead.status) ? '#60a5fa' :
                (lead.ai_paused_for_buyer || lead.ai_paused_for_supplier) ? '#fbbf24' : 'rgba(255,255,255,0.2)'
              }}/>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:11, fontWeight:500, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                  {lead.supplier_info?.trade_name || `Seller #${lead.supplier_id}`}
                </div>
                <div style={{ fontSize:10, color:'rgba(255,255,255,0.3)', marginTop:1 }}>
                  {lead.current_offer_price ? `₹${lead.current_offer_price.toLocaleString()}/unit` : lead.status.replace(/_/g,' ')}
                </div>
              </div>
              {lead.ai_paused_for_buyer && <div style={{ width:5, height:5, borderRadius:'50%', background:'#fbbf24', flexShrink:0 }}/>}
            </div>
          ))}
        </>
      )}
    </div>
  )
}

function SellerLeadGroup({ leads, onNavClick }) {
  const { route, goLead, goDealChat } = useWorkspaceStore()

  // Group by card_status
  const pending   = leads.filter(l => ['pending','generating'].includes(l.card_status))
  const draft     = leads.filter(l => ['draft','qa'].includes(l.card_status))
  const submitted = leads.filter(l => l.card_status === 'submitted')
  const selected  = leads.filter(l => l.card_status === 'selected' || l.status === 'deal_open')
  const closed    = leads.filter(l => l.status === 'deal_closed')
  const rejected  = leads.filter(l => l.card_status === 'rejected' || l.status === 'not_selected')

  const cardStatusColor = (lead) => {
    if (['deal_closed','selected'].includes(lead.card_status)) return '#4ade80'
    if (lead.card_status === 'submitted') return '#a78bfa'
    if (['draft','qa'].includes(lead.card_status)) return '#fbbf24'
    return 'rgba(255,255,255,0.2)'
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
            if (lead.status === 'deal_open' || lead.status === 'deal_closed') {
              goDealChat(lead.id, lead.conversation?.id)
            } else {
              goLead(lead.id)
            }
          })}
        >
          <div style={{ width:26, height:26, borderRadius:7, background:'rgba(167,139,250,0.15)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <ShoppingCart size={12} color="#a78bfa"/>
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:12, fontWeight:600, color:'#fff' }}>
              {lead.requirement?.product || `Lead #${lead.id}`}
            </div>
            <div style={{ fontSize:10, color:'rgba(255,255,255,0.3)', marginTop:1 }}>
              {lead.card_status?.replace(/_/g,' ')} · {timeAgo(lead.updated_at)}
            </div>
          </div>
          <div style={{ width:6, height:6, borderRadius:'50%', flexShrink:0, background: cardStatusColor(lead) }}/>
        </div>
      ))}
    </div>
  )

  return (
    <>
      <Section title="Generate Card" items={pending}   color="#60a5fa"/>
      <Section title="Draft / Q&A"   items={draft}     color="#fbbf24"/>
      <Section title="Submitted"     items={submitted}  color="#a78bfa"/>
      <Section title="Deal Open"     items={selected}   color="#34d399"/>
      <Section title="Closed"        items={closed}     color="#4ade80"/>
      <Section title="Not Selected"  items={rejected}   color="rgba(255,255,255,0.3)"/>
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
