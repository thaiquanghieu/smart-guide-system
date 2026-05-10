import { useEffect, useMemo, useRef, useState } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import Sidebar from '@/components/Sidebar'
import apiClient from '@/lib/api'
import { Eye, EyeOff, Map, Pencil, Plus, Save, Trash2, Upload, X } from 'lucide-react'

type PoiOption = {
  id: string
  name: string
  status: string
  address?: string
  category?: string
  shortDescription?: string
  latitude?: number
  longitude?: number
  listenedCount: number
  ratingAvg: number
  images: string[]
}

type TourPoi = {
  poi_id: string
  sort_order: number
  poi_name: string
  poi_status: string
  poi_category?: string
  poi_address?: string
  latitude?: number
  longitude?: number
  image?: string
}

type Tour = {
  id: number
  name: string
  description: string
  cover_image_url?: string
  is_published: boolean
  poi_count: number
  poi_ids: string[]
  pois: TourPoi[]
  updated_at: string
}

type TourMetrics = {
  distanceKm: number
  motorbikeMinutes: number
}

type FormState = {
  id: number | null
  name: string
  description: string
  coverImageUrl: string
  isPublished: boolean
  poiIds: string[]
}

type FieldErrors = {
  name?: string
  coverImageUrl?: string
  poiIds?: string
}

const API_ORIGIN = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5022/api').replace(/\/api\/?$/, '')

const emptyForm: FormState = {
  id: null,
  name: '',
  description: '',
  coverImageUrl: '',
  isPublished: false,
  poiIds: [],
}

function mediaUrl(url?: string) {
  if (!url) return ''
  if (/^https?:\/\//i.test(url)) return url
  return `${API_ORIGIN}${url.startsWith('/') ? url : `/${url}`}`
}

function calculateDistanceKm(
  from?: { latitude?: number; longitude?: number },
  to?: { latitude?: number; longitude?: number }
) {
  if (!from?.latitude || !from?.longitude || !to?.latitude || !to?.longitude) return null
  const toRadians = (value: number) => (value * Math.PI) / 180
  const earthRadiusKm = 6371
  const latDelta = toRadians((to.latitude || 0) - (from.latitude || 0))
  const lngDelta = toRadians((to.longitude || 0) - (from.longitude || 0))
  const lat1 = toRadians(from.latitude || 0)
  const lat2 = toRadians(to.latitude || 0)
  const a =
    Math.sin(latDelta / 2) * Math.sin(latDelta / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(lngDelta / 2) * Math.sin(lngDelta / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return earthRadiusKm * c
}

function estimateMotorbikeMinutes(distanceKm: number) {
  if (distanceKm <= 0) return 0
  return Math.max(1, Math.round((distanceKm / 24) * 60))
}

function measureRouteDistanceKm(points: { latitude: number; longitude: number }[]) {
  if (points.length < 2) return 0

  let totalKm = 0
  for (let index = 1; index < points.length; index += 1) {
    totalKm += calculateDistanceKm(points[index - 1], points[index]) || 0
  }

  return totalKm
}

async function fetchRoadRoute(points: { latitude?: number; longitude?: number }[]) {
  const normalizedPoints = points.filter(
    (point): point is { latitude: number; longitude: number } =>
      Number.isFinite(point.latitude) && Number.isFinite(point.longitude)
  )
  if (normalizedPoints.length < 2) return []

  const coordinates = normalizedPoints
    .map((point) => `${point.longitude},${point.latitude}`)
    .join(';')

  const response = await fetch(
    `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson&steps=false`
  )

  if (!response.ok) {
    throw new Error(`Route service failed with status ${response.status}`)
  }

  const data = await response.json()
  const routeCoordinates = data?.routes?.[0]?.geometry?.coordinates
  if (!Array.isArray(routeCoordinates)) return []

  return routeCoordinates
    .filter((item: unknown) => Array.isArray(item) && item.length >= 2)
    .map((item: any) => ({
      latitude: Number(item[1]),
      longitude: Number(item[0]),
    }))
    .filter((point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude))
}

export default function ToursPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [tours, setTours] = useState<Tour[]>([])
  const [poiOptions, setPoiOptions] = useState<PoiOption[]>([])
  const [query, setQuery] = useState('')
  const [poiQuery, setPoiQuery] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [errorMessage, setErrorMessage] = useState('')
  const [listTour, setListTour] = useState<Tour | null>(null)
  const [selectedMapTour, setSelectedMapTour] = useState<Tour | null>(null)
  const [metricsByTour, setMetricsByTour] = useState<Record<number, TourMetrics>>({})

  useEffect(() => {
    void loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    setErrorMessage('')
    try {
      const poiResponse = await apiClient.get('/admin/pois')
      const nextPoiOptions = ((poiResponse.data || []) as any[])
        .filter((poi) => poi.status === 'approved')
        .map((poi) => ({
          id: String(poi.id || ''),
          name: poi.name || 'Chưa có tên',
          status: poi.status || 'approved',
          address: poi.address || '',
          category: poi.category || '',
          shortDescription: poi.shortDescription || poi.short_description || '',
          latitude: Number(poi.latitude ?? 0),
          longitude: Number(poi.longitude ?? 0),
          listenedCount: Number(poi.listened_count ?? poi.listenedCount ?? 0),
          ratingAvg: Number(poi.rating_avg ?? poi.ratingAvg ?? 0),
          images: Array.isArray(poi.images) ? poi.images.filter(Boolean) : [],
        }))
        .sort((left, right) => left.name.localeCompare(right.name))

      setPoiOptions(nextPoiOptions)

      try {
        const tourResponse = await apiClient.get('/admin/tours')
        const nextTours = (tourResponse.data || []) as Tour[]
        setTours(nextTours)
      } catch (error: any) {
        const message = error?.response?.data?.message || ''
        const isMissingMigration = message.toLowerCase().includes('migration') || message.toLowerCase().includes('tours/tour_pois')
        setTours([])
        if (!isMissingMigration) {
          setErrorMessage(message || 'Không tải được danh sách tour')
        }
      }
    } catch (error: any) {
      setErrorMessage(error?.response?.data?.message || 'Không tải được danh sách POI')
    } finally {
      setLoading(false)
    }
  }

  const filteredTours = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    if (!keyword) return tours
    return tours.filter((tour) => [tour.name, tour.description, ...tour.pois.map((poi) => poi.poi_name)].join(' ').toLowerCase().includes(keyword))
  }, [query, tours])

  const filteredPois = useMemo(() => {
    const keyword = poiQuery.trim().toLowerCase()
    if (!keyword) return poiOptions
    return poiOptions.filter((poi) => [poi.name, poi.address, poi.category, poi.shortDescription].join(' ').toLowerCase().includes(keyword))
  }, [poiOptions, poiQuery])

  const selectedPoiDetails = useMemo(() => {
    return form.poiIds
      .map((poiId) => poiOptions.find((poi) => poi.id === poiId))
      .filter(Boolean) as PoiOption[]
  }, [form.poiIds, poiOptions])

  useEffect(() => {
    let cancelled = false

    const loadMetrics = async () => {
      const entries = await Promise.all(
        tours.map(async (tour) => {
          const points = tour.pois
            .slice()
            .sort((left, right) => left.sort_order - right.sort_order)
            .filter(
              (poi): poi is TourPoi & { latitude: number; longitude: number } =>
                Number.isFinite(poi.latitude) && Number.isFinite(poi.longitude)
            )
            .map((poi) => ({ latitude: poi.latitude, longitude: poi.longitude }))

          if (points.length < 2) {
            return [tour.id, { distanceKm: 0, motorbikeMinutes: 0 }] as const
          }

          try {
            const routePath = await fetchRoadRoute(points)
            const distanceKm = measureRouteDistanceKm(routePath.length ? routePath : points)
            return [tour.id, { distanceKm, motorbikeMinutes: estimateMotorbikeMinutes(distanceKm) }] as const
          } catch {
            const distanceKm = measureRouteDistanceKm(points)
            return [tour.id, { distanceKm, motorbikeMinutes: estimateMotorbikeMinutes(distanceKm) }] as const
          }
        })
      )

      if (!cancelled) {
        setMetricsByTour(Object.fromEntries(entries))
      }
    }

    if (tours.length) {
      void loadMetrics()
    } else {
      setMetricsByTour({})
    }

    return () => {
      cancelled = true
    }
  }, [tours])

  const openCreateModal = () => {
    setForm(emptyForm)
    setFieldErrors({})
    setPoiQuery('')
    setModalOpen(true)
  }

  const openEditModal = (tour: Tour) => {
    setForm({
      id: tour.id,
      name: tour.name || '',
      description: tour.description || '',
      coverImageUrl: tour.cover_image_url || '',
      isPublished: !!tour.is_published,
      poiIds: Array.isArray(tour.poi_ids) ? tour.poi_ids : [],
    })
    setFieldErrors({})
    setPoiQuery('')
    setModalOpen(true)
  }

  const closeModal = () => {
    if (saving || uploadingCover) return
    setModalOpen(false)
    setForm(emptyForm)
    setFieldErrors({})
    setPoiQuery('')
  }

  const togglePoi = (poiId: string) => {
    setForm((current) => ({
      ...current,
      poiIds: current.poiIds.includes(poiId)
        ? current.poiIds.filter((id) => id !== poiId)
        : [...current.poiIds, poiId],
    }))
    setFieldErrors((current) => ({ ...current, poiIds: undefined }))
  }

  const removeSelectedPoi = (poiId: string) => {
    setForm((current) => ({ ...current, poiIds: current.poiIds.filter((id) => id !== poiId) }))
  }

  const uploadCover = async (file?: File) => {
    if (!file) return
    setUploadingCover(true)
    setErrorMessage('')
    try {
      const body = new FormData()
      body.append('file', file)
      const response = await apiClient.post('/admin/tours/uploads/cover', body, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setForm((current) => ({ ...current, coverImageUrl: response.data?.url || '' }))
      setFieldErrors((current) => ({ ...current, coverImageUrl: undefined }))
    } catch (error: any) {
      setErrorMessage(error?.response?.data?.message || 'Upload ảnh cover thất bại')
    } finally {
      setUploadingCover(false)
    }
  }

  const validateForm = () => {
    const nextErrors: FieldErrors = {}
    if (!form.name.trim()) nextErrors.name = 'Tên tour là bắt buộc.'
    if (!form.coverImageUrl.trim()) nextErrors.coverImageUrl = 'Ảnh cover là bắt buộc.'
    if (!form.poiIds.length) nextErrors.poiIds = 'Vui lòng chọn ít nhất 1 POI.'
    setFieldErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSave = async () => {
    if (!validateForm()) return

    setSaving(true)
    setErrorMessage('')
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        coverImageUrl: form.coverImageUrl.trim(),
        isPublished: form.isPublished,
        poiIds: form.poiIds,
      }

      if (form.id) {
        await apiClient.put(`/admin/tours/${form.id}`, payload)
      } else {
        await apiClient.post('/admin/tours', payload)
      }

      await loadData()
      closeModal()
    } catch (error: any) {
      setErrorMessage(error?.response?.data?.message || 'Lưu tour thất bại')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (tourId: number) => {
    if (!window.confirm('Xóa tour này?')) return
    await apiClient.delete(`/admin/tours/${tourId}`)
    await loadData()
  }

  const openTourMap = (tour: Tour) => {
    if (!tour.pois?.length) return
    setSelectedMapTour(tour)
  }

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-dark">
        <Sidebar />
        <main className="flex-1 p-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-white">Quản lý tour</h1>
                <p className="mt-2 text-gray-400">Tạo các hành trình có thứ tự điểm rõ ràng để user duyệt tour trên PWA.</p>
              </div>
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 font-semibold text-white transition hover:bg-blue-700"
              >
                <Plus size={18} />
                Tạo tour mới
              </button>
            </div>

            {errorMessage && !modalOpen ? (
              <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-red-200">{errorMessage}</div>
            ) : null}

            <div className="rounded-2xl border border-gray-700 bg-secondary p-5">
              <div className="mb-4">
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="w-full rounded-xl border border-gray-700 bg-dark px-4 py-3 text-white placeholder:text-gray-500"
                  placeholder="Tìm tour theo tên, mô tả, POI..."
                />
              </div>

              {loading ? (
                <p className="text-gray-400">Đang tải tour...</p>
              ) : filteredTours.length === 0 ? (
                <p className="text-gray-400">Chưa có tour nào.</p>
              ) : (
                <div className="space-y-5">
                  {filteredTours.map((tour) => (
                    <article key={tour.id} className="overflow-hidden rounded-[28px] border border-gray-700 bg-gradient-to-r from-[#121a2b] via-[#121a2b] to-[#172033] shadow-[0_20px_40px_rgba(0,0,0,0.18)]">
                      <div className="grid gap-0 xl:grid-cols-[320px_1fr]">
                        <div className="h-[240px] xl:h-full">
                          <img
                            src={mediaUrl(tour.cover_image_url) || '/assets/appiconfg.png'}
                            alt={tour.name}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="p-6">
                          {(() => {
                            const metrics = metricsByTour[tour.id]
                            return (
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                              <p className="text-3xl font-bold text-white">{tour.name}</p>
                              <p className="mt-2 max-w-3xl text-base leading-7 text-gray-400">{tour.description || 'Chưa có mô tả cho tour này.'}</p>
                              <div className="mt-4 flex flex-wrap gap-2 text-sm font-semibold text-[#C6D4F5]">
                                <span className="rounded-full bg-white/5 px-3 py-2">{tour.poi_count} điểm dừng</span>
                                <span className="rounded-full bg-white/5 px-3 py-2">
                                  {metrics?.distanceKm ? `${metrics.distanceKm.toFixed(1).replace('.', ',')} km` : 'Đang tính quãng đường'}
                                </span>
                                <span className="rounded-full bg-white/5 px-3 py-2">
                                  {metrics?.motorbikeMinutes ? `~${metrics.motorbikeMinutes} phút xe máy` : 'Đang tính thời gian'}
                                </span>
                              </div>
                            </div>
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${tour.is_published ? 'bg-emerald-500/15 text-emerald-300' : 'bg-red-500/15 text-red-300'}`}>
                              {tour.is_published ? 'Hiện' : 'Ẩn'}
                            </span>
                          </div>
                            )
                          })()}

                          <div className="mt-5">
                            <button
                              type="button"
                              onClick={() => setListTour(tour)}
                              className="inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-sm font-semibold text-sky-300 hover:bg-white/10"
                            >
                              Hiện tất cả {tour.poi_count} điểm
                            </button>
                          </div>

                          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
                            <div className="flex items-center gap-6 text-sm text-gray-400">
                              <span>{tour.poi_count} POI trong tour</span>
                              <span>Cập nhật: {new Date(tour.updated_at).toLocaleString('vi-VN')}</span>
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => openTourMap(tour)}
                                className="inline-flex items-center gap-2 rounded-lg bg-emerald-500/15 px-4 py-2 font-semibold text-emerald-300 hover:bg-emerald-500/25"
                              >
                                <Map size={16} />
                                Xem tour
                              </button>
                              <button
                                type="button"
                                onClick={() => openEditModal(tour)}
                                className="inline-flex items-center gap-2 rounded-lg bg-primary/15 px-4 py-2 font-semibold text-primary hover:bg-primary/25"
                              >
                                <Pencil size={16} />
                                Sửa
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleDelete(tour.id)}
                                className="inline-flex items-center gap-2 rounded-lg bg-red-500/15 px-4 py-2 font-semibold text-red-300 hover:bg-red-500/25"
                              >
                                <Trash2 size={16} />
                                Xóa
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-[28px] border border-gray-700 bg-secondary shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-gray-700 px-6 py-5">
              <div>
                <h2 className="text-2xl font-bold text-white">{form.id ? 'Chỉnh sửa tour' : 'Tạo tour mới'}</h2>
                <p className="mt-1 text-sm text-gray-400">Nhập tên, upload ảnh cover và chọn POI theo đúng thứ tự 1, 2, 3...</p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-full bg-dark p-2 text-gray-300 hover:text-white"
                aria-label="Đóng popup"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid max-h-[calc(92vh-88px)] gap-0 overflow-y-auto xl:grid-cols-[360px_1fr]">
              <aside className="border-r border-gray-700 p-6">
                <div className="space-y-4">
                  {errorMessage ? (
                    <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">{errorMessage}</div>
                  ) : null}

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-300">Tên tour *</label>
                    <input
                      value={form.name}
                      onChange={(event) => {
                        setForm((current) => ({ ...current, name: event.target.value }))
                        setFieldErrors((current) => ({ ...current, name: undefined }))
                      }}
                      className={`w-full rounded-xl border bg-dark px-4 py-3 text-white placeholder:text-gray-500 ${fieldErrors.name ? 'border-red-500' : 'border-gray-700'}`}
                      placeholder="Ví dụ: Tour phố cổ trong ngày"
                    />
                    {fieldErrors.name ? <p className="mt-2 text-sm text-red-300">{fieldErrors.name}</p> : null}
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-300">Mô tả tour</label>
                    <textarea
                      value={form.description}
                      onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                      className="min-h-[120px] w-full rounded-xl border border-gray-700 bg-dark px-4 py-3 text-white placeholder:text-gray-500"
                      placeholder="Mô tả ngắn để user biết tour này phù hợp với ai."
                    />
                  </div>

                  <div className="rounded-2xl border border-gray-700 bg-dark/50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-gray-300">Ảnh cover *</p>
                        <p className="text-xs text-gray-500">Upload ảnh từ thiết bị giống flow tạo POI.</p>
                      </div>
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-primary px-4 py-2 font-semibold text-white hover:bg-blue-700">
                        <Upload size={16} />
                        {uploadingCover ? 'Đang upload...' : 'Upload ảnh'}
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="hidden"
                          onChange={(event) => void uploadCover(event.target.files?.[0])}
                          disabled={uploadingCover}
                        />
                      </label>
                    </div>

                    {form.coverImageUrl ? (
                      <div className="mt-4 overflow-hidden rounded-2xl border border-gray-700">
                        <div className="relative">
                          <img src={mediaUrl(form.coverImageUrl)} alt="Tour cover" className="h-[210px] w-full object-cover" />
                          <button
                            type="button"
                            onClick={() => {
                              setForm((current) => ({ ...current, coverImageUrl: '' }))
                              setFieldErrors((current) => ({ ...current, coverImageUrl: undefined }))
                            }}
                            className="absolute right-3 top-3 rounded-full bg-black/70 p-2 text-white transition hover:bg-black/85"
                            aria-label="Xóa ảnh cover"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    ) : null}

                    {fieldErrors.coverImageUrl ? <p className="mt-3 text-sm text-red-300">{fieldErrors.coverImageUrl}</p> : null}
                  </div>

                  <button
                    type="button"
                    onClick={() => setForm((current) => ({ ...current, isPublished: !current.isPublished }))}
                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-gray-700 bg-dark px-4 py-3 text-white transition hover:border-gray-500"
                  >
                    <span className="inline-flex min-w-0 items-center gap-3">
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${form.isPublished ? 'bg-emerald-500/15 text-emerald-300' : 'bg-red-500/15 text-red-300'}`}>
                        {form.isPublished ? <Eye size={17} /> : <EyeOff size={17} />}
                      </span>
                      <span className="font-medium text-left whitespace-nowrap">Tình trạng hiển thị</span>
                    </span>
                    <span
                      className={`shrink-0 whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-semibold ${
                        form.isPublished ? 'bg-emerald-500/15 text-emerald-300' : 'bg-red-500/15 text-red-300'
                      }`}
                    >
                      {form.isPublished ? 'Hiện' : 'Ẩn'}
                    </span>
                  </button>

                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-300">Thứ tự POI đã chọn *</p>
                      <span className="text-xs text-gray-500">{form.poiIds.length} điểm</span>
                    </div>
                    <div className="max-h-[260px] space-y-2 overflow-y-auto rounded-2xl border border-gray-700 bg-dark/50 p-3">
                      {selectedPoiDetails.length === 0 ? (
                        <p className="text-sm text-gray-500">Chưa chọn điểm nào cho tour.</p>
                      ) : (
                        selectedPoiDetails.map((poi, index) => {
                          const previousPoi = index > 0 ? selectedPoiDetails[index - 1] : null
                          const distanceFromPrevious = calculateDistanceKm(
                            previousPoi ? { latitude: previousPoi.latitude, longitude: previousPoi.longitude } : undefined,
                            { latitude: poi.latitude, longitude: poi.longitude }
                          )
                          return (
                            <div key={poi.id} className="flex items-center gap-3 rounded-xl border border-gray-700 bg-secondary px-3 py-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                                {index + 1}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-semibold text-white">{poi.name}</p>
                                <p className="mt-1 truncate text-xs text-gray-400">{poi.address || poi.category || 'POI trong tour'}</p>
                                {distanceFromPrevious != null ? (
                                  <p className="mt-1 text-[11px] font-semibold text-sky-300">
                                    Cách điểm {index}: {distanceFromPrevious.toFixed(2)} km
                                  </p>
                                ) : index === 0 ? (
                                  <p className="mt-1 text-[11px] font-semibold text-sky-300">Điểm bắt đầu của tour</p>
                                ) : null}
                              </div>
                              <button
                                type="button"
                                onClick={() => removeSelectedPoi(poi.id)}
                                className="rounded-full bg-red-500/15 p-2 text-red-300 hover:bg-red-500/25"
                                aria-label="Bỏ khỏi tour"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          )})
                      )}
                    </div>
                    {fieldErrors.poiIds ? <p className="mt-2 text-sm text-red-300">{fieldErrors.poiIds}</p> : null}
                  </div>

                  <div className="flex flex-wrap justify-end gap-3">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="rounded-xl bg-dark px-4 py-3 font-semibold text-gray-300 hover:text-white"
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleSave()}
                      disabled={saving || uploadingCover}
                      className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Save size={18} />
                      {saving ? 'Đang lưu...' : form.id ? 'Cập nhật tour' : 'Tạo tour'}
                    </button>
                  </div>
                </div>
              </aside>

              <section className="p-6">
                <div className="mb-4">
                  <input
                    value={poiQuery}
                    onChange={(event) => setPoiQuery(event.target.value)}
                    className="w-full rounded-xl border border-gray-700 bg-dark px-4 py-3 text-white placeholder:text-gray-500"
                    placeholder="Tìm POI theo tên, địa chỉ, danh mục..."
                  />
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  {filteredPois.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-gray-700 bg-dark px-5 py-8 text-sm text-gray-400 lg:col-span-2">
                      Chưa có POI hoạt động để chọn hoặc không có POI khớp với từ khóa tìm kiếm.
                    </div>
                  ) : filteredPois.map((poi) => {
                    const selectedIndex = form.poiIds.indexOf(poi.id)
                    const isSelected = selectedIndex >= 0
                    const previousSelectedPoi = selectedIndex > 0
                      ? poiOptions.find((item) => item.id === form.poiIds[selectedIndex - 1])
                      : null
                    const lastChosenPoi = form.poiIds.length
                      ? poiOptions.find((item) => item.id === form.poiIds[form.poiIds.length - 1])
                      : null
                    const referencePoi = isSelected ? previousSelectedPoi : lastChosenPoi
                    const distanceFromReference = referencePoi
                      ? calculateDistanceKm(
                          { latitude: referencePoi.latitude, longitude: referencePoi.longitude },
                          { latitude: poi.latitude, longitude: poi.longitude }
                        )
                      : null
                    return (
                      <button
                        key={poi.id}
                        type="button"
                        onClick={() => togglePoi(poi.id)}
                        className={`overflow-hidden rounded-2xl border text-left transition ${
                          isSelected
                            ? 'border-primary bg-primary/10 shadow-lg shadow-primary/10'
                            : 'border-gray-700 bg-dark hover:border-gray-500'
                        }`}
                      >
                        <div className="flex h-full min-h-[420px] flex-col">
                          <div className="relative h-[160px] overflow-hidden bg-slate-900">
                            <img
                              src={mediaUrl(poi.images[0]) || '/assets/appiconfg.png'}
                              alt={poi.name}
                              className="absolute inset-0 h-full w-full object-cover object-center"
                            />
                            <div className={`absolute left-3 top-3 flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${isSelected ? 'bg-primary text-white' : 'bg-black/65 text-white'}`}>
                              {isSelected ? selectedIndex + 1 : '+'}
                            </div>
                          </div>

                          <div className="flex min-w-0 flex-1 flex-col p-5">
                            <div className="min-w-0">
                              <p className="line-clamp-2 text-[22px] font-semibold leading-tight text-white">{poi.name}</p>
                              <p className="mt-2 text-xs uppercase tracking-[0.2em] text-gray-500">{poi.category || 'POI'}</p>
                            </div>

                            <p className="mt-4 line-clamp-3 text-sm leading-6 text-gray-400">{poi.address || 'Chưa có địa chỉ chi tiết'}</p>

                            <div className="mt-auto flex flex-wrap items-center gap-2 pt-5 text-xs text-gray-400">
                              <span className="rounded-full bg-secondary px-3 py-1">{poi.listenedCount} lượt nghe</span>
                              <span className="rounded-full bg-secondary px-3 py-1">★ {poi.ratingAvg.toFixed(1)}</span>
                              {distanceFromReference != null ? (
                                <span className="rounded-full bg-sky-500/15 px-3 py-1 text-sky-300">
                                  {isSelected ? `Cách điểm ${selectedIndex}: ` : form.poiIds.length ? `Cách điểm ${form.poiIds.length}: ` : 'Khoảng cách: '}
                                  {distanceFromReference.toFixed(2)} km
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </section>
            </div>
          </div>
        </div>
      ) : null}

      {selectedMapTour ? (
        <AdminTourMapModal tour={selectedMapTour} onClose={() => setSelectedMapTour(null)} />
      ) : null}

      {listTour ? (
        <AdminTourPoisModal tour={listTour} onClose={() => setListTour(null)} />
      ) : null}
    </ProtectedRoute>
  )
}

function AdminTourMapModal({ tour, onClose }: { tour: Tour; onClose: () => void }) {
  const mapRef = useRef<HTMLDivElement | null>(null)
  const leafletMapRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const routeLineRef = useRef<any>(null)
  const [leafletReady, setLeafletReady] = useState(false)
  const [showRoute, setShowRoute] = useState(true)
  const [routeError, setRouteError] = useState('')

  useEffect(() => {
    let cancelled = false
    const styleId = 'smartguide-admin-leaflet-style'
    const scriptId = 'smartguide-admin-leaflet-script'

    if (!document.getElementById(styleId)) {
      const link = document.createElement('link')
      link.id = styleId
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)
    }

    const ready = () => {
      if (!cancelled && typeof window !== 'undefined' && (window as any).L?.map) {
        setLeafletReady(true)
      }
    }

    let script = document.getElementById(scriptId) as HTMLScriptElement | null
    if (!script) {
      script = document.createElement('script')
      script.id = scriptId
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
      script.async = true
      script.crossOrigin = ''
      document.body.appendChild(script)
    }

    script.addEventListener('load', ready)
    ready()

    return () => {
      cancelled = true
      script?.removeEventListener('load', ready)
    }
  }, [])

  useEffect(() => {
    if (!leafletReady || !mapRef.current || leafletMapRef.current || !tour.pois.length) return
    const L = (window as any).L
    const firstPoi = tour.pois[0]
    const map = L.map(mapRef.current, {
      zoomControl: true,
      attributionControl: true,
    }).setView([firstPoi.latitude || 0, firstPoi.longitude || 0], 14)

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map)

    leafletMapRef.current = map
    setTimeout(() => map.invalidateSize(), 60)

    return () => {
      routeLineRef.current?.remove?.()
      routeLineRef.current = null
      map.remove()
      leafletMapRef.current = null
    }
  }, [leafletReady, tour])

  useEffect(() => {
    if (!leafletReady || !leafletMapRef.current) return
    const L = (window as any).L
    markersRef.current.forEach((marker) => marker.remove())
    markersRef.current = []
    routeLineRef.current?.remove?.()
    routeLineRef.current = null
    setRouteError('')

    const bounds: any[] = []
    const routePoints = tour.pois
      .filter((poi) => poi.latitude && poi.longitude)
      .map((poi) => ({ latitude: poi.latitude, longitude: poi.longitude }))

    tour.pois.forEach((poi, index) => {
      if (!poi.latitude || !poi.longitude) return
      const icon = L.divIcon({
        className: '',
        html: `<div style="width:32px;height:32px;border-radius:999px;background:#0F5BD7;color:white;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;border:3px solid white;box-shadow:0 10px 24px rgba(15,91,215,0.28);">${index + 1}</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      })
      const marker = L.marker([poi.latitude, poi.longitude], { icon }).addTo(leafletMapRef.current)
      marker.bindPopup(`<strong>${index + 1}. ${poi.poi_name}</strong><br/>${poi.poi_address || poi.poi_category || 'POI trong tour'}`)
      markersRef.current.push(marker)
      bounds.push([poi.latitude, poi.longitude])
    })

    if (bounds.length) {
      leafletMapRef.current.fitBounds(bounds, { padding: [36, 36] })
    }

    if (!showRoute || routePoints.length < 2) return

    let cancelled = false

    void fetchRoadRoute(routePoints)
      .then((roadCoordinates) => {
        if (cancelled || !roadCoordinates.length || !leafletMapRef.current) return

        routeLineRef.current = L.polyline(
          roadCoordinates.map((point: { latitude: number; longitude: number }) => [point.latitude, point.longitude]),
          {
            color: '#22C55E',
            weight: 5,
            opacity: 0.88,
            lineJoin: 'round',
            smoothFactor: 1.5,
          }
        ).addTo(leafletMapRef.current)
      })
      .catch(() => {
        if (!cancelled) {
          if (!leafletMapRef.current) return
          routeLineRef.current = L.polyline(
            routePoints.map((point) => [point.latitude, point.longitude]),
            {
              color: '#60A5FA',
              weight: 4,
              opacity: 0.65,
              dashArray: '10 10',
            }
          ).addTo(leafletMapRef.current)
          setRouteError('Đường bộ đang tạm chậm, hiện đường nối tạm để bạn vẫn xem được hành trình.')
        }
      })

    return () => {
      cancelled = true
    }
  }, [leafletReady, showRoute, tour])

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-4">
      <div className="w-full max-w-6xl overflow-hidden rounded-[28px] border border-gray-700 bg-secondary shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-gray-700 px-6 py-5">
          <div>
            <h3 className="text-2xl font-bold text-white">{tour.name}</h3>
            <p className="mt-1 text-sm text-gray-400">Leaflet + OpenStreetMap, chỉ hiển thị các điểm thuộc tour theo thứ tự admin đã tạo.</p>
            {routeError ? <p className="mt-2 text-sm text-amber-300">{routeError}</p> : null}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowRoute((current) => !current)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${showRoute ? 'bg-emerald-500 text-white' : 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25'}`}
            >
              {showRoute ? 'Ẩn đường đi' : 'Hiện đường đi'}
            </button>
            <button type="button" onClick={onClose} className="rounded-full bg-dark p-2 text-gray-300 hover:text-white" aria-label="Đóng popup map">
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="grid gap-0 xl:grid-cols-[1fr_360px]">
          <div className="h-[68vh] min-h-[420px] bg-slate-200">
            <div ref={mapRef} className="h-full w-full" />
          </div>
          <div className="max-h-[68vh] overflow-y-auto border-l border-gray-700 bg-[#121a2b] p-5">
            <div className="space-y-3">
              {tour.pois.map((poi, index) => (
                <div key={poi.poi_id} className="rounded-2xl border border-gray-700 bg-white/5 px-4 py-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                      {index + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-white">{poi.poi_name}</p>
                      <p className="mt-1 text-sm text-gray-400">{poi.poi_address || poi.poi_category || 'POI trong tour'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function AdminTourPoisModal({ tour, onClose }: { tour: Tour; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-[28px] border border-gray-700 bg-secondary shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-gray-700 px-6 py-5">
          <div>
            <h3 className="text-2xl font-bold text-white">{tour.name}</h3>
            <p className="mt-1 text-sm text-gray-400">{tour.poi_count} điểm theo đúng thứ tự tour.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full bg-dark p-2 text-gray-300 hover:text-white" aria-label="Đóng popup danh sách điểm">
            <X size={18} />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-5">
          <div className="space-y-3">
            {tour.pois.map((poi, index) => (
              <div key={poi.poi_id} className="rounded-2xl border border-gray-700 bg-white/5 px-4 py-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                    {index + 1}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-white">{poi.poi_name}</p>
                    <p className="mt-1 text-sm text-gray-400">{poi.poi_address || poi.poi_category || 'POI trong tour'}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
