import { useState } from 'react'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { useAuthStore } from '@/store/authStore'
import { Menu, MessageCircle, CreditCard } from 'lucide-react'
import NewRequirementChat from './NewRequirementChat'
import RequirementOverview from './RequirementOverview'
import WelcomeScreen from './WelcomeScreen'
import ProfilePanel from './ProfileEditorV4'
import SettingsPanel from './SettingsPanel'
import GeneralReqChat from './GeneralReqChat'
import SupplierLeadsPanel from './SupplierLeadsPanel'
import DealChat from './DealChat'
import ConversationView from './ConversationView'

function SupplierLeadWithChat({ lead }) {
  const [tab, setTab] = useState('chat')

  const tabStyle = (active) => ({
    flex: 1, padding: '10px 0', fontSize: 12, fontWeight: 700,
    fontFamily: 'Montserrat,sans-serif', cursor: 'pointer',
    background: active ? 'rgba(96,165,250,0.15)' : 'transparent',
    color: active ? '#60a5fa' : 'rgba(255,255,255,0.4)',
    border: 'none', borderBottom: active ? '2px solid #60a5fa' : '2px solid transparent',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    transition: 'all 0.2s',
  })

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <button onClick={() => setTab('chat')} style={tabStyle(tab === 'chat')}>
          <MessageCircle size={14} /> Chat
        </button>
        <button onClick={() => setTab('card')} style={tabStyle(tab === 'card')}>
          <CreditCard size={14} /> Card
        </button>
      </div>
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
        {tab === 'chat' ? <ConversationView leadId={lead.id} /> : <SupplierLeadsPanel lead={lead} />}
      </div>
    </div>
  )
}

export default function MainPanel({ buyerRequirements, leadsByRequirement, sellerLeads, onToggleSidebar }) {
  const { route } = useWorkspaceStore()
  const { user } = useAuthStore()

  const renderContent = () => {
    switch (route.view) {
      case 'profile':         return <ProfilePanel />
      case 'settings':        return <SettingsPanel />
      case 'new_requirement': return <NewRequirementChat />

      // Supplier: view their lead — chat + card tabs
      case 'lead': {
        const lead = sellerLeads.find(l => l.id === route.leadId)
        if (!lead) return <WelcomeScreen />
        // If deal is open/closed, show deal chat directly
        if (['deal_open', 'deal_closed'].includes(lead.status) || lead.card_status === 'selected') {
          return <DealChat lead={lead} />
        }
        return <SupplierLeadWithChat lead={lead} />
      }

      // Deal chat (after selection)
      case 'deal_chat': {
        const lead = sellerLeads.find(l => l.id === route.leadId)
          || Object.values(leadsByRequirement).flat().find(l => l.id === route.leadId)
        if (!lead) return <WelcomeScreen />
        return <DealChat lead={lead} conversationId={route.convId || lead.conversation?.id} />
      }

      // Buyer: view conversation with a specific supplier under a requirement
      case 'chat': {
        const leads = leadsByRequirement[route.reqId] || []
        const lead = leads.find(l => l.id === route.leadId)
        if (!lead) return <WelcomeScreen />
        return <DealChat lead={lead} conversationId={lead.conversation?.id} />
      }

      case 'general_chat': {
        const req = buyerRequirements.find(r => r.id === route.reqId)
        const leads = leadsByRequirement[route.reqId] || []
        return <GeneralReqChat req={req} leads={leads} />
      }

      case 'requirement': {
        const req = buyerRequirements.find(r => r.id === route.reqId)
        const leads = leadsByRequirement[route.reqId] || []
        return <RequirementOverview req={req} leads={leads} />
      }

      default: return <WelcomeScreen />
    }
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
      {/* Mobile header with hamburger */}
      <div className="mobile-header" style={{
        display: 'none',
        alignItems: 'center',
        gap: 12,
        padding: '12px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        background: '#0d1f3c',
      }}>
        <button
          onClick={onToggleSidebar}
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <Menu size={18} color="rgba(255,255,255,0.8)" />
        </button>
        <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.3px', background: 'linear-gradient(135deg,#fff,#93c5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Bisdom
        </span>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {renderContent()}
      </div>
    </div>
  )
}
