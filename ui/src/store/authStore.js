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
        // Update both localStorage (for axios interceptor) and zustand
        if (token) {
          localStorage.setItem('token', token)
        }
        set({ token, user, isOnboarded })
      },
      setOnboarded: () => set({ isOnboarded: true }),
      logout: () => {
        localStorage.removeItem('token')
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
        state?.setHasHydrated(true)
      },
    }
  )
)
