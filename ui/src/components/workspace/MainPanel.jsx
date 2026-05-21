import { useWorkspaceStore } from '@/store/workspaceStore'
import { Menu } from 'lucide-react'
import NewRequirementChat from './NewRequirementChat'
import RequirementOverview from './RequirementOverview'
import ConversationView from './ConversationView'
import WelcomeScreen from './WelcomeScreen'
import ProfilePanel from './ProfileEditorV4'
import SettingsPanel from './SettingsPanel'
import GeneralReqChat from './GeneralReqChat'

export default function MainPanel({ buyerRequirements, leadsByRequirement, sellerLeads, onToggleSidebar }) {
  const { route } = useWorkspaceStore()

  const renderContent = () => {
  switch (route.view) {
    case 'profile':         return <ProfilePanel />
    case 'settings':        return <SettingsPanel />
    case 'new_requirement': return <NewRequirementChat />
    case 'chat':            return <ConversationView leadId={route.leadId} />
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
