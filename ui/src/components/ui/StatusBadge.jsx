const STATUS_MAP = {
  new:                    { label: 'New',           cls: 'badge-blue'  },
  agent_initiated:        { label: 'Agent Working', cls: 'badge-green' },
  negotiating:            { label: 'Negotiating',   cls: 'badge-green' },
  renegotiating:          { label: 'Renegotiating', cls: 'badge-amber' },
  offer_ready:            { label: 'Offer Ready',   cls: 'badge-blue'  },
  buyer_review:           { label: 'Under Review',  cls: 'badge-amber' },
  deal_closed:            { label: 'Deal Closed',   cls: 'badge-green' },
  not_selected:           { label: 'Not Selected',  cls: 'badge-gray'  },
  declined:               { label: 'Declined',      cls: 'badge-red'   },
  matching:               { label: 'Matching…',     cls: 'badge-blue'  },
  confirmed:              { label: 'Confirmed',     cls: 'badge-green' },
  capturing:              { label: 'Drafting',      cls: 'badge-amber' },
  enriched:               { label: 'Ready',         cls: 'badge-blue'  },
  active:                 { label: 'Active',        cls: 'badge-green' },
  idle:                   { label: 'Idle',          cls: 'badge-gray'  },
  needs_input:            { label: 'Needs You',     cls: 'badge-amber' },
}

export default function StatusBadge({ status }) {
  const s = STATUS_MAP[status] || { label: status, cls: 'badge-gray' }
  return <span className={`badge ${s.cls}`}>{s.label}</span>
}
