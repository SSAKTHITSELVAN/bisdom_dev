import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { listLeads } from '../../api/leads'
import PageLayout from '../ui/PageLayout'
import StatusBadge from '../ui/StatusBadge'
import Spinner from '../ui/Spinner'
import { MessageSquare, ChevronRight, TrendingUp, Bot } from 'lucide-react'

function LeadCard({ lead, onClick }) {
  const isNeedsInput = lead.ai_paused_for_buyer || lead.ai_paused_for_supplier
  const isBuyer = lead.buyer_id !== undefined

  return (
    <button onClick={onClick}
      className={`w-full glass rounded-2xl p-4 text-left transition-all hover:bg-white/10 mb-3 animate-slide-up ${isNeedsInput ? 'border-amber-400/40 border' : ''}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {isNeedsInput && (
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          )}
          <span className="text-xs text-white/40 font-semibold uppercase tracking-wider">
            {isBuyer ? 'Sourcing' : 'Selling'} · Lead #{lead.id}
          </span>
        </div>
        <StatusBadge status={lead.status} />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex-1">
          {lead.current_offer_price && (
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-lg font-bold text-white">₹{lead.current_offer_price.toLocaleString()}</span>
              <span className="text-xs text-white/40">/unit</span>
            </div>
          )}
          <div className="flex items-center gap-3 text-xs text-white/40">
            <span className="flex items-center gap-1">
              <Bot size={11} /> Round {lead.negotiation_round}/{lead.max_negotiation_rounds}
            </span>
            {lead.fit_score && (
              <span className="flex items-center gap-1">
                <TrendingUp size={11} /> {lead.fit_score.toFixed(0)}% match
              </span>
            )}
          </div>
        </div>
        <ChevronRight size={18} className="text-white/30" />
      </div>

      {isNeedsInput && (
        <div className="mt-3 bg-amber-400/10 rounded-xl px-3 py-2 border border-amber-400/20">
          <p className="text-xs text-amber-300 font-semibold">⚠ Your decision needed</p>
        </div>
      )}
    </button>
  )
}

export default function LeadsPage() {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const navigate = useNavigate()

  useEffect(() => {
    listLeads()
      .then(r => setLeads(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = leads.filter(l => {
    if (filter === 'active') return ['agent_initiated','negotiating','renegotiating'].includes(l.status)
    if (filter === 'input') return l.ai_paused_for_buyer || l.ai_paused_for_supplier
    if (filter === 'closed') return l.status === 'deal_closed'
    return true
  })

  const needsInput = leads.filter(l => l.ai_paused_for_buyer || l.ai_paused_for_supplier).length

  return (
    <PageLayout title="Leads">
      {/* Filter pills */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {[
          { key: 'all',    label: 'All' },
          { key: 'active', label: '🤖 Active' },
          { key: 'input',  label: `⚠ Needs You${needsInput ? ` (${needsInput})` : ''}` },
          { key: 'closed', label: '✅ Closed' },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-all ${
              filter === f.key
                ? 'bg-blue-500 text-white'
                : 'glass text-white/50 hover:text-white'
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <Spinner size={28} color="rgba(255,255,255,0.4)" />
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-16">
          <MessageSquare size={40} className="text-white/20 mx-auto mb-3" />
          <p className="text-white/40 text-sm font-medium">No leads yet</p>
          <p className="text-white/25 text-xs mt-1">Post a requirement to get started</p>
          <button onClick={() => navigate('/home')}
            className="btn-primary mt-5 w-auto px-8 inline-flex items-center justify-center">
            Post Requirement
          </button>
        </div>
      )}

      <div>
        {filtered.map(lead => (
          <LeadCard key={lead.id} lead={lead}
            onClick={() => navigate(`/chat/${lead.id}`)} />
        ))}
      </div>
    </PageLayout>
  )
}
