import { useState, useEffect } from 'react'
import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import ProtectedRoute from '@/components/ProtectedRoute'
import apiClient from '@/lib/api'
import { Plus, Edit2, Trash2, Eye } from 'lucide-react'

interface POI {
  id: string
  name: string
  status: string
  description: string
  listened_count: number
  rating_avg: number
  created_at: string
}

export default function POIs() {
  const [pois, setPois] = useState<POI[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>(
    'all'
  )

  useEffect(() => {
    fetchPois()
  }, [])

  const fetchPois = async () => {
    setLoading(true)
    try {
      const response = await apiClient.get('/owner/pois')
      setPois(response.data)
    } catch (error) {
      console.error('Failed to fetch POIs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn chắc chắn muốn xóa POI này?')) return

    try {
      await apiClient.delete(`/owner/pois/${id}`)
      setPois((prev) => prev.filter((p) => p.id !== id))
    } catch (error) {
      console.error('Failed to delete POI:', error)
      alert('Xóa POI thất bại')
    }
  }

  const filteredPois =
    filter === 'all' ? pois : pois.filter((p) => p.status === filter)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'text-green-400 bg-green-400/10'
      case 'pending':
        return 'text-yellow-400 bg-yellow-400/10'
      case 'rejected':
        return 'text-red-400 bg-red-400/10'
      default:
        return 'text-gray-400 bg-gray-400/10'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Đã phê duyệt'
      case 'pending':
        return 'Chờ phê duyệt'
      case 'rejected':
        return 'Bị từ chối'
      default:
        return 'Unknown'
    }
  }

  return (
    <ProtectedRoute>
      <div className="flex bg-dark min-h-screen">
        <Sidebar />
        <main className="flex-1 p-8">
          <div className="max-w-7xl">
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-4xl font-bold text-white">Quản lý POI</h1>
              <Link
                href="/pois/create"
                className="flex items-center gap-2 bg-primary hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition"
              >
                <Plus size={20} />
                Tạo POI mới
              </Link>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 mb-6 flex-wrap">
              {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-lg font-semibold transition ${
                    filter === f
                      ? 'bg-primary text-white'
                      : 'bg-secondary text-gray-300 hover:text-white'
                  }`}
                >
                  {f === 'all'
                    ? 'Tất cả'
                    : f === 'pending'
                    ? 'Chờ phê duyệt'
                    : f === 'approved'
                    ? 'Đã phê duyệt'
                    : 'Bị từ chối'}
                </button>
              ))}
            </div>

            {/* POI List */}
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin">⏳</div>
                <p className="text-gray-400 mt-2">Đang tải...</p>
              </div>
            ) : filteredPois.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {filteredPois.map((poi) => (
                  <div
                    key={poi.id}
                    className="bg-secondary border border-gray-700 rounded-lg p-6 hover:border-primary/50 transition"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-white mb-2">
                          {poi.name}
                        </h3>
                        <p className="text-gray-400 text-sm mb-3">
                          {poi.description}
                        </p>
                        <div className="flex gap-3 flex-wrap">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                              poi.status
                            )}`}
                          >
                            {getStatusLabel(poi.status)}
                          </span>
                          <span className="text-gray-400 text-sm">
                            📊 {poi.listened_count} lượt nghe
                          </span>
                          <span className="text-gray-400 text-sm">
                            ⭐ {poi.rating_avg.toFixed(1)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 justify-end">
                      <Link
                        href={`/pois/${poi.id}`}
                        className="flex items-center gap-2 px-3 py-1 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded transition text-sm"
                      >
                        <Eye size={16} />
                        Xem
                      </Link>
                      {poi.status === 'pending' && (
                        <Link
                          href={`/pois/${poi.id}/edit`}
                          className="flex items-center gap-2 px-3 py-1 bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 rounded transition text-sm"
                        >
                          <Edit2 size={16} />
                          Sửa
                        </Link>
                      )}
                      <button
                        onClick={() => handleDelete(poi.id)}
                        className="flex items-center gap-2 px-3 py-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded transition text-sm"
                      >
                        <Trash2 size={16} />
                        Xóa
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-secondary border border-gray-700 rounded-lg">
                <MapPin className="mx-auto text-gray-500 mb-3" size={48} />
                <p className="text-gray-400">Chưa có POI nào</p>
                <Link
                  href="/pois/create"
                  className="mt-4 inline-block text-primary hover:underline"
                >
                  Tạo POI đầu tiên
                </Link>
              </div>
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}

import { MapPin } from 'lucide-react'
