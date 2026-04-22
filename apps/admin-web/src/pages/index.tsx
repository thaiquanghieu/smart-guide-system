import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAdminStore } from '@/lib/store'
import Link from 'next/link'

export default function Home() {
  const router = useRouter()
  const { isAuthenticated } = useAdminStore()

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard')
    }
  }, [isAuthenticated, router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark via-secondary to-dark flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-block mb-4">
            <div className="text-5xl font-bold text-danger">🔒</div>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">Smart Guide Admin</h1>
          <p className="text-accent">Quản lý hệ thống</p>
        </div>

        <Link
          href="/auth/login"
          className="block w-full bg-primary hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg text-center transition"
        >
          Đăng nhập quản trị
        </Link>

        <div className="mt-12 grid grid-cols-2 gap-4">
          <div className="bg-secondary/50 border border-gray-700 rounded-lg p-4 text-center">
            <div className="text-2xl mb-2">👥</div>
            <p className="text-sm text-gray-300">Quản lý người dùng</p>
          </div>
          <div className="bg-secondary/50 border border-gray-700 rounded-lg p-4 text-center">
            <div className="text-2xl mb-2">✅</div>
            <p className="text-sm text-gray-300">Phê duyệt POI</p>
          </div>
          <div className="bg-secondary/50 border border-gray-700 rounded-lg p-4 text-center">
            <div className="text-2xl mb-2">📊</div>
            <p className="text-sm text-gray-300">Thống kê</p>
          </div>
          <div className="bg-secondary/50 border border-gray-700 rounded-lg p-4 text-center">
            <div className="text-2xl mb-2">🛡️</div>
            <p className="text-sm text-gray-300">Bảo mật</p>
          </div>
        </div>
      </div>
    </div>
  )
}
