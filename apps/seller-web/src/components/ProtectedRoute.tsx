import { useEffect, ReactNode } from 'react'
import { useRouter } from 'next/router'
import { useAuthStore } from '@/lib/store'

interface ProtectedRouteProps {
  children: ReactNode
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()

  useEffect(() => {
    if (!isAuthenticated && !localStorage.getItem('userId')) {
      router.push('/auth/login')
    }
  }, [isAuthenticated, router])

  if (!isAuthenticated && !localStorage.getItem('userId')) {
    return null
  }

  return <>{children}</>
}
