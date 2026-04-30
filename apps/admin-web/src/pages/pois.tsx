import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import Sidebar from '@/components/Sidebar'
import ProtectedRoute from '@/components/ProtectedRoute'
import apiClient from '@/lib/api'
import { CheckCircle, CheckSquare2, Clock, DollarSign, ExternalLink, Eye, MapPin, Navigation, Search, Trash2, Volume2, X, XCircle } from 'lucide-react'

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
  owner_name?: string
  owner_account_status?: string
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
  const router = useRouter()
  const [pois, setPois] = useState<POI[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'seller_deleted'>('all')
  const [query, setQuery] = useState('')
  const [selectedPoi, setSelectedPoi] = useState<POI | null>(null)
  const [showApprovalQueue, setShowApprovalQueue] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [selectionMode, setSelectionMode] = useState(false)

  useEffect(() => {
    void fetchPois()
    const timer = window.setInterval(() => {
      void fetchPois(true)
    }, 5000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!router.isReady) return
    const nextStatus = typeof router.query.status === 'string' ? router.query.status : ''
    const nextQuery = typeof router.query.q === 'string' ? router.query.q : ''
    if (nextStatus === 'pending' || nextStatus === 'approved' || nextStatus === 'rejected' || nextStatus === 'seller_deleted') {
      setFilter(nextStatus)
    }
    if (nextQuery) setQuery(nextQuery)
    if (router.query.openApproval === '1') setShowApprovalQueue(true)
  }, [router.isReady, router.query])

  useEffect(() => {
    if (!router.isReady || !pois.length) return
    const focusId = typeof router.query.focusId === 'string' ? router.query.focusId : ''
    if (!focusId) return
    const matchedPoi = pois.find((poi) => poi.id === focusId)
    if (matchedPoi) setSelectedPoi(matchedPoi)
  }, [router.isReady, router.query.focusId, pois])

  const normalizePoi = (poi: any): POI => ({
    id: String(poi.id || ''),
    name: poi.name || 'Chưa có tên',
    category: poi.category || '',
    categories: Array.isArray(poi.categories) ? poi.categories : [],
    shortDescription: poi.shortDescription || poi.short_description || '',
    description: poi.description || '',
    address: poi.address || '',
    openTime: poi.openTime || poi.open_time || '',
    closeTime: poi.closeTime || poi.close_time || '',
    priceText: poi.priceText || poi.price_text || '',
    phone: poi.phone || '',
    websiteUrl: poi.websiteUrl || poi.website_url || '',
    status: poi.status || 'pending',
    ownerId: Number(poi.ownerId ?? poi.owner_id ?? 0),
    owner_name: poi.owner_name || poi.ownerName || '',
    owner_account_status: poi.owner_account_status || 'active',
    listened_count: Number(poi.listened_count ?? poi.listenedCount ?? 0),
    rating_avg: Number(poi.rating_avg ?? poi.ratingAvg ?? 0),
    rating_count: Number(poi.rating_count ?? poi.ratingCount ?? 0),
    latitude: Number(poi.latitude ?? 0),
    longitude: Number(poi.longitude ?? 0),
    radius: Number(poi.radius ?? 0),
    priority: Number(poi.priority ?? 0),
    created_at: poi.created_at || poi.createdAt || new Date().toISOString(),
    images: Array.isArray(poi.images) ? poi.images.filter(Boolean) : [],
    audios: Array.isArray(poi.audios) ? poi.audios : [],
  })

  const fetchPois = async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const params: Record<string, string | number> = {}
      if (typeof router.query.ownerId === 'string') params.ownerId = Number(router.query.ownerId)
      const response = await apiClient.get('/admin/pois', { params })
      const nextPois = (response.data || []).map(normalizePoi)
      setPois(nextPois)
      setSelectedPoi((current) => current ? nextPois.find((poi: POI) => poi.id === current.id) || null : null)
    } finally {
      if (!silent) setLoading(false)
    }
  }

  const handleApprove = async (id: string) => {
    await apiClient.put(`/admin/pois/${id}/approve`)
    await fetchPois(true)
  }

  const handleReject = async (id: string) => {
    const reason = prompt('Lý do từ chối POI?') || ''
    await apiClient.put(`/admin/pois/${id}/reject`, { reason })
    await fetchPois(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Xóa hẳn POI này?')) return
    await apiClient.delete(`/admin/pois/${id}`)
    setSelectedPoi((current) => (current?.id === id ? null : current))
    await fetchPois(true)
  }

  const bulkDelete = async () => {
    if (!selectedIds.length || !confirm(`Xóa hẳn ${selectedIds.length} POI đã chọn?`)) return
    for (const id of selectedIds) {
      await apiClient.delete(`/admin/pois/${id}`)
    }
    setSelectedIds([])
    await fetchPois(true)
  }

  const pendingPois = useMemo(() => pois.filter((p) => p.status === 'pending'), [pois])
  const filteredPois = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    return (filter === 'all' ? pois : pois.filter((p) => p.status === filter))
      .filter((poi) =>
        [
          poi.name,
          poi.description,
          poi.shortDescription,
          poi.address,
          poi.owner_name,
          poi.category,
          poi.status,
          ...(poi.categories || []),
        ]
          .join(' ')
          .toLowerCase()
          .includes(keyword)
      )
      .sort((left, right) => {
        const ownerCompare = (left.owner_name || `Seller #${left.ownerId}`).localeCompare(right.owner_name || `Seller #${right.ownerId}`)
        if (ownerCompare !== 0) return ownerCompare
        return new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
      })
  }, [filter, pois, query])

  const getStatusColor = (status: string) => {
    if (status === 'approved') return 'text-success bg-success/10'
    if (status === 'pending') return 'text-warning bg-warning/10'
    if (status === 'rejected') return 'text-danger bg-danger/10'
    if (status === 'seller_deleted') return 'text-gray-300 bg-gray-500/10'
    return 'text-gray-400 bg-gray-400/10'
  }

  const getStatusLabel = (status: string) => {
    if (status === 'approved') return 'Đã phê duyệt'
    if (status === 'pending') return 'Chờ phê duyệt'
    if (status === 'rejected') return 'Bị từ chối'
    if (status === 'seller_deleted') return 'Seller đã xóa'
    return status
  }

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-dark">
        <Sidebar />
        <main className="flex-1 p-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-white">Quản lý POI</h1>
                <p className="mt-2 text-gray-400">Theo dõi POI theo seller, duyệt nội dung và kiểm tra chi tiết trước khi hiển thị trong app.</p>
              </div>
              <button
                onClick={() => setShowApprovalQueue(true)}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-3 font-semibold transition ${
                  pendingPois.length ? 'bg-yellow-500 text-dark hover:bg-yellow-400 shadow-lg shadow-yellow-500/20' : 'bg-secondary text-gray-300 hover:text-white'
                }`}
              >
                <CheckCircle size={18} />
                Cần duyệt ({pendingPois.length})
              </button>
            </div>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-3 text-gray-500" size={18} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="w-full rounded-xl border border-gray-700 bg-secondary py-3 pl-10 pr-4 text-white placeholder:text-gray-500"
                placeholder="Tìm theo tên POI, seller, địa chỉ, danh mục, trạng thái..."
              />
            </div>

            <div className="mb-6 flex flex-wrap items-center gap-2">
              {(['all', 'pending', 'approved', 'rejected', 'seller_deleted'] as const).map((item) => (
                <button
                  key={item}
                  onClick={() => setFilter(item)}
                  className={`rounded-lg px-4 py-2 font-semibold ${filter === item ? 'bg-primary text-white' : 'bg-secondary text-gray-300 hover:text-white'}`}
                >
                  {item === 'all' ? 'Tất cả' : item === 'pending' ? 'Chờ phê duyệt' : item === 'approved' ? 'Đã phê duyệt' : item === 'seller_deleted' ? 'Seller đã xóa' : 'Bị từ chối'}
                </button>
              ))}
              <div className="ml-auto flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectionMode((value) => !value)
                    setSelectedIds([])
                  }}
                  className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 font-semibold transition ${selectionMode ? 'bg-primary text-white' : 'bg-secondary text-gray-200 hover:text-white'}`}
                >
                  {selectionMode ? <X size={16} /> : <CheckSquare2 size={16} />}
                  {selectionMode ? 'Thoát chọn' : 'Select'}
                </button>
                {selectedIds.length > 0 && (
                  <button onClick={() => void bulkDelete()} className="rounded-lg bg-red-500/15 px-4 py-2 font-semibold text-red-300 hover:bg-red-500/25">
                    Xóa {selectedIds.length} mục
                  </button>
                )}
              </div>
            </div>

            {loading ? (
              <div className="py-12 text-center text-gray-400">Đang tải...</div>
            ) : (
              <div className="grid gap-4">
                {filteredPois.length ? filteredPois.map((poi) => (
                  <div
                    key={poi.id}
                    onClick={() => {
                      if (selectionMode) {
                        setSelectedIds((prev) => prev.includes(poi.id) ? prev.filter((item) => item !== poi.id) : [...prev, poi.id])
                      }
                    }}
                    className={`rounded-lg border bg-secondary p-6 transition ${selectionMode ? 'cursor-pointer' : ''} ${selectedIds.includes(poi.id) ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10' : 'border-gray-700 hover:border-primary/50'}`}
                  >
                    <div className="mb-4 flex justify-between gap-4">
                      <div className="flex flex-1 gap-4">
                        <div className="flex-1">
                          <h3 className="mb-2 text-xl font-bold text-white">{poi.name}</h3>
                          <p className="mb-3 line-clamp-2 text-sm text-gray-400">{poi.description}</p>
                          <div className="flex flex-wrap gap-3 text-sm">
                            <span className={`rounded-full px-3 py-1 font-semibold ${getStatusColor(poi.status)}`}>{getStatusLabel(poi.status)}</span>
                            <span className="text-gray-400">Seller: {poi.owner_name || `#${poi.ownerId}`}</span>
                            <span className="text-gray-400">📊 {poi.listened_count} lượt</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2">
                      <button onClick={(event) => { event.stopPropagation(); setSelectedPoi(poi) }} className="flex items-center gap-2 rounded bg-blue-500/20 px-3 py-1 text-sm text-blue-400 hover:bg-blue-500/30"><Eye size={16} />Xem</button>
                      {poi.status === 'pending' && (
                        <>
                          <button onClick={(event) => { event.stopPropagation(); void handleApprove(poi.id) }} className="flex items-center gap-2 rounded bg-success/20 px-3 py-1 text-sm text-success hover:bg-success/30"><CheckCircle size={16} />Duyệt</button>
                          <button onClick={(event) => { event.stopPropagation(); void handleReject(poi.id) }} className="flex items-center gap-2 rounded bg-danger/20 px-3 py-1 text-sm text-danger hover:bg-danger/30"><XCircle size={16} />Từ chối</button>
                        </>
                      )}
                      <button onClick={(event) => { event.stopPropagation(); void handleDelete(poi.id) }} className="flex items-center gap-2 rounded bg-danger/20 px-3 py-1 text-sm text-danger hover:bg-danger/30"><Trash2 size={16} />Xóa</button>
                    </div>
                  </div>
                )) : (
                  <div className="rounded-lg border border-gray-700 bg-secondary py-12 text-center text-gray-400">Không có POI nào</div>
                )}
              </div>
            )}

            {showApprovalQueue && (
              <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4" onClick={() => setShowApprovalQueue(false)}>
                <div className="w-full max-w-4xl rounded-2xl border border-gray-700 bg-secondary p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-white">Danh sách POI cần duyệt</h2>
                      <p className="text-sm text-gray-400">Admin xem nhanh, mở chi tiết hoặc duyệt/từ chối ngay.</p>
                    </div>
                    <button onClick={() => setShowApprovalQueue(false)} className="rounded-lg bg-dark px-4 py-2 text-white">Đóng</button>
                  </div>
                  <div className="max-h-[70vh] space-y-3 overflow-auto pr-1">
                    {pendingPois.length ? pendingPois.map((poi) => (
                      <div key={poi.id} className="rounded-xl border border-gray-700 bg-dark/60 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <h3 className="text-lg font-bold text-white">{poi.name}</h3>
                            <p className="text-sm text-gray-400">Seller: {poi.owner_name || `#${poi.ownerId}`}</p>
                            <p className="mt-2 line-clamp-2 text-sm text-gray-300">{poi.description}</p>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => { setSelectedPoi(poi); setShowApprovalQueue(false) }} className="rounded-lg bg-primary/20 px-3 py-2 text-primary hover:bg-primary/30">Xem</button>
                            <button onClick={() => void handleApprove(poi.id)} className="rounded-lg bg-success/20 px-3 py-2 text-success hover:bg-success/30">Duyệt</button>
                            <button onClick={() => void handleReject(poi.id)} className="rounded-lg bg-danger/20 px-3 py-2 text-danger hover:bg-danger/30">Từ chối</button>
                          </div>
                        </div>
                      </div>
                    )) : (
                      <div className="rounded-xl border border-dashed border-gray-700 py-10 text-center text-gray-400">Không có POI chờ duyệt</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {selectedPoi && (
              <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 p-6" onClick={() => setSelectedPoi(null)}>
                <div className="mx-auto max-w-5xl overflow-hidden rounded-3xl border border-gray-700 bg-secondary shadow-2xl" onClick={(event) => event.stopPropagation()}>
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
                        <Info label="Địa chỉ" value={selectedPoi.address || 'Chưa cập nhật'} />
                        <Info label="Tọa độ" value={`${selectedPoi.latitude}, ${selectedPoi.longitude}`} />
                        <Info label="Số điện thoại" value={selectedPoi.phone || 'Chưa cập nhật'} />
                        <div className="rounded-xl border border-gray-700 bg-dark/40 p-4">
                          <p className="text-sm text-gray-400">Website</p>
                          {selectedPoi.websiteUrl ? (
                            <a href={selectedPoi.websiteUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-primary hover:underline">
                              {selectedPoi.websiteUrl}
                              <ExternalLink size={14} />
                            </a>
                          ) : (
                            <p className="mt-1 text-white">Chưa cập nhật</p>
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
                          <div key={audio.id} className="rounded-xl border border-gray-700 bg-dark/60 p-4">
                            <div className="mb-2 flex flex-wrap justify-between gap-3">
                              <div>
                                <p className="font-bold text-white">{audio.languageName || audio.languageCode}</p>
                                <p className="text-sm text-gray-400">Trạng thái: {audio.approvalStatus}</p>
                              </div>
                            </div>
                            <p className="text-sm text-gray-300 whitespace-pre-line">{audio.scriptText}</p>
                          </div>
                        ))}
                        {!selectedPoi.audios?.length ? <p className="text-gray-400">Chưa có audio.</p> : null}
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

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-700 bg-dark/40 p-4">
      <p className="text-sm text-gray-400">{label}</p>
      <p className="mt-1 text-white">{value}</p>
    </div>
  )
}
