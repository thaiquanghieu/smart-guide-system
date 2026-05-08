import { useEffect, useMemo, useState } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import Sidebar from '@/components/Sidebar'
import apiClient from '@/lib/api'
import { ArrowDown, ArrowUp, Eye, EyeOff, Plus, Save, Trash2 } from 'lucide-react'

type PoiOption = {
  id: string
  name: string
  status: string
  address?: string
}

type TourPoi = {
  poi_id: string
  sort_order: number
  poi_name: string
  poi_status: string
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

const emptyForm: FormState = {
  id: null,
  name: '',
  description: '',
  coverImageUrl: '',
  isPublished: false,
  poiIds: [],
}

export default function ToursPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [tours, setTours] = useState<Tour[]>([])
  const [poiOptions, setPoiOptions] = useState<PoiOption[]>([])
  const [selectedTourId, setSelectedTourId] = useState<number | null>(null)
  const [query, setQuery] = useState('')
  const [form, setForm] = useState<FormState>(emptyForm)

  useEffect(() => {
    void loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
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
        }))
        .sort((left, right) => left.name.localeCompare(right.name))

      setTours(nextTours)
      setPoiOptions(nextPoiOptions)

      if (selectedTourId) {
        const matched = nextTours.find((tour) => tour.id === selectedTourId)
        if (matched) {
          selectTour(matched)
        } else {
          setSelectedTourId(null)
          setForm(emptyForm)
        }
      }
    } finally {
      setLoading(false)
    }
  }

  const selectTour = (tour: Tour) => {
    setSelectedTourId(tour.id)
    setForm({
      id: tour.id,
      name: tour.name || '',
      description: tour.description || '',
      coverImageUrl: tour.cover_image_url || '',
      isPublished: !!tour.is_published,
      poiIds: Array.isArray(tour.poi_ids) ? tour.poi_ids : [],
    })
  }

  const selectedPoiDetails = useMemo(() => {
    return form.poiIds.map((poiId) => poiOptions.find((poi) => poi.id === poiId)).filter(Boolean) as PoiOption[]
  }, [form.poiIds, poiOptions])

  const filteredTours = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    if (!keyword) return tours
    return tours.filter((tour) => [tour.name, tour.description].join(' ').toLowerCase().includes(keyword))
  }, [query, tours])

  const togglePoi = (poiId: string) => {
    setForm((current) => ({
      ...current,
      poiIds: current.poiIds.includes(poiId)
        ? current.poiIds.filter((id) => id !== poiId)
        : [...current.poiIds, poiId],
    }))
  }

  const movePoi = (index: number, direction: -1 | 1) => {
    setForm((current) => {
      const nextIndex = index + direction
      if (nextIndex < 0 || nextIndex >= current.poiIds.length) return current
      const nextPoiIds = [...current.poiIds]
      const [item] = nextPoiIds.splice(index, 1)
      nextPoiIds.splice(nextIndex, 0, item)
      return { ...current, poiIds: nextPoiIds }
    })
  }

  const resetForm = () => {
    setSelectedTourId(null)
    setForm(emptyForm)
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      window.alert('Vui lòng nhập tên tour')
      return
    }
    if (!form.poiIds.length) {
      window.alert('Vui lòng chọn ít nhất 1 POI')
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: form.name,
        description: form.description,
        coverImageUrl: form.coverImageUrl,
        isPublished: form.isPublished,
        poiIds: form.poiIds,
      }

      if (form.id) {
        await apiClient.put(`/admin/tours/${form.id}`, payload)
      } else {
        await apiClient.post('/admin/tours', payload)
      }

      await loadData()
      if (!form.id) {
        resetForm()
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (tourId: number) => {
    if (!window.confirm('Xóa tour này?')) return
    await apiClient.delete(`/admin/tours/${tourId}`)
    if (selectedTourId === tourId) {
      resetForm()
    }
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
                <p className="mt-2 text-gray-400">Admin có thể tạo tour, thêm POI theo thứ tự và quyết định tour nào được hiển thị cho user.</p>
              </div>
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 font-semibold text-white transition hover:bg-blue-700"
              >
                <Plus size={18} />
                Tạo tour mới
              </button>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.05fr_1.4fr]">
              <section className="rounded-2xl border border-gray-700 bg-secondary p-5">
                <div className="mb-4">
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    className="w-full rounded-xl border border-gray-700 bg-dark px-4 py-3 text-white placeholder:text-gray-500"
                    placeholder="Tìm tour..."
                  />
                </div>

                {loading ? (
                  <p className="text-gray-400">Đang tải tour...</p>
                ) : filteredTours.length === 0 ? (
                  <p className="text-gray-400">Chưa có tour nào.</p>
                ) : (
                  <div className="space-y-3">
                    {filteredTours.map((tour) => (
                      <button
                        key={tour.id}
                        type="button"
                        onClick={() => selectTour(tour)}
                        className={`w-full rounded-2xl border p-4 text-left transition ${
                          selectedTourId === tour.id
                            ? 'border-primary bg-primary/10'
                            : 'border-gray-700 bg-dark hover:border-gray-500'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-lg font-semibold text-white">{tour.name}</p>
                            <p className="mt-1 text-sm text-gray-400 line-clamp-2">{tour.description || 'Chưa có mô tả'}</p>
                            <p className="mt-3 text-xs uppercase tracking-[0.25em] text-gray-500">
                              {tour.poi_count} POI
                            </p>
                          </div>
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${tour.is_published ? 'bg-emerald-500/15 text-emerald-300' : 'bg-yellow-500/15 text-yellow-300'}`}>
                            {tour.is_published ? 'Published' : 'Draft'}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </section>

              <section className="rounded-2xl border border-gray-700 bg-secondary p-6">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-bold text-white">{form.id ? 'Chỉnh sửa tour' : 'Tạo tour mới'}</h2>
                    <p className="mt-1 text-sm text-gray-400">Thêm thông tin cơ bản rồi chọn thứ tự POI sẽ xuất hiện trong tour.</p>
                  </div>
                  {form.id ? (
                    <button
                      type="button"
                      onClick={() => void handleDelete(form.id as number)}
                      className="inline-flex items-center gap-2 rounded-lg bg-red-500/15 px-4 py-2 font-semibold text-red-300 hover:bg-red-500/25"
                    >
                      <Trash2 size={16} />
                      Xóa tour
                    </button>
                  ) : null}
                </div>

                <div className="grid gap-4">
                  <input
                    value={form.name}
                    onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                    className="rounded-xl border border-gray-700 bg-dark px-4 py-3 text-white placeholder:text-gray-500"
                    placeholder="Tên tour"
                  />
                  <textarea
                    value={form.description}
                    onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                    className="min-h-[110px] rounded-xl border border-gray-700 bg-dark px-4 py-3 text-white placeholder:text-gray-500"
                    placeholder="Mô tả tour"
                  />
                  <input
                    value={form.coverImageUrl}
                    onChange={(event) => setForm((current) => ({ ...current, coverImageUrl: event.target.value }))}
                    className="rounded-xl border border-gray-700 bg-dark px-4 py-3 text-white placeholder:text-gray-500"
                    placeholder="Ảnh bìa URL"
                  />

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
                </div>

                <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_1fr]">
                  <div>
                    <h3 className="mb-3 text-lg font-semibold text-white">POI có thể thêm</h3>
                    <div className="max-h-[420px] space-y-2 overflow-y-auto rounded-2xl border border-gray-700 bg-dark p-3">
                      {poiOptions.map((poi) => {
                        const checked = form.poiIds.includes(poi.id)
                        return (
                          <label
                            key={poi.id}
                            className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 transition ${
                              checked ? 'border-primary bg-primary/10' : 'border-gray-700 hover:border-gray-500'
                            }`}
                          >
                            <input type="checkbox" checked={checked} onChange={() => togglePoi(poi.id)} className="mt-1" />
                            <div className="min-w-0">
                              <p className="font-semibold text-white">{poi.name}</p>
                              <p className="mt-1 text-sm text-gray-400">{poi.address || poi.id}</p>
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-3 text-lg font-semibold text-white">Thứ tự POI trong tour</h3>
                    <div className="max-h-[420px] space-y-2 overflow-y-auto rounded-2xl border border-gray-700 bg-dark p-3">
                      {selectedPoiDetails.length === 0 ? (
                        <p className="text-sm text-gray-400">Chưa chọn POI nào.</p>
                      ) : (
                        selectedPoiDetails.map((poi, index) => (
                          <div key={poi.id} className="flex items-center gap-3 rounded-xl border border-gray-700 px-3 py-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 font-bold text-primary">
                              {index + 1}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-white">{poi.name}</p>
                              <p className="mt-1 text-sm text-gray-400">{poi.address || poi.id}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button type="button" onClick={() => movePoi(index, -1)} className="rounded-lg bg-secondary px-2 py-2 text-gray-200 hover:text-white">
                                <ArrowUp size={16} />
                              </button>
                              <button type="button" onClick={() => movePoi(index, 1)} className="rounded-lg bg-secondary px-2 py-2 text-gray-200 hover:text-white">
                                <ArrowDown size={16} />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex flex-wrap items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="rounded-xl bg-dark px-4 py-3 font-semibold text-gray-300 hover:text-white"
                  >
                    Làm mới
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSave()}
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Save size={18} />
                    {saving ? 'Đang lưu...' : form.id ? 'Cập nhật tour' : 'Tạo tour'}
                  </button>
                </div>
              </section>
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}
