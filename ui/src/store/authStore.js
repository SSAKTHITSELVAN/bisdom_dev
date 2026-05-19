import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isOnboarded: false,
      _hasHydrated: false,
      setAuth: (token, user, isOnboarded) => {
        // CRITICAL: Use 'bisdom_token' key to match axios interceptor in client.js
        if (token) {
          localStorage.setItem('bisdom_token', token)
        }
        set({ token, user, isOnboarded })
      },
      setOnboarded: () => set({ isOnboarded: true }),
      logout: () => {
        localStorage.removeItem('bisdom_token')
        set({ token: null, user: null, isOnboarded: false })
      },
      setHasHydrated: (state) => {
        set({ _hasHydrated: state })
      },
    }),
    {
      name: 'bisdom-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isOnboarded: state.isOnboarded
      }),
      onRehydrateStorage: () => (state) => {
        // After hydration, sync token to localStorage for axios interceptor
        if (state && state.token) {
          localStorage.setItem('bisdom_token', state.token)
        }
        state?.setHasHydrated(true)
      },
    }
  )
)
