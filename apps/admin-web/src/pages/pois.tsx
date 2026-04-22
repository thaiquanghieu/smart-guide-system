import { useState, useEffect } from 'react'
import Sidebar from '@/components/Sidebar'
import ProtectedRoute from '@/components/ProtectedRoute'
import apiClient from '@/lib/api'
import { CheckCircle, XCircle, Trash2, Eye } from 'lucide-react'
import Link from 'next/link'

interface POI {
  id: string
  name: string
  description: string
  status: string
  ownerId: number
  listened_count: number
  created_at: string
}

export default function POIs() {
  const [pois, setPois] = useState<POI[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>(
    'pending'
  )

  useEffect(() => {
    fetchPois()
  }, [])

  const fetchPois = async () => {
    setLoading(true)
    try {
      const response = await apiClient.get('/admin/pois')
      setPois(response.data)
    } catch (error) {
      console.error('Failed to fetch POIs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (id: string) => {
    try {
      await apiClient.put(`/admin/pois/${id}/approve`)
      setPois((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: 'approved' } : p))
      )
    } catch (error) {
      console.error('Failed to approve:', error)
      alert('Phê duyệt thất bại')
    }
  }

  const handleReject = async (id: string) => {
    try {
      await apiClient.put(`/admin/pois/${id}/reject`, {})
      setPois((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: 'rejected' } : p))
      )
    } catch (error) {
      console.error('Failed to reject:', error)
      alert('Từ chối thất bại')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Xóa POI này?')) return

    try {
      await apiClient.delete(`/admin/pois/${id}`)
      setPois((prev) => prev.filter((p) => p.id !== id))
    } catch (error) {
      console.error('Failed to delete:', error)
      alert('Xóa POI thất bại')
    }
  }

  const filteredPois = filter === 'all' ? pois : pois.filter((p) => p.status === filter)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'text-success bg-success/10'
      case 'pending':
        return 'text-warning bg-warning/10'
      case 'rejected':
        return 'text-danger bg-danger/10'
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
            <h1 className="text-3xl font-bold text-white mb-6">Duyệt POI</h1>

            {/* Filter */}
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

            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin">⏳</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredPois.length > 0 ? (
                  filteredPois.map((poi) => (
                    <div
                      key={poi.id}
                      className="bg-secondary border border-gray-700 rounded-lg p-6 hover:border-primary/50 transition"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-white mb-2">
                            {poi.name}
                          </h3>
                          <p className="text-gray-400 text-sm mb-3 line-clamp-2">
                            {poi.description}
                          </p>
                          <div className="flex gap-3 flex-wrap text-sm">
                            <span
                              className={`px-3 py-1 rounded-full font-semibold ${getStatusColor(
                                poi.status
                              )}`}
                            >
                              {getStatusLabel(poi.status)}
                            </span>
                            <span className="text-gray-400">
                              By: User #{poi.ownerId}
                            </span>
                            <span className="text-gray-400">
                              📊 {poi.listened_count} lượt
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
                          <>
                            <button
                              onClick={() => handleApprove(poi.id)}
                              className="flex items-center gap-2 px-3 py-1 bg-success/20 text-success hover:bg-success/30 rounded transition text-sm"
                            >
                              <CheckCircle size={16} />
                              Duyệt
                            </button>
                            <button
                              onClick={() => handleReject(poi.id)}
                              className="flex items-center gap-2 px-3 py-1 bg-danger/20 text-danger hover:bg-danger/30 rounded transition text-sm"
                            >
                              <XCircle size={16} />
                              Từ chối
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleDelete(poi.id)}
                          className="flex items-center gap-2 px-3 py-1 bg-danger/20 text-danger hover:bg-danger/30 rounded transition text-sm"
                        >
                          <Trash2 size={16} />
                          Xóa
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 bg-secondary border border-gray-700 rounded-lg">
                    <p className="text-gray-400">Không có POI nào</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}
