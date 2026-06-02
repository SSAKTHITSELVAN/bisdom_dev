import { useState, useEffect } from 'react'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { getSubmittedCards, selectSupplier, askQuestion, listQA } from '@/api/cards'
import { FileText, Star, ChevronDown, ChevronUp } from 'lucide-react'

function CardDetail({ card, onSelect, selecting }) {
  const [expanded, setExpanded] = useState(false)
  const [question, setQuestion] = useState('')
  const [qaList, setQaList] = useState([])
  const [askingQ, setAskingQ] = useState(false)

  const c = card.supplier_card || {}

  const handleAsk = async () => {
    if (!question.trim()) return
    setAskingQ(true)
    try {
      await askQuestion(card.lead_id, question.trim())
      setQuestion('')
      setTimeout(async () => {
        try {
          const r = await listQA(card.lead_id)
          setQaList(r.data || [])
        } catch (e) { /* ignore */ }
      }, 5000)
    } catch (e) {
      console.error(e)
    } finally {
      setAskingQ(false)
    }
  }

  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 14,
      padding: '18px 20px',
      marginBottom: 14,
      fontFamily: 'Montserrat,sans-serif',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>
            {card.supplier_info?.trade_name || `Supplier #${card.lead_id}`}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
            {card.supplier_info?.city}{card.supplier_info?.state ? `, ${card.supplier_info.state}` : ''}
            {card.fit_score ? ` · Fit: ${Math.round(card.fit_score)}%` : ''}
          </div>
        </div>
        <button
          onClick={() => onSelect(card.lead_id)}
          disabled={selecting}
          style={{
            padding: '8px 18px',
            background: selecting ? 'rgba(52,211,153,0.1)' : 'rgba(52,211,153,0.2)',
            border: '1px solid rgba(52,211,153,0.4)',
            borderRadius: 8,
            color: '#34d399',
            fontSize: 12,
            fontWeight: 700,
            cursor: selecting ? 'wait' : 'pointer',
            fontFamily: 'Montserrat,sans-serif',
          }}
        >
          {selecting ? 'Selecting…' : 'Select Supplier'}
        </button>
      </div>

      {/* Key metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 14 }}>
        {[
          { label: 'Price', value: c.price_per_unit ? `₹${Number(c.price_per_unit).toLocaleString()}/${c.price_unit || 'unit'}` : '—' },
          { label: 'Lead Time', value: c.lead_time_days ? `${c.lead_time_days} days` : '—' },
          { label: 'MOQ', value: c.moq ? `${c.moq} units` : '—' },
          { label: 'Payment', value: c.payment_terms || '—' },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: '8px 10px' }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 3 }}>{label}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* AI verdict */}
      {c.ai_verdict && (
        <div style={{ background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.15)', borderRadius: 8, padding: '10px 12px', marginBottom: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#60a5fa', marginBottom: 4 }}>AI VERDICT</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>{c.ai_verdict}</div>
        </div>
      )}

      {/* Expand toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontFamily: 'Montserrat,sans-serif', padding: 0 }}
      >
        {expanded ? <ChevronUp size={13}/> : <ChevronDown size={13}/>}
        {expanded ? 'Less details' : 'More details + Ask AI'}
      </button>

      {expanded && (
        <div style={{ marginTop: 12 }}>
          {c.key_strengths?.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Key Strengths</div>
              {c.key_strengths.map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>
                  <Star size={10} color="#fbbf24"/>{s}
                </div>
              ))}
            </div>
          )}
          {c.certifications?.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Certifications</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {c.certifications.map((cert, i) => (
                  <span key={i} style={{ background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.25)', borderRadius: 6, padding: '2px 8px', fontSize: 11, color: '#a78bfa' }}>{cert}</span>
                ))}
              </div>
            </div>
          )}
          {c.offer_notes && (
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5, marginBottom: 10 }}>
              <span style={{ fontWeight: 700 }}>Notes: </span>{c.offer_notes}
            </div>
          )}

          {/* Q&A section */}
          <div style={{ marginTop: 14, borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Q&A (AI-Answered)</div>
            {qaList.map(qa => (
              <div key={qa.id} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 12, color: '#fff', marginBottom: 4 }}>Q: {qa.question}</div>
                {qa.answer ? (
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', paddingLeft: 12, borderLeft: '2px solid rgba(96,165,250,0.3)' }}>
                    A: {qa.answer}
                    {qa.answered_by_ai && <span style={{ fontSize: 10, color: 'rgba(96,165,250,0.6)', marginLeft: 6 }}>· AI</span>}
                  </div>
                ) : (
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', paddingLeft: 12 }}>Answering…</div>
                )}
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={question}
                onChange={e => setQuestion(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAsk()}
                placeholder="Ask about delivery, quality, packaging…"
                style={{ flex: 1, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 12, fontFamily: 'Montserrat,sans-serif', outline: 'none' }}
              />
              <button
                onClick={handleAsk}
                disabled={askingQ || !question.trim()}
                style={{ padding: '8px 14px', background: 'rgba(96,165,250,0.2)', border: '1px solid rgba(96,165,250,0.3)', borderRadius: 8, color: '#60a5fa', cursor: 'pointer', fontFamily: 'Montserrat,sans-serif', fontSize: 12, fontWeight: 600 }}
              >
                {askingQ ? '…' : 'Ask'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function BuyerCardsView({ requirementId }) {
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [selecting, setSelecting] = useState(null)
  const [sortBy, setSortBy] = useState('fit')
  const { triggerRefresh, goDealChat } = useWorkspaceStore()

  useEffect(() => {
    if (!requirementId) return
    setLoading(true)
    getSubmittedCards(requirementId)
      .then(r => setCards(r.data || []))
      .catch(() => setCards([]))
      .finally(() => setLoading(false))
  }, [requirementId])

  const sorted = [...cards].sort((a, b) => {
    if (sortBy === 'fit') return (b.fit_score || 0) - (a.fit_score || 0)
    if (sortBy === 'price') {
      const pa = a.supplier_card?.price_per_unit ?? Infinity
      const pb = b.supplier_card?.price_per_unit ?? Infinity
      return pa - pb
    }
    if (sortBy === 'lead_time') {
      const la = a.supplier_card?.lead_time_days ?? Infinity
      const lb = b.supplier_card?.lead_time_days ?? Infinity
      return la - lb
    }
    return 0
  })

  const handleSelect = async (leadId) => {
    if (!window.confirm('Select this supplier? All other submitted cards will be rejected.')) return
    setSelecting(leadId)
    try {
      const res = await selectSupplier(requirementId, leadId)
      triggerRefresh()
      if (res.data?.conversation_id) {
        goDealChat(leadId, res.data.conversation_id)
      }
    } catch (e) {
      alert(e?.response?.data?.detail || 'Selection failed')
    } finally {
      setSelecting(null)
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48, color: 'rgba(255,255,255,0.3)', flexDirection: 'column', gap: 12 }}>
      <FileText size={28} opacity={0.3}/>
      <div style={{ fontSize: 13 }}>Loading supplier cards…</div>
    </div>
  )

  if (cards.length === 0) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48, color: 'rgba(255,255,255,0.3)', flexDirection: 'column', gap: 12 }}>
      <FileText size={28} opacity={0.3}/>
      <div style={{ fontSize: 13 }}>No submitted cards yet</div>
      <div style={{ fontSize: 11 }}>Suppliers will submit their offer cards here</div>
    </div>
  )

  return (
    <div style={{ padding: '20px 32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>SORT BY:</span>
        {[['fit', 'Fit Score'], ['price', 'Price ↑'], ['lead_time', 'Lead Time ↑']].map(([key, label]) => (
          <button key={key} onClick={() => setSortBy(key)} style={{
            padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.12)',
            background: sortBy === key ? 'rgba(96,165,250,0.2)' : 'transparent',
            color: sortBy === key ? '#60a5fa' : 'rgba(255,255,255,0.4)',
            cursor: 'pointer', fontFamily: 'Montserrat,sans-serif', fontSize: 11, fontWeight: 600,
          }}>{label}</button>
        ))}
      </div>

      {sorted.map(card => (
        <CardDetail
          key={card.lead_id}
          card={card}
          onSelect={handleSelect}
          selecting={selecting === card.lead_id}
        />
      ))}
    </div>
  )
}
