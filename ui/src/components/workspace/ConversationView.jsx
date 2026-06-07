import { useState, useEffect, useRef } from 'react'
import { getConvByLead, sendMessage, toggleChat, buyerDecision, supplierConfirm, supplierOfferApproval, suggestResponse } from '@/api/conversations'
import { getLead, getCounterpart } from '@/api/leads'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { useAuthStore } from '@/store/authStore'
import StatusBadge from '@/components/ui/StatusBadge'
import Spinner from '@/components/ui/Spinner'
import toast from 'react-hot-toast'
import {
  Send, Bot, User, AlertTriangle, CheckCircle,
  RefreshCw, ChevronLeft, ToggleLeft, ToggleRight, X,
  Sparkles, MessageSquare, Zap, Package, ThumbsUp, ThumbsDown, Clock, Shield
} from 'lucide-react'

function getRoles(isBuyer, counterpartName) {
  const other = counterpartName || (isBuyer ? 'Supplier' : 'Buyer')
  return {
    ai_buyer:      { label: isBuyer ? 'You (AI)' : other,     color:'#3b82f6', isAI:true  },
    ai_supplier:   { label: isBuyer ? other : 'You (AI)',      color:'#8b5cf6', isAI:true  },
    human_buyer:   { label: isBuyer ? 'You' : other,           color:'#10b981', isAI:false },
    human_supplier:{ label: isBuyer ? other : 'You',           color:'#f59e0b', isAI:false },
    system:        { label:'System',                            color:'#64748b', isAI:false },
  }
}

function Bubble({ msg, isBuyer, counterpartName }) {
  const roles = getRoles(isBuyer, counterpartName)
  const role = roles[msg.role] || { label:msg.role, color:'#64748b', isAI:false }
  const isMine = isBuyer
    ? (msg.role === 'human_buyer' || msg.role === 'ai_buyer')
    : (msg.role === 'human_supplier' || msg.role === 'ai_supplier')

  if (msg.role === 'system') return (
    <div style={{ display:'flex', justifyContent:'center', margin:'16px 0' }}>
      <div style={{
        fontSize:11, color:'rgba(255,255,255,0.35)', background:'rgba(255,255,255,0.04)',
        padding:'6px 14px', borderRadius:16, border:'1px solid rgba(255,255,255,0.06)'
      }}>
        {msg.content}
      </div>
    </div>
  )

  return (
    <div style={{ display:'flex', justifyContent: isMine ? 'flex-end' : 'flex-start', marginBottom:12 }} className="fade-in">
      <div style={{ maxWidth:'75%', display:'flex', flexDirection:'column', alignItems: isMine ? 'flex-end' : 'flex-start' }}>
        {/* Label above bubble */}
        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4, paddingLeft: isMine ? 0 : 8, paddingRight: isMine ? 8 : 0 }}>
          {!isMine && (
            <div style={{
              width:20, height:20, borderRadius:6, flexShrink:0,
              background: role.color+'15', border:`1px solid ${role.color}30`,
              display:'flex', alignItems:'center', justifyContent:'center'
            }}>
              {role.isAI ? <Bot size={10} style={{color:role.color}}/> : <User size={10} style={{color:role.color}}/>}
            </div>
          )}
          <span style={{ fontSize:10, fontWeight:600, color:role.color }}>{role.label}</span>
          <span style={{ fontSize:9, color:'rgba(255,255,255,0.25)' }}>
            {new Date(msg.created_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}
          </span>
        </div>

        {/* Message bubble */}
        <div style={{
          background: isMine
            ? 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)'
            : 'rgba(255,255,255,0.06)',
          border: isMine ? 'none' : '1px solid rgba(255,255,255,0.08)',
          borderRadius: isMine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
          padding:'12px 16px',
          boxShadow: isMine ? '0 2px 8px rgba(30,58,138,0.3)' : '0 1px 4px rgba(0,0,0,0.2)'
        }}>
          <p style={{ fontSize:13, lineHeight:1.6, color:'rgba(255,255,255,0.95)', whiteSpace:'pre-wrap', margin:0 }}>
            {msg.content}
          </p>

          {msg.structured_data?.offer && Object.keys(msg.structured_data.offer).length > 0 && (
            <div style={{
              marginTop:10, background:'rgba(255,255,255,0.08)',
              border:'1px solid rgba(255,255,255,0.12)', borderRadius:10, padding:10
            }}>
              <p style={{ fontSize:9, fontWeight:700, color:'rgba(255,255,255,0.6)', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.05em' }}>
                Offer Details
              </p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                {Object.entries(msg.structured_data.offer).map(([k,v]) => (
                  <div key={k}>
                    <p style={{ fontSize:9, color:'rgba(255,255,255,0.45)', textTransform:'capitalize', marginBottom:2 }}>{k.replace(/_/g,' ')}</p>
                    <p style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.95)', margin:0 }}>{typeof v === 'number' ? `₹${v.toLocaleString()}` : v}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


function BuyerOfferBar({ lead, loading, act }) {
  const [showCounter, setShowCounter] = useState(false)
  const [counterPrice, setCounterPrice] = useState('')
  const [counterMsg, setCounterMsg] = useState('')

  const handleCounter = () => {
    const price = parseFloat(counterPrice)
    if (!price || price <= 0) return
    act(
      buyerDecision,
      { lead_id: lead.id, action: 'counter', counter_price: price, counter_message: counterMsg || `Can you do ₹${price}/unit?` },
      'Counter sent to supplier'
    )
  }

  if (showCounter) {
    return (
      <div style={{ margin: '8px 12px 0', padding: '14px 16px', background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <RefreshCw size={15} color="#3b82f6"/>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', margin: 0 }}>Counter Offer</p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: '2px 0 0' }}>
              Their price: ₹{lead.current_offer_price?.toLocaleString()}/unit
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 4, display: 'block' }}>Your price (₹/unit)</label>
            <input
              type="number"
              value={counterPrice}
              onChange={e => setCounterPrice(e.target.value)}
              placeholder="e.g. 130"
              style={{ width: '100%', padding: '10px 12px', fontSize: 13, fontWeight: 600, borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', outline: 'none', fontFamily: 'Inter,system-ui,sans-serif', boxSizing: 'border-box' }}
            />
          </div>
        </div>
        <input
          value={counterMsg}
          onChange={e => setCounterMsg(e.target.value)}
          placeholder="Optional message (e.g. We can pay upfront)"
          style={{ width: '100%', padding: '10px 12px', fontSize: 12, borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', outline: 'none', fontFamily: 'Inter,system-ui,sans-serif', marginBottom: 12, boxSizing: 'border-box' }}
        />
        <div style={{ display: 'flex', gap: 8 }}>
          <button disabled={!counterPrice || loading} onClick={handleCounter}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: counterPrice ? 'linear-gradient(135deg,#1d4ed8,#3b82f6)' : 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 8, cursor: counterPrice && !loading ? 'pointer' : 'default' }}>
            <Send size={13} color={counterPrice ? '#fff' : 'rgba(255,255,255,0.3)'}/>
            <span style={{ fontSize: 12, fontWeight: 700, color: counterPrice ? '#fff' : 'rgba(255,255,255,0.3)' }}>Send Counter</span>
          </button>
          <button onClick={() => setShowCounter(false)}
            style={{ padding: '9px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, cursor: 'pointer' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.4)' }}>Cancel</span>
          </button>
        </div>
      </div>
    )
  }

  const actionBtn = (gradient, outline) => ({
    display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
    background: gradient, border: outline ? `1px solid ${outline}` : 'none',
    borderRadius: 8, cursor: loading ? 'wait' : 'pointer',
    fontFamily: 'Inter,system-ui,sans-serif', flexShrink: 0
  })

  return (
    <div style={{
      margin: '8px 12px 0', padding: '12px 14px',
      background: 'linear-gradient(135deg,rgba(16,185,129,0.08),rgba(59,130,246,0.06))',
      border: '1px solid rgba(16,185,129,0.25)', borderRadius: 12,
      display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap'
    }}>
      <div style={{ width: 36, height: 36, borderRadius: 9, flexShrink: 0, background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Shield size={16} color="#10b981"/>
      </div>
      <div style={{ flex: 1, minWidth: 140 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', margin: 0 }}>Final offer from supplier</p>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', margin: '2px 0 0' }}>
          {lead.current_offer_price ? `₹${lead.current_offer_price.toLocaleString()}/unit` : 'Review the offer above'}
        </p>
      </div>
      <button disabled={loading} onClick={() => act(buyerDecision, {lead_id:lead.id, action:'accept'}, '🎉 Deal closed!')} style={actionBtn('linear-gradient(135deg,#059669,#10b981)')}>
        <ThumbsUp size={13} color="#fff"/>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>Accept</span>
      </button>
      <button disabled={loading} onClick={() => setShowCounter(true)} style={actionBtn('rgba(59,130,246,0.12)', 'rgba(59,130,246,0.3)')}>
        <RefreshCw size={13} color="#60a5fa"/>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#60a5fa' }}>Counter</span>
      </button>
      <button disabled={loading} onClick={() => act(buyerDecision, {lead_id:lead.id, action:'decline'}, 'Declined')} style={actionBtn('rgba(255,255,255,0.04)', 'rgba(255,255,255,0.1)')}>
        <X size={13} color="rgba(255,255,255,0.4)"/>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.4)' }}>Decline</span>
      </button>
    </div>
  )
}

function ConfirmationBar({ lead, isBuyer, onRefresh, onToggleChat }) {
  const [loading, setLoading] = useState(false)
  const [editingOffer, setEditingOffer] = useState(false)
  const [editedMessage, setEditedMessage] = useState('')

  if (!lead) return null

  const act = async (fn, args, msg) => {
    setLoading(true)
    try { await fn(args); toast.success(msg || 'Done'); onRefresh() }
    catch(e) { toast.error(e?.response?.data?.detail || 'Failed') }
    finally { setLoading(false) }
  }

  const barStyle = (bg, border) => ({
    margin: '8px 12px 0', padding: '10px 14px',
    background: bg, border: `1px solid ${border}`,
    borderRadius: 12, display: 'flex', alignItems: 'center', gap: 14
  })
  const iconBox = (bg, border) => ({
    width: 36, height: 36, borderRadius: 9, flexShrink: 0,
    background: bg, border: `1px solid ${border}`,
    display: 'flex', alignItems: 'center', justifyContent: 'center'
  })
  const actionBtn = (gradient, outline) => ({
    display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
    background: gradient, border: outline ? `1px solid ${outline}` : 'none',
    borderRadius: 8, cursor: loading ? 'wait' : 'pointer',
    fontFamily: 'Inter,system-ui,sans-serif', flexShrink: 0
  })

  // ── SUPPLIER: pending offer approval — review AI-drafted offer before it goes to buyer ──
  if (!isBuyer && lead.status === 'pending_supplier_approval') {
    return (
      <div style={{ margin: '8px 12px 0', padding: '14px 16px', background: 'linear-gradient(135deg,rgba(139,92,246,0.06),rgba(59,130,246,0.04))', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 14, boxShadow: '0 2px 12px rgba(139,92,246,0.08)' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,rgba(139,92,246,0.2),rgba(59,130,246,0.15))', border: '1px solid rgba(139,92,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sparkles size={15} color="#a78bfa"/>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', margin: 0 }}>Review your final offer</p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: '2px 0 0' }}>AI drafted this based on the negotiation. Edit if needed before sending to buyer.</p>
          </div>
        </div>

        {/* Offer card */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '12px 14px', marginBottom: 12, position: 'relative' }}>
          {!editingOffer && (
            <div style={{ position: 'absolute', top: 8, right: 10, fontSize: 9, fontWeight: 600, color: 'rgba(139,92,246,0.6)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>AI Draft</div>
          )}
          {editingOffer ? (
            <textarea
              value={editedMessage}
              onChange={e => setEditedMessage(e.target.value)}
              autoFocus
              style={{ width: '100%', minHeight: 90, background: 'transparent', border: 'none', outline: 'none', color: '#e2e8f0', fontSize: 13, fontFamily: 'Inter,system-ui,sans-serif', resize: 'vertical', lineHeight: 1.6 }}
              placeholder="Edit your offer message..."
            />
          ) : (
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap', paddingRight: 40 }}>
              {lead.pending_offer_message || 'Loading offer...'}
            </p>
          )}
        </div>

        {/* Price badge if available */}
        {lead.current_offer_price && !editingOffer && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 12, padding: '5px 10px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 6 }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Price:</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#10b981' }}>₹{lead.current_offer_price.toLocaleString()}/unit</span>
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {editingOffer ? (
            <>
              <button disabled={loading || !editedMessage.trim()} onClick={() => act(supplierOfferApproval, { lead_id: lead.id, action: 'edit_approve', edited_message: editedMessage }, '✅ Offer sent to buyer!')}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: 'linear-gradient(135deg,#7c3aed,#8b5cf6)', border: 'none', borderRadius: 8, cursor: loading ? 'wait' : 'pointer', boxShadow: '0 2px 8px rgba(124,58,237,0.3)' }}>
                <Send size={13} color="#fff"/>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>Send to Buyer</span>
              </button>
              <button onClick={() => setEditingOffer(false)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, cursor: 'pointer' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>Cancel</span>
              </button>
            </>
          ) : (
            <>
              <button disabled={loading} onClick={() => act(supplierOfferApproval, { lead_id: lead.id, action: 'approve' }, '✅ Offer sent to buyer!')}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: 'linear-gradient(135deg,#059669,#10b981)', border: 'none', borderRadius: 8, cursor: loading ? 'wait' : 'pointer', boxShadow: '0 2px 8px rgba(5,150,105,0.3)' }}>
                <ThumbsUp size={13} color="#fff"/>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>Approve & Send</span>
              </button>
              <button disabled={loading} onClick={() => { setEditedMessage(lead.pending_offer_message || ''); setEditingOffer(true) }}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 8, cursor: loading ? 'wait' : 'pointer' }}>
                <Sparkles size={13} color="#60a5fa"/>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#60a5fa' }}>Edit Offer</span>
              </button>
              <button disabled={loading} onClick={() => act(supplierOfferApproval, { lead_id: lead.id, action: 'decline' }, 'Resuming negotiation...')}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, cursor: loading ? 'wait' : 'pointer' }}>
                <X size={13} color="rgba(255,255,255,0.4)"/>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.4)' }}>Negotiate More</span>
              </button>
            </>
          )}
        </div>
      </div>
    )
  }

  // ── BUYER: offer ready — supplier approved their offer, buyer decides ──
  if (isBuyer && lead.status === 'offer_ready') {
    return (
      <BuyerOfferBar lead={lead} loading={loading} act={act}/>
    )
  }

  // ── BUYER: waiting for supplier to confirm ──
  if (isBuyer && lead.status === 'awaiting_supplier_confirm') {
    return (
      <div style={barStyle('rgba(245,158,11,0.06)', 'rgba(245,158,11,0.2)')}>
        <div style={iconBox('rgba(245,158,11,0.15)', 'rgba(245,158,11,0.25)')}>
          <Clock size={16} color="#f59e0b"/>
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b', margin: 0 }}>Awaiting supplier confirmation</p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: '2px 0 0' }}>Waiting for supplier to accept or reject the deal.</p>
        </div>
      </div>
    )
  }

  // ── SUPPLIER: buyer accepted — confirm or reject ──
  if (!isBuyer && lead.status === 'awaiting_supplier_confirm') {
    return (
      <div style={barStyle('linear-gradient(135deg,rgba(139,92,246,0.1),rgba(59,130,246,0.08))', 'rgba(139,92,246,0.3)')}>
        <div style={iconBox('rgba(139,92,246,0.15)', 'rgba(139,92,246,0.25)')}>
          <Zap size={16} color="#a78bfa"/>
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', margin: 0 }}>Buyer accepted — confirm the deal?</p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', margin: '2px 0 0' }}>
            {lead.current_offer_price ? `At ₹${lead.current_offer_price.toLocaleString()}/unit · ` : ''}
            Confirm to close or reject to decline
          </p>
        </div>
        <button disabled={loading} onClick={() => act(supplierConfirm, {lead_id:lead.id, action:'confirm'}, '🎉 Deal confirmed!')} style={actionBtn('linear-gradient(135deg,#7c3aed,#8b5cf6)')}>
          <ThumbsUp size={13} color="#fff"/>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>Confirm</span>
        </button>
        <button disabled={loading} onClick={() => act(supplierConfirm, {lead_id:lead.id, action:'reject'}, 'Declined')} style={actionBtn('rgba(255,255,255,0.06)', 'rgba(255,255,255,0.12)')}>
          <ThumbsDown size={13} color="rgba(255,255,255,0.5)"/>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>Reject</span>
        </button>
      </div>
    )
  }

  // ── SUPPLIER: AI paused for supplier input ──
  if (!isBuyer && lead.ai_paused_for_supplier && lead.status !== 'awaiting_supplier_confirm' && lead.status !== 'pending_supplier_approval') {
    return (
      <div style={barStyle('rgba(245,158,11,0.06)', 'rgba(245,158,11,0.2)')}>
        <div style={iconBox('rgba(245,158,11,0.15)', 'rgba(245,158,11,0.25)')}>
          <MessageSquare size={16} color="#f59e0b"/>
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b', margin: 0 }}>Buyer asked a question</p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: '2px 0 0' }}>Go live to reply directly</p>
        </div>
        <button disabled={loading} onClick={onToggleChat} style={actionBtn('linear-gradient(135deg,#7c3aed,#8b5cf6)')}>
          <MessageSquare size={13} color="#fff"/>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>Go Live Chat</span>
        </button>
      </div>
    )
  }

  // ── BUYER: supplier declined ──
  if (isBuyer && lead.status === 'declined') {
    return (
      <div style={barStyle('rgba(239,68,68,0.06)', 'rgba(239,68,68,0.15)')}>
        <X size={18} color="#ef4444"/>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#ef4444' }}>Supplier declined — check other matched suppliers</span>
      </div>
    )
  }

  // ── SUPPLIER: requirement fulfilled by another supplier ──
  if (!isBuyer && lead.status === 'not_selected') {
    return (
      <div style={barStyle('rgba(107,114,128,0.08)', 'rgba(107,114,128,0.15)')}>
        <Package size={18} color="#6b7280"/>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#6b7280' }}>Requirement closed — buyer selected another supplier</span>
      </div>
    )
  }

  // ── DEAL CLOSED ──
  if (lead.status === 'deal_closed') {
    return (
      <div style={barStyle('rgba(16,185,129,0.08)', 'rgba(16,185,129,0.2)')}>
        <CheckCircle size={18} color="#10b981"/>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#10b981' }}>
          Deal Closed — Coordinate delivery and payment in the chat.
        </span>
      </div>
    )
  }

  return null
}

function ChatSummaryStrip({ lead, isBuyer, counterpart }) {
  if (!lead) return null

  let summary = ''
  if (isBuyer) {
    const parts = []
    if (lead.current_offer_price) parts.push(`₹${lead.current_offer_price.toLocaleString()}/unit`)
    if (lead.current_lead_time) parts.push(`${lead.current_lead_time}d delivery`)
    if (counterpart?.product_categories?.length) parts.push(counterpart.product_categories[0])
    summary = parts.join(' · ') || 'Negotiation in progress'
  } else {
    const parts = []
    if (lead.requirement?.product) parts.push(lead.requirement.product)
    if (lead.requirement?.quantity) parts.push(`${lead.requirement.quantity} ${lead.requirement.quantity_unit || 'units'}`)
    if (lead.requirement?.budget_max) parts.push(`Budget ₹${lead.requirement.budget_max.toLocaleString()}`)
    summary = parts.join(' · ') || 'Requirement details pending'
  }

  return (
    <div style={{
      margin: '8px 24px 0', padding: '8px 14px',
      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8
    }}>
      <Package size={12} color="rgba(255,255,255,0.3)"/>
      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>
        {summary}
      </span>
    </div>
  )
}

export default function ConversationView({ leadId }) {
  const [conv, setConv]         = useState(null)
  const [lead, setLead]         = useState(null)
  const [counterpart, setCP]    = useState(null)
  const [loading, setLoading]   = useState(true)
  const [msg, setMsg]           = useState('')
  const [sending, setSending]   = useState(false)
  const [chatOn, setChatOn]     = useState(false)
  const [suggesting, setSuggesting]   = useState(false)
  const bottomRef = useRef(null)
  const { route, goRequirement, goWelcome } = useWorkspaceStore()
  const currentUser = useAuthStore(s => s.user)
  const isBuyer = lead
    ? (currentUser?.id
        ? currentUser.id === lead.buyer_id
        : route.view !== 'lead')
    : route.view !== 'lead'

  const fetch = async () => {
    try {
      const [cRes, lRes] = await Promise.all([getConvByLead(leadId), getLead(leadId)])
      setConv(cRes.data); setLead(lRes.data)
      setChatOn(cRes.data.buyer_chat_enabled || cRes.data.supplier_chat_enabled)
      try { const r = await getCounterpart(leadId); setCP(r.data) } catch {}
    } catch {}
    setLoading(false)
  }

  useEffect(() => { setLoading(true); setConv(null); setLead(null); fetch() }, [leadId])

  // Auto-scroll to bottom when messages change - like WhatsApp
  useEffect(() => {
    if (bottomRef.current) {
      // Use setTimeout to ensure DOM has updated
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
      }, 100)
    }
  }, [conv?.messages?.length]) // Track length to avoid unnecessary scrolls

  // Auto-refresh while AI is working (initiating or negotiating)
  useEffect(() => {
    const shouldPoll = !conv ||
                       (lead && ['new', 'agent_initiated', 'negotiating', 'renegotiating'].includes(lead.status) &&
                       !lead.ai_paused_for_buyer && !lead.ai_paused_for_supplier)

    if (shouldPoll && !loading) {
      const timer = setInterval(() => {
        fetch()
      }, 3000) // Poll every 3 seconds

      return () => clearInterval(timer)
    }
  }, [lead?.status, lead?.ai_paused_for_buyer, lead?.ai_paused_for_supplier, conv, loading])

  const handleToggle = async () => {
    const newChatOn = !chatOn
    try {
      await toggleChat({ lead_id:parseInt(leadId), enabled:newChatOn })
      setChatOn(newChatOn)

      if (newChatOn) {
        toast.success('Live chat enabled — you can now send messages')
      } else {
        toast.success('AI mode enabled — AI will negotiate for you')
      }

      // Refresh to get updated conversation state
      setTimeout(() => fetch(), 1000)
    } catch { toast.error('Failed') }
  }

  const handleSend = async () => {
    if (!msg.trim()||sending||!conv) return
    setSending(true)
    try { await sendMessage({conversation_id:conv.id, content:msg}); setMsg(''); fetch() }
    catch(e){ toast.error(e.response?.data?.detail||'Failed') }
    finally { setSending(false) }
  }

  const handleSuggest = async () => {
    if (suggesting || !lead) return
    setSuggesting(true)
    try {
      const res = await suggestResponse({ lead_id: lead.id })
      setMsg(res.data.suggested_message)
      toast.success('AI suggestion ready — edit & send')
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Could not generate suggestion')
    } finally {
      setSuggesting(false)
    }
  }


  return (
    <div style={{ flex:1, display:'flex', overflow:'hidden' }}>
      <div style={{ flex:1, display:'flex', flexDirection:'column', background:'#0a1225', overflow:'hidden' }}>
        {/* Sticky top section — compact on mobile */}
        <div style={{ flexShrink:0 }}>
        {/* Header */}
        <div className="chat-header" style={{
          padding:'10px 16px', borderBottom:'1px solid rgba(255,255,255,0.06)',
          display:'flex', alignItems:'center', gap:10,
          background:'linear-gradient(180deg, rgba(15,23,42,0.95) 0%, rgba(10,18,37,0.95) 100%)'
        }}>
          <button onClick={() => route.reqId ? goRequirement(route.reqId) : goWelcome()}
            style={{
              width:30, height:30, borderRadius:8, background:'rgba(255,255,255,0.05)',
              border:'1px solid rgba(255,255,255,0.08)', cursor:'pointer',
              display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0
            }}>
            <ChevronLeft size={14} color="rgba(255,255,255,0.6)"/>
          </button>

          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:14, fontWeight:700, color:'#fff', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                {counterpart?.trade_name || (isBuyer ? `Seller #${lead?.supplier_id || leadId}` : `Buyer #${lead?.buyer_id || leadId}`)}
              </span>
              {lead && <StatusBadge status={lead.status}/>}
            </div>
            <div style={{ fontSize:10, color:'rgba(255,255,255,0.4)', marginTop:2 }}>
              {lead?.current_offer_price && <span style={{ color:'#10b981', fontWeight:600 }}>₹{lead.current_offer_price.toLocaleString()}/unit</span>}
              {lead?.current_offer_price && lead?.requirement?.product && <span style={{ color:'rgba(255,255,255,0.15)' }}> · </span>}
              <span>{lead?.requirement?.product || ''}</span>
            </div>
          </div>

          <button onClick={handleToggle}
            style={{
              display:'flex', alignItems:'center', gap:4, padding:'6px 10px',
              background: chatOn ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${chatOn ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.1)'}`,
              borderRadius:7, cursor:'pointer', fontFamily:'Inter,system-ui,sans-serif', flexShrink:0
            }}>
            {chatOn
              ? <><ToggleRight size={14} color="#10b981"/><span className="hide-mobile" style={{fontSize:10,fontWeight:700,color:'#10b981'}}>Live</span></>
              : <><ToggleLeft size={14} color="rgba(255,255,255,0.4)"/><span className="hide-mobile" style={{fontSize:10,fontWeight:600,color:'rgba(255,255,255,0.4)'}}>AI</span></>
            }
          </button>


          <button onClick={fetch} style={{
            background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)',
            width:28, height:28, borderRadius:7, cursor:'pointer', flexShrink:0,
            display:'flex', alignItems:'center', justifyContent:'center'
          }}>
            <RefreshCw size={12} color="rgba(255,255,255,0.4)"/>
          </button>
        </div>

        {/* Confirmation Bar — compact */}
        <ConfirmationBar lead={lead} isBuyer={isBuyer} onRefresh={fetch} onToggleChat={handleToggle}/>

        </div>{/* end sticky top section */}

        {/* Messages */}
        <div style={{ flex:1, overflowY:'auto', padding:'20px 24px 24px 24px' }}>
          {loading && (
            <div style={{ display:'flex', justifyContent:'center', padding:48 }}>
              <Spinner size={24} color="rgba(255,255,255,0.3)"/>
            </div>
          )}
          {!loading && !conv && (
            <div style={{ textAlign:'center', padding:'64px 20px', color:'rgba(255,255,255,0.3)' }}>
              <Bot size={40} style={{ margin:'0 auto 16px', opacity:0.2 }}/>
              <p style={{ fontSize:14, fontWeight:500 }}>
                {lead?.status === 'new' ? 'Initiating conversation...' : 'No conversation yet'}
              </p>
              <p style={{ fontSize:12, color:'rgba(255,255,255,0.2)', marginTop:6, maxWidth:300, margin:'6px auto 0' }}>
                {lead?.status === 'new'
                  ? 'AI agents are starting the negotiation. This usually takes 5-10 seconds.'
                  : lead?.status === 'agent_initiated'
                  ? 'AI agents are generating their opening messages...'
                  : lead?.ai_paused_for_buyer
                  ? 'Waiting for your decision. Use the Actions panel to continue.'
                  : lead?.ai_paused_for_supplier
                  ? 'Waiting for supplier to respond. AI has paused for human input.'
                  : 'AI agents will begin negotiating shortly'
                }
              </p>
              <button onClick={fetch} style={{ marginTop:16, fontSize:12, color:'#3b82f6', background:'rgba(59,130,246,0.1)', border:'1px solid rgba(59,130,246,0.2)', borderRadius:8, padding:'8px 16px', cursor:'pointer', display:'inline-flex', alignItems:'center', gap:6 }}>
                <RefreshCw size={12}/> Refresh
              </button>
            </div>
          )}
          {conv?.messages?.map((m,i) => (
            <Bubble key={m.id||i} msg={m} isBuyer={isBuyer} counterpartName={counterpart?.trade_name}/>
          ))}

          {/* End-of-messages paused indicator */}
          {conv?.messages?.length > 0 && (() => {
            if (!isBuyer && lead?.status === 'pending_supplier_approval')
              return (
                <div style={{ display:'flex', justifyContent:'center', margin:'16px 0' }}>
                  <div style={{ maxWidth:'85%', textAlign:'center', padding:'14px 18px', background:'rgba(139,92,246,0.08)', border:'1px solid rgba(139,92,246,0.2)', borderRadius:14 }}>
                    <Sparkles size={20} color="#a78bfa" style={{ margin:'0 auto 6px' }}/>
                    <p style={{ fontSize:12, fontWeight:600, color:'#a78bfa', marginBottom:3 }}>AI prepared your final offer</p>
                    <p style={{ fontSize:10, color:'rgba(255,255,255,0.4)' }}>Review it above — approve, edit, or decline to keep negotiating.</p>
                  </div>
                </div>
              )
            if (isBuyer && lead?.status === 'pending_supplier_approval')
              return (
                <div style={{ display:'flex', justifyContent:'center', margin:'16px 0' }}>
                  <div style={{ maxWidth:'85%', textAlign:'center', padding:'12px 18px', background:'rgba(139,92,246,0.06)', border:'1px solid rgba(139,92,246,0.15)', borderRadius:14 }}>
                    <Bot size={18} color="#8b5cf6" style={{ margin:'0 auto 4px' }}/>
                    <p style={{ fontSize:11, color:'rgba(255,255,255,0.4)' }}>Supplier is reviewing their offer…</p>
                  </div>
                </div>
              )
            if (isBuyer && lead?.status === 'offer_ready')
              return (
                <div style={{ display:'flex', justifyContent:'center', margin:'16px 0' }}>
                  <div style={{ maxWidth:'85%', textAlign:'center', padding:'14px 18px', background:'rgba(16,185,129,0.06)', border:'1px solid rgba(16,185,129,0.2)', borderRadius:14 }}>
                    <Shield size={20} color="#10b981" style={{ margin:'0 auto 6px' }}/>
                    <p style={{ fontSize:12, fontWeight:600, color:'#10b981', marginBottom:3 }}>Final offer received</p>
                    <p style={{ fontSize:10, color:'rgba(255,255,255,0.4)' }}>The supplier sent you a final offer. Accept above to close the deal.</p>
                  </div>
                </div>
              )
            if (isBuyer && lead?.ai_paused_for_buyer && lead?.status !== 'offer_ready')
              return (
                <div style={{ display:'flex', justifyContent:'center', margin:'16px 0' }}>
                  <div style={{ maxWidth:'85%', textAlign:'center', padding:'14px 18px', background:'rgba(59,130,246,0.08)', border:'1px solid rgba(59,130,246,0.2)', borderRadius:14 }}>
                    <MessageSquare size={20} color="#3b82f6" style={{ margin:'0 auto 6px' }}/>
                    <p style={{ fontSize:12, fontWeight:600, color:'#3b82f6', marginBottom:3 }}>Supplier asked a question</p>
                    <p style={{ fontSize:10, color:'rgba(255,255,255,0.4)' }}>Go live to reply directly to the supplier.</p>
                    <button onClick={handleToggle} style={{ marginTop:8, fontSize:11, fontWeight:700, color:'#fff', background:'linear-gradient(135deg,#1d4ed8,#3b82f6)', border:'none', borderRadius:6, padding:'6px 14px', cursor:'pointer' }}>Go Live Chat</button>
                  </div>
                </div>
              )
            if (!isBuyer && lead?.status === 'awaiting_supplier_confirm')
              return (
                <div style={{ display:'flex', justifyContent:'center', margin:'16px 0' }}>
                  <div style={{ maxWidth:'85%', textAlign:'center', padding:'14px 18px', background:'rgba(167,139,250,0.08)', border:'1px solid rgba(167,139,250,0.2)', borderRadius:14 }}>
                    <AlertTriangle size={20} color="#a78bfa" style={{ margin:'0 auto 6px' }}/>
                    <p style={{ fontSize:12, fontWeight:600, color:'#a78bfa', marginBottom:3 }}>Buyer accepted — confirm or reject</p>
                    <p style={{ fontSize:10, color:'rgba(255,255,255,0.4)' }}>Use the confirmation bar at the top to respond.</p>
                  </div>
                </div>
              )
            if (!isBuyer && lead?.ai_paused_for_supplier && lead?.status !== 'awaiting_supplier_confirm')
              return (
                <div style={{ display:'flex', justifyContent:'center', margin:'16px 0' }}>
                  <div style={{ maxWidth:'85%', textAlign:'center', padding:'14px 18px', background:'rgba(167,139,250,0.08)', border:'1px solid rgba(167,139,250,0.2)', borderRadius:14 }}>
                    <MessageSquare size={20} color="#a78bfa" style={{ margin:'0 auto 6px' }}/>
                    <p style={{ fontSize:12, fontWeight:600, color:'#a78bfa', marginBottom:3 }}>Your response needed</p>
                    <p style={{ fontSize:10, color:'rgba(255,255,255,0.4)' }}>The buyer asked a question — go live to reply directly.</p>
                    <button onClick={handleToggle} style={{ marginTop:8, fontSize:11, fontWeight:700, color:'#fff', background:'linear-gradient(135deg,#7c3aed,#8b5cf6)', border:'none', borderRadius:6, padding:'6px 14px', cursor:'pointer' }}>Go Live Chat</button>
                  </div>
                </div>
              )
            if (isBuyer && lead?.ai_paused_for_supplier)
              return (
                <div style={{ display:'flex', justifyContent:'center', margin:'16px 0' }}>
                  <div style={{ maxWidth:'85%', textAlign:'center', padding:'12px 18px', background:'rgba(139,92,246,0.06)', border:'1px solid rgba(139,92,246,0.15)', borderRadius:14 }}>
                    <Bot size={18} color="#8b5cf6" style={{ margin:'0 auto 4px' }}/>
                    <p style={{ fontSize:11, color:'rgba(255,255,255,0.4)' }}>Waiting for supplier to respond…</p>
                  </div>
                </div>
              )
            return null
          })()}
          <div ref={bottomRef}/>
        </div>

        {/* Input area — sticky bottom */}
        <div style={{ flexShrink:0, padding:'16px 24px 20px', borderTop:'1px solid rgba(255,255,255,0.06)', background:'#0a1225' }}>
          {chatOn && conv ? (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <div style={{
                display:'flex', alignItems:'flex-end', gap:12,
                background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)',
                borderRadius:20, padding:'10px 16px', boxShadow:'0 2px 8px rgba(0,0,0,0.2)'
              }}>
              <textarea
                style={{
                  flex:1, background:'transparent', border:'none', outline:'none',
                  color:'#fff', fontSize:13, fontFamily:'Inter,system-ui,sans-serif',
                  resize:'none', lineHeight:1.6, minHeight:22, maxHeight:120
                }}
                placeholder="Type your message…"
                value={msg} onChange={e => setMsg(e.target.value)}
                onKeyDown={e => { if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();handleSend()} }}
                rows={1}
              />
              <button onClick={handleSend} disabled={!msg.trim()||sending}
                style={{
                  width:40, height:40, borderRadius:'50%', border:'none', cursor: msg.trim()&&!sending ? 'pointer' : 'default',
                  display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
                  background: msg.trim()&&!sending ? 'linear-gradient(135deg,#1d4ed8,#3b82f6)' : 'rgba(255,255,255,0.08)',
                  boxShadow: msg.trim()&&!sending ? '0 2px 8px rgba(29,78,216,0.4)' : 'none',
                  transition:'all 0.2s'
                }}>
                {sending ? <Spinner size={16}/> : <Send size={16} color={msg.trim() ? 'white' : 'rgba(255,255,255,0.3)'}/>}
              </button>
            </div>
            {/* AI Suggest Button */}
            <button
              onClick={handleSuggest}
              disabled={suggesting}
              style={{
                display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                padding:'10px 18px', borderRadius:12, cursor: suggesting ? 'default' : 'pointer',
                background:'linear-gradient(135deg, rgba(139,92,246,0.12), rgba(59,130,246,0.12))',
                border:'1px solid rgba(139,92,246,0.25)',
                fontFamily:'Inter,system-ui,sans-serif', width:'100%',
                transition:'all 0.2s'
              }}
            >
              {suggesting
                ? <><Spinner size={13}/><span style={{ fontSize:11, color:'rgba(255,255,255,0.5)', fontWeight:500 }}>Generating suggestion…</span></>
                : <><Sparkles size={13} color="#a78bfa"/><span style={{ fontSize:11, color:'#a78bfa', fontWeight:600 }}>AI Suggest Best Response</span></>
              }
              </button>
            </div>
          ) : (
            <div style={{
              display:'flex', alignItems:'center', justifyContent:'space-between',
              background:'rgba(59,130,246,0.05)', border:'1px solid rgba(59,130,246,0.15)',
              borderRadius:12, padding:'12px 16px'
            }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:28, height:28, borderRadius:7, background:'rgba(59,130,246,0.12)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Bot size={14} color="#3b82f6"/>
                </div>
                <span style={{ fontSize:12, color:'rgba(255,255,255,0.5)', fontWeight:500 }}>
                  AI is negotiating on your behalf — toggle Live Chat to join
                </span>
              </div>
              <button onClick={fetch} style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', width:28, height:28, borderRadius:6, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <RefreshCw size={12} color="rgba(255,255,255,0.4)"/>
              </button>
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
