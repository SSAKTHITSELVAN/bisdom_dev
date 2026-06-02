import { useState, useEffect } from 'react'
import { getActionsNeeded } from '@/api/cards'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { Bell, CheckCircle, FileText, MessageSquare, Send, RefreshCw, ChevronRight, Zap } from 'lucide-react'

const ACTION_CONFIG = {
  generate_card: {
    label: 'Generate Card',
    description: 'New lead — create your offer',
    icon: Zap,
    color: '#60a5fa',
    bg: 'rgba(96,165,250,0.08)',
    border: 'rgba(96,165,250,0.2)',
  },
  card_ready: {
    label: 'Review Cards',
    description: 'Supplier submitted an offer',
    icon: FileText,
    color: '#a78bfa',
    bg: 'rgba(167,139,250,0.08)',
    border: 'rgba(167,139,250,0.2)',
  },
  qa_pending: {
    label: 'Answer Questions',
    description: 'Supplier has questions',
    icon: MessageSquare,
    color: '#fbbf24',
    bg: 'rgba(251,191,36,0.08)',
    border: 'rgba(251,191,36,0.2)',
  },
  submit_card: {
    label: 'Submit Card',
    description: 'All questions answered',
    icon: Send,
    color: '#34d399',
    bg: 'rgba(52,211,153,0.08)',
    border: 'rgba(52,211,153,0.2)',
  },
}

export default function ActionsPanel() {
  const [actions, setActions] = useState([])
  const [loading, setLoading] = useState(true)
  const { goRequirement, goLead, refreshKey } = useWorkspaceStore()

  const fetchActions = async () => {
    try {
      const res = await getActionsNeeded()
      setActions(res.data || [])
    } catch {
      // silently ignore polling errors
    }
    setLoading(false)
  }

  useEffect(() => { fetchActions() }, [refreshKey])

  useEffect(() => {
    const timer = setInterval(fetchActions, 30000)
    return () => clearInterval(timer)
  }, [])

  const handleAction = (action) => {
    if (action.action_type === 'card_ready' || action.action_type === 'qa_pending') {
      goRequirement(action.requirement_id)
    } else {
      goLead(action.lead_id)
    }
  }

  if (loading && actions.length === 0) {
    return (
      <div className="actions-panel-sidebar" style={{
        width: 280, borderLeft: '1px solid rgba(255,255,255,0.06)',
        background: '#0b1526', display: 'flex', flexDirection: 'column', padding: '20px 16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Bell size={14} color="rgba(255,255,255,0.4)" />
          <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>Actions</span>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <RefreshCw size={16} color="rgba(255,255,255,0.2)" className="spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="actions-panel-sidebar" style={{
      width: 280, borderLeft: '1px solid rgba(255,255,255,0.06)',
      background: '#0b1526', display: 'flex', flexDirection: 'column', overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Bell size={14} color="rgba(255,255,255,0.5)" />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Actions Needed</span>
          {actions.length > 0 && (
            <span style={{
              fontSize: 10, fontWeight: 700, color: '#fff',
              background: 'linear-gradient(135deg,#ef4444,#f97316)',
              borderRadius: 10, padding: '2px 7px',
            }}>
              {actions.length}
            </span>
          )}
        </div>
        <button onClick={fetchActions} style={{
          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
          width: 26, height: 26, borderRadius: 6, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <RefreshCw size={11} color="rgba(255,255,255,0.4)" />
        </button>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
        {actions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 16px' }}>
            <CheckCircle size={28} color="rgba(255,255,255,0.1)" style={{ margin: '0 auto 12px' }} />
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontWeight: 500 }}>All caught up!</p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', marginTop: 4 }}>No pending actions</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {actions.map((action, i) => {
              const cfg = ACTION_CONFIG[action.action_type] || ACTION_CONFIG.generate_card
              const Icon = cfg.icon
              return (
                <button key={`${action.lead_id}-${i}`} onClick={() => handleAction(action)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '12px', background: cfg.bg,
                    border: `1px solid ${cfg.border}`, borderRadius: 10,
                    cursor: 'pointer', width: '100%',
                    fontFamily: 'Montserrat,sans-serif', textAlign: 'left', transition: 'all 0.15s'
                  }}
                >
                  <div style={{
                    width: 30, height: 30, borderRadius: 7, flexShrink: 0,
                    background: `${cfg.color}20`, border: `1px solid ${cfg.color}30`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <Icon size={14} color={cfg.color} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#fff', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {action.product || 'Lead #' + action.lead_id}
                    </p>
                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', margin: '2px 0 0' }}>
                      {action.counterpart_name || cfg.description}
                    </p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: cfg.color, textTransform: 'uppercase' }}>
                      {cfg.label}
                    </span>
                    <ChevronRight size={12} color="rgba(255,255,255,0.3)" />
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
