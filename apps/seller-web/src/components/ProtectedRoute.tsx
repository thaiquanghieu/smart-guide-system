import { useEffect, ReactNode, useState } from 'react'
import { useRouter } from 'next/router'
import { useAuthStore } from '@/lib/store'
import apiClient from '@/lib/api'

interface ProtectedRouteProps {
  children: ReactNode
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter()
  const { isAuthenticated, logout } = useAuthStore()
  const [mounted, setMounted] = useState(false)
  const [hasUserId, setHasUserId] = useState(false)
  const [blocked, setBlocked] = useState(false)

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

  useEffect(() => {
    if (!mounted || !hasUserId || blocked) return undefined

    let cancelled = false
    const handleBlockedAccount = () => {
      if (cancelled || blocked) return
      setBlocked(true)
      window.alert('Tài khoản đã bị khóa. Vui lòng liên hệ admin để được hỗ trợ.')
      localStorage.removeItem('userId')
      logout()
      router.push('/auth/login')
    }

    const checkAccountStatus = async () => {
      const userId = localStorage.getItem('userId')
      if (!userId) return

      try {
        const response = await apiClient.get(`/auth/user/${userId}`)
        if (response.data && response.data.isActive === false) {
          handleBlockedAccount()
        }
      } catch (error: any) {
        const status = error?.response?.status
        if (status === 403 || status === 404) {
          handleBlockedAccount()
        }
      }
    }

    void checkAccountStatus()
    const interval = window.setInterval(checkAccountStatus, 10000)

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [blocked, hasUserId, logout, mounted, router])

  if (!mounted) {
    return null
  }

  if (!isAuthenticated && !hasUserId) {
    return null
  }

  return <>{children}</>
}
