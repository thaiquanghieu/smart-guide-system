import { useEffect, useMemo, useState } from 'react'
import Sidebar from '@/components/Sidebar'
import ProtectedRoute from '@/components/ProtectedRoute'
import apiClient from '@/lib/api'
import { Search } from 'lucide-react'

type Payment = {
  id: number
  code: string
  amount: number
  status: string
  status_label: string
  payment_type: string
  poi_name?: string
  description: string
  created_at: string
  confirmed_at?: string
  rejected_reason?: string
}

function formatDate(value?: string) {
  if (!value) return 'Chưa có'
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
}

function statusClass(status: string) {
  if (status === 'confirmed' || status === 'used') return 'bg-green-400/10 text-green-300'
  if (status === 'rejected') return 'bg-red-400/10 text-red-300'
  if (status === 'submitted') return 'bg-yellow-400/10 text-yellow-300'
  return 'bg-gray-400/10 text-gray-300'
}

export default function SellerPayments() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [sort, setSort] = useState('newest')
  const [loading, setLoading] = useState(true)

  const fetchPayments = async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const response = await apiClient.get('/owner/payments', { params: { status } })
      setPayments(response.data || [])
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    void fetchPayments()
    const timer = window.setInterval(() => void fetchPayments(true), 5000)
    return () => window.clearInterval(timer)
  }, [status])

  const visiblePayments = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    return payments
      .filter((payment) => [payment.code, payment.poi_name, payment.description, payment.status_label].join(' ').toLowerCase().includes(keyword))
      .sort((a, b) => {
        if (sort === 'amount_desc') return b.amount - a.amount
        if (sort === 'amount_asc') return a.amount - b.amount
        if (sort === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
  }, [payments, query, sort])

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-dark">
        <Sidebar />
        <main className="flex-1 p-8">
          <div className="max-w-7xl">
            <h1 className="text-4xl font-bold text-white">Lịch sử thanh toán</h1>
            <p className="mt-2 text-gray-400">Theo dõi các khoản nâng cấp POI và trạng thái xác nhận.</p>

            <div className="mt-6 grid gap-3 md:grid-cols-[1fr_220px_220px]">
              <div className="relative">
                <Search className="absolute left-3 top-3 text-gray-500" size={18} />
                <input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full rounded-xl border border-gray-700 bg-secondary py-3 pl-10 pr-4 text-white" placeholder="Tìm mã, POI, nội dung..." />
              </div>
              <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-xl border border-gray-700 bg-secondary px-4 py-3 text-white">
                <option value="all">Tất cả trạng thái</option>
                <option value="submitted">Đã báo thanh toán</option>
                <option value="confirmed">Đã xác nhận</option>
                <option value="rejected">Đã từ chối</option>
              </select>
              <select value={sort} onChange={(event) => setSort(event.target.value)} className="rounded-xl border border-gray-700 bg-secondary px-4 py-3 text-white">
                <option value="newest">Mới nhất</option>
                <option value="oldest">Cũ nhất</option>
                <option value="amount_desc">Số tiền cao đến thấp</option>
                <option value="amount_asc">Số tiền thấp đến cao</option>
              </select>
            </div>

            <div className="mt-6 overflow-hidden rounded-2xl border border-gray-700 bg-secondary">
              {loading ? <p className="p-6 text-gray-400">Đang tải...</p> : null}
              {!loading && visiblePayments.length === 0 ? <p className="p-6 text-gray-400">Chưa có thanh toán phù hợp.</p> : null}
              {visiblePayments.map((payment) => (
                <div key={payment.id} className="grid gap-4 border-b border-gray-700 p-5 last:border-b-0 md:grid-cols-[1.2fr_1fr_160px_160px]">
                  <div>
                    <p className="font-bold text-white">{payment.poi_name || payment.description}</p>
                    <p className="mt-1 text-sm text-gray-400">{payment.description}</p>
                    <p className="mt-2 font-mono text-sm text-primary">{payment.code}</p>
                  </div>
                  <div className="text-sm text-gray-400">
                    <p>Tạo: {formatDate(payment.created_at)}</p>
                    <p>Xác nhận: {formatDate(payment.confirmed_at)}</p>
                    {payment.rejected_reason ? <p className="text-red-300">Lý do: {payment.rejected_reason}</p> : null}
                  </div>
                  <p className="text-xl font-bold text-yellow-300">{payment.amount.toLocaleString('vi-VN')}đ</p>
                  <span className={`h-fit rounded-full px-3 py-1 text-center text-sm font-semibold ${statusClass(payment.status)}`}>{payment.status_label}</span>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}
