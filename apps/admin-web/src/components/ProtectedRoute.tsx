import { useEffect, ReactNode, useState } from 'react'
import { useRouter } from 'next/router'
import { useAdminStore } from '@/lib/store'

interface ProtectedRouteProps {
  children: ReactNode
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter()
  const { isAuthenticated } = useAdminStore()
  const [mounted, setMounted] = useState(false)
  const [hasAdminId, setHasAdminId] = useState(false)

  useEffect(() => {
    setMounted(true)
    setHasAdminId(typeof window !== 'undefined' && !!localStorage.getItem('adminId'))
  }, [])

  useEffect(() => {
    if (!mounted) return
    if (!isAuthenticated && !hasAdminId) {
      router.push('/auth/login')
    }
  }, [hasAdminId, isAuthenticated, mounted, router])

  if (!mounted) {
    return null
  }

  if (!isAuthenticated && !hasAdminId) {
    return null
  }

  return <>{children}</>
}
