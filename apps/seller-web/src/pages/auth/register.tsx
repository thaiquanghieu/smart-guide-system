import { useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import apiClient from '@/lib/api'
import { useAuthStore } from '@/lib/store'

export default function Register() {
  const router = useRouter()
  const { setUser } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    userName: '',
    email: '',
    password: '',
    confirmPassword: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (formData.password !== formData.confirmPassword) {
      setError('Mật khẩu không trùng khớp')
      setLoading(false)
      return
    }

    try {
      console.log('📤 Sending register request:', {
        UserName: formData.userName,
        Email: formData.email,
        Password: formData.password,
        Role: 'owner',
      })

      const response = await apiClient.post('/auth/register', {
        UserName: formData.userName,
        Email: formData.email,
        Password: formData.password,
        Role: 'owner',
      })

      console.log('✅ Register success:', response.data)
      localStorage.setItem('userId', response.data.userId)
      setUser({ id: response.data.userId, userName: formData.userName, email: formData.email, role: 'owner', isActive: true })

      router.push('/dashboard')
    } catch (err: any) {
      console.error('❌ Register error:', err.response?.data || err.message)
      setError(err.response?.data?.message || err.message || 'Đăng ký thất bại')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark via-secondary to-dark flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-block mb-4">
            <div className="text-5xl font-bold text-primary">🏪</div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Đăng ký chủ gian hàng</h1>
          <p className="text-accent">Bắt đầu quản lý điểm đến của bạn</p>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Tên người dùng
            </label>
            <input
              type="text"
              name="userName"
              value={formData.userName}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 bg-secondary border border-gray-600 rounded-lg text-white focus:border-primary focus:outline-none"
              placeholder="username"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 bg-secondary border border-gray-600 rounded-lg text-white focus:border-primary focus:outline-none"
              placeholder="email@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Mật khẩu
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 bg-secondary border border-gray-600 rounded-lg text-white focus:border-primary focus:outline-none"
              placeholder="••••••"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Xác nhận mật khẩu
            </label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 bg-secondary border border-gray-600 rounded-lg text-white focus:border-primary focus:outline-none"
              placeholder="••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-blue-700 disabled:bg-gray-600 text-white font-semibold py-2 rounded-lg transition"
          >
            {loading ? 'Đang xử lý...' : 'Đăng ký'}
          </button>
        </form>

        <div className="mt-6 text-center text-gray-400">
          Đã có tài khoản?{' '}
          <Link href="/auth/login" className="text-primary hover:underline">
            Đăng nhập
          </Link>
        </div>
      </div>
    </div>
  )
}
