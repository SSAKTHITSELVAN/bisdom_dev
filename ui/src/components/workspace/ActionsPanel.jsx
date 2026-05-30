import { useState, useEffect } from 'react'
import { getActionsNeeded } from '@/api/leads'
import { useWorkspaceStore } from '@/store/workspaceStore'
import {
  Bell, CheckCircle, MessageSquare, Clock, ChevronRight, RefreshCw, AlertTriangle
} from 'lucide-react'

const ACTION_CONFIG = {
  supplier_confirm: {
    label: 'Confirm Deal',
    description: 'Buyer shortlisted you',
    icon: CheckCircle,
    color: '#8b5cf6',
    bg: 'rgba(139,92,246,0.1)',
    border: 'rgba(139,92,246,0.25)',
  },
  buyer_decide: {
    label: 'Decision Needed',
    description: 'AI paused for your input',
    icon: AlertTriangle,
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.08)',
    border: 'rgba(245,158,11,0.2)',
  },
  response_needed: {
    label: 'Response Needed',
    description: 'Awaiting your input',
    icon: MessageSquare,
    color: '#3b82f6',
    bg: 'rgba(59,130,246,0.08)',
    border: 'rgba(59,130,246,0.2)',
  },
}

export default function ActionsPanel() {
  const [actions, setActions] = useState([])
  const [loading, setLoading] = useState(true)
  const { goChat, refreshKey } = useWorkspaceStore()

  const fetchActions = async () => {
    try {
      const res = await getActionsNeeded()
      setActions(res.data || [])
    } catch {}
    setLoading(false)
  }

  useEffect(() => { fetchActions() }, [refreshKey])

  // Poll every 30s for new actions
  useEffect(() => {
    const timer = setInterval(fetchActions, 30000)
    return () => clearInterval(timer)
  }, [])

  if (loading && actions.length === 0) {
    return (
      <div className="actions-panel-sidebar" style={{
        width: 280, borderLeft: '1px solid rgba(255,255,255,0.06)',
        background: '#0b1526', display: 'flex', flexDirection: 'column',
        padding: '20px 16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Bell size={14} color="rgba(255,255,255,0.4)"/>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>Actions</span>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <RefreshCw size={16} color="rgba(255,255,255,0.2)" className="spin"/>
        </div>
      </div>
    )
  }

  return (
    <div className="actions-panel-sidebar" style={{
      width: 280, borderLeft: '1px solid rgba(255,255,255,0.06)',
      background: '#0b1526', display: 'flex', flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Bell size={14} color="rgba(255,255,255,0.5)"/>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Actions Needed</span>
          {actions.length > 0 && (
            <span style={{
              fontSize: 10, fontWeight: 700, color: '#fff',
              background: 'linear-gradient(135deg, #ef4444, #f97316)',
              borderRadius: 10, padding: '2px 7px', minWidth: 16, textAlign: 'center'
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
          <RefreshCw size={11} color="rgba(255,255,255,0.4)"/>
        </button>
      </div>

      {/* Actions list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
        {actions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 16px' }}>
            <CheckCircle size={28} color="rgba(255,255,255,0.1)" style={{ margin: '0 auto 12px' }}/>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontWeight: 500 }}>
              All caught up!
            </p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', marginTop: 4 }}>
              No pending actions right now
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {actions.map(action => {
              const config = ACTION_CONFIG[action.action_type] || ACTION_CONFIG.response_needed
              const Icon = config.icon
              return (
                <button
                  key={action.lead_id}
                  onClick={() => goChat(action.requirement_id, action.lead_id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '12px 12px', background: config.bg,
                    border: `1px solid ${config.border}`,
                    borderRadius: 10, cursor: 'pointer', width: '100%',
                    fontFamily: 'Inter,system-ui,sans-serif', textAlign: 'left',
                    transition: 'all 0.15s'
                  }}
                >
                  <div style={{
                    width: 30, height: 30, borderRadius: 7, flexShrink: 0,
                    background: `${config.color}20`, border: `1px solid ${config.color}30`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <Icon size={14} color={config.color}/>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#fff', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {action.counterpart_name || 'Unknown'}
                    </p>
                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', margin: '2px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {action.product || config.description}
                    </p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                    <span style={{ fontSize: 9, fontWeight: 600, color: config.color, textTransform: 'uppercase' }}>
                      {config.label}
                    </span>
                    <ChevronRight size={12} color="rgba(255,255,255,0.3)"/>
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
