import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDashboard } from '../../api/dashboard'
import PageLayout from '../ui/PageLayout'
import StatusBadge from '../ui/StatusBadge'
import Spinner from '../ui/Spinner'
import { TrendingUp, Bot, IndianRupee, Package, CheckCircle, AlertTriangle, ChevronRight } from 'lucide-react'

function StatCard({ label, value, sub, accent }) {
  return (
    <div className="glass rounded-2xl p-4">
      <p className="text-xs text-white/40 font-semibold mb-1">{label}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-white/40 mt-1">{sub}</p>}
    </div>
  )
}

export default function DashboardPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    getDashboard()
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <PageLayout title="Dashboard">
      <div className="flex justify-center py-16"><Spinner size={28} color="rgba(255,255,255,0.4)"/></div>
    </PageLayout>
  )

  const d = data || {}
  const agent = d.agent || {}
  const month = d.this_month || {}
  const profile = d.profile || {}

  return (
    <PageLayout title="Dashboard">
      {/* Agent status banner */}
      <div className={`rounded-2xl p-4 mb-4 flex items-center gap-3 ${
        agent.status === 'needs_input' ? 'bg-amber-500/15 border border-amber-400/30' :
        agent.status === 'active'      ? 'bg-green-500/15 border border-green-400/20' :
        'glass'
      }`}>
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
          agent.status === 'active' ? 'bg-green-500/25' : 'bg-white/10'
        }`}>
          <Bot size={20} className={
            agent.status === 'active' ? 'text-green-400' :
            agent.status === 'needs_input' ? 'text-amber-400' : 'text-white/40'
          } />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <StatusBadge status={agent.status || 'idle'} />
            {agent.status === 'active' && (
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            )}
          </div>
          <p className="text-xs text-white/50 mt-1">
            {agent.status === 'active'
              ? `${agent.active_jobs_count} negotiation${agent.active_jobs_count !== 1 ? 's' : ''} running`
              : agent.status === 'needs_input'
              ? `${agent.needs_input_count} decision${agent.needs_input_count !== 1 ? 's' : ''} needed`
              : 'Agent ready — post a requirement to start'}
          </p>
        </div>
        {agent.needs_input_count > 0 && (
          <button onClick={() => navigate('/leads')}
            className="flex items-center gap-1 text-xs font-bold text-amber-400">
            Decide <ChevronRight size={12}/>
          </button>
        )}
      </div>

      {/* Business identity */}
      <div className="glass rounded-2xl p-4 mb-4 flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-blue-500/25 flex items-center justify-center shrink-0">
          <span className="text-lg font-black text-blue-300">
            {(profile.trade_name || 'B').charAt(0)}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white truncate">{profile.trade_name || 'Your Business'}</p>
          <p className="text-xs text-white/40">{profile.business_type}</p>
        </div>
        <div className="flex gap-1.5">
          {profile.is_buyer && <span className="badge badge-blue">Buyer</span>}
          {profile.is_supplier && <span className="badge badge-green">Supplier</span>}
        </div>
      </div>

      {/* This month */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs text-white/40 font-bold uppercase tracking-wider">This Month</h3>
          <span className="text-xs text-white/30">{month.period}</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Deals Closed"
            value={(month.sourcing?.deals_closed || 0) + (month.selling?.deals_closed || 0)}
            sub="sourcing + selling" />
          <StatCard label="Total Value"
            value={`₹${((month.total_value_created || 0)/1000).toFixed(1)}k`}
            sub="savings + revenue" />
          <StatCard label="Savings"
            value={`₹${((month.sourcing?.total_savings || 0)/1000).toFixed(1)}k`}
            sub="vs target price" />
          <StatCard label="Revenue"
            value={`₹${((month.selling?.total_revenue || 0)/1000).toFixed(1)}k`}
            sub="from sales" />
        </div>
      </div>

      {/* Active leads */}
      {d.active_leads?.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs text-white/40 font-bold uppercase tracking-wider mb-3">Active Negotiations</h3>
          {d.active_leads.slice(0, 3).map(l => (
            <button key={l.lead_id} onClick={() => navigate(`/chat/${l.lead_id}`)}
              className="w-full glass rounded-2xl p-4 mb-2 flex items-center justify-between hover:bg-white/10 transition-all">
              <div className="flex items-center gap-3">
                {l.ai_paused
                  ? <AlertTriangle size={16} className="text-amber-400" />
                  : <Bot size={16} className="text-green-400" />
                }
                <div className="text-left">
                  <p className="text-sm font-semibold text-white capitalize">{l.role} Lead #{l.lead_id}</p>
                  <p className="text-xs text-white/40">Round {l.negotiation_round}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {l.current_offer_price && (
                  <span className="text-sm font-bold text-white">₹{l.current_offer_price.toLocaleString()}</span>
                )}
                <ChevronRight size={14} className="text-white/30" />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Recent deals */}
      {d.recent_deals?.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs text-white/40 font-bold uppercase tracking-wider mb-3">Recent Deals</h3>
          {d.recent_deals.map(deal => (
            <div key={deal.deal_id}
              className={`glass rounded-2xl p-4 mb-2 border-l-4 ${deal.role === 'buyer' ? 'border-blue-500' : 'border-green-500'}`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-bold text-white capitalize">{deal.product}</p>
                  <p className="text-xs text-white/40 mt-0.5">
                    {deal.quantity} units · ₹{deal.final_price_per_unit?.toLocaleString()}/unit
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-white">₹{deal.total_value?.toLocaleString()}</p>
                  {deal.buyer_savings > 0 && (
                    <p className="text-xs text-green-400 font-semibold mt-0.5">
                      Saved ₹{deal.buyer_savings?.toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick actions */}
      <div className="mb-6">
        <h3 className="text-xs text-white/40 font-bold uppercase tracking-wider mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => navigate('/home')}
            className="btn-primary flex items-center justify-center gap-2 py-3">
            <Package size={16}/> Source
          </button>
          <button onClick={() => navigate('/leads')}
            className="btn-ghost flex items-center justify-center gap-2 py-3">
            <TrendingUp size={16}/> Leads
          </button>
        </div>
      </div>
    </PageLayout>
  )
}
