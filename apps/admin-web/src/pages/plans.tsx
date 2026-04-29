import { useEffect, useMemo, useState } from 'react'
import Sidebar from '@/components/Sidebar'
import ProtectedRoute from '@/components/ProtectedRoute'
import apiClient from '@/lib/api'
import { Edit2, Package, Plus, Search, Trash2 } from 'lucide-react'

type Plan = {
  id: number
  name: string
  days: number
  price: number
}

const emptyDraft = { id: 0, name: '', days: 30, price: 0 }

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState(emptyDraft)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    void fetchPlans()
  }, [])

  const fetchPlans = async () => {
    setLoading(true)
    try {
      const adminId = localStorage.getItem('adminId')
      const response = await apiClient.get('/Plans/admin', { params: { adminId } })
      setPlans(response.data || [])
    } finally {
      setLoading(false)
    }
  }

  const visiblePlans = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    return plans.filter((plan) => `${plan.name} ${plan.days} ${plan.price}`.toLowerCase().includes(keyword))
  }, [plans, query])

  const openCreate = () => {
    setDraft(emptyDraft)
    setShowModal(true)
  }

  const openEdit = (plan: Plan) => {
    setDraft(plan)
    setShowModal(true)
  }

  const savePlan = async () => {
    if (!draft.name.trim() || draft.days <= 0 || draft.price < 0) {
      alert('Thông tin gói chưa hợp lệ')
      return
    }

    setSaving(true)
    try {
      const adminId = localStorage.getItem('adminId')
      if (draft.id) {
        await apiClient.put(`/Plans/${draft.id}`, {
          name: draft.name.trim(),
          days: Number(draft.days),
          price: Number(draft.price),
        }, { params: { adminId } })
      } else {
        await apiClient.post('/Plans', {
          name: draft.name.trim(),
          days: Number(draft.days),
          price: Number(draft.price),
        }, { params: { adminId } })
      }
      setShowModal(false)
      await fetchPlans()
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Lưu gói thất bại')
    } finally {
      setSaving(false)
    }
  }

  const deletePlan = async (planId: number) => {
    if (!confirm('Xóa gói này?')) return
    try {
      const adminId = localStorage.getItem('adminId')
      await apiClient.delete(`/Plans/${planId}`, { params: { adminId } })
      await fetchPlans()
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Xóa gói thất bại')
    }
  }

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-dark">
        <Sidebar />
        <main className="flex-1 p-8">
          <div className="mx-auto max-w-6xl space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-4xl font-bold text-white">Quản lý gói</h1>
                <p className="mt-2 text-gray-400">Thêm, sửa hoặc xóa các gói đang dùng cho web app.</p>
              </div>
              <button
                onClick={openCreate}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 font-semibold text-white hover:bg-blue-700"
              >
                <Plus size={18} />
                Thêm gói
              </button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-3 text-gray-500" size={18} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="w-full rounded-xl border border-gray-700 bg-secondary py-3 pl-10 pr-4 text-white placeholder:text-gray-500"
                placeholder="Tìm theo tên gói, số ngày hoặc giá..."
              />
            </div>

            {loading ? (
              <div className="rounded-2xl border border-gray-700 bg-secondary py-14 text-center text-gray-400">Đang tải...</div>
            ) : visiblePlans.length ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {visiblePlans.map((plan) => (
                  <div key={plan.id} className="rounded-2xl border border-gray-700 bg-secondary p-6">
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-2xl font-bold text-white">{plan.name}</h2>
                        <p className="mt-1 text-sm text-gray-400">#{plan.id}</p>
                      </div>
                      <Package className="text-primary" size={24} />
                    </div>
                    <div className="space-y-2 rounded-xl border border-gray-700 bg-dark/40 p-4">
                      <p className="text-sm text-gray-400">Thời hạn</p>
                      <p className="text-xl font-semibold text-white">{plan.days} ngày</p>
                      <p className="pt-2 text-sm text-gray-400">Giá</p>
                      <p className="text-2xl font-bold text-yellow-300">{plan.price.toLocaleString('vi-VN')}đ</p>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => openEdit(plan)}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary/15 px-4 py-3 font-semibold text-primary hover:bg-primary/25"
                      >
                        <Edit2 size={16} />
                        Sửa
                      </button>
                      <button
                        onClick={() => void deletePlan(plan.id)}
                        className="inline-flex items-center justify-center rounded-xl bg-red-500/15 px-4 py-3 text-red-300 hover:bg-red-500/25"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-700 bg-secondary py-14 text-center text-gray-400">
                Chưa có gói nào
              </div>
            )}
          </div>
        </main>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setShowModal(false)}>
          <div className="w-full max-w-lg rounded-2xl border border-gray-700 bg-secondary p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <h2 className="text-2xl font-bold text-white">{draft.id ? 'Cập nhật gói' : 'Thêm gói mới'}</h2>
            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-300">Tên gói</span>
                <input
                  value={draft.name}
                  onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
                  className="w-full rounded-xl border border-gray-600 bg-dark px-4 py-3 text-white focus:border-primary focus:outline-none"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-300">Số ngày</span>
                <input
                  type="number"
                  min={1}
                  value={draft.days}
                  onChange={(event) => setDraft((prev) => ({ ...prev, days: Number(event.target.value) }))}
                  className="w-full rounded-xl border border-gray-600 bg-dark px-4 py-3 text-white focus:border-primary focus:outline-none"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-300">Giá</span>
                <input
                  type="number"
                  min={0}
                  value={draft.price}
                  onChange={(event) => setDraft((prev) => ({ ...prev, price: Number(event.target.value) }))}
                  className="w-full rounded-xl border border-gray-600 bg-dark px-4 py-3 text-white focus:border-primary focus:outline-none"
                />
              </label>
            </div>
            <div className="mt-6 flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 rounded-xl bg-dark px-4 py-3 font-semibold text-white">
                Hủy
              </button>
              <button
                onClick={() => void savePlan()}
                disabled={saving}
                className="flex-1 rounded-xl bg-primary px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {saving ? 'Đang lưu...' : draft.id ? 'Lưu thay đổi' : 'Tạo gói'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ProtectedRoute>
  )
}
