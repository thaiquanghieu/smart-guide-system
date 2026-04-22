import { useState } from 'react'
import { useRouter } from 'next/router'
import Sidebar from '@/components/Sidebar'
import ProtectedRoute from '@/components/ProtectedRoute'
import apiClient from '@/lib/api'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function CreatePOI() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    category: '',
    latitude: '',
    longitude: '',
    radius: '100',
    priority: '0',
  })

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await apiClient.post('/owner/pois', {
        name: formData.name,
        description: formData.description,
        address: formData.address,
        category: formData.category || 'Khác',
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        radius: parseInt(formData.radius),
        priority: parseInt(formData.priority),
      })

      router.push('/pois')
    } catch (err: any) {
      setError(
        err.response?.data?.message || 'Tạo POI thất bại'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <ProtectedRoute>
      <div className="flex bg-dark min-h-screen">
        <Sidebar />
        <main className="flex-1 p-8">
          <div className="max-w-2xl">
            <Link
              href="/pois"
              className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition"
            >
              <ArrowLeft size={20} />
              Quay lại
            </Link>

            <h1 className="text-3xl font-bold text-white mb-6">Tạo POI mới</h1>

            {error && (
              <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded-lg mb-6">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Tên POI *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 bg-secondary border border-gray-600 rounded-lg text-white focus:border-primary focus:outline-none"
                  placeholder="Nhập tên điểm đến"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Mô tả *
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  required
                  rows={4}
                  className="w-full px-4 py-2 bg-secondary border border-gray-600 rounded-lg text-white focus:border-primary focus:outline-none resize-none"
                  placeholder="Nhập mô tả chi tiết"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Địa chỉ
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-secondary border border-gray-600 rounded-lg text-white focus:border-primary focus:outline-none"
                  placeholder="Nhập địa chỉ"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Loại danh mục
                </label>
                <input
                  type="text"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-secondary border border-gray-600 rounded-lg text-white focus:border-primary focus:outline-none"
                  placeholder="Kiến trúc, Thiên nhiên, etc."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Vĩ độ (Latitude) *
                  </label>
                  <input
                    type="number"
                    name="latitude"
                    value={formData.latitude}
                    onChange={handleChange}
                    required
                    step="0.000001"
                    className="w-full px-4 py-2 bg-secondary border border-gray-600 rounded-lg text-white focus:border-primary focus:outline-none"
                    placeholder="10.779783"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Kinh độ (Longitude) *
                  </label>
                  <input
                    type="number"
                    name="longitude"
                    value={formData.longitude}
                    onChange={handleChange}
                    required
                    step="0.000001"
                    className="w-full px-4 py-2 bg-secondary border border-gray-600 rounded-lg text-white focus:border-primary focus:outline-none"
                    placeholder="106.699018"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Bán kính (m)
                  </label>
                  <input
                    type="number"
                    name="radius"
                    value={formData.radius}
                    onChange={handleChange}
                    className="w-full px-4 py-2 bg-secondary border border-gray-600 rounded-lg text-white focus:border-primary focus:outline-none"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Ưu tiên (0-100)
                  </label>
                  <input
                    type="number"
                    name="priority"
                    value={formData.priority}
                    onChange={handleChange}
                    className="w-full px-4 py-2 bg-secondary border border-gray-600 rounded-lg text-white focus:border-primary focus:outline-none"
                    min="0"
                    max="100"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-primary hover:bg-blue-700 disabled:bg-gray-600 text-white font-semibold py-3 rounded-lg transition"
                >
                  {loading ? 'Đang tạo...' : 'Tạo POI'}
                </button>
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="flex-1 bg-secondary hover:bg-secondary/50 text-gray-300 font-semibold py-3 rounded-lg transition"
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}
