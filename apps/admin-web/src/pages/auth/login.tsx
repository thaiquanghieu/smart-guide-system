import { useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import apiClient from '@/lib/api'
import { useAdminStore } from '@/lib/store'

export default function AdminLogin() {
  const router = useRouter()
  const { setAdmin } = useAdminStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    input: '',
    password: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      console.log('📤 Sending admin login request:', {
        Input: formData.input,
        Password: formData.password,
      })

      const response = await apiClient.post('/auth/admin-login', {
        Input: formData.input,
        Password: formData.password,
      })

      console.log('✅ Admin login success:', response.data)
      localStorage.setItem('adminId', response.data.userId)
      setAdmin({ id: response.data.userId, userName: '', email: '', role: 'admin' })

      router.push('/dashboard')
    } catch (err: any) {
      console.error('❌ Admin login error:', err.response?.data || err.message)
      setError(err.response?.data?.message || err.message || 'Đăng nhập thất bại')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark via-secondary to-dark flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-block mb-4 p-4 bg-red-500/20 rounded-full">
            <div className="text-5xl">🔐</div>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">Admin Panel</h1>
          <p className="text-gray-400">Quản lý hệ thống Smart Guide</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded-lg mb-6 text-sm">
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Email hoặc Tên người dùng
            </label>
            <input
              type="text"
              name="input"
              value={formData.input}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 bg-secondary border border-gray-700 rounded-lg text-white focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500/20 transition"
              placeholder="admin@smartguide.com"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Mật khẩu
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 bg-secondary border border-gray-700 rounded-lg text-white focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500/20 transition"
              placeholder="••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white font-semibold py-3 rounded-lg transition duration-200 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="animate-spin">⏳</span>
                Đang xử lý...
              </>
            ) : (
              <>
                🔓 Đăng nhập
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-8 space-y-4">
          <div className="bg-secondary/50 border border-gray-700 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-400">
              Tài khoản admin chỉ dành cho quản trị viên được phép
            </p>
          </div>
          
          <div className="text-center">
            <Link href="http://localhost:3000" className="text-gray-400 hover:text-primary text-sm transition">
              ← Quay lại trang chính
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
