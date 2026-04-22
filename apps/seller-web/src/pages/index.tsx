import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuthStore } from '@/lib/store'

export default function Home() {
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/dashboard')
      return
    }

    router.replace('/auth/login')
  }, [isAuthenticated, router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark via-secondary to-dark flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-white">Đang chuyển đến đăng nhập...</h1>
        <p className="mt-2 text-accent">Vui lòng chờ một chút</p>
      </div>
    </div>
  )
}
