import { useEffect, ReactNode } from 'react'
import { useRouter } from 'next/router'
import { useAdminStore } from '@/lib/store'

interface ProtectedRouteProps {
  children: ReactNode
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter()
  const { isAuthenticated } = useAdminStore()

  useEffect(() => {
    if (!isAuthenticated && !localStorage.getItem('adminId')) {
      router.push('/auth/login')
    }
  }, [isAuthenticated, router])

  if (!isAuthenticated && !localStorage.getItem('adminId')) {
    return null
  }

  return <>{children}</>
}
