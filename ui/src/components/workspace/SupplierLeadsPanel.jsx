import { useState, useEffect, useCallback } from 'react'
import { generateCard, getCard, submitCard, listQA, answerQuestion } from '@/api/cards'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { ShoppingCart, Zap, CheckCircle, Star, MessageSquare, Send, MessageCircle } from 'lucide-react'

function CardView({ card, leadId, cardStatus, onSubmit, submitting }) {
  const c = card || {}
  const [showQA, setShowQA] = useState(false)
  const [qaList, setQaList] = useState([])
  const [answerText, setAnswerText] = useState({})
  const [answering, setAnswering] = useState(null)

  useEffect(() => {
    if (showQA) {
      listQA(leadId).then(r => setQaList(r.data || [])).catch(() => {})
    }
  }, [showQA, leadId])

  const handleAnswer = async (qaId) => {
    const text = answerText[qaId]?.trim()
    if (!text) return
    setAnswering(qaId)
    try {
      await answerQuestion(leadId, qaId, text)
      const r = await listQA(leadId)
      setQaList(r.data || [])
      setAnswerText(prev => ({ ...prev, [qaId]: '' }))
    } catch (e) { console.error(e) } finally { setAnswering(null) }
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8, marginBottom: 14 }}>
        {[
          { label: 'Price', value: c.price_per_unit ? `₹${Number(c.price_per_unit).toLocaleString()}/${c.price_unit || 'unit'}` : '—' },
          { label: 'Lead Time', value: c.lead_time_days ? `${c.lead_time_days} days` : '—' },
          { label: 'MOQ', value: c.moq ? `${c.moq} units` : '—' },
          { label: 'Payment', value: c.payment_terms || '—' },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: '10px 12px' }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{value}</div>
          </div>
        ))}
      </div>

      {c.ai_verdict && (
        <div style={{ background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.15)', borderRadius: 8, padding: '10px 14px', marginBottom: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#60a5fa', marginBottom: 4 }}>AI VERDICT</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>{c.ai_verdict}</div>
        </div>
      )}

      {c.key_strengths?.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Key Strengths</div>
          {c.key_strengths.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>
              <Star size={10} color="#fbbf24"/>{s}
            </div>
          ))}
        </div>
      )}

      {c.offer_notes && (
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5, marginBottom: 14 }}>
          <span style={{ fontWeight: 700 }}>Notes: </span>{c.offer_notes}
        </div>
      )}

      {cardStatus === 'submitted' ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.25)', borderRadius: 10, padding: '12px 16px' }}>
          <CheckCircle size={16} color="#34d399"/>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#34d399' }}>Card submitted — waiting for buyer decision</span>
        </div>
      ) : (
        <button
          onClick={onSubmit}
          disabled={submitting}
          style={{
            width: '100%', padding: '12px', borderRadius: 10,
            background: submitting ? 'rgba(167,139,250,0.1)' : 'rgba(167,139,250,0.2)',
            border: '1px solid rgba(167,139,250,0.4)',
            color: '#a78bfa', fontSize: 13, fontWeight: 700,
            cursor: submitting ? 'wait' : 'pointer', fontFamily: 'Montserrat,sans-serif',
          }}
        >
          {submitting ? 'Submitting…' : 'Submit Card as Formal Offer'}
        </button>
      )}

      <button
        onClick={() => setShowQA(!showQA)}
        style={{ marginTop: 12, background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontFamily: 'Montserrat,sans-serif', padding: 0 }}
      >
        <MessageSquare size={12}/>{showQA ? 'Hide Q&A' : 'Buyer Questions (Q&A)'}
      </button>

      {showQA && (
        <div style={{ marginTop: 12, borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 12 }}>
          {qaList.length === 0 && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>No questions yet.</div>}
          {qaList.map(qa => (
            <div key={qa.id} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: '#fff', marginBottom: 6 }}>Q: {qa.question}</div>
              {qa.answer ? (
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', paddingLeft: 12, borderLeft: '2px solid rgba(167,139,250,0.3)' }}>
                  A: {qa.answer}
                  <span style={{ fontSize: 10, marginLeft: 6, color: qa.answered_by_ai ? 'rgba(96,165,250,0.6)' : 'rgba(167,139,250,0.6)' }}>
                    {qa.answered_by_ai ? '· AI' : '· You'}
                  </span>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <input
                    value={answerText[qa.id] || ''}
                    onChange={e => setAnswerText(prev => ({ ...prev, [qa.id]: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && handleAnswer(qa.id)}
                    placeholder="Type your answer…"
                    style={{ flex: 1, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '7px 10px', color: '#fff', fontSize: 12, fontFamily: 'Montserrat,sans-serif', outline: 'none' }}
                  />
                  <button
                    onClick={() => handleAnswer(qa.id)}
                    disabled={answering === qa.id}
                    style={{ padding: '7px 12px', background: 'rgba(167,139,250,0.2)', border: '1px solid rgba(167,139,250,0.3)', borderRadius: 8, color: '#a78bfa', cursor: 'pointer' }}
                  >
                    <Send size={12}/>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function SupplierLeadsPanel({ lead }) {
  const [cardData, setCardData] = useState(lead?.supplier_card || null)
  const [cardStatus, setCardStatus] = useState(lead?.card_status || 'pending')
  const [generating, setGenerating] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const { triggerRefresh, goDealChat } = useWorkspaceStore()

  const pollCard = useCallback(async () => {
    if (!lead?.id) return null
    try {
      const r = await getCard(lead.id)
      const d = r.data
      setCardStatus(d.card_status)
      if (d.supplier_card) setCardData(d.supplier_card)
      return d.card_status
    } catch (e) { return null }
  }, [lead?.id])

  useEffect(() => {
    if (!lead?.id) return
    pollCard()
  }, [lead?.id, pollCard])

  useEffect(() => {
    if (cardStatus !== 'generating') return
    const interval = setInterval(async () => {
      const status = await pollCard()
      if (status && status !== 'generating') {
        clearInterval(interval)
        setGenerating(false)
      }
    }, 3000)
    return () => clearInterval(interval)
  }, [cardStatus, pollCard])

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      await generateCard(lead.id)
      setCardStatus('generating')
    } catch (e) {
      alert(e?.response?.data?.detail || 'Card generation failed')
      setGenerating(false)
    }
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      await submitCard(lead.id)
      setCardStatus('submitted')
      triggerRefresh()
    } catch (e) {
      alert(e?.response?.data?.detail || 'Submit failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (!lead) return null

  const req = lead.requirement

  return (
    <div style={{ flex: 1, padding: 24, color: '#fff', overflowY: 'auto', fontFamily: 'Montserrat,sans-serif', maxWidth: 600 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(167,139,250,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ShoppingCart size={20} color="#a78bfa"/>
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{req?.product || `Lead #${lead.id}`}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
            {req?.quantity} {req?.quantity_unit} · {req?.delivery_location || 'Location TBD'}
            {lead.fit_score ? ` · Fit ${Math.round(lead.fit_score)}%` : ''}
          </div>
        </div>
      </div>

      <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '12px 16px', marginBottom: 20 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Buyer Requirement</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 6 }}>
          {[
            ['Product', req?.product],
            ['Quantity', req?.quantity ? `${req.quantity} ${req.quantity_unit || ''}` : null],
            ['Budget', req?.budget_max ? `₹${req.budget_max.toLocaleString()} ${req.budget_unit || ''}` : 'Flexible'],
            ['Location', req?.delivery_location],
          ].filter(([, v]) => v).map(([k, v]) => (
            <div key={k}>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{k}: </span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)' }}>{v}</span>
            </div>
          ))}
        </div>
        {req?.specifications && (
          <div style={{ marginTop: 6, fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
            Specs: {Object.entries(req.specifications).map(([k, v]) => `${k}: ${v}`).join(', ')}
          </div>
        )}
      </div>

      {cardStatus === 'pending' && (
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 16 }}>
            AI will generate your offer card based on your profile and this requirement.
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating}
            style={{
              padding: '12px 28px', borderRadius: 10,
              background: 'rgba(167,139,250,0.2)', border: '1px solid rgba(167,139,250,0.4)',
              color: '#a78bfa', fontSize: 14, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'Montserrat,sans-serif',
              display: 'inline-flex', alignItems: 'center', gap: 8,
            }}
          >
            <Zap size={16}/> Generate My Card
          </button>
        </div>
      )}

      {cardStatus === 'generating' && (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <div style={{ fontSize: 13, color: '#a78bfa', marginBottom: 8 }}>AI is generating your offer card…</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>This takes about 10–30 seconds</div>
        </div>
      )}

      {['draft', 'qa', 'submitted'].includes(cardStatus) && cardData && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Your Offer Card {cardStatus === 'submitted' ? '(Submitted)' : '(Draft)'}
          </div>
          <CardView card={cardData} leadId={lead.id} cardStatus={cardStatus} onSubmit={handleSubmit} submitting={submitting}/>
        </div>
      )}

      {cardStatus === 'selected' && (
        <div style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.25)', borderRadius: 12, padding: '20px', textAlign: 'center' }}>
          <CheckCircle size={24} color="#34d399" style={{ marginBottom: 8 }}/>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#34d399', marginBottom: 4 }}>You were selected!</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 16 }}>The buyer chose your card. Chat with them to close the deal.</div>
          <button
            onClick={() => goDealChat(lead.id)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '10px 22px', borderRadius: 10,
              background: 'rgba(52,211,153,0.2)', border: '1px solid rgba(52,211,153,0.4)',
              color: '#34d399', fontSize: 13, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'Montserrat,sans-serif',
            }}
          >
            <MessageCircle size={15}/> Open Deal Chat
          </button>
        </div>
      )}

      {cardStatus === 'rejected' && (
        <div style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 12, padding: '16px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#f87171', marginBottom: 4 }}>Card not selected</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>The buyer chose another supplier for this requirement.</div>
        </div>
      )}
    </div>
  )
}
