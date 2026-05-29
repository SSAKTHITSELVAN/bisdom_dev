import { useState, useRef, useEffect, useMemo } from 'react'
import { chatRequirement, confirmRequirement } from '@/api/requirements'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { Send, Sparkles, CheckCircle, X } from 'lucide-react'
import Spinner from '@/components/ui/Spinner'
import toast from 'react-hot-toast'

const SUGGESTIONS = [
  'I need 500kg mild steel angle bars delivered to Chennai within 2 weeks, budget ₹85,000',
  '200 cotton t-shirts, 100% cotton 180GSM, black, sizes S-XL, Tirupur, under ₹200/piece',
  '50 industrial electric motors, 2HP 3-phase, Coimbatore, delivery in 10 days',
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
  if (lower.includes('one-time') || lower.includes('recurring') || lower.includes('order type') || lower.includes('repeat'))
    return ['One-time', 'Monthly recurring', 'Quarterly']
  if (lower.includes('packaging'))
    return ['Standard', 'Custom branded', 'Bulk packaging', 'No preference']
  if (lower.includes('confirm') || lower.includes('look correct') || lower.includes('everything look'))
    return ['Yes, confirm', 'Change budget', 'Change quantity']
  if (lower.includes('anything else') || lower.includes('additional'))
    return ['That\'s all, post it', 'Need GST invoice', 'Need sample first']
  return []
}

function Bubble({ msg }) {
  const isUser   = msg.role === 'user'
  const isSystem = msg.role === 'system'
  if (isSystem) return (
    <div style={{ display:'flex', justifyContent:'center', margin:'20px 0' }}>
      <div className="bubble-system">{msg.content}</div>
    </div>
  )
  return (
    <div style={{ marginBottom:18 }} className="fade-in">
      <div style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
        <div style={{ width:36, height:36, borderRadius:9, background: isUser ? 'rgba(59,130,246,0.15)' : 'rgba(96,165,250,0.15)', border: `1px solid ${isUser ? 'rgba(59,130,246,0.3)' : 'rgba(96,165,250,0.3)'}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <Sparkles size={16} color={isUser ? '#3b82f6' : '#60a5fa'}/>
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ marginBottom:8 }}>
            <span style={{ fontSize:11, fontWeight:600, color: isUser ? '#3b82f6' : '#60a5fa', letterSpacing:'0.01em' }}>
              {isUser ? 'You' : 'AI Assistant'}
            </span>
          </div>
          <div className={isUser ? 'bubble-user' : 'bubble-ai'}>
            <p style={{ fontSize:13, lineHeight:1.65, color:'rgba(255,255,255,0.9)', whiteSpace:'pre-wrap', margin:0 }}>
              {msg.content}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function NewRequirementChat() {
  const [messages, setMessages]   = useState([])
  const [input, setInput]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [reqId, setReqId]         = useState(null)
  const [isComplete, setIsComplete] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [confirmed, setConfirmed]   = useState(false)
  const [started, setStarted]       = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [requirementSummary, setRequirementSummary] = useState(null)
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)
  const { goWelcome, goRequirement, triggerRefresh } = useWorkspaceStore()

  const quickReplies = useMemo(() => {
    if (loading || isComplete) return []
    const lastAi = [...messages].reverse().find(m => m.role === 'ai')
    return getQuickReplies(lastAi?.content)
  }, [messages, loading, isComplete])

  // Auto-scroll to bottom when messages change - like WhatsApp
  useEffect(() => {
    if (bottomRef.current) {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
      }, 100)
    }
  }, [messages.length, loading]) // Track length to avoid unnecessary scrolls

  const send = async (text) => {
    if (!text.trim() || loading) return
    setMessages(p => [...p, { role:'user', content:text }])
    setInput(''); setStarted(true); setLoading(true)
    try {
      const payload = { message: text }
      if (reqId) payload.requirement_id = reqId
      const res = await chatRequirement(payload)
      const { requirement_id, ai_response, is_complete, requirement_summary } = res.data
      setReqId(requirement_id)
      setIsComplete(is_complete)
      setMessages(p => [...p, { role:'ai', content: ai_response }])
      if (is_complete && requirement_summary) {
        setRequirementSummary(requirement_summary)
        const budgetText = requirement_summary.budget_max ? `₹${requirement_summary.budget_max} max` : 'Budget flexible'
        setMessages(p => [...p, {
          role:'system',
          content:`📋 ${requirement_summary.product} · ${requirement_summary.quantity} ${requirement_summary.quantity_unit||'units'} · ${budgetText}`
        }])
      }
    } catch { toast.error('Something went wrong') }
    finally { setLoading(false); setTimeout(() => inputRef.current?.focus(), 80) }
  }

  const handleConfirmClick = () => {
    setShowConfirmModal(true)
  }

  const handleConfirm = async () => {
    setShowConfirmModal(false)
    setConfirming(true)
    try {
      await confirmRequirement(reqId)
      setConfirmed(true)
      setMessages(p => [...p, { role:'system', content:'🤖 AI agents are now matching suppliers and starting negotiations. Check the sidebar for updates.' }])
      triggerRefresh()
      setTimeout(() => {
        goRequirement(reqId)
      }, 2000)
    } catch { toast.error('Failed to confirm') }
    finally { setConfirming(false) }
  }

  return (
    <div style={{
      flex:1, display:'flex', flexDirection:'column',
      background:'#0a1628', height:'100vh', overflow:'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding:'20px 28px 16px',
        borderBottom:'1px solid rgba(255,255,255,0.07)',
        display:'flex', alignItems:'center', justifyContent:'space-between'
      }}>
        <div>
          <h2 style={{ fontSize:16, fontWeight:700, color:'#fff' }}>New Requirement</h2>
          <p style={{ fontSize:11, color:'rgba(255,255,255,0.4)', marginTop:2 }}>
            Describe what you need — AI will gather details and find suppliers
          </p>
        </div>
        <button onClick={() => goWelcome()}
          style={{ width:28, height:28, borderRadius:7, background:'rgba(255,255,255,0.07)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <X size={14} color="rgba(255,255,255,0.5)" />
        </button>
      </div>

      {/* Chat area */}
      <div style={{ flex:1, overflowY:'auto', padding:'24px 20px' }}>
        <div className="chat-container">
          {!started && (
            <div className="fade-in">
            <p style={{ fontSize:13, color:'rgba(255,255,255,0.4)', marginBottom:16, lineHeight:1.6 }}>
              Just describe your requirement naturally. Examples:
            </p>
            {SUGGESTIONS.map((s, i) => (
              <button key={i} onClick={() => send(s)}
                style={{
                  display:'block', width:'100%', textAlign:'left',
                  background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)',
                  borderRadius:10, padding:'11px 14px', marginBottom:8,
                  color:'rgba(255,255,255,0.65)', fontSize:13, cursor:'pointer',
                  fontFamily:'Montserrat,sans-serif', lineHeight:1.5,
                  transition:'all 0.15s'
                }}
                onMouseEnter={e => e.target.style.background='rgba(255,255,255,0.08)'}
                onMouseLeave={e => e.target.style.background='rgba(255,255,255,0.04)'}
              >
                <span style={{ color:'#60a5fa', marginRight:8 }}>→</span>{s}
              </button>
            ))}
            </div>
          )}

          {messages.map((m, i) => <Bubble key={i} msg={m} />)}
          {loading && (
            <div style={{ marginBottom:18 }}>
              <div style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
                <div style={{ width:36, height:36, borderRadius:9, background:'rgba(96,165,250,0.15)', border:'1px solid rgba(96,165,250,0.3)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Sparkles size={16} color="#60a5fa" />
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ marginBottom:8 }}>
                    <span style={{ fontSize:11, fontWeight:600, color:'#60a5fa' }}>AI Assistant</span>
                  </div>
                  <div className="bubble-ai" style={{ display:'flex', gap:5, alignItems:'center' }}>
                    <div className="typing-dot"/><div className="typing-dot"/><div className="typing-dot"/>
                  </div>
                </div>
              </div>
            </div>
          )}

          {quickReplies.length > 0 && !loading && (
            <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:8, marginBottom:8 }} className="fade-in">
              {quickReplies.map((r, i) => (
                <button key={i} onClick={() => send(r)}
                  style={{
                    background:'rgba(96,165,250,0.08)', border:'1px solid rgba(96,165,250,0.2)',
                    borderRadius:18, padding:'7px 14px', color:'#60a5fa', fontSize:12,
                    cursor:'pointer', fontFamily:'Montserrat,sans-serif', fontWeight:500,
                    transition:'all 0.15s', whiteSpace:'nowrap'
                  }}
                  onMouseEnter={e => { e.target.style.background='rgba(96,165,250,0.18)'; e.target.style.borderColor='rgba(96,165,250,0.4)' }}
                  onMouseLeave={e => { e.target.style.background='rgba(96,165,250,0.08)'; e.target.style.borderColor='rgba(96,165,250,0.2)' }}
                >{r}</button>
              ))}
            </div>
          )}

          {isComplete && !confirmed && (
            <div style={{ marginTop:20 }} className="slide-up">
              <button onClick={handleConfirmClick} disabled={confirming}
                className="btn-primary"
                style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, width:'auto', padding:'12px 28px' }}>
                {confirming ? <Spinner size={15}/> : <CheckCircle size={15}/>}
                {confirming ? 'Confirming…' : 'Confirm & Find Suppliers'}
              </button>
              <p style={{ fontSize:11, color:'rgba(255,255,255,0.3)', marginTop:8 }}>
                AI agents will simultaneously negotiate with all matched suppliers
              </p>
            </div>
          )}
          <div ref={bottomRef}/>
        </div>
      </div>

      {/* Input */}
      <div style={{ padding:'16px 20px 24px', borderTop:'1px solid rgba(255,255,255,0.07)' }}>
        <div className="chat-container">
          <div style={{
            display:'flex', alignItems:'flex-end', gap:10,
            background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)',
            borderRadius:12, padding:'10px 12px'
          }}>
          <textarea ref={inputRef}
            style={{
              flex:1, background:'transparent', border:'none', outline:'none',
              color:'#fff', fontSize:13, fontFamily:'Montserrat,sans-serif',
              resize:'none', lineHeight:1.5, minHeight:22, maxHeight:120,
              placeholder:'rgba(255,255,255,0.3)'
            }}
            placeholder="Describe your procurement requirement…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send(input)} }}
            rows={1}
          />
            <button onClick={() => send(input)} disabled={!input.trim()||loading}
              style={{
                width:34, height:34, borderRadius:9, border:'none', cursor:'pointer',
                display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
                background: input.trim()&&!loading ? 'linear-gradient(135deg,#054E94,#1A8FFF)' : 'rgba(255,255,255,0.08)',
                transition:'background 0.2s'
              }}>
              {loading ? <Spinner size={14}/> : <Send size={14} color="white"/>}
            </button>
          </div>
          <p style={{ fontSize:10, color:'rgba(255,255,255,0.2)', textAlign:'center', marginTop:8 }}>
            Bisdom AI · Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: 20
        }} onClick={() => setShowConfirmModal(false)}>
          <div style={{
            background: '#0d1f3c', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 16, padding: 28, maxWidth: 500, width: '100%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
          }} onClick={e => e.stopPropagation()} className="slide-up">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: 'rgba(59,130,246,0.15)',
                border: '1px solid rgba(59,130,246,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <CheckCircle size={20} color="#60a5fa" />
              </div>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: 0 }}>
                  Confirm Requirement
                </h3>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: 0, marginTop: 2 }}>
                  Review before posting to suppliers
                </p>
              </div>
            </div>

            {requirementSummary && (
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 12,
                padding: 16,
                marginBottom: 20
              }}>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginBottom: 4 }}>
                    PRODUCT
                  </div>
                  <div style={{ fontSize: 14, color: '#fff', fontWeight: 600 }}>
                    {requirementSummary.product}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginBottom: 4 }}>
                      QUANTITY
                    </div>
                    <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>
                      {requirementSummary.quantity} {requirementSummary.quantity_unit || 'units'}
                    </div>
                  </div>

                  {requirementSummary.budget_max && (
                    <div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginBottom: 4 }}>
                        BUDGET
                      </div>
                      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>
                        ₹{requirementSummary.budget_max} max
                      </div>
                    </div>
                  )}
                </div>

                {requirementSummary.delivery_location && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginBottom: 4 }}>
                      DELIVERY LOCATION
                    </div>
                    <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>
                      {requirementSummary.delivery_location}
                    </div>
                  </div>
                )}

                {requirementSummary.delivery_days && (
                  <div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginBottom: 4 }}>
                      DELIVERY TIMELINE
                    </div>
                    <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>
                      {requirementSummary.delivery_days} days
                    </div>
                  </div>
                )}

                {requirementSummary.specifications && Object.keys(requirementSummary.specifications).length > 0 && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginBottom: 6 }}>
                      SPECIFICATIONS
                    </div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', lineHeight: 1.6 }}>
                      {Object.entries(requirementSummary.specifications).map(([key, value]) => (
                        <div key={key} style={{ marginBottom: 3 }}>
                          <span style={{ color: 'rgba(255,255,255,0.5)' }}>{key}:</span> {value}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div style={{
              background: 'rgba(59,130,246,0.08)',
              border: '1px solid rgba(59,130,246,0.2)',
              borderRadius: 10,
              padding: 12,
              marginBottom: 20
            }}>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', margin: 0, lineHeight: 1.6 }}>
                By confirming, AI agents will match this requirement with suppliers and begin automated negotiations on your behalf.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="btn-ghost"
                style={{ flex: 1, padding: '12px 20px', fontSize: 13 }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="btn-primary"
                style={{ flex: 1, padding: '12px 20px', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                <CheckCircle size={15} />
                Confirm & Post
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
