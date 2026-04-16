import { useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import apiClient from '@/lib/api'
import { useAuthStore } from '@/lib/store'

export default function Login() {
  const router = useRouter()
  const { setUser } = useAuthStore()
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
      console.log('📤 Sending login request:', {
        Input: formData.input,
        Password: formData.password,
      })
      
      const response = await apiClient.post('/auth/login', {
        Input: formData.input,
        Password: formData.password,
      })

      console.log('✅ Login success:', response.data)
      localStorage.setItem('userId', response.data.userId)
      
      if (response.data.role === 'owner') {
        router.push('/dashboard')
      } else {
        router.push('/')
      }
    } catch (err: any) {
      console.error('❌ Login error:', err.response?.data || err.message)
      setError(err.response?.data?.message || err.message || 'Đăng nhập thất bại')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark via-secondary to-dark flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Đăng nhập</h1>
          <p className="text-accent">Quay lại bảng điều khiển</p>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Email hoặc Tên người dùng
            </label>
            <input
              type="text"
              name="input"
              value={formData.input}
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

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-blue-700 disabled:bg-gray-600 text-white font-semibold py-2 rounded-lg transition"
          >
            {loading ? 'Đang xử lý...' : 'Đăng nhập'}
          </button>
        </form>

        <div className="mt-6 text-center text-gray-400">
          Chưa có tài khoản?{' '}
          <Link href="/auth/register" className="text-primary hover:underline">
            Đăng ký ngay
          </Link>
        </div>

        <div className="mt-8 text-center">
          <Link href="/" className="text-accent hover:text-primary text-sm">
            ← Quay lại trang chính
          </Link>
        </div>
      </div>
    </div>
  )
}
