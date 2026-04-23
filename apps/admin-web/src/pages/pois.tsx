import { useState, useEffect } from 'react'
import Sidebar from '@/components/Sidebar'
import ProtectedRoute from '@/components/ProtectedRoute'
import apiClient from '@/lib/api'
import { CheckCircle, XCircle, Trash2, Eye, MapPin, Clock, DollarSign, Navigation, ExternalLink, Volume2 } from 'lucide-react'

interface POI {
  id: string
  name: string
  category?: string
  categories?: string[]
  shortDescription?: string
  description: string
  address?: string
  openTime?: string
  closeTime?: string
  priceText?: string
  phone?: string
  websiteUrl?: string
  status: string
  ownerId: number
  listened_count: number
  rating_avg?: number
  rating_count?: number
  latitude?: number
  longitude?: number
  radius?: number
  priority?: number
  created_at: string
  images?: string[]
  audios?: Array<{ id: string; languageCode: string; languageName: string; scriptText: string; audioUrl?: string; approvalStatus: string; rejectedReason?: string }>
}

const API_ORIGIN = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5022/api').replace(/\/api\/?$/, '')

function assetUrl(url?: string) {
  if (!url) return ''
  if (/^https?:\/\//i.test(url)) return url
  return `${API_ORIGIN}${url.startsWith('/') ? url : `/${url}`}`
}

function googleMapsUrl(poi: POI) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${poi.latitude},${poi.longitude}`)}`
}

export default function POIs() {
  const [pois, setPois] = useState<POI[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>(
    'pending'
  )
  const [selectedPoi, setSelectedPoi] = useState<POI | null>(null)

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
    const reason = prompt('Lý do từ chối POI?') || ''
    try {
      await apiClient.put(`/admin/pois/${id}/reject`, { reason })
      setPois((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: 'rejected' } : p))
      )
    } catch (error) {
      console.error('Failed to reject:', error)
      alert('Từ chối thất bại')
    }
  }

  const handleAudioStatus = async (audioId: string, status: 'approve' | 'reject') => {
    const reason = status === 'reject' ? prompt('Lý do từ chối audio?') || '' : ''
    try {
      await apiClient.put(`/admin/audio/${audioId}/${status}`, status === 'reject' ? { reason } : {})
      await fetchPois()
      setSelectedPoi(null)
    } catch {
      alert('Cập nhật audio thất bại')
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
                        <button
                          onClick={() => setSelectedPoi(poi)}
                          className="flex items-center gap-2 px-3 py-1 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded transition text-sm"
                        >
                          <Eye size={16} />
                          Xem
                        </button>
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

            {selectedPoi && (
              <div className="fixed inset-0 z-50 bg-black/70 p-6 overflow-y-auto" onClick={() => setSelectedPoi(null)}>
                <div className="max-w-5xl mx-auto bg-secondary border border-gray-700 rounded-3xl overflow-hidden shadow-2xl" onClick={(event) => event.stopPropagation()}>
                  <div className="relative min-h-[320px] bg-dark">
                    {selectedPoi.images?.[0] ? (
                      <img src={assetUrl(selectedPoi.images[0])} alt={selectedPoi.name} className="absolute inset-0 h-full w-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-secondary to-dark" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/20" />
                    <div className="relative z-10 flex min-h-[320px] flex-col justify-between p-6">
                      <div className="flex items-start justify-between gap-4">
                        <button onClick={() => setSelectedPoi(null)} className="rounded-full bg-black/40 px-4 py-2 text-white backdrop-blur hover:bg-black/60">Đóng</button>
                        <span className={`rounded-full px-4 py-2 text-sm font-semibold ${getStatusColor(selectedPoi.status)}`}>{getStatusLabel(selectedPoi.status)}</span>
                      </div>
                      <div>
                        <div className="mb-3 flex flex-wrap gap-2">
                          {(selectedPoi.categories?.length ? selectedPoi.categories : [selectedPoi.category]).filter(Boolean).map((category) => (
                            <span key={category} className="rounded-full bg-primary px-3 py-1 text-sm font-semibold text-white">{category}</span>
                          ))}
                        </div>
                        <h2 className="text-4xl font-bold text-white drop-shadow">{selectedPoi.name}</h2>
                        <p className="mt-2 max-w-2xl text-gray-100 drop-shadow">{selectedPoi.shortDescription || selectedPoi.description}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6 p-6">
                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="rounded-2xl border border-gray-700 bg-dark/60 p-4">
                        <div className="mb-1 flex items-center gap-2 text-primary"><Clock size={18} /> Giờ mở cửa</div>
                        <p className="text-lg font-semibold text-white">{selectedPoi.openTime || '--:--'} - {selectedPoi.closeTime || '--:--'}</p>
                      </div>
                      <div className="rounded-2xl border border-gray-700 bg-dark/60 p-4">
                        <div className="mb-1 flex items-center gap-2 text-primary"><DollarSign size={18} /> Giá/chi phí</div>
                        <p className="text-lg font-semibold text-white">{selectedPoi.priceText || 'Chưa cập nhật'}</p>
                      </div>
                      <a href={googleMapsUrl(selectedPoi)} target="_blank" rel="noreferrer" className="rounded-2xl border border-primary/40 bg-primary/15 p-4 hover:bg-primary/25">
                        <div className="mb-1 flex items-center gap-2 text-primary"><Navigation size={18} /> Xem vị trí</div>
                        <p className="text-lg font-semibold text-white">Mở Google Maps</p>
                      </a>
                    </div>

                    <div className="rounded-2xl border border-gray-700 bg-dark/50 p-5">
                      <h3 className="mb-3 flex items-center gap-2 text-xl font-bold text-white"><MapPin className="text-primary" /> Thông tin POI</h3>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <p className="text-sm text-gray-400">Địa chỉ</p>
                          <p className="text-white">{selectedPoi.address || 'Chưa cập nhật'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-400">Tọa độ</p>
                          <p className="text-white">{selectedPoi.latitude}, {selectedPoi.longitude}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-400">Số điện thoại</p>
                          <p className="text-white">{selectedPoi.phone || 'Chưa cập nhật'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-400">Website</p>
                          {selectedPoi.websiteUrl ? (
                            <a href={selectedPoi.websiteUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                              {selectedPoi.websiteUrl}
                              <ExternalLink size={14} />
                            </a>
                          ) : (
                            <p className="text-white">Chưa cập nhật</p>
                          )}
                        </div>
                      </div>
                      <div className="mt-5">
                        <p className="text-sm text-gray-400">Mô tả chi tiết</p>
                        <p className="mt-2 whitespace-pre-line text-gray-200">{selectedPoi.description}</p>
                      </div>
                    </div>

                    {selectedPoi.images?.length ? (
                      <div>
                        <h3 className="mb-3 text-xl font-bold text-white">Hình ảnh</h3>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          {selectedPoi.images.map((image) => (
                            <img key={image} src={assetUrl(image)} alt={selectedPoi.name} className="aspect-video w-full rounded-2xl border border-gray-700 object-cover" />
                          ))}
                        </div>
                      </div>
                    ) : null}

                    <div>
                      <h3 className="mb-3 flex items-center gap-2 text-xl font-bold text-white"><Volume2 className="text-primary" /> Audio/TTS</h3>
                      <div className="space-y-3">
                        {(selectedPoi.audios || []).map((audio) => (
                          <div key={audio.id} className="bg-dark/60 border border-gray-700 rounded-xl p-4">
                            <div className="flex flex-wrap justify-between gap-3 mb-2">
                              <div>
                                <p className="text-white font-bold">{audio.languageName || audio.languageCode}</p>
                                <p className="text-gray-400 text-sm">Trạng thái: {audio.approvalStatus}</p>
                                {audio.audioUrl && <p className="text-primary text-xs">{audio.audioUrl}</p>}
                              </div>
                              <div className="flex gap-2">
                                <button onClick={() => handleAudioStatus(audio.id, 'approve')} className="px-3 py-2 bg-success/20 text-success rounded-lg">Duyệt audio</button>
                                <button onClick={() => handleAudioStatus(audio.id, 'reject')} className="px-3 py-2 bg-danger/20 text-danger rounded-lg">Từ chối</button>
                              </div>
                            </div>
                            <p className="text-gray-300 text-sm whitespace-pre-line">{audio.scriptText}</p>
                          </div>
                        ))}
                        {!selectedPoi.audios?.length && <p className="text-gray-400">Chưa có audio.</p>}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}
