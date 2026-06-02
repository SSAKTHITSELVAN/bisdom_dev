import { useState, useEffect } from 'react'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { FileText } from 'lucide-react'

export default function BuyerCardsView({ requirementId }) {
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)', flexDirection: 'column', gap: 12 }}>
      <FileText size={32} opacity={0.3}/>
      <div style={{ fontSize: 14 }}>Supplier cards coming soon</div>
    </div>
  )
}
