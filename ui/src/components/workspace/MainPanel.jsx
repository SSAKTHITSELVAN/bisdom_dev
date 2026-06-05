import { useState } from 'react'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { useAuthStore } from '@/store/authStore'
import { Menu, Bell } from 'lucide-react'
import NewRequirementChat from './NewRequirementChat'
import RequirementOverview from './RequirementOverview'
import WelcomeScreen from './WelcomeScreen'
import ProfilePanel from './ProfileEditorV4'
import SettingsPanel from './SettingsPanel'
import GeneralReqChat from './GeneralReqChat'
import DealChat from './DealChat'
import ConversationView from './ConversationView'

export default function MainPanel({ buyerRequirements, leadsByRequirement, sellerLeads, onToggleSidebar, pendingCount = 0 }) {
  const { route } = useWorkspaceStore()
  const { user } = useAuthStore()

  const renderContent = () => {
    switch (route.view) {
      // Chat views — they manage their own flex/scroll layout
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

      // Scrollable views — wrap in overflow container
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
      {/* Mobile header: hamburger (left) | Bisdom (center) | notifications (right) */}
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
          onClick={() => {}}
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

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {renderContent()}
      </div>
    </div>
  )
}
