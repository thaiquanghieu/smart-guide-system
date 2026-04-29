import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import Sidebar from '@/components/Sidebar'
import ProtectedRoute from '@/components/ProtectedRoute'
import apiClient from '@/lib/api'
import { Plus, Edit2, Trash2, Eye, Search, MapPin } from 'lucide-react'

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
  const router = useRouter()
  const [pois, setPois] = useState<POI[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>(
    'all'
  )
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<'newest' | 'oldest' | 'listens_desc' | 'rating_desc' | 'name_asc'>('newest')
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  useEffect(() => {
    void fetchPois()
    const timer = window.setInterval(() => {
      void fetchPois(true)
    }, 5000)

    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!router.isReady) return
    const status = router.query.status
    if (status === 'pending' || status === 'approved' || status === 'rejected' || status === 'all') {
      setFilter(status)
    }
  }, [router.isReady, router.query.status])

  const normalizePoi = (poi: any): POI => ({
    id: String(poi.id || ''),
    name: poi.name || 'Chưa có tên',
    status: poi.status || 'pending',
    description: poi.description || poi.shortDescription || poi.short_description || '',
    listened_count: Number(poi.listened_count ?? poi.listenedCount ?? 0),
    rating_avg: Number(poi.rating_avg ?? poi.ratingAvg ?? 0),
    created_at: poi.created_at || poi.createdAt || new Date().toISOString(),
  })

  const fetchPois = async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const response = await apiClient.get('/owner/pois')
      setPois((response.data || []).map(normalizePoi).filter((poi: POI) => poi.id))
    } catch (error) {
      console.error('Failed to fetch POIs:', error)
    } finally {
      if (!silent) setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn chắc chắn muốn xóa POI này?')) return

    try {
      await apiClient.delete(`/owner/pois/${id}`)
      setPois((prev) => prev.map((poi) => (poi.id === id ? { ...poi, status: 'seller_deleted' } : poi)))
      setSelectedIds((prev) => prev.filter((item) => item !== id))
    } catch (error) {
      console.error('Failed to delete POI:', error)
      alert('Xóa POI thất bại')
    }
  }

  const handleBulkDelete = async () => {
    if (!selectedIds.length) return
    if (!confirm(`Ẩn ${selectedIds.length} POI đã chọn?`)) return
    for (const id of selectedIds) {
      await apiClient.delete(`/owner/pois/${id}`)
    }
    setPois((prev) => prev.map((poi) => (selectedIds.includes(poi.id) ? { ...poi, status: 'seller_deleted' } : poi)))
    setSelectedIds([])
  }

  const visibleSource = pois.filter((poi) => poi.status !== 'seller_deleted')
  const filteredPois = (filter === 'all' ? visibleSource : visibleSource.filter((p) => p.status === filter))
    .filter((poi) => `${poi.name || ''} ${poi.description || ''}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => {
      if (sort === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      if (sort === 'listens_desc') return b.listened_count - a.listened_count
      if (sort === 'rating_desc') return Number(b.rating_avg || 0) - Number(a.rating_avg || 0)
      if (sort === 'name_asc') return (a.name || '').localeCompare(b.name || '')
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'text-green-400 bg-green-400/10'
      case 'pending':
        return 'text-yellow-400 bg-yellow-400/10'
      case 'rejected':
        return 'text-red-400 bg-red-400/10'
      case 'seller_deleted':
        return 'text-gray-400 bg-gray-400/10'
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
      case 'seller_deleted':
        return 'Đã ẩn'
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
              <div className="flex items-center gap-3">
                {selectedIds.length > 0 && (
                  <button
                    onClick={handleBulkDelete}
                    className="rounded-lg bg-red-500/20 px-4 py-2 font-semibold text-red-300 hover:bg-red-500/30"
                  >
                    Ẩn {selectedIds.length} mục
                  </button>
                )}
                <Link
                  href="/pois/create"
                  className="flex items-center gap-2 bg-primary hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition"
                >
                  <Plus size={20} />
                  Tạo POI mới
                </Link>
              </div>
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

            <div className="grid md:grid-cols-[1fr_260px] gap-3 mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-3 text-gray-500" size={18} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-secondary border border-gray-700 rounded-xl text-white"
                  placeholder="Tìm theo tên hoặc mô tả POI..."
                />
              </div>
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as any)}
                className="w-full px-4 py-3 bg-secondary border border-gray-700 rounded-xl text-white"
              >
                <option value="newest">Mới tạo nhất</option>
                <option value="oldest">Cũ nhất</option>
                <option value="listens_desc">Lượt nghe nhiều nhất</option>
                <option value="rating_desc">Đánh giá cao nhất</option>
                <option value="name_asc">Tên A-Z</option>
              </select>
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
                    <div className="mb-4 flex items-start justify-between gap-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(poi.id)}
                        onChange={(event) =>
                          setSelectedIds((prev) =>
                            event.target.checked ? [...prev, poi.id] : prev.filter((item) => item !== poi.id)
                          )
                        }
                        className="mt-1 h-4 w-4 rounded border-gray-600 bg-dark text-primary"
                      />
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
                            ⭐ {Number(poi.rating_avg || 0).toFixed(1)}
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
                      <Link
                        href={`/pois/${poi.id}/edit`}
                        className="flex items-center gap-2 px-3 py-1 bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 rounded transition text-sm"
                      >
                        <Edit2 size={16} />
                        Sửa
                      </Link>
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
                {filter === 'all' && (
                  <Link
                    href="/pois/create"
                    className="mt-4 inline-block text-primary hover:underline"
                  >
                    Tạo POI đầu tiên
                  </Link>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}
