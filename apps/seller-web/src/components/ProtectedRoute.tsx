import { useEffect, ReactNode, useState } from 'react'
import { useRouter } from 'next/router'
import { useAuthStore } from '@/lib/store'

interface ProtectedRouteProps {
  children: ReactNode
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()
  const [mounted, setMounted] = useState(false)
  const [hasUserId, setHasUserId] = useState(false)

  useEffect(() => {
    setMounted(true)
    setHasUserId(typeof window !== 'undefined' && !!localStorage.getItem('userId'))
  }, [])

  useEffect(() => {
    if (!mounted) return
    if (!isAuthenticated && !hasUserId) {
      router.push('/auth/login')
    }
  }, [hasUserId, isAuthenticated, mounted, router])

  if (!mounted) {
    return null
  }

  if (!isAuthenticated && !hasUserId) {
    return null
  }

  return <>{children}</>
}
