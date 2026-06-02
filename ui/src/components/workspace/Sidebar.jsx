import { useState } from 'react'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { useAuthStore } from '@/store/authStore'
import { Plus, ChevronDown, ChevronRight, Bot, Package, ShoppingCart, Settings, LogOut, Search, User, X } from 'lucide-react'

function timeAgo(d) {
  if (!d) return ''
  const diff = Date.now() - new Date(d).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'now'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

// card_status → badge config
const CARD_STATUS_BADGE = {
  pending:    { label: 'Generate Card', color: '#60a5fa', bg: 'rgba(96,165,250,0.15)' },
  generating: { label: 'Generating…',  color: '#fbbf24', bg: 'rgba(251,191,36,0.15)' },
  draft:      { label: 'Ready to Submit', color: '#34d399', bg: 'rgba(52,211,153,0.15)' },
  qa_open:    { label: 'Q&A Pending',  color: '#fbbf24', bg: 'rgba(251,191,36,0.15)' },
  submitted:  { label: 'Awaiting Buyer', color: '#a78bfa', bg: 'rgba(167,139,250,0.15)' },
  selected:   { label: 'Deal Open',    color: '#4ade80', bg: 'rgba(74,222,128,0.15)' },
  rejected:   { label: 'Rejected',     color: 'rgba(255,255,255,0.3)', bg: 'rgba(255,255,255,0.06)' },
}

function CardStatusBadge({ status }) {
  const cfg = CARD_STATUS_BADGE[status] || { label: status, color: 'rgba(255,255,255,0.4)', bg: 'rgba(255,255,255,0.08)' }
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, borderRadius: 8, padding: '2px 6px',
      color: cfg.color, background: cfg.bg, whiteSpace: 'nowrap'
    }}>
      {cfg.label}
    </span>
  )
}

// Buyer: requirement folder showing supplier cards
function RequirementFolder({ req, leads = [], onNavClick }) {
  const { route, goRequirement, goGeneralChat, expandedRequirements, toggleExpanded } = useWorkspaceStore()
  const isExpanded = expandedRequirements[req.id]
  const isSelected = route.reqId === req.id && !route.leadId && route.view !== 'general_chat'

  const submittedCount = leads.filter(l => l.card_status === 'submitted').length
  const selectedCount  = leads.filter(l => l.card_status === 'selected').length
  const hasNew = leads.some(l => l.card_status === 'submitted')

  return (
    <div style={{ marginBottom: 2 }}>
      <div
        onClick={() => { onNavClick(() => goRequirement(req.id))(); if (leads.length) toggleExpanded(req.id) }}
        className={`sidebar-item ${isSelected ? 'active' : ''}`}
        style={{ paddingRight: 6 }}
      >
        <div style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(96,165,250,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Package size={12} color="#60a5fa" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 130 }}>
              {req.product}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {selectedCount > 0 && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', flexShrink: 0 }} />}
              {hasNew && !selectedCount && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fbbf24', flexShrink: 0 }} />}
              {submittedCount > 0 && (
                <span style={{ background: '#1A8FFF', color: '#fff', fontSize: 9, fontWeight: 800, borderRadius: 10, padding: '1px 5px' }}>
                  {submittedCount}
                </span>
              )}
            </div>
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>
            {req.quantity > 0 ? `${req.quantity} ${req.quantity_unit || 'units'} · ` : ''}{timeAgo(req.created_at)}
            {req.expires_at && <span style={{ color: '#f87171', marginLeft: 4 }}>· exp</span>}
          </div>
        </div>
        {leads.length > 0 && (
          <div onClick={e => { e.stopPropagation(); toggleExpanded(req.id) }} style={{ flexShrink: 0 }}>
            {isExpanded ? <ChevronDown size={12} color="rgba(255,255,255,0.35)" /> : <ChevronRight size={12} color="rgba(255,255,255,0.35)" />}
          </div>
        )}
      </div>

      {isExpanded && (
        <>
          {/* General AI chat sub-item */}
          <div
            className={`sub-item ${route.view === 'general_chat' && route.reqId === req.id ? 'active' : ''}`}
            onClick={onNavClick(() => goGeneralChat(req.id))}
          >
            <Bot size={11} style={{ flexShrink: 0, color: route.view === 'general_chat' && route.reqId === req.id ? '#60a5fa' : 'rgba(255,255,255,0.35)' }} />
            <span style={{ fontSize: 11 }}>Ask AI about this</span>
          </div>

          {/* Supplier cards sub-items */}
          {leads.map(lead => (
            <div key={lead.id}
              className={`sub-item ${route.view === 'requirement' && route.reqId === req.id ? '' : ''}`}
              onClick={onNavClick(() => goRequirement(req.id))}
            >
              <div style={{
                width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background:
                  lead.card_status === 'selected' ? '#4ade80' :
                  lead.card_status === 'submitted' ? '#a78bfa' :
                  lead.card_status === 'draft' ? '#34d399' :
                  lead.card_status === 'qa_open' ? '#fbbf24' : 'rgba(255,255,255,0.2)'
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {lead.supplier_info?.trade_name || `Supplier #${lead.supplier_id}`}
                </div>
              </div>
              <CardStatusBadge status={lead.card_status} />
            </div>
          ))}
        </>
      )}
    </div>
  )
}

// Seller: leads grouped by card_status
function SellerLeadGroup({ leads, onNavClick }) {
  const { route, goLead } = useWorkspaceStore()

  const newLeads     = leads.filter(l => l.card_status === 'pending')
  const draftLeads   = leads.filter(l => l.card_status === 'draft' || l.card_status === 'qa_open')
  const submitted    = leads.filter(l => l.card_status === 'submitted')
  const selected     = leads.filter(l => l.card_status === 'selected')
  const rejected     = leads.filter(l => l.card_status === 'rejected')
  const generating   = leads.filter(l => l.card_status === 'generating')

  const Section = ({ title, items, color, dim }) => items.length === 0 ? null : (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '4px 8px' }}>
        <span style={{ color }}>{title}</span> ({items.length})
      </div>
      {items.map(lead => (
        <div key={lead.id}
          className={`sidebar-item ${route.view === 'lead' && route.leadId === lead.id ? 'active' : ''}`}
          onClick={onNavClick(() => goLead(lead.id))}
          style={{ opacity: dim ? 0.5 : 1 }}
        >
          <div style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(167,139,250,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ShoppingCart size={12} color="#a78bfa" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {lead.requirement?.product || `Lead #${lead.id}`}
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>
              {lead.buyer_info?.trade_name || `Buyer #${lead.buyer_id}`} · {timeAgo(lead.updated_at || lead.created_at)}
            </div>
          </div>
          <CardStatusBadge status={lead.card_status} />
        </div>
      ))}
    </div>
  )

  return (
    <>
      <Section title="New Leads"   items={newLeads}   color="#60a5fa" />
      <Section title="Generating"  items={generating} color="#fbbf24" />
      <Section title="Draft"       items={draftLeads} color="#34d399" />
      <Section title="Submitted"   items={submitted}  color="#a78bfa" />
      <Section title="Deal Open"   items={selected}   color="#4ade80" />
      <Section title="Rejected"    items={rejected}   color="rgba(255,255,255,0.3)" dim />
    </>
  )
}

export default function Sidebar({ buyerRequirements, leadsByRequirement, sellerLeads, loading, isOpen, onClose }) {
  const { sidebarTab, setSidebarTab, goNewReq, goProfile, goSettings, route } = useWorkspaceStore()
  const { logout } = useAuthStore()
  const [search, setSearch] = useState('')

  const filteredReqs   = buyerRequirements.filter(r => r.product?.toLowerCase().includes(search.toLowerCase()))
  const filteredSeller = sellerLeads.filter(l =>
    String(l.id).includes(search) ||
    (l.requirement?.product || '').toLowerCase().includes(search.toLowerCase())
  )

  const handleNavClick = (callback) => {
    return () => {
      callback()
      if (window.innerWidth <= 768) onClose()
    }
  }

  return (
    <div className={`sidebar ${isOpen ? 'mobile-open' : ''}`}>
      {/* Logo + New */}
      <div style={{ padding: '14px 12px 10px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 19, fontWeight: 900, letterSpacing: '-0.5px', background: 'linear-gradient(135deg,#fff,#93c5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Bisdom
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button onClick={handleNavClick(goNewReq)} title="New requirement"
              style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(96,165,250,0.15)', border: '1px solid rgba(96,165,250,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <Plus size={15} color="#60a5fa" />
            </button>
            <button onClick={onClose} className="mobile-close-btn" title="Close sidebar"
              style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', display: 'none', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <X size={15} color="rgba(255,255,255,0.6)" />
            </button>
          </div>
        </div>
        <div style={{ position: 'relative' }}>
          <Search size={12} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
          <input className="bisdom-input" value={search} onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 28, fontSize: 12, padding: '7px 10px 7px 28px' }} placeholder="Search…" />
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', padding: '7px 10px', gap: 6, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        {[['buying', 'Buying'], ['selling', 'Selling']].map(([key, label]) => (
          <button key={key} onClick={() => setSidebarTab(key)}
            style={{
              flex: 1, padding: '6px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, fontFamily: 'Montserrat,sans-serif', transition: 'all 0.2s',
              background: sidebarTab === key ? 'rgba(96,165,250,0.2)' : 'transparent',
              color: sidebarTab === key ? '#60a5fa' : 'rgba(255,255,255,0.4)',
            }}>
            {label}
            {key === 'buying'  && buyerRequirements.length > 0 && <span style={{ marginLeft: 4, fontSize: 9, opacity: 0.7 }}>({buyerRequirements.length})</span>}
            {key === 'selling' && sellerLeads.length > 0 && <span style={{ marginLeft: 4, fontSize: 9, opacity: 0.7 }}>({sellerLeads.length})</span>}
          </button>
        ))}
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 6px' }}>
        {loading && <div style={{ textAlign: 'center', padding: 20, color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>Loading…</div>}

        {!loading && sidebarTab === 'buying' && (
          filteredReqs.length === 0
            ? <div style={{ textAlign: 'center', padding: '20px 12px', color: 'rgba(255,255,255,0.25)', fontSize: 12 }}>
                No requirements yet.<br />
                <span style={{ color: '#60a5fa', cursor: 'pointer' }} onClick={handleNavClick(goNewReq)}>+ Post one</span>
              </div>
            : filteredReqs.map(req => (
              <RequirementFolder key={req.id} req={req} leads={leadsByRequirement[req.id] || []} onNavClick={handleNavClick} />
            ))
        )}

        {!loading && sidebarTab === 'selling' && (
          filteredSeller.length === 0
            ? <div style={{ textAlign: 'center', padding: '20px 12px', color: 'rgba(255,255,255,0.25)', fontSize: 12 }}>
                No leads yet.<br />Complete your supplier profile.
              </div>
            : <SellerLeadGroup leads={filteredSeller} onNavClick={handleNavClick} />
        )}
      </div>

      {/* Bottom */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div className={`sidebar-item ${route.view === 'profile' ? 'active' : ''}`} onClick={handleNavClick(goProfile)} style={{ fontSize: 12 }}>
          <User size={14} /> Profile
        </div>
        <div className={`sidebar-item ${route.view === 'settings' ? 'active' : ''}`} onClick={handleNavClick(goSettings)} style={{ fontSize: 12 }}>
          <Settings size={14} /> Settings
        </div>
        <div className="sidebar-item" onClick={handleNavClick(() => { logout(); window.location.href = '/login' })} style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
          <LogOut size={14} /> Sign out
        </div>
      </div>
    </div>
  )
}
