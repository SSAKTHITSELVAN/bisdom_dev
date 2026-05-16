import { create } from 'zustand'

// Hash-based routing helpers
export function setHash(hash) {
  window.location.hash = hash
}

export function parseHash() {
  const h = window.location.hash.replace('#/', '').replace('#', '')
  if (!h || h === 'workspace') return { view: 'welcome' }
  if (h === 'profile')  return { view: 'profile' }
  if (h === 'settings') return { view: 'settings' }

  // #/req/123
  const reqOnly = h.match(/^req\/(\d+)$/)
  if (reqOnly) return { view: 'requirement', reqId: parseInt(reqOnly[1]) }

  // #/req/123/lead/456
  const reqLead = h.match(/^req\/(\d+)\/lead\/(\d+)$/)
  if (reqLead) return { view: 'chat', reqId: parseInt(reqLead[1]), leadId: parseInt(reqLead[2]) }

  // #/req/123/general  (general AI chat for requirement)
  const reqGeneral = h.match(/^req\/(\d+)\/general$/)
  if (reqGeneral) return { view: 'general_chat', reqId: parseInt(reqGeneral[1]) }

  // #/lead/456  (seller side — no parent req)
  const leadOnly = h.match(/^lead\/(\d+)$/)
  if (leadOnly) return { view: 'chat', reqId: null, leadId: parseInt(leadOnly[1]) }

  return { view: 'welcome' }
}

export const useWorkspaceStore = create((set, get) => ({
  // Current route state (parsed from hash)
  route: parseHash(),

  // Navigate helpers
  goWelcome:     ()           => { setHash('/'); set({ route: { view: 'welcome' } }) },
  goProfile:     ()           => { setHash('/profile'); set({ route: { view: 'profile' } }) },
  goSettings:    ()           => { setHash('/settings'); set({ route: { view: 'settings' } }) },
  goNewReq:      ()           => { setHash('/new'); set({ route: { view: 'new_requirement' } }) },
  goRequirement: (reqId)      => { setHash(`/req/${reqId}`); set({ route: { view: 'requirement', reqId } }) },
  goChat:        (reqId, leadId) => {
    const hash = reqId ? `/req/${reqId}/lead/${leadId}` : `/lead/${leadId}`
    setHash(hash)
    set({ route: { view: 'chat', reqId, leadId } })
  },
  goGeneralChat: (reqId)      => { setHash(`/req/${reqId}/general`); set({ route: { view: 'general_chat', reqId } }) },

  // Sync route from hash (call on hashchange)
  syncFromHash: () => set({ route: parseHash() }),

  // Sidebar state
  sidebarTab: 'buying',
  setSidebarTab: tab => set({ sidebarTab: tab }),

  expandedRequirements: {},
  toggleExpanded: id => set(s => ({
    expandedRequirements: { ...s.expandedRequirements, [id]: !s.expandedRequirements[id] }
  })),

  // Data refresh
  refreshKey: 0,
  triggerRefresh: () => set(s => ({ refreshKey: s.refreshKey + 1 })),
}))
