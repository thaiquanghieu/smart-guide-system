import { useEffect, useMemo, useState } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import Sidebar from '@/components/Sidebar'
import apiClient from '@/lib/api'
import { Eye, EyeOff, Pencil, Plus, Save, Trash2, Upload, X } from 'lucide-react'

type PoiOption = {
  id: string
  name: string
  status: string
  address?: string
  category?: string
  shortDescription?: string
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

  useEffect(() => {
    void loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    setErrorMessage('')
    try {
      const [tourResponse, poiResponse] = await Promise.all([
        apiClient.get('/admin/tours'),
        apiClient.get('/admin/pois'),
      ])

      const nextTours = (tourResponse.data || []) as Tour[]
      const nextPoiOptions = ((poiResponse.data || []) as any[])
        .filter((poi) => poi.status === 'approved')
        .map((poi) => ({
          id: String(poi.id || ''),
          name: poi.name || 'Chưa có tên',
          status: poi.status || 'approved',
          address: poi.address || '',
          category: poi.category || '',
          shortDescription: poi.shortDescription || poi.short_description || '',
          listenedCount: Number(poi.listened_count ?? poi.listenedCount ?? 0),
          ratingAvg: Number(poi.rating_avg ?? poi.ratingAvg ?? 0),
          images: Array.isArray(poi.images) ? poi.images.filter(Boolean) : [],
        }))
        .sort((left, right) => left.name.localeCompare(right.name))

      setTours(nextTours)
      setPoiOptions(nextPoiOptions)
    } catch (error: any) {
      setErrorMessage(error?.response?.data?.message || 'Không tải được danh sách tour')
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
                <div className="grid gap-4 xl:grid-cols-2">
                  {filteredTours.map((tour) => (
                    <article key={tour.id} className="overflow-hidden rounded-2xl border border-gray-700 bg-dark">
                      <div className="grid gap-0 md:grid-cols-[220px_1fr]">
                        <div className="h-[180px] md:h-full">
                          <img
                            src={mediaUrl(tour.cover_image_url) || '/assets/appiconfg.png'}
                            alt={tour.name}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="p-5">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-xl font-semibold text-white">{tour.name}</p>
                              <p className="mt-1 text-sm text-gray-400 line-clamp-2">{tour.description || 'Chưa có mô tả'}</p>
                            </div>
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${tour.is_published ? 'bg-emerald-500/15 text-emerald-300' : 'bg-yellow-500/15 text-yellow-300'}`}>
                              {tour.is_published ? 'Published' : 'Draft'}
                            </span>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2">
                            {tour.pois.slice(0, 4).map((poi, index) => (
                              <div key={poi.poi_id} className="rounded-full bg-secondary px-3 py-1 text-xs text-gray-300">
                                {index + 1}. {poi.poi_name}
                              </div>
                            ))}
                          </div>

                          <div className="mt-5 flex items-center justify-between gap-3">
                            <p className="text-sm text-gray-500">{tour.poi_count} POI trong tour</p>
                            <div className="flex gap-2">
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
                        <img src={mediaUrl(form.coverImageUrl)} alt="Tour cover" className="h-[210px] w-full object-cover" />
                      </div>
                    ) : null}

                    {fieldErrors.coverImageUrl ? <p className="mt-3 text-sm text-red-300">{fieldErrors.coverImageUrl}</p> : null}
                  </div>

                  <label className="flex items-center gap-3 rounded-xl border border-gray-700 bg-dark px-4 py-3 text-white">
                    <input
                      type="checkbox"
                      checked={form.isPublished}
                      onChange={(event) => setForm((current) => ({ ...current, isPublished: event.target.checked }))}
                    />
                    <span className="inline-flex items-center gap-2">
                      {form.isPublished ? <Eye size={16} /> : <EyeOff size={16} />}
                      Hiển thị tour cho user
                    </span>
                  </label>

                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-300">Thứ tự POI đã chọn *</p>
                      <span className="text-xs text-gray-500">{form.poiIds.length} điểm</span>
                    </div>
                    <div className="max-h-[260px] space-y-2 overflow-y-auto rounded-2xl border border-gray-700 bg-dark/50 p-3">
                      {selectedPoiDetails.length === 0 ? (
                        <p className="text-sm text-gray-500">Chưa chọn điểm nào cho tour.</p>
                      ) : (
                        selectedPoiDetails.map((poi, index) => (
                          <div key={poi.id} className="flex items-center gap-3 rounded-xl border border-gray-700 bg-secondary px-3 py-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                              {index + 1}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-semibold text-white">{poi.name}</p>
                              <p className="mt-1 truncate text-xs text-gray-400">{poi.address || poi.category || poi.id}</p>
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
                        ))
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
                  {filteredPois.map((poi) => {
                    const selectedIndex = form.poiIds.indexOf(poi.id)
                    const isSelected = selectedIndex >= 0
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
                        <div className="grid gap-0 sm:grid-cols-[150px_1fr]">
                          <div className="relative h-[150px]">
                            <img
                              src={mediaUrl(poi.images[0]) || '/assets/appiconfg.png'}
                              alt={poi.name}
                              className="h-full w-full object-cover"
                            />
                            <div className={`absolute left-3 top-3 flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${isSelected ? 'bg-primary text-white' : 'bg-black/65 text-white'}`}>
                              {isSelected ? selectedIndex + 1 : '+'}
                            </div>
                          </div>

                          <div className="p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-lg font-semibold text-white">{poi.name}</p>
                                <p className="mt-1 text-xs uppercase tracking-[0.2em] text-gray-500">{poi.category || 'POI'}</p>
                              </div>
                              <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">
                                Active
                              </span>
                            </div>

                            <p className="mt-3 line-clamp-2 text-sm text-gray-400">{poi.shortDescription || 'Chưa có mô tả ngắn'}</p>
                            <p className="mt-3 text-sm text-gray-500">{poi.address || poi.id}</p>

                            <div className="mt-4 flex flex-wrap gap-2 text-xs text-gray-400">
                              <span className="rounded-full bg-secondary px-3 py-1">{poi.listenedCount} lượt nghe</span>
                              <span className="rounded-full bg-secondary px-3 py-1">★ {poi.ratingAvg.toFixed(1)}</span>
                              <span className="rounded-full bg-secondary px-3 py-1">ID: {poi.id}</span>
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
    </ProtectedRoute>
  )
}
