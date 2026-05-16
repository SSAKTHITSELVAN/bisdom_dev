import { create } from 'zustand'

export const useAppStore = create((set) => ({
  activeLeadId: null,
  setActiveLead: id => set({ activeLeadId: id }),
}))
