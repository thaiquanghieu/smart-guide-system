import { create } from 'zustand'

interface Admin {
  id: number
  userName: string
  email: string
  role: string
}

interface AdminStore {
  admin: Admin | null
  isAuthenticated: boolean
  setAdmin: (admin: Admin | null) => void
  logout: () => void
}

export const useAdminStore = create<AdminStore>((set) => ({
  admin: null,
  isAuthenticated: false,
  setAdmin: (admin) => set({ admin, isAuthenticated: !!admin }),
  logout: () => set({ admin: null, isAuthenticated: false }),
}))
