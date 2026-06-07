import { useState, useEffect } from 'react'
import { getPendingActions } from '@/api/conversations'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { ChevronRight, Zap, ThumbsDown, CheckCircle, X, Clock, Send, Shield, MessageSquare, AlertTriangle } from 'lucide-react'

const STORAGE_KEY = 'bisdom_dismissed_actions'

function getDismissed() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw)
  } catch { return {} }
}

function setDismissed(dismissed) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(dismissed))
}

const CATEGORIES = {
  buyer: {
    final_decision: {
      title: 'Final Decision',
      color: '#f59e0b',
      bg: 'rgba(245,158,11,0.06)',
      border: 'rgba(245,158,11,0.18)',
      icon: <Shield size={14} color="#f59e0b"/>,
      actions: ['buyer_decision'],
    },
    reply_needed: {
      title: 'Reply Needed',
      color: '#3b82f6',
      bg: 'rgba(59,130,246,0.06)',
      border: 'rgba(59,130,246,0.18)',
      icon: <MessageSquare size={14} color="#3b82f6"/>,
      actions: ['supplier_respond'],
    },
    declined: {
      title: 'Declined',
      color: '#ef4444',
      bg: 'rgba(239,68,68,0.04)',
      border: 'rgba(239,68,68,0.12)',
      icon: <ThumbsDown size={14} color="#ef4444"/>,
      actions: ['supplier_declined'],
    },
  },
  supplier: {
    submit_offer: {
      title: 'Submit Final Offer',
      color: '#a78bfa',
      bg: 'rgba(167,139,250,0.06)',
      border: 'rgba(167,139,250,0.18)',
      icon: <Zap size={14} color="#a78bfa"/>,
      actions: ['supplier_approve_offer'],
    },
    buyer_waiting: {
      title: 'Buyer Approval Waiting',
      color: '#f59e0b',
      bg: 'rgba(245,158,11,0.06)',
      border: 'rgba(245,158,11,0.18)',
      icon: <Clock size={14} color="#f59e0b"/>,
      actions: ['supplier_confirm'],
    },
    respond: {
      title: 'Response Needed',
      color: '#3b82f6',
      bg: 'rgba(59,130,246,0.06)',
      border: 'rgba(59,130,246,0.18)',
      icon: <MessageSquare size={14} color="#3b82f6"/>,
      actions: ['supplier_respond'],
    },
  },
}

function ActionItem({ item, meta, onNavigate, onDismiss }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '9px 10px', borderRadius: 8,
      cursor: 'pointer', transition: 'background 0.15s',
      background: 'rgba(255,255,255,0.02)',
    }}
      onClick={() => onNavigate(item)}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
      onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.85)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
        }}>
          {item.product || `Lead #${item.lead_id}`}
        </div>
        {item.current_offer_price && (
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
            ₹{item.current_offer_price.toLocaleString()}/unit
          </div>
        )}
      </div>
      <button
        onClick={e => { e.stopPropagation(); onDismiss(item) }}
        style={{
          width: 20, height: 20, borderRadius: 5, border: 'none',
          background: 'rgba(255,255,255,0.06)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}
        title="Dismiss"
      >
        <X size={10} color="rgba(255,255,255,0.3)"/>
      </button>
      <ChevronRight size={11} color="rgba(255,255,255,0.2)" style={{ flexShrink: 0 }}/>
    </div>
  )
}

function CategoryGroup({ category, items, onNavigate, onDismiss }) {
  if (items.length === 0) return null

  return (
    <div style={{
      margin: '0 8px 10px',
      background: category.bg,
      border: `1px solid ${category.border}`,
      borderRadius: 10, overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 12px 6px',
      }}>
        <div style={{
          width: 24, height: 24, borderRadius: 6, flexShrink: 0,
          background: `${category.color}18`, border: `1px solid ${category.color}25`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {category.icon}
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color: category.color, letterSpacing: '0.02em' }}>
          {category.title}
        </span>
        <span style={{
          fontSize: 9, fontWeight: 700, color: category.color,
          background: `${category.color}15`, borderRadius: 8, padding: '2px 6px',
          marginLeft: 'auto',
        }}>
          {items.length}
        </span>
      </div>
      <div style={{ padding: '2px 6px 6px' }}>
        {items.map(item => (
          <ActionItem
            key={item.lead_id}
            item={item}
            onNavigate={onNavigate}
            onDismiss={onDismiss}
          />
        ))}
      </div>
    </div>
  )
}

export default function ActionsWidget({ refreshKey }) {
  const [pending, setPending] = useState([])
  const [dismissed, setDismissedState] = useState(getDismissed)
  const { goChat, goLead } = useWorkspaceStore()

  const load = async () => {
    try {
      const res = await getPendingActions()
      const items = res.data.pending || []
      setPending(items)

      // Auto-clean dismissed entries that no longer exist in pending
      const currentIds = new Set(items.map(i => `${i.lead_id}_${i.action}`))
      const updated = { ...getDismissed() }
      let changed = false
      for (const key of Object.keys(updated)) {
        if (!currentIds.has(key)) {
          delete updated[key]
          changed = true
        }
      }
      if (changed) {
        setDismissed(updated)
        setDismissedState(updated)
      }
    } catch {}
  }

  useEffect(() => { load() }, [refreshKey])
  useEffect(() => {
    const t = setInterval(load, 20000)
    return () => clearInterval(t)
  }, [])

  const navigate = (item) => {
    const isSupplierAction = ['supplier_confirm', 'supplier_respond', 'supplier_approve_offer'].includes(item.action)
    if (isSupplierAction) {
      goLead(item.lead_id)
    } else {
      goChat(item.requirement_id, item.lead_id)
    }
  }

  const dismiss = (item) => {
    const key = `${item.lead_id}_${item.action}`
    const updated = { ...dismissed, [key]: Date.now() }
    setDismissed(updated)
    setDismissedState(updated)
  }

  const clearAll = () => {
    const updated = { ...dismissed }
    active.forEach(item => {
      updated[`${item.lead_id}_${item.action}`] = Date.now()
    })
    setDismissed(updated)
    setDismissedState(updated)
  }

  const active = pending.filter(item => !dismissed[`${item.lead_id}_${item.action}`])
  const activeCount = active.length

  // Determine if user is buyer or supplier based on action types
  const hasSupplierActions = active.some(i =>
    ['supplier_confirm', 'supplier_respond', 'supplier_approve_offer'].includes(i.action)
  )
  const hasBuyerActions = active.some(i =>
    ['buyer_decision', 'supplier_declined'].includes(i.action)
  )

  // Group items into categories
  const categorized = []

  if (hasBuyerActions) {
    for (const [key, cat] of Object.entries(CATEGORIES.buyer)) {
      const items = active.filter(i => cat.actions.includes(i.action))
      if (items.length > 0) categorized.push({ key: `buyer_${key}`, category: cat, items })
    }
  }

  if (hasSupplierActions) {
    for (const [key, cat] of Object.entries(CATEGORIES.supplier)) {
      const items = active.filter(i => cat.actions.includes(i.action))
      if (items.length > 0) categorized.push({ key: `supplier_${key}`, category: cat, items })
    }
  }

  // Items that don't fit any category
  const categorizedIds = new Set(categorized.flatMap(c => c.items.map(i => i.lead_id)))
  const uncategorized = active.filter(i => !categorizedIds.has(i.lead_id))
  if (uncategorized.length > 0) {
    categorized.push({
      key: 'other',
      category: {
        title: 'Other',
        color: '#64748b',
        bg: 'rgba(100,116,139,0.06)',
        border: 'rgba(100,116,139,0.15)',
        icon: <AlertTriangle size={14} color="#64748b"/>,
      },
      items: uncategorized,
    })
  }

  return (
    <div className="actions-panel-wrapper">
      {/* Header */}
      <div style={{
        padding: '14px 14px 10px',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={13} color={activeCount > 0 ? '#f59e0b' : 'rgba(255,255,255,0.3)'}/>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Actions</span>
          {activeCount > 0 && (
            <span style={{
              background: 'rgba(245,158,11,0.15)', color: '#f59e0b',
              fontSize: 9, fontWeight: 800, borderRadius: 10, padding: '2px 7px',
            }}>
              {activeCount}
            </span>
          )}
        </div>
        {activeCount > 0 && (
          <button onClick={clearAll} style={{
            fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.35)',
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '4px 8px', borderRadius: 5,
          }}>
            Clear all
          </button>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {activeCount === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 16px' }}>
            <CheckCircle size={24} color="rgba(255,255,255,0.08)" style={{ margin: '0 auto 10px' }}/>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', fontWeight: 500 }}>All caught up</div>
          </div>
        ) : (
          categorized.map(({ key, category, items }) => (
            <CategoryGroup
              key={key}
              category={category}
              items={items}
              onNavigate={navigate}
              onDismiss={dismiss}
            />
          ))
        )}
      </div>
    </div>
  )
}
