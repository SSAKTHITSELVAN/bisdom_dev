import { useState, useRef, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { chatRequirement, confirmRequirement } from '../../api/requirements'
import Spinner from '../ui/Spinner'
import BottomNav from '../ui/BottomNav'
import toast from 'react-hot-toast'
import { Send, Sparkles, ChevronRight, CheckCircle } from 'lucide-react'

const SUGGESTIONS = [
  'I need 500kg mild steel rods delivered to Chennai',
  '200 cotton t-shirts, black, 180GSM, under ₹180/piece',
  '50 industrial motors, 2HP, 3-phase, Coimbatore',
]

function getQuickReplies(lastAiMsg) {
  if (!lastAiMsg) return []
  const lower = lastAiMsg.toLowerCase()
  if (lower.includes('budget') || lower.includes('price') || lower.includes('willing to pay'))
    return ['Under ₹100/piece', 'Under ₹200/piece', 'Under ₹500/piece', 'No budget limit']
  if (lower.includes('material') || lower.includes('fabric'))
    return ['Cotton', 'Polyester', 'Cotton-poly blend', 'No preference']
  if (lower.includes('color') || lower.includes('colour'))
    return ['White', 'Black', 'Navy blue', 'No preference']
  if (lower.includes('size'))
    return ['S, M, L, XL', 'Free size', 'Mixed sizes', 'Not sure']
  if (lower.includes('deliver') || lower.includes('location') || lower.includes('city') || lower.includes('where'))
    return ['Mumbai', 'Delhi', 'Chennai', 'Bangalore']
  if (lower.includes('how soon') || lower.includes('deadline') || lower.includes('days') || lower.includes('when'))
    return ['7 days', '15 days', '30 days', 'No rush']
  if (lower.includes('one-time') || lower.includes('recurring') || lower.includes('order type'))
    return ['One-time', 'Monthly recurring', 'Quarterly']
  if (lower.includes('packaging'))
    return ['Standard', 'Custom branded', 'Bulk packaging', 'No preference']
  if (lower.includes('confirm') || lower.includes('look correct') || lower.includes('everything look'))
    return ['Yes, confirm', 'Change budget', 'Change quantity']
  if (lower.includes('anything else') || lower.includes('additional'))
    return ['That\'s all, post it', 'Need GST invoice', 'Need sample first']
  return []
}

function TypingIndicator() {
  return (
    <div className="bubble-ai flex items-center gap-1 py-3 px-4">
      <div className="typing-dot"/><div className="typing-dot"/><div className="typing-dot"/>
    </div>
  )
}

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user'
  if (msg.role === 'system') return <div className="bubble-system my-2 text-xs">{msg.content}</div>
  return (
    <div className={`flex ${isUser?'justify-end':'justify-start'} mb-3 animate-fade-in`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-blue-500/30 flex items-center justify-center mr-2 mt-1 shrink-0">
          <Sparkles size={12} className="text-blue-400"/>
        </div>
      )}
      <div className={isUser?'bubble-user':'bubble-ai'}>
        <p className="text-sm leading-relaxed text-white/90 whitespace-pre-wrap">{msg.content}</p>
      </div>
    </div>
  )
}

export default function HomePage() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [requirementId, setRequirementId] = useState(null)
  const [isComplete, setIsComplete] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [started, setStarted] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const navigate = useNavigate()

  const quickReplies = useMemo(() => {
    if (loading || isComplete) return []
    const lastAi = [...messages].reverse().find(m => m.role === 'ai')
    return getQuickReplies(lastAi?.content)
  }, [messages, loading, isComplete])

  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:'smooth'}) },[messages,loading])

  const sendMessage = async (text) => {
    if (!text.trim()||loading) return
    setMessages(prev=>[...prev,{role:'user',content:text}])
    setInput(''); setStarted(true); setLoading(true)
    try {
      const payload={message:text}
      if(requirementId) payload.requirement_id=requirementId
      const res = await chatRequirement(payload)
      const {requirement_id,ai_response,is_complete,requirement_summary}=res.data
      setRequirementId(requirement_id); setIsComplete(is_complete)
      setMessages(prev=>[...prev,{role:'ai',content:ai_response}])
      if(is_complete&&requirement_summary){
        const budgetText = requirement_summary.budget_max ? `₹${requirement_summary.budget_max} max` : 'Budget flexible'
        setMessages(prev=>[...prev,{role:'system',content:`📋 ${requirement_summary.product} · ${requirement_summary.quantity} ${requirement_summary.quantity_unit||'units'} · ${budgetText}`}])
      }
    } catch {
      toast.error('Something went wrong')
      setMessages(prev=>[...prev,{role:'ai',content:'Sorry, I ran into an error. Please try again.'}])
    } finally { setLoading(false); setTimeout(()=>inputRef.current?.focus(),100) }
  }

  const handleConfirm = async () => {
    setConfirming(true)
    try {
      await confirmRequirement(requirementId)
      setConfirmed(true)
      setMessages(prev=>[...prev,{role:'system',content:'🤖 AI agents are matching suppliers and starting negotiations…'}])
      setTimeout(()=>navigate('/leads'),2000)
    } catch { toast.error('Failed to confirm') }
    finally { setConfirming(false) }
  }

  return (
    <div className="bg-bisdom min-h-screen flex flex-col relative">
      <div className="relative z-10 flex flex-col h-screen">
        <div className="px-5 pt-12 pb-3 flex items-center justify-between">
          <span className="text-2xl font-black tracking-tight"
            style={{background:'linear-gradient(135deg,#fff,#93c5fd)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>
            Bisdom
          </span>
          <button onClick={()=>navigate('/leads')}
            className="flex items-center gap-1.5 text-xs text-white/50 font-semibold glass px-3 py-1.5 rounded-full hover:text-white transition-colors">
            Leads <ChevronRight size={12}/>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-2">
          {!started && (
            <div className="flex flex-col items-center justify-center h-full pb-16 animate-fade-in">
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-3xl bg-blue-500/20 flex items-center justify-center mx-auto mb-4 border border-blue-400/20">
                  <Sparkles size={28} className="text-blue-400"/>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">What do you need?</h2>
                <p className="text-sm text-white/45 leading-relaxed max-w-xs">
                  Describe your procurement. AI finds and negotiates with suppliers for you.
                </p>
              </div>
              <div className="w-full max-w-sm space-y-2">
                <p className="text-xs text-white/30 font-semibold uppercase tracking-wider mb-3">Try these</p>
                {SUGGESTIONS.map((s,i)=>(
                  <button key={i} onClick={()=>sendMessage(s)}
                    className="w-full text-left glass rounded-2xl px-4 py-3 text-sm text-white/65 hover:text-white hover:bg-white/10 transition-all">
                    <span className="text-blue-400 mr-2">→</span>{s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {started && (
            <div className="flex flex-col pt-2 pb-4">
              {messages.map((msg,i)=><MessageBubble key={i} msg={msg}/>)}
              {loading && (
                <div className="flex justify-start mb-3">
                  <div className="w-7 h-7 rounded-full bg-blue-500/30 flex items-center justify-center mr-2 mt-1 shrink-0">
                    <Sparkles size={12} className="text-blue-400"/>
                  </div>
                  <TypingIndicator/>
                </div>
              )}
              {quickReplies.length > 0 && !loading && (
                <div className="flex flex-wrap gap-2 mt-2 mb-2 animate-fade-in">
                  {quickReplies.map((r, i) => (
                    <button key={i} onClick={() => sendMessage(r)}
                      className="text-xs font-medium text-blue-400 hover:text-blue-300 transition-all"
                      style={{
                        background:'rgba(96,165,250,0.08)', border:'1px solid rgba(96,165,250,0.2)',
                        borderRadius:18, padding:'7px 14px', whiteSpace:'nowrap'
                      }}>
                      {r}
                    </button>
                  ))}
                </div>
              )}

              {isComplete&&!confirmed && (
                <div className="mt-4 animate-slide-up">
                  <button onClick={handleConfirm} disabled={confirming} className="btn-primary flex items-center justify-center gap-2">
                    {confirming?<Spinner size={16}/>:<CheckCircle size={16}/>}
                    {confirming?'Confirming…':'Confirm & Find Suppliers'}
                  </button>
                  <p className="text-xs text-white/30 text-center mt-2">AI agents negotiate simultaneously with all matched suppliers</p>
                </div>
              )}
              {confirmed && (
                <div className="mt-4 glass-dark rounded-2xl p-4 text-center animate-fade-in">
                  <CheckCircle size={24} className="text-green-400 mx-auto mb-2"/>
                  <p className="text-sm font-semibold text-white">Agents activated!</p>
                </div>
              )}
            </div>
          )}
          <div ref={bottomRef}/>
        </div>

        <div className="px-4 pt-2" style={{paddingBottom:'calc(env(safe-area-inset-bottom) + 88px)'}}>
          <div className="glass rounded-2xl flex items-end gap-2 p-3">
            <textarea ref={inputRef}
              className="flex-1 bg-transparent text-white text-sm placeholder-white/30 resize-none outline-none leading-relaxed"
              style={{fontFamily:'Montserrat,sans-serif',minHeight:24,maxHeight:120}}
              placeholder="Describe what you need to source…"
              value={input} onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage(input)}}}
              rows={1}
            />
            <button onClick={()=>sendMessage(input)} disabled={!input.trim()||loading}
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all"
              style={{background:input.trim()&&!loading?'linear-gradient(135deg,#054E94,#1A8FFF)':'rgba(255,255,255,0.1)'}}>
              {loading?<Spinner size={15}/>:<Send size={15} color="white"/>}
            </button>
          </div>
        </div>
      </div>
      <BottomNav/>
    </div>
  )
}
