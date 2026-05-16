import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set) => ({
      token: null,
      user: null,
      isOnboarded: false,
      setAuth: (token, user, isOnboarded) => set({ token, user, isOnboarded }),
      setOnboarded: () => set({ isOnboarded: true }),
      logout: () => {
        localStorage.removeItem('bisdom_token')
        set({ token: null, user: null, isOnboarded: false })
      },
    }),
    { name: 'bisdom-auth', partialize: s => ({ token: s.token, user: s.user, isOnboarded: s.isOnboarded }) }
  )
)
