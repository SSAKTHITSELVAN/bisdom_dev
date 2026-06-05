import { useState, useEffect, useRef } from 'react'
import { getConvByLead, sendMessage, toggleChat, buyerDecision, supplierEscalation, supplierConfirm, suggestResponse } from '@/api/conversations'
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

function getRoles(isBuyer) {
  return {
    ai_buyer:      { label: isBuyer ? 'Your AI Agent' : 'Buyer AI',     color:'#3b82f6', isAI:true  },
    ai_supplier:   { label: isBuyer ? 'Supplier AI' : 'Your AI Agent',  color:'#8b5cf6', isAI:true  },
    human_buyer:   { label: isBuyer ? 'You' : 'Buyer',                  color:'#10b981', isAI:false },
    human_supplier:{ label: isBuyer ? 'Seller' : 'You',                 color:'#f59e0b', isAI:false },
    system:        { label:'System',                                     color:'#64748b', isAI:false },
  }
}

function Bubble({ msg, isBuyer }) {
  const roles = getRoles(isBuyer)
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

function ActionPanel({ lead, isBuyer, onClose, onRefresh }) {
  const [loading, setLoading] = useState(false)
  const [renego, setRenego]   = useState('')

  const act = async (fn, args, msg) => {
    setLoading(true)
    try { await fn(args); onRefresh(); onClose(); toast.success(msg || 'Done') }
    catch(e) { toast.error(e?.response?.data?.detail || 'Failed') }
    finally { setLoading(false) }
  }

  const Btn = ({ onClick, bg, border, icon, title, sub, color = '#fff' }) => (
    <button disabled={loading} onClick={onClick} style={{
      display:'flex', alignItems:'center', gap:12, padding:'14px 16px',
      background: bg, border: `1px solid ${border}`,
      borderRadius:12, cursor:'pointer', fontFamily:'Inter,system-ui,sans-serif', width:'100%', textAlign:'left'
    }}>
      {icon}
      <div>
        <div style={{ fontSize:13, fontWeight:600, color }}>{title}</div>
        {sub && <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)', marginTop:2 }}>{sub}</div>}
      </div>
    </button>
  )

  return (
    <div className="action-panel" style={{
      width:300, borderLeft:'1px solid rgba(255,255,255,0.06)',
      background:'#0c1524', display:'flex', flexDirection:'column', overflow:'hidden'
    }}>
      <div style={{
        padding:'20px 18px', borderBottom:'1px solid rgba(255,255,255,0.06)',
        display:'flex', justifyContent:'space-between', alignItems:'center'
      }}>
        <span style={{ fontSize:14, fontWeight:700, color:'#fff' }}>Actions</span>
        <button onClick={onClose} style={{ background:'rgba(255,255,255,0.06)', border:'none', cursor:'pointer', width:28, height:28, borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <X size={13} color="rgba(255,255,255,0.5)" />
        </button>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'16px', display:'flex', flexDirection:'column', gap:10 }}>

        {/* ── BUYER ACTIONS ── */}
        {isBuyer && (
          <>
            <Btn
              onClick={() => act(buyerDecision, {lead_id:lead.id, action:'accept'}, 'Sent to supplier for confirmation!')}
              bg="rgba(16,185,129,0.06)" border="rgba(16,185,129,0.2)"
              icon={<CheckCircle size={18} color="#10b981"/>}
              title="Accept Deal" sub="Notify supplier — they must confirm"
            />
            <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:12, padding:14 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                <RefreshCw size={15} color="#3b82f6"/>
                <span style={{ fontSize:13, fontWeight:600, color:'#fff' }}>Renegotiate</span>
              </div>
              <input
                style={{ width:'100%', padding:'10px 12px', fontSize:12, borderRadius:8, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'#fff', outline:'none', fontFamily:'Inter,system-ui,sans-serif', marginBottom:10, boxSizing:'border-box' }}
                placeholder='e.g. "Get below ₹170/unit"'
                value={renego} onChange={e => setRenego(e.target.value)}
              />
              <button disabled={!renego || loading}
                onClick={() => act(buyerDecision, {lead_id:lead.id, action:'renegotiate', renegotiate_target:renego}, 'AI agent is renegotiating')}
                style={{ width:'100%', padding:'10px 16px', fontSize:12, fontWeight:600, background: renego ? 'linear-gradient(135deg,#1d4ed8,#3b82f6)' : 'rgba(255,255,255,0.06)', color: renego ? '#fff' : 'rgba(255,255,255,0.3)', border:'none', borderRadius:8, cursor: renego ? 'pointer' : 'default', fontFamily:'Inter,system-ui,sans-serif' }}>
                Send to AI Agent
              </button>
            </div>
            <Btn
              onClick={() => act(buyerDecision, {lead_id:lead.id, action:'manual_chat'}, 'Live chat enabled')}
              bg="rgba(139,92,246,0.06)" border="rgba(139,92,246,0.2)"
              icon={<MessageSquare size={18} color="#8b5cf6"/>}
              title="Take Over Chat" sub="Speak directly to supplier"
            />
            <Btn
              onClick={() => act(buyerDecision, {lead_id:lead.id, action:'decline'}, 'Supplier declined')}
              bg="rgba(239,68,68,0.05)" border="rgba(239,68,68,0.15)"
              icon={<X size={18} color="#ef4444"/>}
              title="Decline" sub="Pass on this supplier" color="#ef4444"
            />
          </>
        )}

        {/* ── SUPPLIER ACTIONS ── */}
        {!isBuyer && lead.status === 'awaiting_supplier_confirm' && (
          <>
            <Btn
              onClick={() => act(supplierConfirm, {lead_id:lead.id, action:'confirm'}, '🎉 Deal confirmed!')}
              bg="rgba(16,185,129,0.06)" border="rgba(16,185,129,0.2)"
              icon={<CheckCircle size={18} color="#10b981"/>}
              title="Confirm Deal" sub="Accept buyer's terms — deal closes"
            />
            <Btn
              onClick={() => act(supplierConfirm, {lead_id:lead.id, action:'reject'}, 'Deal declined')}
              bg="rgba(239,68,68,0.05)" border="rgba(239,68,68,0.15)"
              icon={<X size={18} color="#ef4444"/>}
              title="Decline" sub="Reject buyer's terms" color="#ef4444"
            />
          </>
        )}

        {!isBuyer && lead.ai_paused_for_supplier && lead.status !== 'awaiting_supplier_confirm' && (
          <>
            <div style={{ fontSize:12, color:'rgba(255,255,255,0.5)', padding:'0 4px 8px', lineHeight:1.5 }}>
              AI paused and needs your input. Choose how to proceed:
            </div>
            <Btn
              onClick={() => act(supplierEscalation, {lead_id:lead.id, action:'accept'}, 'AI will proceed')}
              bg="rgba(16,185,129,0.06)" border="rgba(16,185,129,0.2)"
              icon={<CheckCircle size={18} color="#10b981"/>}
              title="Let AI Continue" sub="AI will respond on your behalf"
            />
            <Btn
              onClick={() => act(buyerDecision, {lead_id:lead.id, action:'manual_chat'}, 'Live chat enabled — you can now reply')}
              bg="rgba(139,92,246,0.06)" border="rgba(139,92,246,0.2)"
              icon={<MessageSquare size={18} color="#8b5cf6"/>}
              title="Reply Yourself" sub="Take over and chat directly"
            />
            <Btn
              onClick={() => act(supplierEscalation, {lead_id:lead.id, action:'decline'}, 'Lead declined')}
              bg="rgba(239,68,68,0.05)" border="rgba(239,68,68,0.15)"
              icon={<X size={18} color="#ef4444"/>}
              title="Decline Lead" sub="Not interested in this requirement" color="#ef4444"
            />
          </>
        )}
      </div>
    </div>
  )
}

function ConfirmationBar({ lead, isBuyer, onRefresh }) {
  const [loading, setLoading] = useState(false)

  if (!lead) return null

  const act = async (fn, args, msg) => {
    setLoading(true)
    try { await fn(args); toast.success(msg || 'Done'); onRefresh() }
    catch(e) { toast.error(e?.response?.data?.detail || 'Failed') }
    finally { setLoading(false) }
  }

  const barStyle = (bg, border) => ({
    margin: '12px 24px 0', padding: '14px 18px',
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

  // ── BUYER: offer ready — AI is proposing to accept, ask buyer ──
  if (isBuyer && (lead.status === 'offer_ready' || lead.ai_paused_for_buyer)) {
    return (
      <div style={barStyle('linear-gradient(135deg,rgba(16,185,129,0.08),rgba(59,130,246,0.08))', 'rgba(16,185,129,0.25)')}>
        <div style={iconBox('rgba(16,185,129,0.15)', 'rgba(16,185,129,0.25)')}>
          <Shield size={16} color="#10b981"/>
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', margin: 0 }}>
            {lead.status === 'offer_ready' ? 'AI reached a deal — confirm?' : 'Your decision needed'}
          </p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', margin: '2px 0 0' }}>
            {lead.current_offer_price ? `Current offer: ₹${lead.current_offer_price.toLocaleString()}/unit · ` : ''}
            Accept, renegotiate, or decline via Actions
          </p>
        </div>
        <button disabled={loading} onClick={() => act(buyerDecision, {lead_id:lead.id, action:'accept'}, 'Sent to supplier!')} style={actionBtn('linear-gradient(135deg,#059669,#10b981)')}>
          <ThumbsUp size={13} color="#fff"/>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>Accept</span>
        </button>
        <button disabled={loading} onClick={() => act(buyerDecision, {lead_id:lead.id, action:'decline'}, 'Declined')} style={actionBtn('rgba(255,255,255,0.06)', 'rgba(255,255,255,0.12)')}>
          <X size={13} color="rgba(255,255,255,0.5)"/>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>Decline</span>
        </button>
      </div>
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
  if (!isBuyer && lead.ai_paused_for_supplier && lead.status !== 'awaiting_supplier_confirm') {
    return (
      <div style={barStyle('rgba(245,158,11,0.06)', 'rgba(245,158,11,0.2)')}>
        <div style={iconBox('rgba(245,158,11,0.15)', 'rgba(245,158,11,0.25)')}>
          <AlertTriangle size={16} color="#f59e0b"/>
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b', margin: 0 }}>AI paused — your response needed</p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: '2px 0 0' }}>Use Actions to reply, let AI continue, or decline</p>
        </div>
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
  const [showActions, setShowActions] = useState(false)
  const [suggesting, setSuggesting]   = useState(false)
  const bottomRef = useRef(null)
  const { route, goRequirement, goWelcome } = useWorkspaceStore()
  const currentUser = useAuthStore(s => s.user)
  const isBuyer = lead ? currentUser?.id === lead.buyer_id : true

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

  // Auto-refresh while conversation is being initiated
  useEffect(() => {
    // Poll if conversation doesn't exist yet OR if it has no messages
    const shouldPoll = !conv ||
                       (lead && (lead.status === 'new' || lead.status === 'agent_initiated') &&
                       (!conv.messages || conv.messages.length === 0))

    if (shouldPoll && !loading) {
      const timer = setInterval(() => {
        fetch()
      }, 3000) // Poll every 3 seconds

      return () => clearInterval(timer)
    }
  }, [lead?.status, conv?.messages?.length, conv, loading])

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

  const canAct = lead && (
    (isBuyer && ['offer_ready','negotiating','agent_initiated','renegotiating'].includes(lead.status)) ||
    (isBuyer && lead.ai_paused_for_buyer) ||
    (!isBuyer && lead.status === 'awaiting_supplier_confirm') ||
    (!isBuyer && lead.ai_paused_for_supplier)
  )

  return (
    <div style={{ flex:1, display:'flex', overflow:'hidden' }}>
      <div style={{ flex:1, display:'flex', flexDirection:'column', background:'#0a1225', overflow:'hidden' }}>
        {/* Header */}
        <div style={{
          padding:'14px 24px', borderBottom:'1px solid rgba(255,255,255,0.06)',
          display:'flex', alignItems:'center', gap:14,
          background:'linear-gradient(180deg, rgba(15,23,42,0.95) 0%, rgba(10,18,37,0.95) 100%)'
        }}>
          <button onClick={() => route.reqId ? goRequirement(route.reqId) : goWelcome()}
            style={{
              width:32, height:32, borderRadius:8, background:'rgba(255,255,255,0.05)',
              border:'1px solid rgba(255,255,255,0.08)', cursor:'pointer',
              display:'flex', alignItems:'center', justifyContent:'center'
            }}>
            <ChevronLeft size={15} color="rgba(255,255,255,0.6)"/>
          </button>

          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ fontSize:15, fontWeight:700, color:'#fff', letterSpacing:'-0.01em' }}>
                {counterpart?.trade_name || (isBuyer ? `Seller #${lead?.supplier_id || leadId}` : `Buyer #${lead?.buyer_id || leadId}`)}
              </span>
              {lead && <StatusBadge status={lead.status}/>}
            </div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)', marginTop:3, display:'flex', gap:12, alignItems:'center' }}>
              {counterpart?.state && <span>{counterpart.city || ''}, {counterpart.state}</span>}
              <span style={{ color:'rgba(255,255,255,0.15)' }}>|</span>
              <span>Round {lead?.negotiation_round||0}</span>
              {lead?.current_offer_price && <>
                <span style={{ color:'rgba(255,255,255,0.15)' }}>|</span>
                <span style={{ color:'#10b981', fontWeight:600 }}>Best: ₹{lead.current_offer_price.toLocaleString()}/unit</span>
              </>}
            </div>
          </div>

          <button onClick={handleToggle}
            style={{
              display:'flex', alignItems:'center', gap:6, padding:'8px 14px',
              background: chatOn ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${chatOn ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.1)'}`,
              borderRadius:8, cursor:'pointer', fontFamily:'Inter,system-ui,sans-serif'
            }}>
            {chatOn
              ? <><ToggleRight size={15} color="#10b981"/><span style={{fontSize:11,fontWeight:700,color:'#10b981'}}>Live Chat</span></>
              : <><ToggleLeft size={15} color="rgba(255,255,255,0.4)"/><span style={{fontSize:11,fontWeight:600,color:'rgba(255,255,255,0.4)'}}>AI Mode</span></>
            }
          </button>

          {canAct && (
            <button onClick={() => setShowActions(p => !p)}
              style={{
                display:'flex', alignItems:'center', gap:6, padding:'8px 14px',
                background: showActions ? 'rgba(245,158,11,0.15)' : 'rgba(245,158,11,0.08)',
                border:'1px solid rgba(245,158,11,0.25)',
                borderRadius:8, cursor:'pointer', fontFamily:'Inter,system-ui,sans-serif'
              }}>
              <AlertTriangle size={14} color="#f59e0b"/>
              <span style={{ fontSize:11, fontWeight:700, color:'#f59e0b' }}>Actions</span>
            </button>
          )}

          <button onClick={fetch} style={{
            background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)',
            width:32, height:32, borderRadius:8, cursor:'pointer',
            display:'flex', alignItems:'center', justifyContent:'center'
          }}>
            <RefreshCw size={13} color="rgba(255,255,255,0.4)"/>
          </button>
        </div>

        {/* Confirmation Bar */}
        <ConfirmationBar lead={lead} isBuyer={isBuyer} onRefresh={fetch}/>

        {/* Chat Summary Strip */}
        <ChatSummaryStrip lead={lead} isBuyer={isBuyer} counterpart={counterpart}/>

        {/* Requirement Info Card */}
        {lead?.requirement && (
          <div style={{
            margin:'12px 24px 0', padding:'14px 18px',
            background:'rgba(96,165,250,0.06)', border:'1px solid rgba(96,165,250,0.15)',
            borderRadius:12, display:'flex', alignItems:'flex-start', gap:14
          }}>
            <div style={{
              width:36, height:36, borderRadius:9, flexShrink:0,
              background:'rgba(96,165,250,0.15)', border:'1px solid rgba(96,165,250,0.25)',
              display:'flex', alignItems:'center', justifyContent:'center'
            }}>
              <Package size={16} color="#60a5fa"/>
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <p style={{ fontSize:10, fontWeight:700, color:'rgba(96,165,250,0.7)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:6 }}>
                Matched For This Requirement
              </p>
              <p style={{ fontSize:14, fontWeight:700, color:'#fff', marginBottom:4 }}>
                {lead.requirement.product}
              </p>
              <div style={{ display:'flex', gap:12, flexWrap:'wrap', fontSize:11, color:'rgba(255,255,255,0.5)' }}>
                <span>Qty: {lead.requirement.quantity} {lead.requirement.quantity_unit || 'units'}</span>
                {lead.requirement.budget_max && (
                  <>
                    <span style={{ color:'rgba(255,255,255,0.2)' }}>|</span>
                    <span>Budget: ₹{lead.requirement.budget_max.toLocaleString()}/{lead.requirement.quantity_unit || 'unit'}</span>
                  </>
                )}
                {lead.requirement.delivery_location && (
                  <>
                    <span style={{ color:'rgba(255,255,255,0.2)' }}>|</span>
                    <span>{lead.requirement.delivery_location}</span>
                  </>
                )}
                {lead.fit_score && (
                  <>
                    <span style={{ color:'rgba(255,255,255,0.2)' }}>|</span>
                    <span style={{ color:'#10b981', fontWeight:600 }}>Match: {lead.fit_score.toFixed(0)}%</span>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* AI paused banner — shown to whoever needs to act */}
        {((isBuyer && lead?.ai_paused_for_buyer) || (!isBuyer && (lead?.ai_paused_for_supplier || lead?.status === 'awaiting_supplier_confirm'))) && (
          <div style={{
            margin:'12px 24px 0', padding:'12px 16px',
            background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.2)',
            borderRadius:10, display:'flex', alignItems:'center', gap:10
          }}>
            <AlertTriangle size={15} color="#f59e0b"/>
            <span style={{ fontSize:12, color:'#f59e0b', fontWeight:600, flex:1 }}>
              {lead?.status === 'awaiting_supplier_confirm' && !isBuyer
                ? 'Buyer accepted the deal — confirm or reject'
                : 'Your action needed — AI is waiting'}
            </span>
            <button onClick={() => setShowActions(true)}
              style={{ fontSize:11, fontWeight:700, color:'#f59e0b', background:'rgba(245,158,11,0.15)', border:'1px solid rgba(245,158,11,0.3)', borderRadius:6, padding:'6px 12px', cursor:'pointer' }}>
              Act Now
            </button>
          </div>
        )}

        {/* Messages */}
        <div style={{ flex:1, overflowY:'auto', padding:'20px 24px 180px 24px' }}>
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
            <Bubble key={m.id||i} msg={m} isBuyer={isBuyer}/>
          ))}

          {/* End-of-messages paused indicator */}
          {conv?.messages?.length > 0 && (() => {
            if (isBuyer && (lead?.ai_paused_for_buyer || lead?.status === 'offer_ready'))
              return (
                <div style={{ display:'flex', justifyContent:'center', margin:'16px 0' }}>
                  <div style={{ maxWidth:'85%', textAlign:'center', padding:'14px 18px', background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.2)', borderRadius:14 }}>
                    <AlertTriangle size={20} color="#f59e0b" style={{ margin:'0 auto 6px' }}/>
                    <p style={{ fontSize:12, fontWeight:600, color:'#f59e0b', marginBottom:3 }}>Your Decision Needed</p>
                    <p style={{ fontSize:10, color:'rgba(255,255,255,0.4)' }}>Use the Actions button above or the bar to accept, renegotiate, or decline.</p>
                    <button onClick={() => setShowActions(true)} style={{ marginTop:8, fontSize:11, fontWeight:700, color:'#f59e0b', background:'rgba(245,158,11,0.15)', border:'1px solid rgba(245,158,11,0.3)', borderRadius:6, padding:'6px 14px', cursor:'pointer' }}>Open Actions</button>
                  </div>
                </div>
              )
            if (!isBuyer && (lead?.ai_paused_for_supplier || lead?.status === 'awaiting_supplier_confirm'))
              return (
                <div style={{ display:'flex', justifyContent:'center', margin:'16px 0' }}>
                  <div style={{ maxWidth:'85%', textAlign:'center', padding:'14px 18px', background:'rgba(167,139,250,0.08)', border:'1px solid rgba(167,139,250,0.2)', borderRadius:14 }}>
                    <AlertTriangle size={20} color="#a78bfa" style={{ margin:'0 auto 6px' }}/>
                    <p style={{ fontSize:12, fontWeight:600, color:'#a78bfa', marginBottom:3 }}>
                      {lead?.status === 'awaiting_supplier_confirm' ? 'Buyer accepted — confirm or reject' : 'Your response needed'}
                    </p>
                    <p style={{ fontSize:10, color:'rgba(255,255,255,0.4)' }}>Use the Actions button or bar above.</p>
                    <button onClick={() => setShowActions(true)} style={{ marginTop:8, fontSize:11, fontWeight:700, color:'#a78bfa', background:'rgba(167,139,250,0.15)', border:'1px solid rgba(167,139,250,0.3)', borderRadius:6, padding:'6px 14px', cursor:'pointer' }}>Open Actions</button>
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

        {/* Input area */}
        <div style={{ padding:'16px 24px 20px', borderTop:'1px solid rgba(255,255,255,0.06)', background:'rgba(10,18,37,0.6)' }}>
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

      {/* Actions panel */}
      {showActions && lead && (
        <ActionPanel lead={lead} isBuyer={isBuyer} onClose={() => setShowActions(false)} onRefresh={fetch}/>
      )}
    </div>
  )
}
