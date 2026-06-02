import { useEffect, useState } from 'react'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { listRequirements } from '@/api/requirements'
import { listLeadsAsBuyer, listLeadsAsSupplier } from '@/api/leads'
import Sidebar from './Sidebar'
import MainPanel from './MainPanel'
import ActionsWidget from './ActionsWidget'

export default function WorkspaceLayout() {
  const [buyerRequirements, setBuyerRequirements] = useState([])
  const [buyerLeads, setBuyerLeads]   = useState([])
  const [sellerLeads, setSellerLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { refreshKey, syncFromHash } = useWorkspaceStore()

  // Listen for hash changes
  useEffect(() => {
    const onHash = () => syncFromHash()
    window.addEventListener('hashchange', onHash)
    syncFromHash() // sync on mount
    return () => window.removeEventListener('hashchange', onHash)
  }, [syncFromHash])

  useEffect(() => {
    const load = async () => {
      try {
        const [reqRes, buyRes, sellRes] = await Promise.all([
          listRequirements(),
          listLeadsAsBuyer(),
          listLeadsAsSupplier(),
        ])
        setBuyerRequirements(
          (reqRes.data.requirements || []).filter(r => r.product && r.product.trim())
        )
        setBuyerLeads(buyRes.data || [])
        setSellerLeads(sellRes.data || [])
      } catch {}
      setLoading(false)
    }
    load()
    // No automatic polling - only refresh when user manually triggers via refreshKey
  }, [refreshKey])

  const leadsByRequirement = buyerLeads.reduce((acc, lead) => {
    if (!acc[lead.requirement_id]) acc[lead.requirement_id] = []
    acc[lead.requirement_id].push(lead)
    return acc
  }, {})

  const closeSidebar = () => setSidebarOpen(false)
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen)

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden', position:'relative' }}>
      {/* Mobile overlay */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`}
        onClick={closeSidebar}
      />

      <Sidebar
        buyerRequirements={buyerRequirements}
        leadsByRequirement={leadsByRequirement}
        sellerLeads={sellerLeads}
        loading={loading}
        isOpen={sidebarOpen}
        onClose={closeSidebar}
      />
      <MainPanel
        buyerRequirements={buyerRequirements}
        leadsByRequirement={leadsByRequirement}
        sellerLeads={sellerLeads}
        onToggleSidebar={toggleSidebar}
      />
      <ActionsWidget refreshKey={refreshKey}/>
    </div>
  )
}
