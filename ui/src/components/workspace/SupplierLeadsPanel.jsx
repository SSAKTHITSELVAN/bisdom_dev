import { ShoppingCart } from 'lucide-react'
import StatusBadge from '@/components/ui/StatusBadge'

export default function SupplierLeadsPanel({ lead }) {
  if (!lead) return null
  return (
    <div style={{ flex: 1, padding: 24, color: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(167,139,250,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ShoppingCart size={20} color="#a78bfa"/>
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{lead.requirement?.product || `Lead #${lead.id}`}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
            {lead.buyer_info?.trade_name || `Buyer #${lead.buyer_id}`}
          </div>
        </div>
        <StatusBadge status={lead.card_status || lead.status}/>
      </div>
      <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 16, color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
        Lead details and card generation coming soon.
      </div>
    </div>
  )
}
