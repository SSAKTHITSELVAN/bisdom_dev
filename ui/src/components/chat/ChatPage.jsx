import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getConvByLead, sendMessage, toggleChat, buyerDecision, supplierEscalation, suggestResponse } from '../../api/conversations'
import { getLead, getCounterpart } from '../../api/leads'
import StatusBadge from '../ui/StatusBadge'
import Spinner from '../ui/Spinner'
import BottomNav from '../ui/BottomNav'
import toast from 'react-hot-toast'
import { Send, Bot, User, AlertTriangle, CheckCircle, RefreshCw, MessageSquare, ChevronLeft, ToggleLeft, ToggleRight, X, Sparkles } from 'lucide-react'

const ROLE_LABELS = {
  ai_buyer:      { label: 'AI Buyer Agent',    color: '#3b82f6', isAI: true  },
  ai_supplier:   { label: 'AI Supplier Agent', color: '#8b5cf6', isAI: true  },
  human_buyer:   { label: 'Buyer',             color: '#10b981', isAI: false },
  human_supplier:{ label: 'Supplier',          color: '#f59e0b', isAI: false },
  system:        { label: 'System',            color: '#64748b', isAI: false },
}

function ChatBubble({ msg, isMine }) {
  const role = ROLE_LABELS[msg.role] || { label: msg.role, color: '#64748b', isAI: false }
  if (msg.role === 'system') {
    return (
      <div className="my-4 mx-auto max-w-[85%]">
        <div className="text-center text-[11px] text-slate-400 bg-slate-800/40 border border-slate-700/30 rounded-lg px-4 py-2.5 font-medium">
          {msg.content}
        </div>
      </div>
    )
  }
  return (
    <div className={`flex gap-2.5 mb-4 animate-fade-in ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-0.5"
        style={{ background: role.color+'12', border:`1.5px solid ${role.color}30` }}>
        {role.isAI ? <Bot size={14} style={{color:role.color}}/> : <User size={14} style={{color:role.color}}/>}
      </div>
      <div className={`max-w-[75%] ${isMine?'items-end':'items-start'} flex flex-col gap-1`}>
        <span className="text-[10px] font-semibold px-1 tracking-wide" style={{color:role.color}}>{role.label}</span>
        <div className={`rounded-2xl px-4 py-3 ${isMine ? 'bg-[#1e3a5f] border border-blue-500/20 rounded-br-sm' : 'bg-[#1a1f2e] border border-white/[0.08] rounded-bl-sm'}`}>
          <p className="text-[13px] leading-relaxed text-white/90 whitespace-pre-wrap">{msg.content}</p>
          {msg.structured_data?.offer && Object.keys(msg.structured_data.offer).length > 0 && (
            <div className="mt-3 bg-blue-500/[0.08] border border-blue-500/20 rounded-xl p-3">
              <p className="text-[10px] font-bold text-blue-400 mb-2 uppercase tracking-wider">Offer Details</p>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(msg.structured_data.offer).map(([k,v])=>(
                  <div key={k}>
                    <p className="text-[9px] text-white/40 capitalize">{k.replace(/_/g,' ')}</p>
                    <p className="text-[12px] font-bold text-white">{typeof v === 'number' ? `₹${v.toLocaleString()}` : v}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <span className="text-[9px] text-white/25 px-1">
          {new Date(msg.created_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}
        </span>
      </div>
    </div>
  )
}

function ActionSheet({ lead, onClose, onRefresh }) {
  const [loading, setLoading] = useState(false)
  const [renego, setRenego] = useState('')

  const doAction = async (fn, args) => {
    setLoading(true)
    try { await fn(args); onRefresh(); onClose(); toast.success('Done') }
    catch { toast.error('Action failed') }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative z-10 w-full bg-[#0c1524] border-t border-white/[0.06] rounded-t-3xl p-6 pb-10 animate-slide-up">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold text-white tracking-tight">Quick Actions</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center">
            <X size={14} className="text-white/50"/>
          </button>
        </div>
        <div className="flex flex-col gap-3">
          <button onClick={() => doAction(buyerDecision,{lead_id:lead.id,action:'accept'})} disabled={loading}
            className="flex items-center gap-3 rounded-xl px-4 py-4 transition-all bg-emerald-500/[0.06] border border-emerald-500/20 active:scale-[0.98]">
            <CheckCircle size={20} className="text-emerald-500"/>
            <div className="text-left">
              <p className="text-[13px] font-semibold text-white">Accept Deal</p>
              <p className="text-[11px] text-white/40 mt-0.5">Confirm at current offer price</p>
            </div>
          </button>
          <div className="rounded-xl px-4 py-4 bg-white/[0.03] border border-white/[0.08]">
            <div className="flex items-center gap-3 mb-3">
              <RefreshCw size={18} className="text-blue-500"/>
              <p className="text-[13px] font-semibold text-white">Renegotiate</p>
            </div>
            <input
              className="w-full px-3 py-2.5 text-[12px] bg-white/[0.05] border border-white/10 rounded-lg text-white placeholder-white/30 outline-none mb-3"
              placeholder='e.g. "Get price below ₹170/unit"'
              value={renego} onChange={e=>setRenego(e.target.value)}
            />
            <button onClick={() => doAction(buyerDecision,{lead_id:lead.id,action:'renegotiate',renegotiate_target:renego})}
              disabled={!renego||loading}
              className={`w-full py-2.5 rounded-lg text-[12px] font-semibold transition-all ${renego ? 'bg-gradient-to-r from-blue-700 to-blue-500 text-white' : 'bg-white/[0.06] text-white/30'}`}>
              Send to AI Agent
            </button>
          </div>
          <button onClick={() => doAction(buyerDecision,{lead_id:lead.id,action:'manual_chat'})} disabled={loading}
            className="flex items-center gap-3 rounded-xl px-4 py-4 transition-all bg-purple-500/[0.06] border border-purple-500/20 active:scale-[0.98]">
            <MessageSquare size={20} className="text-purple-500"/>
            <div className="text-left">
              <p className="text-[13px] font-semibold text-white">Take Over Chat</p>
              <p className="text-[11px] text-white/40 mt-0.5">Talk directly to supplier</p>
            </div>
          </button>
          <button onClick={() => doAction(buyerDecision,{lead_id:lead.id,action:'decline'})} disabled={loading}
            className="flex items-center gap-3 rounded-xl px-4 py-4 transition-all bg-red-500/[0.04] border border-red-500/15 active:scale-[0.98]">
            <X size={20} className="text-red-400"/>
            <div className="text-left">
              <p className="text-[13px] font-semibold text-red-400">Decline</p>
              <p className="text-[11px] text-white/30 mt-0.5">Pass on this supplier</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ChatPage() {
  const { leadId } = useParams()
  const navigate = useNavigate()
  const [conv, setConv] = useState(null)
  const [lead, setLead] = useState(null)
  const [counterpart, setCounterpart] = useState(null)
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [sending, setSending] = useState(false)
  const [showActions, setShowActions] = useState(false)
  const [chatEnabled, setChatEnabled] = useState(false)
  const [suggesting, setSuggesting] = useState(false)
  const bottomRef = useRef(null)

  const fetchData = async () => {
    try {
      const [convRes, leadRes] = await Promise.all([getConvByLead(leadId), getLead(leadId)])
      setConv(convRes.data); setLead(leadRes.data)
      setChatEnabled(convRes.data.buyer_chat_enabled||convRes.data.supplier_chat_enabled)
      try { const r = await getCounterpart(leadId); setCounterpart(r.data) } catch {}
    } catch {}
    setLoading(false)
  }

  useEffect(()=>{ fetchData() },[leadId])
  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:'smooth'}) },[conv?.messages])

  const handleToggle = async () => {
    try {
      await toggleChat({lead_id:parseInt(leadId),enabled:!chatEnabled})
      setChatEnabled(!chatEnabled)
      toast.success(chatEnabled ? 'AI mode' : 'Human chat enabled')
      fetchData()
    } catch { toast.error('Failed') }
  }

  const handleSend = async () => {
    if (!msg.trim()||sending||!conv) return
    setSending(true)
    try { await sendMessage({conversation_id:conv.id,content:msg}); setMsg(''); fetchData() }
    catch(err){ toast.error(err.response?.data?.detail||'Failed') }
    finally { setSending(false) }
  }

  const handleSuggest = async () => {
    if (suggesting || !lead) return
    setSuggesting(true)
    try {
      const res = await suggestResponse({ lead_id: lead.id })
      setMsg(res.data.suggested_message)
      toast.success('Suggestion ready — edit & send')
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Could not generate suggestion')
    } finally {
      setSuggesting(false)
    }
  }

  return (
    <div className="bg-[#060d1a] min-h-screen flex flex-col relative">
      <div className="relative z-10 flex flex-col h-screen">
        {/* Header */}
        <div className="px-4 pt-12 pb-3 bg-[#0a1225]/95 backdrop-blur-md border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <button onClick={()=>navigate('/leads')}
              className="w-8 h-8 bg-white/[0.05] border border-white/[0.08] rounded-lg flex items-center justify-center shrink-0">
              <ChevronLeft size={15} color="rgba(255,255,255,0.6)"/>
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white tracking-tight">
                  {counterpart?.trade_name || `Lead #${leadId}`}
                </span>
                {lead && <StatusBadge status={lead.status}/>}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                {counterpart && <p className="text-[11px] text-white/40 truncate">{counterpart.city}, {counterpart.state}</p>}
                {lead?.current_offer_price && (
                  <span className="text-[11px] text-emerald-400 font-semibold">
                    Best: ₹{lead.current_offer_price.toLocaleString()}
                  </span>
                )}
              </div>
            </div>
            <button onClick={handleToggle}
              className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border ${chatEnabled ? 'bg-emerald-500/10 border-emerald-500/25' : 'bg-white/[0.04] border-white/[0.1]'}`}>
              {chatEnabled
                ? <><ToggleRight size={14} className="text-emerald-500"/><span className="text-emerald-500 font-semibold text-[11px]">Live</span></>
                : <><ToggleLeft size={14} className="text-white/40"/><span className="text-white/40 text-[11px]">AI</span></>}
            </button>
            {lead && ['offer_ready','negotiating','agent_initiated','renegotiating'].includes(lead.status) && (
              <button onClick={()=>setShowActions(true)}
                className="w-8 h-8 bg-amber-500/10 border border-amber-500/25 rounded-lg flex items-center justify-center">
                <AlertTriangle size={14} className="text-amber-500"/>
              </button>
            )}
          </div>
          {lead?.ai_paused_for_buyer && (
            <div className="mt-3 bg-amber-500/[0.08] border border-amber-500/20 rounded-xl px-3 py-2.5 flex items-center gap-2">
              <AlertTriangle size={14} className="text-amber-500 shrink-0"/>
              <p className="text-[11px] text-amber-400 font-semibold flex-1">Your decision needed</p>
              <button onClick={()=>setShowActions(true)} className="text-[11px] text-amber-500 font-bold bg-amber-500/15 px-3 py-1 rounded-md">Decide</button>
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-5">
          {loading && <div className="flex justify-center py-16"><Spinner size={24} color="rgba(255,255,255,0.3)"/></div>}
          {!loading&&!conv && (
            <div className="text-center py-16">
              <Bot size={40} className="text-white/15 mx-auto mb-4"/>
              <p className="text-white/30 text-sm font-medium">No conversation yet</p>
              <p className="text-white/15 text-xs mt-2">AI agents will begin shortly</p>
              <button onClick={fetchData} className="mt-4 text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-lg px-4 py-2 inline-flex items-center gap-2">
                <RefreshCw size={12}/> Refresh
              </button>
            </div>
          )}
          {conv?.messages?.map((m,i) => (
            <ChatBubble key={m.id||i} msg={m}
              isMine={m.role==='human_buyer'||m.role==='ai_buyer'}/>
          ))}
          <div ref={bottomRef}/>
        </div>

        {/* Input */}
        <div className="px-4 pt-2" style={{paddingBottom:'calc(env(safe-area-inset-bottom) + 88px)'}}>
          {chatEnabled&&conv ? (
            <div className="flex flex-col gap-2.5">
              <div className="bg-white/[0.04] border border-white/[0.1] rounded-xl flex items-end gap-2 p-3">
                <textarea
                  className="flex-1 bg-transparent text-white text-[13px] placeholder-white/30 resize-none outline-none leading-relaxed"
                  style={{fontFamily:'Inter,system-ui,sans-serif',minHeight:24,maxHeight:100}}
                  placeholder="Type your message…"
                  value={msg} onChange={e=>setMsg(e.target.value)}
                  onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();handleSend()}}}
                  rows={1}
                />
                <button onClick={handleSend} disabled={!msg.trim()||sending}
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{background:msg.trim()&&!sending?'linear-gradient(135deg,#1d4ed8,#3b82f6)':'rgba(255,255,255,0.06)'}}>
                  {sending?<Spinner size={14}/>:<Send size={14} color="white"/>}
                </button>
              </div>
              {/* AI Suggest Button */}
              <button
                onClick={handleSuggest}
                disabled={suggesting}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border transition-all active:scale-[0.98]"
                style={{
                  background:'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(59,130,246,0.1))',
                  borderColor:'rgba(139,92,246,0.25)'
                }}
              >
                {suggesting
                  ? <><Spinner size={13}/><span className="text-[12px] text-white/50 font-medium">Generating…</span></>
                  : <><Sparkles size={14} className="text-purple-400"/><span className="text-[12px] text-purple-400 font-semibold">AI Suggest Best Response</span></>
                }
              </button>
            </div>
          ) : (
            <div className="bg-blue-500/[0.05] border border-blue-500/15 rounded-xl px-4 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-md bg-blue-500/10 flex items-center justify-center">
                  <Bot size={14} className="text-blue-400"/>
                </div>
                <span className="text-[12px] text-white/50 font-medium">AI negotiating on your behalf</span>
              </div>
              <button onClick={fetchData} className="w-7 h-7 rounded-md bg-white/[0.06] border border-white/10 flex items-center justify-center">
                <RefreshCw size={12} className="text-white/30"/>
              </button>
            </div>
          )}
        </div>
      </div>
      <BottomNav/>
      {showActions&&lead && (
        <ActionSheet lead={lead} onClose={()=>setShowActions(false)} onRefresh={fetchData}/>
      )}
    </div>
  )
}
